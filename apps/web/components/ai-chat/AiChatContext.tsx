'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AiChatContextValue {
  messages: Message[];
  loading: boolean;
  isPanelMode: boolean;
  sendMessage: (text: string) => Promise<void>;
  activatePanelMode: () => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
  return ctx;
}

let nextId = 1;
function makeId() {
  return String(nextId++);
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  text: "Hi! I'm AIvora. Ask me anything about your business data — inventory, orders, units of measure, roles, and more.",
  timestamp: new Date(),
};

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isPanelMode, setIsPanelMode] = useState(false);

  const activatePanelMode = useCallback(() => setIsPanelMode(true), []);

  const sendMessage = useCallback(
    async (text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'user', text, timestamp: new Date() },
      ]);
      setLoading(true);

      try {
        const res = await apiClient.post<{ conversationId: string; reply: string }>(
          '/ai/agent/query',
          { message: text, conversationId },
        );
        setConversationId(res.conversationId);
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', text: res.reply, timestamp: new Date() },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            text: 'Something went wrong reaching the agent. Please try again.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId],
  );

  return (
    <AiChatContext.Provider value={{ messages, loading, isPanelMode, sendMessage, activatePanelMode }}>
      {children}
    </AiChatContext.Provider>
  );
}
