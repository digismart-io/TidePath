# Deploying TidePath

## What a fork contains

The repository contains app source, fictional seed records, public demo credentials, image assets and deployment configuration. It does not contain the Cloudflare OAuth login used on the original developer’s computer. `.env*`, `.dev.vars`, `.wrangler/` and local database files are ignored by Git.

The current `wrangler.jsonc` names the original demo Worker and D1 database. Its database ID is a resource identifier, not an access credential. Copying it does not authorize access. The public Programs page also contains links to the original live app, which must be changed for an independent deployment.

Creating a Git branch does not deploy anything. GitHub Pages is currently configured to serve `/docs` from `main`; a copied branch is not automatically published there.

## Start locally

Check out the repository and install its pinned dependencies:

```sh
git clone https://github.com/digismart-io/TidePath.git
cd TidePath
npm ci
npm run db:reset
npm run dev
```

Requires Node.js 24+. Local SQLite and hosted D1 are separate. Tests use isolated in-memory SQLite databases; they do not call live AI or change the hosted demo.

```sh
npm run check
```

## First deployment to your own Cloudflare account

1. Sign in to the intended Cloudflare account. Check the account before creating resources.

   ```sh
   npx wrangler login
   npx wrangler whoami
   ```

2. Create a dedicated database for this copy.

   ```sh
   npx wrangler d1 create tidepath-demo
   ```

3. Edit `wrangler.jsonc`. Replace `d1_databases[0].database_id` with the ID returned above. If you choose a different database name, update that field and the commands below consistently. Choose an available Worker `name`; retain the `DB` and `ASSETS` binding names because the code uses them. If Wrangler asks you to choose an account, select the account containing the new database.

4. Apply all schema migrations, then load the fictional seed into the **new, empty** database.

   ```sh
   npx wrangler d1 migrations apply tidepath-demo --remote
   npx wrangler d1 execute tidepath-demo --remote --file seed/demo.sql
   ```

   Seeding inserts records and is not an update operation. Do not rerun it against populated data. Migration `0003_import_records.sql` adds CSV tracking; `0004_operations_and_snapshots.sql` adds in-app reminders, check history and protected report snapshots.

5. Deploy.

   ```sh
   npm run deploy
   ```

6. Open the returned Worker URL. Check sign-in, role restrictions, registration and report loading. Use only invented records when trying writes. A successful signup or attendance submission changes the demo totals.

Official references: [Wrangler login](https://developers.cloudflare.com/workers/wrangler/commands/#login), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Worker assets](https://developers.cloudflare.com/workers/static-assets/binding/).

## AI account and usage

The `AI` binding in `wrangler.jsonc` connects to Cloudflare Workers AI in the deploying account. `AI_MODEL` selects Meta Llama 3.3 70B Instruct. This does not use a ChatGPT login or an OpenAI API key.

Cloudflare’s published Workers AI pricing includes 10,000 neurons per day at no charge; additional use requires Workers Paid and is billed under that account. Check your account’s usage rather than assuming a demo is cost-free. [Current pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

To deploy without hosted inference, remove the `ai` binding configuration. The Worker checks for that binding and uses explicitly labeled templates when it is missing. Local `npm run dev` already uses templates. Model weights are distributed under the [Llama 3.3 Community License](https://github.com/meta-llama/llama-models/blob/main/models/llama3_3/LICENSE); the app’s MIT license does not replace that license.

## Publish the Programs website

The static website is `docs/index.html`, with relative image paths under `docs/assets/` and a `.nojekyll` file. It can be served by GitHub Pages independently of the Worker.

1. In `docs/index.html`, replace every `https://tidepath-demo.go-610.workers.dev/` destination with your app URL, including the JavaScript registration handoff. Update README demo links too.
2. In the repository’s **Settings → Pages**, choose **Deploy from a branch**, the branch containing the app, and `/docs`.
3. Wait for the Pages build to complete, then open the returned URL.
4. Choose a program and language, continue to family registration, and confirm the app opens with those choices. No family contact details are collected on the static page.

The original site currently publishes `/docs` from `main`. Keep the Pages source aligned with the branch you publish. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Update an existing deployment

```sh
npm ci
npm run check
npx wrangler whoami
npx wrangler d1 migrations apply tidepath-demo --remote
npm run deploy
```

Retain the intended existing database ID. Apply pending migrations; **do not seed or reset** an active demo just to deploy code. Review schema changes before applying them. Static Programs changes are published by the configured Pages branch separately.

## Daily in-app check

`wrangler.jsonc` configures `0 13 * * *` (13:00 UTC daily). Deployment installs the Cloudflare Cron Trigger. In demo mode, it evaluates work against the fixed scenario date; it does not age the fictional quarter using the real calendar. Managers can run the same check immediately from Overview. Local Node development does not run a timer. Check history is visible in the weekly brief. This check refreshes in-app reminders only. [Cron Trigger documentation](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

## Resets

For local rehearsal, stop the server, run `npm run db:reset`, and restart it. That command replaces the local fictional database only.

The repository also contains a guarded remote reset for the original disposable hackathon database:

```sh
npm run demo:reset:remote -- --confirm=tidepath-demo
```

It deletes demo activity, saved report versions, reminders and sessions before restoring the seed. The guarded reset temporarily removes the snapshot-delete protection and reinstalls it afterward. It is restricted to the original database ID and refuses a fork’s different ID. It is not a deployment step or a general reset tool for other accounts.

For an empty nonprofit workspace, follow [WORKSPACE.md](WORKSPACE.md) instead of importing the fictional seed.
