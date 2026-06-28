'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-black/5 p-3">
      <textarea
        className="flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        rows={1}
        placeholder="Ask me about Units of Measure…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        maxLength={2000}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink/80 disabled:opacity-40"
        aria-label="Send"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
