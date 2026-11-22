import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'wxt';
import { OAUTH_CLIENT_ID, OAUTH_SCOPES } from './src/core/gcp/authConfig';

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
    // Chrome Web Store public key: pins the extension ID to odnpdglkmklhecdmggaebgakadfciooc, the store item (IAM-53),
    // so unpacked builds share the store ID and its OAuth client. The store holds the private key.
    // `npm run zip:store` sets IAM_STORE_BUILD=1 to omit the key: the Web Store rejects a
    // manifest `key` on a brand-new item (see docs/release-checklist.md). Everything else is identical.
    ...(process.env.IAM_STORE_BUILD
      ? {}
      : {
          key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArLEVUa91FRXs+7GrbaDMfNLVNnNrjPl6YQeUf3OEzQ/7W7n6L0J1Utt4v+LomHTWXmMkmYCurlPEU0WcsvbhhDMsLdiC/q8RQKsOXBi1BonqYGIe4m62X2xVsJ03lp8vLaIzAO1ziNDtDlYlbpMMiTVYycgma5UTMyJlUm92GPAT2PFmk3UtVmjrnsaCN4T9zaHF/UcKQ/N4Jb01MHF58cZAdJUsaerNOVAlPPEVFL96YcEp4idOCdy7QCZR3zkHKWdoMtsmFz9Wg7cSToyl7//f4wFWG7q/5cMKrOgmQP0PvtTZ47xR8MXQoTB5gLYoMbifrxJUXCZAdwK1XMyx0wIDAQAB',
        }),
    permissions: ['sidePanel', 'storage', 'unlimitedStorage', 'alarms', 'contextMenus'],
    // Read by chrome.identity.getAuthToken. `identity` itself stays optional and is requested at sign-in.
    oauth2: { client_id: OAUTH_CLIENT_ID, scopes: OAUTH_SCOPES },
    optional_permissions: ['identity'],
    optional_host_permissions: ['https://*.googleapis.com/'],
    // The own-domain OAuth callback page (IAM-79) hands the token to the extension. Nothing broader than /auth/*.
    externally_connectable: { matches: ['https://iamlens.vaultline.cloud/auth/*'] },
    omnibox: { keyword: 'iam' },
    action: { default_title: 'IAM Lens' },
  },
});
