'use client';

import type { OptionWithCode } from './types';
import { useAirtableOptions } from './useAirtableOptions';

interface LeadGenResponse {
  forms?: OptionWithCode[];
}

export function useLeadGenForms() {
  const { items, loading, error, reload } = useAirtableOptions<OptionWithCode>({
    path: '/api/leadgen/forms',
    mapper: (payload) => {
      const data = payload as LeadGenResponse;
      return (data.forms ?? [])
        .filter((item): item is OptionWithCode => Boolean(item?.label && item?.code))
        .map((item) => ({ label: item.label.trim(), code: item.code.trim() }));
    }
  });

  return { forms: items, loading, error, reload };
}
