/**
 * Privilege classification of IAM permissions.
 *
 * The class is derived from the permission's verb (the segment after the last `.`),
 * e.g. `storage.objects.get` -> `get`, `iam.serviceAccounts.actAs` -> `actAs`.
 * Rules are applied in this order:
 *   1. exact verb overrides (EXPLICIT)
 *   2. verbs ending in Read / ReadOnly are read (`dicomWebRead`, `executeSqlReadOnly`, `useReadOnly`)
 *   3. credential/token minting (`getAccessToken`, `generateIdToken`, `acquire...Token`) is admin
 *   4. `set...Iam...` is admin (IAM policy mutation)
 *   5. the verb is split into camelCase words; the "action" is the first word that is not a
 *      modifier (`batch`, `bulk`, `async`, `force`), or the last word when the first word is not a
 *      known action (`approverDelete` -> delete, `aiDevToolsSettingsGet` -> get)
 *   6. action lists: ADMIN_ACTIONS, READ_ACTIONS, WRITE_ACTIONS
 *   7. an `Admin` / `Root` word upgrades a non-read action to admin (`osAdminLogin`, `sshRoot`)
 *   8. unknown actions fall back to `write` (conservative: never claim something is read-only
 *      unless we know it is).
 *
 * `export*` is classed write on purpose: exports write data to a destination the caller picks.
 */

export type PrivilegeClass = 'read' | 'write' | 'admin';

/** Numeric encoding used by the class table (Uint8Array) so role profiles are cheap to compute. */
export const CLASS_READ = 0;
export const CLASS_WRITE = 1;
export const CLASS_ADMIN = 2;

export interface PrivilegeProfile {
  read: number;
  write: number;
  admin: number;
}

/** How a verb was classified; `default` means no rule matched (conservative write). */
export type ClassificationRule = 'explicit' | 'suffix' | 'token' | 'iam' | 'action' | 'default';

export interface VerbClassification {
  class: PrivilegeClass;
  rule: ClassificationRule;
}

/** Exact verb overrides. */
export const EXPLICIT: Readonly<Record<string, PrivilegeClass>> = {
  // admin: privilege escalation, impersonation, policy mutation, credentials
  setIamPolicy: 'admin',
  actAs: 'admin',
  actAsAdmin: 'admin',
  signBlob: 'admin',
  signJwt: 'admin',
  getAccessToken: 'admin',
  getOpenIdToken: 'admin',
  implicitDelegation: 'admin',
  retrieveCredentials: 'admin',
  exchangeCredentials: 'admin',
  exchangeAuthCredentials: 'admin',
  permitFederationAccess: 'admin',
  generateConsistencyToken: 'read',
  escalate: 'admin',
  allowAllActions: 'admin',
  allowProjectGrant: 'admin',
  manage: 'admin',
  undelete: 'admin',
  sshRoot: 'admin',
  // read
  getIamPolicy: 'read',
  testIamPermissions: 'read',
  access: 'read',
  sshRead: 'read',
  // write
  use: 'write',
  setSecurityPolicy: 'write',
  login: 'write',
};

/** Leading words that modify the real action (`batchGet`, `bulkDelete`). */
const MODIFIERS = new Set(['batch', 'bulk', 'async', 'force', 'legacy', 'streaming', 'maybe', 'direct']);

export const ADMIN_ACTIONS: ReadonlySet<string> = new Set([
  'delete',
  'destroy',
  'purge',
  'undelete',
  'wipe',
  'erase',
  'truncate',
  'drop',
  'clear',
  'revoke',
  'grant',
  'mint',
  'trash',
  'impersonate',
  'sign',
  'escalate',
  'manage',
]);

export const READ_ACTIONS: ReadonlySet<string> = new Set([
  'get',
  'list',
  'search',
  'query',
  'fetch',
  'read',
  'lookup',
  'view',
  'check',
  'test',
  'validate',
  'verify',
  'analyze',
  'calculate',
  'compute',
  'describe',
  'count',
  'find',
  'show',
  'preview',
  'simulate',
  'explain',
  'evaluate',
  'diagnose',
  'detect',
  'discover',
  'download',
  'resolve',
  'wait',
  'sample',
  'peek',
  'inspect',
  'aggregate',
  'estimate',
  'access',
  'capacity',
  'audit',
  'scan',
  'monitor',
  'poll',
  'stat',
  'stats',
  'status',
  'enumerate',
  'diff',
  'compare',
  'locate',
  'select',
  'suggest',
  'recommend',
  'summarize',
  'translate',
  'classify',
  'tail',
  'subscribe',
  'consume',
  'pull',
  'troubleshoot',
  'investigate',
  'recognize',
  'introspect',
  'explore',
  'assist',
  'lint',
  'ping',
  'seek',
  'watch',
  'retrieve',
  'receive',
  'navigate',
  'rank',
  'stream',
  'extract',
  'ack',
  'nack',
  'acknowledge',
]);

export const WRITE_ACTIONS: ReadonlySet<string> = new Set([
  'create',
  'update',
  'patch',
  'use',
  'run',
  'attach',
  'detach',
  'add',
  'remove',
  'set',
  'put',
  'write',
  'insert',
  'upload',
  'import',
  'export',
  'deploy',
  'undeploy',
  'start',
  'stop',
  'restart',
  'reset',
  'resume',
  'pause',
  'suspend',
  'enable',
  'disable',
  'activate',
  'deactivate',
  'cancel',
  'abort',
  'abandon',
  'approve',
  'reject',
  'publish',
  'send',
  'execute',
  'exec',
  'invoke',
  'call',
  'generate',
  'predict',
  'move',
  'copy',
  'clone',
  'rename',
  'restore',
  'rollback',
  'migrate',
  'upgrade',
  'downgrade',
  'install',
  'uninstall',
  'register',
  'deregister',
  'enroll',
  'unenroll',
  'connect',
  'disconnect',
  'bind',
  'unbind',
  'link',
  'unlink',
  'share',
  'apply',
  'commit',
  'submit',
  'configure',
  'provision',
  'deprovision',
  'resize',
  'scale',
  'tune',
  'train',
  'build',
  'login',
  'report',
  'ingest',
  'append',
  'replace',
  'initialize',
  'assign',
  'associate',
  'dissociate',
  'failover',
  'switchover',
  'promote',
  'demote',
  'refresh',
  'sync',
  'cleanup',
  'archive',
  'unarchive',
  'merge',
  'mark',
  'tag',
  'untag',
  'label',
  'schedule',
  'reschedule',
  'rotate',
  'encrypt',
  'decrypt',
  'reencrypt',
  'accept',
  'acquire',
  'authorize',
  'claim',
  'reserve',
  'release',
  'lock',
  'unlock',
  'open',
  'close',
  'begin',
  'end',
  'complete',
  'reply',
  'answer',
  'chat',
  'converse',
  'annotate',
  'dismiss',
  'mute',
  'unmute',
  'adapt',
  'edit',
  'modify',
  'change',
  'save',
  'store',
  'record',
  'lease',
  'invalidate',
  'unsuspend',
  'split',
  'adjust',
  'flush',
  'manipulate',
  'rejoin',
  'trigger',
  'initiate',
  'finalize',
  'evict',
  'override',
  'reconcile',
  'purchase',
  'review',
  'request',
  'mirror',
  'announce',
  'withdraw',
  'recover',
  'program',
  'appeal',
  'instantiate',
  'heartbeat',
  'allocate',
  'seed',
  'push',
  'load',
  'post',
  'distribute',
  'retract',
  'recrawl',
  'render',
  'extend',
  'regenerate',
  'reimage',
  'rollout',
  'propose',
  'relocate',
  'snapshot',
  'route',
  'init',
  'rerun',
  'group',
  'revert',
  'reverse',
  'switch',
  'lift',
  'replay',
  'remediate',
  'deidentify',
  'reopen',
  'redeem',
  'pin',
  'place',
  'ignore',
  'retry',
  'unassociate',
  'unassign',
  'unshare',
  'unset',
  'unresolve',
  'duplicate',
  'break',
  'delegate',
  'collect',
  'process',
  'mutate',
  'optimize',
  'inject',
  'rebrand',
  'reconfigure',
  'replicate',
  'orchestrate',
  'graduate',
  'transition',
  'perform',
]);

const TOKEN_WORD = /token/i;
const TOKEN_MINT_ACTIONS = new Set([
  'get',
  'acquire',
  'generate',
  'access',
  'mint',
  'exchange',
  'issue',
  'fetch',
]);

/** Splits a camelCase verb into lower-case words. `getIamPolicy` -> [get, iam, policy]. */
export function splitWords(verb: string): string[] {
  return verb
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** The verb of a permission: the segment after the last `.`. */
export function permissionVerb(perm: string): string {
  const i = perm.lastIndexOf('.');
  return i < 0 ? perm : perm.slice(i + 1);
}

/** The service of a permission: `storage` in `storage.objects.get`; the host for `host.tld/res.verb`. */
export function permissionService(perm: string): string {
  const slash = perm.indexOf('/');
  if (slash >= 0) return perm.slice(0, slash);
  const dot = perm.indexOf('.');
  return dot < 0 ? perm : perm.slice(0, dot);
}

function actionOf(words: string[]): string | undefined {
  const content = words.filter((w, i) => !(i < words.length - 1 && MODIFIERS.has(w)));
  const first = content[0];
  if (first === undefined) return undefined;
  const known = (w: string) => ADMIN_ACTIONS.has(w) || READ_ACTIONS.has(w) || WRITE_ACTIONS.has(w);
  if (known(first)) return first;
  const last = content[content.length - 1];
  if (known(last)) return last;
  return undefined;
}

/** Classifies a verb and reports which rule decided it. */
export function classifyVerbDetailed(verb: string): VerbClassification {
  const explicit = EXPLICIT[verb];
  if (explicit) return { class: explicit, rule: 'explicit' };
  if (/(Read|ReadOnly)$/.test(verb) && verb.length > 4) return { class: 'read', rule: 'suffix' };
  const words = splitWords(verb);
  if (words.length === 0) return { class: 'write', rule: 'default' };
  const action = actionOf(words);
  if (action && TOKEN_WORD.test(verb) && TOKEN_MINT_ACTIONS.has(action))
    return { class: 'admin', rule: 'token' };
  if (words[0] === 'set' && words.includes('iam')) return { class: 'admin', rule: 'iam' };
  if (action === undefined) {
    return { class: words.includes('admin') || words.includes('root') ? 'admin' : 'write', rule: 'default' };
  }
  let cls: PrivilegeClass = ADMIN_ACTIONS.has(action) ? 'admin' : READ_ACTIONS.has(action) ? 'read' : 'write';
  if (cls === 'write' && (words.includes('admin') || words.includes('root'))) cls = 'admin';
  return { class: cls, rule: 'action' };
}

/** Classifies a bare verb (`get`, `setIamPolicy`). */
export function classifyVerb(verb: string): PrivilegeClass {
  return classifyVerbDetailed(verb).class;
}

/** Classifies a full permission string by its verb. */
export function classifyPermission(perm: string): PrivilegeClass {
  return classifyVerb(permissionVerb(perm));
}

const CLASS_CODE: Record<PrivilegeClass, number> = {
  read: CLASS_READ,
  write: CLASS_WRITE,
  admin: CLASS_ADMIN,
};

/** One byte per permission (0 read, 1 write, 2 admin); verbs are memoised so this is fast for 14k entries. */
export function buildClassTable(permissions: readonly string[]): Uint8Array {
  const table = new Uint8Array(permissions.length);
  const memo = new Map<string, number>();
  for (let i = 0; i < permissions.length; i++) {
    const verb = permissionVerb(permissions[i]);
    let code = memo.get(verb);
    if (code === undefined) {
      code = CLASS_CODE[classifyVerb(verb)];
      memo.set(verb, code);
    }
    table[i] = code;
  }
  return table;
}

/** Read/write/admin counts for a role, given its permission indices and the class table. */
export function roleProfile(permIdxs: ArrayLike<number>, classTable: Uint8Array): PrivilegeProfile {
  const counts = [0, 0, 0];
  for (let i = 0; i < permIdxs.length; i++) counts[classTable[permIdxs[i]]]++;
  return { read: counts[0], write: counts[1], admin: counts[2] };
}
