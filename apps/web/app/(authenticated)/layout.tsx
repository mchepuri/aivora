import { AppNav } from '@/components/AppNav';
import { AiChatProvider } from '@/components/ai-chat/AiChatContext';
import { AuthenticatedContent } from '@/components/ai-chat/AuthenticatedContent';
import { AivaChat } from '@/components/ai-chat/AivaChat';

// Authenticated pages fetch live data per-request — never statically prerender them.
export const dynamic = 'force-dynamic';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiChatProvider>
      <div className="flex min-h-screen flex-col bg-canvas">
        <AppNav />
        <AuthenticatedContent>{children}</AuthenticatedContent>
        <AivaChat />
      </div>
    </AiChatProvider>
  );
}
