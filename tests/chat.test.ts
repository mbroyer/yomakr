import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, resetDbForTests } from "@/lib/db";
import { saveSettings } from "@/lib/settings";
import { buildSystemPrompt, getMode, MODES } from "@/lib/prompts";

const checkMessage = vi.fn();
const generateReply = vi.fn();

vi.mock("@/lib/claude", () => ({
  checkMessage: (...args: unknown[]) => checkMessage(...args),
  generateReply: (...args: unknown[]) => generateReply(...args),
}));

const { handleChatMessage } = await import("@/lib/chat");

beforeEach(() => {
  resetDbForTests();
  // Immer erlaubt, damit die Tests nicht von der Uhrzeit abhängen.
  saveSettings({ allowedFrom: "00:00", allowedUntil: "00:00" });
  checkMessage.mockReset().mockResolvedValue({ category: "ok", reason: "" });
  generateReply.mockReset().mockResolvedValue({ text: "Gute Frage! Was denkst du?", refused: false });
});

describe("Lern-Chat", () => {
  it("beantwortet eine normale Frage und speichert das Gespräch", async () => {
    const result = await handleChatMessage({ mode: "fragen", text: "Warum ist der Himmel blau?" });
    expect(result).toMatchObject({ ok: true, reply: "Gute Frage! Was denkst du?", blocked: false });
    const rows = getDb().prepare("SELECT role FROM messages").all();
    expect(rows).toHaveLength(2);
    expect(generateReply).toHaveBeenCalledOnce();
  });

  it("lenkt unpassende Themen um, ohne Claude zu fragen, und meldet nur die Kategorie", async () => {
    checkMessage.mockResolvedValueOnce({ category: "unangemessen", reason: "x" });
    const result = await handleChatMessage({ mode: "fragen", text: "etwas Unpassendes" });
    expect(result).toMatchObject({ ok: true, blocked: true });
    expect(generateReply).not.toHaveBeenCalled();
    const events = getDb().prepare("SELECT category, direction FROM safety_events").all();
    expect(events).toEqual([{ category: "unangemessen", direction: "input" }]);
  });

  it("gibt bei Kummer einen Hinweis an Claude weiter und meldet es den Eltern", async () => {
    checkMessage.mockResolvedValueOnce({ category: "kummer", reason: "x" });
    await handleChatMessage({ mode: "fragen", text: "Mir geht es schlecht" });
    expect(generateReply.mock.calls[0][0].operatorNote).toContain("116 111");
    expect(getDb().prepare("SELECT category FROM safety_events").get()).toEqual({ category: "kummer" });
  });

  it("ersetzt eine unpassende Antwort, bevor das Kind sie sieht", async () => {
    checkMessage
      .mockResolvedValueOnce({ category: "ok", reason: "" })
      .mockResolvedValueOnce({ category: "unangemessen", reason: "x" });
    const result = await handleChatMessage({ mode: "geschichten", text: "Erzähl weiter" });
    expect(result).toMatchObject({ ok: true, blocked: true });
    if (result.ok) expect(result.reply).not.toContain("Gute Frage");
  });

  it("respektiert gesperrte Modi und die Pause", async () => {
    saveSettings({ enabledModes: ["fragen"] });
    expect(await handleChatMessage({ mode: "coach", text: "Hallo" })).toMatchObject({ ok: false, status: 400 });
    saveSettings({ paused: true });
    expect(await handleChatMessage({ mode: "fragen", text: "Hallo" })).toMatchObject({ ok: false, status: 403 });
    expect(checkMessage).not.toHaveBeenCalled();
  });

  it("führt ein Gespräch über mehrere Nachrichten fort", async () => {
    const first = await handleChatMessage({ mode: "coach", text: "Ich verstehe Brüche nicht" });
    if (!first.ok) throw new Error("erwartet ok");
    await handleChatMessage({ mode: "coach", text: "Ist 1/2 mehr als 1/3?", conversationId: first.conversationId });
    expect(generateReply.mock.calls[1][0].history).toHaveLength(3);
  });
});

describe("Schutz-Prompt", () => {
  it("enthält Schutzregeln, Modus und Elternregeln", () => {
    const prompt = buildSystemPrompt(getMode("coach")!, { kidName: "Max", extraRules: "Keine Horrorfilme." });
    expect(prompt).toContain("116 111");
    expect(prompt).toContain("niemals die fertige Lösung");
    expect(prompt).toContain("Keine Horrorfilme.");
    expect(prompt).toContain("Max");
  });

  it("hat für jeden Modus einen eigenen Prompt", () => {
    expect(new Set(MODES.map((m) => m.prompt)).size).toBe(MODES.length);
  });
});
