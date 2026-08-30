import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FiveFold – Multi-Child Savings & APY Interest Manager',
  description: 'Track pooled savings, auto-distribute monthly bank APY interest, and reconcile child sub-accounts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
