"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/settings";
import type { StoredReport, WeekStats } from "@/lib/report";
import { YoMa } from "./YoMa";

export interface Alert {
  id: number;
  category: string;
  direction: "input" | "output";
  action: string;
  seen: number;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; tone: "bad" | "warn" | "" }> = {
  kummer: { label: "Kummer-Signal", tone: "bad" },
  unangemessen: { label: "Unpassendes Thema", tone: "warn" },
  umgehung: { label: "Regeln umgehen", tone: "warn" },
  persoenliche_daten: { label: "Persönliche Daten", tone: "warn" },
  abgelehnt: { label: "Antwort abgelehnt", tone: "" },
};

function formatDate(sqlDate: string): string {
  return new Date(`${sqlDate.replace(" ", "T")}Z`).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export function ParentDashboard(props: {
  initialSettings: Settings;
  alerts: Alert[];
  stats: WeekStats;
  reports: StoredReport[];
  modes: { id: string; title: string; emoji: string }[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(props.initialSettings);
  const [saved, setSaved] = useState("");
  const [reports, setReports] = useState(props.reports);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const unseenKummer = props.alerts.filter((a) => !a.seen && a.category === "kummer").length;

  async function save(update: Partial<Settings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    setSaved("Speichert …");
    const res = await fetch("/api/parent/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setSaved(res.ok ? "Gespeichert ✓" : "Speichern fehlgeschlagen");
  }

  async function makeReport() {
    setReportBusy(true);
    setReportError("");
    const res = await fetch("/api/parent/report", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setReportBusy(false);
    if (res.ok) setReports([data.report, ...reports]);
    else setReportError(data.error ?? "Fehler beim Erstellen.");
  }

  async function markSeen() {
    await fetch("/api/parent/alerts", { method: "POST" });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const latest = reports[0];

  return (
    <main className="page stack">
      <header className="topbar">
        <div className="brand">
          <YoMa size={40} /> Eltern-Bereich
        </div>
        <button className="secondary" onClick={logout}>
          Abmelden
        </button>
      </header>

      {unseenKummer > 0 && (
        <div className="card banner">
          <h2>Bitte sprich mit deinem Kind</h2>
          <p>
            YoMa hat in letzter Zeit {unseenKummer === 1 ? "ein Kummer-Signal" : `${unseenKummer} Kummer-Signale`} erkannt. Die Inhalte
            bleiben privat, YoMa hat einfühlsam geantwortet und auf die Nummer gegen Kummer (116 111) hingewiesen. Ein ruhiges
            Gespräch ist jetzt wahrscheinlich das Wichtigste.
          </p>
          <button className="secondary" onClick={markSeen}>
            Gesehen
          </button>
        </div>
      )}

      <section className="grid">
        <div className="card">
          <p className="muted small">Letzte 7 Tage</p>
          <div className="stat">{props.stats.messages} Nachrichten</div>
          <p className="muted small">in {props.stats.conversations} Gesprächen</p>
        </div>
        <div className="card">
          <p className="muted small">Kosten letzte 7 Tage (geschätzt)</p>
          <div className="stat">{props.stats.costUsd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
          <p className="muted small">Monatsbudget: {settings.monthlyBudgetUsd} $</p>
        </div>
        <div className="card">
          <p className="muted small">Zugang</p>
          <div className="stat">{settings.paused ? "⏸ Pausiert" : "▶ Aktiv"}</div>
          <button className={settings.paused ? "" : "secondary"} onClick={() => save({ paused: !settings.paused })}>
            {settings.paused ? "Fortsetzen" : "Pause"}
          </button>
        </div>
      </section>

      <section className="card stack">
        <div className="row spread">
          <h2>Wochenbericht</h2>
          <button onClick={makeReport} disabled={reportBusy}>
            {reportBusy ? "Wird erstellt …" : "Neuen Bericht erstellen"}
          </button>
        </div>
        <p className="muted small">
          Der Bericht fasst Themen und Lernfortschritt zusammen. Die Chats selbst kannst du hier bewusst nicht lesen.
        </p>
        {reportError && <p className="error">{reportError}</p>}
        {latest ? (
          <div className="stack">
            <p className="muted small">Erstellt am {formatDate(latest.createdAt.replace("T", " ").slice(0, 19))}</p>
            <p>{latest.report.zusammenfassung}</p>
            <h3>Themen</h3>
            <ul className="clean">
              {latest.report.themen.map((t, i) => (
                <li key={i}>
                  <strong>{t.titel}:</strong> {t.beschreibung}
                </li>
              ))}
            </ul>
            <h3>Gelernt und geübt</h3>
            <ul className="clean">
              {latest.report.gelernt.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            <h3>Stärken</h3>
            <p>{latest.report.staerken}</p>
            <h3>Ideen für euch</h3>
            <ul className="clean">
              {latest.report.anregungen.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted">Noch kein Bericht. Tippe auf „Neuen Bericht erstellen“, sobald dein Kind Yomakr genutzt hat.</p>
        )}
      </section>

      <section className="card stack">
        <div className="row spread">
          <h2>Einstellungen</h2>
          <span className="muted small">{saved}</span>
        </div>
        <div className="grid">
          <div className="field">
            <label htmlFor="from">Erlaubt ab</label>
            <input id="from" type="time" value={settings.allowedFrom} onChange={(e) => save({ allowedFrom: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="until">Erlaubt bis</label>
            <input id="until" type="time" value={settings.allowedUntil} onChange={(e) => save({ allowedUntil: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="daily">Nachrichten pro Tag</label>
            <input
              id="daily"
              type="number"
              min={0}
              max={1000}
              value={settings.dailyMessageLimit}
              onChange={(e) => save({ dailyMessageLimit: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="budget">Monatsbudget (US-Dollar)</label>
            <input
              id="budget"
              type="number"
              min={0}
              max={500}
              value={settings.monthlyBudgetUsd}
              onChange={(e) => save({ monthlyBudgetUsd: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="field">
          <label>Freigeschaltete Modi</label>
          {props.modes.map((m) => (
            <label key={m.id} className="toggle">
              <input
                type="checkbox"
                checked={settings.enabledModes.includes(m.id)}
                onChange={(e) =>
                  save({
                    enabledModes: e.target.checked
                      ? [...settings.enabledModes, m.id]
                      : settings.enabledModes.filter((x) => x !== m.id),
                  })
                }
              />
              {m.emoji} {m.title}
            </label>
          ))}
        </div>
        <div className="field">
          <label htmlFor="rules">Zusätzliche Regeln für YoMa</label>
          <textarea
            id="rules"
            rows={3}
            placeholder="z. B. Bitte keine Themen rund um Horrorfilme. Er interessiert sich sehr für Weltraum."
            defaultValue={settings.extraRules}
            onBlur={(e) => e.target.value !== settings.extraRules && save({ extraRules: e.target.value })}
          />
        </div>
      </section>

      <section className="card stack">
        <div className="row spread">
          <h2>Hinweise</h2>
          {props.alerts.some((a) => !a.seen) && (
            <button className="secondary" onClick={markSeen}>
              Alle gesehen
            </button>
          )}
        </div>
        <p className="muted small">Nur Art und Zeitpunkt, ohne Chat-Inhalt.</p>
        {props.alerts.length === 0 ? (
          <p className="muted">Keine Hinweise. 👍</p>
        ) : (
          <ul className="clean">
            {props.alerts.map((a) => {
              const info = CATEGORY_LABELS[a.category] ?? { label: a.category, tone: "" };
              return (
                <li key={a.id} style={{ marginBottom: 6, fontWeight: a.seen ? 400 : 600 }}>
                  <span className={`pill ${info.tone}`}>{info.label}</span> {formatDate(a.createdAt)} · {a.action}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
