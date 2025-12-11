import { useEffect, useState } from 'react';
import type { OptionWithCode } from './types';

interface TargetAudienceResponse {
  audiences?: OptionWithCode[];
}

export function useTargetAudiences() {
  const [audiences, setAudiences] = useState<OptionWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const intervalMs = 15000;

    const fetchAudiences = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), intervalMs - 1000);
      try {
        const res = await fetch('/api/target-audience', { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to fetch target audiences');
        }
        const data = (await res.json()) as TargetAudienceResponse;
        if (cancelled) return;
        if (Array.isArray(data.audiences) && data.audiences.length > 0) {
          const sanitized = data.audiences
            .filter((item): item is OptionWithCode => Boolean(item?.label && item?.code))
            .map((item) => ({ label: item.label.trim(), code: item.code.trim() }));
          setAudiences(sanitized);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    };

    fetchAudiences();
    const intervalId = setInterval(fetchAudiences, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [version]);

  const reload = () => setVersion((prev) => prev + 1);

  return { audiences, loading, error, reload };
}
