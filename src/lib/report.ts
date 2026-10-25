import { getDb } from "./db";
import { generateWeeklyReport, type WeeklyReport } from "./claude";
import { getMode } from "./prompts";

export interface StoredReport {
  id: number;
  weekStart: string;
  createdAt: string;
  report: WeeklyReport;
}

export interface WeekStats {
  conversations: number;
  messages: number;
  costUsd: number;
  events: { category: string; count: number }[];
}

function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function weekStats(): WeekStats {
  const db = getDb();
  const since = sevenDaysAgo();
  const usage = db
    .prepare("SELECT COALESCE(SUM(messages), 0) AS messages, COALESCE(SUM(cost_usd), 0) AS cost FROM usage WHERE day >= ?")
    .get(since) as { messages: number; cost: number };
  const conversations = db
    .prepare("SELECT COUNT(*) AS n FROM conversations WHERE date(created_at) >= ?")
    .get(since) as { n: number };
  const events = db
    .prepare("SELECT category, COUNT(*) AS count FROM safety_events WHERE date(created_at) >= ? GROUP BY category ORDER BY count DESC")
    .all(since) as { category: string; count: number }[];
  return { conversations: conversations.n, messages: usage.messages, costUsd: usage.cost, events };
}

export function buildTranscript(): string {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.mode, m.role, m.content, m.created_at
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE date(m.created_at) >= ?
       ORDER BY c.id, m.id`,
    )
    .all(sevenDaysAgo()) as { id: number; mode: string; role: string; content: string; created_at: string }[];

  const parts: string[] = [];
  let current = -1;
  for (const row of rows) {
    if (row.id !== current) {
      current = row.id;
      parts.push(`\n=== Gespräch (${getMode(row.mode)?.title ?? row.mode}), ${row.created_at.slice(0, 10)} ===`);
    }
    parts.push(`${row.role === "user" ? "Kind" : "YoMa"}: ${row.content}`);
  }
  return parts.join("\n").trim();
}

export async function createReport(): Promise<StoredReport | null> {
  const transcript = buildTranscript();
  if (!transcript) return null;
  const report = await generateWeeklyReport(transcript);
  const weekStart = sevenDaysAgo();
  const info = getDb()
    .prepare("INSERT INTO reports (week_start, content) VALUES (?, ?)")
    .run(weekStart, JSON.stringify(report));
  return { id: Number(info.lastInsertRowid), weekStart, createdAt: new Date().toISOString(), report };
}

export function listReports(limit = 8): StoredReport[] {
  const rows = getDb()
    .prepare("SELECT id, week_start, content, created_at FROM reports ORDER BY id DESC LIMIT ?")
    .all(limit) as { id: number; week_start: string; content: string; created_at: string }[];
  return rows.map((r) => ({ id: r.id, weekStart: r.week_start, createdAt: r.created_at, report: JSON.parse(r.content) }));
}
