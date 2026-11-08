import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import worker, { report, reconcileFollowups } from '../src/worker.js';
import { openDatabase } from '../scripts/sqlite.mjs';
import { generateSeed, DEMO_PASSWORD } from '../scripts/generate-seed.mjs';
const fixture=generateSeed();
function setup(t){const local=openDatabase();for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())local.sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));local.sqlite.exec(fixture.sql);t.after(()=>local.close());const env={DB:local.DB,DEMO_MODE:'true',ASSETS:{fetch:async()=>new Response('shell')}};return {...local,env};}
async function call(env,path,{method='GET',data,cookie,origin}={}){const req=new Request('http://tidepath.test/api'+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})},...(data?{body:JSON.stringify(data)}:{})});const response=await worker.fetch(req,env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};}
async function login(env,id='marisol'){const result=await call(env,'/login',{method:'POST',data:{email:`${id}@tidepath.example`,password:DEMO_PASSWORD}});assert.equal(result.status,200);return result.cookie;}

test('seeded report reconciles against independent generator totals',async t=>{const {DB,sqlite}=setup(t);const r=await report(DB);for(const key of ['students','program_enrollments','enrollment_rows','sessions','submitted_sessions','cancelled_sessions','incomplete_sessions','expected_attendance','attended','absent','excused','unmarked','approved_hours','pending_hours','assessment_pairs','average_gain'])assert.equal(r.totals[key],fixture.expected[key],key);assert.equal(r.families.length,fixture.expected.households);assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);assert.equal(r.totals.attendance_rate,Math.round(fixture.expected.rate_attended/(fixture.expected.rate_attended+fixture.expected.rate_absent)*1000)/10);});
test('teachers see only assigned groups, no family data or manager reports',async t=>{const {env}=setup(t),cookie=await login(env,'elena');const state=await call(env,'/state',{cookie});assert.equal(state.status,200);assert.equal(state.data.groups.length,1);assert.equal(state.data.sessions.length,12);for(const sensitive of ['guardians','students','followups','report','hours'])assert.equal(state.data[sensitive],undefined);assert.equal((await call(env,'/sessions/wave-bayview-12',{cookie})).status,403);assert.equal((await call(env,'/report',{cookie})).status,403);assert.equal((await call(env,'/students/student-001',{cookie})).status,403);});
test('unauthenticated requests cannot read roster, reports or household identities',async t=>{const {env}=setup(t);for(const path of ['/state','/report','/sessions/harbor-bayview-12','/students/student-001'])assert.equal((await call(env,path)).status,401);const pub=await call(env,'/public/programs');assert.equal(pub.status,200);assert.equal(pub.data.guardians,undefined);});
test('login rejects wrong credentials and logout invalidates session',async t=>{const {env}=setup(t);assert.equal((await call(env,'/login',{method:'POST',data:{email:'marisol@tidepath.example',password:'wrong'}})).status,401);const cookie=await login(env);assert.equal((await call(env,'/me',{cookie})).data.user.role,'manager');assert.equal((await call(env,'/logout',{method:'POST',data:{},cookie})).status,200);assert.equal((await call(env,'/state',{cookie})).status,401);});
test('CSRF requests are refused before mutation',async t=>{const {env}=setup(t),cookie=await login(env);assert.equal((await call(env,'/logout',{method:'POST',data:{},cookie,origin:'https://other.test'})).status,403);assert.equal((await call(env,'/state',{cookie})).status,200);});
test('incomplete attendance cannot be saved even when the client requests a draft',async t=>{const {env,DB,sqlite}=setup(t),cookie=await login(env,'elena');const before=await report(DB);const result=await call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie,data:{version:0,finalize:false,entries:[{student_id:'student-001',status:'absent'}]}});assert.equal(result.status,400);assert.equal((await report(DB)).totals.attended,before.totals.attended);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM followups WHERE student_id='student-001'").get().n,0);assert.equal((await report(DB)).totals.unmarked,before.totals.unmarked);});
test('one complete submission immediately updates attendance and creates an owned follow-up without a finalize flag',async t=>{const {env,DB,sqlite}=setup(t),cookie=await login(env,'elena');const bad=await call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie,data:{version:0,finalize:true,entries:[{student_id:'student-001',status:'absent'}]}});assert.equal(bad.status,400);const roster=(await call(env,'/sessions/harbor-bayview-12',{cookie})).data;const entries=roster.roster.map(r=>({student_id:r.student_id,status:r.student_id==='student-001'?'absent':'present'}));const saved=await call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie,data:{version:0,entries}});assert.equal(saved.status,200);const task=sqlite.prepare("SELECT * FROM followups WHERE student_id='student-001'").get();assert.equal(task.owner_id,'marisol');assert.equal(task.due_date,'2026-09-23');assert.equal(task.status,'open');assert.equal((await report(DB)).totals.incomplete_sessions,1);await reconcileFollowups(DB,'student-001','harbor');assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM followups WHERE student_id='student-001'").get().n,1);assert.equal((await call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie,data:{version:0,entries}})).status,409);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='attendance_saved'").get().n,1);});
test('simultaneous roster saves cannot overwrite each other',async t=>{const {env,sqlite}=setup(t),cookie=await login(env,'elena');const roster=(await call(env,'/sessions/harbor-bayview-12',{cookie})).data.roster;const results=await Promise.all(['present','absent'].map(status=>call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie,data:{version:0,entries:roster.map(r=>({student_id:r.student_id,status:r.student_id==='student-001'?status:'present'}))}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(sqlite.prepare("SELECT version FROM sessions WHERE id='harbor-bayview-12'").get().version,1);});
test('cancelled sessions reject attendance; foreign students cannot enter a roster',async t=>{const {env}=setup(t),cookie=await login(env,'james');assert.equal((await call(env,'/sessions/wave-bayview-05',{method:'PUT',cookie,data:{version:0,entries:[]}})).status,409);assert.equal((await call(env,'/sessions/wave-bayview-12',{method:'PUT',cookie,data:{version:0,entries:[{student_id:'student-001',status:'present'}]}})).status,400);});
test('school transfer preserves past school context without duplicate attendance',async t=>{const {env}=setup(t),cookie=await login(env);const detail=(await call(env,'/students/student-012',{cookie})).data;const workshops=detail.attendance.filter(a=>a.group_name.startsWith('Next Wave'));assert.equal(workshops.length,12);assert.equal(new Set(workshops.map(a=>a.date.slice(0,7))).size,3);for(const a of workshops)assert.equal(a.school,a.date<'2026-08-15'?'Bayview Middle School':'Riverside Middle School');});
test('approved hours update report exactly once; duplicate entries are refused',async t=>{const {env,DB}=setup(t),cookie=await login(env);const before=(await report(DB)).totals;const id='hours-harbor-bayview-11-1';assert.equal((await call(env,'/hours/'+id,{method:'PUT',cookie,data:{status:'approved'}})).status,200);await call(env,'/hours/'+id,{method:'PUT',cookie,data:{status:'approved'}});const after=(await report(DB)).totals;assert.equal(after.approved_hours,before.approved_hours+1);assert.equal(after.pending_hours,before.pending_hours-1);assert.equal((await call(env,'/hours',{method:'POST',cookie,data:{volunteer_id:'volunteer-001',session_id:'harbor-bayview-11',hours:1}})).status,409);});
test('simulated send is tracked without resolving task; reply and resolution remain separate',async t=>{const {env,sqlite}=setup(t),cookie=await login(env);const draft=await call(env,'/followups/followup-3/draft',{method:'POST',data:{},cookie});assert.equal(draft.data.source,'Template');assert.match(draft.data.text,/Hola Lucia Ortega/);const sent=await call(env,'/followups/followup-3/events',{method:'POST',cookie,data:{kind:'simulated_send',body:draft.data.text}});assert.equal(sent.data.simulated,true);assert.equal(sqlite.prepare("SELECT status FROM followups WHERE id='followup-3'").get().status,'awaiting_reply');await call(env,'/followups/followup-3/events',{method:'POST',cookie,data:{kind:'reply',body:'We need help with transport.'}});assert.equal(sqlite.prepare("SELECT status FROM followups WHERE id='followup-3'").get().status,'awaiting_reply');await call(env,'/followups/followup-3/events',{method:'POST',cookie,data:{kind:'resolution',body:'Transport arranged and guardian confirmed next session.'}});assert.equal(sqlite.prepare("SELECT status FROM followups WHERE id='followup-3'").get().status,'resolved');});
test('public registration writes connected records without disclosing existing identities',async t=>{const {env,sqlite}=setup(t);const registration={first_name:'Luz',last_name:'Demo',age:12,guardian_name:'Elena Demo',email:'demo@example.com',language:'Spanish',neighborhood:'Little Havana',group_ids:['wave-bayview']};const response=await call(env,'/register',{method:'POST',data:registration});assert.equal(response.status,201,JSON.stringify(response.data));assert.equal(response.data.guardians,undefined);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,101);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,71);assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);assert.equal((await call(env,'/register',{method:'POST',data:{...registration,guardian_id:'guardian-001'}})).status,403);});
test('registration validates age, language, capacity and duplicate program selections',async t=>{const {env}=setup(t);const base={first_name:'Test',last_name:'Family',age:12,guardian_name:'Adult Demo',email:'adult@example.com',language:'English',neighborhood:'Little Havana',group_ids:['wave-bayview']};assert.equal((await call(env,'/register',{method:'POST',data:{...base,age:17}})).status,400);assert.equal((await call(env,'/register',{method:'POST',data:{...base,language:'invalid'}})).status,400);assert.equal((await call(env,'/register',{method:'POST',data:{...base,group_ids:['wave-bayview','wave-riverside']}})).status,400);assert.equal((await call(env,'/register',{method:'POST',data:{...base,group_ids:['harbor-bayview']}})).status,409);});
test('report narrative has a labeled deterministic fallback, not fabricated AI output',async t=>{const {env}=setup(t),cookie=await login(env);const response=await call(env,'/report/draft',{method:'POST',data:{},cookie});assert.equal(response.data.source,'Template');assert.match(response.data.text,/100 unique students/);assert.match(response.data.text,/provisional/);assert.match(response.data.warning,/not configured/);});
test('AI errors fall back safely; successful responses are labeled',async t=>{const {env}=setup(t),cookie=await login(env);env.AI_MODEL='test';env.AI={run:async()=>{throw new Error('unavailable');}};const fallback=await call(env,'/report/draft',{method:'POST',data:{},cookie});assert.equal(fallback.data.source,'Template');assert.match(fallback.data.warning,/unavailable/);env.AI={run:async()=>({response:'Fictional quarterly narrative.'})};assert.equal((await call(env,'/report/draft',{method:'POST',data:{},cookie})).data.source,'Workers AI');});
test('AI cannot replace verified report numbers with invented numeric claims',async t=>{const {env}=setup(t),cookie=await login(env);env.AI_MODEL='test';env.AI={run:async()=>({response:'Attendance was 99%, based on 400 records.'})};const rejected=await call(env,'/report/draft',{method:'POST',data:{},cookie});assert.equal(rejected.data.source,'Template');assert.doesNotMatch(rejected.data.text,/99%/);assert.match(rejected.data.text,/100 unique students/);env.AI={run:async()=>({response:'Review incomplete rosters and follow up with families.'})};const accepted=await call(env,'/report/draft',{method:'POST',data:{},cookie});assert.equal(accepted.data.source,'Workers AI');assert.match(accepted.data.text,/100 unique students/);assert.match(accepted.data.text,/AI staff-review notes/);});
test('catalog covers all five service types with complete profiles and private counseling boundaries',t=>{const {sqlite}=setup(t);const programs=sqlite.prepare('SELECT * FROM programs').all();assert.equal(programs.length,5);assert.deepEqual(new Set(programs.map(p=>p.category)),new Set(['Mentoring','Family counseling','Safety workshops','Mental health workshops','Community events']));for(const p of programs){const d=JSON.parse(p.details);for(const key of ['audience','format','schedule','locations','languages','lead','staffing','activities','measures','access','followup','capacity','record_scope','attendance_rule','enrollment_mode'])assert.ok(d[key]?.length,`${p.id}: ${key}`);}assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM groups WHERE program_id='compass'").get().n,0);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(DISTINCT student_id) n FROM enrollments').get().n,100);});
test('seeded enrollments fit program ages and group capacities',t=>{const {sqlite}=setup(t);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM enrollments e JOIN students s ON s.id=e.student_id JOIN groups g ON g.id=e.group_id JOIN programs p ON p.id=g.program_id WHERE s.age<p.min_age OR s.age>p.max_age').get().n,0);assert.equal(sqlite.prepare("SELECT g.id FROM groups g JOIN enrollments e ON e.group_id=g.id WHERE e.start_date<='2026-09-24' AND (e.end_date IS NULL OR e.end_date>='2026-09-24') GROUP BY g.id HAVING COUNT(*)>g.capacity").all().length,0);});
test('optional community events do not create absence tasks or enter the regular attendance rate',async t=>{const {DB,sqlite}=setup(t);const before=await report(DB);sqlite.exec("UPDATE attendance SET status='absent' WHERE student_id='student-001' AND session_id IN (SELECT s.id FROM sessions s JOIN groups g ON g.id=s.group_id WHERE g.program_id='together')");await reconcileFollowups(DB,'student-001','together');assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM followups WHERE program_id='together'").get().n,0);const after=await report(DB);assert.equal(after.totals.attendance_rate,before.totals.attendance_rate);assert.equal(after.totals.rate_attended,fixture.expected.rate_attended);assert.equal(after.totals.rate_absent,fixture.expected.rate_absent);});
test('registration accepts an age-appropriate community event and rejects a mismatched mentoring age',async t=>{const {env}=setup(t);const data={first_name:'Young',last_name:'Demo',age:7,guardian_name:'Demo Guardian',email:'young@example.com',language:'Haitian Creole',neighborhood:'Little Havana',group_ids:['together-havana']};assert.equal((await call(env,'/register',{method:'POST',data})).status,201);const invalid=await call(env,'/register',{method:'POST',data:{...data,group_ids:['harbor-bayview']}});assert.equal(invalid.status,400);assert.match(invalid.data.error,/11–14/);});
test('authored fictional family names and language preferences remain coherent',t=>{const {sqlite}=setup(t);for(const [name,language] of [['Lucia Ortega','Spanish'],['Rosa Rivera','Spanish'],['Claudine Francois','Haitian Creole'],['Mireille Pierre','Haitian Creole'],['Josue Laurent','Haitian Creole'],['Mei Chen','English']])assert.equal(sqlite.prepare('SELECT preferred_language FROM guardians WHERE name=?').get(name)?.preferred_language,language);const children=sqlite.prepare("SELECT first_name,last_name FROM students WHERE last_name='Francois' ORDER BY first_name").all();assert.ok(children.length>0);assert.ok(children.every(c=>['Elise','Patrick'].includes(c.first_name)));});
test('actual registration preserves the stated language rather than inferring it from a name',async t=>{const {env,sqlite}=setup(t);const data={first_name:'Demo',last_name:'Ortega',age:12,guardian_name:'Lucia Ortega',email:'stated-preference@example.com',language:'Haitian Creole',neighborhood:'Little Havana',group_ids:['wave-bayview']};assert.equal((await call(env,'/register',{method:'POST',data})).status,201);assert.equal(sqlite.prepare('SELECT preferred_language FROM guardians WHERE email=?').get(data.email).preferred_language,'Haitian Creole');});

const familyRegistration={guardian_name:'Demo Sibling Guardian',email:'siblings@example.com',language:'Spanish',neighborhood:'Little Havana',children:[{first_name:'Luz',last_name:'Demo',age:12,group_ids:['wave-bayview','together-havana']},{first_name:'Sol',last_name:'Other',age:7,group_ids:['together-havana']}]};
test('siblings share one new household and guardian with independent enrollments and future rosters',async t=>{
 const {env,sqlite}=setup(t);const result=await call(env,'/register',{method:'POST',data:familyRegistration});
 assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.children_registered,2);assert.deepEqual(Object.keys(result.data).sort(),['children_registered','message','ok']);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,102);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,71);
 const children=sqlite.prepare('SELECT s.*,g.id guardian_id FROM students s JOIN student_guardians sg ON sg.student_id=s.id JOIN guardians g ON g.id=sg.guardian_id WHERE g.email=? ORDER BY s.first_name').all(familyRegistration.email);
 assert.equal(children.length,2);assert.equal(children[0].guardian_id,children[1].guardian_id);
 for(const child of children){const programs=sqlite.prepare('SELECT group_id FROM enrollments WHERE student_id=? ORDER BY group_id').all(child.id).map(r=>r.group_id);assert.deepEqual(programs,child.first_name==='Luz'?['together-havana','wave-bayview']:['together-havana']);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM attendance a JOIN sessions s ON s.id=a.session_id WHERE a.student_id=? AND (s.status!='draft' OR s.date<'2026-09-24')").get(child.id).n,0);}
 assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
});
test('invalid sibling, repeated child and invalid child counts leave the entire family unsaved',async t=>{
 const {env,sqlite}=setup(t);
 for(const children of [[],Array(11).fill(familyRegistration.children[0]),[familyRegistration.children[0],{...familyRegistration.children[1],age:7,group_ids:['wave-bayview']}],[familyRegistration.children[0],{...familyRegistration.children[0]}],[{...familyRegistration.children[0],age:''}]]){
  assert.equal((await call(env,'/register',{method:'POST',data:{...familyRegistration,children}})).status,400);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);
 }
});
test('combined sibling capacity is checked before any family records are written',async t=>{
 const {env,sqlite}=setup(t);sqlite.prepare("UPDATE groups SET capacity=(SELECT COUNT(*) FROM enrollments WHERE group_id='wave-bayview' AND end_date IS NULL)+1 WHERE id='wave-bayview'").run();
 const children=[{...familyRegistration.children[0],group_ids:['wave-bayview']},{...familyRegistration.children[1],age:13,group_ids:['wave-bayview']}];
 assert.equal((await call(env,'/register',{method:'POST',data:{...familyRegistration,children}})).status,409);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM guardians').get().n,70);
});
test('a database failure while saving the second child rolls back the whole family',async t=>{
 const {env,sqlite}=setup(t);sqlite.exec("CREATE TRIGGER test_child_failure BEFORE INSERT ON students WHEN NEW.first_name='Sol' BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 assert.equal((await call(env,'/register',{method:'POST',data:familyRegistration})).status,500);
 for(const table of ['students','households','guardians'])assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,table==='students'?100:70);
});
test('only a manager can link all siblings to an existing confirmed guardian, with audit entries',async t=>{
 const {env,sqlite}=setup(t),data={...familyRegistration,guardian_id:'guardian-001'};
 assert.equal((await call(env,'/register',{method:'POST',data})).status,403);
 assert.equal((await call(env,'/register',{method:'POST',data,cookie:await login(env,'elena')})).status,403);
 const result=await call(env,'/register',{method:'POST',data,cookie:await login(env)});assert.equal(result.status,201,JSON.stringify(result.data));
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM guardians').get().n,70);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='registration'").get().n,2);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM student_guardians WHERE guardian_id='guardian-001'").get().n,4);
});

test('participant explanation matches the automatic per-program rule and identifies unsubmitted attendance',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),zoe=sqlite.prepare("SELECT id FROM students WHERE first_name='Zoe' AND last_name='Johnson'").get();
 sqlite.prepare("UPDATE attendance SET status='absent' WHERE student_id=? AND session_id='wave-riverside-11'").run(zoe.id);
 const detail=(await call(env,'/students/'+zoe.id,{cookie})).data;
 const wave=detail.followup_explanation.find(p=>p.program_id==='nextwave');assert.equal(wave.count,1);assert.match(wave.reason,/two are needed/);assert.ok(wave.unsubmitted_dates.includes('2026-09-24'));
 assert.equal(detail.followup_explanation.find(p=>p.program_id==='harbor').count,0);
});
test('a manager can create an owned manual concern without waiting for an absence trigger',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),data={student_id:'student-001',program_id:'harbor',reason:'Family asked for a program check-in',next_action:'Call the guardian about attending next week',due_date:'2026-09-25',owner_id:'marisol'};
 const result=await call(env,'/followups',{method:'POST',cookie,data});assert.equal(result.status,201,JSON.stringify(result.data));
 const task=sqlite.prepare('SELECT * FROM followups WHERE id=?').get(result.data.id);assert.equal(task.status,'open');assert.equal(task.owner_id,'marisol');assert.match(task.reason,/Staff concern/);
 assert.equal((await call(env,'/followups',{method:'POST',cookie,data})).status,409);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='manual_followup'").get().n,1);
 assert.equal((await call(env,'/followups',{method:'POST',cookie,data:{...data,student_id:'student-002',due_date:'invalid'}})).status,400);
});
test('new outcome entry completes a real assessment pair and corrections require current values and confirmation',async t=>{
 const {env,DB,sqlite}=setup(t),cookie=await login(env),start=sqlite.prepare("SELECT a.* FROM assessments a WHERE a.phase='start' AND NOT EXISTS(SELECT 1 FROM assessments e WHERE e.student_id=a.student_id AND e.program_id=a.program_id AND e.phase='end') LIMIT 1").get(),before=await report(DB);
 const data={student_id:start.student_id,program_id:start.program_id,phase:'end',score:4,recorded_at:'2026-09-24',expected:''};
 assert.equal((await call(env,'/assessments',{method:'POST',cookie,data})).status,201);
 const after=await report(DB);assert.equal(after.totals.assessment_pairs,before.totals.assessment_pairs+1);assert.equal(after.totals.assessment_missing_end,before.totals.assessment_missing_end-1);
 assert.equal((await call(env,'/assessments',{method:'POST',cookie,data:{...data,score:5}})).status,409);
 const correction={...data,score:5,expected:JSON.stringify([4,'2026-09-24']),replace:true};assert.equal((await call(env,'/assessments',{method:'POST',cookie,data:{...correction,replace:false}})).status,409);assert.equal((await call(env,'/assessments',{method:'POST',cookie,data:correction})).status,200);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='assessment_saved'").get().n,2);
});
test('assessment entry validates enrollment, scale, baseline and chronology without clinical intake',async t=>{
 const {env}=setup(t),cookie=await login(env),base={student_id:'student-001',program_id:'harbor',phase:'end',score:4,recorded_at:'2026-09-24',expected:''};
 for(const data of [{...base,score:6},{...base,score:''},{...base,recorded_at:'2026-10-01'},{...base,program_id:'compass'},{...base,program_id:'together'},{...base,recorded_at:'2026-07-01'}])assert.equal((await call(env,'/assessments',{method:'POST',cookie,data})).status,400);
});
const intakeHeaders='source_system,source_id,guardian_name,email,language,neighborhood,first_name,last_name,age,group_id,phone';
const intakeCSV=rows=>intakeHeaders+'\n'+rows.join('\n');
const intakeNew=intakeCSV(['test-sheet,row-1,New Demo Guardian,new-import@example.com,English,Little Havana,New,Child,7,together-havana,','test-sheet,row-2,N. Guardian,alternate@example.com,English,Little Havana,Second,Child,8,together-havana,']);
test('twenty clearly new CSV rows import without per-row decisions and repeat safely',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),groups=['minds-havana','minds-river','together-havana','together-river'];
 const csv=intakeCSV(Array.from({length:20},(_,i)=>`automatic,row-${i},Demo Guardian ${i},automatic-${i}@example.com,${['English','Spanish','Haitian Creole'][i%3]},${groups[Math.floor(i/5)].endsWith('-river')?'West Little River':'Little Havana'},Demo${i},Importchild,12,${groups[Math.floor(i/5)]},`));
 const beforeAttendance=sqlite.prepare("SELECT * FROM attendance a JOIN sessions s ON s.id=a.session_id WHERE s.status='submitted'").all();
 const preview=await call(env,'/import/preview',{method:'POST',cookie,data:{csv}});assert.equal(preview.status,200);assert.deepEqual(preview.data.summary,{ready_rows:20,review_rows:0,skipped_rows:0,new_households:20,new_children:20});assert.deepEqual(preview.data.capacity_errors,[]);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);
 const result=await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions:Array.from({length:20},()=>({auto:true}))}});assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.new_children,20);assert.equal(result.data.new_households,20);assert.equal(result.data.new_enrollments,20);
 const repeat=await call(env,'/import/commit',{method:'POST',cookie,data:{csv}});assert.equal(repeat.status,201);assert.equal(repeat.data.skipped,20);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,120);
 assert.deepEqual(sqlite.prepare("SELECT * FROM attendance a JOIN sessions s ON s.id=a.session_id WHERE s.status='submitted'").all(),beforeAttendance);assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
});
test('identical new family details group siblings and repeated child rows without duplicate people',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),csv=intakeCSV(['automatic,a,Shared Demo Adult,shared-new@example.com,Spanish,Little Havana,Luz,Newhouse,12,together-havana,305-555-0198','automatic,b,Shared Demo Adult,shared-new@example.com,Spanish,Little Havana,Sol,Newhouse,12,together-havana,305-555-0198','automatic,c,Shared Demo Adult,shared-new@example.com,Spanish,Little Havana,Luz,Newhouse,12,minds-havana,305-555-0198']);
 const preview=(await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data;assert.equal(preview.summary.ready_rows,3);assert.equal(preview.summary.new_households,1);assert.equal(preview.summary.new_children,2);assert.deepEqual(preview.rows[2].suggested_decision,{guardian:'row:0',child:'row:0'});
 const result=await call(env,'/import/commit',{method:'POST',cookie,data:{csv}});assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.new_households,1);assert.equal(result.data.new_children,2);assert.equal(result.data.new_enrollments,3);
 const imported=sqlite.prepare('SELECT * FROM import_records ORDER BY source_id').all();assert.equal(new Set(imported.map(r=>r.guardian_id)).size,1);assert.equal(imported[0].student_id,imported[2].student_id);
});
test('existing names, emails, phones and conflicting CSV identities require review without automatic merging',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env);
 for(const row of ['review,a,Other Adult,family1@example.com,English,Little Havana,New,Person,12,together-havana,','review,a,Rosa Rivera,other@example.com,English,Little Havana,New,Person,12,together-havana,','review,a,Other Adult,other@example.com,English,Little Havana,New,Person,12,together-havana,305-555-0100']){
  const csv=intakeCSV([row]),preview=(await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data;assert.equal(preview.summary.review_rows,1);assert.equal(preview.rows[0].suggested_decision,null);assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv}})).status,409);
 }
 for(const second of ['Other Adult,shared@example.com,English,Little Havana,Sol,Newhouse,12,together-havana,305-555-0199','Shared Adult,different@example.com,English,Little Havana,Sol,Newhouse,12,together-havana,305-555-0199','Shared Adult,shared@example.com,English,Little Havana,Luz,Newhouse,13,together-havana,305-555-0199']){
  const csv=intakeCSV(['review,a,Shared Adult,shared@example.com,English,Little Havana,Luz,Newhouse,12,together-havana,305-555-0199','review,b,'+second]),preview=(await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data;assert.equal(preview.rows[1].review_required,true);assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv}})).status,409);
 }
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM import_records').get().n,0);
});
test('automatic decisions are recomputed before saving when another import creates a possible match',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),csv=intakeCSV(['stale,a,Fresh Demo Adult,fresh-demo@example.com,English,Little Havana,Luz,Newhouse,12,together-havana,']);
 assert.equal((await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data.summary.ready_rows,1);
 assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv:csv.replace('stale,a','other,a')}})).status,201);
 const result=await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions:[{auto:true}]}});assert.equal(result.status,409);assert.match(result.data.error,/possible match needs review/);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,101);
});
test('automatic import checks capacity in preview and refuses the whole batch if places disappear',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),csv=intakeCSV(['capacity,a,Fresh Adult,new-capacity@example.com,English,Little Havana,Luz,Newhouse,12,together-havana,']);
 assert.deepEqual((await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data.capacity_errors,[]);
 sqlite.prepare("UPDATE groups SET capacity=0 WHERE id='together-havana'").run();assert.equal((await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).data.capacity_errors.length,1);assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv}})).status,409);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);
});
test('automatic CSV import remains manager-only and never writes records for unauthorized requests',async t=>{
 const {env,sqlite}=setup(t),teacher=await login(env,'elena'),csv=intakeCSV(['auth,a,Fresh Adult,new-auth@example.com,English,Little Havana,Luz,Newhouse,12,together-havana,']);
 for(const path of ['/import/preview','/import/commit'])for(const auth of [{},{cookie:teacher}])assert.equal((await call(env,path,{method:'POST',...auth,data:{csv}})).status,auth.cookie?403:401);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM audit_log').get().n,0);
});
test('CSV preview is read-only and proposes evidence without automatically merging different identities',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),csv=intakeCSV(['legacy,row-1,R. Rivera,family1@example.com,Spanish,Little Havana,Sofia,Rivera,12,together-havana,305-555-0100']);
 const preview=await call(env,'/import/preview',{method:'POST',cookie,data:{csv}});assert.equal(preview.status,200,JSON.stringify(preview.data));assert.ok(preview.data.rows[0].candidates.some(c=>c.guardian_id==='guardian-001'&&c.signals.includes('same email')));
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM import_records').get().n,0);
 assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions:[{}]}})).status,400);
});
test('CSV can link sibling rows to one confirmed new guardian and reimport is idempotent',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),data={csv:intakeNew,decisions:[{guardian:'new',child:'new'},{guardian:'row:0',child:'new'}]};
 const result=await call(env,'/import/commit',{method:'POST',cookie,data});assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.new_households,1);assert.equal(result.data.new_children,2);
 const identities=sqlite.prepare('SELECT guardian_id FROM import_records').all();assert.equal(identities[0].guardian_id,identities[1].guardian_id);
 const repeat=await call(env,'/import/commit',{method:'POST',cookie,data});assert.equal(repeat.data.skipped,2);assert.equal(repeat.data.new_children,0);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,102);
 assert.equal((await call(env,'/import/preview',{method:'POST',cookie,data:{csv:intakeNew.replace('New,Child','Changed,Child')}})).status,409);
});
test('three spelling/email variants can be confirmed as one existing family without overwriting canonical identity',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),csv=readFileSync(new URL('../public/samples/tidepath-messy-signups.csv',import.meta.url),'utf8'),before=sqlite.prepare("SELECT * FROM guardians WHERE id='guardian-001'").get(),child=sqlite.prepare("SELECT id FROM students WHERE first_name='Sofia' AND last_name='Rivera'").get();
 const decisions=[{guardian:'guardian-001',child:child.id},{guardian:'row:0',child:'row:0'},{guardian:'guardian-001',child:child.id}];
 const result=await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions}});assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.new_children,0);assert.equal(result.data.new_households,0);assert.ok(result.data.new_enrollments<=1);
 assert.deepEqual(sqlite.prepare("SELECT * FROM guardians WHERE id='guardian-001'").get(),before);assert.equal(sqlite.prepare('SELECT COUNT(DISTINCT student_id) n FROM import_records').get().n,1);
});
test('CSV import rejects mismatched identities and capacity errors without partial records',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),data={csv:intakeNew,decisions:[{guardian:'guardian-001',child:'student-099'},{guardian:'new',child:'new'}]};
 assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data})).status,400);
 sqlite.prepare("UPDATE groups SET capacity=0 WHERE id='together-havana'").run();data.decisions=[{guardian:'new',child:'new'},{guardian:'row:0',child:'new'}];assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data})).status,409);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM import_records').get().n,0);
});
test('CSV parser handles quoted names, rejects ambiguous source IDs and unsupported fields',async t=>{
 const {env}=setup(t),cookie=await login(env),quoted=intakeCSV(['parser,one,"Guardian, Demo",demo@example.com,English,Little Havana,Demo,Child,7,together-havana,']);
 const preview=await call(env,'/import/preview',{method:'POST',cookie,data:{csv:quoted}});assert.equal(preview.status,200);assert.equal(preview.data.rows[0].guardian_name,'Guardian, Demo');
 for(const csv of [quoted+'\n'+quoted.split('\n')[1],quoted.replace('English','French'),quoted.replace('"Guardian, Demo"','"Broken quote'),quoted.replace(',age,',',diagnosis,')])assert.equal((await call(env,'/import/preview',{method:'POST',cookie,data:{csv}})).status,400);
});
test('manual follow-ups, assessment entry and CSV import require manager access',async t=>{
 const {env}=setup(t),teacher=await login(env,'elena');for(const path of ['/followups','/assessments','/import/preview','/import/commit']){assert.equal((await call(env,path,{method:'POST',data:{}})).status,401);assert.equal((await call(env,path,{method:'POST',cookie:teacher,data:{}})).status,403);}
});
test('CSV database failure rolls back identities, enrollment, source tracking and audit together',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env);sqlite.exec("CREATE TRIGGER fail_import BEFORE INSERT ON import_records WHEN NEW.source_id='row-2' BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 assert.equal((await call(env,'/import/commit',{method:'POST',cookie,data:{csv:intakeNew,decisions:[{guardian:'new',child:'new'},{guardian:'row:0',child:'new'}]}})).status,500);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM import_records').get().n,0);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='csv_identity_confirmed'").get().n,0);
});
test('a full 20-row CSV batch uses bulk writes and stays below the D1 free-tier query budget',async t=>{
 const {env,sqlite,DB}=setup(t),cookie=await login(env);sqlite.prepare("UPDATE groups SET capacity=100 WHERE id='together-havana'").run();let queries=0;
 const tracked={...DB,prepare(sql){queries++;return DB.prepare(sql);},batch(statements){return DB.batch(statements);}};env.DB=tracked;
 const csv=intakeCSV(Array.from({length:20},(_,i)=>`bulk,${i},Guardian ${i},bulk${i}@example.com,English,Little Havana,Child${i},Demo,7,together-havana,`));
 const result=await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions:Array.from({length:20},()=>({guardian:'new',child:'new'}))}});assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(result.data.new_children,20);assert.ok(queries<50,`used ${queries} prepared statements`);
});

test('contact updates change one shared guardian for every linked child with before/after audit history',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),detail=(await call(env,'/guardians/guardian-001',{cookie})).data;
 assert.equal(detail.children.length,2);const before=detail.guardian;
 const data={name:'Rosa Rivera Demo',email:'UPDATED@example.com',phone:'+1 305 555 0199',preferred_language:'Haitian Creole',expected:detail.expected};
 const result=await call(env,'/guardians/guardian-001',{method:'PUT',cookie,data});assert.equal(result.status,200,JSON.stringify(result.data));
 for(const child of detail.children){const guardian=(await call(env,'/students/'+child.id,{cookie})).data.guardians.find(g=>g.id===before.id);assert.equal(guardian.name,data.name);assert.equal(guardian.email,'updated@example.com');assert.equal(guardian.phone,data.phone);assert.equal(guardian.preferred_language,data.preferred_language);}
 const audit=sqlite.prepare("SELECT * FROM audit_log WHERE action='guardian_contact_updated'").get();assert.equal(audit.staff_id,'marisol');assert.equal(audit.entity_id,before.id);const change=JSON.parse(audit.detail);assert.equal(change.before.email,before.email);assert.equal(change.after.email,'updated@example.com');
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM guardians').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);
 const task=await call(env,'/followups',{method:'POST',cookie,data:{student_id:detail.children[0].id,program_id:'harbor',reason:'Demo contact update check',next_action:'Call guardian',due_date:'2026-09-25'}});assert.equal(task.status,201);
 const draft=await call(env,'/followups/'+task.data.id+'/draft',{method:'POST',cookie,data:{}});assert.match(draft.data.text,/Bonjou Rosa Rivera Demo/);
});
test('guardian contact edits require manager access and validate fields without altering identities',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),teacher=await login(env,'elena'),original=(await call(env,'/guardians/guardian-001',{cookie})).data;
 const data={name:original.guardian.name,email:original.guardian.email,phone:original.guardian.phone,preferred_language:original.guardian.preferred_language,expected:original.expected};
 for(const method of ['GET','PUT']){assert.equal((await call(env,'/guardians/guardian-001',{method,...(method==='PUT'?{data}:{})})).status,401);assert.equal((await call(env,'/guardians/guardian-001',{method,cookie:teacher,...(method==='PUT'?{data}:{})})).status,403);}
 for(const patch of [{name:''},{name:'x'.repeat(121)},{email:'invalid'},{phone:'x'.repeat(41)},{preferred_language:'invalid'}])assert.equal((await call(env,'/guardians/guardian-001',{method:'PUT',cookie,data:{...data,...patch}})).status,400);
 assert.equal((await call(env,'/guardians/nonexistent',{cookie})).status,404);assert.deepEqual(sqlite.prepare("SELECT * FROM guardians WHERE id='guardian-001'").get(),Object.assign(Object.create(null),original.guardian));
 const clear=await call(env,'/guardians/guardian-001',{method:'PUT',cookie,data:{...data,phone:''}});assert.equal(clear.status,200);assert.equal(sqlite.prepare("SELECT phone FROM guardians WHERE id='guardian-001'").get().phone,'');
});
test('concurrent guardian contact edits cannot silently overwrite each other or duplicate successful audit records',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),detail=(await call(env,'/guardians/guardian-001',{cookie})).data;
 const data={name:detail.guardian.name,email:detail.guardian.email,phone:detail.guardian.phone,preferred_language:detail.guardian.preferred_language,expected:detail.expected};
 const results=await Promise.all(['First edit','Second edit'].map(name=>call(env,'/guardians/guardian-001',{method:'PUT',cookie,data:{...data,name}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='guardian_contact_updated'").get().n,1);
});
test('failed contact auditing rolls back the guardian change and matching another email never merges families',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),detail=(await call(env,'/guardians/guardian-001',{cookie})).data;
 const data={name:detail.guardian.name,email:'family2@example.com',phone:'',preferred_language:'English',expected:detail.expected};
 sqlite.exec("CREATE TRIGGER fail_contact_audit BEFORE INSERT ON audit_log WHEN NEW.action='guardian_contact_updated' BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 assert.equal((await call(env,'/guardians/guardian-001',{method:'PUT',cookie,data})).status,500);assert.equal(sqlite.prepare("SELECT email FROM guardians WHERE id='guardian-001'").get().email,detail.guardian.email);
 sqlite.exec('DROP TRIGGER fail_contact_audit');assert.equal((await call(env,'/guardians/guardian-001',{method:'PUT',cookie,data})).status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM households').get().n,70);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM guardians').get().n,70);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM student_guardians WHERE guardian_id='guardian-001'").get().n,2);
});

test('weekly brief groups families and exposes owned attendance, contact, assessment and contribution actions',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),result=await call(env,'/state',{cookie}),b=result.data.brief;
 assert.equal(b.as_of,'2026-09-24');assert.equal(b.week_end,'2026-09-30');assert.equal(b.counts.families_to_contact,2);assert.equal(b.counts.overdue_followups,2);assert.equal(b.counts.overdue_sessions,1);assert.equal(b.counts.missing_assessments,5);assert.equal(b.counts.pending_hours,17);
 assert.ok(b.attendance.every(s=>s.owner_id&&s.owner_name&&s.href.startsWith('#attendance?session=')));assert.ok(b.contacts.every(f=>f.owner_id&&f.next_action));assert.ok(b.missing_assessments.every(a=>a.student_id&&a.program_id));
 const sibling=sqlite.prepare("SELECT student_id FROM student_guardians WHERE guardian_id='guardian-001' AND student_id!='student-001'").get().student_id;const data={student_id:sibling,program_id:'harbor',reason:'Sibling check-in',next_action:'Call shared guardian',due_date:'2026-09-25'};
 // Confirm family counting uses household identity rather than the number of children.
 const before=b.counts.families_to_contact;await call(env,'/followups',{method:'POST',cookie,data:{...data,student_id:'student-001'}});await call(env,'/followups',{method:'POST',cookie,data});const after=(await call(env,'/state',{cookie})).data.brief;assert.equal(after.counts.families_to_contact,before+1);
});
test('daily and manual checks persist idempotent reminders and resolve them when source work is completed',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),contactsBefore=sqlite.prepare('SELECT COUNT(*) n FROM contact_events').get().n;let pending;
 await worker.scheduled({},env,{waitUntil(p){pending=p;}});await pending;
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM operational_alerts WHERE status='open'").get().n,3);assert.equal(sqlite.prepare("SELECT trigger FROM operations_runs").get().trigger,'scheduled');
 const result=await call(env,'/operations/check',{method:'POST',cookie,data:{}});assert.equal(result.status,200);assert.equal(result.data.alerts_refreshed,3);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM operational_alerts').get().n,3);
 sqlite.prepare("UPDATE sessions SET status='submitted' WHERE id='harbor-bayview-12'").run();sqlite.prepare("UPDATE followups SET status='resolved'").run();await call(env,'/operations/check',{method:'POST',cookie,data:{}});
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM operational_alerts WHERE status='open'").get().n,0);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM operational_alerts WHERE status='resolved'").get().n,3);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM contact_events').get().n,contactsBefore);
});
async function closePreview(env,cookie){const response=await call(env,'/quarter/close',{cookie});assert.equal(response.status,200,JSON.stringify(response.data));return response.data;}
test('quarter checklist is provisional before period end and saving requires review and disclosure of gaps',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),preview=await closePreview(env,cookie),data={expected:preview.fingerprint,reviewed:true,notes:'Fictional rehearsal: attendance, contribution approvals and voluntary responses remain incomplete. Open family tasks continue.'};
 assert.equal(preview.readiness.period_complete,false);assert.equal(preview.readiness.gaps.unsubmitted_sessions,2);assert.equal(preview.readiness.gaps.missing_assessments,5);
 assert.equal((await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{...data,reviewed:false}})).status,400);assert.equal((await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{...data,notes:''}})).status,400);
 const saved=await call(env,'/quarter/snapshots',{method:'POST',cookie,data});assert.equal(saved.status,201,JSON.stringify(saved.data));assert.equal(saved.data.status,'provisional');const frozen=(await call(env,'/quarter/snapshots/'+saved.data.id,{cookie})).data;
 assert.equal(frozen.report.totals.students,100);assert.ok(frozen.report.source_records.attendance.length);assert.equal(frozen.notes,data.notes);assert.equal(frozen.saved_by.id,'marisol');assert.match(frozen.narrative,/Disclosed gaps/);
 const repeat=await call(env,'/quarter/snapshots',{method:'POST',cookie,data});assert.equal(repeat.data.id,saved.data.id);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM report_snapshots').get().n,1);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='quarter_snapshot_saved'").get().n,1);
});
test('saved evidence remains frozen after live records change, with database update/delete protection',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),preview=await closePreview(env,cookie),saved=await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{expected:preview.fingerprint,reviewed:true,notes:'Demo gaps disclosed.'}}),id=saved.data.id;
 const before=(await call(env,'/quarter/snapshots/'+id,{cookie})).data;sqlite.prepare("UPDATE volunteer_hours SET status='approved' WHERE status='pending'").run();sqlite.prepare("UPDATE assessments SET score=5 WHERE phase='end'").run();
 const after=(await call(env,'/quarter/snapshots/'+id,{cookie})).data;assert.deepEqual(after,before);assert.notEqual((await closePreview(env,cookie)).report.totals.approved_hours,before.report.totals.approved_hours);
 assert.throws(()=>sqlite.prepare('UPDATE report_snapshots SET notes=? WHERE id=?').run('changed',id),/cannot be changed/);assert.throws(()=>sqlite.prepare('DELETE FROM report_snapshots WHERE id=?').run(id),/cannot be deleted/);
 assert.equal((await call(env,'/quarter/snapshots/'+id,{method:'PUT',cookie,data:{notes:'changed'}})).status,404);
});
test('stale quarter reviews are rejected while routine reminder checks do not invalidate unchanged report evidence',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),preview=await closePreview(env,cookie);await call(env,'/operations/check',{method:'POST',cookie,data:{}});assert.equal((await closePreview(env,cookie)).fingerprint,preview.fingerprint);
 sqlite.prepare("UPDATE volunteer_hours SET status='approved' WHERE status='pending'").run();const result=await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{expected:preview.fingerprint,reviewed:true,notes:'Review before data changed'}});assert.equal(result.status,409);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM report_snapshots').get().n,0);
});
test('quarter-end reports distinguish disclosed gaps from a completed checklist',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env);sqlite.prepare("UPDATE settings SET value='2026-09-30' WHERE key='demo_today'").run();let preview=await closePreview(env,cookie);
 let result=await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{expected:preview.fingerprint,reviewed:true,notes:'Some records remain unfinished; totals exclude them.'}});assert.equal(result.data.status,'issued_with_gaps');
 sqlite.exec("UPDATE attendance SET status='present' WHERE status IS NULL; UPDATE sessions SET status='submitted' WHERE status='draft'; UPDATE volunteer_hours SET status='approved' WHERE status='pending'; UPDATE followups SET status='resolved'; INSERT INTO assessments(student_id,program_id,phase,score,recorded_at) SELECT a.student_id,a.program_id,'end',a.score,'2026-09-30' FROM assessments a WHERE a.phase='start' AND NOT EXISTS(SELECT 1 FROM assessments e WHERE e.student_id=a.student_id AND e.program_id=a.program_id AND e.phase='end');");
 preview=await closePreview(env,cookie);assert.equal(preview.readiness.gap_count,0);result=await call(env,'/quarter/snapshots',{method:'POST',cookie,data:{expected:preview.fingerprint,reviewed:true,notes:''}});assert.equal(result.data.status,'issued');assert.equal((await call(env,'/quarter/snapshots',{cookie})).data.snapshots.length,2);
});
test('quarter archive and reminder controls require manager access and state remains inside the query budget',async t=>{
 const {env,DB}=setup(t),teacher=await login(env,'elena');for(const [path,method] of [['/quarter/close','GET'],['/quarter/snapshots','GET'],['/quarter/snapshots','POST'],['/operations/check','POST']]){assert.equal((await call(env,path,{method,...(method==='POST'?{data:{}}:{})})).status,401);assert.equal((await call(env,path,{method,cookie:teacher,...(method==='POST'?{data:{}}:{})})).status,403);}
 const cookie=await login(env);let queries=0;env.DB={...DB,prepare(sql){queries++;return DB.prepare(sql);}};assert.equal((await call(env,'/state',{cookie})).status,200);assert.ok(queries<50,`manager state used ${queries} queries`);
});
test('new regular-program enrollments appear as missing start feedback while optional events do not',async t=>{
 const {env}=setup(t),cookie=await login(env),data={first_name:'New',last_name:'Feedback Demo',age:12,guardian_name:'Demo Guardian',email:'feedback-demo@example.com',language:'English',neighborhood:'Little Havana',group_ids:['wave-bayview','together-havana']};
 assert.equal((await call(env,'/register',{method:'POST',data})).status,201);
 const brief=(await call(env,'/state',{cookie})).data.brief,missing=brief.missing_assessments.filter(a=>a.name==='New Feedback Demo');assert.equal(missing.length,1);assert.equal(missing[0].program_id,'nextwave');assert.equal(missing[0].phase,'start');assert.equal(brief.counts.missing_starts,1);
 const preview=await closePreview(env,cookie);assert.equal(preview.readiness.gaps.missing_starts,1);assert.match(preview.narrative,/1 missing start assessments/);
});

const newProgram={name:'Learning Harbor Demo',description:'A fictional mentoring program configured by a manager.',category:'Mentoring',min_age:6,max_age:18,outcome_label:'Connection to a trusted adult',enrollment_mode:'app',attendance_rule:'consecutive_absences',active:true,details:{audience:'Children and caregivers',format:'Small-group mentoring',schedule:'Tuesday afternoons',locations:['Demo Center'],languages:['English'],activities:['Goal setting'],measures:['Participation'],lead:'Program manager'}};
async function createProgram(env,cookie,data=newProgram){const r=await call(env,'/admin/programs',{method:'POST',cookie,data});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
async function adminState(env,cookie){const r=await call(env,'/admin',{cookie});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
async function createGroup(env,cookie,program_id){const r=await call(env,'/admin/groups',{method:'POST',cookie,data:{program_id,name:'Demo mentoring group',school:'Demo Center',neighborhood:'Little Havana',weekday:'Tuesday',time:'4:00 p.m.',capacity:10,active:true}});assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;}
test('managers can configure a new mentoring program, enroll children, assign mentors and schedule teacher attendance',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),program=await createProgram(env,cookie),group=await createGroup(env,cookie,program);
 const volunteer=await call(env,'/admin/volunteers',{method:'POST',cookie,data:{name:'New Mentor Demo',email:'new-mentor@example.com',role:'Mentor',languages:['English','Spanish'],active:true}});assert.equal(volunteer.status,201);
 const staff=await call(env,'/admin/staff',{method:'POST',cookie,data:{name:'New Teacher Demo',email:'new-teacher@tidepath.example',password:'Teacher-demo-2026!',role:'teacher',active:true,group_ids:[group]}});assert.equal(staff.status,201,JSON.stringify(staff.data));
 const csv=intakeCSV([`new-program,sofia,Rosa Rivera,family1@example.com,Spanish,Little Havana,Sofia,Rivera,11,${group},`]);const imported=await call(env,'/import/commit',{method:'POST',cookie,data:{csv,decisions:[{guardian:'guardian-001',child:'student-001'}]}});assert.equal(imported.status,201,JSON.stringify(imported.data));
 const match=await call(env,'/matches',{method:'POST',cookie,data:{student_id:'student-001',volunteer_id:volunteer.data.id,program_id:program}});assert.equal(match.status,200,JSON.stringify(match.data));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM mentor_matches WHERE student_id='student-001' AND end_date IS NULL").get().n,2);
 const session=await call(env,'/admin/sessions',{method:'POST',cookie,data:{group_id:group,date:'2026-09-29',topic:'First mentoring check-in'}});assert.equal(session.status,201,JSON.stringify(session.data));
 const teacherLogin=await call(env,'/login',{method:'POST',data:{email:'new-teacher@tidepath.example',password:'Teacher-demo-2026!'}});assert.equal(teacherLogin.status,200);const teacher=teacherLogin.cookie,state=(await call(env,'/state',{cookie:teacher})).data;assert.deepEqual(state.groups.map(g=>g.id),[group]);assert.equal(state.guardians,undefined);assert.equal((await call(env,'/sessions/harbor-bayview-01',{cookie:teacher})).status,403);
 const roster=(await call(env,'/sessions/'+session.data.id,{cookie:teacher})).data;assert.equal(roster.roster.length,1);assert.equal(roster.roster[0].student_id,'student-001');assert.equal((await call(env,'/sessions/'+session.data.id,{method:'PUT',cookie:teacher,data:{version:0,entries:[{student_id:'student-001',status:'present'}]}})).status,200);
 const publicData=(await call(env,'/public/programs')).data;assert.ok(publicData.programs.some(p=>p.id===program));assert.ok(publicData.groups.some(g=>g.id===group));
});
test('program and group edits preserve history, validate ages/capacity and archive new intake without deleting records',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),admin=await adminState(env,cookie),p=admin.programs.find(p=>p.id==='harbor'),d=JSON.parse(p.details),base={...p,enrollment_mode:d.enrollment_mode,attendance_rule:d.attendance_rule,active:true,details:d};
 assert.equal((await call(env,'/admin/programs/harbor',{method:'PUT',cookie,data:{...base,min_age:17}})).status,400);assert.equal((await call(env,'/admin/programs/harbor',{method:'PUT',cookie,data:{...base,attendance_rule:'optional'}})).status,400);
 const group=admin.groups.find(g=>g.id==='harbor-bayview');assert.equal((await call(env,'/admin/groups/'+group.id,{method:'PUT',cookie,data:{...group,active:true,capacity:1}})).status,400);assert.equal((await call(env,'/admin/groups/'+group.id,{method:'PUT',cookie,data:{...group,active:true,school:'Changed venue'}})).status,400);
 assert.equal((await call(env,'/admin/programs/harbor',{method:'PUT',cookie,data:{...base,name:'Harbor Mentors Updated',active:false}})).status,200);const pub=(await call(env,'/public/programs')).data;assert.ok(!pub.programs.some(p=>p.id==='harbor'));assert.ok(!pub.groups.some(g=>g.program_id==='harbor'));assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM programs WHERE id='harbor'").get().n,1);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM sessions WHERE group_id='harbor-bayview'").get().n,12);
 const registration={first_name:'Test',last_name:'Demo',age:12,guardian_name:'Adult Demo',email:'archived@example.com',language:'English',neighborhood:'Little Havana',group_ids:['harbor-bayview']};assert.equal((await call(env,'/register',{method:'POST',data:registration})).status,400);
 assert.equal((await call(env,'/admin/programs',{method:'POST',cookie,data:{...newProgram,category:'Family counseling'}})).status,400);
});
test('archived volunteers cannot receive new hours or matches and active mentors must be reassigned first',async t=>{
 const {env}=setup(t),cookie=await login(env),admin=await adminState(env,cookie),mentor=admin.volunteers.find(v=>v.id==='volunteer-001');assert.equal((await call(env,'/admin/volunteers/'+mentor.id,{method:'PUT',cookie,data:{...mentor,active:false}})).status,400);
 const helper=admin.volunteers.find(v=>v.id==='volunteer-006');assert.equal((await call(env,'/admin/volunteers/'+helper.id,{method:'PUT',cookie,data:{...helper,languages:['English'],active:false}})).status,200);
 assert.equal((await call(env,'/hours',{method:'POST',cookie,data:{volunteer_id:helper.id,session_id:'harbor-bayview-12',hours:1,note:''}})).status,400);
});
test('staff group access can be reassigned and deactivation/password changes invalidate existing sessions',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),teacher=await login(env,'elena');let admin=await adminState(env,cookie),s=admin.staff.find(s=>s.id==='elena');
 const data={...s,active:true,group_ids:['wave-riverside'],password:''};assert.equal((await call(env,'/admin/staff/elena',{method:'PUT',cookie,data})).status,200);assert.equal((await call(env,'/sessions/harbor-bayview-01',{cookie:teacher})).status,403);assert.equal((await call(env,'/sessions/wave-riverside-11',{cookie:teacher})).status,200);
 admin=await adminState(env,cookie);s=admin.staff.find(s=>s.id==='elena');assert.equal((await call(env,'/admin/staff/elena',{method:'PUT',cookie,data:{...data,version:s.version,password:'Updated-teacher-2026!'}})).status,200);assert.equal((await call(env,'/state',{cookie:teacher})).status,401);
 const signed=await call(env,'/login',{method:'POST',data:{email:s.email,password:'Updated-teacher-2026!'}});assert.equal(signed.status,200);
 admin=await adminState(env,cookie);s=admin.staff.find(s=>s.id==='elena');assert.equal((await call(env,'/admin/staff/elena',{method:'PUT',cookie,data:{...data,version:s.version,active:false}})).status,200);assert.equal((await call(env,'/state',{cookie:signed.cookie})).status,401);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM staff_groups WHERE staff_id='elena'").get().n,0);
 assert.equal((await call(env,'/login',{method:'POST',data:{email:s.email,password:'Updated-teacher-2026!'}})).status,401);assert.ok(!JSON.stringify(sqlite.prepare('SELECT detail FROM audit_log').all()).includes('Updated-teacher-2026!'));
});
test('workspace administration protects manager access and is unavailable to session leaders or public users',async t=>{
 const {env}=setup(t),cookie=await login(env),teacher=await login(env,'elena'),admin=await adminState(env,cookie),me=admin.staff.find(s=>s.id==='marisol');
 for(const path of ['/admin','/admin/programs','/admin/staff','/admin/groups','/admin/volunteers','/admin/sessions','/admin/settings']){const method=path==='/admin'?'GET':path.endsWith('settings')?'PUT':'POST';for(const auth of [{},{cookie:teacher}])assert.equal((await call(env,path,{method,...auth,...(method==='GET'?{}:{data:{}})})).status,auth.cookie?403:401);}
 assert.equal((await call(env,'/admin/staff/marisol',{method:'PUT',cookie,data:{...me,active:false,group_ids:[]}})).status,400);assert.equal((await call(env,'/admin/staff/marisol',{method:'PUT',cookie,data:{...me,role:'teacher',active:true,group_ids:[]}})).status,400);
 assert.equal(JSON.stringify(admin).includes('password_hash'),false);assert.equal(JSON.stringify(admin).includes('password_salt'),false);
});
test('concurrent staff edits cannot apply the losing request’s group assignments',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),admin=await adminState(env,cookie),staff=admin.staff.find(s=>s.id==='elena'),groups=['harbor-bayview','wave-riverside'];
 const responses=await Promise.all(groups.map((group,i)=>call(env,'/admin/staff/elena',{method:'PUT',cookie,data:{...staff,name:'Teacher edit '+i,active:true,group_ids:[group],password:''}})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);const winner=responses.findIndex(r=>r.status===200);assert.deepEqual(sqlite.prepare("SELECT group_id FROM staff_groups WHERE staff_id='elena'").all().map(r=>r.group_id),[groups[winner]]);
});
test('organization and service-area settings support other nonprofits without changing historical household links',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),data={version:0,organization_name:'New Community Alliance',service_areas:['New District','North Center'],quarter_start:'2026-07-01',quarter_end:'2026-09-30',demo_today:'2026-09-24'};
 assert.equal((await call(env,'/admin/settings',{method:'PUT',cookie,data})).status,200);const pub=(await call(env,'/public/programs')).data;assert.equal(pub.workspace.organization_name,data.organization_name);assert.deepEqual(pub.workspace.service_areas,data.service_areas);
 const registration={first_name:'Demo',last_name:'New Area',age:12,guardian_name:'Demo Guardian',email:'new-area@example.com',language:'English',neighborhood:'New District',group_ids:['wave-bayview']};assert.equal((await call(env,'/register',{method:'POST',data:registration})).status,201);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM households WHERE neighborhood='New District'").get().n,1);assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
 assert.equal((await call(env,'/admin/settings',{method:'PUT',cookie,data})).status,409);
 const c=await call(env,'/import/preview',{method:'POST',cookie,data:{csv:intakeCSV(['areas,1,Demo Parent,parent@example.com,English,North Center,Demo,Child,7,together-havana,'])}});assert.equal(c.status,200,JSON.stringify(c.data));
});
test('concurrent organization updates preserve only the winning settings and audit',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env),base={version:0,service_areas:['Little Havana'],quarter_start:'2026-07-01',quarter_end:'2026-09-30',demo_today:'2026-09-24'},names=['Organization A','Organization B'];
 const responses=await Promise.all(names.map(organization_name=>call(env,'/admin/settings',{method:'PUT',cookie,data:{...base,organization_name}})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(sqlite.prepare("SELECT value FROM settings WHERE key='organization_name'").get().value,names[responses.findIndex(r=>r.status===200)]);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='workspace_settings_saved'").get().n,1);
});
test('additive administration migrations preserve existing identities, sessions, snapshots and foreign keys',async t=>{
 const local=openDatabase();t.after(()=>local.close());const files=readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();for(const f of files.filter(f=>f<'0005'))local.sqlite.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));
 const legacySQL=fixture.sql.split('\n').map(line=>line.startsWith('INSERT INTO mentor_matches')?line.replace(',program_id)',')').replace(/,'harbor'\);$/,');'):line).join('\n');local.sqlite.exec(legacySQL);
 local.sqlite.prepare('INSERT INTO report_snapshots VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-snapshot','legacy-key','2026-07-01','2026-09-30','provisional','marisol','2026-11-07','Existing disclosure','hash','{"frozen":true}');
 const before=local.sqlite.prepare('SELECT * FROM households ORDER BY id').all();local.sqlite.exec('BEGIN');try{for(const f of files.filter(f=>f>='0005'))local.sqlite.exec(readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8'));local.sqlite.exec('COMMIT');}catch(e){local.sqlite.exec('ROLLBACK');throw e;}
 assert.deepEqual(local.sqlite.prepare('SELECT * FROM households ORDER BY id').all(),before);assert.equal(local.sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,100);assert.equal(local.sqlite.prepare("SELECT COUNT(*) n FROM mentor_matches WHERE program_id='harbor'").get().n,20);assert.equal(local.sqlite.prepare("SELECT payload FROM report_snapshots WHERE id='legacy-snapshot'").get().payload,'{"frozen":true}');assert.equal(local.sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
});
test('PWA install assets are complete and offline shell fallback never caches API or cross-origin records',async()=>{
 const {runInNewContext}=await import('node:vm'),manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.ok(manifest.start_url.startsWith('/'));
 for(const icon of manifest.icons){const png=readFileSync(new URL('../public'+icon.src,import.meta.url));assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png.readUInt32BE(16)+'x'+png.readUInt32BE(20),icon.sizes);}assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
 const handlers={};runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{location:{origin:'http://tidepath.test'},addEventListener:(name,fn)=>handlers[name]=fn},URL,fetch:async()=>{throw new Error('offline');},caches:{match:async()=>new Response('cached public shell')}});
 for(const request of [new Request('http://tidepath.test/api/state'),new Request('http://tidepath.test/api/students/student-001'),new Request('http://other.test/index.html'),new Request('http://tidepath.test/index.html',{method:'POST'})]){let responded=false;handlers.fetch({request,respondWith(){responded=true;}});assert.equal(responded,false);}
 let response;handlers.fetch({request:new Request('http://tidepath.test/index.html'),respondWith(p){response=p;}});assert.equal(await (await response).text(),'cached public shell');
});
test('empty-workspace bootstrap creates one hashed manager, no sample children, and refuses an existing database',async t=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync}=await import('node:child_process');const dir=mkdtempSync(join(tmpdir(),'tidepath-bootstrap-test-')),path=join(dir,'empty.sqlite');let local;t.after(()=>{local?.close();rmSync(dir,{recursive:true,force:true});});
 const env={...process.env,TIDEPATH_DB_PATH:path,TIDEPATH_ADMIN_NAME:'Test Manager',TIDEPATH_ADMIN_EMAIL:'manager@test.example',TIDEPATH_ADMIN_PASSWORD:'Bootstrap-test-2026!',TIDEPATH_ORGANIZATION:'Test Community',TIDEPATH_SERVICE_AREAS:'Central,North',TIDEPATH_QUARTER_START:'2026-10-01',TIDEPATH_QUARTER_END:'2026-12-31',TIDEPATH_WORKING_DATE:'2026-11-08'};
 const result=spawnSync(process.execPath,['scripts/bootstrap.mjs','--local'],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.ok(!result.stdout.includes(env.TIDEPATH_ADMIN_PASSWORD));local=openDatabase(path);assert.equal(local.sqlite.prepare('SELECT COUNT(*) n FROM students').get().n,0);assert.equal(local.sqlite.prepare('SELECT COUNT(*) n FROM staff').get().n,1);assert.notEqual(local.sqlite.prepare('SELECT password_hash FROM staff').get().password_hash,env.TIDEPATH_ADMIN_PASSWORD);
 const apiEnv={DB:local.DB,DEMO_MODE:'false',ASSETS:{fetch:async()=>new Response('shell')}};const loginResponse=await call(apiEnv,'/login',{method:'POST',data:{email:env.TIDEPATH_ADMIN_EMAIL,password:env.TIDEPATH_ADMIN_PASSWORD}});assert.equal(loginResponse.status,200);const state=(await call(apiEnv,'/state',{cookie:loginResponse.cookie})).data;assert.equal(state.workspace.organization_name,'Test Community');assert.equal(state.students.length,0);assert.equal(state.report.demo,false);assert.equal(state.brief.counts.families_to_contact,0);
 const repeat=spawnSync(process.execPath,['scripts/bootstrap.mjs','--local'],{env,encoding:'utf8'});assert.notEqual(repeat.status,0);assert.equal(local.sqlite.prepare('SELECT COUNT(*) n FROM staff').get().n,1);
});

test('volunteer languages require explicit multi-language entry and persist through edits',async t=>{
 const {env,sqlite}=setup(t),cookie=await login(env);const base={name:'Language Demo',email:'language-demo@example.com',role:'Mentor',active:true};
 for(const languages of [undefined,[],[''],['English','english'],'English',Array(21).fill('Spanish')])assert.equal((await call(env,'/admin/volunteers',{method:'POST',cookie,data:{...base,languages}})).status,400);
 const created=await call(env,'/admin/volunteers',{method:'POST',cookie,data:{...base,languages:['English','Haitian Creole','Portuguese']}});assert.equal(created.status,201);
 let row=(await adminState(env,cookie)).volunteers.find(v=>v.id===created.data.id);assert.deepEqual(JSON.parse(row.languages),['English','Haitian Creole','Portuguese']);
 assert.equal((await call(env,'/admin/volunteers/'+row.id,{method:'PUT',cookie,data:{...row,languages:['Spanish','Portuguese']}})).status,200);
 const state=await call(env,'/state',{cookie});assert.deepEqual(JSON.parse(state.data.volunteers.find(v=>v.id===row.id).languages),['Spanish','Portuguese']);
 assert.equal(sqlite.prepare("SELECT languages FROM volunteers WHERE id='volunteer-001'").get().languages,'[]');
});


test('authorization matrix blocks direct manager-resource requests before any record mutation',async t=>{
 const {env,sqlite}=setup(t),manager=await login(env),teacher=await login(env,'elena');
 const preview=(await call(env,'/quarter/close',{cookie:manager})).data;const snapshot=await call(env,'/quarter/snapshots',{method:'POST',cookie:manager,data:{expected:preview.fingerprint,reviewed:true,notes:'Fictional permission audit; all gaps disclosed.'}});assert.equal(snapshot.status,201);
 const follow=sqlite.prepare('SELECT id FROM followups LIMIT 1').get().id,hours=sqlite.prepare('SELECT id FROM volunteer_hours LIMIT 1').get().id;
 const paths=['/students/student-001','/guardians/guardian-001','/followups','/followups/'+follow,'/followups/'+follow+'/draft','/followups/'+follow+'/events','/hours','/hours/'+hours,'/matches','/assessments','/report','/report/draft','/import/preview','/import/commit','/operations/check','/quarter/close','/quarter/snapshots','/quarter/snapshots/'+snapshot.data.id,'/admin','/admin/programs','/admin/programs/harbor','/admin/groups/harbor-bayview','/admin/staff/marisol','/admin/volunteers/volunteer-001','/admin/settings','/admin/sessions'];
 const before=JSON.stringify(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,sqlite.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]));
 for(const path of paths)for(const method of ['GET','POST','PUT','PATCH','DELETE'])for(const cookie of [undefined,teacher]){
  const r=await call(env,path,{method,cookie,...(method==='GET'?{}:{data:{role:'manager',staff_id:'marisol',owner_id:'marisol',tenant_id:'other'}})});assert.equal(r.status,cookie?403:401,method+' '+path);assert.deepEqual(Object.keys(r.data),['error']);
 }
 const after=JSON.stringify(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,sqlite.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]));assert.equal(after,before);
});

test('roster ID and student ID tampering cannot access another group or change its attendance',async t=>{
 const {env,sqlite}=setup(t),teacher=await login(env,'elena');const before=JSON.stringify(sqlite.prepare('SELECT * FROM attendance ORDER BY session_id,student_id').all());
 for(const method of ['GET','PUT','DELETE'])assert.equal((await call(env,'/sessions/wave-riverside-12?role=manager',{method,cookie:teacher,...(method==='GET'?{}:{data:{role:'manager',version:0,entries:[]}})})).status,403);
 const own=(await call(env,'/sessions/harbor-bayview-12',{cookie:teacher})).data;assert.equal(own.session.group_id,'harbor-bayview');
 const outsider=sqlite.prepare('SELECT student_id FROM attendance WHERE session_id=? AND student_id NOT IN (SELECT student_id FROM attendance WHERE session_id=?) LIMIT 1').get('wave-riverside-12','harbor-bayview-12').student_id;
 const bad=await call(env,'/sessions/harbor-bayview-12',{method:'PUT',cookie:teacher,data:{version:own.session.version,entries:[...own.roster.map(r=>({student_id:r.student_id,status:'present'})),{student_id:outsider,status:'absent'}]}});assert.equal(bad.status,400);
 assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM attendance ORDER BY session_id,student_id').all()),before);
 assert.equal(sqlite.prepare("SELECT version FROM sessions WHERE id='harbor-bayview-12'").get().version,own.session.version);
});

test('separate nonprofit databases do not accept one another’s session cookies even with identical record IDs',async t=>{
 const a=setup(t),b=setup(t),manager=await login(a.env),teacher=await login(a.env,'elena');
 for(const cookie of [manager,teacher])for(const path of ['/state','/students/student-001','/sessions/harbor-bayview-12','/admin'])assert.equal((await call(b.env,path,{cookie})).status,401);
 assert.equal((await call(a.env,'/state',{cookie:manager})).status,200);
});

test('unknown roles fail closed even if a future schema or external write introduces one',async t=>{
 const {env,sqlite}=setup(t),teacher=await login(env,'elena');sqlite.exec('PRAGMA ignore_check_constraints=ON');sqlite.prepare("UPDATE staff SET role='observer' WHERE id='elena'").run();sqlite.exec('PRAGMA ignore_check_constraints=OFF');
 for(const path of ['/state','/sessions/harbor-bayview-12','/admin'])assert.equal((await call(env,path,{cookie:teacher})).status,401);
 assert.equal((await call(env,'/login',{method:'POST',data:{email:'elena@tidepath.example',password:DEMO_PASSWORD}})).status,401);
});
