import { NextRequest, NextResponse } from "next/server";

// Lingva Translate public instances (based on Google Translate)
const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://translate.plausibility.cloud",
  "https://lingva.garuber.com",
];

// Fallback: MyMemory API
async function translateWithMyMemory(text: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`
    );
    if (res.ok) {
      const data = await res.json();
      return data.responseData?.translatedText || null;
    }
  } catch {
    // Ignore error
  }
  return null;
}

// Primary: Lingva Translate API (Google Translate frontend)
async function translateWithLingva(text: string): Promise<string | null> {
  for (const instance of LINGVA_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/en/zh/${encodeURIComponent(text)}`,
        {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.translation) {
          return data.translation;
        }
      }
    } catch {
      // Try next instance
      continue;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Try Lingva first (better quality, based on Google Translate)
    let translation = await translateWithLingva(text);

    // Fallback to MyMemory if Lingva fails
    if (!translation) {
      translation = await translateWithMyMemory(text);
    }

    if (!translation) {
      return NextResponse.json(
        { translation: "Translation unavailable" },
        { status: 200 }
      );
    }

    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
