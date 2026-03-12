"use client";

import { memo } from "react";
import { VocabWord } from "@/types";

interface VocabularyPanelProps {
  words: VocabWord[];
  onRemoveWord: (id: string) => void;
  onWordClick?: (word: string) => void;
  highlightWord?: string | null;
}

// 🔧 Performance: Memoize component to prevent re-renders when props don't change
const VocabularyPanel = memo(function VocabularyPanel({
  words,
  onRemoveWord,
  onWordClick,
  highlightWord,
}: VocabularyPanelProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-900/50 border-r border-zinc-800">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          生词本
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {words.length} {words.length === 1 ? "word" : "words"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {words.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            划词查询后
            <br />
            点击「+ 生词本」收录
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/50">
            {words.map((w) => {
              const isActive = highlightWord?.toLowerCase() === w.word.toLowerCase();
              return (
              <li
                key={w.id}
                className={`group px-4 py-3 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/15 border-l-2 border-emerald-400"
                    : "hover:bg-zinc-800/30 border-l-2 border-transparent"
                }`}
                onClick={() => onWordClick?.(w.word)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-medium block ${
                      isActive ? "text-emerald-300" : "text-emerald-400"
                    }`}>
                      {w.word}
                    </span>
                    {w.phonetic && (
                      <span className="text-xs text-zinc-500 block mt-0.5">
                        {w.phonetic}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 block mt-1 leading-relaxed">
                      {w.meaning}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveWord(w.id); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all mt-0.5 shrink-0"
                    title="移除"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
});

export default VocabularyPanel;
