# TidePath rehearsal and test guide

All names and records are fictional. Restore the seed between rehearsals if you want identical numbers.

## Baseline

Sign in as Marisol. The dashboard should show:

- 40 unique participants and 50 distinct program enrollments.
- 95.6% recorded attendance, from 496 attended student-sessions / (496 attended + 23 unexplained absent).
- 27 excused entries excluded from that denominator.
- 2 open follow-ups.
- 110 approved volunteer hours and 11 pending hours.
- 2 unfinished rosters with 31 unmarked entries.
- 47 paired assessments and 3 missing end assessments.

The school transfer produces 51 enrollment-period rows, but only 50 distinct child–program enrollments. Families and guardians are distinct concepts even though this seed has one guardian per household.

## A three-minute demo

1. **Start as Marisol.** Explain that she can see which families need attention without comparing lists. Open Participants and inspect Sofia Rivera: she shares Rosa Rivera as guardian with Mateo Rivera. Search for Zoe Johnson to show that her earlier Bayview workshop records remain intact after her move to Riverside.
2. **Switch to Elena.** Sign out, choose Elena, and sign in. Only Harbor rosters are available. Open September 22, “Quarter reflection.” All 20 entries are initially unmarked, not absent.
3. **Record attendance.** Select **Mark remaining present**, then mark **Sofia Rivera → Absent**. Select **Submit roster**. Her previous submitted mentoring session was also absent; the application creates one follow-up, owned by Marisol, due September 23. Repeated saves do not create extra tasks.
4. **Return as Marisol.** Open Follow-ups. Sofia now appears alongside the two seeded concerns. Open her task and select **Draft message**. Her guardian's preferred contact language is Spanish. The deployed version should label successful live drafting **Workers AI**; a local/unavailable model is labeled **Template**.
5. **Show follow-through.** Edit the draft, then **Record simulated send**. This records a demonstration event and changes the task to awaiting reply. It sends no actual message and does not resolve the concern. Record a guardian reply about transport, update the next action, and resolve only after describing the support arranged.
6. **Show the report.** After the roster submission: 515 attended entries, 24 unexplained absences and one remaining unfinished roster. Click report metrics to show source records. Generate a quarterly narrative and explain that the database calculates the numbers while AI drafts the wording. Download evidence or print the report.

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
