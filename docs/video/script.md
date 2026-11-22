# IAM Lens video scripts (IAM-55)

Two cuts from one recording session:

- **Cut A: Google OAuth verification demo**, about 3 minutes, Unlisted on YouTube. Requirements come from `docs/oauth-verification.md`.
- **Cut B: promo**, 45 to 60 seconds, for the Chrome Web Store listing video, YouTube and LinkedIn.

Narration is first person and plain. Do not say or imply the app is "verified" or "approved by Google". If Google shows the "unverified app" screen, say so honestly (shot A7).

## UI labels used in this script (checked against `src/`)

| Where | Exact text | Source file |
| --- | --- | --- |
| Side panel top bar | title "IAM Lens", gear icon button labelled "Settings" (opens the options page) | `src/entrypoints/sidepanel/router.tsx` |
| Side panel tabs | "Search" always; "Minimal" and "Compare" are **hidden by default** (Settings, Side panel card, switches "Minimal roles finder" and "Compare roles") | `useSidePanelTabs.ts`, `SidePanelCard.tsx` |
| Search results tabs | "Roles · N", "Permissions · N" | `SearchScreen.tsx` |
| Pasting one permission | jump card "Open permission" with the permission ID; Enter opens it | `SearchScreen.tsx` |
| Permission page | "Granted by N roles"; order control "Order" with "Same service first" / "Smallest overall"; badge "Least privilege" | `PermissionDetailView.tsx`, `Badge.tsx` |
| Custom role badge | "Custom · IAM-Chrome (project)" (shows the project display name) | `SourceBadge.tsx` |
| Search page sync row | "Custom roles · 1 from 1 project · synced just now" (only while signed in); icon button "Refresh custom roles", tooltip changes to "Syncing…" while running | `CustomSyncRow.tsx` |
| Settings, Custom roles card | title "Custom roles"; buttons **"Sign in with Google (Chrome account)"** and **"Use a different Google account"** (the second one opens a popup with Google's account picker); status line "Signed in with your Chrome account" or "Signed in with another Google account (session lasts about an hour)"; then dialog "Before you sign in" with "Not now" and "Continue" | `CustomRolesCard.tsx`, `TrustSheet.tsx` |
| After sign-in (Settings) | badge "Signed in"; summary "N custom roles from N projects and N organizations. Last synced just now."; "Sources with custom roles (N)"; buttons "Sync now" and "Sign out & clear" | `CustomRolesCard.tsx` |
| Sign-out dialog | title "Sign out and clear custom roles?", confirm button "Sign out & clear", then toast "Signed out. Custom roles cleared." | `CustomRolesCard.tsx` |

Facts to keep straight:

- Extension ID `odnpdglkmklhecdmggaebgakadfciooc`; OAuth client ID `609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb.apps.googleusercontent.com`, shown in the extension's own "Before you sign in" sheet ("Who is asking") right before Google's consent window, and also in `oauth2.client_id` in the manifest (backup).
- Scopes: `https://www.googleapis.com/auth/iam` (Google words it "Manage your IAM policies") and `https://www.googleapis.com/auth/cloud-platform.read-only`.
- Project `iam-chrome`. Custom role `projects/iam-chrome/roles/iamLensDemo`, title "IAM Lens Demo – Storage reader", permissions `storage.objects.get`, `storage.objects.list`, `resourcemanager.projects.getIamPolicy`.
- Permission `resourcemanager.projects.getIamPolicy` is granted by `roles/browser` (6 permissions), `roles/iam.roleViewer` (6), `roles/resourcemanager.projectIamAdmin` (9), plus Owner/Editor-class roles with far more. The custom role has 3.
- The local build and the store item share the ID `odnpdglkmklhecdmggaebgakadfciooc` (manifest key = store public key, IAM-53).
- Sign-in with `chrome.identity.getAuthToken` uses the Google account signed in to the Chrome profile. There is no account picker, which is why the Owner account must be the Chrome profile account.

---

## Prep checklist (do all of it before pressing record)

1. **Two Chrome profiles.**
   - Profile "Owner": signed in to Chrome with the Owner account of project `iam-chrome`. IAM Lens is installed here (the store-ID build). This is the profile for every IAM Lens shot.
   - Profile "Teammate": signed in with the second account (ysfmasad@gmail.com), which has **no roles** on `iam-chrome`. Used only for the error shot.
2. **Window size 1280x800** for both profiles. Chrome cannot be resized exactly from the page, so use a window tool such as Rectangle (custom size) or launch Chrome with `--window-size=1280,800`. Record that area at 1280x800 (or scale to 1920x1080); the key is the same size in every shot.
3. **Clean the browser.** Hide the bookmarks bar (Cmd+Shift+B). Close all personal tabs. Remove unrelated extensions from the toolbar (pin only IAM Lens). Turn off notifications (Focus mode). Hide the dock and menu bar clutter, close Slack and Mail.
4. **Theme.** Pick one theme for the whole video (Settings, Appearance). Light reads better in compressed video and on LinkedIn; dark is fine if you prefer it. Do not switch between shots.
5. **Build and reload.** Load the store-ID build (IAM-53) unpacked, or the store draft. In `chrome://extensions` click the reload icon on IAM Lens. Confirm the version and ID.
6. **Consent screen status.** Confirm the OAuth consent screen is in production (IAM-54). If the app is still unverified, expect Google's "unverified app" screen at A7.
7. **Start state for Cut A.** In the Owner profile, open Settings and, if "Signed in" shows, click "Sign out & clear" so the video starts signed out. Also open https://myaccount.google.com/permissions and remove "IAM Lens" if listed, so the consent screen appears fresh.
8. **Sync the custom role ahead of time (rehearsal only).** Sign in once, open the side panel Search page, press the refresh icon ("Refresh custom roles") on the "Custom roles ·" row, and confirm the role "IAM Lens Demo – Storage reader" appears when you search `storage.objects.get`. Then sign out again as in step 7 for the verification take. For Cut B (promo) stay signed in.
9. **Rehearse the badge.** Paste `resourcemanager.projects.getIamPolicy` signed out, open the permission, click "Smallest overall", and check which role carries "Least privilege" (`roles/browser` and `roles/iam.roleViewer` tie at 6 permissions, so check which sorts first). Signed in, the custom role (3 permissions) should rank first and carry the badge. Adjust the narration to what the screen actually shows.
10. **Pre-open tabs.** Teammate profile: https://console.cloud.google.com/iam-admin/iam?project=iam-chrome (already showing Google's error). Owner profile: `chrome://extensions`, `chrome-extension://odnpdglkmklhecdmggaebgakadfciooc/manifest.json`, https://myaccount.google.com/permissions.
11. **Copy the permission** `resourcemanager.projects.getIamPolicy` from the Console error into the clipboard (select it in the message, Cmd+C) so the paste in shot A2 is real.
12. **Hide personal info.** Blur or avoid other project names, billing details and the account menu. The email in the Chrome toolbar and consent screen may stay visible (it is the demo account); other personal accounts must not.
13. **Cursor and audio.** Cursor highlight on (Cmd+Shift+5 Options, "Show Mouse Clicks"). Quiet room, mic checked. Plan to record voice-over separately if the live take is noisy.
14. **Optional for the Minimal tab:** the demo cuts do not need it. If you decide to show it, enable Settings, Side panel, "Minimal roles finder" first.

---

## Cut A: Google OAuth verification demo (about 3:05)

Goal: show everything Google asks for in one continuous take, opened by a 25 second pain story.

| # | Time | On screen (exact actions) | Narration / caption | Notes |
| --- | --- | --- | --- | --- |
| A1 | 0:00-0:07 | **Teammate profile.** Console IAM page for `iam-chrome` is loaded. Show the red/grey permission error in full. Slowly select the line containing `resourcemanager.projects.getIamPolicy` (triple-click). Cmd+C. | "A teammate opens the IAM page for our project and gets this. 'You need permission'. It names one permission, resourcemanager.projects.getIamPolicy, and nothing else." | This is Google's real message, not a mock-up. Keep the project ID `iam-chrome` and the permission text readable. Zoom to 110% if needed (Cmd +). |
| A2 | 0:07-0:12 | Switch to **Owner profile** window (Cmd+backtick or click). Click the IAM Lens toolbar icon to open the side panel. Click the search field, Cmd+V. The jump card "Open permission" with the ID appears. Press Enter. | "As the admin, I paste that permission into IAM Lens." | If the side panel opens with Search already focused, skip the click. |
| A3 | 0:12-0:25 | Permission page: "Granted by N roles". Click the "Smallest overall" segment of the Order control. Pause on the top rows: `roles/browser` (6) and `roles/iam.roleViewer` (6), then scroll to show `roles/resourcemanager.projectIamAdmin` (9) and Owner far below. Hover the "Least privilege" badge. | "Which role do I grant? The smallest roles come first. Browser and IAM Role Viewer have six permissions each. Project IAM Admin has nine, and Owner has hundreds. I'd rather grant the small one." | Signed-out state, predefined roles only. Do not scroll fast. End the intro on a clean cut. If the badge sits on a different role than you say, fix the line. |
| A4 | 0:25-0:42 | Open a new tab: `chrome://extensions`. Toggle Developer mode on (top right). Frame the IAM Lens card: name and ID `nkkm...hgaen`. Click the IAM Lens toolbar icon, then the gear ("Settings"). | "This is IAM Lens, a Chrome extension. It does one thing: it tells you which Google Cloud roles grant a permission, and which permissions a role has. Predefined roles work with no sign-in at all. Signing in is optional, and only adds your own custom roles." | State the single purpose. The ID must be readable (zoom in on it). |
| A5 | 0:42-1:00 | New tab: `chrome-extension://odnpdglkmklhecdmggaebgakadfciooc/manifest.json` (use the ID of the build you record). Scroll to the `oauth2` block. Select `client_id` text so it is highlighted. Pause 4 seconds. | "Sign-in uses Chrome's identity API, so Google's window won't show a normal address bar. So here is the OAuth client ID, straight from the extension's manifest: 609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb. The scopes are listed right under it." | Required: client ID visible. Zoom browser to 150% (Cmd +) so the whole `client_id` string and both scopes are legible, then reset. |
| A6b (REQUIRED, right after A8) | about 0:30 | Second OAuth client (Web application, `609543680898-n8hac6to84t8kf4qimatt2inbesumusr`), required because Google says the video must include all OAuth clients in the project: sign out, click **"Use a different Google account"**, Continue in the sheet (its "Who is asking" row now shows the Web client ID `609543680898-n8hac...`). Google's popup shows the account picker: pause on the URL bar, which shows `client_id=` (bonus for verification). Pick an account, Allow, and show the tab closing and the card reading "Signed in with another Google account (session lasts about an hour)". | "IAM Lens also offers 'Use a different Google account'. Google shows its account picker, and the client ID is right here in the address bar. After I allow, Google sends me to a small page on our own domain, which hands the token to the extension and closes." | Cut A now shows both buttons on the Custom roles card at A6: the primary "Sign in with Google (Chrome account)" and the text button "Use a different Google account". |
| A6 | 1:00-1:15 | Back to the Settings tab. Show the "Custom roles" card and its text. Click **"Sign in with Google"**. The "Before you sign in" dialog opens: let it sit 5 seconds, then zoom on the **"Who is asking"** row and pause 4 seconds on the OAuth client ID printed there. Click **Continue**. If Chrome shows an "IAM Lens wants to..." permission prompt (identity), click Allow. | "In Settings, I click 'Sign in with Google'. IAM Lens first explains what it will do: it only reads role definitions, nothing leaves this browser, and I can revoke access any time. Then I continue." | The identity permission is optional and requested at sign-in, so the prompt may or may not appear. If it does, show it. |
| A7 | 1:15-1:55 | Google's consent window appears. Hold on it. 1) Pause on the **app name "IAM Lens"** and the signed-in account. 2) Zoom (Cmd +, or video zoom) on the scope lines: "Manage your IAM policies" and the read-only Cloud Platform line. 3) If the window shows a URL, pause on `client_id=`. 4) If Google shows "Google hasn't verified this app", say so, click Advanced, then Continue. Click **Allow**. | "This is Google's consent screen. The app name is IAM Lens. It asks for two scopes. 'Manage your IAM policies' is the IAM scope, and Google has no read-only version of it for listing roles. The second is read-only access to Cloud Platform data. IAM Lens only sends read requests: it lists project names and reads custom role definitions. It can't change any policy. I'll allow it." | Required: full consent flow and the app name. Shot A6 must linger on the "Who is asking" row of the "Before you sign in" sheet: the OAuth client ID is printed there, immediately before this window. Keep both scope lines readable for at least 5 seconds. If the unverified screen shows, say: "Google shows an unverified warning here because the review isn't finished." Do not claim approval. |
| A8 | 1:55-2:12 | Settings: badge "Signed in" appears. Show the summary line ("N custom roles from N projects and N organizations. Last synced just now."). Expand "Sources with custom roles (N)" and show `IAM-Chrome` / `projects/iam-chrome`. | "Now IAM Lens finds my projects on its own. That uses the Cloud Resource Manager API with the read-only scope: one request for projects, one for organizations, so there's nothing to pick or configure. Then it reads the custom roles of each project with the IAM API's roles list call." | Scope 1 use: CRM discovery of projects (`projects:search`, `organizations:search`, scope `cloud-platform.read-only`). Scope 2 use: `roles.list` (scope `iam`). |
| A9 | 2:12-2:38 | Side panel, Search page. Point at the row "Custom roles · 1 from 1 project · synced just now". Paste `resourcemanager.projects.getIamPolicy` again, Enter on "Open permission", click "Smallest overall". The custom role **IAM Lens Demo – Storage reader** appears with badge **Custom · IAM-Chrome (project)** and **Least privilege** (if it ranks first, as rehearsed). Click it to open: show its three permissions and ID `projects/iam-chrome/roles/iamLensDemo`. | "And here's the payoff. My own custom role, IAM Lens Demo Storage reader, now sits beside Google's roles, marked Custom from the IAM-Chrome project. It has only three permissions, so it's the smallest one that grants this permission, and IAM Lens marks it 'Least privilege'." | This shows the data from `roles.list` in use. Pause on the badge text. |
| A10 | 2:38-2:48 | Back on the Search page, click the refresh icon on the "Custom roles ·" row ("Refresh custom roles"). Show "Syncing…", then "synced just now". Optional: right-click the side panel, Inspect, Network tab, click the refresh icon again and show GET requests to `iam.googleapis.com` and `cloudresourcemanager.googleapis.com`. | "I can also refresh by hand. It runs the same read-only GET requests. It also re-syncs by itself once an hour while the panel is open." | The Network view is optional; skip it if time is tight. |
| A11 | 2:48-3:05 | Settings, click **Sign out & clear**. In the dialog "Sign out and clear custom roles?" click **Sign out & clear**. Toast "Signed out. Custom roles cleared." Show the card back to "Sign in with Google" and the sync row gone from Search. Open https://myaccount.google.com/permissions and show IAM Lens is no longer listed (refresh once). | "When I'm done I click 'Sign out and clear'. That revokes the token with Google and deletes the custom roles stored on this device. Google's account permissions page confirms IAM Lens is gone. IAM Lens has no server and no analytics, the data stays in my browser, and its use of Google data follows the Google API Services User Data Policy, including the Limited Use requirements." | Required: sign out and revoke. End on the account permissions page or the Settings card, hold 2 seconds. |

Captions: burn in or upload an English `.srt` (see YouTube section). The narration above is also the caption text.

### Requirement coverage check for Cut A

| Google requirement | Shot |
| --- | --- |
| Full OAuth consent flow | A6, A7 |
| App name on consent screen | A7 |
| OAuth client ID visible | A6 ("Before you sign in" sheet, "Who is asking" row, right before consent), A5 (manifest, backup) and A7 (if the window shows a URL) |
| All OAuth clients in the project shown | A6/A7 (Chrome Extension client `…4i6tksn4…`, Chrome-account sign-in) and A6b (Web application client `…n8hac6to…`, "Use a different Google account", whose account-picker URL shows `client_id=`) |
| Unverified app screen shown | A7 and A6b: if Google shows "Google hasn't verified this app", keep it on screen, click Advanced → Continue, and say so; Google requires it to appear in the video |
| Use of the CRM discovery scope (`cloud-platform.read-only`) | A8 |
| Use of the IAM `roles.list` scope (`iam`) showing custom roles | A8, A9 |
| Sign out and revoke | A11 |
| English narration or captions | all |

---

## Cut B: promo (about 55 seconds)

For the Chrome Web Store listing, YouTube and LinkedIn. Record in the Owner profile, **signed in**, custom role synced. Keep the theme and window size from Cut A. Add a short text overlay for each beat.

| # | Time | On screen (exact actions) | Narration / caption | Notes |
| --- | --- | --- | --- | --- |
| B1 Hook | 0:00-0:07 | Teammate profile, Console IAM page showing Google's error. Slow zoom on `resourcemanager.projects.getIamPolicy`. | "'You need permission: resourcemanager.projects.getIamPolicy.' Okay. But which role gives me that?" | Caption overlay: "Which role grants this?" |
| B2 Problem | 0:07-0:17 | Quick cuts: Cloud Console role picker with a long list; docs tab with a huge permissions table; scroll fast. Then cut to a still frame of the error. | "Google tells you the permission, not the role. So you scroll through the docs, guess, and grant Editor just to move on. That's how access gets bigger than it needs to be." | Keep the cuts fast, about 2 seconds each. No real company data. Keep the tone dry, not dramatic. |
| B3 Solution 1 | 0:17-0:26 | Open the side panel. Paste `resourcemanager.projects.getIamPolicy`, Enter on "Open permission". Show "Granted by N roles". | "IAM Lens is a Chrome side panel. I paste the permission." | Caption: "1. Paste the permission" |
| B4 Solution 2 | 0:26-0:36 | Click "Smallest overall". Smallest roles first; hover the "Least privilege" badge. Optionally scroll to `projectIamAdmin` (9). | "It lists every role that grants it, smallest first, and marks the least-privilege one." | Caption: "2. See the smallest role first" |
| B5 Solution 3 | 0:36-0:44 | The custom role "IAM Lens Demo – Storage reader" with badge "Custom · IAM-Chrome (project)" in the list. Click it to open and show 3 permissions. | "If I sign in with Google, my own custom roles show up in the same list." | Caption: "3. Your custom roles too (optional sign-in)". Say "optional". |
| B6 Privacy | 0:44-0:50 | Settings, Custom roles card with "Signed in" and "Sign out & clear" highlighted. | "Sign-in is optional and read-only. There's no server: everything stays in your browser, and you can sign out and clear it any time." | Caption: "Read-only. Stays in your browser." Do not say "verified". |
| B7 CTA | 0:50-0:57 | Black or brand end card: IAM Lens logo, "Get it on the Chrome Web Store", `iamlens.vaultline.cloud`. | "IAM Lens is free on the Chrome Web Store. Find it at iamlens dot vaultline dot cloud." | Confirm the store listing URL and that the item is live before publishing; replace "free" if pricing changes. |

Cut B output: 1920x1080 for YouTube and the store; also export a 1080x1080 or 1080x1350 crop (side panel centered) for LinkedIn. Add burned-in captions for LinkedIn since it autoplays muted. A 30 second music bed at low volume is optional; none is fine.

---

## Recording tips (macOS)

- **Screen recorder:** Cmd+Shift+5. Choose "Record Selected Portion" and drag a 1280x800 area around the Chrome window (or "Record Entire Screen" and crop later). In Options: Microphone = your mic, "Show Mouse Clicks" on, Save to a dedicated folder, no timer. Stop with the menu bar stop button or Cmd+Control+Esc.
- **Audio:** record narration live if the room is quiet; otherwise record voice-over after. QuickTime Player, File, New Audio Recording works, or record voice in the same pass and re-record only the bad lines.
- **Take in sections.** Record each shot as its own take; short clips are easy to retake and join. Aim to match shot lengths above.
- **Trim in QuickTime:** open the .mov, Edit, Trim (Cmd+T), drag the yellow handles, Trim. Split clips with Edit, Split Clip (Cmd+Y) and delete the parts you do not want.
- **Crop and join in iMovie:** create a project, import clips, drag to the timeline, select a clip, click Crop (Crop to Fill) to remove desktop edges. Use Zoom (Ken Burns) for the client ID and scope lines. Add title text for the Cut B captions. Export as 1080p, high quality, to File.
- **Zoom on the key frames:** the manifest `client_id`, the extension ID, and the consent scope lines must be readable at 1080p; use browser zoom or iMovie crop.
- **Captions:** upload the video to YouTube Studio, open Subtitles, Add language English, Add, then either Auto-sync (paste the narration text from this file and let Google time it) or Type manually. Review every line, fix the permission names and the client ID, and Publish. Also download the .srt for LinkedIn.
- **Check before uploading:** watch both cuts once at full screen. Confirm no personal tabs, no other account emails, no tokens or secrets on screen, and that the OAuth client ID is readable.

---

## YouTube upload settings

### Cut A: verification demo

- **Visibility:** Unlisted (not Private, not Public). Google's reviewers need the link.
- **Audience:** "No, it's not made for kids".
- **Language:** English. Subtitles: English (manual or reviewed).
- **Comments:** can be off.
- **Title:** `IAM Lens - Google OAuth consent and scope demo`
- **Description:**

```
Demo of the IAM Lens Chrome extension for Google's OAuth review.

IAM Lens is a Chrome extension that shows which Google Cloud IAM roles grant a permission, and which permissions a role has. Predefined roles work without signing in. Signing in with Google is optional and only adds the user's own custom roles.

What this video shows:
0:00 Why it exists: a missing-permission error and finding the smallest role
0:25 The extension, its single purpose, and the OAuth client ID in the manifest
1:00 Sign in with Google and the full consent screen (app name "IAM Lens")
1:55 How each scope is used: project discovery (cloud-platform.read-only) and custom roles via IAM roles.list (iam)
2:38 Manual refresh (read-only GET requests)
2:48 Sign out & clear, and access removed

Scopes requested:
https://www.googleapis.com/auth/iam
https://www.googleapis.com/auth/cloud-platform.read-only

IAM Lens only makes read (GET) requests. There is no server; tokens and role definitions stay in the browser and are deleted on sign-out. Use of Google user data follows the Google API Services User Data Policy, including the Limited Use requirements.

Homepage: https://iamlens.vaultline.cloud/
Privacy policy: https://iamlens.vaultline.cloud/privacy.html
Terms: https://iamlens.vaultline.cloud/terms.html
Contact: ysfmasad@gmail.com
```

(Adjust the timestamps to the final edit.)

- **Tags:** IAM Lens, Google Cloud IAM, OAuth demo, Chrome extension.
- **After upload:** open the link in a private window (logged out) to confirm it plays. Post the link on IAM-55 and in the verification form (IAM-57).

### Cut B: promo

- **Visibility:** Public if the extension is live on the Chrome Web Store; otherwise Unlisted and switch to Public at launch. The store listing video must be a YouTube link (Unlisted or Public both work).
- **Audience:** not made for kids. **Language:** English, with captions.
- **Title:** `IAM Lens: find the smallest Google Cloud IAM role for any permission`
- **Description:**

```
Google Cloud tells you which permission is missing, but not which role to grant. IAM Lens is a Chrome side panel that answers that: paste a permission, see every role that grants it, smallest first, with a "Least privilege" hint.

- Look up any permission or role, offline, with no sign-in
- Optional Google sign-in adds your own custom roles (read-only, stored only in your browser)
- No server, no analytics

Get it on the Chrome Web Store: <CHROME WEB STORE URL>
Website: https://iamlens.vaultline.cloud/
Privacy: https://iamlens.vaultline.cloud/privacy.html
```

- **LinkedIn post text (short):** "Ever hit a 'missing permission' error and had to guess which IAM role to grant? I built IAM Lens, a Chrome side panel that lists the roles granting a permission, smallest first. Optional sign-in adds your own custom roles; everything stays in your browser. 55 second demo below. <store link>"
- **Replace** `<CHROME WEB STORE URL>` once the listing is live.

---

## Open items for the recorder

- Confirm the build's real extension ID and use it in the manifest URL (A5) and narration.
- Rehearse the sort order and "Least privilege" badge placement before narrating A3, A9 and B4 (see prep step 9).
- If Google shows the unverified screen, keep it in the take and narrate it as in A7.
- Do not upload, publish or submit anything until the recorder has watched both cuts.
