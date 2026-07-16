export type ThemeMode = 'light' | 'dark' | 'system' | 'nebula';

export const THEME_MODE_COOKIE = 'aivora_theme_mode';
export const THEME_MODE_STORAGE_KEY = 'aivora_theme_mode';

export function isThemeMode(value: string | undefined | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' || value === 'nebula';
}

// Which native color-scheme each preset resolves to. 'system' is OS-driven
// (no attribute — left to reset.css's html:not([data-theme]) rule);
// presets with a single fixed scheme (e.g. Nebula, light-only today) pin it
// here so SSR paints the right color-scheme before hydration ever runs.
export const PRESET_COLOR_SCHEME: Record<ThemeMode, 'light' | 'dark' | undefined> = {
  light: 'light',
  dark: 'dark',
  system: undefined,
  nebula: 'light',
};
