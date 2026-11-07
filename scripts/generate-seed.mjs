import { pbkdf2Sync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const DEMO_PASSWORD = 'TidePath-demo-2026!';
export function generateSeed() {
  const rows = [];
  const q = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replaceAll("'", "''") + "'";
  const add = (table, data) => rows.push(`INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${Object.values(data).map(q).join(',')});`);
  const id = (prefix, i) => `${prefix}-${String(i).padStart(3,'0')}`;
  const date = (start, weeks) => new Date(Date.parse(start+'T12:00:00Z')+weeks*7*86400000).toISOString().slice(0,10);
  add('settings',{key:'demo_today',value:'2026-09-24'});
  add('settings',{key:'quarter_start',value:'2026-07-01'});
  add('settings',{key:'quarter_end',value:'2026-09-30'});
  const staff = [ ['marisol','Marisol Vega','marisol@tidepath.example','manager'], ['elena','Elena Brooks','elena@tidepath.example','teacher'], ['james','James Okafor','james@tidepath.example','teacher'], ['priya','Priya Shah','priya@tidepath.example','teacher'] ];
  for (const [sid,name,email,role] of staff) {
    const salt = `tidepath-fictional-${sid}`;
    add('staff',{id:sid,name,email,role,password_hash:pbkdf2Sync(DEMO_PASSWORD,salt,100000,32,'sha256').toString('hex'),password_salt:salt});
  }
  const surnames = ['Rivera','Chen','Ortega','Johnson','Patel','Williams','Santos','Nguyen','Thompson','Martinez','Reed','Hassan','Garcia','Brown','Lewis','Kim','Robinson','Lopez','Walker','Allen','Young','King','Wright','Scott','Green','Baker','Adams','Nelson','Hill','Campbell','Mitchell','Carter'];
  const adults=['Rosa','Mei','Lucia','Dana','Anita','Simone','Paula','Linh','Morgan','Isabel','Jordan','Amira','Elena','Taylor','Avery','Jisoo','Cameron','Valeria','Casey','Robin','Drew','Alex','Riley','Jamie','Sage','Leslie','Quinn','Parker','Reese','Sam','Blair','Skyler'];
  for(let i=0;i<32;i++) {
    add('households',{id:id('household',i+1),name:`${surnames[i]} family`,neighborhood:i%2===0?'Little Havana':'West Little River'});
    add('guardians',{id:id('guardian',i+1),household_id:id('household',i+1),name:`${adults[i]} ${surnames[i]}`,email:`family${i+1}@example.com`,phone:`305-555-${String(100+i).padStart(4,'0')}`,preferred_language:['Spanish','English','Haitian Creole'][i%3]});
  }
  const firsts=['Sofia','Ethan','Camila','Noah','Aisha','Oliver','Isabella','Liam','Mateo','Chloe','Diego','Zoe','Rohan','Maya','Lucas','Aria','Amelia','Benjamin','Layla','Elijah','Grace','Daniel','Nora','Sebastian','Leila','Henry','Mila','Samuel','Zara','Leo','Alice','Owen','Naomi','Gabriel','Eva','Isaac','Ivy','Julian','Ruby','Adam'];
  for(let i=0;i<40;i++) {
    const gi=i<8?i:i<16?i-8:i-8;
    add('students',{id:id('student',i+1),first_name:firsts[i],last_name:surnames[gi],age:11+(i%4),created_at:'2026-06-22T12:00:00.000Z'});
    add('student_guardians',{student_id:id('student',i+1),guardian_id:id('guardian',gi+1)});
  }
  add('programs',{id:'harbor',name:'Harbor Mentors',description:'A trusted adult, a steady connection. Weekly mentoring helps students build confidence, set personal goals, and navigate school challenges.',outcome_label:'Confidence and connection to a trusted adult'});
  add('programs',{id:'nextwave',name:'Next Wave Workshops',description:'School-based safety and emotional wellbeing workshops. Students practice asking for help, recognizing trusted adults, handling conflict, and supporting one another. This educational program is separate from clinical counseling.',outcome_label:'Confidence asking for help and identifying support'});
  const groups=[['harbor-bayview','harbor','Harbor · Bayview','Bayview Middle School','Tuesday','3:30–4:30 p.m.',20,'2026-07-07','elena'],['wave-bayview','nextwave','Next Wave · Bayview','Bayview Middle School','Wednesday','3:30–5:00 p.m.',15,'2026-07-08','james'],['wave-riverside','nextwave','Next Wave · Riverside','Riverside Middle School','Thursday','3:30–5:00 p.m.',15,'2026-07-09','priya']];
  for(const [gid,program_id,name,school,weekday,time,capacity,,owner] of groups) { add('groups',{id:gid,program_id,name,school,neighborhood:gid==='wave-riverside'?'West Little River':'Little Havana',weekday,time,capacity}); add('staff_groups',{staff_id:owner,group_id:gid}); }
  const enrollments=[];
  for(let i=1;i<=20;i++) enrollments.push({id:`enroll-h-${i}`,student_id:id('student',i),group_id:'harbor-bayview',start_date:'2026-07-01',end_date:null});
  for(let i=11;i<=40;i++) {
    const group_id=i<=25?'wave-bayview':'wave-riverside';
    if(i===12) {
      enrollments.push({id:'enroll-w-12-a',student_id:id('student',i),group_id,start_date:'2026-07-01',end_date:'2026-08-14'});
      enrollments.push({id:'enroll-w-12-b',student_id:id('student',i),group_id:'wave-riverside',start_date:'2026-08-15',end_date:null});
    } else enrollments.push({id:`enroll-w-${i}`,student_id:id('student',i),group_id,start_date:i===40?'2026-07-24':'2026-07-01',end_date:null});
  }
  enrollments.forEach(e=>add('enrollments',e));
  const mentorNames=['Ana Morales','David Park','Nadia Ahmed','Marcus Ellis','Beatriz Costa'];
  for(let i=1;i<=9;i++) add('volunteers',{id:id('volunteer',i),name:i<=5?mentorNames[i-1]:['Emma Wilson','Luis Torres','Fatima Ali','Theo James'][i-6],email:`volunteer${i}@example.com`,role:i<=5?'Mentor':'Workshop facilitator'});
  for(let i=1;i<=20;i++) add('mentor_matches',{id:`match-${i}`,student_id:id('student',i),volunteer_id:id('volunteer',Math.ceil(i/4)),start_date:'2026-07-01',end_date:null});
  const sessionData=[],attData=[],hourData=[];
  const topicsH=['Getting to know you','Strengths and interests','Small goals','Asking for help','A challenge I handled','Listening well','My support network','School transitions','Making a plan','Checking our goals','Staying connected','Quarter reflection'];
  const topicsW=['Our support network','Feeling safe at school','Trusted adults','Asking for help','Respectful communication','Handling conflict','Understanding emotions','Healthy boundaries','Supporting a friend','Community safety','Practice asking for help','Reflection and celebration'];
  for(const [gid,program,,,,,,start,owner] of groups) {
    for(let w=0;w<12;w++) {
      const sid=`${gid}-${String(w+1).padStart(2,'0')}`,day=date(start,w);
      const status=gid==='wave-bayview'&&w===4?'cancelled':w===11&&(program==='harbor'||gid==='wave-riverside')?'draft':'submitted';
      const session={id:sid,group_id:gid,date:day,topic:(program==='harbor'?topicsH:topicsW)[w],status,version:0,submitted_by:status==='submitted'?owner:null,submitted_at:status==='submitted'?`${day}T21:00:00.000Z`:null};
      add('sessions',session); sessionData.push({...session,program_id:program});
      for(const e of enrollments.filter(e=>e.group_id===gid&&e.start_date<=day&&(!e.end_date||e.end_date>=day))) {
        const n=Number(e.student_id.slice(-3));
        let mark=(n*7+w*3)%29===0?'absent':(n+w)%17===0?'excused':(n+w*5)%13===0?'late':'present';
        if(program==='harbor'&&n===1) mark=w===10?'absent':'present';
        if(program==='harbor'&&n===3) mark=w>=9&&w<=10?'absent':'present';
        if(program==='nextwave'&&n===28) mark=w>=9&&w<=10?'absent':'present';
        if(status==='draft') mark=gid==='wave-riverside'&&n>=26&&n<=30?'present':null;
        if(status==='cancelled') mark=null;
        const att={session_id:sid,student_id:e.student_id,status:mark,updated_by:mark?owner:null,updated_at:mark?`${day}T21:00:00.000Z`:null};
        add('attendance',att);attData.push(att);
      }
      if(status==='submitted') for(const v of program==='harbor'?[1,2,3,4,5]:gid==='wave-bayview'?[6,7]:[8,9]) {
        const h={id:`hours-${sid}-${v}`,volunteer_id:id('volunteer',v),session_id:sid,hours:program==='harbor'?1:1.5,status:w===10?'pending':'approved',note:''};
        add('volunteer_hours',h);hourData.push(h);
      }
    }
  }
  for(const [i,p,why,due] of [[3,'harbor','Two consecutive unexplained absences: September 8 and 15.','2026-09-16'],[28,'nextwave','Two consecutive unexplained absences: September 10 and 17.','2026-09-18']]) {
    add('followups',{id:`followup-${i}`,student_id:id('student',i),program_id:p,reason:why,owner_id:'marisol',due_date:due,status:i===28?'awaiting_reply':'open',next_action:i===3?'Call guardian to understand the barrier.':'Arrange transport support and check back with the guardian.',draft:'',draft_source:'',created_at:`${due}T09:00:00.000Z`,resolved_at:null});
  }
  add('contact_events',{id:'contact-transport',followup_id:'followup-28',kind:'reply',body:'Transport has been difficult since my work schedule changed. Could you help us find a way to get to the workshop?',staff_id:'marisol',created_at:'2026-09-18T15:00:00.000Z'});
  let pairs=0,totalGain=0;
  for(const [p,nums] of [['harbor',Array.from({length:20},(_,i)=>i+1)],['nextwave',Array.from({length:30},(_,i)=>i+11)]]) for(const n of nums) {
    const start=2+n%3,end=Math.min(5,start+(n%4===0?0:1));
    add('assessments',{student_id:id('student',n),program_id:p,phase:'start',score:start,recorded_at:'2026-07-10'});
    if(n%17!==0) {add('assessments',{student_id:id('student',n),program_id:p,phase:'end',score:end,recorded_at:'2026-09-23'});pairs++;totalGain+=end-start;}
  }
  const committed=new Set(sessionData.filter(s=>s.status==='submitted').map(s=>s.id));
  const committedAttendance=attData.filter(a=>committed.has(a.session_id));
  const expected={students:40,guardians:32,program_enrollments:50,enrollment_rows:51,sessions:36,submitted_sessions:sessionData.filter(s=>s.status==='submitted').length,cancelled_sessions:1,incomplete_sessions:2,expected_attendance:committedAttendance.length,attended:committedAttendance.filter(a=>['present','late'].includes(a.status)).length,absent:committedAttendance.filter(a=>a.status==='absent').length,excused:committedAttendance.filter(a=>a.status==='excused').length,unmarked:attData.filter(a=>a.status===null&&sessionData.find(s=>s.id===a.session_id).status==='draft').length,approved_hours:hourData.filter(h=>h.status==='approved').reduce((sum,h)=>sum+h.hours,0),pending_hours:hourData.filter(h=>h.status==='pending').reduce((sum,h)=>sum+h.hours,0),assessment_pairs:pairs,average_gain:totalGain/pairs};
  return {sql:rows.join('\n')+'\n',expected};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {sql,expected}=generateSeed();mkdirSync('seed',{recursive:true});writeFileSync('seed/demo.sql',sql);writeFileSync('seed/expected.json',JSON.stringify(expected,null,2)+'\n');console.log('Generated fictional Q3 2026 seed and independent expected totals.');
}
