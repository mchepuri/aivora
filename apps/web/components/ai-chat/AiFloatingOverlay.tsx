'use client';

import { useEffect, useRef, useState } from 'react';
import { useAiChat } from './AiChatContext';
import { AiSearchBox } from './AiSearchBox';
import { AiChatMessage, ThinkingIndicator } from './AiChatMessage';

const PANEL_THRESHOLD = 0.2; // switch to panel when message area exceeds 20% of viewport height

export function AiFloatingOverlay() {
  const { messages, loading, sendMessage, activatePanelMode } = useAiChat();
  const [posY, setPosY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef<{ my: number; py: number } | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPosY(window.innerHeight - 24);
    setMounted(true);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    const id = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => clearTimeout(id);
  }, [messages]);

  // Switch to panel mode when message area exceeds 20% of viewport height
  useEffect(() => {
    if (!messagesRef.current) return;
    if (messagesRef.current.scrollHeight > window.innerHeight * PANEL_THRESHOLD) {
      activatePanelMode();
    }
  }, [messages, activatePanelMode]);

  useEffect(() => {
    if (!isDragging) return;

    function onMouseMove(e: MouseEvent) {
      if (!dragOrigin.current) return;
      setPosY(dragOrigin.current.py + (e.clientY - dragOrigin.current.my));
    }

    function onMouseUp() {
      setIsDragging(false);
      dragOrigin.current = null;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  function onDragHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragOrigin.current = { my: e.clientY, py: posY };
    setIsDragging(true);
  }

  // messages[0] is the welcome message — show history only after the user sends something
  const hasHistory = messages.length > 1;

  if (!mounted) return null;

  return (
    // horizontally centered via left-1/2 + translateX(-50%); bottom edge anchored at posY
    <div
      style={{ top: posY, transform: 'translateX(-50%) translateY(-100%)' }}
      className="fixed left-1/2 z-50 w-[75vw] select-none"
    >
      {/* Message history — grows upward above the search pill */}
      {hasHistory && (
        <div
          ref={messagesRef}
          className="mb-2 flex max-h-[45vh] flex-col gap-3 overflow-y-auto rounded-3xl bg-white p-4"
          style={{
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {messages.map((m) => (
            <AiChatMessage key={m.id} message={m} />
          ))}
          {loading && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Search pill card — the 3D floating element */}
      <div
        className="overflow-hidden rounded-[28px] bg-white"
        style={{
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragHandleMouseDown}
          className={`flex h-5 items-center justify-center bg-black/[0.025] ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title="Drag to move"
        >
          <div className="h-1 w-8 rounded-full bg-black/15" />
        </div>

        {/* Search box */}
        <div className="px-4 pb-4 pt-2">
          <AiSearchBox onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
