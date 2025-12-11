import { useEffect, useState } from 'react';
import type { OptionWithCode } from './types';

interface LeadGenResponse {
  forms?: OptionWithCode[];
}

export function useLeadGenForms() {
  const [forms, setForms] = useState<OptionWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const intervalMs = 15000;

    const fetchForms = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), intervalMs - 1000);
      try {
        const res = await fetch('/api/leadgen/forms', { signal: controller.signal });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to fetch lead gen forms');
        }
        const data = (await res.json()) as LeadGenResponse;
        if (cancelled) return;
        if (Array.isArray(data.forms) && data.forms.length > 0) {
          const sanitized = data.forms
            .filter((item): item is OptionWithCode => Boolean(item?.label && item?.code))
            .map((item) => ({ label: item.label.trim(), code: item.code.trim() }));
          setForms(sanitized);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    };

    fetchForms();
    const intervalId = setInterval(fetchForms, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [version]);

  const reload = () => setVersion((prev) => prev + 1);

  return { forms, loading, error, reload };
}
