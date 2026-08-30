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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('fivefold-theme') || 'system';
                if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
