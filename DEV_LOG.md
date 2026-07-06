# Dev Log

## 2026-07-03

### Stage 0 Initialization

- Created initial Project D source folders under `D:\桌面操作系统`.
- Added Electron, Vue 3, TypeScript, Vite, and electron-builder base configuration.
- Added Electron main process with main window, settings window, tray menu, and IPC handlers.
- Added preload bridge with a small whitelisted `window.projectD` API.
- Added renderer control surface and settings placeholder page.
- Generated placeholder `resources/app-icon.png` for the current electron-builder configuration.

### Commands

- `New-Item -ItemType Directory -Force -Path ...`
  - Result: success.
- `pnpm install`
  - Result: first run downloaded dependencies but failed with `ERR_PNPM_IGNORED_BUILDS`.
  - Cause: pnpm 11 blocked required postinstall scripts for `electron`, `electron-winstaller`, and `esbuild`.
- `pnpm approve-builds --all; pnpm install`
  - Result: success. Electron and esbuild postinstall scripts completed.
- `pnpm add -D @types/node`
  - Result: success. Added Node type definitions required by the Electron main/preload TypeScript build.
- `pnpm typecheck`
  - Result: initially failed because `tsconfig.json` used project references without `composite`, then because TypeScript aliases were missing, then because NodeNext imports needed `.js` extension.
  - Fixes: removed unnecessary project reference, added `paths` aliases, and changed `src/shared/types.ts` to import `./ipc.js`.
  - Final result: success.
- `pnpm build`
  - Result: success. Vite built renderer output and TypeScript built Electron main/preload output.
- `pnpm dev`
  - Result: smoke test success. The dev process stayed alive, Vite reported ready, and `127.0.0.1:5173` was open. The smoke-test script stopped the background process after verification.
- `magick -size 512x512 ... resources\app-icon.png`
  - Result: success. Created a temporary Project D app icon for packaging configuration.

### Stage 1 Database and State

- Replaced the originally planned `better-sqlite3` native driver with `sql.js` after user approval.
- Preserved the SQLite database requirement, schema shape, local `database.sqlite` persistence, app state, and default seed data.
- Added `src/main/database.ts` with schema creation, default seed records, `app_state` KV, settings snapshot, container queries, and file persistence.
- Added `src/main/logger.ts` with `userData/logs/app.log`, `error.log`, `desktop-state.log`, and `ai.log` support.
- Wired database initialization before renderer window creation.
- Added IPC for database status, containers, settings, app state get/set, and opening the logs directory.
- Updated renderer and settings UI to read real Stage 1 data.
- Added `scripts/verify-db.cjs` and `pnpm verify:db`.

### Stage 1 Commands

- `pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3`
  - Result: not executed because PowerShell rejected `&&` syntax in this host shell before any dependency install happened.
- `pnpm add sql.js`
  - Result: success.
- `pnpm add -D @types/sql.js`
  - Result: success.
- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm dev`
  - Result: smoke test success. Vite opened `127.0.0.1:5173`; Electron stayed alive until test cleanup; database and logs were created.
- `node` database verification snippet
  - Result: success. Found 12 tables, 7 containers, 1 layout, 1 wallpaper config, 1 weather config, 1 pet config, 1 AI config, and 5 app_state rows.

### Stage 2 Desktop Scan and Containers

- Added `src/main/file-scanner.ts`.
- Implemented desktop scanning through `app.getPath("desktop")`.
- Added system file filtering for `.DS_Store`, `desktop.ini`, `Thumbs.db`, Office temp files, hidden dotfiles, and Project D recovery/cache shortcuts.
- Added extension-based classification for program, document, image, media, code, archive, design, folder, and other.
- Added desktop file upsert and missing-file marking in `src/main/database.ts`.
- Added safe file lookup by `fileId`.
- Added IPC channels for scan, get files, open file, and open file location.
- Main process now runs an initial desktop scan after database initialization.
- Renderer now shows real files inside database-backed containers.
- Added manual refresh, single-click selection, double-click open, and right-click menu structure.

### Stage 2 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm dev`
  - Result: smoke test success. Vite opened `127.0.0.1:5173`; Electron stayed alive until test cleanup.
- Database verification snippet
  - Result: success. Found 42 active desktop file records and 0 missing records.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 42 active desktop files, and app_state rows.

### Reference Review

- Reviewed `booleamu/DesktopPet` for Electron desktop pet interaction ideas: state machine, drag/drop, right-click actions, transparent click-through, and tray controls.
- Reviewed `OXOYO/Flying-Bird-Wallpaper` for wallpaper module direction: Electron + Vue 3 dynamic wallpaper app, auto switching, multi-source wallpaper handling.
- Reviewed `Leonard-Li777/yonuc-ai-folder-desktop` for virtual file organization direction: local-first AI file analysis, virtual folders, one-click organization, privacy-aware local processing.
- No reference code was copied into Project D.

### Stage 2 Watcher and Virtual File Actions

- Added `chokidar`.
- Added desktop watcher with 500ms debounce and 2000ms max batch delay.
- Added migration columns for `display_name` and `is_hidden`.
- Added move-to-container persistence.
- Added internal display alias persistence.
- Added hide-from-Project-D persistence.
- Added renderer subscription for `desktop:files-updated`.
- Made right-click menu actions active for open, open location, move to container, rename display name, hide, and refresh.

### Stage 2 Additional Commands

- `pnpm add chokidar`
  - Result: success.
- `pnpm typecheck`
  - Result: success after watcher and virtual file actions.
- `pnpm build`
  - Result: success after watcher and virtual file actions.
- `pnpm dev`
  - Result: smoke test success. App stayed alive; app log recorded `desktop watcher started`.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, and 0 missing files.

### Stage 3 Activate/Deactivate Recovery Foundation

- Added `src/main/desktop-controller.ts`.
- Added desktop state model: `idle`, `activating`, `active`, `deactivating`, `safe-mode`, and `error`.
- Generated `ProjectD-Recover-Desktop.bat` into Electron `userData`.
- Added boot recovery check before renderer window creation.
- Added Windows `HideIcons` registry adapter for activate/deactivate.
- Added safe-mode fallback if Windows desktop icon control fails.
- Routed tray and renderer activate/deactivate through the controller.
- Added desktop-state logging.
- Renderer now displays user-readable desktop state messages.

### Stage 3 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success.
- `pnpm dev`
  - Result: smoke test success. Recovery script generated and boot recovery path initialized. Real hide/show was not triggered during automated test.

### Stage 4/5/6 Visual, Weather, Pet

- Added `pixi.js`.
- Added `src/renderer/components/WallpaperStage.vue`.
- Added Pixi animated wallpaper ribbons with weather particle entry.
- Added Canvas fallback when Pixi/WebGL is unavailable.
- Added `src/renderer/components/PetWidget.vue`.
- Pet placeholder can be dragged, double-clicked for a bubble, and persists position in `app_state`.
- Added browser-preview fallback API in `src/renderer/main.ts` so the UI can be visually checked outside Electron without preload.

### Stage 4/5/6 Commands

- `pnpm add pixi.js`
  - Result: success.
- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- Browser visual check
  - Result: success. Found 2 browser-preview zones, 1 file row, wallpaper canvas fallback, pet widget, and idle status.

## 2026-07-04

### Safe Desktop Organization Demo

- Added an environment-only demo autorun path for recording: the app waits, activates desktop control, shows the overlay, deactivates, and exits when requested.
- Fixed the first recording issue where the main control window stayed in front of the overlay during activation.
- On activation, Project D now hides the main window and shows the overlay desktop window.
- On deactivation, Project D destroys the overlay and restores the main control window.
- Recorded the final desktop organization demo to `D:\桌面操作系统\recordings\projectd-demo-20260704-145945.mp4`.
- Extracted preview image to `D:\桌面操作系统\recordings\projectd-demo-20260704-145945-preview.png`.
- Verified software reset after recording: `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\HideIcons` returned `0x0`.
- Desktop state log confirms activation, icon hiding, overlay creation, deactivation, icon restore, and overlay destruction.

### 2026-07-04 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, 0 missing files, 1 layout, 1 wallpaper config, 1 weather config, 1 pet config, 1 AI config, and 7 app_state rows.
- `ffmpeg` screen recording flow
  - Result: success. Final MP4 and preview image were created under `D:\桌面操作系统\recordings`.
- `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideIcons`
  - Result: success. Returned `0x0` after demo, confirming Windows desktop icons were restored.
- `pnpm dev`
  - Result: smoke test success. Vite served `http://127.0.0.1:5173/`, the process tree was stopped after verification, and `HideIcons` remained `0x0`.

### Stage 6 Pet Window Layer Correction

- Rechecked product alignment after the user clarified that the pet should behave closer to a QQ-style desktop pet.
- Removed the pet from the main control page and overlay page.
- Added route `#/pet` with a transparent pet-only renderer page.
- Added a dedicated Electron `petWindow` that is frameless, transparent, skip-taskbar, non-resizable, and always-on-top.
- Added safe pet IPC channels for getting bounds, moving the pet window, resetting position, showing, and hiding.
- Persisted pet window bounds in `app_state` key `pet_window_bounds`.
- Added tray menu controls: show pet, hide pet, and reset pet position.
- Changed pet window display from `ready-to-show` to `did-finish-load` because transparent Electron windows may not reliably emit a visible-ready state on every launch.
- Recorded the remaining desktop wallpaper-layer limitation in `docs/WINDOW_LAYERING_NOTES.md`.

### Stage 6 Pet Window Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build:main`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, 0 missing files, and 8 app_state rows.
- `pnpm dev`
  - Result: smoke test success. App log recorded `pet window created` and `pet window shown`. `HideIcons` remained `0x0`.
- `Test-NetConnection 127.0.0.1 -Port 5173`
  - Result: `false` after cleanup, confirming no dev-server port residue.

### Stage 4 Wallpaper Desktop Host

- Added `src/main/wallpaper-host.ts`.
- Added a no-compile Windows desktop host adapter using PowerShell + .NET P/Invoke.
- Added `src/renderer/views/WallpaperPage.vue` and route `#/wallpaper`.
- Added a dedicated wallpaper Electron window that loads the wallpaper route.
- The wallpaper window now attempts to attach to the Windows `Progman` / `WorkerW` desktop chain before showing.
- If attachment fails, the wallpaper window hides itself and records a fallback state instead of covering the desktop.
- Added tray controls to start and close the dynamic wallpaper window.
- First attach attempt failed because `FindWindow("Progman", null)` returned `0` on this host.
- Probed the local shell window classes and confirmed `FindWindow("Progman", "Program Manager")` works.
- Added a `Program Manager` title fallback.
- Second attach smoke test succeeded and logged `wallpaper host attach result` with `attached: true` and `parentKind: Progman`.
- Current limitation: the wallpaper window ignores mouse events to avoid blocking desktop interactions. Direct background interaction still needs a separate safe strategy.

### Stage 4 Wallpaper Host Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build:main`
  - Result: success.
- `pnpm dev`
  - Result: smoke test success. Vite served `http://127.0.0.1:5173/`; wallpaper host attached to `Progman`; `HideIcons` remained `0x0`; port `5173` was closed after cleanup.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, 0 missing files, and 9 app_state rows.

### Stage 7 Settings, Weather, AI, Recovery

- Hardened wallpaper host error handling so failed P/Invoke attempts no longer dump the full script into new error messages.
- Added WorkerW-preferred host selection with Progman fallback.
- Added periodic wallpaper host repair to recover after Explorer/window-chain changes.
- Added safe pointer-move wallpaper parallax while keeping the wallpaper window click-through.
- Added `settings:update`, `weather:get-current`, `ai:chat-send`, and `ai:chat-history` IPC channels.
- Added settings persistence for dynamic wallpaper, manual weather, weather mode, city label, particle intensity, pet visibility, AI provider, and auto-activate state.
- Added `WeatherService` with OpenWeatherMap adapter, Open-Meteo env fallback, manual mode, and cached fallback.
- Added `AiService` local fallback chat and persisted chat history.
- Added `ChatPanel` to the main control surface.
- Added persistent boot recovery banner, dismissible by the user.
- Hardened `sql.js` wasm path lookup for packaged mode.
- Expanded `scripts/verify-db.cjs` to check chat history, wallpaper host state, pet bounds, and `sql-wasm.wasm`.
- Removed obsolete page-embedded `PetWidget` after the independent pet window replaced it.
- Added lightweight pet action states: idle, happy, thinking, and sleepy.

### Stage 7 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, 0 missing files, dynamic wallpaper enabled, `wallpaperHost = Progman`, pet bounds stored, and `sql-wasm.wasm` available.
- `pnpm dev`
  - Result: smoke test success. Vite served `http://127.0.0.1:5173/`; wallpaper and pet windows started; wallpaper attached to `Progman`; `HideIcons` remained `0x0`; port `5173` was closed after cleanup.

### Current Known Issues After Stage 7

- WorkerW-preferred code exists, but this host still attaches the wallpaper window to `Progman`. This is functional, but WorkerW attach still needs deeper shell-window probing or a small native helper if strict WorkerW hosting is required.
- Multi-monitor wallpaper windows are not implemented yet.
- OpenWeatherMap live data requires `PROJECTD_OPENWEATHER_API_KEY` and a city value. Without it, Project D uses manual mode or fallback sources.
- OpenAI-compatible and Ollama live calls are not enabled yet; AI currently uses the local fallback service while preserving chat history.

## 2026-07-05

### Provider Configuration Slots

- Added secure weather API key handling.
- Stored the user-provided OpenWeatherMap key in the local SQLite database only.
- Settings snapshot now exposes `apiKeyConfigured` instead of returning the raw key to the renderer.
- Settings update can save weather and AI keys without echoing them back into the UI.
- Added `.env.example` with provider variable names and no real keys.
- Added DeepSeek provider slot with OpenAI-compatible chat call support.
- Added Xiaomi MiMo provider slot with configurable endpoint support.
- Added OpenAI-compatible and Ollama provider call paths.
- AI provider calls fall back to the local assistant when key/endpoint/service is missing.
- Added `docs/PROVIDER_CONFIG.md`.

### 2026-07-05 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed `weatherApiKeyConfigured: true`, `aiProvider: local-fallback`, dynamic wallpaper enabled, and `sql-wasm.wasm` available.
- `pnpm dev`
  - Result: smoke test success. Vite served `http://127.0.0.1:5173/`; wallpaper and pet windows started; wallpaper attached to `Progman`; `HideIcons` remained `0x0`; port `5173` was closed after cleanup.

### Provider Slot Issues Resolved By Live Configuration

- OpenWeatherMap no longer requires a manually typed city when IP geolocation succeeds.
- DeepSeek key has been supplied, stored locally, and verified.
- Xiaomi MiMo live calls still need the actual endpoint and key from the user.

## 2026-07-05 Provider Live Configuration

- Added automatic public-IP geolocation for weather when the city field is blank.
- Weather lookup now prefers stored coordinates, then manual city, then env coordinates, then IP geolocation.
- IP geolocation currently tries `ipapi.co` first and falls back to `ipwho.is`.
- OpenWeatherMap can now query by detected latitude and longitude instead of requiring a manually typed city.
- Detected weather city, latitude, longitude, and location source are persisted locally.
- Added `scripts/configure-providers.cjs` for local-only provider setup through environment variables.
- Added `scripts/verify-weather.cjs` for real weather validation.
- Added `scripts/verify-ai.cjs` for DeepSeek validation.
- Configured the supplied OpenWeatherMap key in local SQLite only.
- Configured DeepSeek as the active provider with `deepseek-chat`.
- Settings page now tells the user that an empty city uses public-IP automatic location.

### 2026-07-05 Live Provider Commands

- `pnpm configure:providers`
  - Result: success. Weather mode set to `auto`; weather location set to IP auto; AI provider set to `deepseek`; keys stored in local SQLite only.
- `pnpm verify:weather`
  - Result: success. IP location source was `ipwhois`; OpenWeatherMap returned live weather for `Chiyoda-ku` with condition `clear`, temperature `26.05C`, humidity `69`, and wind speed `1.34`.
- `pnpm verify:ai`
  - Result: success. DeepSeek returned a valid `deepseek-chat` response.
- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed `weatherMode: auto`, `weatherCity: Chiyoda-ku`, coordinates configured, `weatherLocationSource: ipwhois`, `aiProvider: deepseek`, `aiApiKeyConfigured: true`, and `aiModel: deepseek-chat`.
- `pnpm dev`
  - Result: smoke test success. Vite served `http://127.0.0.1:5173/`; Project D app log recorded application start, database initialization, desktop scan, wallpaper window creation, pet window creation/show, and wallpaper host attach to `Progman`. Port `5173` was closed after cleanup. Electron logged GPU/network shutdown lines after the test process was force-stopped; no new Project D application error was written.

### Current Known Issues After Live Provider Configuration

- The detected city is based on the current public-network egress IP; VPN, proxy, carrier NAT, or corporate network routing can place it in a different city than the laptop's physical location.
- Xiaomi MiMo live calls still need the actual endpoint and key from the user.
- Provider validation is currently CLI-based; settings-page validation buttons are still pending.

## 2026-07-05 Stage 9 Security, Wallpaper, Pet, And Packaging

- Added Electron `safeStorage` encryption for stored OpenWeatherMap and AI provider keys.
- Added startup migration so previously stored provider secrets are rewritten as encrypted local values.
- Kept renderer settings snapshots limited to `apiKeyConfigured` booleans rather than raw keys.
- Added six lightweight wallpaper styles: anime, aurora, ink, garden, ocean, and sunset.
- Added pull-cord wallpaper style switching from the main desktop control surface.
- Added leaves and light weather particle modes.
- Added pet double-click and right-click behavior to open the main AI/control window.
- Moved Electron into `devDependencies` so production packaging is valid.
- Downgraded `electron-builder` to `24.13.3` because `26.15.3` crashed during packaging in this environment.
- Added `asarUnpack` for `node_modules/sql.js/dist/sql-wasm.wasm`.
- Removed the external `chokidar` watcher after packaged builds missed transitive runtime dependencies under pnpm/asar.
- Replaced it with native `fs.watch` plus debounced full desktop rescan, which keeps desktop monitoring active and reduces runtime dependency risk on a lightweight laptop.
- Switched the main-process TypeScript output to CommonJS and adjusted startup code so packaged Electron can execute the main module reliably.
- Added bootstrap logging for packaged startup diagnostics.

### 2026-07-05 Stage 9 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- `pnpm verify:db`
  - Result: success. Confirmed weather and AI keys are configured and encrypted in local storage.
- `pnpm verify:weather`
  - Result: success. OpenWeatherMap returned live weather from the IP-derived location.
- `pnpm verify:ai`
  - Result: success. DeepSeek returned a valid response.
- `pnpm dist`
  - Result: success. Generated `release\ProjectD-0.1.0-Setup.exe` and `release\win-unpacked\Project D.exe`.
- `release\win-unpacked\Project D.exe` packaged smoke test
  - Result: success. App stayed alive for 18 seconds, wrote `0` new error-log bytes, logged `desktop watcher started`, showed the pet window, and attached the wallpaper window to the desktop host.
- `pnpm dev`
  - Result: smoke test effectively passed from app logs. The wrapper command timed out during cleanup, but logs recorded application startup, native watcher start, pet window show, and wallpaper attach; Project D Electron processes were cleaned afterward.

### Current Known Issues After Stage 9

- NSIS installer creation is verified, but the full install/uninstall wizard flow has not been run yet.
- Multi-monitor wallpaper host support is still pending.
- Strict WorkerW hosting is not guaranteed on this machine; current functional fallback attaches to `Progman`.
- Real wallpaper asset packs are still pending; current styles are generated lightweight themes.
- The pet still uses a placeholder renderer; Spine/sprite asset pipeline and outfit/weather hooks remain pending.
- Settings-page provider validation buttons are still pending.
- Historical `error.log` still contains old resolved errors; latest packaged smoke test added no new error bytes.

## 2026-07-06 Stage 10 Desktop-Native Rendering Alignment

- Reworked the main desktop preview from file-manager rows into desktop-style icon tiles.
- Reworked the overlay desktop route from list panels into a fixed full-screen desktop layer.
- Added category icon mapping with lucide icons for program, document, image, media, code, archive, folder, design, and other file types.
- Changed Project D containers into translucent shadow regions so the dynamic wallpaper remains visible through them.
- Preserved file selection, double-click open, and right-click file menu behavior on icon tiles.
- Added two-line filename clamping and stable icon tile dimensions to avoid text overflow.
- Added coordinate-based overlay placement using existing `containers.position_x` and `position_y`.
- Added fallback non-overlapping layout for browser preview or any container rows without meaningful coordinates.
- Fixed an older CSS specificity issue where `.overlay-page > :not(.wallpaper-stage)` forced overlay children back to `position: relative`, which broke desktop coordinates.
- Moved overlay status messages into a bottom toast so they do not cover desktop icon zones.
- Updated browser preview mock container coordinates to match the new layout.

### 2026-07-06 Stage 10 Commands

- `pnpm typecheck`
  - Result: success.
- `pnpm build`
  - Result: success.
- Browser visual check for `http://127.0.0.1:4173/`
  - Result: success. Main page uses icon tiles and translucent zones.
- Browser visual check for `http://127.0.0.1:4173/#/overlay`
  - Result: success. Overlay is fixed full-screen, `scrollY = 0`, container zones are non-overlapping, and icons render as desktop tiles.
- `pnpm verify:db`
  - Result: success. Confirmed 12 tables, 7 containers, 43 active desktop files, encrypted weather and AI keys, and packaged SQL wasm candidate.
- `pnpm dist`
  - Initial result: timed out after 240 seconds and left a 0-byte temporary NSIS archive.
  - Fix: stopped the stuck Project D `electron-builder` process, stopped the preview server, removed the 0-byte `project-d-0.1.0-x64.nsis.7z`, and reran with a longer timeout.
  - Final result: success. Generated updated `ProjectD-0.1.0-Setup.exe` and `win-unpacked`.
- Packaged smoke test
  - Result: success. `release\win-unpacked\Project D.exe` stayed alive for 14 seconds, added `0` new error-log bytes, logged `desktop watcher started`, and logged wallpaper host attach with `attached: true`.

### Current Known Issues After Stage 10

- Real wallpaper assets are intentionally pending because the user will provide them later.
- Container drag/resizing and persistence from the overlay are still pending.
- The current icon visuals are system-like category icons, not actual Windows shell icon extraction yet.
- Multi-monitor wallpaper/container placement is still pending.
- Full NSIS install/uninstall wizard testing is still pending.
