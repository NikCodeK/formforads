'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Lead Generation', href: '/lead-generation' },
  { name: 'Message Ads', href: '/message-ads' },
  { name: 'Awareness', href: '/awareness' },
  { name: 'Conversation Ads', href: '/conversation-ads' },
  { name: 'Text Ads', href: '/text-ads' },
  { name: 'Carousel Ads', href: '/carousel-ads' },
  { name: 'Document Ads', href: '/document-ads' }
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-slate-900">Campaign Builder</h1>
        </div>
        <nav className="flex space-x-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  rounded-t-xl px-6 py-3 text-sm font-semibold transition
                  ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 border-t-2 border-x border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                `}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
