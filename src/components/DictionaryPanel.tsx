"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { DictionaryResult, VocabWord } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface DictionaryPanelProps {
  result: DictionaryResult | null;
  loading: boolean;
  vocabularyIds: Set<string>;
  onAddToVocabulary: (word: VocabWord) => void;
}

// 🔧 Performance: Memoize component to prevent re-renders when props don't change
const DictionaryPanel = memo(function DictionaryPanel({
  result,
  loading,
  vocabularyIds,
  onAddToVocabulary,
}: DictionaryPanelProps) {
  const [addingToVocab, setAddingToVocab] = useState(false);

  // 🔧 Performance: Memoize isInVocabulary check
  const isInVocabulary = useMemo(
    () => (result ? vocabularyIds.has(result.word.toLowerCase()) : false),
    [result, vocabularyIds]
  );

  // 获取中文翻译并添加到生词本
  const handleAddToVocab = useCallback(async () => {
    if (!result || addingToVocab) return;

    setAddingToVocab(true);
    try {
      // 直接翻译单词本身
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.word }),
      });

      let meaning = "";
      if (res.ok) {
        const data = await res.json();
        // 组合词性和中文翻译
        const partOfSpeech = result.meanings[0]?.partOfSpeech || "";
        const partOfSpeechMap: Record<string, string> = {
          noun: "n.",
          verb: "v.",
          adjective: "adj.",
          adverb: "adv.",
          preposition: "prep.",
          conjunction: "conj.",
          pronoun: "pron.",
          interjection: "int.",
        };
        const posAbbr = partOfSpeechMap[partOfSpeech] || partOfSpeech;
        meaning = posAbbr ? `${posAbbr} ${data.translation}` : data.translation;
      } else {
        // 翻译失败时使用英文释义作为后备
        meaning = result.meanings
          .map((m) => `[${m.partOfSpeech}] ${m.definitions[0]?.definition || ""}`)
          .join("; ");
      }

      onAddToVocabulary({
        id: uuidv4(),
        word: result.word,
        phonetic: result.phonetic,
        meaning: meaning.slice(0, 120),
        addedAt: Date.now(),
      });
    } catch {
      // 出错时使用英文释义
      const meaning = result.meanings
        .map((m) => `[${m.partOfSpeech}] ${m.definitions[0]?.definition || ""}`)
        .join("; ");
      onAddToVocabulary({
        id: uuidv4(),
        word: result.word,
        phonetic: result.phonetic,
        meaning: meaning.slice(0, 120),
        addedAt: Date.now(),
      });
    } finally {
      setAddingToVocab(false);
    }
  }, [result, onAddToVocabulary, addingToVocab]);

  const handlePlayAudio = useCallback(() => {
    if (result?.audio) {
      const audio = new Audio(result.audio);
      audio.play().catch(() => {});
    }
  }, [result?.audio]);

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 border-l border-zinc-800">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          词典
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">查询中...</span>
          </div>
        ) : result ? (
          <div>
            {/* Word header */}
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-white">{result.word}</h3>
                {result.audio && (
                  <button
                    onClick={handlePlayAudio}
                    className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                    title="播放发音"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
              </div>
              {result.phonetic && (
                <p className="text-sm text-zinc-400 font-mono">
                  {result.phonetic}
                </p>
              )}
            </div>

            {/* Add to vocabulary button */}
            <button
              onClick={handleAddToVocab}
              disabled={isInVocabulary || addingToVocab}
              className={`w-full mb-5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isInVocabulary || addingToVocab
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
              }`}
            >
              {addingToVocab ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-500/30 border-t-zinc-500 rounded-full animate-spin" />
                  翻译中...
                </>
              ) : isInVocabulary ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  已收录
                </>
              ) : (
                <>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  + 生词本
                </>
              )}
            </button>

            {/* Meanings */}
            <div className="space-y-5">
              {result.meanings.map((meaning, i) => (
                <div key={i}>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-3">
                    {meaning.partOfSpeech}
                  </span>
                  <ol className="space-y-3">
                    {meaning.definitions.map((def, j) => (
                      <li key={j} className="text-sm">
                        <p className="text-zinc-300 leading-relaxed">
                          <span className="text-zinc-600 mr-1.5 text-xs">
                            {j + 1}.
                          </span>
                          {def.definition}
                        </p>
                        {def.example && (
                          <p className="text-zinc-500 text-xs mt-1.5 pl-4 border-l-2 border-zinc-800 italic">
                            &ldquo;{def.example}&rdquo;
                          </p>
                        )}
                        {def.synonyms && def.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {def.synonyms.map((syn, k) => (
                              <span
                                key={k}
                                className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <p className="text-sm">
              选中英文单词
              <br />
              即可查看释义
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default DictionaryPanel;
