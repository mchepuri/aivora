import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NextLink from 'next/link';
import { cookies } from 'next/headers';
import { LinkProvider } from '@astryxdesign/core/Link';
import { ThemeModeProvider } from '@/components/theme/ThemeModeProvider';
import { THEME_MODE_COOKIE, PRESET_COLOR_SCHEME, isThemeMode, type ThemeMode } from '@/lib/theme-mode';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Aivora — AI-Powered Supply Chain Management',
  description:
    'Aivora unifies inventory, procurement, finance, and fulfillment into one intelligent platform.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_MODE_COOKIE)?.value;
  const initialMode: ThemeMode = isThemeMode(raw) ? raw : 'system';
  // Only stamp data-theme for a preset with a fixed color-scheme. For
  // 'system', leave the attribute unset: reset.css's `html:not([data-theme])`
  // rule lets the browser paint via native OS color-scheme resolution before
  // any JS runs — zero flash — and <Theme mode="system"> (inside
  // ThemeModeProvider) just confirms the same resolved value post-hydration.
  const dataThemeAttr = PRESET_COLOR_SCHEME[initialMode];

  return (
    <html lang="en" className={inter.variable} data-theme={dataThemeAttr}>
      <body className="font-sans antialiased">
        <ThemeModeProvider initialMode={initialMode}>
          <LinkProvider component={NextLink}>{children}</LinkProvider>
        </ThemeModeProvider>
      </body>
    </html>
  );
}
