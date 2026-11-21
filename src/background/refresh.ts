/** Daily snapshot refresh: alarm scheduling, manual refresh message, and UI broadcast. */
import { browser } from 'wxt/browser';
import { checkForUpdate, patchMeta, type UpdateResult } from '../core/snapshot';

export const REFRESH_ALARM = 'snapshot-refresh';
export const REFRESH_PERIOD_MINUTES = 1440;
export const MAX_INITIAL_DELAY_MINUTES = 60;

/** Creates the daily alarm unless it already exists. Random 0-60 min initial delay. */
export async function ensureRefreshAlarm(random: () => number = Math.random): Promise<void> {
  const existing = await browser.alarms.get(REFRESH_ALARM);
  if (existing) return;
  browser.alarms.create(REFRESH_ALARM, {
    delayInMinutes: random() * MAX_INITIAL_DELAY_MINUTES,
    periodInMinutes: REFRESH_PERIOD_MINUTES,
  });
}

/** Tells any open UI that a new snapshot is installed; "no receiver" errors are ignored. */
export async function broadcastUpdated(version: string): Promise<void> {
  try {
    await browser.runtime.sendMessage({ type: 'snapshot-updated', version });
  } catch {
    // No open extension page is listening.
  }
}

/** Runs one update check, records `{lastCheck, lastResult}` in meta and broadcasts on update. */
export async function runRefresh(
  check: () => Promise<UpdateResult> = () => checkForUpdate(),
): Promise<UpdateResult> {
  let result: UpdateResult;
  try {
    result = await check();
  } catch (e) {
    result = { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
  console.info('[iam-lens] snapshot refresh:', result);
  try {
    await patchMeta({ lastCheck: new Date().toISOString(), lastResult: result });
  } catch (e) {
    console.warn('[iam-lens] could not store refresh result', e);
  }
  if (result.status === 'updated') await broadcastUpdated(result.version);
  return result;
}

/**
 * Registers the alarm/message listeners. Call synchronously from the top level of the service
 * worker; nothing here awaits before returning.
 */
export function registerRefresh(check?: () => Promise<UpdateResult>): void {
  const ensure = () => {
    void ensureRefreshAlarm().catch((e) => console.warn('[iam-lens] alarm setup failed', e));
  };
  browser.runtime.onInstalled.addListener(ensure);
  browser.runtime.onStartup.addListener(ensure);

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REFRESH_ALARM) void runRefresh(check);
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if ((message as { type?: string } | null)?.type !== 'refresh-now') return undefined;
    void runRefresh(check).then(sendResponse);
    return true; // keep the channel open for the async response
  });
}
