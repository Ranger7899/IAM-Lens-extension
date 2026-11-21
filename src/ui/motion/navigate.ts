import { flushSync } from 'react-dom';

export type NavDirection = 'forward' | 'back';

/**
 * Runs `update` (a React state change) inside a View Transition so elements with class `route-view`
 * play the shared-axis X animation (see theme/motion.css). Falls back to a plain update where the API
 * is missing. Reduced-motion handling lives in CSS (opacity only).
 */
export function navigateWithTransition(update: () => void, direction: NavDirection = 'forward') {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.nav = direction;
  doc.startViewTransition(() => flushSync(update));
}
