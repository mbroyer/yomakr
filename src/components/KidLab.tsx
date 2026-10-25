"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Icon, type IconName } from "./Icon";
import { RichText } from "./RichText";

interface ModeInfo {
  id: string;
  title: string;
  icon: IconName;
  tagline: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationSummary {
  id: number;
  mode: string;
  title: string;
}

const HELPERS = ["Erklär's mir einfacher", "Gib mir einen Tipp", "Noch ein Beispiel, bitte", "Stell mir eine Quizfrage"];

export function KidLab({ modes, kidName }: { modes: ModeInfo[]; kidName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<ModeInfo | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode) return;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => setHistory(d.conversations ?? []))
      .catch(() => setHistory([]));
  }, [mode]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function start(m: ModeInfo) {
    setMode(m);
    setConversationId(null);
    setMessages([]);
    setError("");
  }

  async function open(c: ConversationSummary) {
    const m = modes.find((x) => x.id === c.mode);
    if (!m) return;
    const res = await fetch(`/api/conversations/${c.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMode(m);
    setConversationId(c.id);
    setMessages(data.messages);
    setError("");
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || busy || !mode) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setText("");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, mode: mode.id, text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Da ist etwas schiefgelaufen.");
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Keine Verbindung. Ist das WLAN an?");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  if (!mode) {
    return (
      <main className="page">
        <header className="topbar">
          <div className="brand">
            <span className="accent">
              <Logo size={36} />
            </span>
            Yomakr
          </div>
          <button className="secondary" onClick={logout}>
            <Icon name="logout" size={20} /> Tschüss
          </button>
        </header>
        <h1>{kidName ? `Hi ${kidName}!` : "Hi!"} Was machen wir heute?</h1>
        <p className="muted">Such dir aus, wie ich dir helfen soll.</p>
        <section className="modes">
          {modes.map((m) => (
            <button key={m.id} className="mode" onClick={() => start(m)}>
              <span className="mode-icon">
                <Icon name={m.icon} size={30} />
              </span>
              <span className="title">{m.title}</span>
              <span className="tagline">{m.tagline}</span>
            </button>
          ))}
          <div className="mode soon" aria-disabled>
            <span className="mode-icon">
              <Icon name="blocks" size={30} />
            </span>
            <span className="title">Werkstatt</span>
            <span className="tagline">Eigene Spiele und Apps bauen. Kommt bald!</span>
          </div>
        </section>
        {history.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2>Weitermachen</h2>
            <div className="history">
              {history.slice(0, 8).map((c) => {
                const m = modes.find((x) => x.id === c.mode);
                if (!m) return null;
                return (
                  <button key={c.id} onClick={() => open(c)}>
                    <Icon name={m.icon} size={20} /> {c.title}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <button className="secondary" onClick={() => setMode(null)}>
          <Icon name="back" size={20} /> Zurück
        </button>
        <div className="brand" style={{ fontSize: 19 }}>
          <Icon name={mode.icon} size={24} /> {mode.title}
        </div>
        <span style={{ width: 90 }} />
      </header>
      <section className="chat">
        <div className="messages">
          {messages.length === 0 && (
            <div className="row" style={{ alignItems: "flex-start" }}>
              <span className="accent">
                <Logo size={44} />
              </span>
              <div className="bubble assistant">{mode.tagline} Schreib mir oder tippe aufs Mikrofon der Tastatur und sprich einfach.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
            </div>
          ))}
          {busy && (
            <div className="thinking">
              <span className="accent">
                <Logo size={28} thinking />
              </span>{" "}
              YoMa denkt nach …
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <div ref={bottom} />
        </div>
        {messages.length > 0 && (
          <div className="helpers">
            {HELPERS.map((h) => (
              <button key={h} onClick={() => send(h)} disabled={busy}>
                {h}
              </button>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <textarea
            rows={2}
            value={text}
            placeholder="Deine Nachricht …"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Senden">
            <Icon name="send" size={26} />
          </button>
        </form>
      </section>
    </main>
  );
}
