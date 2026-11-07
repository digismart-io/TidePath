# TidePath rehearsal and test guide

All names and records are fictional. Restore the seed between rehearsals if you want identical numbers.

## Baseline

Sign in as Marisol. The dashboard should show:

- 100 unique participants and 130 distinct program enrollments across four participation programs, plus catalog-only counseling.
- 95.8% regular-session attendance, from 821 attended regular sessions / (821 attended + 36 unexplained absent). There are 961 recorded visits including optional community-event check-ins.
- 59 excused/nonattendance entries excluded from visit attendance; all optional community-event entries are excluded from the regular-session rate.
- 2 open follow-ups.
- 200 approved volunteer hours and 17 pending hours.
- 2 unfinished rosters with 31 unmarked entries.
- 75 paired assessments and 5 missing end assessments.

The school transfer produces 131 enrollment-period rows, but only 130 distinct child–program enrollments. Families and guardians are distinct concepts even though this seed has one guardian per household.

## A three-minute demo

1. **Start as Marisol.** Open Programs to explore all five service types and their full details. Explain that she can see which families need attention without comparing lists. Open Participants and inspect Sofia Rivera: she shares Rosa Rivera as guardian with Mateo Rivera. Search for Zoe Johnson to show that her earlier Bayview workshop records remain intact after her move to Riverside.
2. **Switch to Elena.** Sign out, choose Elena, and sign in. Only Harbor rosters are available. Open September 22, “Quarter reflection.” All 20 entries are initially unmarked, not absent.
3. **Record attendance.** Select **Mark remaining present**, then mark **Sofia Rivera → Absent**. Select **Submit roster**. Her previous submitted mentoring session was also absent; the application creates one follow-up, owned by Marisol, due September 23. Repeated saves do not create extra tasks.
4. **Return as Marisol.** Open Follow-ups. Sofia now appears alongside the two seeded concerns. Open her task and select **Draft message**. Her guardian's preferred contact language is Spanish. The deployed version should label successful live drafting **Workers AI**; a local/unavailable model is labeled **Template**.
5. **Show follow-through.** Edit the draft, then **Record simulated send**. This records a demonstration event and changes the task to awaiting reply. It sends no actual message and does not resolve the concern. Record a guardian reply about transport, update the next action, and resolve only after describing the support arranged.
6. **Show the report.** After the roster submission: 980 attended entries including events, 37 unexplained absences and one remaining unfinished roster. Click report metrics to show source records. Generate a quarterly narrative and explain that the database calculates the numbers while AI drafts the wording. Download evidence or print the report.

## Other useful tests

| Scenario | Expected behavior |
| --- | --- |
| Save half a roster as draft | Unmarked stays distinct from absent; draft roster excluded from report |
| Submit with an unmarked child | Clear validation error, no submission |
| Two browsers save the same version | Second stale save receives a conflict and must reload |
| Open another teacher's roster | Server returns forbidden |
| View the cancelled Bayview workshop on August 5 | Read-only; no absence contribution |
| Approve a pending one-hour mentor entry | Approved hours rise by 1, pending hours fall by 1 |
| Log the same volunteer/session twice | Duplicate rejected, total unchanged |
| Inspect Zoe Johnson's history | School changes after August 14; old attendance retains original school |
| Register a new 12-year-old in Next Wave Bayview | One initial seat is available after the transfer; connected records created |
| Choose two Next Wave groups | Validation error: one group per program |
| Register in a full group | Capacity error; waitlist is not implemented |
| Select Spanish or Haitian Creole on the family form | Main registration labels change; staff interface remains English |
| Disable network access | Offline shell/banner; no claim that attendance has synced or saved |
| AI service unavailable | Labeled template fallback using the same records |

## Reset

Local: stop the local server, run `npm run db:reset`, restart with `npm run dev`, sign in again.

Hosted fictional demo: `npm run demo:reset:remote -- --confirm=tidepath-demo`. It resets only the hard-coded disposable database and signs out demo sessions. Save any screenshots or test notes first.

## Submission language

“This prototype connects a fictional quarter of program activity from registration to attendance, owned follow-ups, volunteer contributions and traceable reports. It demonstrates a pathway to reduce reconciliation and missed contact; time savings have not been measured. Spreadsheet import and reconciliation are planned next. Counseling, fundraising and financial systems remain separate.”

Do not claim live spreadsheet synchronization, real outbound messaging, clinical outcomes, autonomous multi-agent execution, complete localization, full offline operation, or production readiness.

## Family registration

From the public Programs page, choose a starting program and language, then continue to family registration. Enter guardian details once. Add each child using **Add another child**; each child has independent age and program-group choices. The form shows the current number of children, supports removal, and preserves entered details when adding/removing children or switching the form language. Up to ten children can be submitted together.

Rehearse with two invented siblings: age 12 in Next Wave, age 7 in Neighborhood Together. A successful submission creates one household, one guardian, two students and their separate enrollments. An invalid age, repeated child or insufficient combined capacity saves none of the family; correct the form and resubmit. The save uses one database transaction, including staff audit entries. Earlier submitted rosters remain unchanged. Existing households can be linked only by a signed-in manager after confirming identity; public email matches do not expose or automatically link existing families.

Automated checks cover sibling linkage, independent enrollments, age validation, combined capacity, database rollback and manager-only existing-household linking. Valid browser submissions during rehearsal increase the demo totals; use local data for rehearsal if the live 100-student baseline should be preserved.
