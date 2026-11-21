import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
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
