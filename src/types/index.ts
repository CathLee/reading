export interface VocabWord {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  addedAt: number;
}

export interface DictionaryResult {
  word: string;
  phonetic: string;
  audio?: string;
  meanings: DictionaryMeaning[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface SentencePair {
  id: string;
  english: string;
  translation: string;
}

export interface TranslationProject {
  id: string;
  title: string;
  originalText: string;
  sentences: SentencePair[];
  vocabulary: VocabWord[];
  createdAt: number;
  updatedAt: number;
}

// Canvas Memory types
export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasStroke {
  color: string;
  size: number;
  mode: "pen" | "eraser";
  points: CanvasPoint[];
}

export interface CanvasWord {
  id: string;
  word: string;
  phonetic?: string;
  meaning?: string;
  x: number;
  y: number;
}

export interface CanvasEntry {
  id: string;
  title: string;
  strokes: CanvasStroke[];
  words: CanvasWord[];
  width: number;
  height: number;
  createdAt: number;
}
