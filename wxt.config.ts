import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'wxt';

/**
 * Emits `data/roles.snapshot.json` as a separate content-hashed asset (`assets/roles.snapshot-<hash>.json`)
 * in every build and makes `import url from '...roles.snapshot.json?url'` resolve to that extension path.
 * Needed because the background bundle is built in Vite lib mode, which inlines every asset: without
 * this the 2 MB snapshot ends up base64-encoded inside background.js.
 */
function snapshotAsset() {
  const SUFFIX = 'roles.snapshot.json?url';
  return {
    name: 'iam-lens:snapshot-asset',
    enforce: 'pre' as const,
    resolveId(this: unknown, id: string, importer?: string) {
      if (!id.endsWith(SUFFIX) || !importer) return null;
      return {
        id: new URL(id, `file://${importer.split('?')[0]}`).pathname + '?iam-snapshot-url',
        external: false,
      };
    },
    load(this: { emitFile: (f: { type: 'asset'; fileName: string; source: Buffer }) => string }, id: string) {
      if (!id.endsWith('?iam-snapshot-url')) return null;
      const source = readFileSync(id.slice(0, -'?iam-snapshot-url'.length));
      const hash = createHash('sha256').update(source).digest('hex').slice(0, 8);
      const fileName = `assets/roles.snapshot-${hash}.json`;
      this.emitFile({ type: 'asset', fileName, source });
      return `export default ${JSON.stringify(`/${fileName}`)};`;
    },
  };
}

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [snapshotAsset()] }),
  manifest: {
    name: 'IAM Lens — role & permission lookup for Google Cloud',
    description:
      'Instantly find which Google Cloud IAM roles grant a permission, and which permissions a role has.',
    // TODO(Phase 0): add `key: '<public key>'` here to pin the extension ID. Do not generate keys in this repo.
    permissions: ['sidePanel', 'storage', 'unlimitedStorage', 'alarms', 'contextMenus'],
    optional_permissions: ['identity'],
    optional_host_permissions: ['https://*.googleapis.com/'],
    omnibox: { keyword: 'iam' },
    action: { default_title: 'IAM Lens' },
  },
});
