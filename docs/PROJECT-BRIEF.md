# Tidepath Family Alliance: source brief and demo scope

## Organization facts supplied by the participant

Mission: help Miami-Dade kids and their families stay safe, in school, and supported.

Approximately 900 kids up to age 18 and 150 families annually, in Little Havana and West Little River. Services are offered in English, Spanish, and Haitian Creole. These figures are organizational context, not measured results from this application.

Programs include mentoring, family counseling, safety and mental health workshops in schools and community centers, and community events.

Nine staff: six full time (director, program manager, front-desk coordinator, lead counselor and two counselors) and three part time (volunteer coordinator, bookkeeper, fundraising coordinator). Approximately 40 volunteers include mentors, event helpers, and supply drivers. Seven volunteer board members.

Annual funding is approximately $900,000, mostly about twelve foundation, county, and state grants, plus individual donations and an annual gala.

Existing tools: Excel, Google Sheets, donor CRM, donation and ticketing tools, online forms, Mailchimp, QuickBooks, secure counseling records system, WhatsApp, Canva, and ChatGPT.

## Hackathon implementation

Focus: Marisol's program coordination problem. Registration, attendance, mentoring, volunteer hours, owned follow-ups and evidence-backed quarterly reports share one database.

The demo uses 100 fictional students across 70 households, with 130 distinct program enrollments and 131 enrollment-period rows. Five invented service profiles cover every supplied program type: Harbor Mentors (mentoring), Family Compass (family counseling), Next Wave Safety Labs (safety workshops), Bright Minds, Strong Connections (mental health education), and Neighborhood Together (community events). Counseling is catalog-only: no client enrollment, appointments, clinical measures or counseling notes are represented in the operational database.

The four participation programs have 20, 30, 30 and 50 enrolled students respectively, with overlap. The students are a demonstration subset, not the approximately 900 children served annually. Student ages and registration eligibility follow the selected program: mentoring and safety ages 11–14, wellbeing education ages 11–18, family events up to age 18. Four demo logins represent Marisol and three authorized session leaders, not the complete nine-person staffing structure. Fifteen fictional volunteers are a subset of the annual volunteer pool.

All schools, community centers, personal names, schedules, capacities and program designs are invented for the demo. The catalog has descriptions, target audiences, format, timing, locations, languages, leadership, staffing, activities, participation measures, enrollment routes, follow-up rules and records boundaries. See PROGRAM-CATALOG.md for the full profiles.

Educational workshop feedback is voluntary, non-clinical self-assessment, not evidence of treatment effectiveness. Optional community events have no consecutive-absence alerts and are excluded from regular-session attendance rates; child event check-ins still contribute to recorded-visit totals. Adults are not inferred from child attendance.

Households are separate from guardians. Contact language is explicit. The staff interface is English; full localization is not claimed. Riverside's safety cohort has an approved extra transfer seat, capacity 16. The school-transfer demonstration preserves the previous school's attendance.

## System boundaries

- Counseling notes, diagnoses, treatment plans and clinical case histories remain in the existing secure counseling system. Do not copy them into program records, contact notes or AI prompts.
- QuickBooks remains the financial ledger. The donor CRM, donation and ticketing tools retain fundraising records. No payments or grant accounting are implemented here.
- The report provides program evidence for funders; grant-specific templates, financial schedules, demographic eligibility rules and funding allocations require separately agreed definitions.
- No real emails, WhatsApp messages or SMS messages are sent. Contact events labeled simulated are demonstration events.
- Spreadsheet import, identity reconciliation, external-tool synchronization, offline attendance synchronization, and organization-wide role provisioning are future work.
- Synthetic records are seeded directly so the app can be reset and tested repeatedly. A functional seed is not presented as a completed import integration.

## Demonstration clock

The active quarter is July–September 2026. The application uses September 24, 2026 as its scenario date so missed-session tasks and incomplete rosters are repeatable. Report generation and audit timestamps use the actual server time. Reports are provisional and reflect current records; immutable issued-report versioning is future work.
