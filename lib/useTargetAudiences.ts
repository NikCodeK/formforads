'use client';

import type { OptionWithCode } from './types';
import { useAirtableOptions } from './useAirtableOptions';

interface TargetAudienceResponse {
  audiences?: OptionWithCode[];
}

export function useTargetAudiences() {
  const { items, loading, error, reload } = useAirtableOptions<OptionWithCode>({
    path: '/api/target-audience',
    mapper: (payload) => {
      const data = payload as TargetAudienceResponse;
      return (data.audiences ?? [])
        .filter((item): item is OptionWithCode => Boolean(item?.label && item?.code))
        .map((item) => ({ label: item.label.trim(), code: item.code.trim() }));
    }
  });

  return { audiences: items, loading, error, reload };
}
