'use client';

import { useEffect, useState } from 'react';
import { ChatLayout, ChatMessageList, ChatComposer } from '@astryxdesign/core/Chat';
import { useAiChat } from './AiChatContext';
import { AiChatMessage, ThinkingIndicator } from './AiChatMessage';

export function AiSidePanel() {
  const { messages, loading, sendMessage } = useAiChat();
  const [visible, setVisible] = useState(false);

  // Mount animation: start off-screen, slide in on next frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
            <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="white" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-ink">AIvora</p>
          <p className="text-[11px] text-muted">AI Data Agent</p>
        </div>
      </div>

      {/* ChatLayout owns scrolling, auto-scroll-to-bottom on new messages
          (spring-based, unlocks while the user scrolls up), and docks the
          composer with a frosted-glass backdrop — replaces the old manual
          bottomRef/scrollIntoView effect entirely. */}
      <ChatLayout
        composer={<ChatComposer onSubmit={sendMessage} isDisabled={loading} placeholder="Ask AIvora…" />}
      >
        <ChatMessageList>
          {messages.map((m) => (
            <AiChatMessage key={m.id} message={m} />
          ))}
          {loading && <ThinkingIndicator />}
        </ChatMessageList>
      </ChatLayout>
    </div>
  );
}
