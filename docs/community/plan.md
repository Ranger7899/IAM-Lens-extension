# Community recognition plan (Google Cloud Innovators, GDE, GDG/DevFest)

Researched 2026-11-22 from official Google pages. Every program fact below has a URL. Items marked **[UNCONFIRMED]** could not be verified on an official page. Nothing here required signing up or logging in.

## 0. Key finding: the program landscape changed

The ticket framed "Champion Innovators" as a separate invite/nomination tier. That is outdated:

- On 2025-03-22 Google announced: "We're fully integrating Google Cloud Champion Innovators (Champions) into the Google Developer Experts (GDE) program." and "This transition is about more than just merging programs. It's about amplifying the incredible work the Google Cloud GDEs (formerly Champions) do." (https://cloud.google.com/blog/products/ai-machine-learning/the-google-developer-experts-program-is-growing)
- The old Innovators Plus paid tier: "November 15, 2024: The Cloud Innovators Plus program has evolved and is now the premium tier of the Google Developer Program." (https://cloud.google.com/blog/topics/training-certifications/get-to-know-the-google-cloud-innovators-program)
- `https://cloud.google.com/innovators` now 301-redirects to https://developers.google.com/program (Google Developer Program). The Google Developer Program page does not mention "Google Cloud Innovators" by name (checked 2026-11-22). Treat "join Innovators" as "join the Google Developer Program" **[UNCONFIRMED whether Google still uses the Innovators name]**.
- The legacy page https://cloud.google.com/innovators/innovator still says Champion Innovators "are primarily composed of Google Developer Experts" and "Most Champions first join the Google Developer Experts program." It lists no nomination steps or benefits.

Practical consequence: the realistic recognition path is Developer Program (free) -> public contributions -> GDE (Google Cloud category) via referral. "Champion" is now just GDE.

## 1. Programs

### 1.1 Google Developer Program (formerly Google Cloud Innovators base tier)

- **What:** "The no-cost Google Developer Program." Benefits listed: 35 monthly Google Skills credits for agentic learning paths, 1,000+ codelabs, Build with AI workshops, verifiable digital badges, "peer groups, events, and early-access programs." Premium plans/credits exist via a "Plans & Pricing" page. (https://developers.google.com/program)
- **Eligibility:** None stated on the page. Legacy blog (2023): "Becoming an Innovators program member only takes a few clicks on the Innovators home page." (https://cloud.google.com/blog/topics/training-certifications/get-to-know-the-google-cloud-innovators-program)
- **How to join:** Go to https://developers.google.com/program and use its join button. Requires a Google account **[UNCONFIRMED; exact flow not checked because we must not sign up]**. This is task IAM-75 (owner action).
- **Benefits:** see above. Legacy Innovators benefits (2023 blog): "live discussions with Google Developer Advocates, professional development sessions" and a global Innovators network.
- **Time commitment:** None. Membership is passive.
- **Why it matters for recognition:** it gives a public profile where IAM Lens can be featured, and badges. It is not itself a recognition tier. **[UNCONFIRMED: whether profiles can feature a project; verify when joining.]**

### 1.2 Champion Innovators (legacy)

- **What:** Legacy top tier, now folded into GDE (see section 0). Legacy definition: individuals "at the top of their game technically - and for going further to inspire, invigorate, and challenge the Google Cloud community and our product teams by sharing their technical knowledge and contributing to conferences, open source projects, forums, blogs, workshops, community events, and social media." (https://cloud.google.com/innovators/innovator)
- **How to get it:** "Members of the invite-only Champions level are nominated by Googlers." (2023 blog, URL above). No longer an independent path; use GDE.
- **Benefits (legacy):** "all the benefits of being an Innovator and an Innovators Plus member, and special treatment at Google Cloud events." Current post-merger benefits are those of GDE.
- **Time commitment:** not stated.

### 1.3 Google Developer Experts (GDE), Google Cloud category

- **What:** "a global community of experienced developers who love to share their knowledge and passion with others." "They are not Google employees, but independent professionals." (https://developers.google.com/community/experts)
- **Criteria (three qualities):** "Have solid knowledge of one or more Google or open source technologies."; "A persistent enthusiasm for sharing their technical knowledge"; "Contribute to local developer communities and foster an inclusive environment for knowledge sharing". (same page)
- **Evidence expected:** "Successful GDE candidates have a long track record of public speaking at technical events and/or creating technical content." and the FAQ suggests showing impact over "at least 2 years." (https://developers.google.com/community/experts/faq). Note: the 2-year figure came from a summary of the FAQ; re-read the FAQ before relying on it **[partly UNCONFIRMED]**.
- **How to be nominated:** "Google Developer Expert candidates must be nominated by an active GDE or Google employee." (https://developers.google.com/community/experts) FAQ: "you need to be referred by a Google employee or an active GDE", and you can "reach out to your local Google contact and/or an active GDE" to discuss. Self-nomination is not addressed; assume it is not possible. If rejected, the window reopens six months after submission (FAQ).
- **Product areas:** Cloud (including Google Cloud, Workspace, Firebase, Go), AI, Web, Mobile (FAQ). IAM Lens fits **Google Cloud**.
- **Benefits:** "Access to speaking and networking opportunities."; "Invitations to Google-run events."; "Early access to new products and features."; listing in the GDE directory (https://developers.google.com/community/experts/faq). Directory: https://developers.google.com/community/experts/directory
- **Expectations:** create content, speak, host workshops, give product feedback, mentor/lead groups (about page). GDEs sign an NDA and follow the Code of Conduct (FAQ).
- **Time commitment:** hours not specified. "Staying active and maintaining regular contributions is key to having your title prolonged." Membership "is reviewed annually." (FAQ)

### 1.4 GDG chapters and DevFest

- **GDG:** local community groups; "2000+ community groups". Find one via https://developers.google.com/community#developers-community-map and the directory at https://gdg.community.dev/ ("Join a Google Developer Group to build new skills and connect with local developers, online and in person."). Discord: https://discord.com/invite/google-dev-community. Leading a chapter: https://app.advocu.com/gdg/join. (https://developers.google.com/community/gdg)
- **DevFest:** "local community-led tech conferences hosted by Google Developer Groups (GDGs)"; the 2026 season runs "October 1 - December 31, 2026." (https://developers.google.com/community/devfest). It is 2026-11-22 now, so the 2026 season is nearly over; target the 2027 season.
- **Speaking/CFP:** neither official page describes a CFP process. Each chapter runs its own (see 3).
- **Time commitment:** attending is free-form; speaking is a single talk plus prep.

## 2. What reviewers look for, and a contributions log

Official signal: public speaking and/or technical content over a sustained period, community building, product feedback (GDE pages above). The following is our interpretation of how to evidence that **[not an official rubric]**:

| Category | Evidence that is easy to verify |
|---|---|
| Articles | Public URL, date, views/reactions, republished/cited |
| Talks | Event page, date, slides, recording, attendee count |
| Open source | IAM Lens repo, releases, issues closed from users, stars, contributors |
| Q&A help | Links to accepted answers (Stack Overflow, r/googlecloud, Google Cloud Community) |
| Mentoring | Sessions held, people helped, with consent to name them |
| Product feedback | Issue tracker reports filed against Google Cloud products, with links |

Keep one log, `docs/community/contributions-log.md` (create when the first entry exists), one row per item:

```
| Date | Type | Title | Where (URL) | Audience/metric | Notes (what changed because of it) |
```

Rules: log on the day it happens; always store a public URL; record numbers at 30 days; keep a quarterly summary of the 3-5 strongest items. A nominator needs this to write the referral.

## 3. Finding nearby GDG chapters and DevFest CFPs (location unknown)

1. Open https://gdg.community.dev/ -> "Chapters"; search by your city or country, and also list the 2-3 nearest cities and any national or online chapters.
2. Open each chapter page, click Follow/Join on the chapter (requires an account; do this yourself) so you get event and CFP emails **[UNCONFIRMED: exact UI]**.
3. Use "Upcoming Events" on the same site and filter for the DevFest label (event titles usually contain "DevFest").
4. Also try the map at https://developers.google.com/community#developers-community-map.
5. CFPs are usually announced on the chapter page, the chapter's social channels or a Sessionize/Google Form link **[UNCONFIRMED; no official statement]**. If none is open, email the chapter organizers directly (their names are on the chapter page) offering a 20-30 minute IAM talk.
6. Calendar rule: DevFest runs Oct-Dec; CFPs commonly open a few months before **[UNCONFIRMED]**, so check from about June.
7. Cross-check Google Cloud community events at https://cloud.google.com/events **[URL not verified]**.

## 4. Six-month plan (built on IAM Lens)

Month numbering starts when IAM-75 (join the program) is done. Assumes about 4-6 hours per week.

| Month | Goal | Concrete actions | Log evidence |
|---|---|---|---|
| 1 | Foundations | Join Google Developer Program and set up the profile featuring IAM Lens (IAM-75). Join the nearest GDG chapter(s) and the Discord. Create the contributions log. Publish article 1 (IAM Lens: what it does and why; `docs/article/`). Start answering IAM questions (target 3 per week). | Article URL, log created |
| 2 | First talk submitted | Submit the talk proposal to a GDG meetup (IAM-76: abstract, bio, 10-slide outline). Cut an IAM Lens release from the first feedback. Post the article to r/googlecloud and the Google Cloud Community forum per their rules. | CFP submission, release notes |
| 3 | Deliver and deepen | Give the meetup talk (or an online one); record it and publish slides. Write article 2, "Least-privilege IAM in practice". Continue Q&A (target 10 accepted or upvoted answers cumulative). | Talk page, recording, article 2 |
| 4 | Feedback loop | Triage user issues; ship a release driven by community requests; credit contributors. File product feedback on gaps found in IAM tooling. Offer one mentoring session or a lightning talk to a second chapter. | Release, issue links |
| 5 | Scale reach | Prepare 2027 DevFest CFP material (refine talk, add a demo). Write a short tutorial or video. Contact one GDE in the Cloud category by public channels for feedback (not a request for nomination). | Tutorial, GDE conversation note |
| 6 | Review and position | Submit to any open DevFest or conference CFP. Compile the 6-month evidence summary. Ask an active GDE or Google contact whether they would consider a referral (FAQ says to "reach out to your local Google contact and/or an active GDE"). Plan the next 6 months. | Summary doc, CFP submissions |

Realism note: the GDE page cites a "long track record" and the FAQ suggests about 2 years of impact, so 6 months builds the base; a nomination within this window is unlikely and should not be the success metric. Better metrics: 2 articles, 1-2 talks, 25+ community answers, 2+ releases from feedback.

## 5. Open items for the owner

- Confirm on joining whether "Google Cloud Innovators" naming still exists and whether the profile can feature IAM Lens.
- Re-read https://developers.google.com/community/experts/faq in full for the exact "2 years" wording and time expectations.
- Confirm local chapter, CFP channels and 2027 DevFest dates once known.
