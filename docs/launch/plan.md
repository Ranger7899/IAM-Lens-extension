# IAM Lens launch plan: community rules, timing, metrics

Scope: where and how to share IAM Lens (Chrome extension, GitHub repo `Ranger7899/IAM-Lens-extension`), in what order, and how to track results. Post drafts are out of scope (IAM-72).

Source status key: **[confirmed]** = fetched from the official page on 2026-11-22. **[unconfirmed]** = official page could not be fetched (blocked or 403) or only secondary sources found; verify by hand before posting.

## 1. Per-channel rules

### r/googlecloud (Reddit)
- **Rules, quoted:** [unconfirmed] The subreddit's own rules page (https://www.reddit.com/r/googlecloud/about/rules) could not be fetched (Reddit blocks automated fetches), and the Reddit help article returned 403. Open it in a browser and paste the exact self-promotion rule here before posting.
- **Site-wide guidance (secondary sources, unconfirmed):** the commonly cited Reddiquette line is "it's fine to be a redditor with a website, it's not fine to be a website with a Reddit account", with a roughly 10% (9:1) self-promotion-to-other-activity guideline. Secondary summary: https://redship.io/glossary/reddit-self-promotion-rules . Moderators judge your overall posting history, and subreddit rules override and are usually stricter than site-wide ones.
- **Best format:** a text post (not a bare link) that explains the problem (finding which IAM role grants a permission, and the reverse), what the tool does, that it is free and open source, and asks a specific question for feedback. Disclose that you are the author in the first line. Check for a "Self-promotion" or "Show and tell" flair/megathread and use it if one exists.
- **Day and time:** no subreddit-specific data found. Reasonable default: Tuesday to Thursday, 9-11 AM US Eastern (overlaps EU afternoon and US morning). Unconfirmed.
- **Avoid:** posting a link with no context, cross-posting the same text to several subs the same day, brand-new or empty account history (comment helpfully in the sub for a week or two first), asking for upvotes, deleting and reposting if it is removed (message the mods instead).

### r/GoogleCloudPlatform (Reddit)
- **Rules, quoted:** [unconfirmed] The rules page (https://www.reddit.com/r/GoogleCloudPlatform/about/rules.json) could not be fetched. Activity level is also unverified. Action: check in a browser whether the sub is active and allows self-promotion. If it is inactive or has no promo rule, skip it rather than cross-post.
- **Format, timing, avoid:** same as r/googlecloud. Do not post the same text on the same day; wait at least 1-2 days and tailor the wording.

### LinkedIn
- **Rules, quoted:** [confirmed] Professional Community Policies, "Do not spam members or the platform": "We don't allow untargeted, irrelevant, obviously unwanted, unauthorized, inappropriate commercial or promotional or gratuitously repetitive messages or similar content." and "Do not use our invitation feature to send promotional messages to people you don't know or to otherwise spam people." Source: https://www.linkedin.com/legal/professional-community-policies
- **Reach guidance:** [unconfirmed, secondary] LinkedIn reportedly limits reach of posts that only try to sell and rewards posts with professional insight; it limits inauthentic activity such as engagement pods. See https://www.linkedin.com/blog/content-recommendations-avoid and https://news.linkedin.com/2026/authentic-content-and-conversations . The claim that external links lower reach is not confirmed by LinkedIn; to be safe, put the article link in the first comment or accept the possible tradeoff.
- **Best format:** a short personal post (4-8 lines): the IAM pain point, a 10-20 second screen recording or one GIF, the article link, and a question. First person, no hashtags wall (2-3 relevant tags).
- **Day and time:** Tuesday to Thursday, 8-10 AM in your audience's timezone (unconfirmed, general practitioner advice).
- **Avoid:** engagement pods, tagging many people who did not agree to it, mass DMs or invitations with the link, pasting the same post into groups.

### Google Cloud Community on Medium
- **Rules, quoted:** [partially confirmed] No official guidelines page was fetchable (Medium help and policy pages returned 403). Forum threads show the process: post a request with your Medium profile link; a community team member "added your medium id" as a writer; then submit the story through Medium's "How to submit a story to a publication" flow. Source: https://discuss.google.dev/t/publishing-blogs-on-medium-community-page/271781 . Medium help article: https://help.medium.com/hc/en-us/articles/213904978-How-to-submit-a-story-to-a-publication [unconfirmed, 403].
- **Related rule, quoted:** [confirmed, but for the forum, not Medium] Google Cloud Community Guidelines section 7: "Do not create spam posts, including content, surveys or URLs that are promotional or commercial in nature", "This community is for technical collaboration, not lead generation or marketing.", "Violations of this policy will result in immediate post removal, and repeat offenses will lead to a permanent ban." Source: https://security.googlecloudcommunity.com/p/community-guidelines . Treat the Medium publication as the same spirit.
- **Reported, secondary:** staff say they accept only stories not behind the Medium paywall; the publication carries a disclaimer that views are the authors' own. Source: search summary of https://discuss.google.dev/t/request-to-become-a-writer-for-google-cloud-medium-publication/376655 [unconfirmed].
- **Best format:** a technical how-to (for example "Find the IAM role for any permission in seconds"), with the tool as the worked example, not a product pitch. Free (no paywall) and the tool must be open source and free to fit.
- **Day and time:** Tuesday to Thursday morning US time. Allow lead time: writer access and publication review can take days. Request access well before the launch week.
- **Avoid:** paywalled story, a landing-page tone, a link-only article, publishing to your own Medium before the publication accepts it if that creates duplicate content (ask the editors).

### Hacker News (Show HN)
- **Rules, quoted:** [confirmed] https://news.ycombinator.com/showhn.html : on topic is "things people can run on their computers or hold in their hands"; blog posts, sign-up pages and newsletters are off topic. "Don't ask friends to upvote or comment." Titles must begin with "Show HN". You must have worked on it personally and be available to discuss it. Users should be able to try it easily, ideally without signups. Do not post landing pages. A feature or upgrade is generally not substantive enough.
- **Guidelines, quoted:** [confirmed] https://news.ycombinator.com/newsguidelines.html : "Please don't use HN primarily for promotion." "It's ok to post your own stuff part of the time, but the primary use of the site should be for curiosity." "Don't solicit upvotes, comments, or submissions." Titles: "Please don't do things to make titles stand out, like using uppercase or exclamation points"; "don't editorialize."
- **Best format:** title `Show HN: IAM Lens - look up Google Cloud IAM roles and permissions both ways`, URL to the GitHub repo (or the Chrome Web Store page; the repo is safer since no install gate). Then post a first comment right away: why you built it, how it works, what is limited, what feedback you want. Make it tryable without sign-in (check how the extension behaves without a Google login before posting).
- **Day and time:** evidence is mixed. A large 2026 analysis of about 188k Show HN posts found Monday 00:00 UTC best (https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/); a BigQuery analysis found Sunday and Saturday with lower competition, peak hour 12:00 UTC (https://hn.jakechampion.name/reader/https://www.myriade.ai/blogs/when-is-it-the-best-time-to-post-on-show-hn , seen in search results only, not fetched). Practitioner advice favors weekday 9-10 AM ET. Suggested: Sunday 12:00 UTC or a Tuesday to Thursday morning; do not agonize. [unconfirmed]
- **Avoid:** asking anyone to upvote (including in the other launch posts), uppercase or exclamation titles, link to a landing page or sign-up wall, reposting after a flop within a short time (email hn@ycombinator.com if you think it was wrongly buried), defensive replies. Be present for the first 2-3 hours.

### dev.to
- **Rules, quoted:** [confirmed] DEV Terms, Content Policy: users should make a good-faith effort to share content that is "not designed primarily for the purposes of promotion or creating backlinks"; affiliate links must be disclosed; posts "may not merely reference an external link that contains the full post"; DEV may remove violating content and restrict participation. Source: https://dev.to/terms . The Code of Conduct (https://dev.to/code-of-conduct) has no promotion-specific clause.
- **Best format:** the full article text (not a teaser pointing off-site), with a canonical URL set to the original if it was published elsewhere first, 3-4 tags (for example `googlecloud`, `security`, `chrome`, `devops`), cover image, a short "what I built and why" section. Disclose you are the author.
- **Day and time:** Tuesday to Thursday morning US/Europe. Unconfirmed.
- **Avoid:** a thin post that only links to the store, tag spam, cross-posting the identical article in the same hour across every site without a canonical URL.

### X and Bluesky
- **X rules:** [unconfirmed] https://help.x.com/en/rules-and-policies/platform-manipulation returned 403. Commonly known: no repetitive identical posts, no unsolicited mass mentions, no engagement trading. Verify in a browser.
- **Bluesky rules, quoted:** [confirmed] Community Guidelines 3.1: "Do not send spam or repeatedly post content in ways that disrupt normal conversations or service use." "Do not artificially manipulate features or social signals to gain unearned reach or mislead users". Also forbids undisclosed commercial or sponsored content. Source: https://bsky.social/about/support/community-guidelines
- **Best format:** one short post with a 10-20 second video or GIF, one link, and one line on who it helps. A 3-post thread at most, with the repo link in the last post. Use the Google Cloud and security hashtags sparingly; on Bluesky, feeds and starter packs matter more than hashtags.
- **Day and time:** weekday mornings. Unconfirmed.
- **Avoid:** repeating the post daily, mass-tagging Google Cloud accounts or developer advocates, buying or trading engagement.

## 2. Launch sequence (about one week)

| Day | Action | Why this order |
|---|---|---|
| Before launch (T-7 or more) | Request Medium publication writer access. Warm up the Reddit account with a week or two of genuine comments. Verify the extension works for a first-time user with no sign-in. Check the Reddit rules in a browser and fill in the unconfirmed items above. | Access and account history take time. |
| Day 1 (Tue) | Publish the article (Google Cloud Community on Medium, or dev.to if access is not yet granted). | Gives every later post one canonical link with depth. |
| Day 2 (Wed) | LinkedIn post linking the article, with a short demo clip. Also the X and Bluesky post. | Professional audience, friendly first reaction, cheap to do. |
| Day 3-4 (Thu/Fri) | Cross-post to dev.to with canonical URL if not done yet. Reply to all comments. | Keeps the article alive. |
| Day 5 (Sat/Sun) or Day 6 (Mon) | Reddit r/googlecloud text post (and r/GoogleCloudPlatform only if active and allowed, on a different day). | Fixes from the first feedback can be applied before the more critical audiences. |
| Day 7 (Sun 12:00 UTC or Tue) | Show HN pointing at the GitHub repo. Stay available for hours. | Most critical audience last, with the best README, demo and fixes. |

Rules of the sequence: never ask for upvotes anywhere; one post per channel; reply to every comment within a day; change only the fixes, not the story, between posts.

## 3. Metrics tracker

Copy one row per day (or at least on days 0, 1, 3, 7, 14, 30).

| Date | Chrome Web Store installs (total / weekly users) | Store rating (avg / count) | GitHub stars | GitHub unique visitors / clones | Article views | Article claps/reactions | Post links and per-post notes |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | | | | | | | |

Where to read each number:

| Metric | Where |
|---|---|
| Installs, weekly users, impressions | Chrome Web Store Developer Dashboard, the item's "Analytics" tab (needs a login; owner reads it) |
| Rating and reviews | Public store listing page and the dashboard's "Reviews" tab |
| GitHub stars | Repo header on GitHub (Star count) or the Stargazers page |
| GitHub visitors, referrers, clones | Repo Insights > Traffic (last 14 days only; record it at least every 14 days) |
| Medium views, reads, claps | Medium Stats page (Stats > Stories); for a publication story also the publication's stats if you have access |
| dev.to views and reactions | dev.to Dashboard (per-post) |
| Reddit upvotes, comments | The post itself; note the score after 24 hours |
| Show HN points, comments | The item page on news.ycombinator.com; note rank peak and points after 24 hours |
| LinkedIn impressions, reactions | "View analytics" under your own post |
| X and Bluesky | X Analytics on the post (if available); Bluesky shows likes, reposts and replies only |

Post links table (keep in the same file or sheet):

| Channel | URL | Date posted | Notes |
|---|---|---|---|
| Article | | | |
| LinkedIn | | | |
| Reddit | | | |
| Show HN | | | |
| dev.to | | | |
| X / Bluesky | | | |

## 4. Converting feedback into Anvil tickets

1. Read every comment, issue and review within 24 hours of each post and log it in a "Feedback" list with the channel and link.
2. Create an Anvil ticket when the item is (a) a bug or a wrong role/permission result: type `bug`; (b) a request raised by two or more people, or by one person with a clear use case: type `task` or `story`; or (c) a docs or store-listing confusion: type `task` with label `docs`.
3. Do not ticket: pure opinions, duplicates (add a comment to the existing ticket instead, and link it), and requests that conflict with the privacy or no-login principles of the project (reply politely, no ticket).
4. Each ticket gets a summary under 100 characters, the source link in the description, what the user expected vs saw, and acceptance criteria. Link duplicates to the first ticket with `relates`.
5. Priority: data being wrong or install-blocking = high; confusing UX or missing common roles = medium; nice-to-have = low.
6. Reply publicly to the commenter with the ticket key once it is created, and again when it is released.
7. Review the feedback list on days 7 and 30 and create a ticket for any theme that appeared three or more times.
