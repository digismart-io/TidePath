import { writeFileSync } from 'node:fs';
import { familyProfiles, studentFamilyIndex, authoredChildName } from '../seed/families.mjs';
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const id=(prefix,n)=>`${prefix}-${String(n).padStart(3,'0')}`;
const sql=[];
for(let i=0;i<familyProfiles.length;i++){
  const f=familyProfiles[i],guardian=id('guardian',i+1);
  // Discard only unsent generated drafts if their contact-language context changed.
  // Recorded contact attempts and replies remain intact.
  sql.push(`UPDATE followups SET draft='',draft_source='' WHERE student_id IN (SELECT sg.student_id FROM student_guardians sg JOIN guardians g ON g.id=sg.guardian_id WHERE g.id=${q(guardian)} AND g.preferred_language<>${q(f.language)});`);
  sql.push(`UPDATE guardians SET name=${q(f.guardianFirst+' '+f.lastName)},preferred_language=${q(f.language)} WHERE id=${q(guardian)};`);
  sql.push(`UPDATE households SET name=${q(f.lastName+' family')} WHERE id=${q(id('household',i+1))};`);
}
for(let i=40;i<100;i++){
  const f=familyProfiles[studentFamilyIndex(i)];
  sql.push(`UPDATE students SET first_name=${q(authoredChildName(i))},last_name=${q(f.lastName)} WHERE id=${q(id('student',i+1))};`);
}
writeFileSync('seed/family-cleanup.sql',sql.join('\n')+'\n');
console.log('Generated metadata-only cleanup for the authored fictional families. No enrollments, attendance, hours or contact history are deleted.');
