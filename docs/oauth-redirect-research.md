# OAuth redirect and verification research (IAM-50)

Question: which sign-in flow should IAM Lens submit for Google OAuth verification, given the current flow uses a "Web application" client with the redirect `https://nkkmmkcohkjacpgiaiiadjmhcbmhgaen.chromiumapp.org/`?

Date of research: 2026-11-22. Marking: **[Confirmed]** = read on an official page or in the quoted thread. **[Unconfirmed]** = anecdotal, third-party, or not found. No official Google page was found that says anything explicit about `chromiumapp.org` and verification.

## Current implementation (from the repo)

- `src/core/gcp/auth.ts`: `identity.launchWebAuthFlow` with `response_type=token` (implicit flow), `redirect_uri = identity.getRedirectURL()`, `prompt=select_account` (interactive) or `prompt=none` (silent renew). Token goes in `storage.session`; `expiresAt` from `expires_in`; renewal = another `launchWebAuthFlow({interactive:false})`.
- `src/core/gcp/authConfig.ts`: Web application client ID, scopes `iam` + `cloud-platform.read-only`, `identity` is an optional permission.
- `docs/oauth-verification.md` already describes the client as "Chrome extension OAuth client", which does not match the code. This needs to be resolved by whichever option is picked.

## 1. What the sources say about verifying apps with `*.chromiumapp.org` redirects

1. Google's brand-verification doc: "The Authorized domains section also needs to include the redirect URIs or JavaScript origins" (for Web application clients), and the section "needs to contain the top private domains that are used in the URIs of the App domain section." Ownership: "Verify the ownership of your authorized domains using the Google Search Console." [Confirmed] https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification . The page does not mention Chrome extensions or `chromiumapp.org`.
2. Google Cloud help, verification requirements: "You must verify that you own all domains listed in your Authorized domains section of the OAuth consent screen editor." Homepage: "must be hosted on a verified domain you own" and "can not be only a login page." [Confirmed] https://support.google.com/cloud/answer/13464321
3. Chrome docs: `getRedirectURL` "generates URLs [that] match the pattern `https://<app-id>.chromiumapp.org/*`." [Confirmed] https://developer.chrome.com/docs/extensions/reference/api/identity . Nobody outside the extension owns that domain, so Search Console ownership cannot be shown. Verifying `chromiumapp.org` in Search Console by us is not possible [Unconfirmed, inferred; the Zoom post below states the same for DNS/HTML/meta methods].
4. Chromium Extensions forum, thread "OAuth consent screen - some doubs" (Sep-Oct 2023): a community member answered "Just use "chromiumapp.org"" and "When a domain is used on the consent screen or in an OAuth client's configuration, it must be pre-registered here." The poster then added chromiumapp.org as a second authorized domain and requested verification; the visible text does not show the outcome. A search-result snippet of the same thread says a later reply claims "you should be able to get approval with "chromiumapp.org" listed as a domain, but any other optional URLs need to be on your own domain". I could not see that reply in the fetched page. [Anecdotal, 2023, outcome not confirmed] https://groups.google.com/a/chromium.org/g/chromium-extensions/c/IdQo7aCf7DE
5. Mozilla bug 1635344 (the same problem for Firefox's `extensions.allizom.org`): "Google requires that you verify all websites that you redirect to." and "It is impossible to verify ownership of extensions.allizom.org through Google's developer console." Rob Wu: "there is no way to prove Firefox extension ownership to providers such as Google." Fixed in Firefox by allowing loopback redirects. Shows the principle (Google wants redirect domain ownership) but is about Firefox, and from 2020. [Confirmed as quoted; applicability to Chrome is inference] https://bugzilla.mozilla.org/show_bug.cgi?id=1635344
6. Zoom developer forum (June 2026): another vendor's app with a chromiumapp.org redirect asks Zoom for manual domain approval because "standard verification methods (DNS, HTML file, meta tag) can't be used." This is Zoom's validation, not Google's; the outcome is not shown. [Not Google; weak evidence only] https://devforum.zoom.us/t/domain-verification-for-chromiumapp-org-chrome-extension-oauth-redirect-manual-approval-request/144211
7. Stack Overflow: I did not find a thread on this exact question. [Not found]
8. Chromium forum "launchWebAuthFlow - inadequate documentation" and "Failed OAuth2 with Google, via launchWebAuthFlow" show the Web application client plus `chromiumapp.org` redirect is a working setup for sign-in itself (not verification). [Search-result summary only, not fully read] https://groups.google.com/a/chromium.org/g/chromium-extensions/c/9jADkbZcdYE , https://groups.google.com/a/chromium.org/g/chromium-extensions/c/WK-zBOZs8_U

Bottom line for section 1: Google's docs require authorized domains to cover the redirect URIs of Web application clients, and there is no documented exception for `chromiumapp.org`. Whether the verification team accepts `chromiumapp.org` is only supported by one unconfirmed 2023 forum anecdote. This is a real rejection risk with no documented path around it.

## 2. Do "Chrome Extension" clients go through the same verification?

- Sensitive/restricted scopes need verification regardless of client type; the verification is per project/consent screen, not per client. Google's sensitive-scope page: "Sensitive scopes require review by Google before any Google Account can grant access" (via search summary). [Partly confirmed] https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Brand requirements (homepage on a verified domain you own, privacy policy on the same domain, authorized domains verified in Search Console, demo video showing the end-to-end flow "including the OAuth grant process") apply to the consent screen and therefore to Chrome Extension clients too. [Confirmed for the requirements; that they are applied identically to Chrome Extension clients is inference] https://support.google.com/cloud/answer/13464321
- What changes: a Chrome Extension client has no redirect URI and no JavaScript origin, so the "authorized domains must include redirect URIs" rule has nothing to cover. Authorized domains then only need the domain that hosts the homepage/privacy/terms. The client is bound to the extension via the Item ID. Google: "Google Chrome apps and extensions are a special case of installed applications... choose Chrome as the platform... The Item ID is the last part of your Chrome Extension's Chrome Web Store URL." [Confirmed] https://support.google.com/cloud/answer/15549257 . Chrome's OAuth guide says only to "Select the Chrome Extension application type" and enter the extension ID. [Confirmed] https://developer.chrome.com/docs/extensions/how-to/integrate/oauth
- A forum poster states the docs say "you must have a registered item in the Chrome Web Store Developer Dashboard" to request OAuth verification, and asks whether Web Store review and OAuth verification can run in parallel; no useful answer is visible. [Unconfirmed; I did not find this wording on an official page] https://groups.google.com/a/chromium.org/g/chromium-extensions/c/BFisnJZMH3E
- Demo-video pitfall (already in `docs/oauth-verification.md`): the client ID must be visible in the consent screen URL. With `getAuthToken` the consent UI is a Chrome-owned dialog and the URL bar may not be visible [Unconfirmed]; plan to show the client ID another way (for example the manifest `oauth2.client_id` and the Network panel) and ask in the verification thread if a reviewer objects.
- Whether `https://www.googleapis.com/auth/iam` counts as sensitive or restricted: not confirmed here. Check the Data Access page in the Google Auth Platform console. [Unconfirmed]

## 3. Trade-offs: `launchWebAuthFlow` vs `getAuthToken`

| Aspect | `launchWebAuthFlow` (Web application client) | `getAuthToken` (Chrome Extension client) |
| --- | --- | --- |
| Verification blocker | Redirect domain `chromiumapp.org` cannot be proven owned; acceptance unconfirmed (section 1) | No redirect URI; no domain blocker beyond homepage/policy/terms domain |
| Account choice | Any Google account via `prompt=select_account`; independent of browser profile | Uses the account signed into the Chrome profile; Chrome docs: "Fetching a token may require the user to sign-in to Chrome, or approve the application's requested scopes." [Confirmed] https://developer.chrome.com/docs/extensions/reference/api/identity . Choosing another account needs extra handling [Unconfirmed] |
| Edge / Brave | Works in Chromium browsers that implement the API; Chromium forum: `launchWebAuthFlow` is the cross-browser route. Old Edge crash reports (2021-22) not confirmed as current [Unconfirmed] https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/edge-stable-crashing-on-extension-function-chrome-identity-launchwebauthflow/2904069 | Chrome only in practice. Forum, Sep 2025: in Brave `getAuthToken` returns "The user did not approve access."; a respondent says "the API only has support for Chromium browsers and there's none integration for non-chromium browsers"; Oliver Dunk (Google DevRel) suggests `launchWebAuthFlow()` for other browsers, "not quite as slick as picking up the user's already signed in profile." [Confirmed as quoted] https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eTG6eXZQA00 . Edge behaviour not found. |
| Token lifetime / silent renew | Implicit flow, `expires_in` (about 3600 s, typical; not stated on the fetched page). No refresh token; renewal = hidden `launchWebAuthFlow` with `prompt=none`, which depends on the browser's Google session. Google calls direct implicit flow "strongly discouraged" (for web apps) https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow | Chrome manages the token: "The Identity API caches access tokens in memory." and "The token cache automatically handles expiration."; non-interactive call "will return failure any time a prompt would be required." Invalid tokens go to `removeCachedAuthToken`. [Confirmed] https://developer.chrome.com/docs/extensions/reference/api/identity |
| Consent screen | Standard Google web page in a popup window with URL bar (client ID visible) | Chrome-native dialog; same scopes and app info shown |
| Setup | Web client, redirect URI, authorized domain | `oauth2` block in manifest (`client_id`, `scopes`), extension ID pinned via manifest `key` (already pinned per `docs/oauth-verification.md`) |

Code impact if switched (follow-up, not done here):

- `src/core/gcp/auth.ts`: `runFlow` replaced by `identity.getAuthToken({interactive, scopes})`; no `state`, `redirect_uri`, fragment parsing or `prompt`. `expiresAt` is not returned by `getAuthToken`, so `StoredAuth.expiresAt`/`TOKEN_MIN_TTL_MS` logic changes to "ask Chrome, and on 401 call `removeCachedAuthToken` then retry" (the `forceRefresh` path). Granted-scope check (`hasIamScope`) has no fragment `scope` to read, so scope upgrade detection needs rework (pass both scopes; `getAuthToken` re-prompts if the cached token lacks them [Unconfirmed]). `signOut` should call `removeCachedAuthToken` then the revoke endpoint.
- `src/core/gcp/authConfig.ts`: new client ID (Chrome Extension type), remove auth URL; add `oauth2` to the manifest (WXT config).
- Permissions: `identity` is currently an optional permission requested at click time. Whether `getAuthToken` works with `identity` as optional and the manifest `oauth2` key present is not confirmed; test. [Unconfirmed]
- Behaviour: Edge/Brave users lose custom-role sign-in unless a fallback to `launchWebAuthFlow` is kept (which would reintroduce a Web client, and possibly the redirect-domain question, on the same consent screen [Unconfirmed]).

## 4. Recommendation

Submit for verification with a **Chrome Extension OAuth client and `chrome.identity.getAuthToken`**, and treat Chrome as the supported browser for custom-role sign-in (predefined roles need no sign-in anywhere).

Reasons: it removes the one requirement we cannot satisfy (ownership of the redirect domain), the Chrome docs present it as the standard extension path, and the extension ships on the Chrome Web Store. The cost is dropping Edge/Brave sign-in and following the Chrome profile account. If supporting Edge/Brave sign-in matters more than a low-risk verification, the alternative is to keep `launchWebAuthFlow`, list `chromiumapp.org` as an authorized domain and accept an unconfirmed outcome; do not submit that unless the owner is willing to risk a rejection round (verification takes about 10 days for sensitive scopes per Google; forum reports 1-4 weeks).

Do not submit a Web client whose redirect is `chromiumapp.org` together with a Chrome Extension client unless required: the Web client's redirect URI may still trigger the domain requirement. [Unconfirmed]

### Exact settings

OAuth client (Google Auth Platform > Clients):

- Application type: Chrome Extension
- Name: IAM Lens (Chrome extension)
- Item ID: `nkkmmkcohkjacpgiaiiadjmhcbmhgaen` (the pinned extension ID; must equal the ID of the Web Store item or the manifest `key`)
- No redirect URIs, no JavaScript origins.
- Manifest: `"oauth2": { "client_id": "<new client>.apps.googleusercontent.com", "scopes": ["https://www.googleapis.com/auth/iam", "https://www.googleapis.com/auth/cloud-platform.read-only"] }`, `"key"` kept, permission `identity`.

Consent screen (Branding and Data Access), as in `docs/oauth-verification.md`:

- App name: IAM Lens. User support email and developer contact: the owner's email.
- Application home page, privacy policy, terms of service: all on one domain the owner controls and has verified in Search Console (not `chromiumapp.org`, not a Web Store or github.com-only page; github.io is a subdomain of `github.io`, a public-suffix domain, so a custom domain is safer [Unconfirmed]).
- Authorized domains: only that domain. Do **not** add `chromiumapp.org`.
- Scopes: `iam` and `cloud-platform.read-only` only.
- Publishing status: In production, then submit for verification with the scope justification and demo video from `docs/oauth-verification.md`.

## Follow-ups

- Code ticket: switch `src/core/gcp/auth.ts` / `authConfig.ts` / manifest to `getAuthToken`, test with optional `identity` permission, Edge and Brave behaviour (hide or fall back).
- Fix `docs/oauth-verification.md` wording to match whichever client type is chosen; update the demo-video step about the visible `client_id=`.
- Owner check: whether `iam` is a sensitive or restricted scope in the console's Data Access page.
