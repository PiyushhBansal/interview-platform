import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { DeepgramClient } from "@deepgram/sdk";

// Receives an audio blob, returns the transcript text.
// POST body: raw audio bytes (audio/webm). Auth-gated.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "DEEPGRAM_API_KEY not set. Add it to .env.local to enable voice transcription.",
        transcript: "",
      },
      { status: 200 }
    );
  }

  try {
    const arrayBuf = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length === 0) {
      return NextResponse.json({ transcript: "" });
    }

    const client = new DeepgramClient({ auth: { apiKey: key } });

    const result = await client.listen.v1.media.transcribeFile(buffer, {
      model: "nova-2",
      smart_format: true,
      punctuate: true,
    });

    // Synchronous transcription returns ListenV1Response (has `results`).
    const transcript =
      "results" in result
        ? result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ""
        : "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json(
      { error: "Transcription failed", transcript: "" },
      { status: 200 }
    );
  }
}
