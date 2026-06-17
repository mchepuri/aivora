'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { ChatInput } from './ChatInput';
import { ChatMessage, Message } from './ChatMessage';

interface ChatResponse {
  conversationId: string;
  reply: string;
  redirect?: string;
}

let nextId = 1;
function makeId() {
  return String(nextId++);
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  text: "Hi! I'm your Inventory Bot. I can help you create and manage Units of Measure. Try saying \"Create a kilogram UOM\" or \"Show me all UOMs\".",
};

export function InventoryBot() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function handleSend(text: string) {
    const userMsg: Message = { id: makeId(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await apiClient.post<ChatResponse>('/ai/inventory-bot/chat', { message: text });

      const assistantMsg: Message = { id: makeId(), role: 'assistant', text: res.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.redirect) {
        router.push(res.redirect);
      }
      router.refresh();
    } catch {
      const errMsg: Message = {
        id: makeId(),
        role: 'assistant',
        text: 'Something went wrong reaching the bot. Please try again.',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-2xl transition hover:bg-ink/80 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label="Open Inventory Bot"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v10a1 1 0 01-1 1H6l-4 3V3z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-black/5 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white text-[11px] font-semibold">
              AI
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink">Inventory Bot</p>
              <p className="text-[11px] text-muted">Powered by Claude</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto p-3">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-black/5 px-3.5 py-2 text-[13px] text-muted">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      )}

    </>
  );
}
