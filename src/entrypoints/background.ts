import { registerRefresh } from '../background/refresh';

const MENU_ID = 'iam-lens-lookup';

export default defineBackground(() => {
  registerRefresh();

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Look up “%s” in IAM Lens',
      contexts: ['selection'],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || tab?.windowId === undefined) return;
    // Context-menu clicks count as a user gesture, so open() must be called synchronously here.
    void chrome.sidePanel.open({ windowId: tab.windowId });
    // TODO(phase 5): hand info.selectionText to the side panel (storage.session).
  });

  chrome.omnibox.onInputEntered.addListener((text) => {
    // TODO(phase 0/5): confirm whether this counts as a gesture for sidePanel.open().
    // Stub: remember the query so the panel can pick it up.
    void chrome.storage.session.set({ pendingQuery: text });
  });
});
