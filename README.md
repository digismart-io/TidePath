# TidePath · Program workspace

Record once. Know who needs help. Explain every number.

A working hackathon prototype for Tidepath Family Alliance's program manager, Marisol. The application connects registration, attendance, mentoring, volunteer hours, owned follow-ups and quarterly evidence. It runs on a Cloudflare Worker with D1 and optional Workers AI drafting.

**Fictional demonstration only.** All family records, schools, assessments, contacts, passwords and volunteer histories are synthetic. Shared demo logins are for exploration, not real nonprofit operations. Counseling records, donation processing, donor CRM, grant accounting and QuickBooks remain outside this app.

## Live demo

- [Program workspace](https://tidepath-demo.go-610.workers.dev/)
- [Public Programs page](https://digismart-io.github.io/TidePath/) — GitHub Pages serves `docs/` from `codex/tidepath-demo`. Its program/language chooser hands registration to the working app.

The app and public page share the supplied navy/orange style with subdued blue-gray highlights. See [style reference](docs/STYLE-REFERENCE.md) and [design tokens](design.md).

## Run locally

Requires Node.js 24 or newer.

```sh
npm install
npm run db:reset
npm run dev
```

Open the URL printed by the server, normally http://localhost:8787. The local development server uses Node's built-in SQLite and a D1-compatible adapter. The **same Worker request handlers** run locally and on Cloudflare; local development does not call paid AI services. SQLite may print Node's experimental-feature warning.

## Explore the demo

Choose a demo role on the sign-in screen, then select **Sign in**. All four fictional accounts use `TidePath-demo-2026!`.

| Login | Role | Access |
| --- | --- | --- |
| `marisol@tidepath.example` | Program manager | Participant/family history, all rosters, follow-ups, mentors, hours and reports |
| `elena@tidepath.example` | Session leader | Harbor Mentors, Bayview rosters only |
| `james@tidepath.example` | Session leader | Assigned Bayview safety, Little Havana wellbeing and community-event rosters |
| `priya@tidepath.example` | Session leader | Assigned Riverside safety, West Little River wellbeing and community-event rosters |

Roles are enforced in the Worker API, not just in the navigation. The four logins represent test roles, not TidePath's complete nine-person staffing structure. Passwords are PBKDF2 hashed; sessions are opaque, server-stored, expiring HttpOnly cookies. Public registration never returns existing family identities. Shared accounts and published demo credentials must be replaced before any real-data pilot.

Family registration collects guardian details once and saves up to ten children together, with individual ages and program groups. Adding/removing children and changing form language preserve entered details. Validation and saving apply to the whole family.

## Included

- Five complete service profiles: mentoring, family counseling, safety workshops, mental health workshops and community events. Counseling is catalog-only; its client records remain in the secure system.
- One hundred students, 70 households, 130 distinct child–program enrollments, fifteen volunteer records and 66 sessions in one fictional quarter.
- Separate households and guardians, preferred contact language and stable student IDs.
- English, Spanish and Haitian Creole family registration labels and contact templates. The main staff interface is English; full localization is not claimed.
- Phone-friendly attendance, saved drafts, complete-roster submission, correction audit history and optimistic concurrency checks.
- Two consecutive unexplained absences trigger one assigned follow-up. Message attempts, replies, ownership, next steps and resolution are separate events. Return to attendance does not silently resolve a concern.
- Mentor matches retain history when reassigned; volunteer hours require approval and cannot duplicate a volunteer/session pair.
- Quarterly totals with source-record drill-down, downloadable JSON evidence, a printable view and reviewed narrative drafting.
- PWA manifest and an offline application shell. Offline **attendance synchronization is not implemented**; API records are never cached by the service worker.

## Repeatable testing

```sh
npm test
npm run check
npm run db:reset
```

`db:reset` resets only `.local/tidepath.sqlite`. Restart the local server after resetting so it opens the fresh database, and sign in again. It does not touch Cloudflare.

`seed/demo.sql` and `seed/expected.json` are produced by `npm run seed:generate`. The expected totals are computed independently from generated rows and checked against the report API. Integration tests cover authorization, CSRF, attendance completeness, simultaneous saves, cancellation, transfer history, hour approval, registration, follow-up lifecycle, and AI fallback.

The scenario date is September 24, 2026. The report is provisional: two rosters remain unfinished and the quarter ends September 30. Actual audit/contact timestamps use server time. Explore [the program catalog](docs/PROGRAM-CATALOG.md). See [the testing and demo guide](docs/TEST-GUIDE.md).

## Deploy to your Cloudflare account

`wrangler.jsonc` binds the dedicated `tidepath-demo` D1 database and Workers AI. The current database ID belongs to this participant's demo account. A fork must create its own database and replace that ID.

```sh
wrangler login
wrangler d1 create tidepath-demo
# Put the returned database_id in wrangler.jsonc before continuing.
wrangler d1 migrations apply tidepath-demo --remote
wrangler d1 execute tidepath-demo --remote --file seed/demo.sql
npm run deploy
```

Run the seed once against an empty schema. Do not rerun the insert-only seed against populated tables. For this specific disposable hosted database, the guarded reset command restores the fictional quarter:

```sh
npm run demo:reset:remote -- --confirm=tidepath-demo
```

This deletes demo changes, contacts and login sessions from the exact configured hackathon database. It refuses other database IDs and non-demo mode. It does not delete the database, Worker, or unrelated Cloudflare resources.

## AI behavior

The deployed Worker uses `@cf/meta/llama-3.3-70b-instruct-fp8-fast` through the `AI` binding. The report's numeric sections and definitions are assembled by code; AI receives qualitative issue flags and adds staff-review notes. AI notes containing digits are rejected in favor of the verified template. Follow-up drafting receives only the selected task's relevant program context. Counseling notes are neither stored nor read. AI responds to a staff action; it does not autonomously send or resolve anything. Generated wording can be inaccurate and requires human review against the visible evidence.

When AI is unavailable or unconfigured, a deterministic template is shown and explicitly labeled **Template**. Live requests consume Cloudflare Workers AI allowance/usage; see your account's limits. Draft generation is not presented as a multi-agent orchestration system.

## Deferred scope and production work

Spreadsheet import and duplicate reconciliation are stretch work, deliberately deferred until the core demo is stable. Seeded records are not represented as imported legacy data. Existing systems remain the owners of clinical, donor and financial records. See [the source brief and boundaries](docs/PROJECT-BRIEF.md).

Before a real-data pilot: replace demo accounts with organizational identity and provisioning; agree on data retention and staff access; review translations with speakers; formalize enrollment/waitlist rules and concurrent capacity enforcement; add reliable scheduled escalation and delivery integrations if needed. The current follow-up queue identifies overdue tasks; it does not run an external notification scheduler. Quarter reports reflect live data; immutable issued-report snapshots are future work.

## Sources

- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
- [Worker static assets binding](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Workers AI binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/)

MIT license.
