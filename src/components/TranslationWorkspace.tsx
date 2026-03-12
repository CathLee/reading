"use client";

import { useCallback, useRef, memo, useEffect, useMemo } from "react";
import { SentencePair } from "@/types";

// 🔧 Performance: Extract SentenceItem as a separate memoized component
// This prevents re-rendering all sentences when only one sentence translation changes
interface SentenceItemProps {
  pair: SentencePair;
  index: number;
  onTranslationChange: (id: string, value: string) => void;
  highlightWord?: string | null;
  containsHighlight?: boolean;
}

function highlightWordInText(text: string, word: string): React.ReactNode {
  const regex = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-emerald-500/30 text-emerald-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const SentenceItem = memo(function SentenceItem({
  pair,
  index,
  onTranslationChange,
  highlightWord,
  containsHighlight,
}: SentenceItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sentenceRef = useRef<HTMLDivElement>(null);

  // 🎨 Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [pair.translation]);

  // Scroll into view when highlighted
  useEffect(() => {
    if (containsHighlight && sentenceRef.current) {
      sentenceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [containsHighlight, highlightWord]);

  return (
    <div
      ref={sentenceRef}
      className={`group rounded-lg transition-all duration-300 ${
        containsHighlight
          ? "bg-emerald-500/5 ring-1 ring-emerald-500/20 p-3 -mx-3"
          : ""
      }`}
    >
      {/* Sentence number */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono px-2 py-0.5 rounded ${
          containsHighlight
            ? "text-emerald-400 bg-emerald-500/10"
            : "text-zinc-600 bg-zinc-800/50"
        }`}>
          {index + 1}
        </span>
      </div>

      {/* English sentence */}
      <p className="text-base text-zinc-200 leading-relaxed mb-2 select-text cursor-text px-1">
        {highlightWord && containsHighlight
          ? highlightWordInText(pair.english, highlightWord)
          : pair.english}
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
  highlightWord?: string | null;
}

export default function TranslationWorkspace({
  sentences,
  onTranslationChange,
  onWordSelect,
  highlightWord,
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

  const highlightSentenceIds = useMemo(() => {
    if (!highlightWord) return new Set<string>();
    const regex = new RegExp(`\\b${highlightWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return new Set(
      sentences.filter((s) => regex.test(s.english)).map((s) => s.id)
    );
  }, [highlightWord, sentences]);

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
          highlightWord={highlightWord}
          containsHighlight={highlightSentenceIds.has(pair.id)}
        />
      ))}
    </div>
  );
}
