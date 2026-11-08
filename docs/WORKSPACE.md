# Workspace setup and administration

Each deployment serves one nonprofit. Organization details are configurable; TidePath remains the product name. The separate public website includes TidePath-specific copy and imagery that another organization should adapt.

## Start with an empty local workspace

Use Node 22.13+ (Node 24 recommended), run `npm ci`, then:

```sh
npm run setup:workspace -- --local
TIDEPATH_DEMO_MODE=false npm run dev
```

Supply the first manager name, email, password (12+ characters), organization and comma-separated service areas when prompted. Password entry is hidden. No fictional families or programs are inserted. Setup refuses an existing local database. The default database is `.local/tidepath.sqlite`; `TIDEPATH_DB_PATH` can select a new file. Do not run `db:reset` on this workspace: that command replaces local data with fictional demo records.

## Start with an empty hosted workspace

Follow [deployment setup](DEPLOYMENT.md) to create your own D1 database and edit `wrangler.jsonc`. Apply migrations, then initialize the empty database:

```sh
npx wrangler d1 migrations apply YOUR_DATABASE_NAME --remote
npm run setup:workspace -- --database=YOUR_DATABASE_NAME
```

Do not import `seed/demo.sql`. Setup verifies the staff table is empty and refuses a populated workspace. Set `DEMO_MODE` to `"false"` in Wrangler configuration before deploying. Use your own Cloudflare account and database identifier. Remote setup requires an authenticated Wrangler session. Never put credentials in GitHub.

## Configure the workspace

Sign in as the first manager and open **Manage workspace**. Set organization name, service areas and reporting dates. Create programs, then groups, volunteers and staff. Assign each session leader to the groups they should access. Register children or import reviewed signups, then schedule sessions. Record one or more spoken languages for each volunteer or mentor: English, Spanish, Haitian Creole or other languages. Existing records remain “Not recorded” until staff confirm them. Mentor selection displays these languages; matches remain a staff decision. Assign mentors from **Volunteers → Mentor matches**.

Programs include public descriptions, age ranges, outcomes and structured profile details. Counseling can remain an external secure intake. Programs and groups with history retain their original context; incompatible edits are rejected. Archive records rather than deleting history. A mentor with active matches must be reassigned before archiving. A staff member with open follow-ups must transfer ownership before deactivation. A manager cannot remove their own manager access.

Staff password resets, role changes and deactivation revoke sessions. Passwords must contain 12–200 characters; use unique credentials. Staff accounts are manager or session leader roles; a volunteer record alone does not grant login access. Session leaders access assigned groups, while managers maintain the complete workspace. Concurrent administrative edits are checked so stale changes do not silently overwrite another manager’s work.

Schedule sessions for active groups. Current enrollments for that date populate attendance; future enrollments added afterward are not automatically backfilled into an already scheduled session. Check the enrollment list before scheduling. A session leader marks everyone and submits once, triggering follow-up rules and report updates immediately.

Reporting dates select the current operational quarter. Existing frozen report versions remain unchanged. Setting dates does not create a general historical quarter browser or automatically advance the date in demo mode. Non-demo operation uses the actual date for weekly reminders.

## PWA and communications

Install from the app’s **Install app** guidance or the browser menu. HTTPS is required outside localhost. The offline shell contains no cached API responses, student records or queued submissions. Network connectivity is required for records and saves. Shared devices need sign-out between users.

Email, SMS and WhatsApp delivery are simulated. A provider integration needs verified sender details, protected credentials, recipient decisions, delivery events and failure handling. Simulated sends do not prove actual contact. AI drafts always require human review.


## Optional program assessments

Assessments default to off. In Manage workspace → Programs → Edit, enable optional start/end assessments only for a regular participation program with an agreed outcome question and 1–5 scale. Outcome measures may be blank when collection is off. This setting is independent of attendance and mentoring. Switching off retains scores, audit history and frozen report versions; it stops new entries and missing-response reminders and removes those responses from quarter-close gaps. Existing feedback remains readable, labelled historical in live reports, with averages separated by program. Switching back on resumes collection from existing records.
