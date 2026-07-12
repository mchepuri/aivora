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
      className="fixed bottom-6 left-1/2 z-50 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-2xl transition hover:bg-ink/85"
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="white" />
      </svg>
    </button>
  );
}
