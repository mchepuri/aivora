'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Theme, type DefinedTheme } from '@astryxdesign/core/theme';
import { appleTheme } from '@/theme/apple';
import { nebulaTheme } from '@/theme/nebula';
import { THEME_MODE_COOKIE, THEME_MODE_STORAGE_KEY, type ThemeMode } from '@/lib/theme-mode';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Three presets share the Apple theme (varying only light/dark/system
// mode); Nebula is a fully independent theme object. Astryx scopes each
// theme's generated CSS to its own [data-astryx-theme="<name>"], so both
// can be imported at once (see globals.css) with no collision.
const PRESETS: Record<ThemeMode, { theme: DefinedTheme; mode: 'light' | 'dark' | 'system' }> = {
  light: { theme: appleTheme, mode: 'light' },
  dark: { theme: appleTheme, mode: 'dark' },
  system: { theme: appleTheme, mode: 'system' },
  nebula: { theme: nebulaTheme, mode: 'light' },
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
}

export function ThemeModeProvider({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, next);
    document.cookie = `${THEME_MODE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  const preset = PRESETS[mode];

  return (
    <ThemeModeContext.Provider value={value}>
      <Theme theme={preset.theme} mode={preset.mode}>
        {children}
      </Theme>
    </ThemeModeContext.Provider>
  );
}
