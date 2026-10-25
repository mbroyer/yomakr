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

const HELPERS: { label: string; icon: IconName; prompt: string }[] = [
  { label: "Tipp", icon: "tip", prompt: "Gib mir einen Tipp" },
  { label: "Einfacher", icon: "simpler", prompt: "Erklär's mir einfacher" },
  { label: "Beispiel", icon: "plus", prompt: "Noch ein Beispiel, bitte" },
  { label: "Quiz", icon: "quiz", prompt: "Stell mir eine Quizfrage" },
];

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
            <span className="dot">
              <Logo size={26} />
            </span>
            yomakr
          </div>
          <button className="secondary" onClick={logout}>
            <Icon name="logout" size={20} /> Tschüss
          </button>
        </header>
        <div className="greeting">
          <span className="hello">{kidName ? `Hi ${kidName}!` : "Hi!"}</span>
          <h1>Was machen wir heute?</h1>
        </div>
        <section className="modes">
          {modes.map((m, i) => (
            <button key={m.id} className={`mode c${i % 4}`} onClick={() => start(m)}>
              <span className="top">
                <span className="dot">
                  <Icon name={m.icon} size={28} />
                </span>
                <Icon name="arrow" size={26} />
              </span>
              <span>
                <span className="title">{m.title}</span>
                <span className="tagline">{m.tagline}</span>
              </span>
            </button>
          ))}
        </section>
        <div className="soon" aria-disabled>
          <span className="dot">
            <Icon name="blocks" size={24} />
          </span>
          <span>
            <strong>Werkstatt</strong> · Eigene Spiele und Apps bauen. Kommt bald!
          </span>
        </div>
        {history.length > 0 && (
          <section style={{ marginTop: 32 }}>
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
        <div className="row">
          <button className="secondary round" onClick={() => setMode(null)} aria-label="Zurück">
            <Icon name="back" size={22} />
          </button>
          <div className="chat-title">
            <span className="dot">
              <Icon name={mode.icon} size={22} />
            </span>
            {mode.title}
          </div>
        </div>
      </header>
      <section className="chat">
        <div className="messages">
          {messages.length === 0 && (
            <div className="bubble assistant">
              <YoMaLabel />
              {mode.tagline} Schreib mir oder tippe aufs Mikrofon der Tastatur und sprich einfach.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <>
                  <YoMaLabel />
                  <RichText text={m.content} />
                </>
              ) : (
                m.content
              )}
            </div>
          ))}
          {busy && (
            <div className="thinking">
              <span className="dot">
                <Logo size={20} thinking />
              </span>
              YoMa denkt nach …
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <div ref={bottom} />
        </div>
        {messages.length > 0 && (
          <div className="helpers">
            {HELPERS.map((h) => (
              <button key={h.label} onClick={() => send(h.prompt)} disabled={busy}>
                <Icon name={h.icon} size={24} />
                {h.label}
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
            rows={1}
            value={text}
            placeholder="Frag YoMa irgendwas …"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Senden">
            <Icon name="send" size={24} />
          </button>
        </form>
      </section>
    </main>
  );
}

function YoMaLabel() {
  return (
    <span className="who">
      <span className="dot">
        <Logo size={18} />
      </span>
      YoMa
    </span>
  );
}
