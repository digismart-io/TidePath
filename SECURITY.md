# Security policy and access model

## Scope and supported version

Security fixes target the latest `main`. This hackathon prototype is not an independently audited production system. Fork operators are responsible for deploying fixes and configuring access to their own resources.

One Worker deployment and its D1 binding serve one nonprofit. There is no shared-database tenant model. Do not place multiple independent nonprofits in the same database and assume their records are isolated. Deploy separate Workers/databases, or implement and audit tenant-scoped authorization first.

Managers have access to all program coordination records in that workspace; a follow-up's owner is a work assignment, not a confidentiality boundary between managers. Session leaders may read and submit attendance only for currently assigned groups. The server reads roles and group assignments from the database on each request. It does not trust submitted role, owner or tenant claims. Unknown roles fail closed. The public catalog and new-family registration are intentionally public; only managers can link an existing guardian. Counseling records are outside this application.

## Demo credentials and real-data pilots

The shared demonstration login credentials and seed records are public. Changing `DEMO_MODE` hides demo UI but does not replace seeded passwords or erase records. For real use, bootstrap an empty database with unique staff credentials, review assignments and data-handling practices, and configure private operational access. Never put real family data in the public demo. Client-side navigation controls do not replace server authorization.

## Reporting a vulnerability

Use this repository's **Security → Report a vulnerability** option if available. If private reporting is unavailable, open an issue requesting a private reporting channel without including exploit details, credentials, cookies or personal data. Include affected endpoints and roles, safe reproduction steps with fictional records, expected/actual behavior and the tested commit through that private channel. No response-time commitment is made for this prototype.

## Authorization regression checks

`npm run check` covers direct requests to manager-only resources across HTTP methods, assigned versus unassigned roster IDs, foreign student IDs in attendance payloads, denied writes leaving records unchanged, session revocation, unknown roles and cookie rejection between separate nonprofit databases. These checks reduce regressions; they are not a claim of exhaustive security coverage. Additional shared-database tenancy is not implemented.
