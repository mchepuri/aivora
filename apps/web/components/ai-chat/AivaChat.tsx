'use client';

import { useAiChat } from './AiChatContext';
import { AiFloatingOverlay } from './AiFloatingOverlay';
import { AiSidePanel } from './AiSidePanel';

export function AivaChat() {
  const { isPanelMode } = useAiChat();
  return isPanelMode ? <AiSidePanel /> : <AiFloatingOverlay />;
}
