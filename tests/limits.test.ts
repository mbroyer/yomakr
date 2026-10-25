import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/db";
import { checkAccess, costUsd, isWithinWindow, localNow, recordUsage } from "@/lib/limits";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "@/lib/settings";

// 12:00 Uhr in Berlin (Winterzeit = UTC+1)
const NOON = new Date("2026-11-10T11:00:00Z");

beforeEach(() => {
  resetDbForTests();
});

describe("Zeitfenster", () => {
  it("erkennt Uhrzeiten im normalen Fenster", () => {
    expect(isWithinWindow("12:00", "07:00", "20:00")).toBe(true);
    expect(isWithinWindow("20:00", "07:00", "20:00")).toBe(false);
    expect(isWithinWindow("06:59", "07:00", "20:00")).toBe(false);
  });

  it("unterstützt Fenster über Mitternacht", () => {
    expect(isWithinWindow("23:30", "22:00", "02:00")).toBe(true);
    expect(isWithinWindow("12:00", "22:00", "02:00")).toBe(false);
  });

  it("rechnet in der Zeitzone der Familie", () => {
    expect(localNow(NOON, "Europe/Berlin")).toEqual({ day: "2026-11-10", time: "12:00", month: "2026-11" });
  });
});

describe("Zugang", () => {
  it("ist mit Standardwerten mittags offen", () => {
    expect(checkAccess(DEFAULT_SETTINGS, NOON)).toEqual({ ok: true });
  });

  it("sperrt bei Pause, außerhalb der Zeit und nach dem Tageslimit", () => {
    expect(checkAccess({ ...DEFAULT_SETTINGS, paused: true }, NOON)).toMatchObject({ ok: false, reason: "paused" });
    expect(checkAccess({ ...DEFAULT_SETTINGS, allowedFrom: "14:00" }, NOON)).toMatchObject({ ok: false, reason: "time" });
    for (let i = 0; i < 3; i++) recordUsage("claude-opus-5-5", { input_tokens: 10, output_tokens: 10 }, true, NOON);
    expect(checkAccess({ ...DEFAULT_SETTINGS, dailyMessageLimit: 3 }, NOON)).toMatchObject({ ok: false, reason: "daily" });
  });

  it("sperrt, wenn das Monatsbudget aufgebraucht ist", () => {
    recordUsage("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 0 }, false, NOON);
    expect(checkAccess({ ...DEFAULT_SETTINGS, monthlyBudgetUsd: 4 }, NOON)).toMatchObject({ ok: false, reason: "budget" });
    expect(checkAccess({ ...DEFAULT_SETTINGS, monthlyBudgetUsd: 5 }, NOON)).toEqual({ ok: true });
  });
});

describe("Kosten und Einstellungen", () => {
  it("berechnet Kosten pro Modell", () => {
    expect(costUsd("claude-haiku-5-5", 1_000_000, 1_000_000)).toBeCloseTo(0.6);
    expect(costUsd("claude-opus-5-5", 1000, 500)).toBeCloseTo(0.014);
  });

  it("speichert Einstellungen dauerhaft und ignoriert unbekannte Schlüssel", () => {
    saveSettings({ dailyMessageLimit: 10, ...({ unbekannt: 1 } as object) });
    expect(getSettings().dailyMessageLimit).toBe(10);
    expect(getSettings()).not.toHaveProperty("unbekannt");
  });
});
