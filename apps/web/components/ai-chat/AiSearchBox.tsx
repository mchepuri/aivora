'use client';

import { FormEvent, KeyboardEvent, useRef, useState } from 'react';

interface AiSearchBoxProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AiSearchBox({ onSend, disabled, className = '' }: AiSearchBoxProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      {/* Google AI Mode-style pill: + icon · placeholder · no right controls */}
      <div className="flex items-center gap-3 rounded-full border border-black/[0.08] bg-black/[0.05] px-5 py-3.5 transition-all focus-within:border-accent/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/20">
        {/* Plus icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-muted"
        >
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask AIvora…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          maxLength={2000}
          className="max-h-36 flex-1 resize-none overflow-hidden bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
          style={{ height: 'auto' }}
        />
      </div>
    </form>
  );
}
