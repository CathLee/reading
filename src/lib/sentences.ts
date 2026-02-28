import { v4 as uuidv4 } from "uuid";
import { SentencePair } from "@/types";

export function splitIntoSentences(text: string): SentencePair[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split on sentence-ending punctuation while keeping the punctuation
  // Handles: periods, question marks, exclamation marks, and ellipsis
  // Avoids splitting on abbreviations like Mr. Mrs. Dr. etc.
  const parts = trimmed.split(/(?<=[.!?…])\s+(?=[A-Z"\u201c])/);

  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({
      id: uuidv4(),
      english: s,
      translation: "",
    }));
}
