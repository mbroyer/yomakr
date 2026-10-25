# Yomakr

Yomakr (YOung MAKeR) ist eine kindgerechte Lern-App mit Claude für ein 11-jähriges Kind. Der Lernbegleiter heißt **YoMa**.

Phase 1 enthält den **Lern-Chat** und den **Eltern-Bereich**. Die Bau-Werkstatt folgt in Phase 2.

## Was die App kann

**Für das Kind** (Login mit 4-stelliger PIN, für das iPad gebaut):

| Modus | Wie YoMa hilft |
| --- | --- |
| 🧭 Hausaufgaben-Coach | Sokratisch: Fragen und gestufte Tipps, nie die fertige Lösung |
| 🔭 Frag mich alles | Kurze, anschauliche Erklärungen mit Gegenfrage |
| 🐉 Geschichten & Ideen | Gemeinsam schreiben, das Kind bleibt Autor |
| 🤖 Programmieren lernen | Konzepte einzeln, kurze JavaScript-Beispiele, jede Zeile erklärt |

Unter jeder Antwort gibt es Knöpfe wie „Erklär's mir einfacher“ oder „Stell mir eine Quizfrage“. Statt zu tippen kann das Kind das Mikrofon der iPad-Tastatur nutzen.

**Für die Eltern** (eigenes Passwort):

- Wochenbericht: Themen, Gelerntes, Stärken und Anregungen. Die Chats selbst sind bewusst nicht einsehbar.
- Hinweise: nur Art und Zeitpunkt (z. B. „Kummer-Signal“), ohne Inhalt. Bei Kummer-Signalen erscheint oben ein deutlicher Hinweis.
- Einstellungen: erlaubte Uhrzeiten, Nachrichten pro Tag, Monatsbudget, Modi an/aus, zusätzliche Regeln für YoMa, Pause-Knopf.

## Wie der Schutz funktioniert

1. **Schutz-Prompt** (`src/lib/prompts.ts`): fester Rahmen für jede Antwort, das Kind kann ihn nicht ändern.
2. **Prüfschritt vorher**: Claude Haiku 5.5 ordnet jede Nachricht des Kindes ein (`ok`, `unangemessen`, `kummer`, `persoenliche_daten`, `umgehung`). Unpassendes wird freundlich umgelenkt, ohne dass das Chat-Modell es sieht.
3. **Prüfschritt nachher**: Auch YoMas Antwort wird geprüft, bevor das Kind sie sieht.
4. **Kummer**: YoMa antwortet einfühlsam, nennt die Nummer gegen Kummer (116 111), die Eltern sehen einen Hinweis.
5. **Kein Internet** für YoMa, API-Key nur auf dem Server, PIN-Sperre nach 5 Fehlversuchen.

Fällt der Prüfschritt aus (z. B. API nicht erreichbar), wird keine ungeprüfte Antwort angezeigt.

## Modelle und Kosten

- Chat und Wochenbericht: **Claude Sonnet 5.5** (`CHAT_MODEL`)
- Prüfschritt: **Claude Haiku 5.5** (`CHECK_MODEL`)

Die App zählt die Kosten pro Tag mit und sperrt, wenn das Monatsbudget erreicht ist. Zusätzlich solltest du in der [Claude Console](https://platform.claude.com) für den API-Key ein festes Monatslimit setzen. Bei normaler Nutzung kostet das etwa 4 bis 9 $ im Monat. Wer mehr Tiefe möchte, kann `CHAT_MODEL=claude-opus-5-5` setzen (etwa doppelt so teuer).

## Lokal starten

Voraussetzung: Node.js 22.

```bash
cp .env.example .env    # Werte eintragen
npm install
npm run dev             # http://localhost:3000
```

Tests und Typprüfung:

```bash
npm test
npm run lint
```

## Auf dem Server (Docker)

```bash
cp .env.example .env    # Werte eintragen
docker compose up -d --build
```

Die App lauscht dann auf `127.0.0.1:3000`. Für HTTPS kommt davor ein Reverse-Proxy (z. B. Caddy), das richten wir in Phase 4 auf dem Hetzner-Server ein. Die Datenbank liegt im Docker-Volume `yomakr-data`.

## Aufs iPad

Seite in Safari öffnen, „Teilen“ → „Zum Home-Bildschirm“. Yomakr startet dann wie eine eigene App.

## Aufbau

```
src/app/            Seiten und API-Routen (Next.js App Router)
src/components/     Oberfläche (Login, Lab, Eltern-Bereich, YoMa)
src/lib/prompts.ts  Schutz-Prompt und Modi
src/lib/claude.ts   Aufrufe an die Claude API (Chat, Prüfschritt, Bericht)
src/lib/chat.ts     Ablauf einer Chat-Nachricht inkl. Prüfungen
src/lib/limits.ts   Zeiten, Tageslimit, Budget, Kosten
tests/              Vitest-Tests
```
