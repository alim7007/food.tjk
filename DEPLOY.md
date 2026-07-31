# Nexara Food — Production Deployment Guide

## What You Need

- Ubuntu 24.04 VPS (2 vCPU, 2 GB RAM)
- A domain on Cloudflare
- SSH key access to the server

---

## 1. Server Setup

SSH in as root:

```bash
adduser alim
usermod -aG sudo alim
rsync --archive --chown=alim:alim /root/.ssh /home/alim

sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
EOF

sudo sshd -t && sudo systemctl reload ssh
```

Log out, SSH back in as `alim`.

---

## 2. Install Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl unattended-upgrades
sudo systemctl enable --now unattended-upgrades

for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt remove -y "$pkg" 2>/dev/null || true
done

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
sudo usermod -aG docker alim
```

Log out and back in.

---

## 3. Docker Log Rotation

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
```

---

## 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 5. Clone the Project

```bash
ssh-keygen -t ed25519 -C "nexara-production-server" -f ~/.ssh/nexara_github
cat ~/.ssh/nexara_github.pub
```

Add this key to GitHub: **Repo → Settings → Deploy keys → Add deploy key**.

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-nexara
  HostName github.com
  User git
  IdentityFile ~/.ssh/nexara_github
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config ~/.ssh/nexara_github
chmod 644 ~/.ssh/nexara_github.pub

git clone git@github-nexara:alim7007/food.tjk.git nexara
cd nexara
```

---

## 6. SSL Certificates (Cloudflare)

Go to **Cloudflare → SSL/TLS → Origin Server → Create Certificate**.

Use these settings:
- Private key type: ECDSA (or RSA 2048)
- Hostnames: `*.nexaraandme.com, nexaraandme.com`
- Validity: 15 years

Copy the **Origin Certificate** (PEM) and **Private Key** to the server:

```bash
mkdir -p nginx/certs

nano nginx/certs/origin.pem
# Paste the Origin Certificate, save

nano nginx/certs/origin.key
# Paste the Private Key, save

chmod 644 nginx/certs/origin.pem
chmod 600 nginx/certs/origin.key
```

In Cloudflare, set SSL/TLS mode to **Full (strict)**.

---

## 7. Configure Domain

Edit `nginx/nginx.conf` — replace `nexaraandme.com` with your domain:

```bash
nano nginx/nginx.conf
```

---

## 8. Create Production Config

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

```
DB_USER=nexara
DB_PASSWORD=<your-password>
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
openssl rand -hex 64
openssl rand -base64 24
```

---

## 9. Start

```bash
sudo apt install make -y
make up-prod
make migrate-prod
make seed-prod
```

Open `https://nexaraandme.com`.

**Default admin:** `admin@nexara.com` / `pass1234` — change immediately.

---

## 10. Deploy Updates

```bash
cd ~/nexara
git pull
make up-prod
```

---

## 11. Files Never Committed

```
.env.prod           Secrets (DB password, JWT secret)
nginx/certs/        SSL certificate and key
```
