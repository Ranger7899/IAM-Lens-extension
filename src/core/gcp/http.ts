/** Minimal authenticated fetch for Google REST APIs. Token-agnostic: callers supply `getToken`. */
import { z } from 'zod';

export interface GetTokenOptions {
  /** Discard any cached token and obtain a fresh one. */
  forceRefresh?: boolean;
}
export type GetToken = (opts?: GetTokenOptions) => Promise<string>;

export interface GcpFetchOptions {
  getToken: GetToken;
  signal?: AbortSignal;
  /** Injectable for tests; defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Max attempts for 429/5xx (default 3). */
  maxAttempts?: number;
  /** Base backoff in ms (default 500); doubles each retry. */
  backoffMs?: number;
}

export class GcpApiError extends Error {
  readonly status: number;
  /**
   * Google's machine-readable reason: `error.details[].reason` (e.g. `ACCESS_TOKEN_SCOPE_INSUFFICIENT`,
   * `IAM_PERMISSION_DENIED`, `SERVICE_DISABLED`, `USER_PROJECT_DENIED`), else `error.status`, else `HTTP_<n>`.
   */
  readonly reason: string;
  constructor(status: number, reason: string, message: string) {
    super(message);
    this.name = 'GcpApiError';
    this.status = status;
    this.reason = reason;
  }
}

const errorBodySchema = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    errors: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional(),
    details: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional(),
  }),
});

async function toApiError(res: Response): Promise<GcpApiError> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    /* ignore */
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  const parsed = errorBodySchema.safeParse(json);
  if (parsed.success) {
    const e = parsed.data.error;
    const reason =
      e.details?.find((d) => d.reason)?.reason ?? e.status ?? e.errors?.[0]?.reason ?? `HTTP_${res.status}`;
    return new GcpApiError(res.status, reason, e.message ?? `Request failed (${res.status})`);
  }
  return new GcpApiError(
    res.status,
    `HTTP_${res.status}`,
    text.slice(0, 200) || `Request failed (${res.status})`,
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** GET a Google API URL and return the parsed JSON body. Throws `GcpApiError` on non-2xx. */
export async function gcpFetch(url: string, opts: GcpFetchOptions): Promise<unknown> {
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const maxAttempts = opts.maxAttempts ?? 3;
  const base = opts.backoffMs ?? 500;
  let token = await opts.getToken();
  let refreshed = false;
  let attempt = 0;
  for (;;) {
    attempt++;
    const res = await doFetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: opts.signal,
    });
    if (res.ok) return res.json();
    if (res.status === 401 && !refreshed) {
      refreshed = true;
      token = await opts.getToken({ forceRefresh: true });
      attempt--; // the refresh retry does not consume a backoff attempt
      continue;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      await sleep(base * 2 ** (attempt - 1), opts.signal);
      continue;
    }
    throw await toApiError(res);
  }
}

/** Follows `nextPageToken` until exhausted. `buildUrl` receives the page token (or undefined). */
export async function gcpPaginate<T>(
  buildUrl: (pageToken: string | undefined) => string,
  opts: GcpFetchOptions,
  parsePage: (json: unknown) => { items: T[]; nextPageToken?: string },
): Promise<T[]> {
  const out: T[] = [];
  let token: string | undefined;
  do {
    const page = parsePage(await gcpFetch(buildUrl(token), opts));
    out.push(...page.items);
    token = page.nextPageToken || undefined;
  } while (token);
  return out;
}
