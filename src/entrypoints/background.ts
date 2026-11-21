import { registerContextMenu, registerOmnibox } from '../background/omnibox';
import { registerRefresh } from '../background/refresh';

export default defineBackground(() => {
  registerRefresh();
  registerContextMenu();
  registerOmnibox();
});
