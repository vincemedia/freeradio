"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * A very small data hook.
 *
 * Not a cache and not a library: it fetches a path, tracks loading and error,
 * and can be told to refetch. Everything still goes through `apiFetch`, so the
 * day this is swapped for SWR or React Query the network layer does not move.
 *
 * `key` may be null to skip the request, which is how a component waits for
 * something it depends on.
 */
export default function useFetch<T>(key: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(key !== null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (key === null) {
      setLoading(false);
      return;
    }
    const ticket = ++latest.current;
    setLoading(true);
    try {
      const result = await apiFetch<T>(key);
      /* Ignore a response that arrived after a newer request went out, or the
         list flickers back to the previous band. */
      if (ticket === latest.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (ticket === latest.current) setError(e as Error);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
