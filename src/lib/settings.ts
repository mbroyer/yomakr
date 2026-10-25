import { getDb } from "./db";

export interface Settings {
  /** Zugang komplett gesperrt (Pause-Knopf). */
  paused: boolean;
  /** Erlaubte Uhrzeit, "HH:MM" in der Zeitzone TIMEZONE. */
  allowedFrom: string;
  allowedUntil: string;
  /** Maximale Nachrichten des Kindes pro Tag. */
  dailyMessageLimit: number;
  /** Monatsbudget in US-Dollar (die API rechnet in Dollar ab). */
  monthlyBudgetUsd: number;
  /** Freigeschaltete Lern-Modi. */
  enabledModes: string[];
  /** Zusätzliche Regeln der Eltern für den Schutz-Prompt. */
  extraRules: string;
}

export const DEFAULT_SETTINGS: Settings = {
  paused: false,
  allowedFrom: "07:00",
  allowedUntil: "20:00",
  dailyMessageLimit: 60,
  monthlyBudgetUsd: 20,
  enabledModes: ["coach", "fragen", "geschichten", "programmieren"],
  extraRules: "",
};

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored: Partial<Settings> = {};
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) {
      (stored as Record<string, unknown>)[row.key] = JSON.parse(row.value);
    }
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(update: Partial<Settings>): Settings {
  const insert = getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  for (const [key, value] of Object.entries(update)) {
    if (key in DEFAULT_SETTINGS && value !== undefined) insert.run(key, JSON.stringify(value));
  }
  return getSettings();
}
