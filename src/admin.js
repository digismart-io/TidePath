const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const text=(value,label,max=200)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,`${label} is required (maximum ${max} characters).`);return value.trim();};
const optional=(v,max=2000)=>v===undefined||v===null?'':(typeof v==='string'&&v.length<=max?v.trim():fail(400,'Text is too long.'));
const email=v=>{v=text(v,'Email',200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail(400,'Enter a valid email.');return v;};
const integer=(v,label,min,max)=>{if(String(v??'').trim()===''||!Number.isInteger(Number(v))||Number(v)<min||Number(v)>max)fail(400,`${label} must be a whole number from ${min} to ${max}.`);return Number(v);};
const active=v=>{if(v!==true&&v!==false&&v!==1&&v!==0)fail(400,'Choose active or archived.');return v?1:0;};
const isDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const stamp=()=>new Date().toISOString();
const defaults={tagline:'',audience:'',format:'',schedule:'',locations:[],languages:['English','Spanish','Haitian Creole'],lead:'',staffing:'',activities:[],measures:[],access:'Guardian registration; contact staff for help.',followup:'',capacity:'See group availability.',record_scope:'Program participation and coordination only; no clinical records.'};
const profileKeys=Object.keys(defaults);
export const mentoring=p=>Boolean(JSON.parse(p.details).mentor_program??(p.category==='Mentoring'));
export function workspace(config){let areas;try{areas=JSON.parse(config.service_areas||'["Little Havana","West Little River"]');}catch{areas=['Little Havana','West Little River'];}return {organization_name:config.organization_name||'Tidepath Family Alliance',service_areas:areas};}
function auditWrite(db,user,action,id,detail){return db.prepare('INSERT INTO audit_log SELECT ?,?,?,?,?,? WHERE changes()>0').bind(crypto.randomUUID(),user.id,action,id,JSON.stringify(detail),stamp());}
async function save(db,user,table,id,old,data,extras=[]){
 if(old&&data.version!==old.version)fail(409,'This record changed. Reopen the form before saving.');
 const fields=Object.keys(data).filter(k=>k!=='version'),values=fields.map(k=>data[k]);
 const statement=old?db.prepare(`UPDATE ${table} SET ${fields.map(k=>`${k}=?`).join(',')},version=version+1 WHERE id=? AND version=?`).bind(...values,id,old.version):db.prepare(`INSERT INTO ${table} (id,${fields.join(',')}) VALUES (${Array(fields.length+1).fill('?').join(',')})`).bind(id,...values);
 const before=old?Object.fromEntries(Object.entries(old).filter(([k])=>!k.startsWith('password'))):null,after=Object.fromEntries(Object.entries(data).filter(([k])=>!k.startsWith('password')));
 try{const results=await db.batch([statement,auditWrite(db,user,'workspace_'+table+'_saved',id,{before,after}),...extras]);if(!results[0].meta.changes)fail(409,'This record changed while saving. Reopen the form.');}
 catch(e){if(/UNIQUE/i.test(e.message))fail(409,'That email or record already exists. Edit the existing record.');throw e;}
 return {ok:true,id};
}
export async function administration(db,user,path,method,data,{passwordHash}){
 if(path==='/api/admin'&&method==='GET'){
 const [programs,groups,staff,volunteers,assignments,settings]=await Promise.all([all(db,'SELECT * FROM programs ORDER BY name'),all(db,'SELECT * FROM groups ORDER BY name'),all(db,'SELECT id,name,email,role,active,version FROM staff ORDER BY name'),all(db,'SELECT * FROM volunteers ORDER BY name'),all(db,'SELECT * FROM staff_groups'),all(db,'SELECT * FROM settings')]);const config=Object.fromEntries(settings.map(s=>[s.key,s.value]));return {programs,groups,staff,volunteers,assignments,config,workspace:workspace(config)};
 }
 const match=path.match(/^\/api\/admin\/(programs|groups|staff|volunteers)(?:\/([^/]+))?$/);
 if(match&&['POST','PUT'].includes(method)){
 const table=match[1],id=match[2]||crypto.randomUUID(),old=match[2]?await first(db,`SELECT * FROM ${table} WHERE id=?`,id):null;if(match[2]&&!old)fail(404,'Record not found.');if((method==='PUT')!==Boolean(match[2]))fail(400,'Use POST to create or PUT to edit a record.');const config=Object.fromEntries((await all(db,'SELECT * FROM settings')).map(s=>[s.key,s.value])),today=config.demo_today;
 if(table==='programs'){
  const min_age=integer(data.min_age,'Minimum age',0,18),max_age=integer(data.max_age,'Maximum age',min_age,18),category=text(data.category,'Category',80),mode=data.enrollment_mode,rule=data.attendance_rule;
  if(!['app','secure_system'].includes(mode)||!['consecutive_absences','optional','none'].includes(rule))fail(400,'Choose valid intake and attendance policies.');if(category==='Family counseling'&&mode!=='secure_system')fail(400,'Counseling intake belongs in an external secure system.');if(mode==='secure_system'&&rule!=='none')fail(400,'Private intake must not track attendance in this workspace.');if(mode==='app'&&rule==='none')fail(400,'Choose regular attendance or optional events for an app program.');
  const oldDetails=old?JSON.parse(old.details):{};if(old&&(oldDetails.attendance_rule!==rule||oldDetails.enrollment_mode!==mode)&&await first(db,'SELECT 1 FROM groups g WHERE g.program_id=? AND (EXISTS(SELECT 1 FROM enrollments e WHERE e.group_id=g.id) OR EXISTS(SELECT 1 FROM sessions s WHERE s.group_id=g.id))',id))fail(400,'Intake and attendance policy already have history. Create a new program for a different policy.');
  if(old&&await first(db,'SELECT 1 FROM enrollments e JOIN groups g ON g.id=e.group_id JOIN students s ON s.id=e.student_id WHERE g.program_id=? AND e.start_date<=? AND (e.end_date IS NULL OR e.end_date>=?) AND (s.age<? OR s.age>?)',id,today,today,min_age,max_age))fail(400,'The age range would exclude a currently enrolled child.');
  const details={...defaults,...oldDetails,enrollment_mode:mode,attendance_rule:rule,mentor_program:mode==='app'&&category==='Mentoring'};
  for(const key of profileKeys)if(data.details?.[key]!==undefined){if(Array.isArray(defaults[key])){if(!Array.isArray(data.details[key])||data.details[key].length>30)fail(400,'Profile lists must contain at most 30 items.');details[key]=data.details[key].map(v=>text(v,key,500));}else details[key]=optional(data.details[key],2000);}
  return save(db,user,table,id,old,{name:text(data.name,'Program name',120),description:text(data.description,'Description',3000),outcome_label:text(data.outcome_label,'Outcome measure',300),category,min_age,max_age,details:JSON.stringify(details),active:active(data.active),version:data.version});
 }
 if(table==='groups'){
  const p=await first(db,'SELECT * FROM programs WHERE id=?',data.program_id);if(!p||JSON.parse(p.details).enrollment_mode!=='app')fail(400,'Choose a program that accepts participation in this app.');if(!old&&!p.active)fail(400,'Activate the program before adding a group.');
  const school=text(data.school,'School / venue',150),neighborhood=text(data.neighborhood,'Service area',80);if(old?.neighborhood!==neighborhood&&!workspace(config).service_areas.includes(neighborhood))fail(400,'Choose a configured service area.');
  if(old&&(old.program_id!==data.program_id||old.school!==school||old.neighborhood!==neighborhood)&&await first(db,'SELECT 1 FROM enrollments WHERE group_id=? UNION SELECT 1 FROM sessions WHERE group_id=?',id,id))fail(400,'This group has history. Create a new group to change its program or venue.');
  const capacity=integer(data.capacity,'Capacity',1,100),count=old?(await first(db,'SELECT COUNT(*) n FROM enrollments WHERE group_id=? AND start_date<=? AND (end_date IS NULL OR end_date>=?)',id,today,today)).n:0;if(capacity<count)fail(400,'Capacity cannot be less than current enrollment.');
  return save(db,user,table,id,old,{program_id:p.id,name:text(data.name,'Group name',120),school,neighborhood,weekday:text(data.weekday,'Meeting day',40),time:text(data.time,'Meeting time',80),capacity,active:active(data.active),version:data.version});
 }
 if(table==='volunteers'){
  if(!Array.isArray(data.languages)||!data.languages.length||data.languages.length>20)fail(400,'Record at least one spoken language (maximum twenty).');const languages=data.languages.map(v=>text(v,'Spoken language',80));if(new Set(languages.map(v=>v.toLowerCase())).size!==languages.length)fail(400,'Choose each spoken language only once.');
  const previousPrograms=JSON.parse(old?.program_ids||'[]'),program_ids=data.program_ids===undefined||(old&&data.program_ids===old.program_ids)?previousPrograms:data.program_ids;
  if(!Array.isArray(program_ids)||program_ids.length>100||program_ids.some(id=>typeof id!=='string'||!id.trim())||new Set(program_ids).size!==program_ids.length)fail(400,'Choose each program only once (maximum 100).');
  const programs=await all(db,'SELECT id,active FROM programs');if(program_ids.some(id=>!programs.some(p=>p.id===id&&(p.active||previousPrograms.includes(id)))))fail(400,'Choose existing active programs. Existing archived registrations may be retained or removed.');
  const description=data.description===undefined?(old?.description||''):optional(data.description,2000);
  const role=text(data.role,'Volunteer role',80),enabled=active(data.active);if(old&&(old.role==='Mentor'&&role!=='Mentor'||!enabled)&&await first(db,'SELECT 1 FROM mentor_matches WHERE volunteer_id=? AND end_date IS NULL',id))fail(400,'Reassign this mentor’s active matches before changing their role or archiving them.');
  return save(db,user,table,id,old,{name:text(data.name,'Volunteer name',120),email:email(data.email),role,languages:JSON.stringify(languages),description,program_ids:JSON.stringify(program_ids),active:enabled,version:data.version});
 }
 if(table==='staff'){
  if(!['manager','teacher'].includes(data.role))fail(400,'Choose manager or session leader.');const enabled=active(data.active);if(old?.id===user.id&&(!enabled||data.role!=='manager'))fail(400,'Keep your own manager access active. Sign in as another manager to change it.');
  if(!Array.isArray(data.group_ids)||data.group_ids.length>50||new Set(data.group_ids).size!==data.group_ids.length)fail(400,'Choose valid group assignments.');const groups=await all(db,'SELECT id FROM groups');if(data.group_ids.some(id=>!groups.some(g=>g.id===id)))fail(400,'Choose existing groups.');
  if(!enabled&&await first(db,"SELECT 1 FROM followups WHERE owner_id=? AND status!='resolved'",id))fail(400,'Reassign open follow-ups before deactivating this staff member.');
  const record={name:text(data.name,'Staff name',120),email:email(data.email),role:data.role,active:enabled,version:data.version},password=optional(data.password,200);if(!old&&!password)fail(400,'Set an initial password for the new account.');if(password){if(password.length<12)fail(400,'Use a password of at least 12 characters.');record.password_salt=crypto.randomUUID();record.password_hash=await passwordHash(password,record.password_salt);}
  const version=crypto.randomUUID();record.edit_token=version;const guard='EXISTS(SELECT 1 FROM staff WHERE id=? AND edit_token=?)',extra=[db.prepare(`DELETE FROM staff_groups WHERE staff_id=? AND ${guard}`).bind(id,id,version)];
  if(data.role==='teacher'&&enabled)for(let i=0;i<data.group_ids.length;i+=40){const chunk=data.group_ids.slice(i,i+40);extra.push(db.prepare(`INSERT INTO staff_groups(staff_id,group_id) SELECT staff_id,group_id FROM (${chunk.map((_,n)=>n?'SELECT ?,?':'SELECT ? AS staff_id,? AS group_id').join(' UNION ALL ')}) WHERE ${guard}`).bind(...chunk.flatMap(group=>[id,group]),id,version));}
  if(old&&(password||!enabled||old.role!==data.role))extra.push(db.prepare(`DELETE FROM auth_sessions WHERE staff_id=? AND ${guard}`).bind(id,id,version));
  return save(db,user,table,id,old,record,extra);
 }
 }
 if(path==='/api/admin/sessions'&&method==='POST'){
 const group=await first(db,'SELECT g.*,p.active program_active,p.details FROM groups g JOIN programs p ON p.id=g.program_id WHERE g.id=?',data.group_id);if(!group||!group.active||!group.program_active||JSON.parse(group.details).enrollment_mode!=='app')fail(400,'Choose an active participation group.');if(!isDay(data.date))fail(400,'Enter a valid session date.');const id=crypto.randomUUID(),topic=text(data.topic,'Session topic',200);
 try{await db.batch([db.prepare("INSERT INTO sessions(id,group_id,date,topic,status) VALUES (?,?,?,?,'draft')").bind(id,group.id,data.date,topic),db.prepare('INSERT INTO attendance(session_id,student_id) SELECT ?,student_id FROM enrollments WHERE group_id=? AND start_date<=? AND (end_date IS NULL OR end_date>=?)').bind(id,group.id,data.date,data.date),db.prepare('INSERT INTO audit_log VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,'session_scheduled',id,JSON.stringify({group_id:group.id,date:data.date,topic}),stamp())]);}catch(e){if(/UNIQUE/.test(e.message))fail(409,'A session already exists for this group and date.');throw e;}return {ok:true,id};
 }
 if(path==='/api/admin/settings'&&method==='PUT'){
 const config=Object.fromEntries((await all(db,'SELECT * FROM settings')).map(s=>[s.key,s.value]));if(data.version!==Number(config.admin_version||0))fail(409,'Workspace settings changed. Refresh before saving.');
 if(!isDay(data.quarter_start)||!isDay(data.quarter_end)||data.quarter_start>data.quarter_end||!isDay(data.demo_today)||data.demo_today<data.quarter_start||data.demo_today>data.quarter_end)fail(400,'Choose a valid reporting period and working date within it.');
 if(!Array.isArray(data.service_areas)||!data.service_areas.length||data.service_areas.length>20)fail(400,'Enter between one and twenty service areas.');const areas=data.service_areas.map(v=>text(v,'Service area',80));if(new Set(areas.map(v=>v.toLowerCase())).size!==areas.length)fail(400,'Service areas must be unique.');
 const next={organization_name:text(data.organization_name,'Organization name',120),service_areas:JSON.stringify(areas),quarter_start:data.quarter_start,quarter_end:data.quarter_end,demo_today:data.demo_today};
 const edit=crypto.randomUUID();const writes=[db.prepare("UPDATE settings SET value=? WHERE key='admin_version' AND value=?").bind(String(data.version+1),String(data.version)),db.prepare("INSERT INTO settings(key,value) SELECT 'admin_edit_token',? WHERE changes()>0 ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(edit),auditWrite(db,user,'workspace_settings_saved','settings',{before:config,after:next})];
 for(const [key,value] of Object.entries(next))writes.push(db.prepare("INSERT INTO settings(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM settings WHERE key='admin_edit_token' AND value=?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,value,edit));
 const results=await db.batch(writes);if(!results[0].meta.changes)fail(409,'Workspace settings changed while saving. Refresh first.');return {ok:true};
 }
 fail(404,'Administration action not found.');
}
