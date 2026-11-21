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
  // Per-worker build dirs (IAM_OUT_DIR=.output-IAM-9) let parallel builds coexist.
  outDir: process.env.IAM_OUT_DIR ?? '.output',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [snapshotAsset()] }),
  manifest: {
    name: 'IAM Lens — role & permission lookup for Google Cloud',
    description:
      'Instantly find which Google Cloud IAM roles grant a permission, and which permissions a role has.',
    // Public key pins the extension ID to nkkmmkcohkjacpgiaiiadjmhcbmhgaen (IAM-6). The private key is kept
    // outside the repo (~/.iam-lens-keys/key.pem); never commit it.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3I3du8O5yuUB5ogLIEEkD/2I6+J+VfR2GrkzG2P1hffdRXzvFlqmrJMAFRpVnq4+DoVEBA4yzFW8sIunItiUgPNNAVXnZtXI9S6MFsi9Gxuza/5UvSosaB7gQ98rj4+zt42PDBBC5YyY4z33HSzlW9311lek5V5SYda4YbqAE+8Ne/xbojW2x816SjsEUD69x4hDwOHx3Tdl5oQW0ewoPwPQaoj1MreMe1IR3RvMiU5EdkyezXnMeY1L2Ku5lpRSYyctsR9TG36Kokk11HZBusO6IUm4H1x8Rfv0GOWX2JcVnFT3H4ynkCxrbnJ3f+imx3C1Vz9rkbqtJfwKQSdB3wIDAQAB',
    permissions: ['sidePanel', 'storage', 'unlimitedStorage', 'alarms', 'contextMenus'],
    optional_permissions: ['identity'],
    optional_host_permissions: ['https://*.googleapis.com/'],
    omnibox: { keyword: 'iam' },
    action: { default_title: 'IAM Lens' },
  },
});
