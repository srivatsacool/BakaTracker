# Converting BakaTracker PWA to Android APK

There are **3 main methods** to convert your web app to an APK:

---

## Method 1: PWABuilder (Easiest) ⭐ Recommended

PWABuilder is Microsoft's free tool that converts PWAs directly to APKs.

### Steps:

1. **Deploy your app** to a public URL (e.g., `https://bakatracker.buildsrivatsa.qzz.io`)

2. **Go to [PWABuilder.com](https://pwabuilder.com)**

3. **Enter your URL** and click "Start"

4. **PWABuilder will analyze your PWA** and show a score

5. **Click "Package for stores"** → Select **Android**

6. **Configure options:**
   - Package ID: `com.yourname.bakatracker`
   - App name: `BakaTracker`
   - Version: `1.0.0`
   - Choose signing option (or let PWABuilder generate)

7. **Download the APK** and install on your device

### Pros:
- ✅ Free and simple
- ✅ No coding required
- ✅ Generates TWA (Trusted Web Activity) which is the best approach
- ✅ Can also generate for Microsoft Store, iOS

### Cons:
- ❌ Requires deployed PWA with valid manifest
- ❌ Limited customization

---

## Method 2: Capacitor (Most Powerful)

Capacitor by Ionic wraps your web app in a native container with full access to native APIs.

### Prerequisites:
- Node.js installed
- Android Studio installed
- Java JDK 11+

### Steps:

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init

# 2. Add Android platform
npm install @capacitor/android
npx cap add android

# 3. Build your web app
npm run build

# 4. Copy web assets to Android
npx cap copy android

# 5. Open in Android Studio
npx cap open android
```

### In Android Studio:

1. Wait for Gradle sync to complete
2. Connect your device or start emulator
3. Click **Run** (green play button)
4. To build APK: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**

### File Structure Created:
```
d:\projects\BakaTracker\
├── android/           ← Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/...
│   │   └── build.gradle
│   └── capacitor.config.ts
├── dist/              ← Your built web app
└── src/               ← Your React source
```

### Pros:
- ✅ Full native API access (camera, notifications, filesystem)
- ✅ Can add native plugins
- ✅ Best performance
- ✅ You control everything

### Cons:
- ❌ Requires Android Studio setup
- ❌ More complex
- ❌ Larger APK size (~10-30MB)

---

## Method 3: Bubblewrap CLI (Google's Official Tool)

Bubblewrap creates a TWA (Trusted Web Activity) APK from your PWA.

### Prerequisites:
- Node.js 14+
- Java JDK 8+

### Steps:

```bash
# 1. Install Bubblewrap globally
npm install -g @anthropic-ai/anthropic-ai/anthropic-bubblewrap@anthropic-bubble-cli

# 2. Initialize project (interactive)
bubblewrap init --manifest https://bakatracker.buildsrivatsa.qzz.io/manifest.webmanifest

# 3. Build APK
bubblewrap build

# 4. Sign APK (follow prompts)
bubblewrap install
```

### Pros:
- ✅ Official Google approach
- ✅ Smallest APK size (~1-3MB)
- ✅ Uses Chrome to render (always up to date)

### Cons:
- ❌ Requires Chrome 72+ on device
- ❌ Command line only
- ❌ Limited native features

---

## Before Converting: Checklist ✅

Make sure your PWA has:

### 1. Valid manifest.webmanifest
```json
{
  "name": "BakaTracker",
  "short_name": "BakaTracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3B82F6",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 2. Required Icons
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)
- `maskable-icon.png` (512x512px with safe zone)

### 3. HTTPS Deployment
- TWA/PWA requires HTTPS
- localhost works for testing

### 4. Service Worker (for offline)
- Already set up with Workbox in your project

---

## Recommended Approach for BakaTracker

**Use Capacitor** because:
1. Your app uses Google APIs (OAuth, Sheets, Vision) which work better in Capacitor
2. You may want native notifications for Pomodoro timer
3. Better control over permissions and deep linking

### Quick Start with Capacitor:

```bash
# In your project folder
cd d:\projects\BakaTracker

# Install
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize
npx cap init "BakaTracker" "com.yourname.bakatracker"

# Add Android
npx cap add android

# Build web app
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## Publishing to Play Store

After generating your APK:

1. **Create a Google Play Developer account** ($25 one-time fee)
2. **Create app listing** in Play Console
3. **Upload AAB** (Android App Bundle, not APK - required since 2021)
4. **Complete store listing** (screenshots, description)
5. **Submit for review**

For Capacitor, generate AAB with:
**Build** → **Build Bundle(s) / APK(s)** → **Build Bundle(s)**

---

## Summary

| Method | Difficulty | APK Size | Native APIs | Best For |
|--------|------------|----------|-------------|----------|
| PWABuilder | Easy | ~2MB | Limited | Quick conversion |
| Capacitor | Medium | ~15MB | Full | Production apps |
| Bubblewrap | Medium | ~2MB | Limited | Lightweight apps |

**My recommendation: Start with PWABuilder for testing, then use Capacitor for production.**
