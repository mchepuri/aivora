'use client';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-ink text-white'
            : 'bg-black/5 text-ink'
        }`}
      >
        {message.text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < message.text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}
