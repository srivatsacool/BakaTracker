# BakaTracker Deployment Guide — Version 1.0

This guide details deployment targets, environment variables, manual CLI builds, automatic CI/CD deployment, rollbacks, and troubleshooting for the BakaTracker MCP backend.

---

## Production Configurations

| Resource / Parameter | Target Configuration |
| :--- | :--- |
| **Hosting Platform** | Google Cloud Run (Fully Managed) |
| **CPU Limit** | 0.25 vCPU |
| **Memory Limit** | 512 MiB |
| **Concurrency** | 80 requests per instance |
| **Minimum Instances** | 0 (Scale to zero enabled) |
| **Maximum Instances** | 5 |
| **Timeout Limit** | 300 seconds |
| **Target Region** | `us-central1` |
| **Authentication** | Application-level Bearer Token (Authorization: Bearer <token>) |

---

## Deployment Steps

### 1. Initial Setup
Ensure you have the Google Cloud SDK (`gcloud`) installed and authenticated:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Manual CLI Build and Deployment
Navigate to the `backend/` directory and deploy using the following gcloud command:
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
  --set-env-vars GOOGLE_APPS_SCRIPT_URL=YOUR_URL,GOOGLE_APPS_SCRIPT_API_KEY=YOUR_KEY,AUTH_TOKEN=YOUR_TOKEN
```

### 3. Automated GitHub Actions Deployment
When code is pushed to the `main` branch, the GitHub Actions workflow in `.github/workflows/deploy.yml` triggers automatically:
1. Installs UV and builds dependencies.
2. Boots up a local server instance and runs verification tests.
3. Builds the Docker container.
4. Deploys the container to Cloud Run.
5. Runs a remote health check gate.

---

## Rollback Procedures

If a deployment contains bugs or regressions, roll back instantly using the Cloud Run CLI or console:

### Roll back to a Previous Revision via CLI
1. List all active revisions:
   ```bash
   gcloud run revisions list --service=bakatracker-mcp --region=us-central1
   ```
2. Route 100% of traffic to your target known-good revision:
   ```bash
   gcloud run services update-traffic bakatracker-mcp \
     --region=us-central1 \
     --to-revisions=REVISION_NAME=100
   ```

---

## Troubleshooting

### 1. Apps Script Connection Timeout / 503 Service Unavailable
* **Symptom:** Call to `/ready` fails with HTTP 503 or logs timeout errors.
* **Fix:** Verify `GOOGLE_APPS_SCRIPT_URL` is set correctly. Check if your Apps Script Web App is deployed with "Execute as: Me" and "Access: Anyone". 

### 2. Unauthorized Errors / 401 Unauthorized
* **Symptom:** MCP clients cannot call tools and get HTTP 401.
* **Fix:** Ensure the client configures `Authorization: Bearer <AUTH_TOKEN>` in headers. Verify the token matches the value of `AUTH_TOKEN` inside Cloud Run's environment settings.

### 3. Container Crashes on Boot (Startup Verification Fails)
* **Symptom:** Revision deployment fails during startup.
* **Fix:** Check Cloud Run Logs. Startup validation checks will raise specific errors if `GOOGLE_APPS_SCRIPT_URL` or `AUTH_TOKEN` is missing, or if the URL format is invalid. Ensure all environment variables are correctly mapped.
