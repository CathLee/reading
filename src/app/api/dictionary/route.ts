import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "Missing word parameter" }, { status: 400 });
  }

  try {
    // Use the free dictionary API
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      // Fallback: return a basic structure if not found
      return NextResponse.json({
        word: word,
        phonetic: "",
        meanings: [
          {
            partOfSpeech: "unknown",
            definitions: [{ definition: "No definition found for this word." }],
          },
        ],
      });
    }

    const data = await res.json();
    const entry = data[0];

    const result = {
      word: entry.word,
      phonetic:
        entry.phonetic ||
        entry.phonetics?.find((p: { text?: string }) => p.text)?.text ||
        "",
      audio:
        entry.phonetics?.find((p: { audio?: string }) => p.audio)?.audio || "",
      meanings: entry.meanings.map(
        (m: {
          partOfSpeech: string;
          definitions: Array<{
            definition: string;
            example?: string;
            synonyms?: string[];
          }>;
        }) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: m.definitions.slice(0, 4).map(
            (d: {
              definition: string;
              example?: string;
              synonyms?: string[];
            }) => ({
              definition: d.definition,
              example: d.example || undefined,
              synonyms: d.synonyms?.slice(0, 5) || undefined,
            })
          ),
        })
      ),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dictionary data" },
      { status: 500 }
    );
  }
}
