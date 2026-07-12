'use client';

import { useEffect, useState } from 'react';
import { ChatLayout, ChatMessageList, ChatComposer } from '@astryxdesign/core/Chat';
import { Text } from '@astryxdesign/core/Text';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useAiChat } from './AiChatContext';
import { AiChatMessage, ThinkingIndicator } from './AiChatMessage';

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.22 2.22a.75.75 0 0 1 1.06 0L7 5.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L8.06 7l3.72 3.72a.75.75 0 1 1-1.06 1.06L7 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L5.94 7 2.22 3.28a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AiSidePanel() {
  const { messages, loading, sendMessage, collapseChat } = useAiChat();
  const [visible, setVisible] = useState(false);

  // Mount animation: start off-screen, slide in on next frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      // top sits below the nav bar (published by AppNav as --app-nav-height)
      // instead of the viewport edge, so the panel never covers the nav —
      // including the account menu / logout in its top-right corner.
      style={{ top: 'var(--app-nav-height, 3.5rem)', boxShadow: '-8px 0 40px rgba(0,0,0,0.07)' }}
      className={`fixed bottom-0 right-0 z-40 flex w-[30vw] flex-col border-l border-black/[0.06] bg-white transition-transform duration-500 ease-in-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="white" />
          </svg>
        </div>
        <div className="flex-1">
          <Text weight="semibold">AIvora</Text>
          <Text type="supporting" color="secondary">
            AI Data Agent
          </Text>
        </div>
        <IconButton label="Close chat" icon={<CloseIcon />} variant="ghost" size="sm" onClick={collapseChat} />
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
