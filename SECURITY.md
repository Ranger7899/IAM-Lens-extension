# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately. Do not open a public issue.

- Email: ysfmasad@gmail.com
- Or use GitHub private vulnerability reporting: the "Report a vulnerability" button under the repository's Security tab.

Include what you found, steps to reproduce, the affected version, and the impact you see. I aim to acknowledge reports within a few days and will keep you updated on the fix. Please allow a reasonable time to release a fix before any public disclosure.

## Scope

In scope:

- The IAM Lens Chrome extension (popup, side panel, options page, background worker, permissions and storage handling).
- The snapshot pipeline that builds the IAM role and permission data shipped with the extension (see `docs/snapshot-pipeline.md`), including its GitHub workflow.

Out of scope:

- Vulnerabilities in Google Cloud, Chrome or other third-party services and dependencies themselves (report those upstream).
- Issues that need a compromised device or browser profile.
- Social engineering, and denial of service through unrealistic volumes.

## Bounty

There is no bug bounty. Credit in the release notes is offered if you want it.
