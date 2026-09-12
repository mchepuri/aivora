'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useState } from 'react';
import type { SalesOrder } from '@/components/sales-orders/SalesOrderTypes';
import { apiClient } from '@/lib/apiClient';

interface AgentResponse {
  conversationId: string;
  reply: string;
}

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
  isCollapsed: boolean;
  sendMessage: (text: string) => Promise<void>;
  activatePanelMode: () => void;
  collapseChat: () => void;
  expandChat: () => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
  return ctx;
}

function makeId() {
  return crypto.randomUUID();
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  text: "Hi! I'm AIvora. Ask me anything about your business data — inventory, orders, units of measure, roles, and more.",
  timestamp: new Date(),
};

const OPEN_SALES_ORDER_PATTERN = /^open\s+sales\s+order\s+(.+)$/i;
const EDIT_SALES_ORDER_PATTERN = /^edit\s+sales\s+order\s+(.+)$/i;

function normalizeSalesOrderReference(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function tryHandleSalesOrderNavigation(
  text: string,
): Promise<{ handled: boolean; route?: string; reply?: string }> {
  const openMatch = text.match(OPEN_SALES_ORDER_PATTERN);
  const editMatch = text.match(EDIT_SALES_ORDER_PATTERN);
  const match = openMatch ?? editMatch;

  if (!match) {
    return { handled: false };
  }

  const target = match[1].trim();
  if (!target) {
    return { handled: true, reply: 'I could not find that sales order reference.' };
  }

  const normalizedTarget = normalizeSalesOrderReference(target);

  try {
    const salesOrders = await apiClient.get<SalesOrder[]>('/sales/sales-orders?limit=100');
    const matchedSalesOrder = salesOrders.find(
      (salesOrder) => normalizeSalesOrderReference(salesOrder.soNumber) === normalizedTarget,
    );

    if (!matchedSalesOrder) {
      return { handled: true, reply: `I couldn't find sales order ${target}.` };
    }

    if (editMatch && matchedSalesOrder.status !== 'DRAFT') {
      return {
        handled: true,
        reply: `Sales order ${matchedSalesOrder.soNumber} is ${matchedSalesOrder.status}; only draft orders can be edited.`,
      };
    }

    const route = editMatch
      ? `/sales-orders/${matchedSalesOrder.id}/edit`
      : `/sales-orders/${matchedSalesOrder.id}`;

    return {
      handled: true,
      route,
      reply: editMatch
        ? `Opening sales order ${matchedSalesOrder.soNumber} in edit mode...`
        : `Opening sales order ${matchedSalesOrder.soNumber}...`,
    };
  } catch {
    return {
      handled: true,
      reply: `I couldn't open sales order ${target} right now.`,
    };
  }
}

export function AiChatProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isPanelMode, setIsPanelMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activatePanelMode = useCallback(() => {
    setIsPanelMode(true);
    setIsCollapsed(false);
  }, []);

  const collapseChat = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expandChat = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'user', text: trimmedText, timestamp: new Date() },
      ]);
      setLoading(true);

      try {
        const directAction = await tryHandleSalesOrderNavigation(trimmedText);

        if (directAction.handled) {
          setMessages((prev) => [
            ...prev,
            {
              id: makeId(),
              role: 'assistant',
              text: directAction.reply ?? 'Opening sales order...',
              timestamp: new Date(),
            },
          ]);

          if (directAction.route) {
            router.push(directAction.route);
          }
          return;
        }

        const res = await apiClient.post<AgentResponse>(
          '/ai/agent/query',
          { message: trimmedText, conversationId },
        );
        setConversationId(res.conversationId);
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', text: res.reply, timestamp: new Date() },
        ]);
        router.refresh();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            text: 'The AI agent couldn\'t be reached. Check your connection and try again.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, router],
  );

  return (
    <AiChatContext.Provider
      value={{
        messages,
        loading,
        isPanelMode,
        isCollapsed,
        sendMessage,
        activatePanelMode,
        collapseChat,
        expandChat,
      }}
    >
      {children}
    </AiChatContext.Provider>
  );
}
