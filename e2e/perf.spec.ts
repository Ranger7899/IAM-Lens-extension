import { test, expect } from './fixtures';
import type { BrowserContext } from '@playwright/test';

// Budgets from the plan; each is enforced with 2x slack for CI/headless noise.
const TTI_BUDGET_MS = 150;
const KEYSTROKE_BUDGET_MS = 16;
const SLACK = 2;

// The provider does not set data-ready="true" yet (follow-up), so readiness falls back to the
// search box becoming visible, which is when the loading skeleton is gone.
async function readyMs(context: BrowserContext, extensionId: string): Promise<number> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'commit' });
  const ms = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const check = () => {
          const ready =
            document.querySelector('[data-ready="true"]') ??
            document.querySelector('[role="searchbox"], input[type="search"]');
          if (ready)
            resolve(performance.now()); // ms since navigation start
          else requestAnimationFrame(check);
        };
        check();
      }),
  );
  await page.close();
  return ms;
}

test('side panel is interactive within budget (cold and warm)', async ({ context, extensionId }) => {
  const cold = await readyMs(context, extensionId);
  const warmRuns: number[] = [];
  for (let i = 0; i < 3; i++) warmRuns.push(await readyMs(context, extensionId));
  const warm = Math.min(...warmRuns);
  console.log(
    `[perf] panel ready cold=${cold.toFixed(0)}ms warm=${warm.toFixed(0)}ms (runs ${warmRuns.map((n) => n.toFixed(0)).join('/')}) budget=${TTI_BUDGET_MS}ms (x${SLACK} slack)`,
  );
  expect(cold).toBeLessThan(TTI_BUDGET_MS * SLACK);
  expect(warm).toBeLessThan(TTI_BUDGET_MS * SLACK);
});

test('search keystrokes render within budget', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const box = page.getByRole('searchbox');
  await expect(box).toBeVisible();
  await box.focus();

  // input event -> next paint (rAF, then a task after it), recorded with performance.mark/measure.
  await page.evaluate(() => {
    (window as unknown as { __perf: number[] }).__perf = [];
    document.addEventListener(
      'input',
      () => {
        performance.mark('key-start');
        requestAnimationFrame(() =>
          setTimeout(() => {
            performance.mark('key-end');
            const m = performance.measure('key', 'key-start', 'key-end');
            (window as unknown as { __perf: number[] }).__perf.push(m.duration);
          }, 0),
        );
      },
      true,
    );
  });

  const text = 'storage.buckets.get';
  for (let i = 0; i < 20; i++) {
    await page.keyboard.type(text[i % text.length]!);
    await page.waitForTimeout(60); // let the previous measurement settle
  }
  const samples = await page.evaluate(() => (window as unknown as { __perf: number[] }).__perf);
  expect(samples.length).toBe(20);
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]!;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]!;
  console.log(
    `[perf] keystroke p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${sorted.at(-1)!.toFixed(1)}ms budget=${KEYSTROKE_BUDGET_MS}ms (x${SLACK} slack)`,
  );
  expect(p95).toBeLessThan(KEYSTROKE_BUDGET_MS * SLACK);
});
