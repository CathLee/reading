import { TranslationProject, CanvasEntry } from "@/types";

const STORAGE_KEY = "reading-app-projects";
const CANVAS_STORAGE_KEY = "reading-app-canvas-history";

export function getProjects(): TranslationProject[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveProject(project: TranslationProject): void {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProject(id: string): TranslationProject | undefined {
  return getProjects().find((p) => p.id === id);
}

// Canvas History Storage
export function getCanvasHistories(): CanvasEntry[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CANVAS_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveCanvasEntry(entry: CanvasEntry): void {
  const histories = getCanvasHistories();
  const index = histories.findIndex((h) => h.id === entry.id);
  if (index >= 0) {
    histories[index] = entry;
  } else {
    histories.unshift(entry);
  }
  localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(histories));
}

export function deleteCanvasEntry(id: string): void {
  const histories = getCanvasHistories().filter((h) => h.id !== id);
  localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(histories));
}

export function getCanvasEntry(id: string): CanvasEntry | undefined {
  return getCanvasHistories().find((h) => h.id === id);
}
