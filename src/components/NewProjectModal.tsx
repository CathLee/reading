"use client";

import { useState } from "react";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, text: string) => void;
}

export default function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: NewProjectModalProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(
      title.trim() || text.trim().slice(0, 50) + "...",
      text.trim()
    );
    setTitle("");
    setText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">新建翻译项目</h2>
          <p className="text-sm text-zinc-500 mt-1">
            粘贴英文原文，系统将自动断句
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              项目标题（可选）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：The Great Gatsby Chapter 1"
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              英文原文 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your English text here..."
              rows={10}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            开始翻译
          </button>
        </div>
      </div>
    </div>
  );
}
