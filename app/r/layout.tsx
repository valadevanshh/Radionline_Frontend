import type { Metadata } from 'next';

// Public report links are private to whoever holds the QR code: keep them out of search engines.
export const metadata: Metadata = {
  title: 'Radiology report',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function PublicReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
