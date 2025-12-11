'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/lead-generation');
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-20 text-center">
      <p className="text-slate-600">Weiterleitung zu Campaign Builder...</p>
    </div>
  );
}
