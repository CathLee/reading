"use client";

import { useState, useEffect } from "react";
import { TranslationProject } from "@/types";
import { getProjects, deleteProject } from "@/lib/storage";

export default function HistoryPage() {
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProjects(getProjects());
    setLoaded(true);
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除这个翻译项目吗？")) return;
    deleteProject(id);
    setProjects(getProjects());
  };

  const handleExport = (project: TranslationProject) => {
    const lines: string[] = [];
    lines.push(`# ${project.title}`);
    lines.push(`Date: ${new Date(project.createdAt).toLocaleDateString()}`);
    lines.push("");
    lines.push("## Translation");
    lines.push("");

    project.sentences.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.english}`);
      lines.push(`   ${s.translation || "(未翻译)"}`);
      lines.push("");
    });

    if (project.vocabulary.length > 0) {
      lines.push("## Vocabulary");
      lines.push("");
      project.vocabulary.forEach((w) => {
        lines.push(`- **${w.word}** ${w.phonetic} — ${w.meaning}`);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
            <div>
              <h1 className="text-lg font-semibold text-white">历史笔记本</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {projects.length} 个翻译项目
              </p>
            </div>
          </div>
          <a
            href="/"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            新建项目
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-lg text-zinc-400 mb-2">暂无历史记录</h2>
            <p className="text-sm text-zinc-600 mb-6">
              创建新的翻译项目开始学习
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              开始第一个项目
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const translatedCount = project.sentences.filter(
                (s) => s.translation.trim()
              ).length;
              const progress = project.sentences.length
                ? Math.round(
                    (translatedCount / project.sentences.length) * 100
                  )
                : 0;

              return (
                <div
                  key={project.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-200 truncate flex-1 mr-2">
                      {project.title}
                    </h3>
                    <span className="text-xs text-zinc-600 shrink-0">
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 line-clamp-2 mb-4 leading-relaxed">
                    {project.originalText.slice(0, 150)}...
                  </p>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-500">
                        {translatedCount}/{project.sentences.length} 句
                      </span>
                      <span className="text-zinc-500">{progress}%</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Vocabulary badge */}
                  {project.vocabulary.length > 0 && (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <svg
                          className="w-3 h-3"
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
                        {project.vocabulary.length} 生词
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleExport(project)}
                      className="text-xs px-3 py-1.5 text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 rounded-md transition-colors"
                    >
                      导出
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="text-xs px-3 py-1.5 text-red-500/60 hover:text-red-400 bg-zinc-800/50 rounded-md transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
