# Nexara Food — Server Deployment Guide

## What You Need

- Ubuntu 24.04 VPS (2 vCPU, 2 GB RAM minimum)
- A domain name pointed to your server IP (optional, but recommended)
- SSH access to the server

---

## 1. Server Setup (First Time Only)

SSH into your server and run these commands one by one:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install git (usually already there)
sudo apt install git -y

# Log out and back in for docker group to take effect
exit
```

SSH back in, then verify:

```bash
docker --version
# Should show: Docker version 27.x.x
```

---

## 2. Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 3. Clone the Project

```bash
git clone <your-repo-url> /opt/nexara
cd /opt/nexara
```

---

## 4. Create Production Config

```bash
cp .env.prod.example .env.prod
```

Now edit `.env.prod` with real values:

```bash
nano .env.prod
```

Replace the placeholders:

```
DB_USER=nexara
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
DB_NAME=nexara_food
JWT_SECRET=YOUR_RANDOM_64_CHAR_SECRET_HERE
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_EXPIRY_DAYS=7
BCRYPT_COST=12
DOMAIN=http://your-domain.com
```

**How to generate a strong JWT secret:**

```bash
openssl rand -hex 64
```

Copy the output and paste it as `JWT_SECRET`.

**How to generate a strong DB password:**

```bash
openssl rand -base64 24
```

---

## 5. Start the App

```bash
make up-prod
```

This builds and starts 4 containers:
- PostgreSQL (database)
- Go backend (API)
- Next.js frontend (UI)
- Nginx (reverse proxy)

Wait 2-3 minutes for the first build. Then run migrations and seed data:

```bash
make migrate-prod
make seed-prod
```

---

## 6. Verify It Works

```bash
# Check all containers are running
docker ps

# Test the API
curl http://localhost/api/v1/health

# Open in browser
# http://<your-server-ip>
```

**Default admin login:**
- Email: `admin@nexara.com`
- Password: `pass1234`

**Change the admin password immediately** after first login.

---

## 7. SSL / HTTPS (Recommended)

Install Certbot and get a free Let's Encrypt certificate:

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d your-domain.com
```

Then update nginx config to use SSL. Create `/opt/nexara/nginx/nginx.conf` with:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 10M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
    gzip_vary on;

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /_next/static/ {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then update `.env.prod`:

```
DOMAIN=https://your-domain.com
```

And mount the certs in `docker-compose.prod.yml` under nginx:

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

Restart:

```bash
make up-prod
```

**Auto-renew SSL cert:**

```bash
sudo crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && cd /opt/nexara && docker compose -f docker-compose.prod.yml restart nginx
```

---

## 8. Daily Commands

```bash
# View logs
make logs

# Check container status
docker ps

# Restart everything
make down-prod && make up-prod
```

---

## 9. Deploying Updates

When you push new code to the repo:

```bash
cd /opt/nexara
git pull

# Backend changes only
make update-prod-backend

# Frontend changes only
make update-prod-frontend

# If database schema changed
make migrate-prod
```

**Data is never lost.** Database and uploaded images live in Docker volumes, not inside containers.

---

## 10. Database Backup

Create a backup script:

```bash
nano /opt/nexara/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR=/opt/nexara/backups
mkdir -p $BACKUP_DIR
FILE="$BACKUP_DIR/nexara_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f /opt/nexara/docker-compose.prod.yml \
  exec -T postgres pg_dump -U nexara nexara_food | gzip > $FILE

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.sql.gz | tail -n +8 | xargs -r rm

echo "Backup saved: $FILE"
```

```bash
chmod +x /opt/nexara/backup.sh
```

Run daily at 2 AM:

```bash
crontab -e
# Add:
0 2 * * * /opt/nexara/backup.sh
```

To restore a backup:

```bash
gunzip -c /opt/nexara/backups/nexara_20260101_020000.sql.gz | \
  docker compose -f /opt/nexara/docker-compose.prod.yml exec -T postgres psql -U nexara nexara_food
```

---

## 11. Troubleshooting

**"port 80 already in use"**
```bash
sudo lsof -i :80
sudo systemctl stop apache2 nginx  # if another web server is running
```

**"Cannot connect to database"**
```bash
docker compose -f docker-compose.prod.yml logs postgres
```

**"Build failed — out of memory"**
```bash
# Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**"Permission denied" on docker commands**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Reset everything (DESTROYS ALL DATA)**
```bash
cd /opt/nexara
docker compose -f docker-compose.prod.yml down -v
make up-prod
make migrate-prod
make seed-prod
```

---

## 12. Resource Usage

```
SERVICE       RAM      CPU
PostgreSQL    150MB    idle
Go backend    30MB     idle
Next.js       120MB    idle
Nginx         10MB     idle
─────────────────────────
TOTAL         ~310MB   idle
```

A 2 GB VPS is comfortable. 4 GB gives room for growth.

---

## Quick Reference Card

```
make up-prod              Start production
make down-prod            Stop production
make update-prod-backend  Deploy backend changes
make update-prod-frontend Deploy frontend changes
make migrate-prod         Run new migrations
make seed-prod            Re-seed database
make logs                 View all logs
docker ps                 List running containers
```
