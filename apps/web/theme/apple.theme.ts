// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Custom Astryx theme mapping Aivora's Apple-inspired palette (see
// CLAUDE.md § Design System & Theme) onto Astryx's semantic token set.
// Light mode only for now — the app has no dark mode today, so this theme
// intentionally doesn't provide [light, dark] tuples for most tokens.
//
// Built via `npm run theme:build` (astryx theme build) into apple.css /
// apple.js — see apps/web/package.json predev/prebuild hooks. Those output
// files are generated and gitignored; do not hand-edit them.

import { defineTheme } from '@astryxdesign/core/theme';

export const appleTheme = defineTheme({
  name: 'apple',

  typography: {
    // Apple's comfortable reading size (CLAUDE.md: text-[15px]/text-[17px] body).
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: 'var(--font-inter)',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'var(--font-inter)',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      // CLAUDE.md: "font-semibold tracking-tight — never bold for UI headings".
      weight: 'semibold',
    },
  },

  tokens: {
    '--color-text-primary': '#1d1d1f', // ink
    '--color-text-secondary': '#86868b', // muted
    '--color-icon-primary': '#1d1d1f',
    '--color-icon-secondary': '#86868b',

    '--color-background-body': '#fbfbfd', // canvas
    '--color-background-surface': '#ffffff',
    '--color-background-card': '#ffffff',
    '--color-background-popover': '#ffffff',
    '--color-background-muted': '#f5f5f7',
    '--color-background-inverted': '#1d1d1f', // ink — CTA/primary buttons (bg-ink text-white)

    '--color-accent': '#0071e3',
    '--color-text-accent': '#0071e3',
    '--color-icon-accent': '#0071e3',

    '--color-error': '#ff3b30', // danger
    '--color-background-error-inverted': '#ff3b30',

    // Hairline borders (CLAUDE.md: "border border-black/5 — very subtle").
    '--color-border': 'rgba(0, 0, 0, 0.05)',
    '--color-border-emphasized': 'rgba(0, 0, 0, 0.1)', // inputs: border-black/10

    // Cards/panels: rounded-2xl (16px). --radius-page stays the default 28px,
    // which already matches CLAUDE.md's hero-element radius exactly.
    '--radius-container': '16px',
    // Inputs and non-pill buttons: rounded-xl (12px).
    '--radius-element': '12px',

    // The type scale (base 15, ratio 1.2 above) is tuned for compact app UI,
    // so the generated --text-display-1-size lands around 45px — too small
    // for a marketing hero headline. Overridden here, and only here: a fluid
    // clamp() spanning the same 48px-72px range the landing page's hero used
    // before migration (text-5xl sm:text-6xl md:text-7xl), so <Heading
    // level={1} type="display-1"> reads the way the hero always has instead
    // of shrinking to the app-UI scale.
    '--text-display-1-size': 'clamp(3rem, 2rem + 4vw, 4.5rem)',
  },

  components: {
    button: {
      // CLAUDE.md: "Buttons: rounded-full pill shape" — overridden per-component
      // rather than via --radius-element so inputs stay rounded-xl, not pill.
      base: { borderRadius: 'var(--radius-full)' },
      // CLAUDE.md: "Primary = bg-ink text-white". Astryx's own 'primary'
      // variant is accent-colored (that's our 'accent' style instead), so
      // this app's actual primary/CTA style repurposes the 'secondary'
      // variant (otherwise unused here) rather than adding a new variant
      // name — adding one requires a ButtonVariantMap module augmentation,
      // and `astryx theme build` (0.1.4) generates that augmentation against
      // a mismatched interface name (XDSButtonVariantMap, a leftover from
      // Astryx's old internal "XDS" codename — see CHANGELOG's @xds/* →
      // @astryxdesign/* rename), which makes it a no-op. Filed upstream;
      // avoided here rather than hand-maintaining a competing augmentation
      // file, since two files each declaring `declare module
      // '@astryxdesign/core/Button'` made TypeScript drop the real exports
      // entirely instead of merging them.
      'variant:secondary': {
        backgroundColor: 'var(--color-background-inverted)',
        color: 'var(--color-on-dark)',
      },
    },
  },
});
