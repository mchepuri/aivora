'use client';

import { useAiChat } from './AiChatContext';
import { AiFloatingOverlay } from './AiFloatingOverlay';
import { AiSidePanel } from './AiSidePanel';
import { AiChatLauncher } from './AiChatLauncher';

export function AivaChat() {
  const { isPanelMode, isCollapsed } = useAiChat();
  if (isCollapsed) return <AiChatLauncher />;
  return isPanelMode ? <AiSidePanel /> : <AiFloatingOverlay />;
}
