# Deployment Guide - BakaTracker (via GitHub Actions)

**Production URL:** `https://bakatracker.buildsrivatsa.qzz.io`

---

## Automated Deployment Setup

Every push to `main` branch automatically deploys to your VM.

### Step 1: Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

| Secret Name | Value |
|-------------|-------|
| `VM_HOST` | Your VM's IP address (e.g., `34.123.45.67`) |
| `VM_USER` | SSH username (e.g., `ubuntu` or `root`) |
| `VM_SSH_KEY` | Your private SSH key (see below) |

### Step 2: Get your SSH Private Key

On your **local machine** (or where you SSH from):
```bash
cat ~/.ssh/id_rsa
```

Copy the entire key including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`

Paste it as the `VM_SSH_KEY` secret.

### Step 3: Initial VM Setup (one-time)

SSH into your VM:
```bash
ssh your-user@YOUR_VM_IP
```

Setup the directory:
```bash
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/bakatracker.git
sudo chown -R $USER:$USER /var/www/bakatracker
cd bakatracker
npm install
```

Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/bakatracker
```

```nginx
server {
    listen 80;
    server_name bakatracker.buildsrivatsa.qzz.io;

    root /var/www/bakatracker/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable & SSL:
```bash
sudo ln -s /etc/nginx/sites-available/bakatracker /etc/nginx/sites-enabled/
sudo certbot --nginx -d bakatracker.buildsrivatsa.qzz.io
sudo systemctl reload nginx
```

### Step 4: Push to Deploy!

Now whenever you push to `main`:
```bash
git add .
git commit -m "Update"
git push origin main
```

GitHub Actions will automatically:
1. Build the app
2. SSH into your VM
3. Pull latest code
4. Rebuild
5. Reload Nginx

---

## Check Deployment Status

Go to your repo → **Actions** tab to see deployment logs.
