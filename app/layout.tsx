import type { Metadata } from 'next';
import './globals.css';
import './design-tokens.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: 'Radionlineofficial — Teleradiology & X-Ray Management Platform',
  description: 'Digital X-Ray Patient Record Management & Diagnostic Report Platform',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f1f5f9] text-[#3f4254] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
