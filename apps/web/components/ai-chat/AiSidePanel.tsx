'use client';

import { useEffect, useRef, useState } from 'react';
import { useAiChat } from './AiChatContext';
import { AiSearchBox } from './AiSearchBox';
import { AiChatMessage, ThinkingIndicator } from './AiChatMessage';

export function AiSidePanel() {
  const { messages, loading, sendMessage } = useAiChat();
  const [visible, setVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mount animation: start off-screen, slide in on next frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => clearTimeout(id);
  }, [messages]);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 flex w-[30vw] flex-col border-l border-black/[0.06] bg-white transition-transform duration-500 ease-in-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"
              fill="white"
            />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">AIvora</p>
          <p className="text-[11px] text-muted">AI Data Agent</p>
        </div>
      </div>

      {/* Scrollable chat history with timestamps */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <AiChatMessage key={m.id} message={m} />
          ))}
          {loading && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Search box pinned to bottom */}
      <div className="border-t border-black/[0.06] px-3 py-3">
        <AiSearchBox onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
