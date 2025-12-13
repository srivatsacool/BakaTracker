# Google Cloud Setup Guide for BakaTracker

Follow these steps to set up Google Cloud credentials for BakaTracker.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it "BakaTracker" and click **Create**

## Step 2: Enable Required APIs

1. In your project, go to **APIs & Services** → **Enable APIs and Services**
2. Search for and enable:
   - **Google Sheets API**
   - **Cloud Vision API** (for Screenshot to Alarm feature)

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in:
   - App name: `BakaTracker`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. On Scopes page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Click **Save and Continue** through remaining steps

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name it "BakaTracker Web"
5. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://bakatracker.buildsrivatsa.qzz.io` (your production subdomain)
6. Click **Create**
7. Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

> [!IMPORTANT]
> Replace `buildsrivatsa.qzz.io` with a subdomain if you want to host it on a subdomain like `bakatracker.buildsrivatsa.qzz.io`.

## Step 5: Create API Key

1. Still in Credentials, click **Create Credentials** → **API Key**
2. Copy the API key
3. (Optional but recommended) Click on the key and restrict it to:
   - Google Sheets API
   - Cloud Vision API
4. Also restrict by HTTP referrers:
   - `http://localhost:5173/*`
   - `https://bakatracker.buildsrivatsa.qzz.io/*`

## Step 6: Update BakaTracker Configuration

1. Open `app/src/config/google.js`
2. Replace the placeholder values:

```javascript
export const GOOGLE_CONFIG = {
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
  API_KEY: 'YOUR_API_KEY_HERE',
  // ... rest of config
};
```

---

## Deploying to Your GCP VM

Since you already have a VM set up, follow these steps:

### 1. Build for Production

On your local machine:
```bash
cd d:\projects\BakaTracker\app
npm run build
```

This creates a `dist/` folder with static files.

### 2. Upload to Your VM

Copy the `dist` folder to your VM:
```bash
# Using SCP (replace with your VM details)
scp -r dist/* your-user@YOUR_VM_IP:/path/to/web/root/bakatracker/
```

Or use your preferred method (SFTP, rsync, etc.)

### 3. Configure Nginx (if using Nginx)

Add a location block to your existing Nginx config:

```nginx
# For subdomain (e.g., bakatracker.yourdomain.com)
server {
    listen 80;
    server_name bakatracker.buildsrivatsa.qzz.io;
    
    root /path/to/web/root/bakatracker;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# OR for subdirectory (e.g., yourdomain.com/bakatracker)
location /bakatracker {
    alias /path/to/web/root/bakatracker;
    try_files $uri $uri/ /bakatracker/index.html;
}
```

### 4. Update OAuth Origins

After deploying, go back to Google Cloud Console:
1. Go to **APIs & Services** → **Credentials**
2. Edit your OAuth client
3. Add your production URL to **Authorized JavaScript origins**:
   - `https://bakatracker.buildsrivatsa.qzz.io` (if subdomain)
   - `https://buildsrivatsa.qzz.io` (if subdirectory)

### 5. Enable HTTPS

Make sure your domain has SSL (required for Google OAuth). If using Certbot:
```bash
sudo certbot --nginx -d bakatracker.buildsrivatsa.qzz.io
```

---

## Step 7: Test the App

1. Run `npm run dev` in the `app` folder
2. Open http://localhost:5173
3. Click "Continue with Google"
4. Sign in with your Google account
5. Grant the requested permissions

## Troubleshooting

### "Error 403: access_denied"
- Make sure your email is added as a test user in OAuth consent screen
- Go to **OAuth consent screen** → **Test users** → **Add users**

### "This app isn't verified"
- Click **Advanced** → **Go to BakaTracker (unsafe)** during development
- For production, you'll need to verify your app with Google

### CORS or origin errors
- Make sure `http://localhost:5173` is added to Authorized JavaScript origins
- Include the exact port number

---

Once configured, the app will:
- Automatically create a Google Sheet called "BakaTracker Data" in your Drive
- Store all habits, tasks, and logs in that spreadsheet
- Sync data across all your devices
