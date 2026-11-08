# TidePath — hackathon submission overview

## Challenge

**Challenge 1: From sign-up to quarterly report.** Marisol wants to enter information once, know which children need a family check-in, and prepare a quarterly report without days of reconciliation.

TidePath provides a working, connected program workspace: family signup becomes enrollment; session leaders submit attendance; missed sessions become owned follow-ups; mentors, volunteer contributions and reported outcomes feed traceable quarterly evidence.

[Working app](https://tidepath-demo.go-610.workers.dev/) · [Public Programs website](https://digismart-io.github.io/TidePath/) · [Complete source](https://github.com/digismart-io/TidePath)

## What is implemented

| Challenge need | Demonstrated behavior |
| --- | --- |
| Enter information once | A guardian registers multiple children together; shared records connect participation and reporting |
| Reconcile inconsistent signup lists | A CSV preview finds possible identity matches; a manager confirms them before an atomic import |
| Replace delayed paper attendance | An assigned session leader records everyone’s status and submits once, with no approval stage |
| Identify children needing contact | Consecutive program absences create an assigned task; explanations and manual concerns cover staff judgment |
| Track who follows through | A weekly action brief and daily in-app check surface missing attendance and overdue concerns with owners and direct actions |
| Connect mentors and contributions | Mentor assignment history and approved volunteer hours appear in the same workspace |
| Prepare an outcome report | Staff enter self-assessments, review a close checklist and save a dated report version with frozen evidence and disclosed gaps |

## A short demonstration

1. Open **Participants → Import CSV**. Use the supplied messy file containing Rosa Rivera, R. Rivera and “Rivera, Rosa”. Confirm that all three source rows refer to one existing guardian and child. Import and repeat: no duplicate identities are created, and the repeated source rows are skipped.
2. Sign in as **Elena**. Only her assigned Harbor sessions are visible. In a fresh local seed, open September 22, mark remaining students present, mark Sofia Rivera absent, and submit attendance. Her consecutive mentoring absences create an assigned follow-up immediately.
3. Return as **Marisol**. Open the task, inspect the supporting history, request a Spanish guardian-message draft and record a simulated contact. Explain that outreach is simulated and resolution remains a separate staff decision.
4. Open **Amelia Thompson → Record assessment**. In a fresh seed, add her missing Harbor end response. The report’s paired-response and missing-response figures change from saved evidence.
5. Open **Marisol’s week**, run the check and show the assigned unfinished work. Choose **Close the quarter**, review its checklist, disclose remaining gaps and save a dated snapshot. Open saved evidence or download/print the version. Before September 30 the snapshot is correctly labeled provisional.

Use the [rehearsal guide](TEST-GUIDE.md) for exact fresh-seed totals, test accounts and reset instructions. The shared live demo may have additional activity from testing. Demo writes are real writes to fictional records.

## Why this approach fits

The application connects the records that previously lived in separate lists. A child has a stable identity across programs, a family can include multiple children, and staff can trace a reported number back to attendance, approved contributions or reported assessments.

Human judgment remains visible: people confirm uncertain identity matches, can raise concerns outside the automatic absence rule, review AI wording and decide when a family follow-up is resolved.

## AI contribution

Cloudflare Workers AI hosts Meta Llama 3.3 70B Instruct. It drafts message wording and qualitative report notes on request. Deterministic code owns identity validation, follow-up rules and numeric reporting. AI has a labeled template fallback, and generated wording requires staff review. This prototype does not claim autonomous multi-agent orchestration.

## Validation and current limits

The repository includes 64 passing automated tests for permissions, record linkage, attendance completeness and concurrency, follow-up behavior, assessments, CSV identity review, rollback, repeat imports and report calculations. Local browser rehearsals exercised successful writes without adding test data to the live deployment.

The prototype demonstrates the workflow; it does not yet establish measured time savings or guarantee that every family receives timely contact. There is no live spreadsheet synchronization, real outbound messaging, offline attendance synchronization or historical attendance import. CSV review links new source rows to confirmed identities; it does not destructively merge existing profiles. Reports use the configured demo quarter.

All participant records, program designs, schools, contact histories and assessment scores are fictional. The 100-child seed is a demonstration subset of the organization’s supplied scale. Counseling is catalog-only; clinical, donor and financial records remain outside this app. [Full source brief and boundaries](PROJECT-BRIEF.md)

## Next steps after the hackathon

Priorities for a real pilot are organizational sign-in and role provisioning; agreed enrollment, capacity and retention policies; translation review; approved outbound delivery integrations and escalation policies. Measure staff time and follow-up completion during a pilot before claiming operational improvements.

## Demonstration assumptions

The data is synthetic. The nonprofit provides access to a phone or tablet for session attendance, with connectivity at submission time. Staff confirm family identities, review AI wording and remain responsible for contacting families. Outbound email/SMS/WhatsApp delivery is simulated; adding a delivery provider is an integration step, not a feature claimed in this demo. See the README assumptions for the full operational context.


## Configurable workspace and PWA

Managers can maintain programs, groups, staff access, mentors and volunteers, schedule sessions, and configure organization details and reporting dates. A safe bootstrap creates an empty workspace with one manager instead of fictional records. The public Programs chooser uses the app’s active catalog. The app is installable as a PWA on phones, tablets and supported desktop browsers; offline support covers the shell, while records and submissions require connectivity. See [workspace guide](WORKSPACE.md).
