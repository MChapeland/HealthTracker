# Health Tracker

Personal desktop app for tracking weight loss, nutrition, physical activity, and daily habits over time.

## Stack

- **Tauri 2** — native Windows desktop shell and **Android** (same React + Rust codebase)
- **React + TypeScript + Vite** — UI
- **SQLite** — local database (`tracker.db` in app data directory)
- **Tailwind CSS** — styling
- **Recharts** — analytics graphs

## Features

- Daily entries: weight, walking (steps/distance/time with auto-conversion), workouts, food log, notes
- Reusable food library with automatic calorie calculation
- Configurable calorie zones and daily scoring
- Timeline, dashboard, and analytics views
- Streak tracking and JSON backup export
- First-run onboarding wizard

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri prerequisites for Windows](https://v2.tauri.app/start/prerequisites/)

## Launch the app

**Development:** double-click [`Launch Health Tracker.bat`](Launch%20Health%20Tracker.bat) or run `npm run tauri dev`.

**Pin to Start menu or taskbar:** Windows needs a real `.exe`, not the `.bat` file.

1. Build the app (one time, may take several minutes):

```powershell
npm run tauri build
```

2. Install shortcuts to Start menu and Desktop:

```powershell
.\install-windows-shortcuts.ps1
```

Or build and install in one step:

```powershell
.\install-windows-shortcuts.ps1 -Build
```

3. Press the **Windows** key, search for **Health Tracker**, then **right-click → Pin to Start** or **Pin to taskbar**.

You can also right-click the **Health Tracker** shortcut on your Desktop → **Pin to taskbar**.

Shortcut-only install: `npm run install:windows`

## Custom app icon

1. Create a **square** image (PNG or SVG, ideally **1024×1024**, with transparency if you want rounded corners on Windows).
2. Save it anywhere, e.g. `app-icon.png` in the project root.
3. Regenerate all platform icons:

```powershell
npm run tauri icon app-icon.png
```

This overwrites the files in [`src-tauri/icons/`](src-tauri/icons/) (`icon.ico`, PNG sizes, etc.) listed in `tauri.conf.json`.

4. Rebuild and refresh shortcuts:

```powershell
npm run tauri build
.\install-windows-shortcuts.ps1
```

5. If the taskbar still shows the old icon, unpin and pin again (Windows caches icons).

## Android

The Gradle project is in [`src-tauri/gen/android`](src-tauri/gen/android). See [`android/README.md`](android/README.md) for prerequisites and install steps.

```powershell
. .\scripts\android-env.ps1
npm run tauri android init   # first time only, if gen/android is missing
npm run android:dev          # emulator/USB (Windows-friendly; see android/README.md)
npm run android:build        # release APK
```

The default build produces:

`src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`

Install with:

```powershell
adb install -r path\to\your.apk
```

Android data is stored in app-private storage (separate from Windows). Use **Settings → Account & sync** (Google Sign-In) to sync across devices, or **Export / Import backup** for manual transfer.

## Google Sign-In and sync (optional)

Cross-device sync uses your Google account and stores an app backup in Google Drive’s hidden **App Data** folder (free; no server to host).

1. Create a [Google Cloud project](https://console.cloud.google.com/) and enable the **Google Drive API**.
2. Create OAuth clients:
   - **Desktop app** for Windows
   - **Android** with package `com.matth.health-tracker` and your keystore SHA-1
3. Copy [`.env.example`](.env.example) to `.env` and set:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_CLIENT_SECRET` (desktop builds)
4. Rebuild the app. In **Settings → Account & sync**, sign in with Google and use **Sync now**.

The app works fully offline without signing in.

## Development

```bash
npm install
npm run tauri dev
```

### Windows: `cargo` not found

If you see `program not found` for `cargo`, Rust is likely installed but not on your PATH. Either:

1. **Restart your terminal** after installing Rust, or  
2. Run the helper script (adds `%USERPROFILE%\.cargo\bin` for this session):

```powershell
.\dev.ps1
```

To fix PATH permanently: Windows Settings → Environment Variables → edit **Path** → add:

```
%USERPROFILE%\.cargo\bin
```

The **first** `tauri dev` run compiles all Rust dependencies and can take **5–15 minutes**. Later runs are much faster.

## Build

```bash
npm run tauri build
```

Installer output is in `src-tauri/target/release/bundle/`.

## Install on another Windows PC (shareable installer)

To create a **setup file** you can send to someone (no Node.js or Rust on their machine):

1. On your dev PC, install [Node.js](https://nodejs.org/) and [Rust](https://rustup.rs/) plus [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/).

2. Build the installer:

```powershell
npm install
npm run package:windows
```

Or double-click **`Build Windows Installer.bat`**.

3. Copy the **`release`** folder (or just these two files) to the other PC:
   - `Health-Tracker-Setup-0.1.0.exe` (name includes your version)
   - `INSTALL.txt`

4. On the other PC: run the `.exe`, follow the wizard, then open **Health Tracker** from the Start menu.

The installer includes the app and will install **WebView2** if needed. Data stays local under `%APPDATA%\com.matth.health-tracker\`.

**Note:** Unsigned apps may show a Windows SmartScreen prompt; choose **Run anyway** / **More info** (see `INSTALL.txt`).

## Database location

On Windows, the SQLite file is stored under:

`%APPDATA%\com.matth.health-tracker\tracker.db`

Use **Settings → Export backup** to save a JSON copy of your data.
