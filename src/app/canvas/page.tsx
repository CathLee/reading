"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  VocabWord,
  CanvasStroke,
  CanvasWord,
  CanvasEntry,
  CanvasPoint,
} from "@/types";
import {
  getProjects,
  getCanvasHistories,
  saveCanvasEntry,
  deleteCanvasEntry,
} from "@/lib/storage";

// Pen color palette - earthy inks on cream paper
const PEN_COLORS = [
  { name: "sepia", value: "#8a4a1f" },
  { name: "ink", value: "#1f2937" },
  { name: "rouge", value: "#b54848" },
  { name: "indigo", value: "#2d4a7a" },
  { name: "leaf", value: "#3f6b3a" },
];
const PEN_SIZES = [1.6, 2.8, 4.5, 7];

// Canvas dimensions
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;

// Helper: paint strokes onto a 2D context
function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: CanvasStroke[],
  scale = 1
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (!s.points || s.points.length === 0) continue;
    ctx.globalCompositeOperation =
      s.mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * scale;
    ctx.beginPath();
    const p0 = s.points[0];
    ctx.moveTo(p0.x * scale, p0.y * scale);
    if (s.points.length === 1) {
      ctx.lineTo(p0.x * scale + 0.01, p0.y * scale + 0.01);
    } else {
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        ctx.lineTo(p.x * scale, p.y * scale);
      }
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

// Helper: compose thumbnail
function composeThumbnail(
  strokes: CanvasStroke[],
  words: CanvasWord[],
  canvasW: number,
  canvasH: number,
  outW = 480
): string {
  const scale = outW / canvasW;
  const outH = Math.round(canvasH * scale);
  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext("2d")!;

  // paper background
  ctx.fillStyle = "#f6f1e7";
  ctx.fillRect(0, 0, outW, outH);
  // dot grid
  ctx.fillStyle = "#d9cfb7";
  const step = 22 * scale;
  for (let y = step / 2; y < outH; y += step) {
    for (let x = step / 2; x < outW; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.6, 1 * scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // strokes
  paintStrokes(ctx, strokes, scale);
  // word labels
  ctx.fillStyle = "#5b3417";
  ctx.font = `${Math.max(10, 14 * scale)}px ui-sans-serif, system-ui`;
  ctx.textBaseline = "top";
  for (const w of words) {
    const padX = 6 * scale,
      padY = 3 * scale;
    const text = w.word;
    const metrics = ctx.measureText(text);
    const bw = metrics.width + padX * 2;
    const bh = 18 * scale;
    ctx.fillStyle = "rgba(255, 252, 244, 0.94)";
    ctx.strokeStyle = "#a06535";
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.beginPath();
    ctx.rect(w.x * scale, w.y * scale, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#5b3417";
    ctx.fillText(text, w.x * scale + padX, w.y * scale + padY);
  }
  return c.toDataURL("image/png");
}

// Helper: format relative time
function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

interface ToolState {
  color: string;
  size: number;
  mode: "pen" | "eraser";
}

export default function CanvasPage() {
  const [view, setView] = useState<"canvas" | "history" | "detail">("canvas");
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [history, setHistory] = useState<CanvasEntry[]>([]);
  const [detail, setDetail] = useState<CanvasEntry | null>(null);
  const [toast, setToast] = useState("");

  // Active canvas state
  const [activeWords, setActiveWords] = useState<CanvasWord[]>([]);
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasStroke[]>([]);

  // Load vocabulary from all projects and history from localStorage
  useEffect(() => {
    const projects = getProjects();
    const allVocab = projects.flatMap((p) => p.vocabulary);
    // Dedupe by word (case-insensitive)
    const seen = new Set<string>();
    const deduped = allVocab.filter((w) => {
      const key = w.word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setVocab(deduped);
    setHistory(getCanvasHistories());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }, []);

  const handleSave = useCallback(
    (title: string) => {
      const entry: CanvasEntry = {
        id: uuidv4(),
        title:
          title ||
          `画布 · ${new Date().toLocaleString("zh-CN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
        createdAt: Date.now(),
        strokes,
        words: activeWords,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      };
      saveCanvasEntry(entry);
      setHistory((h) => [entry, ...h]);
      showToast("已保存到历史画布");
    },
    [strokes, activeWords, showToast]
  );

  const handleClearCanvas = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    setActiveWords([]);
  }, []);

  const handleDeleteHistory = useCallback((id: string) => {
    deleteCanvasEntry(id);
    setHistory((arr) => arr.filter((x) => x.id !== id));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      <Header
        view={view}
        onView={(v) => {
          setDetail(null);
          setView(v);
        }}
        historyCount={history.length}
      />
      {view === "canvas" && (
        <CanvasView
          vocab={vocab}
          activeWords={activeWords}
          setActiveWords={setActiveWords}
          strokes={strokes}
          setStrokes={setStrokes}
          redoStack={redoStack}
          setRedoStack={setRedoStack}
          onSave={handleSave}
          onClearAll={handleClearCanvas}
        />
      )}
      {view === "history" && (
        <HistoryView
          history={history}
          onOpen={(h) => {
            setDetail(h);
            setView("detail");
          }}
          onDelete={handleDeleteHistory}
          onBackToCanvas={() => setView("canvas")}
        />
      )}
      {view === "detail" && detail && (
        <DetailView entry={detail} onBack={() => setView("history")} />
      )}
      {toast && (
        <div className="fixed left-1/2 bottom-8 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm shadow-lg shadow-emerald-500/30 z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// Header component
function Header({
  view,
  onView,
  historyCount,
}: {
  view: "canvas" | "history" | "detail";
  onView: (v: "canvas" | "history" | "detail") => void;
  historyCount: number;
}) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <a
          href="/"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="返回阅读"
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
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </a>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/30 to-amber-500/20 ring-1 ring-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-emerald-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 17l6-6 4 4 7-7M14 8h7v7"
              />
            </svg>
          </span>
          <h1 className="text-sm font-medium text-zinc-200">画布记词</h1>
          <span className="text-[11px] text-zinc-500 ml-1">Memory Canvas</span>
        </div>
      </div>

      {/* Segmented control */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
        <SegBtn active={view === "canvas"} onClick={() => onView("canvas")}>
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 17l3.5-3.5L9 16l5-5 7 7M3 3h18v18H3z"
            />
          </svg>
          画布
        </SegBtn>
        <SegBtn
          active={view === "history" || view === "detail"}
          onClick={() => onView("history")}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h10"
            />
          </svg>
          历史画布
          <span className="ml-1 text-[10px] text-zinc-500">{historyCount}</span>
        </SegBtn>
      </div>

      <div className="text-xs text-zinc-500">
        <span className="hidden md:inline">画出脑海里的场景 · 把单词钉在画上</span>
      </div>
    </header>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-zinc-800 text-emerald-300"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// Canvas View
function CanvasView({
  vocab,
  activeWords,
  setActiveWords,
  strokes,
  setStrokes,
  redoStack,
  setRedoStack,
  onSave,
  onClearAll,
}: {
  vocab: VocabWord[];
  activeWords: CanvasWord[];
  setActiveWords: React.Dispatch<React.SetStateAction<CanvasWord[]>>;
  strokes: CanvasStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<CanvasStroke[]>>;
  redoStack: CanvasStroke[];
  setRedoStack: React.Dispatch<React.SetStateAction<CanvasStroke[]>>;
  onSave: (title: string) => void;
  onClearAll: () => void;
}) {
  const [tool, setTool] = useState<ToolState>({
    color: PEN_COLORS[0].value,
    size: PEN_SIZES[1],
    mode: "pen",
  });
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const placeWord = useCallback(
    (w: VocabWord) => {
      if (
        activeWords.some(
          (aw) => aw.word.toLowerCase() === w.word.toLowerCase()
        )
      )
        return;
      const x = 80 + Math.random() * 100;
      const y = 80 + Math.random() * 80 + ((activeWords.length * 18) % 240);
      setActiveWords((arr) => [
        ...arr,
        {
          id: uuidv4(),
          word: w.word,
          phonetic: w.phonetic,
          meaning: w.meaning,
          x,
          y,
        },
      ]);
    },
    [activeWords, setActiveWords]
  );

  const updateWord = useCallback(
    (id: string, patch: Partial<CanvasWord>) => {
      setActiveWords((arr) =>
        arr.map((w) => (w.id === id ? { ...w, ...patch } : w))
      );
    },
    [setActiveWords]
  );

  const removeWord = useCallback(
    (id: string) => {
      setActiveWords((arr) => arr.filter((w) => w.id !== id));
    },
    [setActiveWords]
  );

  const undo = useCallback(() => {
    setStrokes((s) => {
      if (s.length === 0) return s;
      const last = s[s.length - 1];
      setRedoStack((r) => [...r, last]);
      return s.slice(0, -1);
    });
  }, [setStrokes, setRedoStack]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const last = r[r.length - 1];
      setStrokes((s) => [...s, last]);
      return r.slice(0, -1);
    });
  }, [setStrokes, setRedoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "e" || e.key === "E") {
        setTool((t) => ({ ...t, mode: t.mode === "eraser" ? "pen" : "eraser" }));
      } else if (e.key === "b" || e.key === "B") {
        setTool((t) => ({ ...t, mode: "pen" }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: vocab palette */}
      <aside className="w-[240px] shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13M3 6.253C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253M12 6.253C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253"
              />
            </svg>
            生词板
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">点击 → 钉到画布上</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {vocab.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-xs">
              <p>还没有生词</p>
              <p className="mt-1 text-zinc-600">在翻译项目中添加生词后，就会显示在这里</p>
            </div>
          ) : (
            vocab.map((w) => {
              const placed = activeWords.some(
                (aw) => aw.word.toLowerCase() === w.word.toLowerCase()
              );
              return (
                <button
                  key={w.id}
                  onClick={() => placeWord(w)}
                  disabled={placed}
                  className={`w-full text-left px-4 py-2.5 border-l-2 transition-all ${
                    placed
                      ? "border-emerald-500/60 bg-emerald-500/5 cursor-default"
                      : "border-transparent hover:bg-zinc-800/40 hover:border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        placed ? "text-emerald-400/80" : "text-emerald-400"
                      }`}
                    >
                      {w.word}
                    </span>
                    {placed ? (
                      <span className="text-[10px] text-emerald-400/80">
                        在画布上
                      </span>
                    ) : (
                      <svg
                        className="w-3.5 h-3.5 text-zinc-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 5v14M5 12h14"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {w.phonetic}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                    {w.meaning}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
          <span className="text-zinc-400">提示：</span>把要记的单词钉上画布，
          然后用笔画出它们之间的故事和场景。
        </div>
      </aside>

      {/* Center: drawing area */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Toolbar
          tool={tool}
          setTool={setTool}
          canUndo={strokes.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onClearStrokes={() => {
            setRedoStack([]);
            setStrokes([]);
          }}
          onClearAll={onClearAll}
          onSave={() => setShowSavePrompt(true)}
        />
        <div className="flex-1 min-h-0 bg-zinc-950 p-5 flex items-center justify-center overflow-auto">
          <Stage
            tool={tool}
            strokes={strokes}
            setStrokes={setStrokes}
            setRedoStack={setRedoStack}
            words={activeWords}
            updateWord={updateWord}
            removeWord={removeWord}
          />
        </div>
      </main>

      {showSavePrompt && (
        <SavePromptModal
          onCancel={() => setShowSavePrompt(false)}
          onConfirm={(title) => {
            onSave(title);
            setShowSavePrompt(false);
          }}
          preview={{ strokes, words: activeWords }}
        />
      )}
    </div>
  );
}

// Toolbar component
function Toolbar({
  tool,
  setTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearStrokes,
  onClearAll,
  onSave,
}: {
  tool: ToolState;
  setTool: React.Dispatch<React.SetStateAction<ToolState>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearStrokes: () => void;
  onClearAll: () => void;
  onSave: () => void;
}) {
  const isEraser = tool.mode === "eraser";
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0 flex-wrap">
      {/* Pen / Eraser toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
        <button
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            !isEraser
              ? "text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          }`}
          onClick={() => setTool((t) => ({ ...t, mode: "pen" }))}
          title="画笔 (B)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536M9 11l8.586-8.586a2 2 0 112.828 2.828L11.828 13.828A4 4 0 019 15H6v-3a4 4 0 011.172-2.828z"
            />
          </svg>
        </button>
        <button
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            isEraser
              ? "text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          }`}
          onClick={() => setTool((t) => ({ ...t, mode: "eraser" }))}
          title="橡皮擦 (E)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 17l6 4 12-12-6-6L3 15v2zM10 7l7 7"
            />
          </svg>
        </button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1.5">
        {PEN_COLORS.map((c) => {
          const active = !isEraser && tool.color === c.value;
          return (
            <button
              key={c.value}
              onClick={() =>
                setTool((t) => ({ ...t, color: c.value, mode: "pen" }))
              }
              title={c.name}
              className={`w-6 h-6 rounded-full transition-transform ${
                active
                  ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-110"
                  : "ring-1 ring-zinc-700 hover:scale-110"
              }`}
              style={{ backgroundColor: c.value }}
            />
          );
        })}
      </div>

      <div className="w-px h-6 bg-zinc-800" />

      {/* Sizes */}
      <div className="flex items-center gap-1">
        {PEN_SIZES.map((s) => {
          const active = tool.size === s;
          return (
            <button
              key={s}
              onClick={() => setTool((t) => ({ ...t, size: s }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                active
                  ? "bg-zinc-800 ring-1 ring-emerald-500/30"
                  : "hover:bg-zinc-900"
              }`}
              title={`${s}px`}
            >
              <span
                className="block rounded-full"
                style={{
                  width: Math.min(18, s * 2.4) + "px",
                  height: Math.min(18, s * 2.4) + "px",
                  background: isEraser ? "#d4d4d8" : tool.color,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-zinc-800" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
        title="撤销 (Ctrl+Z)"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h11a5 5 0 110 10h-3M3 10l4-4M3 10l4 4"
          />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
        title="重做 (Ctrl+Shift+Z)"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 10H10a5 5 0 100 10h3M21 10l-4-4M21 10l-4 4"
          />
        </svg>
      </button>

      <button
        onClick={onClearStrokes}
        className="text-xs text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-zinc-900 transition-colors"
        title="清空笔迹（保留单词）"
      >
        清空笔迹
      </button>
      <button
        onClick={onClearAll}
        className="text-xs text-zinc-500 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-zinc-900 transition-colors"
        title="清空全部"
      >
        全部清空
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] text-zinc-600 hidden lg:inline">
          B 笔 · E 擦 · Ctrl+Z 撤销
        </span>
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          保存这张画
        </button>
      </div>
    </div>
  );
}

// Stage component (the paper + canvas + word chips)
const Stage = memo(function Stage({
  tool,
  strokes,
  setStrokes,
  setRedoStack,
  words,
  updateWord,
  removeWord,
}: {
  tool: ToolState;
  strokes: CanvasStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<CanvasStroke[]>>;
  setRedoStack: React.Dispatch<React.SetStateAction<CanvasStroke[]>>;
  words: CanvasWord[];
  updateWord: (id: string, patch: Partial<CanvasWord>) => void;
  removeWord: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<CanvasStroke | null>(null);
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(
    null
  );

  // Render strokes whenever they change
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    paintStrokes(ctx, strokes);
    if (drawingRef.current) paintStrokes(ctx, [drawingRef.current]);
  }, [strokes]);

  const getPos = (e: React.PointerEvent): CanvasPoint => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    const p = getPos(e);
    drawingRef.current = {
      mode: tool.mode,
      color: tool.color,
      size: tool.size,
      points: [p],
    };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && drawingRef.current)
      paintStrokes(ctx, [drawingRef.current]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    drawingRef.current.points.push(p);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pts = drawingRef.current.points;
    const a = pts[pts.length - 2],
      b = pts[pts.length - 1];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      drawingRef.current.mode === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = drawingRef.current.color;
    ctx.lineWidth = drawingRef.current.size;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
    const finished = drawingRef.current;
    drawingRef.current = null;
    setStrokes((s) => [...s, finished]);
    setRedoStack([]);
  };

  // Chip drag
  const onChipPointerDown = (e: React.PointerEvent, chip: CanvasWord) => {
    e.stopPropagation();
    const rect = wrapRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    draggingRef.current = { id: chip.id, dx: cx - chip.x, dy: cy - chip.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    (e.currentTarget as HTMLElement).classList.add("dragging");
  };

  const onChipPointerMove = (e: React.PointerEvent) => {
    const d = draggingRef.current;
    if (!d) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const nx = Math.max(0, Math.min(CANVAS_WIDTH - 80, cx - d.dx));
    const ny = Math.max(0, Math.min(CANVAS_HEIGHT - 24, cy - d.dy));
    updateWord(d.id, { x: nx, y: ny });
  };

  const onChipPointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    (e.currentTarget as HTMLElement).classList.remove("dragging");
  };

  return (
    <div
      ref={wrapRef}
      className="relative rounded-md border border-amber-900/20 select-none shadow-[0_1px_0_rgba(255,255,255,.04)_inset,0_30px_60px_-30px_rgba(0,0,0,.6)]"
      style={{
        width: "min(100%, 1100px)",
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        backgroundColor: "#f6f1e7",
        backgroundImage: "radial-gradient(circle, #c9bfa6 1px, transparent 1.2px)",
        backgroundSize: "22px 22px",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className={`absolute inset-0 w-full h-full rounded-md ${
          tool.mode === "eraser"
            ? "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22><rect x=%224%22 y=%224%22 width=%2216%22 height=%2216%22 rx=%223%22 fill=%22none%22 stroke=%22%233b2c1a%22 stroke-width=%221.4%22/></svg>')_12_12,_cell]"
            : "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22><circle cx=%2210%22 cy=%2210%22 r=%223.5%22 fill=%22none%22 stroke=%22%233b2c1a%22 stroke-width=%221.2%22/></svg>')_10_10,_crosshair]"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {/* Word chips overlay */}
      {words.map((w) => (
        <div
          key={w.id}
          className="absolute group rounded-md pl-2.5 pr-1.5 py-1 text-[13px] font-medium cursor-grab flex items-center gap-1.5 bg-[rgba(255,252,244,0.92)] border border-dashed border-[#a06535] text-[#5b3417] backdrop-blur-sm shadow-[0_1px_0_rgba(160,101,53,0.15)]"
          style={{
            left: `${(w.x / CANVAS_WIDTH) * 100}%`,
            top: `${(w.y / CANVAS_HEIGHT) * 100}%`,
          }}
          onPointerDown={(e) => onChipPointerDown(e, w)}
          onPointerMove={onChipPointerMove}
          onPointerUp={onChipPointerUp}
          onPointerCancel={onChipPointerUp}
          title={w.meaning}
        >
          <span>{w.word}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeWord(w.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-sm text-amber-900/60 hover:text-rose-700 hover:bg-amber-900/10 flex items-center justify-center transition-opacity"
            title="移除"
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
      {/* Empty hint */}
      {words.length === 0 && strokes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ color: "#a08a66" }}>
            <div className="text-sm">从左侧点一个单词，把它钉到画布上</div>
            <div className="text-xs mt-1">然后开始画 — 用画面记住它的意思</div>
          </div>
        </div>
      )}
    </div>
  );
});

// Save Modal
function SavePromptModal({
  onCancel,
  onConfirm,
  preview,
}: {
  onCancel: () => void;
  onConfirm: (title: string) => void;
  preview: { strokes: CanvasStroke[]; words: CanvasWord[] };
}) {
  const [title, setTitle] = useState("");
  const dataUrl = useMemo(
    () =>
      composeThumbnail(
        preview.strokes,
        preview.words,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        520
      ),
    [preview]
  );

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-zinc-200 mb-3">
          保存到历史画布
        </h3>
        <div className="rounded-lg overflow-hidden border border-zinc-800 mb-4">
          <img src={dataUrl} alt="preview" className="w-full block" />
        </div>
        <label className="block text-xs text-zinc-500 mb-1.5">
          取个名字（可选）
        </label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：工厂车间 · 拆卸场景"
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/40 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm(title.trim());
          }}
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(title.trim())}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// History View
function HistoryView({
  history,
  onOpen,
  onDelete,
  onBackToCanvas,
}: {
  history: CanvasEntry[];
  onOpen: (h: CanvasEntry) => void;
  onDelete: (id: string) => void;
  onBackToCanvas: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-200">历史画布</h2>
            <p className="text-sm text-zinc-500 mt-1">
              每一张画背后，是几个你想记住的单词。
            </p>
          </div>
          <button
            onClick={onBackToCanvas}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white"
          >
            + 新画一张
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-24 text-zinc-500 text-sm">
            还没有保存的画 — 去画布上画一张吧
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {history.map((h) => (
              <HistoryCard
                key={h.id}
                entry={h}
                onOpen={() => onOpen(h)}
                onDelete={() => onDelete(h.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({
  entry,
  onOpen,
  onDelete,
}: {
  entry: CanvasEntry;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const thumb = useMemo(
    () => composeThumbnail(entry.strokes, entry.words, entry.width, entry.height, 600),
    [entry]
  );
  const when = useMemo(() => formatWhen(entry.createdAt), [entry.createdAt]);

  return (
    <div
      className="group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,.25)]"
      onClick={onOpen}
    >
      <div className="relative">
        <img src={thumb} alt={entry.title} className="w-full block" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("删除这张画?")) onDelete();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md bg-zinc-950/70 backdrop-blur-sm text-zinc-300 hover:text-rose-400 flex items-center justify-center transition-opacity"
          title="删除"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
            />
          </svg>
        </button>
      </div>
      <div className="p-3.5">
        <div className="text-sm text-zinc-200 font-medium truncate">
          {entry.title}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-wrap gap-1">
            {entry.words.slice(0, 4).map((w) => (
              <span
                key={w.id}
                className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/15"
              >
                {w.word}
              </span>
            ))}
            {entry.words.length > 4 && (
              <span className="text-[11px] text-zinc-500">
                +{entry.words.length - 4}
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 shrink-0 ml-2">
            {when}
          </span>
        </div>
      </div>
    </div>
  );
}

// Detail View
function DetailView({
  entry,
  onBack,
}: {
  entry: CanvasEntry;
  onBack: () => void;
}) {
  const thumb = useMemo(
    () => composeThumbnail(entry.strokes, entry.words, entry.width, entry.height, 1400),
    [entry]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-6">
        <button
          onClick={onBack}
          className="text-xs text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1.5 mb-4"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回历史画布
        </button>
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-zinc-200">
              {entry.title}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {new Date(entry.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={thumb}
              download={`${entry.title || "canvas"}.png`}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            >
              下载图片
            </a>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/40 shadow-[0_1px_0_rgba(255,255,255,.04)_inset,0_30px_60px_-30px_rgba(0,0,0,.6)]">
            <img src={thumb} alt={entry.title} className="w-full block" />
          </div>
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
              画里的单词
            </div>
            <ul className="space-y-3">
              {entry.words.map((w) => (
                <li key={w.id} className="border-l-2 border-emerald-500/40 pl-3">
                  <div className="text-sm font-medium text-emerald-300">
                    {w.word}
                  </div>
                  {w.phonetic && (
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {w.phonetic}
                    </div>
                  )}
                  {w.meaning && (
                    <div className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
                      {w.meaning}
                    </div>
                  )}
                </li>
              ))}
              {entry.words.length === 0 && (
                <li className="text-xs text-zinc-500">这张画没有钉单词</li>
              )}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
