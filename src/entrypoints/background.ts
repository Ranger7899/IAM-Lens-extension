import { registerContextMenu, registerOmnibox } from '../background/omnibox';
import { registerOAuthCallback } from '../background/oauthCallback';
import { registerRefresh } from '../background/refresh';

export default defineBackground(() => {
  registerRefresh();
  registerContextMenu();
  registerOmnibox();
  registerOAuthCallback();
});
