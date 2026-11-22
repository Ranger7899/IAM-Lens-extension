// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { browser } from 'wxt/browser';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import type { CustomRoleInput, MetaRecord } from '@/core';
import { AuthRequiredError, GcpApiError } from '@/core/gcp';
import { IamProvider } from '@/ui/data';
import { App } from './App';
import type { OptionsDeps } from './deps';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  // jsdom has no <dialog> modal support.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

function makeDeps(over: Partial<OptionsDeps> = {}, signedIn = false) {
  let signed = signedIn;
  let meta: MetaRecord = {};
  let roles: CustomRoleInput[] = [];
  const deps: OptionsDeps = {
    version: '9.9.9',
    isSignedIn: async () => signed,
    signIn: vi.fn(async () => void (signed = true)),
    signOut: vi.fn(async () => {
      signed = false;
      roles = [];
    }),
    listProjects: async () => [{ id: 'alpha', displayName: 'Alpha', name: 'projects/1' }],
    listOrganizations: async () => [],
    fetchRoles: async (parent) => [
      { name: `${parent}/roles/x`, perms: ['a.b.get'], source: { kind: 'custom', parent } },
    ],
    storedRoles: async () => roles,
    saveRoles: async (r) => void (roles = [...roles, ...r]),
    deleteRolesByParent: async (p) => void (roles = roles.filter((r) => r.source.parent !== p)),
    getMeta: async () => meta,
    patchMeta: async (p) => (meta = { ...meta, ...p }),
    refreshNow: vi.fn(async () => ({ status: 'up-to-date' as const, version: '1' })),
    openInPanel: vi.fn(),
    ...over,
  };
  return deps;
}

async function mountApp(deps: OptionsDeps) {
  const snapshot = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.things.get'] }]);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <IamProvider loader={async () => ({ snapshot, source: 'bundled' as const })}>
        <App deps={deps} />
      </IamProvider>,
    ),
  );
  await settle();
}

const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 20))));
const button = (name: RegExp | string) =>
  [...document.querySelectorAll('button')].find((b) =>
    typeof name === 'string'
      ? b.textContent?.trim() === name
      : name.test(`${b.textContent} ${b.getAttribute('aria-label') ?? ''}`),
  ) as HTMLButtonElement;
const click = async (el: HTMLElement) => {
  await act(async () => el.click());
  await settle();
};
const dialogOf = (title: string) =>
  [...document.querySelectorAll('dialog')].find((d) => d.querySelector('h2')?.textContent === title)!;

describe('options page', () => {
  it('shows the data card and sends refresh-now through "Check for updates"', async () => {
    const deps = makeDeps();
    await mountApp(deps);
    expect(host!.textContent).toContain('Predefined roles ship inside the extension');
    expect(host!.textContent).toContain('No check has run yet');
    await click(button('Check for updates'));
    expect(deps.refreshNow).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('Up to date');
  });

  it('opens the trust sheet first and only signs in from its Continue button', async () => {
    const deps = makeDeps();
    await mountApp(deps);
    await click(button(/Sign in with Google/));
    const sheet = dialogOf('Before you sign in');
    expect(sheet.hasAttribute('open')).toBe(true);
    expect(sheet.textContent).toContain('Read-only');
    expect(sheet.textContent).toContain('View the source');
    expect(deps.signIn).not.toHaveBeenCalled();
    await click(sheet.querySelector('button:last-of-type') as HTMLElement);
    expect(deps.signIn).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('Signed in');
  });

  it('syncs every accessible project and organization after sign-in and shows the summary', async () => {
    const deps = makeDeps({
      listOrganizations: async () => [{ id: '9', displayName: 'Acme', name: 'organizations/9' }],
    });
    await mountApp(deps);
    await click(button(/Sign in with Google/));
    await click(dialogOf('Before you sign in').querySelector('button:last-of-type') as HTMLElement);
    expect(deps.signIn).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('2 custom roles');
    expect(host!.textContent).toContain('from 1 project and 1 organization');
    expect(host!.textContent).toContain('Last synced just now');
    expect((await deps.getMeta()).customSources).toHaveLength(2);
    expect(document.querySelector('[aria-label^="Add "]')).toBeNull();
    expect(button('Add projects or organizations')).toBeUndefined();
  });

  it('counts a 403 source as "no access" without showing an error', async () => {
    const deps = makeDeps(
      {
        listProjects: async () => [
          { id: 'alpha', displayName: 'Alpha', name: 'projects/1' },
          { id: 'beta', displayName: 'Beta', name: 'projects/2' },
        ],
        fetchRoles: vi.fn(async (parent: string) => {
          if (parent === 'projects/beta') throw new GcpApiError(403, 'IAM_PERMISSION_DENIED', 'denied');
          return [
            { name: `${parent}/roles/x`, perms: ['a.b.get'], source: { kind: 'custom' as const, parent } },
          ];
        }),
      },
      true,
    );
    await mountApp(deps);
    await click(button('Sync now'));
    expect(host!.textContent).toContain('1 custom role');
    expect(host!.textContent).toContain('1 source had no access');
    expect(host!.textContent).not.toContain("can't list custom roles");
    expect(host!.textContent).toContain('Sources with custom roles (1)');
  });

  it('offers "Sign in again" when the session ended during a sync', async () => {
    const deps = makeDeps({ listProjects: vi.fn(async () => Promise.reject(new AuthRequiredError())) }, true);
    await mountApp(deps);
    await click(button('Sync now'));
    expect(host!.textContent).toContain('Your Google session ended');
    expect(button('Sign in again')).toBeDefined();
  });

  it('shows Google text for other failures of the whole sync', async () => {
    const deps = makeDeps(
      {
        listProjects: vi.fn(async () =>
          Promise.reject(new GcpApiError(400, 'INVALID_ARGUMENT', 'Bad request.')),
        ),
      },
      true,
    );
    await mountApp(deps);
    await click(button('Sync now'));
    expect(host!.textContent).toContain('Bad request.');
  });

  it('asks to sign in again when the stored token lacks the new scope', async () => {
    const deps = makeDeps({ needsScopeUpgrade: vi.fn(async () => true) }, true);
    await mountApp(deps);
    expect(host!.textContent).toContain('Sign in again to grant it');
  });

  it('explains the Google consent wording in the trust sheet', async () => {
    await mountApp(makeDeps());
    await click(button(/Sign in with Google/));
    const sheet = dialogOf('Before you sign in');
    expect(sheet.textContent).toContain('Manage your IAM policies');
    expect(
      [...sheet.querySelectorAll('a')].some((a) => a.getAttribute('href')?.endsWith('/src/core/gcp/iam.ts')),
    ).toBe(true);
  });

  it('confirms sign out in a dialog before clearing', async () => {
    const deps = makeDeps({}, true);
    await mountApp(deps);
    await click(button('Sign out & clear'));
    const dlg = dialogOf('Sign out and clear custom roles?');
    expect(dlg.hasAttribute('open')).toBe(true);
    expect(deps.signOut).not.toHaveBeenCalled();
    await click(button('Cancel'));
    expect(deps.signOut).not.toHaveBeenCalled();
    await click(button('Sign out & clear'));
    await click([...dlg.querySelectorAll('button')].find((b) => b.textContent === 'Sign out & clear')!);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('Sign in with Google');
  });

  it('writes the theme override to storage and applies data-theme', async () => {
    await mountApp(makeDeps());
    await click(document.querySelector('[role=radio][data-id=dark]') as HTMLElement);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect((await browser.storage.local.get('themePreference')).themePreference).toBe('dark');
    await click(document.querySelector('[role=radio][data-id=system]') as HTMLElement);
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
