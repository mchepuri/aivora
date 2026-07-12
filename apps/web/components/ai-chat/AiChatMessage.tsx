import { ChatMessage, ChatMessageBubble, ChatMessageMetadata } from '@astryxdesign/core/Chat';
import { Message } from './AiChatContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AiChatMessage({ message }: { message: Message }) {
  return (
    <ChatMessage sender={message.role}>
      <ChatMessageBubble
        className="whitespace-pre-wrap"
        metadata={<ChatMessageMetadata timestamp={formatTime(message.timestamp)} />}
      >
        {message.text}
      </ChatMessageBubble>
    </ChatMessage>
  );
}

export function ThinkingIndicator() {
  return (
    <ChatMessage sender="assistant">
      <ChatMessageBubble variant="ghost">
        <span className="inline-flex items-center gap-2 text-[13px] text-muted">
          <span className="inline-flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: '300ms' }} />
          </span>
          Thinking…
        </span>
      </ChatMessageBubble>
    </ChatMessage>
  );
}
