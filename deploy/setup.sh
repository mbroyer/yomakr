#!/usr/bin/env bash
# Richtet einen frischen Ubuntu-24.04-Server (z. B. Hetzner Cloud) für Yomakr ein.
# Aufruf als root im geklonten Repo:  bash /opt/yomakr/deploy/setup.sh
# Das Skript kann gefahrlos mehrmals laufen.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte als root ausführen." >&2
  exit 1
fi

say "Pakete aktualisieren und Docker installieren"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq docker.io docker-compose-v2 ufw unattended-upgrades openssl curl
systemctl enable --now docker
# Sicherheitsupdates laufen automatisch jede Nacht.
dpkg-reconfigure -f noninteractive unattended-upgrades

say "Firewall: nur SSH, HTTP und HTTPS"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

if [ -s /root/.ssh/authorized_keys ]; then
  say "SSH: Anmeldung nur noch per Schlüssel"
  printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/50-yomakr.conf
  systemctl reload ssh
fi

if [ ! -f .env ]; then
  say "Zugangsdaten festlegen (werden nur in $APP_DIR/.env gespeichert)"
  read -rp "Domain, z. B. yomakr.example.de: " domain
  read -rsp "Anthropic-API-Key (sk-ant-…, wird nicht angezeigt): " api_key; echo
  while true; do
    read -rp "PIN für das Kind (4 Ziffern): " pin
    [[ "$pin" =~ ^[0-9]{4}$ ]] && break
    echo "Bitte genau 4 Ziffern."
  done
  while true; do
    read -rsp "Passwort für den Eltern-Bereich (mind. 10 Zeichen): " pw; echo
    read -rsp "Passwort wiederholen: " pw2; echo
    [ "$pw" = "$pw2" ] && [ "${#pw}" -ge 10 ] && break
    echo "Passwörter stimmen nicht überein oder sind zu kurz."
  done
  read -rp "Vorname des Kindes (optional): " kid_name

  umask 077
  cat > .env <<ENV
YOMAKR_DOMAIN=$domain
ANTHROPIC_API_KEY=$api_key
KID_PIN=$pin
PARENT_PASSWORD=$pw
SESSION_SECRET=$(openssl rand -hex 32)
KID_NAME=$kid_name
CHAT_MODEL=claude-sonnet-5-5
CHECK_MODEL=claude-haiku-5-5
ENV
  echo ".env angelegt."
else
  echo ".env existiert schon, wird nicht verändert."
fi
chmod 600 .env

domain="$(grep '^YOMAKR_DOMAIN=' .env | cut -d= -f2)"
server_ip="$(curl -4fsS https://ifconfig.me || true)"
dns_ip="$(getent ahostsv4 "$domain" | awk 'NR==1 {print $1}' || true)"
if [ -n "$server_ip" ] && [ "$dns_ip" != "$server_ip" ]; then
  echo
  echo "Achtung: $domain zeigt auf '${dns_ip:-nichts}', dieser Server hat $server_ip."
  echo "Ohne passenden DNS-Eintrag (A-Record) kann Caddy kein HTTPS-Zertifikat holen."
  read -rp "Trotzdem weitermachen? [j/N] " ok
  [ "$ok" = "j" ] || exit 1
fi

say "App bauen und starten (dauert beim ersten Mal ein paar Minuten)"
docker compose up -d --build

say "Tägliches Backup der Datenbank einrichten"
cat > /etc/cron.daily/yomakr-backup <<CRON
#!/bin/sh
exec "$APP_DIR/deploy/backup.sh" >> /var/log/yomakr-backup.log 2>&1
CRON
chmod 755 /etc/cron.daily/yomakr-backup

say "Fertig"
echo "Yomakr läuft gleich unter https://$domain"
echo "Updates einspielen: bash $APP_DIR/deploy/update.sh"
