'use client';

import { useAiChat } from './AiChatContext';

export function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const { isPanelMode, isCollapsed } = useAiChat();

  return (
    <div
      className={`flex-1 transition-[padding] duration-500 ease-in-out ${
        isPanelMode && !isCollapsed ? 'pr-[30vw]' : ''
      }`}
    >
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
