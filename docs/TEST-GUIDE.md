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
3. **Record attendance.** Select **Mark remaining present**, then mark **Sofia Rivera → Absent**. Select **Submit attendance**. Her previous submitted mentoring session was also absent; the application creates one follow-up, owned by Marisol, due September 23. Repeated saves do not create extra tasks.
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

“This prototype connects a fictional quarter of program activity from registration to attendance, owned follow-ups, volunteer contributions and traceable reports. It demonstrates a pathway to reduce reconciliation and missed contact; time savings have not been measured. CSV signups can be previewed and linked to confirmed identities; direct spreadsheet synchronization is future work. Counseling, fundraising and financial systems remain separate.”

Do not claim live spreadsheet synchronization, real outbound messaging, clinical outcomes, autonomous multi-agent execution, complete localization, full offline operation, or production readiness.

## Family registration

From the public Programs page, choose a starting program and language, then continue to family registration. Enter guardian details once. Add each child using **Add another child**; each child has independent age and program-group choices. The form shows the current number of children, supports removal, and preserves entered details when adding/removing children or switching the form language. Up to ten children can be submitted together.

Rehearse with two invented siblings: age 12 in Next Wave, age 7 in Neighborhood Together. A successful submission creates one household, one guardian, two students and their separate enrollments. An invalid age, repeated child or insufficient combined capacity saves none of the family; correct the form and resubmit. The save uses one database transaction, including staff audit entries. Earlier submitted rosters remain unchanged. Existing households can be linked only by a signed-in manager after confirming identity; public email matches do not expose or automatically link existing families.

Automated checks cover sibling linkage, independent enrollments, age validation, combined capacity, database rollback and manager-only existing-household linking. Valid browser submissions during rehearsal increase the demo totals; use local data for rehearsal if the live 100-student baseline should be preserved.

## Attendance submission

Teachers and assigned session leaders mark each student and click **Submit attendance** once. The same action saves attendance, checks follow-up rules and updates report totals. There is no Save draft action and no manager review or approval. Incomplete submissions are rejected without saving changes; existing unsubmitted session records remain excluded from reports until completed. Submitted attendance can be corrected and resubmitted, with audit history and concurrency protection.

## Explainable and manual follow-ups

Open **Participants → a child → Why a follow-up?** Each program shows its consecutive absence count, latest submitted sessions, attendance still unsubmitted and existing concern. Optional events explicitly have no automatic absence trigger. The explanation uses the same consecutive-absence calculation as the automation. **Create a follow-up** is available here and on the Follow-ups page: choose the child/program, reason, staff owner, due date and next action. One open task per child/program is enforced. Manual concerns do not require two absences. Only managers can use these actions.

## Outcome entry

Open **Participants → a child → Record assessment**, or use the Reports button. Select the enrolled mentoring/workshop program, start/end phase, reported 1–5 score and quarter date. Use the program's actual question/scale; these are voluntary non-clinical self-assessments. An end requires a start and cannot precede it. Existing values require explicit correction confirmation; audit entries preserve previous values. Reports recalculate pairs, missing ends and descriptive score changes immediately.

For a fresh local demo, Amelia Thompson has a Harbor start assessment and no end. Record a genuine demo end response to increase paired assessments by one and reduce missing ends by one. No clinical screening or counseling intake is added.

## CSV signup import and identity review

Open **Participants → Import CSV**. Download the template or fictional messy example. Export signup data from a spreadsheet to CSV using the documented columns. Each source row has a stable `source_system` and `source_id`. Batches contain 1–20 rows and at most 20 KB.

The example contains Rosa Rivera, R. Rivera (alternate email), and “Rivera, Rosa”, all registering Sofia. Preview shows possible matches and their evidence; it selects none automatically. For row 1 confirm existing **Rosa Rivera → Sofia Rivera**. For rows 2 and 3 choose the guardian and child confirmed for row 1, or explicitly select the same canonical identities. Check the review confirmation and import. Expected: three source mappings, zero new households/children, and at most one new enrollment (zero in the initial seed because Sofia already attends the event). Names, preferred language, age, contact details and historical attendance remain unchanged. Reimporting the identical file skips all three rows. Changed contents under a reused source ID are blocked for review.

For new siblings, choose a new guardian/household on the first row, then reuse that row's guardian and create a new child on each sibling row. Managers can choose an existing confirmed guardian even when no automatic suggestion exists. Identity decisions are audited. Invalid ages, groups, incompatible identity links, conflicting program enrollment, capacity failures or database errors roll back the whole batch.

CSV import covers signup and program enrollment only. It does not fetch Google Sheets, import historical attendance, overwrite canonical profiles, or collapse two existing database profiles. Imported alternate spellings/contact values are not promoted to canonical fields. Language is the stated CSV value for new profiles and remains unchanged for existing profiles.
