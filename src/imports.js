// Manager-reviewed CSV intake. Suggestions never merge identities automatically.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const uid=()=>crypto.randomUUID();
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const required=['source_system','source_id','guardian_name','email','language','neighborhood','first_name','last_name','age','group_id'];
export function parseIntakeCSV(csv){
 if(typeof csv!=='string'||!csv.trim()||csv.length>20000)fail(400,'Upload a CSV containing 1–20 rows, at most 20 KB.');
 csv=csv.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<csv.length;i++){const c=csv[i];if(quoted){if(c==='"'){if(csv[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)fail(400,'Invalid CSV quoting.');quoted=true;}else if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(c==='\r'&&csv[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}}else{if(closed&&!/\s/.test(c))fail(400,'Invalid text after a quoted CSV cell.');if(!closed)cell+=c;}
 }
 if(quoted)fail(400,'A quoted CSV cell is not closed.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 const headers=rows.shift()?.map(h=>h.toLowerCase());if(!headers||new Set(headers).size!==headers.length||required.some(h=>!headers.includes(h))||headers.some(h=>![...required,'phone'].includes(h)))fail(400,`Use these CSV headers: ${required.join(',')},phone (optional).`);
 if(!rows.length||rows.length>20)fail(400,'Import between 1 and 20 rows at a time.');
 const keys=new Set();return rows.map((values,index)=>{const label=`Row ${index+1}`;if(values.length!==headers.length)fail(400,`${label}: the number of cells does not match the headers.`);const r=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
  for(const h of required)if(!r[h]||r[h].length>200)fail(400,`${label}: ${h} is required (maximum 200 characters).`);
  for(const h of ['first_name','last_name'])if(r[h].length>80)fail(400,`${label}: ${h} must be at most 80 characters.`);
  if(r.guardian_name.length>120||(r.phone||'').length>40)fail(400,`${label}: guardian name or phone is too long.`);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))fail(400,`${label}: enter a valid email.`);r.email=r.email.toLowerCase();r.phone=r.phone||'';
  if(!['English','Spanish','Haitian Creole'].includes(r.language))fail(400,`${label}: language must be English, Spanish or Haitian Creole. It is never inferred from a name.`);

  if(!/^\d{1,2}$/.test(r.age)||Number(r.age)>18)fail(400,`${label}: age must be 0–18.`);r.age=Number(r.age);
  const key=JSON.stringify([r.source_system,r.source_id]);if(keys.has(key))fail(400,`${label}: repeated source_system/source_id. Each source row needs a stable unique ID.`);keys.add(key);return r;
 });
}
async function context(db){const [guardians,students,links,groups,enrollments,records,settings]=await Promise.all([
 all(db,'SELECT * FROM guardians'),all(db,'SELECT * FROM students'),all(db,'SELECT * FROM student_guardians'),all(db,'SELECT g.*,p.min_age,p.max_age,p.details,p.active program_active FROM groups g JOIN programs p ON p.id=g.program_id'),all(db,'SELECT e.*,g.program_id FROM enrollments e JOIN groups g ON g.id=e.group_id'),all(db,'SELECT * FROM import_records'),all(db,'SELECT * FROM settings')]);return {guardians,students,links,groups,enrollments,records,today:settings.find(s=>s.key==='demo_today').value,areas:JSON.parse(settings.find(s=>s.key==='service_areas')?.value||'["Little Havana","West Little River"]')};}
const fingerprint=r=>hash(JSON.stringify([...required,'phone'].map(key=>r[key])));
function validateGroup(r,ctx,age=r.age){const g=ctx.groups.find(g=>g.id===r.group_id);if(!ctx.areas.includes(r.neighborhood))fail(400,'Choose a configured service area.');if(!g||!g.active||!g.program_active||JSON.parse(g.details).enrollment_mode==='secure_system')fail(400,`Unknown or private-intake group: ${r.group_id}.`);if(age<g.min_age||age>g.max_age)fail(400,`${r.first_name}: ${g.name} serves ages ${g.min_age}–${g.max_age}.`);return g;}
const phoneKey=r=>r.phone.replace(/\D/g,'');
const childKey=r=>norm(r.first_name+' '+r.last_name);
const householdKey=r=>JSON.stringify([norm(r.guardian_name),r.email,phoneKey(r),r.language,r.neighborhood]);
async function prepareIntake(rows,ctx){const preview=[];
 for(const [index,r] of rows.entries()){validateGroup(r,ctx);const old=ctx.records.find(o=>o.source_system===r.source_system&&o.source_id===r.source_id),fp=await fingerprint(r);if(old&&old.fingerprint!==fp)fail(409,`Row ${index+1}: this source ID was previously imported with different data. Review the existing record; it will not be overwritten.`);
 const candidates=ctx.guardians.map(g=>{const signals=[];if(g.email.toLowerCase()===r.email)signals.push('same email');if(r.phone.replace(/\D/g,'').length>=7&&g.phone.replace(/\D/g,'')===r.phone.replace(/\D/g,''))signals.push('same phone');if(norm(g.name)===norm(r.guardian_name))signals.push('same guardian name');const linked=ctx.students.filter(s=>ctx.links.some(l=>l.guardian_id===g.id&&l.student_id===s.id));if(linked.some(s=>norm(s.first_name)===norm(r.first_name)&&norm(s.last_name)===norm(r.last_name)))signals.push('same child name');return {guardian_id:g.id,name:g.name,email:g.email,signals};}).filter(c=>c.signals.length);
 const earlier_rows=rows.slice(0,index).flatMap((p,i)=>p.email===r.email||norm(p.guardian_name)===norm(r.guardian_name)||childKey(p)===childKey(r)||(phoneKey(r).length>=7&&phoneKey(p)===phoneKey(r))?[i]:[]);
 let suggested_decision=null;
 if(!old&&!candidates.length){
  if(!earlier_rows.length)suggested_decision={guardian:'new',child:'new'};
  else if(earlier_rows.every(i=>householdKey(rows[i])===householdKey(r)&&preview[i].suggested_decision)){
   const first=earlier_rows[0],sameChild=earlier_rows.filter(i=>childKey(rows[i])===childKey(r));
   if(sameChild.every(i=>rows[i].age===r.age))suggested_decision={guardian:`row:${first}`,child:sameChild.length?`row:${sameChild[0]}`:'new'};
  }
 }
 const group=ctx.groups.find(g=>g.id===r.group_id);
 preview.push({index,...r,group_name:group.name,already_imported:Boolean(old),imported_guardian_id:old?.guardian_id||null,imported_child_id:old?.student_id||null,candidates,earlier_rows,suggested_decision,review_required:!old&&!suggested_decision});
 }
 const ready=preview.filter(r=>r.suggested_decision),capacity_errors=[];
 for(const group of ctx.groups){const childRoot=index=>{let i=index;while(preview[i].suggested_decision?.child.startsWith('row:'))i=Number(preview[i].suggested_decision.child.slice(4));return i;};const demand=new Set(ready.filter(r=>r.group_id===group.id).map(r=>childRoot(r.index))).size,current=ctx.enrollments.filter(e=>e.group_id===group.id&&e.start_date<=ctx.today&&(!e.end_date||e.end_date>=ctx.today)).length;if(demand+current>group.capacity)capacity_errors.push(`${group.name}: ${demand} new places requested, ${Math.max(0,group.capacity-current)} available.`);}
 return {rows:preview,summary:{ready_rows:ready.length,review_rows:preview.filter(r=>r.review_required).length,skipped_rows:preview.filter(r=>r.already_imported).length,new_households:ready.filter(r=>r.suggested_decision.guardian==='new').length,new_children:ready.filter(r=>r.suggested_decision.child==='new').length},capacity_errors};
}
export async function previewIntake(db,csv){return prepareIntake(parseIntakeCSV(csv),await context(db));}
function bulk(db,table,columns,rows,conflict=''){const statements=[];const size=Math.floor(90/columns.length);for(let i=0;i<rows.length;i+=size){const chunk=rows.slice(i,i+size);statements.push(db.prepare(`INSERT ${conflict} INTO ${table} (${columns.join(',')}) VALUES ${chunk.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',')}`).bind(...chunk.flat()));}return statements;}
export async function commitIntake(db,user,data){const rows=parseIntakeCSV(data.csv),ctx=await context(db),preview=await prepareIntake(rows,ctx);if(data.decisions!==undefined&&(!Array.isArray(data.decisions)||data.decisions.length!==rows.length))fail(400,'Provide one review decision per CSV row.');
 const sets={households:[],guardians:[],students:[],links:[],enrollments:[],records:[],audit:[]},resolved=[],planned=[],stamp=new Date().toISOString();let skipped=0;
 for(const [index,r] of rows.entries()){
  let decision=data.decisions?.[index];const automatic=decision===undefined||decision?.auto===true;
  const old=ctx.records.find(o=>o.source_system===r.source_system&&o.source_id===r.source_id),fp=await fingerprint(r);
  if(old){if(old.fingerprint!==fp)fail(409,`Row ${index+1}: previously imported source data changed. No rows were saved.`);resolved.push({guardian_id:old.guardian_id,student_id:old.student_id});skipped++;continue;}
  if(automatic){decision=preview.rows[index].suggested_decision;if(!decision)fail(409,`Row ${index+1}: a possible match needs review. Preview the file again before importing.`);}
  if(!decision||typeof decision!=='object'||!decision.guardian||!decision.child)fail(400,`Row ${index+1}: review the possible family and child match.`);
  const prior=(value,kind)=>{if(typeof value!=='string'||!/^row:\d+$/.test(value))return null;const n=Number(value.slice(4));if(n>=index||!resolved[n])fail(400,`Row ${index+1}: choose an earlier row.`);return resolved[n][kind];};
  let guardian_id=prior(decision.guardian,'guardian_id');
  if(!guardian_id&&decision.guardian==='new'){guardian_id=uid();const hid=uid();sets.households.push([hid,`${r.last_name} family`,r.neighborhood]);sets.guardians.push([guardian_id,hid,r.guardian_name,r.email,r.phone,r.language]);}
  else if(!guardian_id){const guardian=ctx.guardians.find(g=>g.id===decision.guardian);if(!guardian)fail(400,`Row ${index+1}: confirm a guardian match or choose a new household.`);guardian_id=guardian.id;}
  let student_id=prior(decision.child,'student_id'),student;
  if(student_id){const priorRow=resolved.find(x=>x.student_id===student_id);if(priorRow.guardian_id!==guardian_id)fail(400,`Row ${index+1}: the earlier child belongs to a different guardian.`);student=ctx.students.find(s=>s.id===student_id)||sets.students.map(s=>({id:s[0],first_name:s[1],last_name:s[2],age:s[3]})).find(s=>s.id===student_id);}
  else if(decision.child==='new'){student_id=uid();student={id:student_id,age:r.age};sets.students.push([student_id,r.first_name,r.last_name,r.age,stamp]);sets.links.push([student_id,guardian_id]);}
  else {student=ctx.students.find(s=>s.id===decision.child);if(!student||!ctx.links.some(l=>l.student_id===student.id&&l.guardian_id===guardian_id))fail(400,`Row ${index+1}: choose a child linked to the confirmed guardian.`);student_id=student.id;}
  const g=validateGroup(r,ctx,student.age),active=[...ctx.enrollments,...planned].filter(e=>e.student_id===student_id&&e.program_id===g.program_id&&e.start_date<=ctx.today&&(!e.end_date||e.end_date>=ctx.today));
  if(active.some(e=>e.group_id!==g.id))fail(409,`Row ${index+1}: this child already has another group in this program. Use the existing enrollment/transfer workflow. No rows were saved.`);
  if(!active.length){sets.enrollments.push([uid(),student_id,g.id,ctx.today]);planned.push({student_id,group_id:g.id,program_id:g.program_id,start_date:ctx.today,end_date:null});}
  sets.records.push([r.source_system,r.source_id,student_id,guardian_id,fp,user.id,stamp]);resolved.push({student_id,guardian_id});
  sets.audit.push([uid(),user.id,'csv_identity_confirmed',student_id,JSON.stringify({source_system:r.source_system,source_id:r.source_id,decision_mode:automatic?'automatic_new':'reviewed',guardian_choice:decision.guardian,child_choice:decision.child}),stamp]);
 }
 for(const g of ctx.groups){const demand=planned.filter(e=>e.group_id===g.id).length;if(demand+ctx.enrollments.filter(e=>e.group_id===g.id&&e.start_date<=ctx.today&&(!e.end_date||e.end_date>=ctx.today)).length>g.capacity)fail(409,`${g.name} has insufficient capacity. No rows were saved.`);}
 const writes=[...bulk(db,'households',['id','name','neighborhood'],sets.households),...bulk(db,'guardians',['id','household_id','name','email','phone','preferred_language'],sets.guardians),...bulk(db,'students',['id','first_name','last_name','age','created_at'],sets.students),...bulk(db,'student_guardians',['student_id','guardian_id'],sets.links),...bulk(db,'enrollments',['id','student_id','group_id','start_date'],sets.enrollments)];
 // Only new enrollments receive future, unsubmitted attendance rows; historical attendance stays intact.
 for(const g of ctx.groups){const ids=planned.filter(e=>e.group_id===g.id).map(e=>e.student_id);if(ids.length)writes.push(db.prepare(`INSERT OR IGNORE INTO attendance(session_id,student_id) SELECT s.id,e.student_id FROM sessions s JOIN enrollments e ON e.group_id=s.group_id WHERE s.group_id=? AND s.date>=? AND s.status='draft' AND e.student_id IN (${ids.map(()=>'?').join(',')})`).bind(g.id,ctx.today,...ids));}
 writes.push(...bulk(db,'import_records',['source_system','source_id','student_id','guardian_id','fingerprint','imported_by','imported_at'],sets.records),...bulk(db,'audit_log',['id','staff_id','action','entity_id','detail','created_at'],sets.audit));
 if(writes.length)try{await db.batch(writes);}catch(e){if(/UNIQUE|constraint/i.test(e.message))fail(409,'Records changed during import. Nothing from this batch was saved. Preview the file again.');throw e;}
 return {ok:true,imported:sets.records.length,skipped,new_households:sets.households.length,new_children:sets.students.length,new_enrollments:sets.enrollments.length};
}
