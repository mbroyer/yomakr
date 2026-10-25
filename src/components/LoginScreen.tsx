"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { YoMa } from "./YoMa";

const PIN_LENGTH = 4;

export function LoginScreen() {
  const router = useRouter();
  const [view, setView] = useState<"kid" | "parent">("kid");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(role: "kid" | "parent", secret: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, secret }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace(role === "kid" ? "/lab" : "/eltern");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Das hat nicht geklappt.");
      setPin("");
    }
  }

  function press(digit: string) {
    if (busy) return;
    const next = (pin + digit).slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) void login("kid", next);
  }

  return (
    <main className="login page">
      {view === "kid" ? (
        <div className="card">
          <YoMa size={88} />
          <h1>Hi! Ich bin YoMa.</h1>
          <p className="muted">Gib deine PIN ein, dann legen wir los.</p>
          <div className="pin-dots" aria-label={`${pin.length} von ${PIN_LENGTH} Ziffern`}>
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <span key={i} className={i < pin.length ? "filled" : ""} />
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="pinpad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} onClick={() => press(d)} disabled={busy}>
                {d}
              </button>
            ))}
            <span />
            <button onClick={() => press("0")} disabled={busy}>
              0
            </button>
            <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Löschen" disabled={busy}>
              ⌫
            </button>
          </div>
          <button className="ghost small" onClick={() => { setView("parent"); setError(""); }}>
            Eltern-Bereich
          </button>
        </div>
      ) : (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            void login("parent", password);
          }}
        >
          <h1>Eltern-Bereich</h1>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy || !password}>
            Anmelden
          </button>
          <button type="button" className="ghost small" onClick={() => { setView("kid"); setError(""); }}>
            Zurück
          </button>
        </form>
      )}
    </main>
  );
}
