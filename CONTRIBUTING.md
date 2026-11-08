# Contributing to TidePath

Use fictional data when developing or testing. This repository is a single-nonprofit-per-deployment prototype; managers intentionally have workspace-wide access. Do not introduce a new role or shared-database tenancy without explicit server-side permissions and tests.

## Local setup

Use Node 22.13+; Node 24 is the recommended development version (`nvm use`). Run `npm ci`, optionally copy `.env.example` to `.env`, then follow the README for a fictional demo reset or empty-workspace bootstrap. `.env` is loaded by the local development and bootstrap commands, not by the test suite. Never reset a database containing real records.

## Changes

Create a branch, keep changes focused, and open a pull request describing the problem, resulting behavior and validation. Run `npm run check` before requesting review. For authorization or data changes, include tests that send direct API requests as unauthorized users and check that records remain unchanged. Check both the minimum supported Node runtime and Node 24 when changing compatibility-sensitive code.

Keep `.env.example`, deployment examples and documentation aligned with new settings. Never commit passwords, session cookies, private contact data or Cloudflare credentials. Use your own Cloudflare database and `docs/site-config.js` URL for independent deployments. Leave the original remote demo reset's allowlist intact.

The proposed GitHub Actions workflow is documented in `docs/ci-checks.yml` if account authorization prevents installing it. Once installed, require its status checks through branch protection if you want GitHub to block failing merges.

Report vulnerabilities using [SECURITY.md](SECURITY.md), not a public issue with exploit details. Contributions are under the repository's MIT license; external image and model licenses still apply.
