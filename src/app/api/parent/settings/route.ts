import { NextResponse } from "next/server";
import { z } from "zod";
import { currentRole } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { MODES } from "@/lib/prompts";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const SettingsUpdate = z
  .object({
    paused: z.boolean(),
    allowedFrom: time,
    allowedUntil: time,
    dailyMessageLimit: z.number().int().min(0).max(1000),
    monthlyBudgetUsd: z.number().min(0).max(500),
    enabledModes: z.array(z.enum(MODES.map((m) => m.id) as [string, ...string[]])),
    extraRules: z.string().max(2000),
  })
  .partial();

export async function GET() {
  if ((await currentRole()) !== "parent") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(request: Request) {
  if ((await currentRole()) !== "parent") return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const parsed = SettingsUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Einstellungen." }, { status: 400 });
  return NextResponse.json({ settings: saveSettings(parsed.data) });
}
