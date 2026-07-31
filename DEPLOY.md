# Nexara Food — Production Deployment Guide

## What You Need

- Ubuntu 24.04 VPS (2 vCPU, 2 GB RAM minimum)
- A domain name with SSL certificate files (`.pem` and `.key`)
- SSH key access to the server

---

## 1. Server Hardening

SSH into the server as root, then:

```bash
# Create your user
adduser alim
usermod -aG sudo alim

# Copy SSH keys from root to your user
rsync --archive --chown=alim:alim /root/.ssh /home/alim

# Disable root login and password auth
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
EOF

sudo sshd -t
sudo systemctl reload ssh
```

Log out and SSH back in as `alim`.

---

## 2. Install Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl unattended-upgrades
sudo systemctl enable --now unattended-upgrades

# Remove old Docker packages if any
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt remove -y "$pkg" 2>/dev/null || true
done

# Add Docker's official repo
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

# Add your user to docker group
sudo usermod -aG docker alim
```

Log out and back in for the group to take effect.

---

## 3. Configure Docker Log Rotation

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
EOF

sudo systemctl restart docker
docker info --format '{{.LoggingDriver}}'
# Should print: local
```

---

## 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

---

## 5. Clone the Project

```bash
# Generate a deploy key for GitHub
ssh-keygen -t ed25519 -C "nexara-production-server" -f ~/.ssh/nexara_github
cat ~/.ssh/nexara_github.pub
```

Add the public key to your GitHub repo: **Settings → Deploy keys → Add deploy key** (check "Allow write access" if you push from the server).

```bash
# Configure SSH to use the deploy key
cat >> ~/.ssh/config <<'EOF'
Host github-nexara
  HostName github.com
  User git
  IdentityFile ~/.ssh/nexara_github
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/nexara_github
chmod 644 ~/.ssh/nexara_github.pub

# Clone
git clone git@github-nexara:alim7007/food.tjk.git nexara
cd nexara
```

---

## 6. Create Production Config

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Fill in real values:

```
DB_USER=nexara
DB_PASSWORD=<strong-password>
DB_NAME=nexara_food
JWT_SECRET=<output-of-openssl-rand-hex-64>
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
BCRYPT_COST=12
DOMAIN=https://nexaraandme.com
DOMAIN_WWW=https://www.nexaraandme.com
```

Generate secrets:

```bash
openssl rand -hex 64   # for JWT_SECRET
openssl rand -base64 24  # for DB_PASSWORD
```

---

## 7. SSL Certificates

Place your SSL certificate and key in `nginx/certs/`:

```bash
mkdir -p nginx/certs

# Copy your certificate and key files
# (these are gitignored — never committed to the repo)

chmod 644 nginx/certs/origin.pem
chmod 600 nginx/certs/origin.key
```

Update `nginx/nginx.conf` with your domain name:

```nginx
server_name nexaraandme.com www.nexaraandme.com;
```

---

## 8. Start the App

```bash
# Install make if not present
sudo apt install make -y

# Build and start
make up-prod

# Run database migrations
make migrate-prod

# Seed initial data (restaurants, foods, users)
make seed-prod
```

Verify:

```bash
docker ps
# Should show 4 containers: postgres, backend, frontend, nginx

curl -I http://localhost
# Should return 301 redirect to HTTPS

curl -kI --resolve nexaraandme.com:443:127.0.0.1 https://nexaraandme.com
# Should return 200
```

Open `https://nexaraandme.com` in your browser.

**Default admin login:**
- Email: `admin@nexara.com`
- Password: `pass1234`

Change the admin password immediately.

---

## 9. Deploying Updates

```bash
cd ~/nexara
git pull

# Backend changes only
make update-prod-backend

# Frontend changes only
make update-prod-frontend

# If database schema changed
make migrate-prod
```

**Data is never lost.** Database and uploaded images live in Docker volumes (`pgdata`, `uploads`), not inside containers.

---

## 10. Database Backup

```bash
nano ~/nexara/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR=/home/alim/nexara/backups
mkdir -p $BACKUP_DIR
FILE="$BACKUP_DIR/nexara_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f /home/alim/nexara/docker-compose.prod.yml \
  exec -T postgres pg_dump -U nexara nexara_food | gzip > $FILE

ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs -r rm
echo "Backup saved: $FILE"
```

```bash
chmod +x ~/nexara/backup.sh
crontab -e
# Add: 0 2 * * * /home/alim/nexara/backup.sh
```

---

## 11. Quick Reference

```
make up-prod               Start production
make down-prod             Stop production
make update-prod-backend   Deploy backend changes
make update-prod-frontend  Deploy frontend changes
make migrate-prod          Run new migrations
make seed-prod             Re-seed database
make logs                  View all container logs
docker ps                  List running containers
```

---

## 12. Files Never Committed to Git

These are in `.gitignore` — they exist only on the server:

```
.env.prod           Production secrets (DB password, JWT secret)
nginx/certs/        SSL certificate and private key
```

---

## 13. Architecture

```
Browser (HTTPS)
    │
    ▼
nginx :443 (SSL termination)
    │
    ├── /api/*      → backend:8080  (Go API)
    ├── /uploads/*  → backend:8080  (images)
    └── /*          → frontend:3000 (Next.js)
                        │
                        ▼
                   backend:8080
                        │
                        ▼
                   postgres:5432
```

---

## 14. Troubleshooting

**"port 80 already in use"**
```bash
sudo lsof -i :80
sudo systemctl stop apache2 nginx
```

**"Cannot connect to database"**
```bash
docker compose -f docker-compose.prod.yml logs postgres
```

**"Permission denied" on docker commands**
```bash
sudo usermod -aG docker alim
# Log out and back in
```

**Reset everything (DESTROYS ALL DATA)**
```bash
docker compose -f docker-compose.prod.yml down -v
make up-prod
make migrate-prod
make seed-prod
```
