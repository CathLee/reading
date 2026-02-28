"use client";

import { useCallback, useRef, memo, useEffect } from "react";
import { SentencePair } from "@/types";

// 🔧 Performance: Extract SentenceItem as a separate memoized component
// This prevents re-rendering all sentences when only one sentence translation changes
interface SentenceItemProps {
  pair: SentencePair;
  index: number;
  onTranslationChange: (id: string, value: string) => void;
}

const SentenceItem = memo(function SentenceItem({
  pair,
  index,
  onTranslationChange,
}: SentenceItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🎨 Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [pair.translation]);

  return (
    <div className="group">
      {/* Sentence number */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">
          {index + 1}
        </span>
      </div>

      {/* English sentence */}
      <p className="text-base text-zinc-200 leading-relaxed mb-2 select-text cursor-text px-1">
        {pair.english}
      </p>

      {/* Translation textarea - auto-expanding */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={pair.translation}
          onChange={(e) => onTranslationChange(pair.id, e.target.value)}
          placeholder="输入中文翻译..."
          rows={1}
          className="w-full bg-transparent text-zinc-300 text-sm px-1 py-2 border-b-2 border-zinc-700/50 focus:border-emerald-500/50 outline-none transition-colors placeholder:text-zinc-700 resize-none overflow-hidden leading-relaxed"
        />
      </div>
    </div>
  );
});

interface TranslationWorkspaceProps {
  sentences: SentencePair[];
  onTranslationChange: (id: string, value: string) => void;
  onWordSelect: (word: string) => void;
}

export default function TranslationWorkspace({
  sentences,
  onTranslationChange,
  onWordSelect,
}: TranslationWorkspaceProps) {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseUp = useCallback(() => {
    // Debounce to avoid firing too quickly
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString().trim();
      // Only trigger for single words (no spaces)
      if (text && /^[a-zA-Z'-]+$/.test(text) && text.length < 40) {
        onWordSelect(text);
      }
    }, 200);
  }, [onWordSelect]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        const text = selection.toString().trim();
        if (text && /^[a-zA-Z'-]+$/.test(text) && text.length < 40) {
          onWordSelect(text);
        }
      }, 50);
    },
    [onWordSelect]
  );

  if (sentences.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-6"
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {sentences.map((pair, index) => (
        <SentenceItem
          key={pair.id}
          pair={pair}
          index={index}
          onTranslationChange={onTranslationChange}
        />
      ))}
    </div>
  );
}
