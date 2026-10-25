#!/usr/bin/env bash
# Sichert die Datenbank im laufenden Betrieb nach /data/backups (im Docker-Volume)
# und löscht Sicherungen, die älter als 14 Tage sind.
set -euo pipefail
cd "$(dirname "$0")/.."
stamp="$(date +%F)"
docker compose exec -T yomakr node -e '
  const Database = require("better-sqlite3");
  const fs = require("fs");
  fs.mkdirSync("/data/backups", { recursive: true });
  new Database(process.env.DATABASE_PATH, { readonly: true })
    .backup(`/data/backups/yomakr-${process.argv[1]}.db`)
    .then(() => console.log("Backup ok"), (e) => { console.error(e); process.exit(1); });
' "$stamp"
docker compose exec -T yomakr find /data/backups -name 'yomakr-*.db' -mtime +14 -delete
