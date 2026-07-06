# Project D Status

Current stage: Stage 10 - desktop-native icon layout and translucent wallpaper-through container rendering completed

## Stage 0 Scope

- [x] Create Electron + Vue 3 + TypeScript + Vite structure.
- [x] Create `main`, `preload`, `renderer`, `settings`, and `shared` source directories.
- [x] Add base package, TypeScript, Vite, and electron-builder configuration.
- [x] Implement Electron main window startup.
- [x] Implement settings window placeholder.
- [x] Implement tray menu foundation.
- [x] Implement safe preload IPC bridge.
- [x] Create placeholder app icon for packaging config.
- [x] Install dependencies.
- [x] Run typecheck.
- [x] Run build.
- [x] Run dev smoke test.

## Notes

Stage 0 intentionally keeps database, desktop icon mutation, PixiJS particles, pet assets, and AI providers as reserved module structure or UI placeholders. These modules must not be removed in later stages.

## Verification

- `pnpm install`: passed after approving required dependency build scripts for `electron`, `electron-winstaller`, and `esbuild`.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm dev`: smoke test passed; Vite opened `127.0.0.1:5173` and the process stayed alive until cleanup.

## Stage 1 Scope

- [x] Use SQLite-compatible local database without native compilation by switching to `sql.js`.
- [x] Create all required V1 schema tables.
- [x] Seed default containers.
- [x] Seed default layout.
- [x] Seed wallpaper, weather, pet, AI, account, and app state defaults.
- [x] Implement `app_state` KV read/write service.
- [x] Implement log files under `userData/logs`.
- [x] Initialize database before rendering UI.
- [x] Expose database status, containers, settings, and app state through safe IPC.
- [x] Run Stage 1 verification commands.

## Stage 1 Verification

- `pnpm add sql.js`: passed.
- `pnpm add -D @types/sql.js`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm dev`: smoke test passed.
- Database created at `C:\Users\34395\AppData\Roaming\Project D\database.sqlite`.
- Logs created under `C:\Users\34395\AppData\Roaming\Project D\logs`.
- Database content check: 12 tables, 7 containers, 1 layout, 1 wallpaper config, 1 weather config, 1 pet config, 1 AI config, 5 app_state rows.

## Stage 2 Scope

- [x] Implement Windows/macOS desktop path scan through `app.getPath("desktop")`.
- [x] Filter system and temporary files.
- [x] Classify desktop entries into program, document, image, media, code, archive, design, folder, and other.
- [x] Persist scanned files into `desktop_files`.
- [x] Mark missing files instead of deleting records.
- [x] Expose `desktop:scan`, `desktop:get-files`, `desktop:open-file`, and `desktop:open-file-location` IPC.
- [x] Scan desktop automatically during startup.
- [x] Render containers from real database file records.
- [x] Support manual refresh.
- [x] Support single-click selection and preview.
- [x] Support double-click open through main process by `fileId`.
- [x] Add right-click menu structure with active open/open-location/refresh actions.
- [x] Add native desktop incremental watch with debounce.
- [x] Add move-to-container persistence.
- [x] Add internal alias and hide-from-Project-D actions.

## Stage 2 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed.
- `pnpm dev`: smoke test passed after scanner integration.
- Database scan result: 43 active desktop file records, 0 missing records, categories include code, document, folder, media, and program.
- Watcher smoke result: `desktop watcher started` logged under `userData/logs/app.log`.

## Reference Notes

- DesktopPet reference used only for pet-state/window interaction direction: state machine, drag/click interaction, transparent pass-through idea.
- Flying-Bird-Wallpaper reference used only for future wallpaper module direction: wallpaper config/history/source separation.
- Yonuc AI Folder reference used only for file organization direction: virtual organization, local-first processing, AI can be added without moving real files.

## Stage 3 Scope

- [x] Add desktop control state model: idle, activating, active, deactivating, safe-mode, error.
- [x] Generate `ProjectD-Recover-Desktop.bat` under userData.
- [x] Add boot recovery check before renderer window creation.
- [x] Add Windows HideIcons adapter for activate/deactivate.
- [x] Add safe-mode fallback if desktop control fails.
- [x] Persist activate/deactivate state through `app_state`.
- [x] Log desktop state changes into `userData/logs/desktop-state.log`.
- [x] Show user-readable desktop state messages in the renderer.
- [x] Add overlay desktop window layer.
- [ ] Add stronger Windows shell refresh strategy without unnecessary Explorer restart.

## Stage 3 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed.
- `pnpm dev`: smoke test passed without triggering real activate.
- Recovery script exists at `C:\Users\34395\AppData\Roaming\Project D\ProjectD-Recover-Desktop.bat`.
- Desktop takeover demo passed: app hid Windows desktop icons, showed the Project D overlay, then restored Windows desktop icons.
- Final registry check after demo: `HideIcons` returned `0x0`.

## Stage 4 Wallpaper And Visual Theme

- [x] Add PixiJS dependency.
- [x] Add `WallpaperStage` component.
- [x] Render animated wallpaper ribbons in main control page and overlay page.
- [x] Add dedicated wallpaper renderer route.
- [x] Add dedicated wallpaper Electron window.
- [x] Attach wallpaper window to Windows desktop host through no-compile PowerShell P/Invoke.
- [x] Keep wallpaper window mouse-transparent so desktop/file interaction is not blocked.
- [x] Add safe pointer-move wallpaper parallax without intercepting desktop clicks.
- [x] Add Canvas fallback when Pixi/WebGL is unavailable.
- [x] Keep animation light enough for laptop use.
- [x] Add WorkerW-preferred host selection when available, with Progman fallback.
- [x] Add periodic Explorer/window-chain repair for wallpaper host.
- [ ] Add multi-monitor wallpaper host support.
- [x] Add wallpaper dynamic on/off persistence from settings.
- [x] Add six lightweight wallpaper styles with persistent style selection.
- [x] Add pull-cord wallpaper style switching from the desktop control surface.
- [ ] Add real wallpaper asset packs.

## Stage 5 Weather Particles

- [x] Add weather particle rendering entry inside `WallpaperStage`.
- [x] Support clear, rain, snow, fog, leaves, and light visual modes at component level.
- [x] Read weather settings snapshot from preload API.
- [x] Add settings UI persistence for manual weather changes.
- [x] Add OpenWeatherMap adapter, Open-Meteo env fallback, manual mode, and cache fallback.
- [x] Add automatic public-IP geolocation when city is left blank.
- [x] Persist detected city and coordinates into the local database.
- [x] Verify live OpenWeatherMap weather from the detected network location.

## Stage 6 Pet Placeholder

- [x] Add draggable pet UI.
- [x] Add double-click bubble text.
- [x] Persist position into `app_state` through preload IPC.
- [x] Split pet out of main/overlay pages into a dedicated transparent Electron window.
- [x] Keep pet window frameless, skip-taskbar, and always-on-top.
- [x] Add tray controls to show, hide, and reset pet position.
- [x] Add safe IPC for pet bounds, movement, reset, show, and hide.
- [x] Add lightweight pet action state machine.
- [x] Add pet double-click/right-click shortcut to open the main AI/control window.
- [ ] Replace placeholder with Spine/sprite asset pipeline.
- [ ] Add outfit/weather hooks.

## Stage 7 Settings, Weather, AI, Recovery

- [x] Add `settings:update` safe IPC.
- [x] Persist wallpaper, weather, pet, AI, and app state settings to local SQLite.
- [x] Make settings page save real settings.
- [x] Add current weather IPC and cached fallback service.
- [x] Add OpenWeatherMap adapter guarded by `PROJECTD_OPENWEATHER_API_KEY`.
- [x] Store supplied OpenWeatherMap key in local SQLite without writing it to source files.
- [x] Add Open-Meteo fallback guarded by `PROJECTD_WEATHER_LATITUDE` and `PROJECTD_WEATHER_LONGITUDE`.
- [x] Add local AI fallback chat service.
- [x] Add AI provider slots for OpenAI-compatible, DeepSeek, Xiaomi MiMo, and Ollama.
- [x] Persist AI chat messages into `chat_history`.
- [x] Add AI chat panel to main control surface.
- [x] Add persistent boot recovery banner until user dismisses it.
- [x] Harden packaged `sql.js` wasm lookup.
- [x] Expand `pnpm verify:db` coverage.

## Stage 8 Provider Live Configuration

- [x] Add `pnpm configure:providers` for local-only provider setup through environment variables.
- [x] Add `pnpm verify:weather` for real IP geolocation plus OpenWeatherMap/Open-Meteo verification.
- [x] Add `pnpm verify:ai` for DeepSeek live connectivity verification.
- [x] Configure the supplied OpenWeatherMap key in local SQLite only.
- [x] Configure DeepSeek as the active AI provider with `deepseek-chat`.
- [x] Confirm OpenWeatherMap live weather succeeds from the current network-derived location.
- [x] Confirm DeepSeek returns a valid chat-completion response.

## Stage 9 Security, Packaging, And Desktop Interaction

- [x] Encrypt stored OpenWeatherMap and AI provider keys with Electron `safeStorage`.
- [x] Migrate previously stored plain provider secrets to encrypted local values on startup.
- [x] Keep renderer settings snapshots limited to `apiKeyConfigured` booleans.
- [x] Add six lightweight wallpaper styles: anime, aurora, ink, garden, ocean, and sunset.
- [x] Add weather particle modes for leaves and light.
- [x] Add pull-cord wallpaper switching on the desktop control surface.
- [x] Add pet double-click/right-click entry into the main AI/control window.
- [x] Replace external `chokidar` watcher with native `fs.watch` plus debounced full desktop rescan to avoid packaged dependency failures and reduce laptop overhead.
- [x] Pin `electron-builder` to `24.13.3` after the 26.x build crashed in this environment.
- [x] Move Electron to `devDependencies` for valid production packaging.
- [x] Build CommonJS main-process output for packaged Electron startup stability.
- [x] Unpack `sql-wasm.wasm` through `electron-builder.yml`.
- [x] Produce NSIS installer artifact and `win-unpacked` app.
- [x] Smoke-test packaged `win-unpacked` app startup.

## Stage 9 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm dist`: passed.
- `pnpm verify:db`: passed; provider key records are encrypted and renderer-safe.
- `pnpm verify:weather`: passed with OpenWeatherMap live data from IP-derived location.
- `pnpm verify:ai`: passed with DeepSeek live response.
- `pnpm dev`: development smoke test started the app; logs recorded desktop watcher start, pet show, and wallpaper host attach.
- Packaged smoke test: `release\win-unpacked\Project D.exe` stayed alive for 18 seconds, added `0` error-log bytes, logged `desktop watcher started`, and logged wallpaper host attach with `attached: true`.
- Packaging artifacts exist at `D:\桌面操作系统\release\ProjectD-0.1.0-Setup.exe` and `D:\桌面操作系统\release\win-unpacked\Project D.exe`.
- `sql-wasm.wasm` is present under `release\win-unpacked\resources\app.asar.unpacked\node_modules\sql.js\dist\sql-wasm.wasm`.

## Visual Verification

- In-app browser check against `http://127.0.0.1:5173/` passed in browser-preview mode.
- Verified visible zones, file row, pet widget, and wallpaper canvas fallback.
- Recorded safe desktop organization demo: `D:\桌面操作系统\recordings\projectd-demo-20260704-145945.mp4`.
- Demo preview image: `D:\桌面操作系统\recordings\projectd-demo-20260704-145945-preview.png`.
- Latest verification commands passed: `pnpm typecheck`, `pnpm build`, `pnpm verify:db`, and a short `pnpm dev` smoke test.
- Latest pet-window smoke test passed: app log recorded `pet window created` and `pet window shown`; `HideIcons` remained `0x0`; port `5173` was closed after cleanup.
- Latest wallpaper-host smoke test passed: app log recorded `wallpaper host attach result` with `attached: true` and `parentKind: Progman`; `HideIcons` remained `0x0`; port `5173` was closed after cleanup.
- Latest feature-batch verification passed: `pnpm typecheck`, `pnpm build`, `pnpm verify:db`, and `pnpm dev` smoke test.
- Latest provider-slot verification passed: `weatherApiKeyConfigured: true`, `aiProvider: local-fallback`, `pnpm typecheck`, `pnpm build`, `pnpm verify:db`, and `pnpm dev` smoke test.
- Latest live-provider verification passed: `pnpm configure:providers`, `pnpm verify:weather`, `pnpm verify:ai`, `pnpm typecheck`, `pnpm build`, `pnpm verify:db`, and `pnpm dev` smoke test.
- Latest packaging verification passed: `pnpm dist`; packaged `win-unpacked` startup logged application start, database init, desktop scan, native watcher start, wallpaper attach, pet window show, and no new Project D error bytes.

## Stage 10 Desktop-Native Rendering Alignment

- [x] Replace file-manager-style rows in the main preview with desktop icon tiles.
- [x] Replace overlay list rendering with desktop icon-grid rendering.
- [x] Use lucide category icons for program, document, image, media, code, archive, folder, design, and other files.
- [x] Render Project D containers as translucent shadow regions that let the dynamic wallpaper show through.
- [x] Keep file click, double-click open, and right-click menu behavior on the new icon tiles.
- [x] Position overlay containers by stored desktop coordinates instead of document flow.
- [x] Add fallback non-overlapping coordinates when preview/mock container positions are missing.
- [x] Make the overlay page fixed full-screen so it behaves like a desktop layer, not a scrollable document.
- [x] Move overlay status messages to a small bottom toast so they do not cover the desktop icon area.

## Stage 10 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed.
- Browser visual verification passed for `http://127.0.0.1:4173/`.
- Browser visual verification passed for `http://127.0.0.1:4173/#/overlay`: overlay fixed full-screen, `scrollY = 0`, containers non-overlapping, translucent backgrounds, and desktop icon tiles visible.
- `pnpm dist`: passed after clearing one timed-out partial NSIS temp file and rerunning with a longer timeout.
- Packaged smoke test passed: `release\win-unpacked\Project D.exe` stayed alive for 14 seconds, added `0` new error-log bytes, logged native watcher startup, and logged wallpaper host attach with `attached: true`.
