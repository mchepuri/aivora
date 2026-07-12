import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Theme } from '@astryxdesign/core/theme';
import { appleTheme } from '../theme/apple';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Aivora — AI-Powered Supply Chain Management',
  description:
    'Aivora unifies inventory, procurement, finance, and fulfillment into one intelligent platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set directly (rather than left to <Theme>'s client-side sync)
    // so SSR output already has the right color-scheme — no flash before hydration.
    <html lang="en" className={inter.variable} data-theme="light">
      <body className="font-sans antialiased">
        <Theme theme={appleTheme} mode="light">
          {children}
        </Theme>
      </body>
    </html>
  );
}
