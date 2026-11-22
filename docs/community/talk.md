# Talk proposal: least-privilege IAM and a privacy-first tool for it

Prepared for a GDG meetup or DevFest call for proposals (CFP). Based on `docs/article/draft.md`; numbers come from `docs/article/outline.md` (facts sheet, 2026-11-22). Re-check them against `data/manifest.json` before submitting, because the snapshot changes nightly.

## Title options

1. Least-Privilege IAM on Google Cloud, and Building a Privacy-First Tool for It
2. Which Role Grants This Permission? Least Privilege in Milliseconds, with No Backend
3. Stop Granting roles/editor: Finding the Smallest IAM Role, Offline

## Abstract (100 words)

<!-- ABSTRACT-100 -->
Granting roles/editor is easy. Finding the narrowest role that covers ten permissions is not. This session shows how to practise least-privilege IAM on Google Cloud: reading permissions, choosing predefined roles, and handling custom ones. It then tells the story of IAM Lens, an open-source Chrome extension built privacy-first. The full role catalogue ships inside it, search runs offline in milliseconds, and the only network use is optional, read-only sign-in straight to Google. Attendees leave with a repeatable method for picking minimal roles, and design patterns for useful tools that never need a backend of their own, plus a live demo.
<!-- /ABSTRACT-100 -->

## Abstract (250 words)

<!-- ABSTRACT-250 -->
Every GCP engineer has asked "which role grants compute.instances.setMetadata?" and then lost five minutes to it. When the lookup is slow, the broad role wins. Least privilege fails in practice because finding the right narrow role is tedious, not because people disagree with the principle.

This session starts with a practical method for least-privilege IAM on Google Cloud. We look at the two directions of the question, permission to roles and role to permissions, and where the docs, gcloud and Policy Troubleshooter each fall short. We then work through picking a minimal set of roles for a real permission list, including why the numerically smallest role is often a service agent you must not use, and why a greedy set cover gives a good answer without being provably optimal.

The second half is a case study: IAM Lens, an open-source Chrome extension that answers these questions instantly and offline. Privacy is an architecture decision here, not a policy. A nightly pipeline using Workload Identity Federation, with no service account keys, snapshots 2,437 predefined roles and 14,389 permissions into a roughly 2 MB file that ships inside the extension. Custom roles come from optional sign-in using read-only calls straight from the browser to Google, with no server in between. We also cover what Google's OAuth verification taught me about sensitive scopes.

You will leave with a repeatable way to choose minimal roles, a checklist for scope and data minimisation, and patterns for building tools that do not need a backend.
<!-- /ABSTRACT-250 -->

## Session details

- **Level:** Intermediate. Assumes you have granted IAM roles and know what a permission and a predefined role are. No Chrome extension experience needed.
- **Target audience:** Cloud and platform engineers, DevOps and SRE, security engineers, and developers who own their team's GCP projects.
- **Takeaways:**
  - A repeatable method to find the smallest role (or set of roles) for a list of permissions, and the traps to avoid: service agents, BETA, legacy and deprecated roles.
  - How to refresh public reference data safely with a nightly job using Workload Identity Federation (no keys) and content-hash versions.
  - How to design a tool so that privacy comes from the architecture: bundled data, read-only calls, minimal OAuth scopes, no backend.
- **Formats offered:**
  - **20-minute session:** the full 11-slide outline below, with the live demo (about 3 minutes).
  - **5-minute lightning talk:** slides 1, 2, 5, 6, 10 and 11 only (problem, the finder, the demo or GIF, takeaways). About 40 seconds per slide, demo replaced by the GIF.
- **Other info for the CFP form:** English; open to in-person or online; no sponsor pitch (the tool is free and MIT licensed); slides and repo link shared afterwards.

## Speaker bio (about 60 words)

Yousef Masad is a [JOB TITLE] at [COMPANY / "independent"] working on [FOCUS AREA, e.g. cloud security and platform engineering] [LOCATION]. He builds IAM Lens, an open-source Chrome extension for finding least-privilege Google Cloud IAM roles offline, and writes about privacy-first design. [OPTIONAL: one line on certifications, past talks or community roles.] Find him at [LINK: GitHub / LinkedIn].

*Owner fills the bracketed parts. Keep it at about 60 words.*

## Slide outline (11 slides, 20 minutes)

Timing assumes 20 minutes including a short Q&A buffer.

1. **Title and the five-minute problem (1 min).** Title, name, one line: "Which role grants this permission?"
   *Notes:* Open with the question and ask for a show of hands: who has granted roles/editor "just for now"? Say that this talk is about making the narrow role as cheap as the broad one.
2. **Why least privilege fails (2 min).** Two directions: permission to roles, role to permissions. Docs, gcloud and Policy Troubleshooter, and what each is good at.
   *Notes:* Be fair to the existing tools. Policy Troubleshooter explains a concrete denial for a principal and resource; it does not answer "smallest role for these ten permissions". gcloud works but needs a login and filtering.
3. **A method for choosing roles (2 min).** Start from the permissions you need, same-service roles first, avoid service agents, BETA, legacy and deprecated, prefer fewer bindings, then prune.
   *Notes:* Explain that the numerically smallest role granting a permission is often a service agent meant for a Google-managed identity. Give one real example (pick and verify against the current snapshot before the talk).
4. **The finder, and its honest limits (2 min).** Greedy weighted set cover: score = newly covered / (permission count + 10); tiers; prune redundant picks.
   *Notes:* The overhead term models the cost of one more binding. Say plainly that greedy is an approximation, not provably minimal. Invite counter-examples.
5. **Demo, part 1: permission to roles (3 min, live).** See the demo plan below.
   *Notes:* Type a permission; roles appear smallest first with the Least-privilege badge. Then search by role name.
6. **Demo, part 2: minimal-role finder (included in the 3 min).** Paste a permission list, show the chosen roles.
   *Notes:* Pre-paste the list in a scratch file. Point out which role was demoted and why.
7. **Design goals: instant, offline, private (2 min).** Budgets: 150 ms to interactive, 16 ms per keystroke, enforced in an e2e test. No analytics, no backend.
   *Notes:* "A performance number nobody enforces drifts. Mine is a failing test." Mention budgets are enforced locally and only reported on shared CI.
8. **Data pipeline: a nightly snapshot, no keys (3 min).** Architecture diagram: GitHub Actions cron, OIDC, Workload Identity Federation, service account, roles.list, GitHub Pages, extension. 2,437 roles, 14,389 permissions, about 2.07 MB raw and 0.47 MB gzipped.
   *Notes:* Explain the hardening: numeric repository and owner IDs, refs/heads/main condition, service account with no project roles. Content-hash version means quiet days produce no diff and no deploy.
9. **Custom roles and OAuth verification (2 min).** getAuthToken, GET only, IndexedDB; `auth/iam` is the only accepted scope besides cloud-platform for custom roles.list; branding, domain and demo video requirements.
   *Notes:* Be honest about status: update with the real verification outcome (IAM-57) before the talk. Mention the unverified-app 100-user cap if still relevant.
10. **Lessons and limits (1.5 min).** Ship the data, not a server; content-hash versions; budgets in tests; scope minimisation is a product decision; ranking beat speed. Limits: Chrome only, greedy cover, snapshot is as fresh as the last nightly run.
    *Notes:* Keep this to the three takeaways from the abstract.
11. **Try it, contribute, questions (1.5 min).** Homepage https://iamlens.vaultline.cloud/, Chrome Web Store link [add when live], GitHub Ranger7899/IAM-Lens-extension. QR code.
    *Notes:* Ask for permission lists where the suggestion looks wrong. Close with the disclaimer: independent project, not affiliated with Google.

## Live demo plan and fallback

**Setup (before the session):**
- Chrome with IAM Lens installed, signed out (the demo must work with no sign-in, which is itself the point).
- Wi-Fi off or airplane mode on, to show it works offline. Keep a hotspot ready in case the room needs it.
- Browser zoom at 125-150%, side panel open once so the catalogue is warm. Notes with the three inputs ready: one permission (for example `compute.instances.setMetadata`), one role name, one list of about 10 permissions.
- Screen mirrored and tested on the venue projector in the break before.

**Script (3 minutes):**
1. Type the permission. Show roles listed smallest first and the Least-privilege badge. Say the offline state out loud.
2. Search a role name; show its permissions.
3. Paste the 10-permission list into the minimal-role finder; show the chosen roles and explain one choice.

**Fallback triggers:** the extension fails to load, projector problems, or more than 30 seconds lost. Do not debug on stage.

**Fallback assets:**
- Primary: the recorded GIF of search, `docs/article/images/search.gif` (type a permission, roles appear smallest first; under 10 s). Embed it in slide 5 as a looping image so it is already there.
- Also embedded: `docs/article/images/minimal-roles.png` (finder screenshot) for slide 6. Note: that file and `search.gif` are still to be produced for the article (IAM-68). The repo currently has `minimal-finder.png` and `role-detail.png` in `docs/article/images/`; use those if `minimal-roles.png` does not exist yet.
- Keep a PDF export of the deck with the GIF frames as stills, in case animations fail.

## Notes for the owner

- Fill the bio placeholders and the Web Store link before submitting (IAM-77).
- Re-check all numbers against `data/manifest.json` and update the verification status (slide 9).
- Per `docs/community/plan.md`, the 2026 DevFest season ends 2026-12-31; target a GDG meetup now and the 2027 DevFest season after that.
- Slides are not built here (out of scope for IAM-76).
