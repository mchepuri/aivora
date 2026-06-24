'use client';

import { Message } from './AiChatContext';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AiChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser ? 'bg-ink text-white' : 'bg-black/5 text-ink'
        }`}
      >
        {message.text.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
      <span className="shrink-0 text-[10px] text-muted">{formatTime(message.timestamp)}</span>
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted">
      <span className="inline-flex gap-0.5">
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30"
          style={{ animationDelay: '300ms' }}
        />
      </span>
      Thinking…
    </div>
  );
}
