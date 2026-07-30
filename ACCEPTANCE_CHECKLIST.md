# Acceptance Checklist

## V6.0 Planning Baseline

- [x] The active product target is consistently named Project D V6.0.
- [x] V6.0 is distinguished from internal version `0.3.0-dev.0`.
- [x] Historical commit `86ae722` and tag `v5.1-wallpaper-first-baseline-20260724` remain unchanged.
- [x] The real planning HEAD `7f04dd7` is recorded separately.
- [x] Native is the ordinary Windows-compatible state.
- [x] Immersive is the explicitly awakened reference-image experience.
- [x] Task allows exactly one active task surface.
- [x] Clean preserves scene and companionship while blocking work surfaces.
- [x] Safe can interrupt every mode and does not depend on AI.
- [x] InteractionState is not a sixth mode.
- [x] The seven-layer model defines input and failure behavior.
- [x] Search, organize, scene, and assistant are the four primary entries.
- [x] Agent tools have read-only, reversible-preview, and explicit-confirmation levels.
- [x] AI cannot bypass ActionPlan or file confirmation.
- [x] AmbientScene extends WorkspaceScene rather than creating a parallel system.
- [x] Pet placement uses scene anchors and safe regions.
- [x] Virtual organization is separated from real file mutation.
- [x] The old default console has a migration and deletion plan.
- [x] The first product slice has measurable acceptance.
- [x] Reference images are Immersive direction, not runtime evidence.
- [x] Runtime assets, docs-only concepts, user imports, and MIT code have separate boundaries.
- [x] The current scope is personal-use-first and open-source-candidate, not commercial GA.
- [x] Future commercial gates are retained separately.
- [x] This planning round modified documentation only.
- [x] The planning baseline correctly records that Phase A has not started.
- [ ] Phase A runtime implementation is complete.
- [ ] Native/Immersive runtime behavior is implemented.
- [ ] The old default console is deleted after equivalence verification.
- [ ] Physical hardware, installer lifecycle, and long-soak gates are closed with evidence.

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

## Stage 42 Acceptance Audit And Hardening

- [x] External assessment claims are reconciled against current repository evidence.
- [x] API keys cannot fall back to plaintext storage or plaintext reads when Windows credential encryption is unavailable; migrated plaintext values are cleared.
- [x] Provider configuration uses Electron `safeStorage` through the production database service.
- [x] Logs have structured levels, bounded rotation, serialization containment, and non-fatal write failure handling.
- [x] Tray and shortcut lifecycle ownership is outside `main.ts` and covered by focused tests.
- [x] Every BrowserWindow has sandbox, context isolation, web security, and Node integration regression coverage.
- [x] Application source has no explicit TypeScript `any` residue.
- [x] CI enforces 80% line, 70% branch, and 80% function coverage thresholds.
- [x] Quality gate passes 175/175 tests and coverage passes at 81.57%/75.52%/83.31%.
- [x] Current-source force-kill restart restores an integral database and `idle` desktop state.
- [x] Current unpacked package loads 39/39 modules, starts core services, exits cleanly, completes shutdown, and writes no error entry.
- [x] Test cleanup leaves no Project D process and restores Explorer `HideIcons=0`.
- [ ] Installer, uninstaller, and update package are Authenticode-signed and timestamped.
- [ ] Production update, operations, telemetry, account, payment, and entitlement infrastructure is deployed and reviewed.
- [ ] Physical Windows/GPU/display/DPI/sleep-wake and real 4-hour/24-hour evidence is complete.
- [ ] All 33 distributed assets have approved commercial license evidence.
- [ ] Legal counsel approves the final privacy policy, user agreement, payment terms, and operating-entity disclosures.

## Stage 43 V4 Free Release Code Baseline

- [x] `0.2.0-beta.2` is injected from one package version into renderer preview, About, diagnostics, and packaging.
- [x] ESLint, 181 Node tests, 2 Vue component tests, and 1 isolated Electron E2E pass.
- [x] Coverage thresholds pass at 82.00% lines, 75.70% branches, and 83.75% functions; Electron/renderer scope is disclosed separately.
- [x] Screen/power listeners, recovery timers, updater listeners, and IPC handlers have idempotent cleanup.
- [x] Supply-chain audit reports zero known info/low/moderate/high/critical vulnerabilities after removing the vulnerable test helper.
- [x] Production package excludes duplicate source assets, build-only dependencies, and source maps while retaining runtime wallpaper/pet assets.
- [x] Installer and `app.asar` pass 180 MiB / 110 MiB budgets at 133.92 MiB / 55.35 MiB.
- [x] Final package loads 39/39 modules and completes core-ready, graceful shutdown, and zero-error packaged smoke.
- [x] Crash-restart restores an integral database and `idle` desktop state; final machine has zero Project D processes and `HideIcons=0`.
- [x] README, SECURITY, CONTRIBUTING, CHANGELOG, V4 scope, external gates, and beta snapshot documentation exist.
- [ ] Repository owner selects and commits a final LICENSE.
- [ ] Legally approved privacy policy and user agreement replace the drafts.
- [ ] All 33 distributed assets have approved distribution evidence.
- [ ] Installer, executable, uninstaller, and update packages are Authenticode signed and timestamped.
- [ ] Production HTTPS update feed and real upgrade/rollback evidence exist.
- [ ] Physical hardware matrix and 4-hour/24-hour soak evidence are complete.

## Stage 44 V4 Final Code Closure

- [x] Complete branch diff review found no net removal of existing product features, tests, or active runtime resources.
- [x] Eight independent Electron E2E scenarios pass for startup, duplicate launch, settings persistence, tray exit, white-screen recovery, force-kill recovery, AI fallback, and corrupt configuration recovery.
- [x] Automatic updater dependency, invalid feed, startup request, download/install IPC, and in-client install states are removed; manual update opens trusted GitHub Releases.
- [x] Database, tray, update, IPC registry/composition, wallpaper host/supervisor, desktop recovery, lifecycle, shutdown, and renderer recovery appear in numeric high-risk coverage gates.
- [x] Full compiled main/shared inventory coverage passes at 73.19% lines, 75.20% branches, and 70.84% functions.
- [x] Diagnostics export removes API keys, tokens, authorization values, email addresses, named-user fields, private filenames, and complete paths.
- [x] Clean checkout with fresh dependency store and sanitized minimal environment passes without local `.env`, project environment variables, absolute workspace dependencies in tracked runtime/config text, uncommitted source, or existing `node_modules`.
- [x] Fixture install/upgrade/rollback/uninstall checks preserve settings/database and desktop state while removing program files and process markers.
- [x] SHA256SUMS, CycloneDX SBOM, source commit SHA, and machine-readable build summary are generated for the final installer.
- [x] 4-hour and 24-hour soak scripts enforce profile thresholds, completion ratio, claim eligibility, and residual-process checks.
- [x] README, MIT LICENSE, SECURITY, CHANGELOG, PRIVACY, DISCLAIMER, CONTRIBUTING, and asset registry skeleton exist.
- [x] Final package passes 38/38 module imports, size budgets, core-ready startup, clean shutdown, no error entries, no residual process, and `HideIcons=0`.
- [ ] Formal privacy/user-agreement text has legal approval.
- [ ] All 33 asset records have approved distribution evidence.
- [ ] Installer has valid Authenticode signature and timestamp.
- [ ] Real Windows install/upgrade/uninstall, physical hardware matrix, and claim-eligible 4-hour/24-hour reports are complete.

## Stage 45 Suggestion And Scene UI Closure

- [x] Settings displays the bounded recent suggestion-suppression history.
- [x] Search results require an explicit scene selection before pinning.
- [x] Scene rows display their pinned-resource counts.
- [x] Focused tests and browser UI acceptance cover all three interactions without horizontal overflow.

## Stage 46 Desktop Experience Regression Closure

- [x] Organizer top controls receive normal pointer clicks after entering the organizer.
- [x] Organizer view has a selected-wallpaper backdrop and a non-black fallback when the wallpaper host is unavailable.
- [x] Glass panels transmit more of the wallpaper while preserving readable text contrast.
- [x] Global and AI-requested wallpaper changes update managed physical-display assignments.
- [x] AI chat renders the complete loaded history, wraps long content, scrolls to the latest message, and keeps the composer visible.
- [x] Settings has a dedicated AI connection-test IPC route that does not pollute chat history.
- [x] Four non-Luna character sheets have transparent full-body single-pose cutouts and load successfully.
- [x] Pet personality selection applies immediately and displays a persona-specific test sentence.
- [x] 190 Node tests, 2 component tests, 9 Electron E2E scenarios, lint, type checks, build, UI QA, and the 37-file asset gate pass.
- [ ] Physical one/two-display wallpaper switching and clean-desktop restoration are recorded.
- [ ] A live request with the user's configured external AI provider succeeds.
- [ ] Four non-Luna characters have final licensed transparent multi-action sprite packs.

## Stage 47 Stale Hidden Desktop Recovery

- [x] A stale `HideIcons=1` state is restored without moving or deleting desktop files.
- [x] Startup checks the real Explorer list-view visibility even when persisted desktop state is `idle`.
- [x] Guarded shutdown restores desktop visibility regardless of cached mode.
- [x] Shutdown recovery preserves unrelated boot diagnostics.
- [x] Corrupted-config, force-kill, and tray-exit Electron E2E scenarios pass.

## Stage 48 DeepSeek V4 Pet Connection

- [x] DeepSeek selection fills the official endpoint and defaults to `deepseek-v4-flash`.
- [x] V4 Flash and V4 Pro are explicit model choices.
- [x] Legacy DeepSeek aliases migrate to the supported low-latency V4 model.
- [x] API credentials are encrypted with Electron `safeStorage` and never returned to the renderer.
- [x] Connection errors distinguish credentials, balance, throttling, and provider availability.
- [x] A real encrypted-key `deepseek-v4-flash` connection test succeeds.
- [x] The packaged shortcut target contains the updated settings and provider logic.

## Stage 49 Desktop, Pet, And Clean Mode Refinement

- [x] Organizer layout uses the live display work area and responsive column counts.
- [x] Organizer glass clearly transmits the selected wallpaper without a black fallback.
- [x] Folder entries use recognizable folder visuals and open their real filesystem paths.
- [x] Windows shell open failures are visible to the user.
- [x] Every selectable pet can animate through walking, dancing, stretching, looking, and surprised states.
- [x] Pet movement is bounded by the complete connected-display union.
- [x] AI prompts preserve personality and provide bounded, actionable troubleshooting.
- [x] Clean desktop hides and verifies the taskbar and desktop icons.
- [x] Clean desktop keeps the display awake without synthetic keypresses.
- [x] Escape/F12/Ctrl+Shift+Q can be selected as the clean-desktop exit shortcut.
- [x] Clean desktop restores taskbar/icons on normal exit and guarded shutdown.
- [x] Real shell-state E2E and all other Electron scenarios pass 10/10.
- [ ] Four non-Luna characters have approved transparent multi-action and multi-outfit artwork.
- [ ] Physical mixed-DPI multi-display and Windows 10 clean-desktop evidence is complete.

## Stage 50 Native Desktop And Personalization Closure

- [x] Folder entries have consistent native-inspired artwork in the main workspace and organizer overlay.
- [x] Folder-target Windows shortcuts are classified as folders without moving their targets.
- [x] Folder previews list real child names and types with a bounded read.
- [x] Organizer safe restore can be invoked from the overlay route.
- [x] A real Electron safe-restore E2E returns desktop mode to idle.
- [x] Explorer recovery ignores optional icon-count timeout after visibility has already been verified.
- [x] Layout choices preserve exactly 2, 4, 6, or 8 columns.
- [x] Wallpaper library supports category filtering, search, direct apply, original export, and stable decoded thumbnails.
- [x] Wallpaper studio exports a local 16:9 PNG with signature and simple sticker layers.
- [x] Dark/light/system themes, privacy disclosure, About attribution, GitHub, email, and MIT code-license scope are present.
- [x] Synthetic outfit stickers are removed for characters without real outfit frames.
- [x] Pet studio performs local edge-connected background removal and transparent PNG export.
- [x] Runtime cache cleanup clears Chromium and bounded icon caches without deleting user data.
- [x] 202 Node tests, 2 component tests, lint, typecheck, build, UI QA, and all 11 Electron E2E scenarios pass.
- [ ] Live Photo/video import and persistent custom-wallpaper ingestion pass packaged-runtime tests.
- [ ] Vision-generated character/personality workflow has an approved provider, consent, moderation, and cost contract.
- [ ] Four non-Luna characters have approved multi-action and multi-outfit transparent packs.

## Stage 51 - Ambient Assets And Creator Closure

- [x] Rain and snow use bitmap-composited multi-depth weather plates rather than a black fill or only abstract line particles.
- [x] Clear, rain, snow, fog, leaves, and light states have screenshot-based visual QA.
- [x] The four non-Luna characters each have six declared action frames: idle, walk, happy, thinking, sleep, and interaction.
- [x] Pet asset verification rejects absent, empty, incorrectly sized, and duplicate non-Luna action frames.
- [x] Visual profiles include identity, dialogue, forbidden-term, and motion guidance.
- [x] AI chat consumes the selected visual profile while preserving the consent-first visual-upload boundary.
- [x] Wallpaper Studio supports templates, fonts, sticker layers, 720p/1080p/1440p output, safe library import, export, and direct apply.
- [x] Generated wallpaper ingestion validates PNG payloads, size limits, thumbnail creation, and cleanup.
- [ ] A live image-provider request has been verified with an approved image-capable provider key.
- [ ] Commercial source and license evidence is recorded for the generated weather, wallpaper, and character-action assets.

## Stage 52 - Native Desktop Icon Failsafe

- [x] An unexpected Project D exit starts a bounded, non-nested desktop-icon recovery watchdog.
- [x] Watchdog recovery retries transient Explorer unavailability without exceeding Windows command-line limits.
- [x] Explorer restart while Project D is active restores the native desktop before runtime repair continues.
- [x] Unexpected organizer-overlay closure restores native icons and taskbar.
- [x] Real-machine verification confirms the desktop icon view is visible with 63 icon objects.

## Stage 53 - Personal Wallpaper And Pet Coherence

- [x] Live Photo imports validate cover decoding, bounded file size, supported container headers, and persist pair metadata.
- [x] Live Photo library entries expose the cover-plus-motion playback defaults.
- [x] Video playback still uses the static cover as its safe fallback.
- [x] Rain, snow, fog, leaves, and light retain screenshot-based visual QA after atmospheric grading changes.
- [x] Weather glints are pruned in balanced and battery-saver profiles.
- [x] Wallpaper Studio offers six templates, five font families, and eight procedural sticker choices.
- [x] Five character identities, eight personalities, and four bubble moments resolve to a declared action plus visual tone.
- [x] Open-source credits state that code licensing does not transfer visual-media rights and local user media is not committed automatically.

## Stage 54 - Wallpaper-First Experience Baseline

- [x] The experience plan is reconciled with the current `0.3.0-dev.0` Stage 53 implementation.
- [x] The plan defines wallpaper, atmosphere, pet, edge-tool, task, Windows, and safety layers with pointer and fallback behavior.
- [x] Quiet, attention, task, clean, and safe states have measurable coverage and interaction constraints.
- [x] Wallpaper subject-safe regions, pet anchor lanes, mixed-display adaptation, and bright/dark glass behavior are specified.
- [x] Organizer, wallpaper studio, weather, pet, AI, scene, settings, and recovery behavior map to current source ownership.
- [x] Eight visual references cover the requested weather, wallpaper, pet, layout, editor, and multi-display directions.
- [x] Every visual reference is retained under a docs-only directory with source-purpose and license-boundary notes.
- [x] The plan distinguishes code-complete work from physical display, DPI, soak, and subjective visual acceptance.
-
## Stage 55 - Quiet Desktop Shell

- [x] A shared experience-state model defines quiet, attention, task, clean, and safe modes.
- [x] Default renderer composition is wallpaper-first and keeps the existing task console reachable.
- [x] Edge tools expose search, organizer, inbox, assistant, wallpaper, and settings entry points.
- [x] Escape closes an active task surface without mutating desktop files or system state.
- [x] Quiet-shell state transitions have dedicated Node coverage.
- [x] Typecheck, lint, 219 Node tests, 2 component tests, and production build pass.
- [ ] Full Electron E2E is green; current run is 10/11 because the Windows taskbar/icon probe timed out in `clean-desktop-system-state`.
- [ ] Task-specific composition replaces the remaining all-in-one legacy console.

## Stage 56 - Task Surface And Organizer Closure

- [x] Search, assistant, inbox, and wallpaper task surfaces hide unrelated legacy controls.
- [x] Organizer retains the spatial file workspace and exposes a bottom action strip.
- [x] Bottom actions provide search, inbox, save scene, undo, and safe restore without changing the ActionPlan contract.
- [x] User-reported browser UI QA enters the assistant task surface before chat-history checks.
- [x] Unique accessible labels prevent duplicate toolbar/task-strip action ambiguity.
- [x] Typecheck, lint, 220 Node tests, 2 component tests, production build, browser UI QA, and critical Electron E2E pass.
- [ ] Full Electron E2E remains blocked only by the Windows taskbar/icon PowerShell probe timeout.
- [ ] Wallpaper task canvas, Live Photo decode probe, and visual profiles remain for Phase D.

## Stage 57 - Wallpaper Studio Task Canvas

- [x] Wallpaper route provides a large wallpaper preview canvas rather than a stage-only placeholder.
- [x] Filmstrip selection identifies the current asset and applied asset.
- [x] Inspector supports direct apply, original export, user-asset deletion, and multi-display assignment.
- [x] Live Photo import validates metadata/container, probes browser decoding, and preserves the previous wallpaper on failure.
- [x] Wallpaper-library import QA passes with cleanup of the temporary user asset.
- [x] Typecheck, lint, 221 Node tests, 2 component tests, and production build pass.
- [ ] Pre-copy chooser preview and crop/safe-region visual profiles remain open.

## Stage 58 - Wallpaper-Aware Pet Anchors

- [x] Bundled wallpaper safe regions declare a left/right pet anchor.
- [x] New pet windows use the active wallpaper safe region without leaving the connected display union.
- [x] Existing manually saved or dragged pet positions remain authoritative.
- [x] Pet size and DPI clamps remain active for small, portrait, and negative-origin displays.
- [x] All five characters retain six verified action slots.
- [x] Typecheck, lint, 222 Node tests, production build, and pet asset verification pass.
- [x] Runtime consented reposition prompt after wallpaper changes is implemented; physical left/right subject evidence remains open.
## Stage 59 - Weather Visual QA And Runtime Tiers

- [x] Clear, rain, snow, fog, leaves, and light states have independent visual QA coverage.
- [x] Rain and snow retain layered bitmap depth plates instead of abstract-only line particles.
- [x] Balanced, automatic, and battery-saver weather pruning is observable in the QA report.
- [x] `pnpm qa:weather-visual` passes and stores screenshots plus metrics under `artifacts/qa/weather-visual`.
- [ ] Physical GPU, multi-display, fullscreen-game, sleep/wake, and long-soak evidence remains outstanding.
## Stage 60 - Consented Pet Repositioning

- [x] Wallpaper changes compare the existing pet window with the assigned display safe region.
- [x] Obstructing positions show a consent prompt instead of moving silently.
- [x] `移到安全区` uses the existing wallpaper-aware anchor reset path.
- [x] `保持原位` preserves the user's saved/manual position.
- [x] Shared safe-region geometry has regression coverage.
- [x] Typecheck, lint, 223 Node tests, 2 component tests, and production build pass.
- [ ] Physical left/right subject screenshot evidence remains outstanding.
## Stage 61 - V5.1 Visual Matrix Capture

- [x] Production-preview capture covers quiet, assistant, organizer, clean, bright-wallpaper, and wallpaper-studio states.
- [x] Every capture verifies a visible wallpaper stage and records its experience mode.
- [x] Machine-readable report and screenshots are stored under `artifacts/qa/v51-visual-matrix`.
- [ ] DPI, physical monitor, GPU, fullscreen, battery, and sleep/wake evidence remains manual.
## Stage 62 - Ambient Overlay Anchoring Fix

- [x] Quiet-state screenshot confirms the edge rail is narrow and viewport anchored.
- [x] Quiet-state screenshot confirms the status capsule is compact and top-right anchored.
- [x] Wallpaper is not hidden behind a full-width dark ambient control panel.
- [x] Escape exits clean mode through the guarded clean-desktop IPC path.
- [x] Typecheck, lint, 225 Node tests, 2 component tests, production build, clean-desktop E2E, and visual matrix pass.
## Stage 63 - DPI-Emulated Visual Matrix

- [x] Matrix captures 125%, 150%, and 200% browser device-pixel-ratio quiet states.
- [x] Each emulated-DPI capture verifies a visible wallpaper stage.
- [ ] Physical Windows DPI and monitor evidence remains outstanding.
## Stage 64 - Shutdown Recovery Hardening

- [x] Windows taskbar restore cannot consume the entire normal shutdown deadline.
- [x] Emergency shutdown timeout remains explicit and logged.
- [x] Tray quit waits for completed cleanup evidence.
- [x] Tray quit repeated 5/5 and full Electron E2E 11/11 pass.
- [ ] Physical taskbar, Explorer, sleep/wake, multi-display, and long-soak evidence remains outstanding.
## Stage 65 - Live Photo Pre-Import Preview

- [x] Live Photo cover and video are validated before library copy.
- [x] The video must pass real renderer decode before confirmation is enabled.
- [x] Cancel, expiry, decode failure, and component unmount leave the current wallpaper unchanged.
- [x] Live Photo confirm/cancel IPC is settings-only and validates opaque UUID tokens.
- [x] Typecheck, lint, 226 Node tests, 2 component tests, production build, and 9-state visual matrix pass.
- [ ] Real paired Live Photo files across MP4/MOV/WebM and malformed media remain manual evidence.
## Stage 66 - Per-Display Wallpaper Fit Mode

- [x] Existing per-display `fit_mode` storage is exposed without changing the database schema.
- [x] Wallpaper Studio can select crop-to-fill or full-image display per monitor.
- [x] Wallpaper stage applies the selected fit mode per display and defaults old data to `cover`.
- [x] IPC validation and 227 Node tests pass.
- [ ] Physical portrait, ultrawide, mixed-DPI, and hot-plug evidence remains manual.
## Stage 67 - Workspace Scene Visual Profile

- [x] Scene data has a bounded visual profile for rail placement, glass preset, audio policy, and display fit mode.
- [x] Scene save captures the current visual profile without introducing a database migration.
- [x] Scene apply restores the visual profile through the existing settings transaction.
- [x] Invalid or missing profile values fall back to `left` / `quiet` / `muted` / `cover`.
- [x] Typecheck, lint, 228 Node tests, 2 component tests, and production build pass.
- [x] Electron isolated-profile cleanup waits for process exit and retries transient Windows file locks.
- [x] Full Electron E2E passes serially with 11/11 scenarios, including tray exit.
- [x] V5.1 visual matrix passes 9/9 captures, including emulated 125%, 150%, and 200% scale states.
- [ ] Physical renderer verification confirms visual profile restoration across real displays and DPI settings.
## Stage 68 - Scene Display Fit Restoration

- [x] Scene save snapshots the existing per-display `cover` / `contain` mapping.
- [x] Scene apply restores saved display fit modes through the database API.
- [x] Disconnected display mappings remain persisted for later reconnection.
- [x] Regression coverage passes for multiple display mappings.
- [x] Typecheck, main build, and 229 Node tests pass.
- [ ] Physical portrait, ultrawide, mixed-DPI, and hot-plug restoration evidence remains manual.
## Stage 69 - Live Photo Draft Lifecycle Cleanup

- [x] Temporary Live Photo preview drafts are cleared during guarded shutdown.
- [x] Preview cleanup does not modify confirmed wallpaper assets.
- [x] Lifecycle contract coverage passes with the current Node suite.
- [x] Latest full Electron E2E passes 11/11 and the V5.1 visual matrix passes 9/9.
- [ ] Real packaged Live Photo and physical display evidence remains manual.
## Stage 70 - Luna Action Manifest Repair

- [x] Luna Q manifest is valid JSON and matches the strict action-slot schema.
- [x] All five supplied characters expose `idle`, `walk`, `happy`, `thinking`, `sleep`, and `interaction`.
- [x] Every declared image is non-empty and matches its manifest dimensions.
- [x] `pnpm verify:pet-assets` passes.
- [x] Full regression passes: Node 229/229, component 2/2, Electron E2E 11/11, and visual matrix 9/9.
- [ ] Physical crop and visual quality evidence for each character remains manual.

## Stage 71 - Live Photo Import Path Closure

- [x] Removed the obsolete direct-copy Live Photo IPC channel and preload API.
- [x] Settings IPC and browser preview no longer expose a second Live Photo importer.
- [x] Wallpaper Studio remains the only active prepare / preview / confirm / cancel path.
- [x] Added regression coverage preventing the removed channel from returning.
- [x] Node 230/230, component 2/2, typecheck, lint, pet asset verification, production build, Electron E2E 11/11, and visual matrix 9/9 pass.
- [ ] Real paired Live Photo files and malformed media in packaged runtime remain manual evidence.

## Stage 72 - Scene Weather Profile Persistence

- [x] Scenes persist automatic/manual weather mode and manual weather type.
- [x] Existing particle intensity and border interaction state remain persisted.
- [x] Scene apply merges the expanded profile with legacy scene payloads safely.
- [x] Typecheck, main build, targeted scene tests 6/6, and Node tests 230/230 pass.
- [ ] Packaged visual confirmation for all weather types remains manual.

## Stage 73 - Scene Pet Anchor Persistence

- [x] Scenes persist the pet's virtual-desktop `positionX` / `positionY` anchor.
- [x] Scene apply restores the anchor with the existing pet settings.
- [x] Legacy scenes without an anchor remain compatible.
- [x] Typecheck, main build, and targeted scene tests 6/6 pass.
- [ ] Physical negative-origin, portrait-display, and hot-plug position evidence remains manual.

## Stage 74 - Scene Wallpaper Selection Persistence

- [x] Scenes persist the selected wallpaper asset ID, style, and rotation index.
- [x] Scene apply restores wallpaper selection without breaking disabled dynamic-wallpaper scenes.
- [x] Legacy scenes without style/index fields remain compatible.
- [x] Typecheck, main build, targeted scene tests 6/6, and Node tests 230/230 pass.
- [ ] Packaged renderer and physical multi-display visual confirmation remain manual.

## Stage 75 - Wallpaper Safe-Region Delivery

- [x] Bundled wallpaper safe regions are attached to main-process library results.
- [x] User image, generated PNG, and Live Photo assets receive a conservative default safe region.
- [x] Pet placement can consume the same safe-region contract for bundled and user assets.
- [x] Targeted tests 12/12 and Node tests 232/232 pass.
- [ ] Physical subject-avoidance and relocation evidence remains manual.

## Stage 76 - Clean Desktop E2E Lifecycle Stabilization

- [x] Clean-desktop E2E has a 180-second isolated QA auto-quit budget for slow Explorer operations.
- [x] Functional assertions still require active mode, hidden icons, hidden taskbar, power blocker, and complete restoration.
- [x] Targeted clean-desktop E2E passes 1/1.
- [x] Full Electron E2E passes 11/11.

## Stage 77 - Legacy User Wallpaper Safe-Region Recovery

- [x] Existing user wallpaper records without safe-region metadata receive a conservative in-memory fallback during library listing.

## Stage 78 - Style-Only Wallpaper Runtime Resolution

- [x] Wallpaper stage resolves a real bundled asset when style/index are saved without a `dynamicId`.
- [x] Per-display assignment and explicit selected asset take precedence over style fallback.
- [x] User-library mode without an asset remains a safe empty state rather than selecting an unrelated wallpaper.
- [x] Resolver regression coverage passes with the full Node suite at 233/233.

## Stage 79 - Taskbar Restore Race Recovery

- [x] Taskbar visibility synchronization retries slow Explorer/Shell transitions within a bounded budget.
- [x] The retry path does not restart or terminate Explorer.
- [x] Clean-desktop E2E passes 1/1 after reproducing and fixing the restore race.
- [x] Full Electron E2E passes 11/11 and V5.1 visual matrix passes 9/9.
- [ ] Physical Explorer, sleep/wake, and multi-display evidence remains manual.

## Stage 80 - Real Live Photo QA Fixture

- [x] Wallpaper-library QA imports a real repository H.264 video instead of a header-only placeholder.
- [x] Real-media import writes and verifies the original, cover, thumbnail, and metadata paths.
- [x] Invalid video containers are rejected without a successful import.
- [ ] Packaged Chromium decode evidence with real MP4, MOV, and WebM user pairs remains manual/runtime-specific.

## Stage 81 - Packaged Chromium Live Photo Decode Probe

- [x] Hidden Electron probe loads the real MP4 fixture through Chromium.
- [x] Probe requires `loadeddata`, non-zero video dimensions, and a playable ready state.
- [ ] MOV/WebM and user-provided paired Live Photo decode evidence remains manual.

## Stage 82 - Packaged Runtime Smoke

- [x] Existing unpacked release runtime loads 38 diagnostic modules without missing dependencies.
- [x] Packaged executable starts with isolated user data and reports core readiness.
- [x] Packaged executable exits cleanly, completes shutdown, and leaves no error-log entries.
- [ ] Fresh installer, upgrade, uninstall, offline, and hardware evidence remains separate.

- [x] Older user wallpaper records receive a conservative safe-region fallback during listing.
- [x] No schema migration or destructive asset rewrite is required.
- [x] Targeted tests 12/12 and Node tests 232/232 pass.
- [ ] Upgrade-profile visual evidence remains manual.

## Stage 83 - Packaged FPS IPC Route Repair

- [x] Main-window FPS reporting is accepted by the trusted IPC route.
- [x] Dedicated wallpaper-window FPS reporting remains accepted.
- [x] Other renderer routes are not added to the allowlist.
- [x] Source-contract test protects the route boundary.
- [x] Fresh packaged smoke reports no error-log entries.
- [ ] Installer, physical hardware, and long-duration soak evidence remains manual.

## Stage 84 - V6 Native / Immersive Experience Shell

- [x] Native is the default experience mode.
- [x] Immersive, Task, Clean, and Safe are explicit state values.
- [x] The immersive edge rail exposes Search, Organize, Scene, and Assistant.
- [x] Ambient status capsule exposes wake, task return, and native return actions.
- [x] Existing wallpaper, weather, pet, AI, organizer, settings, tray, and recovery modules remain available.
- [x] Typecheck, lint, component tests 2/2, and source Node tests 235/235 pass.

## Stage 85 - V6 Scene Surface and Visual QA

- [x] Scene task surface loads saved scenes and supports apply.
- [x] Scene task surface supports save-current-scene, wallpaper-library, and next-wallpaper actions.
- [x] Scene E2E passes 1/1 after fixing the refresh race.
- [x] Isolated V6 visual matrix passes 9/9 captures, including 125%/150%/200% scale evidence.
- [x] User-reported UI regression passes in isolated browser preview.
- [x] Isolated renderer/main/preload build passes without using locked `dist`.
- [ ] Full Electron clean/restore/config/force-kill/organizer rerun from the normal writable packaged path.
- [ ] Physical multi-display/DPI, sleep/wake, lock/unlock, fullscreen, battery, installer, and 4/24-hour soak evidence.

## Stage 86 - V6 Search Actions and Organizer Focus

- [x] Search exposes open, locate, copy path, read-only portal authorization, and pin-to-scene actions.
- [x] Scene picker reports empty-scene and stale-result states.
- [x] Organizer task surface keeps reversible inbox actions visible while reducing unrelated panel noise.
- [x] V6 state tests 11/11 and full Node tests 237/237 pass.

## Stage 87 - V6 Scene Profile Preview and Suggestion Routing

- [x] Scene preview shows weather, display, host, fit, safe-region, and pet-anchor information.
- [x] Scene preview is non-mutating until the explicit Apply action.
- [x] Immersive suggestion capsule routes to the single Organizer task surface.
- [x] Formal build passes, scene Electron E2E passes 1/1, and V6 visual matrix passes 9/9.
- [ ] Full Electron recovery matrix and physical/manual gates remain open.

## Stage 88 - V6 Explicit Task Surface Boundaries

- [x] Search task is implemented as `SearchSurface.vue` with existing safe IPC actions.
- [x] Organizer task is implemented as `OrganizerSurface.vue` with preview-first and reversible actions.
- [x] Assistant task is implemented as `AssistantSurface.vue` around the existing ChatPanel.
- [x] Organizer E2E 1/1 and Scene E2E 1/1 pass.
- [x] Final V6 visual matrix passes 9/9 with wallpaper visible and DPI captures at 125%/150%/200%.
- [x] Full Electron recovery matrix passes 13/13, including tray exit and renderer recovery.
- [ ] Physical/manual gates remain open.

## Stage 89 - V6 Electron Lifecycle Matrix Closure

- [x] Tray E2E shim resolves the project root after Electron command-line switches.
- [x] Tray quit guarantees `app.quit()` even when renderer notification fails.
- [x] First launch, duplicate launch, settings restart, tray exit, white-screen recovery, force-kill recovery, AI no-Key fallback, corrupted config recovery, clean desktop, organizer restore, organizer surface, scene surface, and AI settings E2E: 13/13 passed.
- [x] No Electron process remained after the full isolated run.
- [ ] Multi-display/DPI, sleep/wake, lock/unlock, fullscreen/battery, installer/upgrade/uninstall, Live Photo formats, and 4/24-hour soak still require physical/manual evidence.

## Stage 90 - V6 Search Task Surface and Visual Closure

- [x] Search task has explicit scope, clear, empty-result, status, keyboard, and accessible action states.
- [x] Normal Search mode renders outside the legacy command panel; Safe compatibility retains the fallback path.
- [x] Clear-search resets query and result state together.
- [x] Task mode has one primary return/status layer; legacy topbar and pull cord are hidden only in Task mode.
- [x] Component tests 4/4, Node tests 237/237, task-surface E2E 4/4, full Electron E2E 15/15, and visual matrix 10/10 pass.
- [ ] Physical multi-display/DPI, sleep/wake, lock/unlock, fullscreen/battery, installer/upgrade/uninstall, Live Photo formats, and 4/24-hour soak remain open.

## Stage 91 - V6 Safe Compatibility Boundary

- [x] Legacy control console is extracted into `CompatibilitySurface.vue`.
- [x] Compatibility surface is rendered only in explicit Safe mode.
- [x] Safe actions remain available: native file/folder interactions, search, portal, suggestions, preview-first inbox, undo, chat, settings, restore, refresh, and clean desktop.
- [x] Source contract, typecheck, lint, component 4/4, Node 237/237, targeted E2E 6/6, visual 10/10, and full Electron rerun 15/15 pass.
- [ ] One first full-run worker exit code `3221226505` remains an observed machine-level flake to monitor.
- [ ] Physical multi-display/DPI, sleep/wake, lock/unlock, fullscreen/battery, installer/upgrade/uninstall, Live Photo formats, and 4/24-hour soak remain open.

## Stage 92 - Tray Launch Argument Regression Fix

- [x] Tray test shim rejects command-line switches and unrelated paths as project roots.
- [x] `process.chdir()` is now reached only after verifying the Project D package and built main bootstrap exist.
- [x] Typecheck, lint, tray E2E `1/1`, and diff whitespace validation pass.
- [x] Fresh build plus full Electron E2E `15/15` pass; standalone tray rerun leaves no Electron process.
- [ ] Full lifecycle rerun from a fresh build and physical/manual gates remain open.

## Stage 93 - V6 Search Result Action Closure

- [x] QA-only disposable search fixture is isolated from the real desktop and production providers.
- [x] Search result path copy, scene pinning, and read-only portal authorization pass through the real task UI and IPC.
- [x] Main-window task route is accepted by Scene and Portal IPC without weakening trusted renderer validation.
- [x] Typecheck, lint, build, component 4/4, focused Electron E2E 5/5, diff check, and process cleanup pass.
- [ ] Organizer fixture execute/undo, full lifecycle rerun after this change, and physical/manual gates remain open.

## Stage 94 - V6 Reversible Organizer Fixture

- [x] QA desktop fixture is disposable and injected before FileScanner/ActionEngine initialization.
- [x] Preview lists movable and conflicting items without changing files.
- [x] Cancel leaves the fixture unchanged.
- [x] Execute moves only the non-conflicting item after confirmation.
- [x] Undo restores the moved item; conflict source and target remain unchanged.
- [x] Organizer state strip communicates unchanged, review-pending, and undoable states.
- [x] Build, component 4/4, focused Electron E2E 6/6, diff check, and process cleanup pass.
- [ ] Full lifecycle rerun after these changes and physical/manual gates remain open.

## Stage 95 - V6 Full Lifecycle Regression

- [x] Organizer returns to the unchanged state after undo and removes the undo action.
- [x] Rebuilt `dist` and full Electron lifecycle matrix passes 17/17.
- [x] Startup, duplicate launch, settings restart, tray exit, white-screen recovery, force-kill recovery, AI fallback, corrupted config, clean desktop, safety restore, Organizer, Search, Scene, and Assistant paths are covered.
- [x] No Electron process remains after the suite.
- [ ] Physical multi-display/DPI, sleep/wake, lock/unlock, fullscreen/battery, installer/upgrade/uninstall, Live Photo formats, and 4/24-hour soak remain open.

## Stage 96 - V6 Scene Pinned Resource Summary

- [x] Scene cards display pinned resource labels and origins instead of only a count.
- [x] Search-to-scene-to-search navigation preserves the pinned resource and portal action.
- [x] Typecheck, lint, build, Scene E2E 1/1, Search action E2E 1/1, diff check, and process cleanup pass.
- [ ] Empty/one/overflow visual captures, full lifecycle rerun after the next main-process change, and physical/manual gates remain open.

## Stage 97 - V6 Scene Pinned Resource Visual Matrix

- [x] Empty, one-resource, and overflow-resource scene states have isolated screenshots.
- [x] Overflow state shows three resource chips plus a remaining-count indicator.
- [x] Scene chips remain within the card and the page has no horizontal overflow at the tested viewport.
- [x] Visual E2E 1/1 and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 98 - V6 Electron Launch Argument Regression Guard

- [x] Electron switches before the project root cannot be selected as the tray shim working directory.
- [x] Missing or invalid project roots fail with a controlled diagnostic instead of calling `chdir` on an arbitrary argument.
- [x] Root-resolution unit tests pass 2/2.
- [x] Rebuilt project and tray Electron E2E pass 1/1.
- [x] No Electron process remains after verification.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 99 - V6 Organizer Safety State Visual Closure

- [x] Unchanged, review-pending, undoable, and restored Organizer states have distinct readable visual treatment.
- [x] Review state shows movable and conflict-skipped counts without executing a plan.
- [x] Undoable state shows recorded items and preserved original-location status.
- [x] Four-state visual screenshots captured under `artifacts-e2e-v6/organizer-state-visual/`.
- [x] Typecheck, lint, build, component 4/4, Organizer E2E 3/3, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 100 - V6 Scene Action Feedback Semantics

- [x] Scene save/apply/read failures are visually distinguishable from successful completion.
- [x] In-progress Scene actions use neutral feedback and do not claim success early.
- [x] Scene Apply success is verified through the real isolated IPC/Electron path.
- [x] Typecheck, build, Scene E2E 1/1, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 101 - V6 Search Result-Level Action Feedback

- [x] Search feedback is attached to the matching result card by opaque result id.
- [x] Copy, pin-to-scene, and portal authorization success states are verified in Electron E2E.
- [x] Component coverage verifies the result-level feedback rendering and tone.
- [x] Three Search feedback screenshots captured and visually inspected.
- [x] Typecheck, build, component 5/5, Search E2E 2/2, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 102 - V6 Assistant and Wallpaper Action Feedback Closure

- [x] Assistant send feedback distinguishes processing, success, local fallback, and failure.
- [x] Wallpaper Studio action feedback distinguishes processing, success, cancellation, and failure.
- [x] Main-window `#/wallpaper` route can read and apply the wallpaper library through the trusted IPC boundary.
- [x] Wallpaper Studio toast remains fixed and readable over the wallpaper-first layout.
- [x] Typecheck, full lint, build, Node 239/239, component 5/5, split Electron E2E 20/20, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 103 - V6 Assistant Provider Failure Recovery

- [x] Configured-provider timeout and provider-error states are represented by privacy-safe enums.
- [x] Provider failure keeps the local reply available without claiming that the cloud provider succeeded.
- [x] No-Key and privacy-paused local fallback behavior remains available.
- [x] QA-only local timeout fixture passes and captures the red recovery state.
- [x] Typecheck, full lint, build, Node 239/239, component 5/5, AI E2E 3/3, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 104 - V6 Provider Error and Pet Personality Motion Closure

- [x] A local HTTP 503 provider fixture produces an explicit service-error recovery state distinct from timeout and no-Key fallback.
- [x] The local Assistant reply remains available, input clears, and no provider response details are exposed to the renderer.
- [x] Pet interaction cues preserve the selected personality motion instead of forcing every click into the generic cheerful action.
- [x] Cold personality E2E verifies a cold voice and idle motion in the real pet window; visual evidence is captured under `artifacts-e2e-v6/pet-feedback-visual/`.
- [x] Typecheck, full lint, build, Node 240/240, component 5/5, targeted E2E 3/3, and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 105 - V6 Pet Asset Visual Matrix

- [x] All five bundled character ids are switched through the real settings/IPC path.
- [x] Every character renders a verified non-empty action asset with positive natural dimensions and a visible on-screen bounding box.
- [x] Five screenshots are captured under `artifacts-e2e-v6/pet-visual-matrix/` and visually inspected.
- [x] `verify:pet-assets` passes six action slots for each character.
- [x] Pet visual E2E 1/1 and process cleanup pass.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 106 - V6 Wallpaper Studio User Asset Loop

- [x] Disposable local image can be imported through the real Wallpaper Studio UI.
- [x] Imported asset renders in the main preview with positive natural dimensions.
- [x] Original user asset can be exported to a disposable local path and verified non-empty.
- [x] User asset can be deleted and the selected built-in wallpaper/library state is restored.
- [x] CSP explicitly allows the app-owned `projectd-media:` protocol for image, media, and protocol connections.
- [x] Media protocol supports MIME detection, `HEAD`, byte ranges, bounded streaming, and handle cleanup.
- [x] Visual evidence captured under `artifacts-e2e-v6/wallpaper-library-visual/`.
- [x] Typecheck, targeted ESLint, build, disposable Electron E2E 1/1, and process cleanup pass.
- [ ] Failed-import recovery and Live Photo playback evidence remain open.
- [ ] Physical multi-display/DPI, sleep/wake, installer, and 4/24-hour soak evidence remain open.

## Stage 107 - V6 Live Photo Pairing and Recovery Evidence

- [x] Valid cover/video pair reaches a real decoded preview before confirmation is enabled.
- [x] Preview displays both cover and video media without a blank/black replacement.
- [x] Local media protocol returns correct byte-range `206` responses for the video path.
- [x] Confirmed import persists a dynamic personal asset marked `Live Photo`.
- [x] Missing cover input shows an error state and preserves a usable Wallpaper Studio.
- [x] Visual evidence captured under `artifacts-e2e-v6/wallpaper-live-photo-visual/`.
- [x] Typecheck, full lint, Node 240/240, component 5/5, build, Wallpaper Studio E2E 3/3, and process cleanup pass.
- [ ] WebM/MOV fixture coverage, physical Live Photo formats, multi-display/DPI, sleep/wake, installer, and 4/24-hour soak remain open.

## Stage 108 - V6 Weather State and Performance Evidence

- [x] Manual weather selection takes precedence over stale automatic weather data.
- [x] Clear and light are distinct visual states.
- [x] Rain, snow, fog, leaves, and light layers expose non-zero visual output at normal intensity.
- [x] Rain uses the real texture layer plus 96 depth-varied streak nodes.
- [x] Zero particle intensity produces zero visible weather opacity and zero Pixi particle budget.
- [x] Six weather screenshots captured under `artifacts-e2e-v6/weather-quality-matrix/`.
- [x] Renderer FPS sample set is produced by the real Electron runtime metrics path.
- [x] Build and weather E2E 2/2 pass; no Electron process residue remains.
- [ ] CPU/working-set evidence by performance profile and physical GPU/battery/4K/multi-display/DPI/soak evidence remain open.

## Stage 109 - V6 Performance Profile Evidence

- [x] Recovery Center can refresh local performance metrics on demand.
- [x] Quality, balanced, and battery-saver modes propagate through persisted settings to the runtime arbiter and weather renderer.
- [x] GPU-enabled Electron run records profile-filtered CPU, working-set, and FPS evidence.
- [x] Final report saved at `artifacts-e2e-v6/performance-profile-matrix.json`.
- [x] Performance E2E 1/1, typecheck, targeted lint, build, and process cleanup pass.
- [ ] Physical hardware matrix, battery, 4K, multi-display/DPI, and long-soak evidence remain open.

## Stage 110 - Desktop Icon and Taskbar Recovery Hotfix

- [x] Real Windows desktop recovered after the reported missing-icon incident without moving or deleting desktop files.
- [x] Explorer icon recovery watchdog uses an independent WMI/CIM-created process before falling back to detached PowerShell.
- [x] Watchdog waits for parent termination using explicit polling and restores both native desktop icons and the taskbar with bounded retries.
- [x] Taskbar drift guard is scoped to Project D-owned hidden state and does not alter normal Windows auto-hide behavior.
- [x] Clean desktop fails closed when its configured exit shortcut cannot be registered.
- [x] Recovery regression tests 12/12, build, type checks, targeted lint, real watchdog launch/exit, final icon/taskbar probes, and zero Project D residual process pass.
- [x] Rebuilt packaged shortcut target and installer; isolated packaged startup/exit passes with zero packaged process residue.
- [ ] Packaged shortcut forced-kill evidence, sleep/wake, multi-display/DPI, installer, and long-soak evidence remain open.

## Stage 111 - V6 Ambient File Space and Task Readability

- [x] Immersive mode displays a bounded native-like file space without introducing a second organizer or moving real files.
- [x] Real folder art and native icon data are preserved in the immersive file surface.
- [x] Ambient file selection, double-click open, right-click menu, overflow, and Organizer handoff are wired to existing safe actions.
- [x] Task and Safe states improve foreground contrast while leaving the wallpaper layer visible and the veil pointer-transparent.
- [x] Component tests 7/7, Node tests 242/242, build, full lint, ambient E2E 1/1, organizer visual E2E 1/1, and weather matrix 2/2 pass.
- [x] Visual evidence saved under `artifacts-e2e-v6/ambient-file-space-visual/`.
- [x] Rebuilt packaged shortcut and installer after the Stage 111 UI changes; isolated packaged startup/exit leaves zero packaged processes.
- [ ] Packaged forced-kill recovery, multi-display/DPI, sleep/wake, installer lifecycle, and long-soak evidence remain open.

## Stage 112 - V6 Scene Wallpaper Surface

- [x] Current wallpaper, scene cards, and focused scene preview use real library thumbnails/posters.
- [x] Scene selection follows the active wallpaper id and does not silently fall back to the first scene.
- [x] User media remains behind `projectd-media:`; bundled media remains local; no schema change was introduced.
- [x] Component 7/7, scene visual E2E 1/1, and production build pass.
- [ ] Packaged force-kill, physical multi-display/DPI, sleep/wake, installer lifecycle, and long-soak remain open.

## Stage 113 - Desktop Icon Force-Kill Recovery Closure

- [x] Real Windows reproduction captured the previous watchdog failure after parent force-kill.
- [x] Native icon writes retry Explorer transitions 12 times; probes retry 3 times; boot recovery verifies visible state instead of trusting one probe.
- [x] Interactive file-based watchdog uses `cmd.exe /c start /b` and restores icons plus taskbar after parent termination; WMI/direct PowerShell are fallbacks.
- [x] Force-kill E2E verifies hide -> kill -> restore -> restart and passes 1/1.
- [x] Clean/safe E2E 2/2, Node 243/243, component 7/7, lint, build, scene E2E 1/1, packaged smoke 1/1, and final Windows icon/taskbar/process probe pass.
- [x] Packaged executable and installer rebuilt after the fix.
- [ ] Packaged executable force-kill, physical multi-display/DPI, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 114 - Early Boot Desktop Icon Recovery and Packaged Exit QA

- [x] Early desktop recovery watchdog starts before core service initialization.
- [x] Early boot probes and restores native desktop icons if Windows still reports hidden state.
- [x] Desktop controller reuses the early watchdog and does not create duplicate supervisors.
- [x] Force-kill recovery E2E passes 1/1.
- [x] Clean desktop and organizer safe-restore E2E pass serially, 2/2.
- [x] Packaged smoke verifies core readiness, shutdown completion, no error log entries, and zero QA-token processes.
- [x] Final Windows probe confirms desktop icons and taskbar visible, Explorer healthy, and Project D absent.
- [ ] Packaged executable force-kill evidence, physical multi-display/DPI, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 115 - Packaged Process Exit Residual Closure

- [x] Packaged smoke caught and documented a real Project D process remaining after shutdown completion.
- [x] Shutdown has a bounded, referenced post-cleanup termination fallback; the fallback runs only after native desktop and application resources are restored.
- [x] Packaged smoke passes with core readiness, shutdown completion, no error log entries, and an empty QA-token process tree.
- [x] Final Windows state has visible desktop icons, visible taskbar, healthy Explorer, and zero Project D processes.
- [ ] Packaged executable force-kill, physical multi-display/DPI, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 116 - V6 Scene State Feedback and Desktop Icon Regression Verification

- [x] Scene data persists the selected pet character id and restores it through the existing workspace-scene apply path.
- [x] Scene Surface exposes current and saved performance profile, pet identity/personality, wallpaper mode, and weather context.
- [x] Scene apply refreshes display mapping and provides a success feedback state.
- [x] Scene restoration E2E 2/2 verifies real IPC state recovery; organizer E2E 1/1 and desktop icon/clean/force-kill E2E 3/3 pass serially.
- [x] Node 246/246, component 7/7, lint, production build, and live icon/taskbar probes pass.
- [x] Full serial Electron suite passes 32/32 in about 12.1 minutes with the expanded execution budget.
- [ ] Packaged executable force-kill, physical multi-display/DPI, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 117 - V6 Scene Display Map and Visual Evidence

- [x] Scene Surface displays one read-only card per connected display with primary status, resolution, scale factor, wallpaper mapping, and fit mode.
- [x] Display Map uses the existing wallpaper display IPC contract and does not create a second display model.
- [x] Scene apply feedback includes the restored scene, performance profile, and pet identity.
- [x] Visual evidence captured at `artifacts-e2e-v6/scene-display-map/01-scene-display-map.png`.
- [x] Build, Node 246/246, component 7/7, lint, scene E2E 2/2, dist, packaged smoke, diff check, and final icon/taskbar/process probe pass.
- [ ] Physical dual/triple display, mixed DPI, portrait, hot-plug, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 118 - Native Desktop Icon Recovery Guard and Assistant Readability

- [x] Idle Project D repairs an externally hidden native desktop icon list through a live Explorer probe.
- [x] Fatal process paths restore native desktop icons and taskbar before termination.
- [x] Idle icon guard E2E and force-kill recovery E2E pass against the real Windows shell.
- [x] Assistant Surface remains legible over bright wallpaper while preserving the wallpaper as the visual background.
- [x] Typecheck, build, targeted lint, icon/failsafe tests 14/14, idle icon guard E2E 1/1, force-kill E2E 1/1, and Assistant E2E 1/1 pass.
- [x] Clean-desktop state race fixed by using live controller/escape-guard state; weather matrix transition sampling fixed and repeated targeted weather verification passes 6/6.
- [x] Node 248/248, component 7/7, lint, typecheck, build, packaged smoke, and native Windows probe pass after the final patch.
- [x] Native probe confirms 70 icons visible, taskbar visible, Explorer healthy, and no Project D or QA-token process remains.
- [ ] Full Electron-suite final rerun produced no Playwright summary and was not counted as a pass; rerun with a bounded harness before declaring the full gate green.
- [ ] Packaged shortcut force-kill, physical dual/triple display and DPI, portrait/hot-plug, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.

## Stage 120 - Fail-Safe Boot Recovery and Native Desktop Visibility

- [x] Stale `active`/`is_active` desktop state is recovered to native visibility before startup auto-activation is considered.
- [x] Unexpected recovery suppresses automatic takeover and launch-at-login until explicit user re-enablement.
- [x] Current Windows probe: 70 desktop icons visible, taskbar visible, Explorer healthy, no Project D process.
- [x] Packaged shortcut force-kill report passes all 8 recovery, restart, cleanup, and Explorer checks.
- [x] Packaged smoke passes readiness, shutdown, error-log, and process-cleanup checks.
- [x] Node 250/250, component 7/7, typecheck, lint, build, dist, desktop-icon E2E 1/1, and Assistant E2E 3/3 pass.
- [ ] Physical dual/triple display and DPI, portrait/hot-plug, sleep/wake, installer lifecycle, and 4/24-hour soak remain external evidence gates.

## Stage 119 - V6 Assistant Companion Context and Bounded Electron Gate

- [x] Bounded Electron runner records exit code, timeout, Playwright totals, logs, and QA-token process cleanup.
- [x] Result summarizer regression proves retries are not double-counted and distinguishes skipped and timed-out tests.
- [x] Assistant Surface renders the selected pet's real local idle portrait, with a neutral hidden state and no remote asset dependency.
- [x] Assistant targeted E2E passes 3/3 and captures `artifacts-e2e-v6/assistant-context/01-assistant-context.png`.
- [x] Complete serial Electron E2E passes 33/33; failed 0, skipped 0, timed out 0, and remaining QA processes 0.
- [x] Node 249/249, component 7/7, lint, typecheck, build, and diff check pass.
- [ ] Packaged shortcut force-kill, physical dual/triple display and DPI, portrait/hot-plug, sleep/wake, installer lifecycle, and 4/24-hour soak remain open.
