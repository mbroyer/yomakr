import { getDb } from "./db";
import { checkMessage, generateReply, type ChatTurn } from "./claude";
import { checkAccess } from "./limits";
import { BLOCKED_REPLIES, buildSystemPrompt, getMode, type ModeId } from "./prompts";
import { getSettings } from "./settings";

export type ChatResult =
  | { ok: true; conversationId: number; reply: string; blocked: boolean }
  | { ok: false; status: number; message: string };

const KUMMER_NOTE =
  "Hinweis der App: Die letzte Nachricht deutet darauf hin, dass es dem Kind nicht gut geht. Antworte besonders warm und ruhig, nimm es ernst, ermutige es, mit seinen Eltern oder einer vertrauten erwachsenen Person zu sprechen, und nenne die Nummer gegen Kummer 116 111 (kostenlos, anonym). Bei akuter Gefahr den Notruf 112.";

const DATEN_NOTE =
  "Hinweis der App: Das Kind hat möglicherweise persönliche Daten genannt. Erkläre kurz und freundlich, dass man so etwas im Internet nicht teilt, wiederhole die Daten nicht und mach dann mit dem Thema weiter.";

function logEvent(category: string, direction: "input" | "output", action: string) {
  getDb()
    .prepare("INSERT INTO safety_events (category, direction, action) VALUES (?, ?, ?)")
    .run(category, direction, action);
}

function saveMessage(conversationId: number, role: "user" | "assistant", content: string) {
  getDb().prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content);
}

export function loadHistory(conversationId: number): ChatTurn[] {
  return getDb()
    .prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id")
    .all(conversationId) as ChatTurn[];
}

export async function handleChatMessage(input: {
  conversationId?: number;
  mode: string;
  text: string;
}): Promise<ChatResult> {
  const text = input.text.trim();
  if (!text) return { ok: false, status: 400, message: "Schreib mir etwas!" };
  if (text.length > 2000) return { ok: false, status: 400, message: "Puh, das ist sehr lang. Kannst du es kürzer sagen?" };

  const settings = getSettings();
  const mode = getMode(input.mode);
  if (!mode || !settings.enabledModes.includes(mode.id)) {
    return { ok: false, status: 400, message: "Diesen Modus gibt es gerade nicht." };
  }
  const access = checkAccess(settings);
  if (!access.ok) return { ok: false, status: 403, message: access.message };

  const db = getDb();
  let conversationId = input.conversationId;
  if (conversationId) {
    const row = db.prepare("SELECT mode FROM conversations WHERE id = ?").get(conversationId) as { mode: ModeId } | undefined;
    if (!row || row.mode !== mode.id) return { ok: false, status: 404, message: "Gespräch nicht gefunden." };
  } else {
    const title = text.length > 40 ? `${text.slice(0, 40)}…` : text;
    conversationId = Number(db.prepare("INSERT INTO conversations (mode, title) VALUES (?, ?)").run(mode.id, title).lastInsertRowid);
  }

  // 1. Nachricht des Kindes prüfen.
  const inputCheck = await checkMessage(text, "input");
  saveMessage(conversationId, "user", text);

  if (inputCheck.category === "unangemessen" || inputCheck.category === "umgehung") {
    logEvent(inputCheck.category, "input", "umgelenkt");
    const reply = BLOCKED_REPLIES[inputCheck.category];
    saveMessage(conversationId, "assistant", reply);
    return { ok: true, conversationId, reply, blocked: true };
  }

  let operatorNote: string | undefined;
  if (inputCheck.category === "kummer") {
    logEvent("kummer", "input", "einfühlsam beantwortet");
    operatorNote = KUMMER_NOTE;
  } else if (inputCheck.category === "persoenliche_daten") {
    logEvent("persoenliche_daten", "input", "Hinweis gegeben");
    operatorNote = DATEN_NOTE;
  }

  // 2. Antwort erzeugen.
  const system = buildSystemPrompt(mode, { kidName: process.env.KID_NAME, extraRules: settings.extraRules });
  const effort = mode.id === "coach" || mode.id === "programmieren" ? "medium" : "low";
  const answer = await generateReply({ system, history: loadHistory(conversationId), operatorNote, effort });

  // 3. Antwort prüfen, bevor das Kind sie sieht.
  let reply = answer.text;
  let blocked = false;
  if (answer.refused || !reply) {
    logEvent("abgelehnt", "output", "ersetzt");
    reply = BLOCKED_REPLIES.ausgabe;
    blocked = true;
  } else {
    const outputCheck = await checkMessage(reply, "output");
    if (outputCheck.category === "unangemessen" || outputCheck.category === "persoenliche_daten") {
      logEvent(outputCheck.category, "output", "ersetzt");
      reply = BLOCKED_REPLIES.ausgabe;
      blocked = true;
    }
  }

  saveMessage(conversationId, "assistant", reply);
  return { ok: true, conversationId, reply, blocked };
}
