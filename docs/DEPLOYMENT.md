# 🚢 Deployment Guide

This guide provides instructions to deploy BakaTracker in production: hosting the React PWA on Cloudflare Pages, and deploying the FastMCP Python server to Google Cloud Run.

---

## 💻 Frontend Hosting: Cloudflare Pages

Cloudflare Pages provides global CDN delivery and automatic builds for the Vite PWA frontend.

### 1. Initial Setup
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your BakaTracker GitHub repository.

### 2. Configure Build Settings
Set the following parameters in the Pages build setup:
* **Framework preset:** `Vite`
* **Build command:** `npm run build`
* **Build output directory:** `dist`
* **Root directory:** `/` (Project root)

### 3. Add Environment Variables
Before deploying, click **Environment variables** under Build settings and add:
* `VITE_GOOGLE_APPS_SCRIPT_URL`: The URL of your deployed Google Apps Script bridge (e.g. `https://script.google.com/macros/s/AKfycby.../exec`).
* `VITE_GOOGLE_APPS_SCRIPT_API_KEY`: (Optional) Your spreadsheet authentication key.

Click **Save and Deploy**. Cloudflare will build the PWA and host it on a custom `*.pages.dev` subdomain.

---

## 🐍 Backend Hosting: Google Cloud Run

Google Cloud Run runs the FastMCP server in a serverless container. It scales to zero to save costs when not in use.

### Production Quota Limits
We enforce strict resource parameters to fit within Cloud Run's free tier and prevent runaway instances:
* **CPU Limit:** `0.25 vCPU`
* **Memory Limit:** `512 MiB`
* **Concurrency:** `80` requests per instance.
* **Timeout:** `300` seconds.
* **Min Instances:** `0` (Scales to zero).
* **Max Instances:** `5` (Rate limits requests).
* **Region:** `us-central1`

### 1. Manual gcloud Command Deploy
Navigate to the `backend/` directory and deploy using the Cloud SDK CLI:
```bash
cd backend
gcloud run deploy bakatracker-mcp \
  --source . \
  --region us-central1 \
  --platform managed \
  --cpu 0.25 \
  --memory 512Mi \
  --concurrency 80 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_APPS_SCRIPT_URL=YOUR_APPS_SCRIPT_URL,AUTH_TOKEN=YOUR_SECRET_BEARER_TOKEN,LOG_LEVEL=INFO
```

### 2. Docker Local Build Test
To verify the Docker container compiles and boots correctly locally:
1. Build the image:
   ```bash
   docker build -t bakatracker-mcp .
   ```
2. Start the container mapping ports:
   ```bash
   docker run -p 8080:8080 \
     -e GOOGLE_APPS_SCRIPT_URL=https://script.google.com/.../exec \
     -e AUTH_TOKEN=secret_token \
     bakatracker-mcp
   ```

---

## 🔄 Automated CI/CD Pipelines

### 1. GitHub Actions (.github/workflows/deploy.yml)
Triggers automatically on code pushes to the `main` branch:
1. **Startup Check:** Installs dependencies via UV, starts uvicorn in the background, and tests the public and ready endpoints using curl.
2. **Container Compilation:** Builds the Docker image.
3. **Artifact Registry Push:** Publishes the container tag.
4. **Cloud Run Deploy:** Updates the active Cloud Run container.
5. **Remote Health check:** Executes a final remote curl check against the new instance.

### 2. Google Cloud Build (cloudbuild.yaml)
Triggers container compilation inside GCP when linked to a source repository.

---

## ⏪ Rollback Procedures

If a deployment contains regression bugs, revert instantly:
1. List all active service revisions:
   ```bash
   gcloud run revisions list --service=bakatracker-mcp --region=us-central1
   ```
2. Reroute 100% of traffic to the last known-good revision:
   ```bash
   gcloud run services update-traffic bakatracker-mcp \
     --region=us-central1 \
     --to-revisions=REVISION_NAME=100
   ```
   *(Replace REVISION_NAME with the target revision hash, e.g. `bakatracker-mcp-00012-abc`)*
