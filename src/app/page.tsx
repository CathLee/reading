"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import VocabularyPanel from "@/components/VocabularyPanel";
import DictionaryPanel from "@/components/DictionaryPanel";
import TranslationWorkspace from "@/components/TranslationWorkspace";
import NewProjectModal from "@/components/NewProjectModal";
import { splitIntoSentences } from "@/lib/sentences";
import { saveProject, getProject as loadProject } from "@/lib/storage";
import {
  VocabWord,
  DictionaryResult,
  SentencePair,
  TranslationProject,
} from "@/types";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<TranslationProject | null>(null);
  const [sentences, setSentences] = useState<SentencePair[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabWord[]>([]);
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Load historical project from URL param on mount
  useEffect(() => {
    const projectId = searchParams.get("project");
    if (projectId) {
      const existingProject = loadProject(projectId);
      if (existingProject) {
        setProject(existingProject);
        setSentences(existingProject.sentences);
        setVocabulary(existingProject.vocabulary);
        setIsEditMode(true);
        setDictResult(null);
      }
    }
  }, [searchParams]);

  const vocabularyWordSet = new Set(vocabulary.map((w) => w.word.toLowerCase()));

  const handleNewProject = (title: string, text: string) => {
    const newSentences = splitIntoSentences(text);
    const newProject: TranslationProject = {
      id: uuidv4(),
      title,
      originalText: text,
      sentences: newSentences,
      vocabulary: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProject(newProject);
    setSentences(newSentences);
    setVocabulary([]);
    setDictResult(null);
    setShowModal(false);
    setIsEditMode(false);
    // Clear URL param when creating a new project
    router.replace("/", { scroll: false });
  };

  const handleTranslationChange = useCallback(
    (id: string, value: string) => {
      setSentences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, translation: value } : s))
      );
    },
    []
  );

  const handleWordSelect = useCallback(async (word: string) => {
    setDictLoading(true);
    try {
      const res = await fetch(
        `/api/dictionary?word=${encodeURIComponent(word)}`
      );
      const data = await res.json();
      setDictResult(data);
    } catch {
      setDictResult({
        word,
        phonetic: "",
        meanings: [
          {
            partOfSpeech: "error",
            definitions: [{ definition: "Failed to fetch definition" }],
          },
        ],
      });
    } finally {
      setDictLoading(false);
    }
  }, []);

  const handleAddToVocabulary = useCallback((word: VocabWord) => {
    setVocabulary((prev) => {
      if (prev.some((w) => w.word.toLowerCase() === word.word.toLowerCase())) {
        return prev;
      }
      return [word, ...prev];
    });
  }, []);

  const handleRemoveFromVocabulary = useCallback((id: string) => {
    setVocabulary((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    if (!project) return;
    const updatedProject: TranslationProject = {
      ...project,
      sentences,
      vocabulary,
      updatedAt: Date.now(),
    };
    saveProject(updatedProject);
    setProject(updatedProject);
    setSaveStatus("已保存");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [project, sentences, vocabulary]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Landing page when no project is open
  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/10">
            <svg
              className="w-10 h-10 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">英语精读翻译</h1>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            沉浸式分句精译工作台
            <br />
            智能断句 · 划词翻译 · 生词收录 · 历史存档
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              新建翻译项目
            </button>
            <a
              href="/history"
              className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors border border-zinc-700"
            >
              历史笔记本
            </a>
          </div>
        </div>
        <NewProjectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleNewProject}
        />
      </div>
    );
  }

  // Main three-column layout
  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
          <h1 className="text-sm font-medium text-zinc-300 truncate max-w-xs">
            {project.title}
          </h1>
          {isEditMode && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              编辑中
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-emerald-400 animate-pulse">
              {saveStatus}
            </span>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="text-xs px-3 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            新建
          </button>
          <a
            href="/history"
            className="text-xs px-3 py-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            历史
          </a>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Vocabulary Book - 20% */}
        <aside className="w-[20%] min-w-[200px] overflow-hidden">
          <VocabularyPanel
            words={vocabulary}
            onRemoveWord={handleRemoveFromVocabulary}
          />
        </aside>

        {/* Center: Main Translation Area - 50% */}
        <main className="w-[50%] overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 pb-20">
            <div className="mb-6">
              <span className="text-xs text-zinc-600">
                共 {sentences.length} 句 · 已译{" "}
                {sentences.filter((s) => s.translation.trim()).length} 句
              </span>
            </div>
            <TranslationWorkspace
              sentences={sentences}
              onTranslationChange={handleTranslationChange}
              onWordSelect={handleWordSelect}
            />
          </div>
        </main>

        {/* Right: Dictionary Panel - 30% */}
        <aside className="w-[30%] min-w-[280px] overflow-hidden">
          <DictionaryPanel
            result={dictResult}
            loading={dictLoading}
            vocabularyIds={vocabularyWordSet}
            onAddToVocabulary={handleAddToVocabulary}
          />
        </aside>
      </div>

      <NewProjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleNewProject}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
