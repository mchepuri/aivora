'use client';

import { useAiChat } from './AiChatContext';

// Shown when the chat is collapsed (via the side panel's close button) —
// a small fixed pill at the bottom-center of the viewport that re-opens
// whichever mode (panel or floating) was active before closing.
export function AiChatLauncher() {
  const { expandChat } = useAiChat();

  return (
    <button
      type="button"
      onClick={expandChat}
      title="Open AIvora chat"
      aria-label="Open AIvora chat"
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-[0_12px_30px_rgba(0,113,227,0.35)] transition hover:scale-[1.02]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 7h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9l-4 3v-3H8a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 10.5h6M10 13.5h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
