# Spikes

## Omnibox `onInputEntered` as a user gesture for `sidePanel.open()` (IAM-17)

Question: does pressing Enter on `iam <query>` count as a user gesture for `chrome.sidePanel.open()`?

Implementation (`src/background/omnibox.ts`): `onInputEntered` computes the route (`routeForQuery`), writes
`pendingRoute` to `storage.session`, then calls `sidePanel.open({tabId})` for the active tab. If `open()` rejects
(no gesture), it opens `sidepanel.html#/<route>` in a new tab instead (`openRoute` returns `'panel'` or `'tab'`).
The context menu uses the same `openRoute`; context-menu clicks are a documented gesture.

What was verified automatically (Playwright, real extension, Chromium):

- Calling `sidePanel.open()` from the service worker without a gesture rejects with
  "`sidePanel.open()` may only be called in response to a user gesture". This is the condition the fallback handles.
- `sidepanel.html#role/roles/viewer` renders role detail as a full tab (`e2e/omnibox-IAM-17.spec.ts`), so the fallback
  lands on the right screen.
- Routing decisions, the fallback, suggestion limits and index caching: `src/background/omnibox.test.ts`.

What cannot be automated: the omnibox UI lives in browser chrome, which Playwright cannot type into, so the real
"Enter in the address bar" gesture cannot be produced. Synthetic gestures from page context do not carry over to
the service worker.

Result in Chrome stable: NOT YET RECORDED. Manual check needed: load the unpacked build, type `iam roles/viewer`,
press Enter, and note whether the side panel opened (path `panel`) or a new tab opened (path `tab`; the service
worker console does not log which, so judge by the result). Record the Chrome version and outcome here.
Either outcome is handled; only this note is pending.

Notes:

- `sidePanel.open` is called after one async `tabs.query` (active tab). If a manual run shows this loses the gesture,
  the fallback tab still works; a follow-up could pass `windowId` from a cached value instead.
- Suggestions come from a lazily built `IamIndex` cached in a module variable (`getIndex`); a restarted service
  worker rebuilds it from IndexedDB (or the bundled snapshot) on the first `onInputChanged`.
