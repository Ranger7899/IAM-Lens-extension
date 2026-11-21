// @vitest-environment node
import 'fake-indexeddb/auto';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeStore, getMeta, type UpdateResult } from '../core/snapshot';
import { REFRESH_ALARM, broadcastUpdated, ensureRefreshAlarm, registerRefresh, runRefresh } from './refresh';

beforeEach(async () => {
  fakeBrowser.reset();
  await closeStore();
  indexedDB.deleteDatabase('iam-lens');
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('ensureRefreshAlarm', () => {
  it('creates a daily alarm with a 0-60 min random delay, once', async () => {
    await ensureRefreshAlarm(() => 0.5);
    const alarm = await fakeBrowser.alarms.get(REFRESH_ALARM);
    expect(alarm?.periodInMinutes).toBe(1440);
    await ensureRefreshAlarm(() => 0.9);
    expect(await fakeBrowser.alarms.getAll()).toHaveLength(1);
  });

  it('is triggered by onInstalled and onStartup', async () => {
    registerRefresh();
    fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' } as never);
    await vi.waitFor(async () => expect(await fakeBrowser.alarms.get(REFRESH_ALARM)).toBeTruthy());
    await fakeBrowser.alarms.clearAll();
    fakeBrowser.runtime.onStartup.trigger();
    await vi.waitFor(async () => expect(await fakeBrowser.alarms.get(REFRESH_ALARM)).toBeTruthy());
  });
});

describe('runRefresh', () => {
  it('stores lastCheck/lastResult and broadcasts on update', async () => {
    const spy = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(undefined as never);
    const res: UpdateResult = { status: 'updated', version: 'v2', previousVersion: 'v1' };
    expect(await runRefresh(async () => res)).toEqual(res);
    const meta = await getMeta();
    expect(meta.lastResult).toEqual(res);
    expect(typeof meta.lastCheck).toBe('string');
    expect(spy).toHaveBeenCalledWith({ type: 'snapshot-updated', version: 'v2' });
  });

  it('does not broadcast when nothing changed', async () => {
    const spy = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(undefined as never);
    await runRefresh(async () => ({ status: 'up-to-date', version: 'v1' }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('turns a thrown check into an error result', async () => {
    const res = await runRefresh(async () => {
      throw new Error('boom');
    });
    expect(res).toEqual({ status: 'error', message: 'boom' });
  });

  it('ignores "no receiver" errors when broadcasting', async () => {
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockRejectedValue(
      new Error('Could not establish connection. Receiving end does not exist.'),
    );
    await expect(broadcastUpdated('v2')).resolves.toBeUndefined();
  });
});

describe('message handler', () => {
  it('runs a check on refresh-now and responds with the result', async () => {
    const res: UpdateResult = { status: 'up-to-date', version: 'v1' };
    registerRefresh(async () => res);
    const sendResponse = vi.fn();
    const listeners = (
      fakeBrowser.runtime.onMessage as unknown as {
        hasListeners(): boolean;
      }
    ).hasListeners();
    expect(listeners).toBe(true);
    const out = fakeBrowser.runtime.onMessage.trigger({ type: 'refresh-now' }, {}, sendResponse);
    await out;
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith(res));
  });

  it('ignores other messages', async () => {
    const check = vi.fn();
    registerRefresh(check);
    const sendResponse = vi.fn();
    await fakeBrowser.runtime.onMessage.trigger({ type: 'other' }, {}, sendResponse);
    expect(check).not.toHaveBeenCalled();
  });

  it('runs a check when the alarm fires', async () => {
    const check = vi.fn(async () => ({ status: 'up-to-date', version: 'v1' }) as UpdateResult);
    registerRefresh(check);
    fakeBrowser.alarms.onAlarm.trigger({
      name: REFRESH_ALARM,
      scheduledTime: 0,
      persistAcrossSessions: true,
    });
    await vi.waitFor(() => expect(check).toHaveBeenCalled());
  });
});
