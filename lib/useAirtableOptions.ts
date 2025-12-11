'use client';

import { useEffect, useState } from 'react';
import { useRef } from 'react';

interface FetchResult<T> {
  data?: T[];
  error?: string;
}

type Mapper<T> = (payload: unknown) => T[];

export function useAirtableOptions<T>({
  path,
  mapper,
  intervalMs = 15000
}: {
  path: string;
  mapper: Mapper<T>;
  intervalMs?: number;
}) {
  const mapperRef = useRef(mapper);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    mapperRef.current = mapper;
  }, [mapper]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), intervalMs - 1000);
      try {
        const res = await fetch(path, { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to fetch ${path}`);
        }
        const json = (await res.json()) as FetchResult<unknown>;
        if (cancelled) return;
        const mapped = mapperRef.current(json);
        if (Array.isArray(mapped) && mapped.length > 0) {
          setItems(mapped);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, path, version]);

  const reload = () => setVersion((prev) => prev + 1);

  return { items, loading, error, reload };
}
