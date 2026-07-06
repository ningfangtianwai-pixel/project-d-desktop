# Acceptance Checklist

## Stage 0

- [x] Project source exists in `D:\桌面操作系统`.
- [x] Electron + Vue 3 + TypeScript + Vite structure exists.
- [x] `src/main` exists.
- [x] `src/preload` exists.
- [x] `src/renderer` exists.
- [x] `src/settings` exists.
- [x] `src/shared` exists.
- [x] `package.json` exists.
- [x] `tsconfig.json` exists.
- [x] `vite.config.ts` exists.
- [x] `electron-builder.yml` exists.
- [x] Main Electron window implementation exists.
- [x] Settings window placeholder implementation exists.
- [x] Tray menu implementation exists.
- [x] Preload IPC bridge implementation exists.
- [x] Placeholder app icon exists at `resources\app-icon.png`.
- [x] `pnpm install` succeeds.
- [x] `pnpm typecheck` succeeds.
- [x] `pnpm build` succeeds.
- [x] `pnpm dev` starts the app.

## Stage 1 Preview

- [x] SQLite initialization exists.
- [x] App state key-value storage exists.
- [x] Default containers are inserted.
- [x] Default settings are inserted.
- [x] Log files are generated.
- [x] Database file is generated under userData.
- [x] Database schema contains all required V1 tables.
- [x] Settings survive through local database persistence.
- [x] Database and settings are reachable through preload IPC.
- [x] `pnpm typecheck` succeeds after Stage 1.
- [x] `pnpm build` succeeds after Stage 1.
- [x] `pnpm dev` starts after Stage 1.

## Stage 2 Preview

- [x] Desktop scan IPC exists.
- [x] Desktop files are classified and written to `desktop_files`.
- [x] Container UI renders real scanned files.
- [x] Double-click opens files through main-process safe file opening.
- [x] Single click selects a file and shows preview information.
- [x] Right-click menu structure exists.
- [x] Manual refresh scan exists.
- [x] Missing files are marked instead of physically deleting database records.
- [x] Native desktop incremental watcher exists.
- [x] Move-to-container persistence exists.
- [x] Internal alias action exists.
- [x] Hide-from-Project-D action exists.

## Stage 3 Preview

- [x] Activate/deactivate state machine exists.
- [x] Recovery script is generated.
- [x] Boot recovery check runs before UI render.
- [x] Windows desktop icon hide/show adapter exists.
- [x] Safe mode fallback exists.
- [x] Desktop state logs are generated.
- [x] User-readable state message exists in renderer.
- [x] Desktop overlay window exists.
- [x] Activate/deactivate demo recording exists.
- [x] Windows desktop icons are restored after demo.
- [x] `pnpm dev` smoke test still starts after demo changes.
- [x] Boot recovery banner exists.

## Stage 4 Preview

- [x] PixiJS dependency exists.
- [x] Dynamic wallpaper component exists.
- [x] Wallpaper renders in main page.
- [x] Wallpaper renders in overlay page.
- [x] Dedicated wallpaper route exists.
- [x] Dedicated wallpaper window exists.
- [x] Wallpaper window attaches to Windows desktop host.
- [x] Wallpaper host failure is logged and falls back without covering the desktop.
- [x] Canvas fallback exists.
- [x] WorkerW-preferred host selection with Progman fallback exists.
- [x] Explorer/window-chain periodic repair exists for wallpaper host.
- [ ] Multi-monitor wallpaper host exists.
- [x] Safe pointer-move background interaction exists without blocking clicks.
- [x] Dynamic wallpaper on/off setting persists.
- [x] Full wallpaper style settings persist.
- [x] Pull-cord wallpaper style switching exists.
- [ ] Real wallpaper assets exist.

## Stage 5 Preview

- [x] Weather particle entry exists.
- [x] Weather settings are read by visual layer.
- [x] Manual weather settings persist from UI.
- [x] OpenWeatherMap adapter exists.
- [x] Cached/manual weather fallback exists.
- [x] Weather API key can be stored locally without exposing it to renderer snapshots.
- [x] Weather can auto-locate by public network IP when city is blank.
- [x] IP-derived city and coordinates persist locally.
- [x] Live OpenWeatherMap weather verification passed.
- [x] Leaves and light weather particle modes exist.

## Stage 6 Preview

- [x] Pet placeholder exists.
- [x] Pet can be dragged.
- [x] Pet position persists in `app_state`.
- [x] Pet can show a bubble on double-click.
- [x] Pet runs in an independent transparent Electron window.
- [x] Pet window is skip-taskbar and always-on-top.
- [x] Pet show/hide/reset tray controls exist.
- [x] Pet movement uses safe preload IPC.
- [x] Lightweight pet action state machine exists.
- [x] Pet double-click/right-click can open the main AI/control window.
- [ ] Spine/sprite asset pipeline exists.
- [ ] Pet outfit/weather hooks exist.

## Stage 7 Preview

- [x] Settings save path writes to SQLite.
- [x] AI chat panel exists.
- [x] Local AI fallback response exists.
- [x] DeepSeek provider slot exists.
- [x] Xiaomi MiMo provider slot exists.
- [x] OpenAI-compatible provider slot exists.
- [x] Ollama provider slot exists.
- [x] Chat history persists to `chat_history`.
- [x] Persistent recovery banner exists.
- [x] Packaged-mode `sql.js` wasm lookup is hardened.
- [x] DeepSeek key can be stored locally without exposing it to renderer snapshots.
- [x] DeepSeek live connectivity verification passed.
- [x] Provider keys are encrypted at rest with Electron `safeStorage`.

## Stage 8 Preview

- [x] Automatic public-IP weather location exists.
- [x] Detected city and coordinates persist.
- [x] OpenWeatherMap live verification passed.
- [x] DeepSeek active provider configuration exists.
- [x] DeepSeek live verification passed.
- [x] Xiaomi MiMo provider slot remains available for future key/endpoint.

## Stage 9 Preview

- [x] `pnpm dist` succeeds.
- [x] NSIS installer artifact exists.
- [x] `win-unpacked` app artifact exists.
- [x] Packaged app starts and remains alive during smoke test.
- [x] Packaged app logs database initialization.
- [x] Packaged app logs desktop scan.
- [x] Packaged app logs native desktop watcher startup.
- [x] Packaged app logs pet window show.
- [x] Packaged app logs wallpaper host attach.
- [x] Packaged smoke test adds no new Project D error bytes.
- [x] `sql-wasm.wasm` is unpacked for packaged runtime.
- [x] External `chokidar` dependency is removed from runtime dependencies.
- [x] Electron is only a development dependency.
- [x] Main process uses packaged-stable CommonJS output.
- [ ] Installer wizard install/uninstall flow is manually verified.

## Stage 10 Preview

- [x] Main desktop preview uses icon tiles instead of file-manager rows.
- [x] Overlay desktop route uses icon tiles instead of file-manager rows.
- [x] Overlay page is fixed full-screen and does not behave like a scrollable document.
- [x] Overlay containers are positioned by desktop coordinates.
- [x] Containers render as translucent shadow regions that reveal the wallpaper underneath.
- [x] File tiles preserve single-click selection.
- [x] File tiles preserve double-click open.
- [x] File tiles preserve right-click menu access.
- [x] Long filenames are clamped inside stable icon tile dimensions.
- [x] Browser visual verification passed for main page and overlay page.
- [x] Production build passes after the desktop-native rendering change.
- [x] Packaged smoke test passes after the desktop-native rendering change.
- [ ] Actual Windows shell icon extraction exists.
- [ ] Overlay container drag/resize persistence exists.
