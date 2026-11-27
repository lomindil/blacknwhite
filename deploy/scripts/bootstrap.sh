#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 Lightsail instance. Run as the default "ubuntu" user:
#   bash bootstrap.sh
# Installs Docker, adds swap, turns on automatic security updates, creates /srv/redreader with
# generated secrets, and schedules the nightly backup. Safe to re-run: existing secrets are kept.
set -euo pipefail

APP=/srv/redreader
echo "==> System updates and base packages"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg unattended-upgrades fail2ban unzip

echo "==> Docker"
if ! command -v docker >/dev/null; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

echo "==> AWS CLI (for backups to the Lightsail bucket)"
if ! command -v aws >/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscli.zip
  unzip -q /tmp/awscli.zip -d /tmp && sudo /tmp/aws/install && rm -rf /tmp/aws /tmp/awscli.zip
fi

echo "==> 2 GB swap (headroom for builds and spikes)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf >/dev/null && sudo sysctl -p /etc/sysctl.d/99-swappiness.conf
fi

echo "==> SSH: keys only, no root login"
echo -e "PasswordAuthentication no\nPermitRootLogin no" | sudo tee /etc/ssh/sshd_config.d/60-redreader.conf >/dev/null
sudo systemctl reload ssh

echo "==> Automatic security updates"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> App folder and secrets in $APP"
sudo mkdir -p "$APP/certs" "$APP/backups"
sudo chown -R "$USER:$USER" "$APP"
chmod 700 "$APP/certs" "$APP/backups"
if [ ! -f "$APP/.env" ]; then
  cp "$(dirname "$0")/../.env.example" "$APP/.env"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" "$APP/.env"
  sed -i "s|^MEILI_KEY=.*|MEILI_KEY=$(openssl rand -hex 24)|" "$APP/.env"
  sed -i "s|^OPS_PASSWORD=.*|OPS_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=')|" "$APP/.env"
  chmod 600 "$APP/.env"
  echo "    Created $APP/.env with generated secrets. Fill in Google, SMTP and ADMIN_EMAILS."
fi

echo "==> Nightly backup at 02:30 IST (21:00 UTC)"
# (A fresh server has no crontab yet: "crontab -l" fails, which must not stop the script.)
{ crontab -l 2>/dev/null | grep -v redreader-backup || true; echo "0 21 * * * $APP/scripts/backup.sh >> $APP/backups/backup.log 2>&1 # redreader-backup"; } | crontab -

echo "Done. Log out and back in once so the docker group applies."
