# Living Fractal Atlas — Android TV & Screensaver Implementation Plan

## Goal

Package the existing web app (`genfractals.vercel.app`) as:
1. A standalone **Android TV launcher app** (appears in TV home screen app grid)
2. A native **Android TV screensaver** via `DreamService` (selectable in Settings → Screen Saver)

Both share a single Android Studio project and a single APK. The web app runs inside a `WebView` — no porting of shaders or Three.js required.

Target device: Sony Bravia with Google TV / Android TV (Android 9+). Also works on any Android TV box.

---

## Chosen Approach: WebView Wrapper + DreamService

**Why not PWA / TWA (Trusted Web Activity)?**
TWA requires the hosting domain to pass Digital Asset Links verification, which adds DNS config overhead. A plain `WebView` APK is simpler to sideload and has no domain requirements. If we later publish to Google Play we can revisit TWA.

**Why not native Kotlin shader port?**
The GLSL shaders in `src/art/render/shaders.ts` are WebGL — porting to OpenGL ES / Vulkan is weeks of work for no user-visible benefit at this stage.

---

## Repository Layout (new files to create)

```
genfractals/
├── android/                        ← new Android Studio project root
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/app/genfractals/
│   │   │   │   ├── MainActivity.kt         ← TV launcher entry point
│   │   │   │   ├── FractalDreamService.kt  ← Screensaver entry point
│   │   │   │   └── FractalWebView.kt       ← Shared WebView config helper
│   │   │   └── res/
│   │   │       ├── drawable/
│   │   │       │   ├── banner.png          ← 320×180px TV launcher banner
│   │   │       │   └── ic_launcher.png     ← Standard app icon
│   │   │       ├── layout/
│   │   │       │   └── activity_main.xml   ← Fullscreen WebView layout
│   │   │       └── values/
│   │   │           ├── strings.xml
│   │   │           └── styles.xml
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   └── settings.gradle.kts
└── docs/
    └── ANDROID_TV_PLAN.md          ← this file
```

---

## Phase 1 — Android Studio Project Setup

### 1.1 Create the project

- Open Android Studio → New Project → **No Activity**
- Package name: `app.genfractals`
- Language: **Kotlin**
- Min SDK: **API 21 (Android 5.0)** — covers all Android TV devices in use
- Target SDK: **API 34**
- Save to `genfractals/android/`

### 1.2 `settings.gradle.kts`

```kotlin
rootProject.name = "LivingFractalAtlas"
include(":app")
```

### 1.3 Root `build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
```

### 1.4 App `build.gradle.kts`

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "app.genfractals"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.genfractals"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.leanback:leanback:1.2.0")   // TV UI components
    implementation("androidx.core:core-ktx:1.13.1")
}
```

---

## Phase 2 — AndroidManifest.xml

This is the most important file. It registers both entry points.

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required for WebView loading remote URL -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Declare this is a TV app -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="false" />
    <!-- Touch is not required on TV -->
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />

    <application
        android:label="@string/app_name"
        android:banner="@drawable/banner"
        android:icon="@drawable/ic_launcher"
        android:theme="@style/Theme.Fractal">

        <!-- ═══ Entry point 1: TV Launcher App ═══ -->
        <activity
            android:name=".MainActivity"
            android:configChanges="keyboard|keyboardHidden|navigation|orientation|screenSize"
            android:exported="true"
            android:screenOrientation="landscape">

            <!-- Standard Android launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <!-- Android TV launcher — THIS is what puts it in the TV home grid -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- ═══ Entry point 2: Screensaver / Daydream ═══ -->
        <service
            android:name=".FractalDreamService"
            android:exported="true"
            android:label="@string/app_name"
            android:permission="android.permission.BIND_DREAM_SERVICE">

            <intent-filter>
                <action android:name="android.service.dreams.DreamService" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>

            <!-- Points Android to the screensaver preview/settings -->
            <meta-data
                android:name="android.service.dream"
                android:resource="@xml/dream_info" />
        </service>

    </application>
</manifest>
```

Also create `res/xml/dream_info.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<dream xmlns:android="http://schemas.android.com/apk/res/android"
    android:previewImage="@drawable/banner" />
```

---

## Phase 3 — Shared WebView Helper

`FractalWebView.kt` — called by both MainActivity and FractalDreamService.

```kotlin
package app.genfractals

import android.content.Context
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

object FractalWebView {

    private const val URL = "https://genfractals.vercel.app"

    fun build(context: Context): WebView {
        val webView = WebView(context)

        webView.apply {
            webViewClient = WebViewClient()
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                // Hardware-accelerated WebGL
                setRenderPriority(WebSettings.RenderPriority.HIGH)
                mediaPlaybackRequiresUserGesture = false
                // Allow full viewport
                useWideViewPort = true
                loadWithOverviewMode = true
                // Prevent any browser chrome
                displayZoomControls = false
                builtInZoomControls = false
                setSupportZoom(false)
            }
            // Keep screen on while running
            keepScreenOn = true
            // Hide scrollbars
            scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY
            isScrollbarFadingEnabled = true
            loadUrl(URL)
        }

        return webView
    }
}
```

> **Offline variant (optional):** Run `npm run build` in the web project, copy `dist/` into `android/app/src/main/assets/www/`, then change `loadUrl(URL)` to `loadUrl("file:///android_asset/www/index.html")`. This makes the app work without internet but requires rebuilding the APK on every web update.

---

## Phase 4 — MainActivity (TV Launcher)

```kotlin
package app.genfractals

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.view.WindowManager

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // True fullscreen — hide all system UI
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        setContentView(FractalWebView.build(this))
    }

    // Allow back button to do nothing (keeps the installation running)
    override fun onBackPressed() { /* swallow */ }
}
```

---

## Phase 5 — FractalDreamService (Screensaver)

```kotlin
package app.genfractals

import android.service.dreams.DreamService

class FractalDreamService : DreamService() {

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()

        // Screensaver-specific flags
        isFullscreen = true
        isInteractive = false   // any input wakes the TV back up normally

        setContentView(FractalWebView.build(this))
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
    }
}
```

---

## Phase 6 — Layout & Resources

### `res/layout/activity_main.xml`
Not strictly needed since we call `setContentView(FractalWebView.build(this))` programmatically, but create it as a fallback:

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000" />
```

### `res/values/strings.xml`

```xml
<resources>
    <string name="app_name">Living Fractal Atlas</string>
</resources>
```

### `res/values/styles.xml`

```xml
<resources>
    <style name="Theme.Fractal" parent="@android:style/Theme.NoTitleBar.Fullscreen">
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>
```

### `res/drawable/banner.png`
- **Required for TV launcher**: 320×180px PNG
- Design suggestion: black background, the app name in the fractal's warm rose palette color (`#c98fa8`), or a screenshot frame from a lyrical-drift scene
- Can be generated with any image editor or via a script

---

## Phase 7 — Build & Sideload to Sony Bravia

### 7.1 Enable Developer Options on the Bravia
1. Settings → Device Preferences → About → Build (click 7× to unlock dev options)
2. Settings → Device Preferences → Developer Options → **USB Debugging: ON**
3. Settings → Device Preferences → Developer Options → **Unknown Sources: ON** (or install via ADB directly)

### 7.2 Connect via ADB over Wi-Fi (no cable needed)
```bash
# Find TV IP: Settings → Network → About → IP Address
adb connect <TV_IP_ADDRESS>:5555
adb devices  # confirm it's listed
```

### 7.3 Build the APK in Android Studio
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`

### 7.4 Install
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 7.5 Set as screensaver
- TV Settings → Device Preferences → Screen Saver → **Living Fractal Atlas**
- Set "Start After" to your preferred idle time (e.g. 5 minutes)

---

## Phase 8 — Performance Tuning (post-install)

Once running on the Bravia, check:

- **Frame rate**: The app already uses `requestAnimationFrame` and avoids per-frame React re-renders. On a 4K TV with a capable GPU WebView should hold 30–60fps. If it stutters, add `hardware-accelerated="true"` to the `<application>` tag in the manifest (it's on by default in API 23+ but explicit is safer).
- **Memory**: Newton fractal (`lyrical-drift`) and Mandelbrot zoom are the heaviest modes. If OOM occurs on lower-end TV hardware, reduce `MAX_ITER` in `shaders.ts` from 180 → 120 and redeploy.
- **Screen burn-in protection**: The app's natural scene rotation and slow drift are already friendly to OLED. No additional burn-in logic needed.
- **Wake lock**: `keepScreenOn = true` in `FractalWebView.kt` prevents the TV from sleeping while the launcher app is open. In screensaver mode Android manages this automatically.

---

## Phase 9 — Optional: Offline Bundle

For a version that works without internet (e.g. at an art installation):

```bash
# In the web project root:
npm run build
# Copy dist/ into Android assets:
cp -r dist/ android/app/src/main/assets/www/
```

Then change `FractalWebView.kt`:
```kotlin
// Replace:
loadUrl("https://genfractals.vercel.app")
// With:
loadUrl("file:///android_asset/www/index.html")
```

Rebuild APK and reinstall. The app will load from device storage — instant launch, zero network dependency.

---

## Phase 10 — Optional: Google Play Publishing

If we ever want to list it on Google Play for Android TV:
1. Switch to a signed release APK (generate keystore in Android Studio)
2. Create a `LEANBACK_LAUNCHER` category banner at exactly **320×180px**
3. Create a 10-second preview video of the fractal running
4. Submit to Google Play Console under the **TV** device category
5. Note: Google Play review for TV apps checks D-pad navigability — our app intentionally has no navigation, so include a description noting it is an art installation / ambient display app

---

## Summary Checklist for Copilot / Agent Executing This Plan

- [ ] Create `android/` project structure in Android Studio
- [ ] Write `AndroidManifest.xml` with both `LEANBACK_LAUNCHER` activity and `DreamService`
- [ ] Write `FractalWebView.kt` shared helper
- [ ] Write `MainActivity.kt` (fullscreen, back-button swallowed)
- [ ] Write `FractalDreamService.kt`
- [ ] Create `res/xml/dream_info.xml`
- [ ] Create `res/values/strings.xml` and `styles.xml`
- [ ] Generate `banner.png` (320×180px) and `ic_launcher.png`
- [ ] Build debug APK
- [ ] ADB connect to Bravia over Wi-Fi
- [ ] `adb install` the APK
- [ ] Verify launcher app appears in TV home grid
- [ ] Verify screensaver appears in Settings → Screen Saver
- [ ] Test `lyrical-drift` mode fullscreen on 4K display
- [ ] (Optional) Copy `dist/` to assets for offline mode

---

## Notes for the Executing Agent

- All web source lives in `src/` — **do not modify web source** during Android work unless fixing a performance issue identified during TV testing.
- The current production URL is `https://genfractals.vercel.app` — use this as the WebView URL unless switching to offline bundle mode.
- The `lyrical-drift` mode (Newton fractal) was added on 2026-04-17 and is in production. It is the primary visual mode for the screensaver use case — slow, warm, full-screen.
- Hardware acceleration in WebView is on by default for API 23+. For API 21–22 devices, add `android:hardwareAccelerated="true"` explicitly to both the `<activity>` and `<service>` tags.
- The app has no user input requirements — D-pad, remote, touch are all irrelevant. Any key press in `DreamService` mode (`isInteractive = false`) will wake the TV normally.
- ADB over Wi-Fi (port 5555) is the preferred install path for the Bravia. No USB cable needed.
