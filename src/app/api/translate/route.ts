import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Use MyMemory free translation API (no key needed)
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
    );

    if (!res.ok) {
      return NextResponse.json(
        { translation: "Translation unavailable" },
        { status: 200 }
      );
    }

    const data = await res.json();
    const translation =
      data.responseData?.translatedText || "Translation unavailable";

    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
