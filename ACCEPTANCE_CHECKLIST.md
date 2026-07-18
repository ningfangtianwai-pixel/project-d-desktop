# Acceptance Checklist

## Stage 33 Update And Stability Preflight

- [x] `electron-updater` is integrated with a fail-closed production-feed requirement.
- [x] Stable and beta/gray channels are persisted and mapped to `latest` and `beta` metadata.
- [x] Server-side staged rollout percentages are supported by the updater client.
- [x] Update check, download, progress, and explicit restart/install actions use trusted Settings-only IPC.
- [x] A bundled production feed automatically enables packaged updates after the placeholder is replaced.
- [x] NSIS build generates installer, blockmap, `latest.yml`, and `app-update.yml`.
- [x] User-readable help and release/stability runbooks exist.
- [x] Force-killing the Electron process tree and restarting with the same profile preserves a valid database and restores desktop state.
- [x] A 120-second accelerated high-churn soak exits cleanly without error-log entries or safe-renderer relaunch.
- [x] Transient visual-capture failures no longer consume the confirmed white-screen recovery budget.
- [x] Automated suite passes 108/108 tests and final `pnpm dist` succeeds.
- [ ] Signed, hosted stable-channel `N-1 -> N` update passes on an installed package.
- [ ] Signed beta update passes at staged percentages 5/20/50/100 with rollback evidence.
- [ ] Real 1-hour and 8-hour soak stages pass.
- [ ] Real 24-hour soak passes; the accelerated preflight is not a substitute.
- [ ] Final installer and update payloads are Authenticode-signed and timestamped.

## Stage 32 Renderer Self-Healing And Bounded Shutdown

- [x] Electron dependency, lockfile, and executable report version 43.1.1.
- [x] Electron 43.1.1 is an active stable release under the official support policy.
- [x] Main, settings, overlay, wallpaper, and pet windows register renderer lifecycle supervision.
- [x] Renderer crash, main-frame load failure, preload failure, and sustained unresponsiveness have bounded recovery.
- [x] Resume, unlock, display, and DPI changes probe actual rendered root dimensions.
- [x] Main and Settings reject a near-uniform white bitmap even if `did-finish-load` succeeded.
- [x] Renderer recovery cannot enter an unlimited reload loop.
- [x] Recovery exhaustion relaunches once with hardware acceleration disabled and cannot loop in safe-renderer mode.
- [x] Wallpaper and pet restore their native window state after renderer reload.
- [x] Shutdown cleanup has an 8-second hard deadline and cannot leave an unclosable Electron process indefinitely.
- [x] Automated suite passes 102/102 tests and the production build succeeds.
- [x] Real Electron settings-renderer crash injection recovers to a healthy page.
- [x] Real Electron permanently hung shutdown is terminated at the deadline.
- [x] Rebuilt Stage 32 unpacked artifact passes DOM and direct Chromium visual capture; final NSIS build succeeds.
- [ ] Installed Stage 32 artifact passes a normal tray Exit replay with zero residual processes.
- [ ] Twenty physical sleep/wake and twenty lock/unlock cycles pass without persistent white screen.

## Stage 31 Settings And Desktop Safety

- [x] Settings startup can read the persisted multi-display preference through the trusted state allowlist.
- [x] Optional Recovery Center diagnostics cannot white-screen the complete Settings page.
- [x] Settings exposes a visible load failure instead of remaining indefinitely in a loading state.
- [x] Desktop icon hide/show synchronizes and verifies Explorer's real `SysListView32`, not only the `HideIcons` registry value.
- [x] Desktop activation creates an independent recovery watchdog before hiding Explorer icons.
- [x] The watchdog survives a force-killed Electron main process by launching outside Electron's Windows job object.
- [x] Manual recovery restores icons through Explorer's desktop command without killing or restarting Explorer.
- [x] A real forced-main-process drill automatically restored 65 Explorer desktop items.
- [x] Final live desktop probe reports `visible=true`, `iconCount=65`, and no residual Project D process.
- [x] Stage 31 automated suite passes 95/95 tests; production build, database verification, and Electron 43.1.1 NSIS packaging pass.
- [ ] Repeat the force-kill recovery drill from the newly installed Stage 31 NSIS artifact.

## V2.1 Gate 0/1/2 Foundation

- [x] V2 domain types distinguish action plan, execution, risk level, scene, portal, and consent scope.
- [x] Existing SQLite-compatible `sql.js` persistence remains in place; no native database build dependency was introduced.
- [x] Schema v2 migration state and pre-migration backup marker exist.
- [x] Every implemented real file operation is an L2 move with preview, explicit confirmation, per-item result, audit history, and undo.
- [x] The action engine rejects arbitrary paths, folders, shortcuts, source-missing entries, and target overwrite.
- [x] A user-visible Recovery Center lists action outcomes and exposes eligible undo actions.
- [x] A read-only Folder Portal requires native user directory selection before registration.
- [x] Folder Portal content is dynamically listed rather than copied into `desktop_files`.
- [x] Folder Portal rejects `..`/absolute path escape and reports offline, permission, and large-directory states.
- [x] Workspace Scene saves/restores supported local workspace state.
- [x] All renderer windows use sandbox with context isolation and disabled Node integration.
- [x] Window-open and navigation paths are restricted.
- [x] Global workspace shortcut registration has a persisted conflict/ready result.
- [x] Automated action and portal safety tests pass in temporary directories.
- [x] Approved Desktop/Folder Portal local search supports keywords, extension and source filters without full-disk indexing.
- [x] Search result opening resolves an opaque result ID in the main process rather than accepting a renderer-provided arbitrary path.
- [x] Event-driven desktop-inbox suggestions require three eligible files, retain a six-hour cooldown, and never perform a file operation.
- [x] Suggestion UI offers preview-first review and dismiss controls.
- [x] Startup detects interrupted action journal entries and presents a mutation-free Recovery Center report with completed/resumable/conflicted/missing states.
- [x] New search, suggestion, and recovery IPC endpoints validate sender URL and restrict sensitive recovery inspection to the Settings route.
- [x] Luna accepts only local, allowlisted parse-first intents and can request an L2 desktop-inbox preview without direct execution access.
- [x] Luna locally refuses destructive, arbitrary-move, shell, command, and script wording before an AI provider is called.
- [x] Folder Portal uses non-recursive event refresh with debounce, temporary-file filtering, permission/offline reporting, and watcher cleanup.
- [x] Existing action, portal authorization, desktop control, real-file-open, and AI-chat send endpoints have trusted sender/route validation.
- [x] Everything is absent on this machine and was not auto-installed; default search remains scoped to desktop and user-approved portals.
- [x] Global workspace shortcut and tray activation focus the existing main-window search input without opening or focusing a new desktop-layer window.
- [x] Suggestion delivery supports persistent two-hour snooze, timed mute policy, permanent disable, and Settings re-enable; it never changes file-action execution policy.
- [x] A pure local diagnostics report redacts paths, bearer values, tokens, keys, passwords, and long error strings before a future support export is added.
- [x] Stage 25 production smoke passed: database verification, desktop-host attachment/restore, and x64 NSIS packaging completed successfully.
- [x] Suggestion quiet hours, external fullscreen/low-battery suppression, global and desktop-inbox budgets, per-kind cooldown, visible delivery reason, snooze, disable, and Settings re-enable are implemented.
- [x] Diagnostics preview/export requires explicit consent, supports user-selected recent-error inclusion, applies deterministic allowlisting/redaction/size limits, uses a native save destination, and never exports chat, file names, raw paths, logs, or credentials.
- [x] High-risk renderer IPC binds trusted route and actual BrowserWindow identity; packaged renderer trust resolves the exact entry file.
- [x] Text/image preview is route-restricted, script/secret extensions are excluded, and file size/read limits protect the main process.
- [x] Settings updates pass a main-process runtime schema and restricted app-state allowlist before persistence.
- [x] Stage 26 live Electron visual QA verified main, pet, policy settings, diagnostics preview, consent gating, and Progman attachment without overlap or new blocked-IPC errors.
- [x] Stage 26 final x64 NSIS installer and blockmap build successfully after all review fixes.
- [x] Overlay exposes native Folder Portal authorization and renders only approved portal resources as desktop zones.
- [x] Overlay lists, saves, and applies Workspace Scenes through the persisted scene service.
- [x] Scene save/apply covers container geometry/collapse state, enabled portals, wallpaper, weather intensity, pet state, performance mode, suggestion controls, and unknown-scene rejection.
- [x] Desktop Inbox renders the complete ActionPlan with source, target, category, size, conflicts, confirmation count, and undo entry.
- [x] Overlay search supports scoped desktop/portal queries, keyboard selection, and open/reveal/copy actions.
- [x] Search open/reveal/copy resolves random short-lived handles in the main process instead of accepting renderer paths.
- [x] Portal result resolution rejects lexical escape, child symlink/junction escape, and post-authorization root replacement by persisting and comparing the approved real root.
- [x] Failed Portal watchers release stale handles and reconnect after the configured delay.
- [x] Suggestion evaluation and snooze/disable/policy mutations are serialized; new suggestions are broadcast to main, Overlay, and Luna.
- [x] Luna loads the latest suggestion, announces newly created suggestions, deduplicates events, and routes interaction to review rather than execution.
- [x] Sandboxed preload is bundled without local runtime requires and protected by an automated regression test.
- [x] Main-window Luna review renders every ActionPlan item rather than truncating after four rows.
- [x] Stage 27 automated suite passes 67/67 tests and the production build passes.
- [x] Workspace Scene preserves an explicitly disabled dynamic-wallpaper state instead of re-enabling a stale wallpaper ID.
- [x] Suggestion policy read/merge/write occurs inside the same serialized queue as snooze and disable.
- [x] Live Electron QA confirms real preload IPC, 51 desktop records, translucent desktop containers, Luna, and the full ActionPlan panel.
- [x] Final Stage 27 safe autorun attaches the wallpaper to `Progman`, restores Explorer icons, destroys desktop windows, and exits without a residual Project D process.
- [x] Final Stage 27 x64 NSIS installer and blockmap build successfully after all security/spec review fixes.
- [x] First-run onboarding explains the real desktop model, file-action preview, environment effects, Luna safety, and privacy; progress can resume, skip, complete, and replay.
- [x] Luna does not overlap onboarding and returns according to the persisted pet visibility setting after onboarding closes.
- [x] Privacy Center shows approved directories, AI usage, weather source, diagnostics scope, and suggestion status using trusted existing IPC, with directory authorization revocation available.
- [x] File right-click menus use recognizable command icons in both main and Overlay renderers.
- [x] Action, search, scene, and portal IPC registrations live in their owning modules and are protected by a boundary regression test.
- [x] Free/Pro entitlement scaffolding exists without restricting or degrading any current product capability.
- [x] Stage 28 automated suite passes 72/72 tests and live Electron visual QA covers onboarding, Luna restoration, main workspace, and Privacy Center.
- [x] Stage 28 database verification and final x64 NSIS installer/blockmap build pass after visual-review fixes.
- [ ] Human mouse recording confirms portal picker cancel, scene apply, search open/reveal/copy, and toolbar safe return through the transparent multi-window desktop stack.
- [ ] WallpaperHost cold-start/Explorer-restart/sleep-resume soak completes without ending in `fallback-window-hidden`.
- [ ] Workspace Scene includes pinned resources, to-do summary, and multi-display mapping; portal/weather/pet/wallpaper/performance/suggestion state is complete.
- [ ] Search results include privacy-safe “加入门户” and “放入当前场景” actions; open/reveal/copy is complete.
- [ ] Interrupted live-desktop action recovery has been fault-injected and manually verified.
- [ ] Portal debounce watch, Peek overlay, and user-rebindable shortcut are complete.
- [ ] Everything/Windows Search opt-in provider adapters are complete; the approved Desktop/Portal local index is complete.
- [ ] Luna can generate only validated structured action plans.
- [ ] Suggestion calendar/meeting focus signals and a user-facing suppression history are complete; quiet hours, OS fullscreen/low-battery signals, per-kind budgets/cooldown, and delivered explanation UI are complete.
- [x] Electron is on a currently supported commercial release baseline with full sender validation.
- [ ] Signing, automatic update, release channels, entitlement, diagnostics export, and privacy controls are production-ready.

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
- [x] Real wallpaper assets exist: 6 required styles with 2 local 1920x1080-class assets each.

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
- [x] Pet double-click opens the main AI/control window and right-click opens the native pet menu.
- [x] Native pet menu contains outfit, eight personality, settings, and close actions.
- [x] Pet talk frequency changes the actual bubble schedule, including a silent mode.
- [x] Pet personality changes autonomous bubble language and provider AI voice.
- [x] Pet action interval is applied without the former 30-second hard cap.
- [x] Sprite asset pipeline exists.
- [x] Pet outfit/weather hooks exist.
- [ ] Full Live2D/Spine animation exists.

## Stage 7 Preview

- [x] Settings save path writes to SQLite.
- [x] AI chat panel exists.
- [x] Local AI fallback response exists.
- [x] DeepSeek provider slot exists.
- [x] Xiaomi MiMo provider slot exists.
- [x] OpenAI-compatible provider slot exists.
- [x] Ollama provider slot exists.
- [x] Chat history persists to `chat_history`.
- [x] Provider AI requests include the latest 10 persisted chat messages as conversation context.
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
- [x] Actual Windows shell icon extraction exists.
- [x] Overlay container drag/height-resize/collapse persistence exists.
- [x] Overlay container width resize exists.

## Stage 11 Preview

- [x] Container layout IPC validates id, position, size, and collapsed state.
- [x] Container position persists to SQLite.
- [x] Container height persists to SQLite.
- [x] Container collapsed state persists to SQLite.
- [x] Overlay titlebar exposes drag cursor.
- [x] Overlay titlebar drag code clamps containers to visible viewport.
- [x] Overlay resize handle exists.
- [x] Overlay collapse/expand control exists.
- [x] Browser visual verification confirms absolute-positioned desktop containers.
- [x] Production build passes after container interaction changes.
- [x] Packaged smoke test passes after container interaction changes.
- [ ] Real desktop-window mouse drag/collapse verification is recorded.

## Stage 12 Preview

- [x] Luna Q pet sprites exist under `public\pet\luna-q`.
- [x] Pet sprite manifest exists.
- [x] Pet renderer uses transparent sprites instead of the old circular placeholder portrait.
- [x] Pet supports idle, happy, cheerful, thinking, sitting, sleepy, sleeping, rain, winter, and summer states.
- [x] Pet reacts to click with a bubble and action transition.
- [x] Pet double-click still opens the main Project D window.
- [x] Pet state can react to weather and time-of-day.
- [x] Pet window bounds are large enough for the sprite and bubble.
- [x] Production build passes after pet sprite changes.
- [x] Database verification passes after pet sprite changes.
- [x] Dev smoke starts after pet sprite changes.
- [x] Distribution build passes after pet sprite changes.
- [x] Packaged smoke test passes after pet sprite changes.
- [x] Browser visual verification screenshot exists for the pet.
- [ ] Real desktop always-on-top behavior is manually recorded after the new sprite renderer.

## Stage 13 Preview

- [x] Pet route root/background fill is transparent.
- [x] Pet route no longer contributes an app-level black background.
- [x] Pet has autonomous roaming behavior.
- [x] Packaged runtime confirms pet bounds change after autonomous roaming.
- [x] Drag release is guarded against accidental click bubble.
- [x] Weather particles have richer rain mode.
- [x] Weather particles have richer snow mode.
- [x] Weather particles have richer fog mode.
- [x] Weather particles have richer leaves mode.
- [x] Weather particles have richer light mode.
- [x] Wallpaper ribbons are visually lighter than the previous placeholder stripes.
- [x] Browser wallpaper preview screenshot exists.
- [x] Production build passes after pet transparency/weather changes.
- [x] Distribution build passes after pet transparency/weather changes.
- [x] Packaged smoke test passes after pet transparency/weather changes.
- [ ] Screen recording exists showing the roaming pet over the actual Windows desktop and another app window.

## Stage 14 Preview

- [x] Abstract ribbon-led weather visuals are removed from the primary wallpaper effect.
- [x] Dedicated realistic weather DOM layer exists.
- [x] Fog renders as continuous mist bands instead of oval blobs.
- [x] Falling leaves render as leaf-shaped sprites.
- [x] Light mode renders soft beams and glow motes.
- [x] Weather QA URL override exists without changing persisted settings.
- [x] Browser visual screenshot exists for fog.
- [x] Browser visual screenshot exists for leaves.
- [x] Browser visual screenshot exists for light.
- [x] Production build passes after realistic weather changes.
- [x] Database verification passes after realistic weather changes.
- [x] Distribution build passes after realistic weather changes.
- [x] Packaged smoke test passes after realistic weather changes.
- [ ] Real Windows desktop screen recording exists for fog/leaves/light on the wallpaper host.

## Stage 15 Preview

- [x] Shared wallpaper library manifest exists.
- [x] Wallpaper library includes the current local image assets.
- [x] Preload exposes a safe `getWallpaperLibrary` IPC method.
- [x] Preload exposes a safe `applyWallpaper` IPC method.
- [x] Main process validates wallpaper IDs before applying them.
- [x] Main process applies wallpaper library changes to persisted settings.
- [x] Main process creates/keeps the desktop wallpaper window when a library wallpaper is applied.
- [x] Main process broadcasts settings updates to renderer windows.
- [x] Wallpaper renderer listens for settings updates.
- [x] Wallpaper renderer resolves packaged wallpaper files from the correct `/wallpapers` asset root.
- [x] Settings page can select a wallpaper library asset.
- [x] Settings page can immediately apply the selected wallpaper to the desktop wallpaper layer.
- [x] AI service handles local wallpaper commands before normal provider chat.
- [x] AI service can switch to named wallpapers from the library.
- [x] AI service can cycle to the next wallpaper.
- [x] Overlay pull-cord no longer disables the dynamic wallpaper desktop host.
- [x] Browser mock settings are stateful for wallpaper switching previews.
- [x] Production build passes after wallpaper library and AI control changes.
- [x] Distribution build passes after wallpaper library and AI control changes.
- [x] Packaged startup smoke logs a successful desktop wallpaper host attach after these changes.
- [ ] Screen recording exists showing AI chat changing the real desktop wallpaper host.
- [ ] Final user-provided wallpaper pack is imported.

## Stage 16 Preview

- [x] Settings page no longer uses the disconnected light theme.
- [x] Settings page uses the same dark glass visual language as the main app.
- [x] Overlay Electron window is transparent in normal desktop mode.
- [x] Overlay route no longer renders an internal wallpaper/background stage.
- [x] Overlay page background computes to transparent in browser verification.
- [x] Overlay containers have stronger opacity for file readability.
- [x] Overlay containers use subtler 8px borders.
- [x] Desktop icon tiles are smaller for denser layouts.
- [x] Desktop icon art is smaller.
- [x] Extension/type labels have stronger contrast and pill styling.
- [x] Main pull-cord wallpaper control is repositioned closer to the desktop surface.
- [x] AI chat history panel is taller.
- [x] Right-click menu visual styling is improved.
- [x] Overlay toolbar styling is visually closer to the desktop layer.
- [x] Preview text font fallback is hardened for Chinese and code text.
- [x] One-click clean desktop IPC exists.
- [x] Main UI exposes a clean desktop action.
- [x] Tray menu exposes clean desktop and restore desktop actions.
- [x] Clean desktop mode uses the recoverable desktop icon hide/show controller.
- [x] Production build passes after visual polish and clean desktop changes.
- [x] Database verification passes after visual polish and clean desktop changes.
- [x] Distribution build passes after visual polish and clean desktop changes.
- [x] Packaged startup smoke passes after clearing stale Project D dev processes.
- [ ] Screen recording exists showing clean desktop mode and tray restore on the real Windows desktop.
- [ ] Native Explorer desktop icon coordinate arrangement exists.

## Stage 17 Preview

- [x] Desktop file records can carry optional native icon data URLs.
- [x] Main process extracts native file icons with Electron `app.getFileIcon`.
- [x] Native icon extraction has an in-memory cache.
- [x] Main desktop tiles render native icons when available.
- [x] Overlay desktop tiles render native icons when available.
- [x] Category icons remain as fallback when native icon extraction fails.
- [x] Overlay container bottom-right width/height resize handle exists.
- [x] Overlay width/height resize persists through the existing layout IPC.
- [x] Settings wallpaper library has thumbnail cards.
- [x] Wallpaper thumbnail selected state exists.
- [x] Aesthetic review pass 1 was completed.
- [x] Aesthetic review pass 2 was completed.
- [x] Overlay icon tile measured height was reduced after review.
- [x] Production build passes after native icon and aesthetic changes.
- [x] Database verification passes after native icon and aesthetic changes.
- [x] Distribution build passes after native icon and aesthetic changes.
- [x] Packaged startup smoke passes after native icon and aesthetic changes.
- [x] Native icon visual capture from the real Electron app is recorded.

## Stage 18 Product Hardening And Visual System

- [x] Main and settings windows no longer expose the default Electron application menu.
- [x] Main and settings windows use a native hidden-titlebar overlay with Windows controls preserved.
- [x] Application quit restores desktop icons before windows, database, and tray are closed.
- [x] Startup auto-activate preference now executes the real activate flow.
- [x] Database seeds working 2/4/6/8 layout presets.
- [x] Applying a layout recalculates visible container coordinates for the current work area.
- [x] 6/8-column layouts cap safely when the current display cannot fit 180px containers.
- [x] Overlay files support drag-to-container virtual classification without moving real files.
- [x] Overlay container movement has lightweight edge/container snapping.
- [x] Overlay file context menu contains open, location, virtual move, alias, hide, and refresh actions.
- [x] Main control center exposes the active wallpaper host.
- [x] Main control center exposes weather city and location source.
- [x] Main page has no document-level scrolling at 1180x760.
- [x] Main AI input remains visible with the real 43-file database and persisted chat history.
- [x] Internal scroll regions use compact dark scrollbars instead of Chromium default white bars.
- [x] Settings uses a fixed sidebar with General/Layout/Wallpaper/Weather/Pet/AI/About pages.
- [x] Settings layout page applies the real 2/4/6/8 layout IPC.
- [x] Settings exposes performance mode, desktop recovery, weather source, pet controls, provider test, and history clear.
- [x] Settings root has no outer horizontal or vertical overflow in the packaged Electron window.
- [x] Performance mode changes Pixi and DOM particle budgets and pauses Pixi work while hidden.
- [x] Packaged pet assets resolve correctly under `file://`.
- [x] Pet has a resource-failure visual fallback instead of a broken image icon.
- [x] Transparent pet-window regions can forward clicks while the visible pet remains interactive.
- [x] Pet scale controls the renderer size and Electron window bounds.
- [x] AI wallpaper tool supports weather-based, time-based, and default-dynamic commands.
- [x] Live packaged DeepSeek request returned `provider=deepseek`, `fallback=false`, reply `连接正常`.
- [x] Open-Meteo fallback verification returned live weather after OpenWeatherMap key remained encrypted.
- [x] Wallpaper host PowerShell invocation uses `EncodedCommand` and robust final-JSON parsing.
- [x] Final packaged demo logged `attached=true`, `parentKind=Progman`, then safely deactivated.
- [x] Final packaged demo added 0 new error-log bytes.
- [x] Final database state is `idle`, with 4 layouts and encrypted weather/AI keys.
- [x] Final NSIS installer was rebuilt from the Stage 18 sources.
- [x] Packaged Electron screenshots exist for main, pet, and settings windows.

## Stage 20 Runtime Resilience And Module Deepening

- [x] Wallpaper attachment retry behavior is isolated and unit tested.
- [x] Wallpaper-host repair requests are coalesced instead of running concurrently.
- [x] Display add/remove/metrics events trigger wallpaper-host repair.
- [x] System resume schedules wallpaper-host repair.
- [x] Low-frequency 90-second fallback remains available when Windows events are missed.
- [x] Native pet context-menu construction is isolated and unit tested.
- [x] Wallpaper images and videos are preloaded before replacing the visible asset.
- [x] A failed wallpaper load preserves the previous visible wallpaper.
- [x] Concurrent wallpaper selections use the latest selection and ignore stale completion.
- [x] Wallpaper changes use a bounded crossfade and release the previous layer afterward.
- [x] AI provider context still includes the latest 10 persisted messages.
- [x] Oversized AI history messages are bounded before provider submission.
- [x] Automated test suite passes with 11 tests.
- [x] Browser visual review confirms the wallpaper transition and settings layout have no viewport overflow.
- [x] Packaged Electron log confirms event-driven wallpaper repair reattaches to `Progman`.
- [ ] Packaged corrupt-image and corrupt-video rollback has been manually recorded.
- [ ] Real sleep/wake and multi-monitor display-change repair has been manually recorded.

## Stage 21 Interaction Semantics And Feedback

- [x] Main wallpaper control identifies both the current wallpaper and its style.
- [x] Desktop overlay identifies both the current wallpaper and its style.
- [x] Wallpaper label formatting is shared instead of duplicated across windows.
- [x] Overlay arrows are described as previous/next wallpaper, not previous/next style.
- [x] Direct pet click uses the active personality sentence library.
- [x] Cold-personality direct click is verified in browser and packaged Electron.
- [x] Successful chat submission clears the input.
- [x] Chat input receives focus again after submission.
- [x] Successful chat submission provides visible and accessible status feedback.
- [x] Failed chat submission retains the original text for retry.
- [x] Automated suite passes with 12 tests.
- [x] Stage 21 main and overlay screenshots show no viewport overflow.

## Stage 29 Report Audit And Runtime Completion

- [x] Active `main.ts` contains zero direct `ipcMain.handle` registrations.
- [x] Extracted IPC modules use exact renderer URL, route, window, and sender identity validation.
- [x] Shortcut replacement preserves the previous registered accelerator when the new accelerator conflicts.
- [x] Windows Search returns real local index results with bounded execution and no shell interpolation.
- [x] Everything adapter is optional and does not launch `Everything.exe` as a CLI substitute.
- [x] External search results use opaque expiring main-process handles.
- [x] Search open, reveal, copy, and scene-pin actions have real main-process implementations.
- [x] Scene pinning persists a deduplicated resource reference.
- [x] Automatic rules have schema v3 persistence, CRUD IPC, settings UI, enable/disable, delete, and dry-run preview.
- [x] Automatic rules do not silently move files; physical changes remain behind ActionPlan confirmation.
- [x] Luna chat IPC reaches local intent parsing and exposes the desktop-inbox ActionPlan preview.
- [x] Action execution journals pre/post file identity before and after each move.
- [x] Interrupted actions can resume or roll back without overwriting changed files.
- [x] Full-data export is versioned and excludes API keys, tokens, and encrypted secret values.
- [x] Thorough reset has two UI confirmations, consumes a restart marker, deletes the database, and rebuilds fresh state.
- [x] v2-to-v3 migration creates a pre-migration backup and passes SQLite integrity checking.
- [x] `pnpm typecheck`, `pnpm test` (76/76), and `pnpm build` pass.
- [x] Isolated Electron startup, automatic-rule UI, privacy UI, migration, and reset drills pass.
- [x] Search “加入门户” uses a native folder picker and main-process containment validation before granting a read-only Portal.
- [ ] Scene per-display assignments are restored and tested on multi-monitor hardware.
- [ ] Clean-profile installer/upgrade/uninstall, Explorer restart, sleep/wake, DPI matrix, and four-hour soak pass.
- [x] Scene display IDs, DIP work areas, scale factors, proportional restore, primary-display fallback, and work-area clamping have automated coverage.
- [x] Settings can create one wallpaper/weather stage per display while keeping containers on the primary display.
- [x] Real Explorer restart is detected and the wallpaper stage self-heals to `Progman` without an application error.
- [x] Isolated current-account install, replacement install, launch, and uninstall pass without changing the existing database; final uninstall also removes the empty installation directory.
- [x] Final Stage 30 typecheck, production build, and automated suite pass (87/87 tests).
- [ ] Real sleep/wake, physical multi-monitor/DPI matrix, clean-account install, and four-hour/24-hour soak are recorded.
- [ ] Final Windows installer is code-signed and timestamped; current artifact is unsigned.

## Stage 34 Packaged Startup Reliability

- [x] E-drive startup failure reproduced against the exact installed files.
- [x] Missing packaged `fs-extra` dependency identified as the root cause.
- [x] Electron Builder upgraded to a pnpm-compatible 26.x version that completes packaging on this machine.
- [x] Guarded bootstrap fixes the app name and user-data path before the main module loads.
- [x] Synchronous startup failures write a diagnostic log and terminate instead of leaving a hidden process.
- [x] Packaged-runtime verification loads all 33 required main-process modules from `app.asar`.
- [x] `pnpm test` passes 110/110 and `pnpm dist` produces the NSIS installer.
- [x] E-drive fixed build creates a main window, GPU process, and three renderer processes without a fatal startup log.
- [x] Existing `%APPDATA%\Project D` database and settings are reused after the fix.
- [ ] Physical-display visual confirmation is recorded for the Stage 34 E-drive build.

## Stage 35 Wallpaper Startup Containment

- [x] Wallpaper window remains hidden before desktop attachment settles.
- [x] Wallpaper window remains hidden when attachment fails or enters repair.
- [x] Wallpaper window is shown only after confirmed desktop-host attachment.
- [x] Early Win32 launch probe reports zero visible fullscreen Project D top-level windows.
- [x] Physical-screen capture confirms the main UI is usable and no white overlay blocks other applications.
- [x] Automated suite passes 111/111.
- [x] Packaged runtime probe passes 33/33 modules.
- [x] NSIS installer rebuild succeeds and its SHA-256 is recorded.
- [ ] Installer is Authenticode-signed and timestamped.
- [ ] Clean-account Windows 10/11 installer acceptance is recorded.

## Stage 36 Wallpaper Host P0 Repair

- [x] An unattached wallpaper window can never be forced visible by the Win32 host script.
- [x] The wallpaper HWND is converted to `WS_CHILD` and its real Explorer parent is verified before presentation.
- [x] Wallpaper presentation requires renderer readiness and a non-white visible frame.
- [x] Deliberate all-white renderer injection remains hidden and does not block applications.
- [x] Emergency desktop recovery is registered at `Ctrl+Alt+Shift+Escape` and exposed in the tray.
- [x] Normal Electron wallpaper startup records `renderReady: true` and exits cleanly.
- [x] Final screen, Explorer, desktop icon state, and Project D process cleanup are healthy.
- [x] Automated suite passes 112/112 and the production build passes.
- [x] A new Stage 36 installer is built and its packaged runtime passes 33/33 module loads.
- [x] Twenty-four distinct packaged-product screenshots are captured and indexed.
- [ ] The Stage 36 installer is signed and accepted on clean Windows 10/11 accounts.

## Stage 37 Desktop Shortcut Deployment Recovery

- [x] The desktop shortcut target is identified and its deployed files match the verified Stage 36 release hashes.
- [x] The local acceptance shortcut targets the canonical `release\win-unpacked` build instead of a manually copied directory that can become stale.
- [x] Launching through the real desktop shortcut records `attached: true` and `renderReady: true` without a white fullscreen overlay.
- [x] Two rapid duplicate shortcut launches are rejected by the single-instance lock and leave exactly one root process.
- [x] `Ctrl+Alt+Shift+Escape` destroys the wallpaper host and restores Explorer icons with `HideIcons=0`.
- [x] Run keys, Startup folders, and scheduled tasks contain no hidden Project D launch entry.
- [x] User data remains in `%APPDATA%\Project D` and is not overwritten by the E-drive deployment synchronization.
- [ ] A signed clean-account installer replaces the current manual E-drive deployment for external distribution.

## Stage 38 V3 Runtime And Evidence

- [x] One runtime arbiter composes manual, fullscreen, lock, suspend, thermal, battery, and quality inputs.
- [x] Video, Pixi, Canvas, weather animation, and refresh pause and resume together.
- [x] Fullscreen detection uses one disposable helper instead of repeated PowerShell/WMI launches.
- [x] Login startup and automatic desktop activation are separate settings.
- [x] Per-display wallpaper assignments persist and safely fall back to the global wallpaper.
- [x] Runtime process metrics persist in bounded storage and appear in Recovery Center.
- [x] Wallpaper preload caching is bounded with LRU eviction.
- [x] Soak tooling emits JSON/CSV CPU, memory, process, pause, profile, and machine evidence.
- [x] Stress short test exits cleanly with zero errors.
- [x] Static idle CPU is below the 1% median and 3% P95 reference thresholds on this laptop.
- [x] Asset ledger covers all 12 bundled wallpapers and verifies SHA-256 values.
- [x] GitHub quality workflow includes test, typecheck, build, audit, secret scan, SBOM, and evidence upload.
- [x] Official npm audit reports no known vulnerabilities and Builder still packages successfully.
- [x] Final NSIS package and packaged-runtime verification pass.
- [ ] Four-hour interactive and 24-hour idle reports pass with sufficient memory evidence.
- [ ] Physical multi-monitor, DPI, GPU, sleep/wake, and Windows 10/11 matrix is recorded.
- [ ] Every wallpaper has approved commercial license evidence.
- [ ] Installer, uninstaller, and update package have valid timestamped Authenticode signatures.

## Stage 39 Mixed Displays, Pet Roster, And Clean Desktop Escape

- [x] Wallpaper render density is bounded by display DPI, resolution, and performance profile.
- [x] Pet bounds stay inside small external, portrait, negative-origin, and mixed-resolution work areas.
- [x] Settings and the desktop pet menu expose all five supplied character designs.
- [x] Pet character selection persists through the existing validated settings path.
- [x] `Escape` is registered only while clean desktop is active and is released after recovery.
- [x] Clean desktop refuses to claim success when Explorer icons could not be hidden.
- [x] Concurrent clean-desktop exit requests share one recovery operation.
- [x] Explorer messaging has a bounded timeout and watchdog startup no longer depends on WMI.
- [x] Live Electron acceptance returns `active -> idle`, restores `HideIcons=0`, and reports `escapeRecovered: true`.
- [x] Twenty-four product screenshots include the five-character roster and live desktop pet.
- [x] Automated suite passes 127/127 and the asset gate verifies 17 bundled wallpaper/character sources.
- [ ] Four non-Luna-Q character sheets have final transparent multi-action sprite packs.
- [ ] Physical multi-monitor/DPI acceptance is recorded on more than one real display.

## Stage 40 V3 Commercial Foundations And Release Automation

- [x] IPC composition uses module-owned TypeScript dependency contracts without an `any` service bag.
- [x] Wallpaper video state covers loading, playing, paused, error, fallback, runtime pause/resume, and bounded play attempts.
- [x] Video error and stalled events preserve the previous layer or use a static poster fallback.
- [x] Update failures persist recovery intent and stop automatic retries after a bounded failure budget.
- [x] Install, overwrite-upgrade, corrupt-package, offline, and rollback paths have an explicitly isolated fixture harness.
- [x] Local CycloneDX SBOM, dependency audit JSON, and asset-ledger sync/check/report commands cover all 35 distributed `public`/`assets` files and pass.
- [x] Signed remote configuration rejects tampering, expiry, revision rollback, and protected desktop-core disable attempts.
- [x] Crash aggregation and P0/P1 alert rules implement deduplication, cooldown, escalation, and recovery.
- [x] Server-side order/payment/entitlement tests reject unsigned callbacks and duplicate grants, and revoke entitlement after refund.
- [x] Privacy-policy, user-agreement, and payment-integration drafts are present and marked for legal review.
- [x] Automated quality gate passes 165/165 tests, all TypeScript targets, production build, supply-chain evidence, and release fixture QA.
- [x] Verified Gate 8 controls are connected to AI, weather, wallpaper assets, versions, update checks, durable cursor caching, and a bounded privacy-safe local crash dashboard.
- [x] Electron 43.1.1 NSIS packaging passes and all 39 declared packaged runtime modules load from `app.asar`.
- [ ] Licensed video samples pass the real 100-loop and 300-switch packaged-runtime matrix.
- [ ] Real signed installer and N-2/N-1 update rollback pass on clean Windows 10/11 accounts.
- [ ] Production remote-config delivery, telemetry, alert transport, and operational dashboards are deployed.
- [ ] Production account/payment/entitlement service and real merchant channels pass security and disaster-recovery review.
- [ ] Legal counsel approves all commercial terms and privacy disclosures.

## Stage 41 Internal Beta Qualification

- [x] Version is uniquely identified as `0.2.0-beta.1` instead of reusing the `0.1.0` artifact name.
- [x] No known P0 remains in the exercised startup, renderer, database, desktop recovery, wallpaper recovery, shutdown, and packaging scope.
- [x] Automated quality gate passes 167/167 tests and all build, type, SBOM, audit, asset, and release-fixture checks.
- [x] Forced-process restart restores an integral database and `idle` desktop state.
- [x] Accelerated 120-second renderer stress replay exits cleanly with zero error-log entries after wallpaper-repair serialization.
- [x] Hidden idle preflight meets the CPU target with zero error-log entries.
- [x] Packaged runtime loads 39/39 declared modules.
- [x] Packaged product reaches core-ready and completes a graceful marker-gated shutdown with no errors.
- [x] Installer SHA-256 and a detailed comparison with the prior 0.1.0 baseline are recorded.
- [ ] Four-hour interactive and 24-hour idle soak evidence is complete.
- [ ] Physical Windows/GPU/multi-display/DPI/sleep-wake matrix is complete.
- [ ] Authenticode signature is valid and all commercial asset evidence is approved.
