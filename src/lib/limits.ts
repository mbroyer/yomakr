import { getDb } from "./db";
import type { Settings } from "./settings";

export const TIMEZONE = process.env.TIMEZONE || "Europe/Berlin";

/** Datum und Uhrzeit in der Zeitzone der Familie. */
export function localNow(date = new Date(), timeZone = TIMEZONE): { day: string; time: string; month: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    month: `${parts.year}-${parts.month}`,
  };
}

/** "HH:MM" liegt im Fenster [from, until). Fenster über Mitternacht sind erlaubt. */
export function isWithinWindow(time: string, from: string, until: string): boolean {
  if (from === until) return true;
  if (from < until) return time >= from && time < until;
  return time >= from || time < until;
}

export type Block =
  | { ok: true }
  | { ok: false; reason: "paused" | "time" | "daily" | "budget"; message: string };

export function checkAccess(settings: Settings, date = new Date()): Block {
  const now = localNow(date);
  if (settings.paused) {
    return { ok: false, reason: "paused", message: "Yomakr macht gerade Pause. Frag deine Eltern, wann es weitergeht." };
  }
  if (!isWithinWindow(now.time, settings.allowedFrom, settings.allowedUntil)) {
    return {
      ok: false,
      reason: "time",
      message: `Yomakr ist von ${settings.allowedFrom} bis ${settings.allowedUntil} Uhr für dich da. Bis später!`,
    };
  }
  const db = getDb();
  const today = db.prepare("SELECT messages FROM usage WHERE day = ?").get(now.day) as { messages: number } | undefined;
  if ((today?.messages ?? 0) >= settings.dailyMessageLimit) {
    return {
      ok: false,
      reason: "daily",
      message: "Für heute hast du alle Nachrichten verbraucht. Morgen geht's weiter, vielleicht mit einer neuen Idee?",
    };
  }
  const month = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS cost FROM usage WHERE day LIKE ?")
    .get(`${now.month}-%`) as { cost: number };
  if (month.cost >= settings.monthlyBudgetUsd) {
    return {
      ok: false,
      reason: "budget",
      message: "Das Monatsbudget ist aufgebraucht. Sag deinen Eltern Bescheid.",
    };
  }
  return { ok: true };
}

/** Preise pro Million Tokens in US-Dollar (Stand Oktober 2026). */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export function recordUsage(
  model: string,
  usage: { input_tokens: number; output_tokens: number },
  countsAsMessage: boolean,
  date = new Date(),
): void {
  const { day } = localNow(date);
  getDb()
    .prepare(
      `INSERT INTO usage (day, messages, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET
         messages = messages + excluded.messages,
         input_tokens = input_tokens + excluded.input_tokens,
         output_tokens = output_tokens + excluded.output_tokens,
         cost_usd = cost_usd + excluded.cost_usd`,
    )
    .run(
      day,
      countsAsMessage ? 1 : 0,
      usage.input_tokens,
      usage.output_tokens,
      costUsd(model, usage.input_tokens, usage.output_tokens),
    );
}
