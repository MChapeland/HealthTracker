# Health Tracker

Personal desktop app for tracking weight loss, nutrition, physical activity, and daily habits over time.

## Stack

- **Tauri 2** — native Windows desktop shell (React + Rust codebase)
- **Axum** — Rust HTTP server for the cloud-hosted web version (shares the same Rust service logic)
- **React + TypeScript + Vite** — UI (shared between desktop and web)
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

## Google Sign-In and sync (optional)

Cross-device sync uses your Google account and stores an app backup in Google Drive’s hidden **App Data** folder (free; no server to host).

1. Create a [Google Cloud project](https://console.cloud.google.com/) and enable the **Google Drive API**.
2. Create OAuth clients:
   - **Desktop app** for Windows
   - **Web application** for the cloud-hosted web version, with the redirect URI `https://<your-domain>/api/auth/google/callback`
3. Copy [`.env.example`](.env.example) to `.env` and set:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_CLIENT_SECRET` (desktop builds only — never shipped to the web bundle)
4. Rebuild the app. In **Settings → Account & sync**, sign in with Google and use **Sync now**.

The desktop app works fully offline without signing in.

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

## Cloud web version

The same React UI also runs in any browser, served by a small Axum (Rust) HTTP
server that shares the exact same service/business logic as the desktop app.
This lets you use Health Tracker from a phone or any PC.

### Architecture

- **Desktop**: React → Tauri `invoke` → shared Rust services → local SQLite.
- **Web**: React → `fetch /api/*` → Axum server → the same shared Rust services
  → SQLite on a persistent volume.

The frontend picks the transport automatically at runtime (`isTauri()`), so no
page code changes between desktop and web. The browser bundle never contains
Tauri globals, AI keys, the Google client secret, or refresh tokens.

> **Note:** the desktop and cloud databases are **separate**. They do **not**
> auto-sync. Use **Google Drive sync** (Settings → Account & sync) or manual
> **Export / Import backup** to move data between them.

### Run the server locally

```bash
npm install
npm run build            # produces dist/ (required: it is embedded + served)
cd src-tauri
# minimum required config:
$env:APP_PASSWORD="dev-password"   # PowerShell;  export APP_PASSWORD=... on bash
$env:SECURE_COOKIES="false"        # allow cookies over http://localhost
cargo run --release --bin health-tracker-server
```

Then open `http://localhost:3000` and log in with `APP_PASSWORD`.

For split dev (Vite on :1420 + server on :3000), set `VITE_API_BASE_URL` for the
frontend and `WEB_CORS_ORIGINS=http://localhost:1420` for the server.

### Environment variables (server)

| Variable | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD` | yes | Single-user login password. The server refuses to start without it. |
| `SESSION_SECRET` | recommended | ≥64-byte random string used to sign session cookies. If unset, an ephemeral key is generated (sessions reset on restart). |
| `DATABASE_PATH` | no | SQLite path. Defaults to `data/tracker.db`. In Docker it is `/data/tracker.db`. |
| `PORT` | no | Listen port. Defaults to `3000` (Docker image sets `8080`). |
| `STATIC_DIR` | no | Directory of the built SPA. Defaults to `dist`. |
| `SECURE_COOKIES` | no | `true` (default) marks cookies `Secure`; set `false` only for local `http`. |
| `WEB_BASE_URL` | for OAuth | Public HTTPS URL, used to build the Google OAuth redirect. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Drive sync | Web OAuth client credentials (kept server-side). |
| `GOOGLE_REDIRECT_URI` | no | Defaults to `<WEB_BASE_URL>/api/auth/google/callback`. |
| `WEB_CORS_ORIGINS` | no | Comma-separated allowed origins; only needed for split dev. |

### Deploy with Docker / Fly.io

A multi-stage [`Dockerfile`](Dockerfile) builds the frontend and the server and
produces a runtime image. Migrations run automatically on first boot.

Using [Fly.io](https://fly.io) ([`fly.toml`](fly.toml) provided):

```bash
fly launch --no-deploy            # or edit the app name in fly.toml
fly volumes create health_tracker_data --size 1
fly secrets set APP_PASSWORD="a-strong-password"
fly secrets set SESSION_SECRET="$(openssl rand -base64 48)"
# optional, for Google Drive sync:
fly secrets set GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..." \
  WEB_BASE_URL="https://your-app.fly.dev"
fly deploy
```

Fly provides HTTPS automatically. The SQLite database lives on the mounted
volume at `/data`. For the web Google OAuth flow, register the redirect URI
`https://your-app.fly.dev/api/auth/google/callback` as a **Web application**
OAuth client in the Google Cloud Console.
