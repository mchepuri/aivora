// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Custom Astryx theme mapping Aivora's Apple-inspired palette (see
// CLAUDE.md § Design System & Theme) onto Astryx's semantic token set.
//
// Color tokens are [light, dark] tuples — Astryx compiles these to CSS
// light-dark(), resolved per-element via the `color-scheme` the active
// <Theme mode> writes onto <html data-theme>. Light values are the
// original Apple palette, unchanged. Dark values are a VS Code Dark+
// inspired palette (not a strict match) — see the inline comments below,
// especially --color-background-inverted.
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
    '--color-text-primary': ['#1d1d1f', '#cccccc'], // ink / VS Code editor.foreground
    '--color-text-secondary': ['#86868b', '#9d9d9d'], // muted
    '--color-icon-primary': ['#1d1d1f', '#cccccc'],
    '--color-icon-secondary': ['#86868b', '#9d9d9d'],

    '--color-background-body': ['#fbfbfd', '#1e1e1e'], // canvas / VS Code editor.background
    '--color-background-surface': ['#ffffff', '#252526'], // VS Code sideBar.background
    '--color-background-card': ['#ffffff', '#252526'],
    '--color-background-popover': ['#ffffff', '#2d2d30'], // one step above surface so popovers visibly lift
    '--color-background-muted': ['#f5f5f7', '#2a2d2e'],
    // ink in light mode — CTA/primary buttons (bg-ink text-white). In dark
    // mode this can't stay a near-black fill (it would disappear into an
    // already-dark page), so it switches to VS Code's button.background
    // blue instead — the CTA needs to stay the boldest element on the page
    // in both modes. Pairs with --color-on-dark below, which Astryx fixes
    // to white in both modes, so the label stays legible either way.
    '--color-background-inverted': ['#1d1d1f', '#0e639c'],

    '--color-accent': ['#0071e3', '#3794ff'], // VS Code link/accent blue — brighter than the CTA blue above
    '--color-text-accent': ['#0071e3', '#3794ff'],
    '--color-icon-accent': ['#0071e3', '#3794ff'],

    '--color-error': ['#ff3b30', '#f14c4c'], // danger / VS Code errorForeground
    '--color-background-error-inverted': ['#ff3b30', '#f14c4c'],

    // Hairline borders (CLAUDE.md: "border border-black/5 — very subtle").
    '--color-border': ['rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)'],
    '--color-border-emphasized': ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.16)'], // inputs: border-black/10

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
