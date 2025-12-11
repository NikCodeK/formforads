import type { Metadata } from 'next';
import './globals.css';
import type { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Campaign Builder - LinkedIn Ads',
  description: 'Create and manage LinkedIn ad campaigns with ease.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-950 antialiased">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
