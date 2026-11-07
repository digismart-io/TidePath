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

The demo uses 40 fictional students in two invented program cohorts, Harbor Mentors and Next Wave Workshops, aged 11–14. These age limits apply to these cohorts; the organization's broader population extends to age 18. The school names, staff names other than the scenario's Marisol, volunteer names, families and contacts are invented. Four demo logins represent a program manager and three authorized session leaders, not the organization's complete staffing structure. Nine fictional volunteers are a subset, not the annual volunteer total.

Next Wave reflects safety and emotional wellbeing education, not digital-literacy training or clinical care. Its outcomes are fictional self-assessment scores, not clinical assessments or evidence of treatment effectiveness.

Households are separate from guardians: a guardian count is not a family count. Contact language is recorded explicitly. The staff interface is English; complete localization of every screen is not claimed.

## System boundaries

- Counseling notes, diagnoses, treatment plans and clinical case histories remain in the existing secure counseling system. Do not copy them into program records, contact notes or AI prompts.
- QuickBooks remains the financial ledger. The donor CRM, donation and ticketing tools retain fundraising records. No payments or grant accounting are implemented here.
- The report provides program evidence for funders; grant-specific templates, financial schedules, demographic eligibility rules and funding allocations require separately agreed definitions.
- No real emails, WhatsApp messages or SMS messages are sent. Contact events labeled simulated are demonstration events.
- Spreadsheet import, identity reconciliation, external-tool synchronization, offline attendance synchronization, and organization-wide role provisioning are future work.
- Synthetic records are seeded directly so the app can be reset and tested repeatedly. A functional seed is not presented as a completed import integration.

## Demonstration clock

The active quarter is July–September 2026. The application uses September 24, 2026 as its scenario date so missed-session tasks and incomplete rosters are repeatable. Report generation and audit timestamps use the actual server time. Reports are provisional and reflect current records; immutable issued-report versioning is future work.
