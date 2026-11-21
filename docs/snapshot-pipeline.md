# Predefined-roles snapshot pipeline

`scripts/build-snapshot.ts` pages through `GET https://iam.googleapis.com/v1/roles?view=FULL&pageSize=1000`
(all predefined roles), interns permission strings, and writes:

- `data/roles.snapshot.json` (minified; ~2 MB, ~0.47 MB gzipped, ~2400 roles, ~14k permissions)
- `data/manifest.json` (`schemaVersion, version, sha256, generatedAt, roleCount, permissionCount, bytes`)

`version` is the first 12 hex chars of the SHA-256 of the canonical content (permissions + roles; `generatedAt`
excluded), so unchanged data gives an unchanged version and no diff in `data/`.

## Local usage

Zero dependencies; Node 22.18+ (tested on v26) runs TypeScript natively.

```sh
node scripts/build-snapshot.ts          # fetch + write data/
node scripts/build-snapshot.ts --check  # validate existing snapshot (exit 1 on problems)
```

Token: `GCP_ACCESS_TOKEN` if set, otherwise `gcloud auth print-access-token`. If your gcloud user session has expired
(non-interactive "Reauthentication failed"), either run `gcloud auth login` or:

```sh
GCP_ACCESS_TOKEN=$(gcloud auth application-default print-access-token) node scripts/build-snapshot.ts
```

If the API answers 403/400 about a missing quota project, the script retries with `x-goog-user-project` set to
`GCP_QUOTA_PROJECT`, or else the project from `gcloud config get-value project`.

## One-time setup (human)

1. **GCP project**: create a dedicated near-empty project (e.g. `iam-lens-snapshot`). No resources needed.
2. **Enable the IAM API** in it: `gcloud services enable iam.googleapis.com --project PROJECT_ID`.
3. **Service account**: `gcloud iam service-accounts create snapshot-bot --project PROJECT_ID`.
   **No IAM roles are needed.** Listing predefined roles (`roles.list` with no parent) is not gated by a permission;
   any authenticated caller can do it. The only requirement is that the request is attributed to a project with the
   IAM API enabled, which is the project we pass as `x-goog-user-project` (`GCP_PROJECT_ID`). With a service-account
   token the SA's own project is used implicitly. (Not yet verified with a service-account token; if the first run
   returns 403, grant the SA `roles/serviceusage.serviceUsageConsumer` on the project.)
4. **Workload Identity Federation** (no keys):
   ```sh
   gcloud iam workload-identity-pools create github --project PROJECT_ID --location global
   gcloud iam workload-identity-pools providers create-oidc github-oidc \
     --project PROJECT_ID --location global --workload-identity-pool github \
     --issuer-uri https://token.actions.githubusercontent.com \
     --attribute-mapping 'google.subject=assertion.sub,attribute.repository=assertion.repository' \
     --attribute-condition "assertion.repository == 'OWNER/REPO'"
   gcloud iam service-accounts add-iam-policy-binding snapshot-bot@PROJECT_ID.iam.gserviceaccount.com \
     --project PROJECT_ID --role roles/iam.workloadIdentityUser \
     --member "principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/REPO"
   ```
   `access_token` output also needs the SA to mint its own token via the binding above (`workloadIdentityUser`);
   if the auth step fails with "iam.serviceAccounts.getAccessToken denied", also grant
   `roles/iam.serviceAccountTokenCreator` to the same principalSet on the SA.
5. **Repository variables** (Settings > Secrets and variables > Actions > Variables):
   - `WIF_PROVIDER` = `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc`
   - `WIF_SERVICE_ACCOUNT` = `snapshot-bot@PROJECT_ID.iam.gserviceaccount.com`
   - `GCP_PROJECT_ID` = `PROJECT_ID`
6. **GitHub Pages**: Settings > Pages > Source = "GitHub Actions". The deploy job uses the `github-pages` environment.
7. **Branch protection**: the workflow pushes to `main` with `GITHUB_TOKEN`; if `main` is protected, allow
   `github-actions[bot]` to bypass.
8. Run the `snapshot` workflow once via "Run workflow" to verify. The extension then reads
   `https://OWNER.github.io/REPO/manifest.json` and `roles.snapshot.json`.

Note: pushes made with `GITHUB_TOKEN` do not trigger other workflows, which is why the Pages deploy lives in the same
workflow. Pages is deployed only when `data/` changed, so it holds the last changed snapshot.

## Current deployment (configured 2026-11-21)

| Item | Value |
|---|---|
| GCP project | `iam-chrome` (number 609543680898) |
| Service account | `iam-lens-snapshot@iam-chrome.iam.gserviceaccount.com` (no project roles, no user-managed keys) |
| WIF pool / provider | `github-actions` / `iam-lens-repo` (issuer `https://token.actions.githubusercontent.com`) |
| Provider condition | `assertion.repository_id=='1466970464' && assertion.repository_owner_id=='42381187' && assertion.ref=='refs/heads/main'` |
| Impersonation binding | `roles/iam.workloadIdentityUser` for `principalSet://…/github-actions/attribute.repository_id/1466970464` only |
| Repo variables | `WIF_PROVIDER=projects/609543680898/locations/global/workloadIdentityPools/github-actions/providers/iam-lens-repo`, `WIF_SERVICE_ACCOUNT=iam-lens-snapshot@iam-chrome.iam.gserviceaccount.com` |
| Pages URL | `https://ranger7899.github.io/IAM-Lens-extension/` (`manifest.json`, `roles.snapshot.json`, `privacy.html`) |

The IDs are numeric on purpose: a renamed or re-created repository with the same name cannot assume the identity.
`GCP_PROJECT_ID` / quota-project header is no longer used. All of the above is free (no billable resources).
