const DEFAULT_TIMEOUT_MS = 15_000;

export function getRosterBaseUrl(): string | null {
  const raw = process.env.ROSTER_HTTP_URL ?? process.env.NEXT_PUBLIC_ROSTER_HTTP_URL;
  if (!raw?.trim()) return null;
  return raw.replace(/\/$/, '');
}

export function isRosterBffAuthRequired(): boolean {
  const v = process.env.ROSTER_BFF_REQUIRE_AUTH?.toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export type ForwardRosterResult = {
  status: number;
  contentType: string;
  body: unknown;
  headers: Headers;
};

type ForwardRosterRequestOptions = {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  timeoutMs?: number;
};

function normalizeBody(body: unknown, headers: Headers) {
  if (body === undefined || body === null) return undefined;
  if (body instanceof Uint8Array) {
    return new Uint8Array(body).buffer;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return JSON.stringify(body);
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  if (!text) return null;
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text, parseError: true };
    }
  }

  return text;
}

export async function forwardRosterRequest({
  baseUrl,
  path,
  method = 'GET',
  headers = {},
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: ForwardRosterRequestOptions): Promise<ForwardRosterResult> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const normalizedHeaders = new Headers(headers);

  try {
    const res = await fetch(url, {
      method,
      headers: normalizedHeaders,
      body: normalizeBody(body, normalizedHeaders),
      signal: ac.signal,
      cache: 'no-store',
    });

    return {
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      body: await parseBody(res),
      headers: res.headers,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function forwardRosterGet(
  baseUrl: string,
  path: string,
  headers: HeadersInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ForwardRosterResult> {
  return forwardRosterRequest({
    baseUrl,
    path,
    headers,
    timeoutMs,
    method: 'GET',
  });
}
