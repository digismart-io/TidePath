# TidePath

**Record once. Know who needs a call. Explain every number.**

TidePath connects family registration, attendance, mentors, volunteer hours, family follow-ups and quarterly reporting for a small youth nonprofit. It addresses **Challenge 1: From sign-up to quarterly report** for Marisol, Tidepath Family Alliance’s program manager.

[Open the working app](https://tidepath-demo.go-610.workers.dev/) · [Explore the Programs website](https://digismart-io.github.io/TidePath/) · [Read the submission overview](docs/SUBMISSION.md)

> Hackathon prototype with fictional records only. The working source is currently on `codex/tidepath-demo`, in [draft PR #1](https://github.com/digismart-io/TidePath/pull/1) targeting `main`. The live demo is already deployed. Shared demo accounts are for exploration with invented data.

## What it does

| Marisol’s problem | Working solution |
| --- | --- |
| Retyping family signups across lists | One family form, multiple children, connected household and enrollment records |
| The same guardian appears under different names | CSV preview suggests possible matches; a manager confirms identities before import |
| Paper attendance arrives too late | Session leaders mark students on their phones and click **Submit attendance** once |
| Missed sessions go unnoticed | Two consecutive unexplained absences in the same regular program create an assigned follow-up |
| Staff see a concern outside the automatic rule | Manual follow-ups with a reason, owner, due date and next action |
| Mentor lists and volunteer hours are separate | Mentor assignment history and approved volunteer contributions share the same records |
| Quarter-end numbers do not agree | Computed metrics, source-record drill-down, assessment entry, narrative drafting and printable reports |

Each participant’s **Why a follow-up?** section explains their submitted attendance, unsubmitted sessions and existing tasks. No manager approval is needed for attendance: submission immediately updates follow-up rules and report totals. Optional family events do not trigger absence alerts.

<details>
<summary>See the follow-up explanation screen</summary>

![Zoe’s program-specific attendance and follow-up explanation](docs/screenshots/followup-explanation.jpg)

Fictional demonstration activity; the shared live data may change during testing.

</details>

## Try it

Choose a role on the [sign-in screen](https://tidepath-demo.go-610.workers.dev/), then click **Sign in**. Every demo account uses `TidePath-demo-2026!`.

| Account | Role | Access |
| --- | --- | --- |
| `marisol@tidepath.example` | Program manager | Families, participants, imports, all sessions, follow-ups, mentors, hours, assessments and reports |
| `elena@tidepath.example` | Session leader | Harbor Mentors at Bayview |
| `james@tidepath.example` | Session leader | Assigned Bayview safety, Little Havana wellbeing and community-event sessions |
| `priya@tidepath.example` | Session leader | Assigned Riverside safety, West Little River wellbeing and community-event sessions |

API permissions enforce these boundaries. The family registration form is public and does not disclose existing household identities. Only a manager can confirm links to an existing household.

A fresh seed contains **100 children, 70 households, five program profiles, 130 distinct child–program enrollments, 66 sessions and 15 volunteers**. Counseling is catalog-only. The scenario date is September 24, 2026, within the July–September quarter; reporting is provisional. The shared live demo changes as people test it.

Follow the [three-minute walkthrough and rehearsal guide](docs/TEST-GUIDE.md). For CSV matching, use **Participants → Import CSV** and its downloadable messy example.

## Run locally

Requires Node.js 24 or newer and npm.

```sh
git clone --branch codex/tidepath-demo https://github.com/digismart-io/TidePath.git
cd TidePath
npm ci
npm run db:reset
npm run dev
```

Open `http://localhost:8787`. The local app runs the same Worker handlers against persistent SQLite, without calling a hosted AI service. Template drafting is labeled explicitly. Node may print an experimental SQLite notice.

`npm run db:reset` replaces the **local** demo database. Stop the local server before resetting, restart it afterward, and sign in again. It does not change the hosted demo.

```sh
npm run check
```

The check includes JavaScript syntax validation and **40 integration tests** covering permissions, attendance submission and concurrency, family registration, follow-up rules, assessments, CSV matching, transaction rollback, repeat imports and report reconciliation. Tests use isolated in-memory databases.

## Architecture and AI

A plain HTML/CSS/JavaScript PWA calls a Cloudflare Worker API backed by D1. GitHub Pages serves the public Programs website; its chooser hands program and language selections to the registration app. See [architecture and data flow](docs/ARCHITECTURE.md).

Workers AI runs Meta’s `@cf/meta/llama-3.3-70b-instruct-fp8-fast` to draft guardian messages and qualitative report notes. Code calculates report numbers, validates records and applies follow-up rules. Staff review generated text. AI does not merge identities, send messages or resolve tasks autonomously.

The hosted model uses the **Cloudflare account that deploys the Worker**, not a contributor’s ChatGPT subscription. Cloudflare includes a daily AI allowance; hosted inference is not unlimited free use. See [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and the [Llama model license](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/LICENSE). If AI is unavailable, the app returns a labeled template.

## Deploy your own copy

A branch or fork copies code and public configuration, **not Cloudflare login credentials**. Create your own D1 database, update the configuration, and change the Programs page links to your deployed app. The committed database identifier and demo URLs refer to the original hackathon deployment.

Follow the [deployment guide](docs/DEPLOYMENT.md). It covers local credentials, optional AI, GitHub Pages and the distinction between a new-account setup and updating an existing deployment.

## Limits of this prototype

- CSV imports cover signups and enrollment: 20 rows / 20 KB per batch, with explicit identity review. There is no direct Google Sheets sync, historical attendance import or destructive merge of existing database profiles.
- Contacts are simulated. The queue tracks owners and overdue tasks, but there is no outbound email/SMS/WhatsApp delivery or scheduled reminder/escalation service.
- The PWA has an offline shell; attendance requires connectivity and does not synchronize offline.
- Reports use the configured demo quarter and current records. Immutable issued reports and a quarter-selection workflow are not implemented.
- Assessments are voluntary, non-clinical program feedback. Descriptive changes do not establish program effectiveness. Counseling, donor and financial records remain in their existing systems.
- Demo roles and public passwords must be replaced before a real-data pilot. Enrollment/waitlist policy, concurrent capacity enforcement, translation review, retention and organizational access provisioning remain production work.

Time savings and real-world outcomes have not been measured. See [the source brief and boundaries](docs/PROJECT-BRIEF.md).

## Documentation

- [Submission overview and challenge fit](docs/SUBMISSION.md)
- [Demo walkthrough, expected totals and tests](docs/TEST-GUIDE.md)
- [Deployment and fork setup](docs/DEPLOYMENT.md)
- [Architecture, records and API responsibilities](docs/ARCHITECTURE.md)
- [Program catalog](docs/PROGRAM-CATALOG.md)
- [Design reference and image credits](docs/STYLE-REFERENCE.md)
- [Design tokens](design.md)

Software: [MIT license](LICENSE). Third-party images and the hosted AI model retain their respective licenses.
