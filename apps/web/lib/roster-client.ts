'use client';

import { startTransition, useEffect, useState } from 'react';

export type RosterEnvelope<T> = {
  success: boolean;
  path?: string;
  rosterStatus: number;
  rosterContentType?: string;
  data: T;
  error?: string;
  rosterUnreachable?: boolean;
};

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    const message = typeof data === 'object' && data && 'error' in data ? data.error : undefined;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return data;
}

export async function rosterFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  return parseResponse<T>(res);
}

export async function rosterFetchEnvelope<T>(
  path: string,
  init?: RequestInit,
): Promise<RosterEnvelope<T>> {
  return rosterFetch<RosterEnvelope<T>>(path, init);
}

export function useRosterResource<T>(path: string, enabled: boolean = true): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = () => setTick((value) => value + 1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await rosterFetch<T>(path);
        if (cancelled) return;
        startTransition(() => {
          setData(next);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [path, tick, enabled]);

  return { data, loading, error, reload };
}

export function toJsonInput<T>(value: T) {
  return JSON.stringify(value, null, 2);
}
