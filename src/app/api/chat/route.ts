import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { handleChatMessage } from "@/lib/chat";

export async function POST(request: Request) {
  if ((await currentRole()) !== "kid") {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { conversationId?: number; mode?: string; text?: string };
  try {
    const result = await handleChatMessage({
      conversationId: body.conversationId ? Number(body.conversationId) : undefined,
      mode: String(body.mode ?? ""),
      text: String(body.text ?? ""),
    });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Ich komme gerade nicht an mein Gehirn heran. 🤖 Versuch es gleich nochmal." },
      { status: 502 },
    );
  }
}
