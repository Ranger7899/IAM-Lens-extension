# IAM Lens launch posts (ready to paste)

Author: Yousef Masad. Homepage: https://iamlens.vaultline.cloud . Source: https://github.com/Ranger7899/IAM-Lens-extension

Replace `<STORE_URL>` (Chrome Web Store listing) and `<ARTICLE_URL>` (the published article) before posting. Order, timing and rules are in `docs/launch/plan.md`. Do not ask anyone to upvote on any channel. One post per channel.

Before posting, check by hand: the Reddit rules page (the plan marks it unconfirmed), and that the extension works for a first-time user with no sign-in (Show HN).

---

## 1. Reddit: r/googlecloud

Format: text post, not a bare link. Disclosure is in the first line. Use a Self-promotion or Show and tell flair if the sub has one. Post only after the account has some genuine history in the sub (plan, section 1).

**Title:**

```
I built a free extension to look up GCP IAM roles and permissions both ways (permission -> roles, role -> permissions)
```

**Body:**

```
Disclosure: I'm the author of this. It's free and open source (MIT).

The problem: "which role grants compute.instances.setMetadata?" is a question I kept losing five minutes to. The roles reference is one long page per service, and the permission-to-role direction is awkward there. gcloud works but needs a login and a lot of output to filter. Policy Troubleshooter is good for a specific principal and resource, but not for a bare permission list from a Terraform diff. And when the lookup is tedious, people end up granting roles/editor.

What it does: IAM Lens is a Chrome extension. Paste a permission and see every role that grants it, smallest role first. Open a role and see every permission it holds. There is also an optional minimal-role finder (paste several permissions, get a small set of roles that covers them) and a role compare view. The minimal-role finder uses a greedy set cover, so it is an approximation, not a proven minimum.

Privacy: no analytics, no tracking, no backend. The predefined-role catalogue (about 2,400 roles and 14,000 permissions) ships inside the extension, so search works offline with no sign-in. Sign-in is optional and only used to read your own custom roles, with read-only GET requests. Everything it reads is stored locally in your browser, and signing out revokes the token and deletes the stored custom roles.

Limits: Chrome only, and the data is only as fresh as the last nightly snapshot.

What I'd like feedback on: permission lists where the suggested roles look wrong, roles that are missing or ranked badly, and anything in the sign-in flow that you would not be comfortable with.

Chrome Web Store: <STORE_URL>
Source: https://github.com/Ranger7899/IAM-Lens-extension
Homepage: https://iamlens.vaultline.cloud
Write-up of how it works: <ARTICLE_URL>

Independent project, not affiliated with Google.
```

---

## 2. LinkedIn

Target 150-250 words. Hook in the first line. Attach the demo clip or screenshot. If you want to avoid a possible reach penalty on external links (unconfirmed, see the plan), move the article line to the first comment.

**Post (about 195 words):**

```
Which IAM role grants compute.instances.setMetadata?

I have asked that question more times than I can count, and it usually costs about five minutes. The docs are organised by service, and the permission-to-role direction is awkward. gcloud needs a login and a lot of filtering.

That matters because of how least privilege fails in practice: people grant roles/editor not because they want to, but because finding the narrow role is tedious.

So I built IAM Lens, a Chrome extension that answers both directions in one search box: permission to roles, and role to permissions. Roles are listed smallest first. It works offline, because the predefined-role catalogue (about 2,400 roles) ships inside the extension.

I also wanted privacy to be a design choice, not a policy. There is no analytics and no backend. Sign-in is optional, used only to read your own custom roles, and what it reads stays in your browser.

I wrote up the design, the nightly data pipeline, and what Google's OAuth verification taught me:
<ARTICLE_URL>

It is free and open source. I'd like to hear about any permission list where the suggested roles look wrong.

Chrome Web Store: <STORE_URL>

#GoogleCloud #IAM #CloudSecurity #OpenSource
```

**Alt text for the image (screenshot of search):**

```
IAM Lens side panel showing a search for a Google Cloud permission, with the roles that grant it listed smallest first.
```

(If using the GIF or clip instead: "Short screen recording of IAM Lens: typing a permission name and the matching roles appearing, smallest role first.")

---

## 3. Show HN

Link the post to the GitHub repo (no install gate, not a landing page). Per the plan, post the first comment right away and stay available for the first few hours.

**Title:**

```
Show HN: IAM Lens – look up Google Cloud IAM roles and permissions both ways
```

**URL:** https://github.com/Ranger7899/IAM-Lens-extension

**First comment:**

```
Hi HN, I'm the author. IAM Lens is a Chrome extension (Manifest V3) for the question "which role grants this permission?" and its reverse, "what does this role allow?". I built it because the IAM docs are organised for the second question, and gcloud needs a login and a lot of filtering for either.

Technical details:

- Data: a GitHub Actions job runs daily at 03:17 UTC, calls roles.list (view=FULL, pageSize=1000) once, paginated, and writes roles.snapshot.json plus a manifest.json. Today that is 2,437 predefined roles and 14,389 distinct permissions.
- Auth for the job: Workload Identity Federation, so there is no service account key anywhere. Impersonation is limited to one numeric repository ID, the provider condition checks the numeric owner ID and refs/heads/main, and the service account has no project roles.
- Format: permission strings are interned (stored once, sorted) and roles hold index lists. That takes the JSON from about 8.1 MB to about 2.1 MB before gzip (about 0.47 MB gzipped).
- Versioning: the version is the first 12 hex chars of a SHA-256 over the canonical content, excluding the generatedAt timestamp. If Google changed nothing, there is no diff and no deploy. The extension fetches the small manifest daily and downloads the snapshot only when the version differs.
- Search: MiniSearch for fuzzy matching. Each role is a sorted Int32Array of permission indices, and a compressed-sparse-row inverted index maps permission to roles. Ranking puts roles of the permission's own service first and demotes service-agent, BETA, legacy and deprecated roles, because the numerically smallest role is often a service agent.
- Minimal-role finder: greedy weighted set cover, score = newly covered / (permission count + 10). It is an approximation, not a proven minimum.
- Speed: budgets of 150 ms to interactive and 16 ms per keystroke are enforced in a Playwright test on my machine and only reported on shared CI, where timings are too noisy.

Privacy approach: no analytics, no tracking, no backend, so there is no server of mine in the request path. Lookup works with no sign-in against the bundled snapshot. Optional sign-in uses chrome.identity.getAuthToken (so Chrome only) and read-only GET requests to list your projects, organizations and custom roles. They are stored in IndexedDB in your browser and never uploaded. Signing out revokes the token and deletes them. A backend would have to hold your tokens or your role data, so I left it out.

Limits: Chrome only, greedy set cover, and the snapshot is only as fresh as the last nightly run. There is no read-only IAM scope for custom roles, so sign-in needs the iam scope.

Source is MIT licensed. Article with more detail: <ARTICLE_URL>. Chrome Web Store: <STORE_URL>.

I'd most like to hear about permission lists where the suggested roles look wrong, and any missing or badly ranked roles.
```

---

## 4. X / Bluesky thread

Three posts, repo link in the last one (plan: 3 posts at most). Attach the demo GIF or a screenshot to post 1. Each is 280 characters or fewer, so it fits both platforms. Keep hashtags sparse; skip them on Bluesky.

**Post 1:**

```
"Which role grants compute.instances.setMetadata?" Finding the narrow role is slow enough that people grant roles/editor instead.

I built IAM Lens, a free Chrome extension: paste a permission, see the roles that grant it, smallest first. Works in reverse too.
```

**Post 2:**

```
It works offline on a bundled snapshot of about 2,400 predefined roles. No analytics, no backend. Optional sign-in only reads your own custom roles, and they stay in your browser.

Write-up of how it works: <ARTICLE_URL>
```

**Post 3:**

```
Free, MIT licensed, Chrome only. I'd like to hear about permission lists where the suggested roles look wrong.

Store: <STORE_URL>
Source: https://github.com/Ranger7899/IAM-Lens-extension
```

X only: optionally add `#GoogleCloud` to post 1.

---

## 5. dev.to cross-post note

Post the full article text (not a teaser), copied from `docs/article/draft.md` once finalised. The plan requires a canonical URL if it was published elsewhere first.

- **Canonical URL:** `<ARTICLE_URL>` (set it in the dev.to front matter as `canonical_url`, or in the post's settings).
- **Title:** How I built a GCP IAM lookup extension that never sends your data anywhere
- **Tags (max 4):** `googlecloud`, `security`, `chrome`, `devops`
- **Cover image:** the architecture image from the article.
- **Opening line, add above the article:**

```
I'm the author of IAM Lens. This post was first published at <ARTICLE_URL>; I'm cross-posting it here in full.
```

- **Closing section:** keep the "Try it and contribute" section with `<STORE_URL>` and the GitHub link, plus the not-affiliated-with-Google disclaimer.
- Post it Day 3-4 as in the plan, or Day 1 if dev.to is the first home (then no canonical needed). Reply to comments within a day.

---

## Open items before posting

- The article draft still has two HTML comments: a worked example to verify and the real OAuth verification outcome (after IAM-57). The posts above do not state a verification outcome; keep it that way until the article does.
- Fill `<STORE_URL>` once the store listing is live, and `<ARTICLE_URL>` once the article is published.
- Add the demo clip or GIF (10-20 seconds) for LinkedIn and X/Bluesky.
