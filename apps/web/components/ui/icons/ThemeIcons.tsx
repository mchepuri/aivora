// Hand-rolled inline SVGs (currentColor, no dependency) — Astryx's built-in
// IconName registry has no sun/moon/monitor glyphs, and pulling in an icon
// library for 3 icons isn't warranted. Mirrors the CloseIcon pattern in
// AiSidePanel.tsx.

export function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.5" fill="currentColor" />
      <path
        d="M8 0.5v2M8 13.5v2M15.5 8h-2M2.5 8h-2M13.19 2.81l-1.41 1.41M4.22 11.78l-1.41 1.41M13.19 13.19l-1.41-1.41M4.22 4.22 2.81 2.81"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 9.65A6 6 0 0 1 6.35 2.5a6.25 6.25 0 1 0 7.15 7.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 13.5h5M8 11.5v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5c.3 2.5 1.1 4 3.6 4.5-2.5.5-3.3 2-3.6 4.5-.3-2.5-1.1-4-3.6-4.5 2.5-.5 3.3-2 3.6-4.5Z"
        fill="currentColor"
      />
      <path
        d="M13 9.5c.16 1.3.58 2.1 1.9 2.35-1.32.25-1.74 1.05-1.9 2.35-.16-1.3-.58-2.1-1.9-2.35 1.32-.25 1.74-1.05 1.9-2.35Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.3 5.6 10.4 11.5 3.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
