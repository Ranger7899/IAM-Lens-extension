# Plan: Google verification and Chrome Web Store acceptance

Goal: IAM Lens is live on the Chrome Web Store, and its OAuth consent screen is verified by Google. The verified screen shows the "IAM Lens" name and logo, has no "Google hasn't verified this app" warning, and has no 100-user cap.

Owner key: 🧑 = you (needs your account, money or a decision) · 🤖 = an agent can do it · 🧑🤖 = an agent prepares, you click.

## Key findings (2026-11-22)

- Sensitive-scope verification takes about 10 business days and brand verification 2–3 days (support.google.com/cloud/answer/13463817). The scope's category (sensitive or restricted) is shown on the Console's Data Access page. Restricted scopes would also need a security assessment (CASA, about 6 weeks), so confirm this first.
- **The homepage must be hosted on a verified domain you own** (answer/13464321). The privacy policy must be on the same domain as the homepage and linked from it, and the link must match the one on the consent screen exactly. `ranger7899.github.io` is very likely rejected → **a custom domain is needed** (about $10–15 per year).
- Authorized domains must be verified in Google Search Console by a project Owner or Editor.
- Demo video: an unlisted YouTube link in English. It must show the full consent flow, the app name on the consent screen, the client ID in the address bar, and each scope in use.
- An unverified app is capped at 100 new users for the project's lifetime (the cap can't be reset). Apps in "Testing" status lose their tokens after 7 days.
- Open risk: the `launchWebAuthFlow` redirect is `https://<id>.chromiumapp.org/`. You can't verify that domain, and Google's docs don't cover this case.
- Chrome Web Store: a one-time developer fee, a verified contact email, a single purpose, a justification for each permission, and a privacy policy. Review usually takes a few days and can take up to 3 weeks.

## Order of work (Anvil epic IAM-45)

```
1  🧑 IAM-46   Check scope category in Console (sensitive vs restricted)          ─┐
2  🧑 IAM-47   Pick/buy a custom domain, verify it in Search Console                ├─► 6 🧑🤖 IAM-51 Point domain at GitHub Pages
3  🤖 IAM-48   Build homepage site/index.html (+ terms) and deploy with Pages       ─┘        │
4  🤖 IAM-49   Update privacy policy for auto-sync (all accessible projects)                  │
5  🤖 IAM-50   Research: chromiumapp.org redirect vs authorized domains; fallback            │
7  🤖 IAM-52   Refresh verification + store docs (no picker, auto-sync, real URLs, logo PNG)  │
8  🤖 IAM-27   Release prep: version 1.0.0, CHANGELOG, permission audit, `wxt zip` (IAM-27)    │
9  🧑🤖 IAM-53 Chrome Web Store: developer account, upload a draft, align the extension ID ◄──┘
10 🧑🤖 IAM-54 Consent screen: name, logo, support email, links, domains, publish to "In production"
11 🧑🤖 IAM-55 Demo video: test custom role (agent, free) → you record and upload unlisted
12 🧑 IAM-56   Submit the Chrome Web Store listing for review
13 🧑 IAM-57   Submit OAuth verification and answer Google's emails until approved
```

1, 2, 3, 4, 5 and 7 can all start now. 6 needs 2 and 3. 9 needs 8. 10 needs 6, 7 and 9. 11 needs 10. 12 needs 9 and 4. 13 needs 10, 11 and 12.
