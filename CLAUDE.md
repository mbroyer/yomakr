# Yomakr – Hinweise für Claude

- Kindgerechte Lern-App für ein 11-jähriges Kind. Nutzer-Texte, Prompts, Kommentare und Commit-Nachrichten auf Deutsch.
- Das Kind nutzt hauptsächlich ein iPad: große Touch-Ziele, kein Hover-Zwang, Diktat über die iOS-Tastatur.
- Die Eltern lesen bewusst keine Chats. Der Eltern-Bereich bekommt nur Wochenbericht, Statistiken und Hinweise (Kategorie + Zeit), nie Chat-Inhalte.
- Jede Änderung am Chat-Ablauf muss den Prüfschritt vor und nach der Antwort behalten (`src/lib/chat.ts`).
- Vor dem Commit: `npm run lint` und `npm test`.
