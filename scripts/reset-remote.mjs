import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSeed } from './generate-seed.mjs';
// This reset is deliberately limited to the known, disposable hackathon database.
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(process.argv[2]!=='--confirm=tidepath-demo'||config.vars?.DEMO_MODE!=='true'||config.d1_databases?.[0]?.database_id!=='aa0e78aa-8805-404c-b66c-3cfc975ec38f') {
  console.error('To reset only the fictional hosted demo: npm run demo:reset:remote -- --confirm=tidepath-demo');process.exit(1);
}
const tables=['audit_log','contact_events','followups','assessments','volunteer_hours','mentor_matches','volunteers','attendance','sessions','enrollments','staff_groups','groups','programs','student_guardians','students','guardians','households','auth_sessions','login_attempts','staff','settings'];
const dir=mkdtempSync(join(tmpdir(),'tidepath-reset-'));
const file=join(dir,'reset.sql');
try{
  writeFileSync(file,tables.map(t=>`DELETE FROM ${t};`).join('\n')+'\n'+generateSeed().sql);
  const result=spawnSync('wrangler',['d1','execute','tidepath-demo','--remote','--file',file],{stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  process.exitCode=result.status||0;
  if(result.status===0)console.log('Hosted fictional demo restored. Existing demo sessions are signed out.');
}finally{rmSync(dir,{recursive:true,force:true});}
