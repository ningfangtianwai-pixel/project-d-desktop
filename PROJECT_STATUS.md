# Project D Status

Current stage: Stage 33 - automatic-update client and staged channels, force-kill restart recovery, support documentation, accelerated soak tooling, and update-aware NSIS packaging are complete; hosted signed update replay and the real 24-hour soak remain.

## Stage 33 Update And Stability Preflight

- [x] Added `electron-updater` 6.8.9 with stable and beta channels, server-side `stagingPercentage` compatibility, manual download, and user-confirmed restart/install.
- [x] Update IPC is limited to the trusted Settings renderer. Invalid channels and non-HTTPS feeds fail closed.
- [x] Settings shows the current version, update channel, availability, download progress, and install action. Test builds with no production feed remain safely disabled.
- [x] `electron-builder` now creates `latest.yml`, an NSIS blockmap, and bundled update configuration. A real HTTPS endpoint can be supplied by the production build or a controlled override.
- [x] A real main-process force-kill and same-profile restart passed database integrity, desktop-state recovery, temporary-file cleanup, and graceful second shutdown.
- [x] Added repeatable accelerated-soak and force-kill/restart scripts plus user and release/stability documentation.
- [x] Fixed a stability defect discovered by the first soak: transient renderer probe timeouts and `capturePage` errors no longer count as confirmed white screens. Recovery now requires consecutive failures and resets its budget after a healthy probe.

## Stage 33 Verification

- `pnpm test`: passed, 108/108 tests.
- `pnpm typecheck` and `pnpm build`: passed through the final distribution build; 2,420 renderer modules transformed.
- Force-kill restart report: `artifacts/qa/crash-restart-2026-07-16T07-20-55-239Z/report.json`; all seven recovery checks passed and SQLite reported `ok`.
- First accelerated soak failed as intended and exposed the renderer-probe false positive. After the fix, the 120-second high-churn soak passed with no error-log entries, no safe-renderer relaunch, and a completed shutdown: `artifacts/qa/soak-2026-07-16T07-25-02-175Z/report.json`.
- The stress run peaked at about 907.8 MiB private memory. Its sampled CPU and short startup memory slope are not idle-performance evidence because the test intentionally reloads renderers every few seconds.
- Final `pnpm dist`: passed. Installer size is 222,424,376 bytes; SHA-256 `8A17CA7660F251F21EEDB7FFEF1CD44E8ED2284B39F142906B969B903E59805A`; `latest.yml` and blockmap exist.
- Remaining release blockers: installer is `NotSigned`; the update URL is intentionally `.invalid`; no hosted signed `N-1 -> N` update has been replayed; 24-hour stability is not claimed.

## Stage 32 Renderer Self-Healing And Bounded Shutdown

- [x] Confirmed the dependency, lockfile, and actual Electron executable are all `43.1.1`; the Electron 28 to 43 upgrade is complete.
- [x] Added one resilience supervisor for the main, settings, overlay, wallpaper, and pet renderers.
- [x] Renderer crash, main-frame load failure, preload failure, and sustained unresponsiveness now trigger logged, bounded recovery.
- [x] Resume, unlock, display hot-plug, and DPI changes probe each renderer's real root size so partial white screens can be detected even without a crash event.
- [x] Main and Settings health also sample the real rendered bitmap; a near-uniform white frame is unhealthy even when Chromium reports `did-finish-load` and a live renderer process.
- [x] Wallpaper recovery reattaches the native desktop host; pet recovery restores topmost, workspace, and mouse-pass-through state.
- [x] Three failures inside 60 seconds stop reload loops and relaunch once with hardware acceleration disabled; repeated failure in safe-renderer mode exits instead of trapping the desktop.
- [x] Shutdown cleanup now has an 8-second hard deadline and calls `app.exit` after successful cleanup or timeout.
- [x] Added `docs/ProjectD_V3.0_商业化落地与质量门禁计划.md`; its strict commercial score supersedes the older feature-only estimate.

## Stage 32 Verification

- `pnpm test`: passed, 102/102 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; 2,420 renderer modules transformed and main/preload builds completed.
- Real Electron 43 settings-renderer crash injection: `render-process-gone` (`crashed`, exit code 2) triggered recovery and returned to `did-finish-load` health in about 0.58 seconds; application later exited with code 0.
- Real Electron shutdown-hang injection: a permanently pending cleanup hit the 8,000 ms deadline and terminated with code 1; both bootstrap and error logs recorded the forced exit.
- Isolated evidence lives under `artifacts/qa-renderer-recovery-20260716-143724` and `artifacts/qa-shutdown-deadline-20260716-143806`.
- Final unpacked Electron capture proved a complete 1182 x 762 main renderer with onboarding, wallpaper, controls, and 54 desktop files at `artifacts/stage32-packaged-main-safe-renderer.png`. Computer Use's external window capture remained white even though Chromium and the application bitmap were healthy, so it is recorded as a capture-tool limitation rather than product evidence.
- `pnpm dist`: passed. Final NSIS installer is 222,418,394 bytes, SHA-256 `03AF445981638F51FC984692620FAA6FADD1CB7C92C38BAD1BF603BA58F8D460`; Authenticode remains `NotSigned`.
- Final cleanup found zero Project D processes; `git diff --check` passed with line-ending warnings only.
- Remaining Gate 0 evidence: installed-package tray-exit replay plus physical sleep/wake and lock/unlock loops.

## Stage 31 Settings And Desktop Safety Closure

- [x] Fixed the Settings startup white screen by allowing the persisted `cover_all_displays` state used by the page and by making optional diagnostics fail independently instead of rejecting the complete startup load.
- [x] Settings now reports a visible load failure instead of remaining indefinitely in the loading state, while successful live Electron verification reaches `设置已载入` and renders the Recovery Center system status.
- [x] Replaced registry-only desktop icon restoration with synchronization against Explorer's real `SHELLDLL_DefView`/`SysListView32` visibility state. Every hide/show operation verifies the resulting list-view visibility and icon count.
- [x] Added an out-of-process Windows recovery watchdog before desktop takeover. It is created through WMI so Electron's Windows job object cannot terminate it together with a force-killed main process.
- [x] Rebuilt the manual desktop recovery script around Explorer's own desktop-icon command. It no longer kills or restarts Explorer.
- [x] A genuine forced-main-process termination drill restored the hidden desktop automatically. The final read-only probe reported `visible=true`, `iconCount=65`, and `HideIcons=0`.

## Stage 31 Verification

- `pnpm test`: passed, 95/95 tests.
- `pnpm build`: passed; 2,420 renderer modules transformed and main/preload builds completed.
- `pnpm verify:db`: passed; 18 tables remain readable, AI/weather keys remain encrypted, and the wallpaper host remains `Progman`.
- `pnpm dist`: passed with Electron 43.1.1. The rebuilt installer is `release\ProjectD-0.1.0-Setup.exe`, 222,420,805 bytes, SHA-256 `FB1E69AC16B19F3FDF506ABF791D7580591C828696AB44E98D514843285B44E9`.
- Desktop evidence is stored at `artifacts\qa\desktop-icons-restored-20260716.png`. The final live probe still reports 65 visible Explorer desktop items and no Project D process remains.
- The installer remains `NotSigned`. A final installed-package force-kill replay, physical sleep/wake, multi-monitor/DPI matrix, clean-account verification, and long soak remain acceptance work.
- Current estimate: V2.1 code scope is about 91% complete; full commercial acceptance is about 83% complete after weighting the unsigned release pipeline and outstanding physical/long-duration evidence.

## Stage 30 Display, Recovery, And Installer Closure

- [x] Workspace Scenes now persist Electron DIP work-area snapshots, display IDs, scale factors, and container geometry. Restore scales proportionally, clamps to the work area, and falls back to the primary display when a saved display is absent.
- [x] Settings includes `覆盖全部显示器`. The primary display keeps desktop containers; each selected display receives its own wallpaper/weather stage and participates in display hot-plug reconciliation.
- [x] Search results can authorize their containing folder through a native directory picker. Main-process validation requires the chosen folder to contain the opaque search result before creating a read-only Portal.
- [x] Added serialized suspend/resume/unlock/display recovery, a lightweight Explorer PID monitor, startup/recovery wallpaper attachment serialization, and accurate failure reporting when all display stages are not attached.
- [x] NSIS install creates a recovery script; uninstall restores Explorer icon visibility and asks whether to retain settings/scenes/chat. Silent uninstall retains data unless the explicit delete-data parameter is used.
- [x] Isolated install, same-version replacement, launch, and uninstall passed with user database and the pre-existing recovery script unchanged.

## Stage 30 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 87/87 tests.
- `pnpm build`: passed; 2,419 renderer modules transformed.
- Final NSIS build: passed. `release\ProjectD-0.1.0-Setup.exe` is 196,542,050 bytes; SHA-256 `54B883AA7D6820FE073D585831A708FE980803BCB7F46195298C21D6CF514D4D`.
- Final isolated install/uninstall replay returned exit code 0, retained the existing database byte-for-byte, and removed the empty installation directory. The artifact remains `NotSigned`.
- 90-second isolated packaged smoke: responsive throughout, no error matches, and aggregate working set fell from about 1,014 MB to 865 MB rather than growing continuously.
- Real Explorer restart drill: Explorer PID changed, Project D detected it, entered `explorer-restarted` recovery, remained responsive, and a new wallpaper stage attached successfully to `Progman` without an error-log entry.
- Remaining release blockers are physical sleep/wake and multi-monitor/DPI matrix runs, four-hour/24-hour soak, clean Windows account verification, and code signing. The installer is currently `NotSigned`.
- Current estimate: V2.1 code scope is about 90% complete; full commercial acceptance is about 82% complete after weighting the unsigned release pipeline and outstanding physical/long-duration evidence.

## Stage 28 Product Readiness And Architecture

- [x] Added a five-step first-run onboarding flow covering the real desktop layer, preview-before-move safety, wallpaper/weather, Luna, and privacy. Progress, skip, completion, recovery, and replay use versioned renderer-local state.
- [x] Luna is temporarily hidden while onboarding is visible and restored according to the persisted pet setting when onboarding closes, preventing the always-on-top pet from covering first-run controls.
- [x] Added a Settings privacy center backed by existing trusted IPC: approved Folder Portals with one-click revocation, AI daily usage, weather location/provider source, diagnostics scope, suggestion delivery status, and a clear local-data boundary.
- [x] Main and Overlay file context menus now use Lucide command icons with stable alignment and disabled states.
- [x] Moved action, search, scene, and portal IPC registrations from `main.ts` into their owning modules. A boundary regression test prevents those handlers from drifting back into the application bootstrap.
- [x] Added typed Free/Pro entitlement scaffolding with an injectable future provider. The local default deliberately keeps every existing capability enabled; no current feature is gated or degraded.

## Stage 28 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 72/72 tests.
- `pnpm build`: passed; 2,419 renderer modules transformed and the sandbox preload remained self-contained.
- `pnpm verify:db`: passed; 18 tables, 51 desktop records, encrypted AI/weather credentials, and `Progman` host state remain intact.
- `pnpm dist`: passed. Final Stage 28 x64 NSIS installer is `release\\ProjectD-0.1.0-Setup.exe` (196,507,937 bytes, 2026-07-15 17:31).
- Live Electron visual pass: onboarding rendered at 1536x864 without Luna overlap, completion restored Luna and the main workspace, and the privacy center rendered without sidebar/content overflow.
- Desktop recovery remained intact after visual QA: `HideIcons=0` and only Project D development processes were stopped.

## Stage 27 Desktop Workflow Closure

- [x] The desktop Overlay can authorize a Folder Portal through Electron's native directory picker and renders approved resources as translucent desktop zones without copying them into desktop records.
- [x] The Overlay toolbar now lists, saves, and applies Workspace Scenes. Scenes restore container geometry/collapse state, enabled portal set, wallpaper, weather intensity/border interaction, pet state, performance mode, and suggestion delivery controls.
- [x] Desktop Inbox review now renders the complete ActionPlan, including every source/target, category, size, conflict, executable count, explicit confirmation, and latest eligible undo action.
- [x] Scoped workspace search is available directly on the desktop layer with keyboard navigation and opaque-ID open, Explorer reveal, and copy-path actions. Renderer IDs are random ten-minute handles; main-process path resolution revalidates the source, and Portal `realpath/lstat` checks reject child links plus authorized-root identity replacement.
- [x] Suggestion evaluation is serialized so file watcher and initial-scan triggers cannot race. New suggestions are broadcast to main, Overlay, and Luna; Luna announces the latest undismissed suggestion and opens the review path on interaction.
- [x] Fixed the sandbox preload runtime failure discovered during live Electron QA. The preload is now bundled by esbuild, remains sandboxed, and has a regression test proving it contains no local runtime `require`.
- [x] Portal watchers release failed handles and reconnect automatically after offline/permission failures.
- [x] Main-window Luna review now shows the complete ActionPlan instead of four rows plus a count.
- [x] Added focused scene, portal escape/root-replacement/reconnect, opaque search-handle, and preload-bundle tests; the complete suite now passes 67/67 tests.

## Stage 27 Verification

- `pnpm build`: passed; includes Vue/Node typecheck, Vite renderer build, main-process compilation, and the self-contained preload bundle.
- `pnpm test`: passed, 67/67 tests.
- `pnpm verify:db`: passed; 18 tables, 7 containers, 51 desktop records, 4 layouts, and encrypted weather/AI credentials remain intact.
- Live Electron smoke: passed for real preload IPC, 51-file desktop scan, full-screen transparent Overlay, seven translucent containers, full ActionPlan preview, and Luna announcement rendering.
- Final safe autorun on the reviewed code: passed. Wallpaper attached to Windows `Progman`, the app deactivated and quit cleanly, `HideIcons=0` was restored, and no Project D process remained.
- `pnpm dist`: passed. Final Stage 27 x64 NSIS installer is `release\\ProjectD-0.1.0-Setup.exe` (196,468,613 bytes, 2026-07-15 16:28).
- `git diff --check`: passed; only expected Windows CRLF conversion warnings were emitted.

## Current Stage 27 Caveats

- WallpaperHost attachment was previously affected by slow PowerShell `Add-Type` startup on this lightweight machine. The per-attempt timeout was raised from 8 to 20 seconds; the final autorun attached to `Progman`, deactivated, restored desktop icons, and exited cleanly. Explorer-restart/sleep-resume soak is still required before closing the release risk.
- Transparent multi-window automation could visually inspect the Overlay and ActionPlan, but could not reliably dispatch pointer clicks through the roaming always-on-top pet window. Portal-picker cancel, scene-list selection, search-result actions, and safe-return pointer behavior still need a short human mouse recording.
- Portal zones currently use deterministic Overlay placement. Persisted portal geometry and Portal Peek remain V2.1 follow-up work. Scenes still lack pinned search resources, to-do summaries, and multi-display mapping.

## Stage 26 V2.1 Commercial Hardening

- [x] Suggestion delivery now supports configurable cross-midnight quiet hours, a global daily budget, desktop-inbox per-kind daily budget/cooldown, two-hour snooze, permanent disable, and a visible delivery explanation.
- [x] Added a cached Windows foreground/fullscreen and battery probe. External fullscreen applications pause suggestions; battery power alone does not, while low battery and the explicit battery-saver profile do.
- [x] Added a consented, deterministic diagnostics export with schema versioning, an 8 KB ceiling, user-selected recent-error inclusion, path/secret redaction, visible preview, and native save dialog. It never exports chat, file names, raw paths, raw logs, or credentials.
- [x] IPC trust now binds route plus the actual BrowserWindow webContents identity. High-risk settings, preview, state, chat, logs, pet, layout, scene, wallpaper, weather, and desktop endpoints use narrow sender allowlists.
- [x] Renderer trust resolves the exact packaged `renderer/index.html`; file previews are extension-restricted and size-bounded; settings updates pass a main-process runtime schema before persistence.
- [x] Two visual passes were completed in live Electron: main/pet/general settings, then About/diagnostics preview and consent controls. No overlap or overflow was observed at 820x620 settings and 1180x760 main-window sizes.

## Stage 26 Verification

- `pnpm test`: passed, 57 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed; 18 tables and encrypted weather/AI credentials remain intact.
- Live Electron visual/runtime smoke: passed; main, pet, settings, suggestion policy controls, diagnostics preview, and Progman wallpaper host rendered correctly.
- `pnpm dist`: passed. Final Stage 26 x64 NSIS installer is `release\\ProjectD-0.1.0-Setup.exe` (196,432,111 bytes, 2026-07-13 21:21).

## Stage 25 V2.1 Search Focus And Delivery Controls

- [x] `Ctrl+Alt+Space`, the tray click, and the tray “Show Project D” action now restore only the main window and focus the existing scoped workspace search input. No auxiliary search window, overlay focus, or always-on-top state was introduced.
- [x] Added persistent suggestion delivery controls: two-hour snooze, timed mute support in the engine, permanent disable, and Settings re-enable.
- [x] Suggestion delivery control state lives in the existing main-process `app_state`; it continues to suppress only suggestions, never changes the file-action safety policy.
- [x] Added a pure diagnostics-summary service and tests. The report accepts caller-selected metadata only and redacts paths, bearer values, tokens, keys, passwords, and oversized error text. It is foundation work only and does not yet export raw logs or data from the renderer.
- [x] Added focused automated coverage for suggestion expiry/permanent mute, diagnostics redaction/health summaries, and the existing Stage 24/23 behavior remains green.

## Stage 25 Verification

- `pnpm test`: passed, 40 tests.
- `pnpm build`: passed.
- `PROJECTD_DEMO_AUTORUN=1; PROJECTD_DEMO_EXIT=1; pnpm dev`: passed. The live smoke run attached the wallpaper to `Progman`, created and cleanly destroyed the pet, restored the desktop state, and exited with code 0.
- `pnpm verify:db`: passed. The existing database remains healthy with 18 tables and encrypted weather/AI credentials intact.
- `pnpm dist`: passed. Rebuilt x64 NSIS installer: `release\\ProjectD-0.1.0-Setup.exe` (196,378,018 bytes, 2026-07-13 18:20).

## Stage 24 V2.1 Luna And Portal Reliability

- [x] Added a local parse-first Luna intent policy. It distinguishes normal chat, wallpaper intent, desktop-inbox preview, and unsupported requests without exposing an execution primitive to an AI provider.
- [x] Luna can now turn clear “organize desktop” requests into a visible “generate plan” control in the chat panel. The control reuses the existing L2 preview, conflict review, explicit confirmation, audit, and undo chain.
- [x] Luna rejects delete, clear, overwrite, arbitrary move, command, PowerShell, CMD, and script wording locally before any provider call or filesystem action.
- [x] Added a provider-system-instruction builder for a future JSON-only intent fallback; it does not grant provider tool execution.
- [x] Added non-recursive Folder Portal watching with per-portal debounce, batch cap, temporary-file filtering, offline/permission reporting, configuration synchronization, renderer refresh notification, and shutdown cleanup.
- [x] Extended sender/route validation to desktop mode controls, real file opening/location actions, trusted action plan/execute/undo endpoints, portal authorization/resource endpoints, and AI chat send.
- [x] Confirmed no Everything installation or project dependency exists on this machine. Project D keeps the privacy-preserving Desktop/approved-Portal search provider as the default; Everything and Windows Search remain explicit opt-in adapters rather than a new full-disk index.

## Stage 24 Verification

- `pnpm test`: passed, 33 tests.
- `pnpm build`: passed.
- `pnpm dev`: passed with a live activate/restore smoke run. The wallpaper attached to Progman, the pet started, Explorer icons were restored, and the process exited cleanly.
- `pnpm verify:db`: passed. Existing encrypted weather and AI credentials remain intact.
- `pnpm dist`: passed. Updated NSIS installer is available under `release\\ProjectD-0.1.0-Setup.exe`.

## Stage 23 V2.1 Search, Suggestions, And Recovery Inspection

- [x] Added a provider-injected local search service. It searches only persisted desktop records and explicitly approved, read-only Folder Portal resources; it does not index the full disk.
- [x] Added keyword, `ext:.pdf`/`.pdf`, `in:desktop`, and `in:portal` search filters with bounded results and deterministic ranking.
- [x] Added a visible main-window search surface with result origin labels and a main-process-only open action. Raw paths are not returned by the new search API.
- [x] Added an event-driven desktop-inbox suggestion engine. It only proposes a preview-first L2 plan after three eligible desktop-root files, never moves files automatically, has a six-hour cooldown, and persists stable-batch suppression.
- [x] Added quiet-hours and battery-saver suppression inputs, plus visible “查看方案” and “暂不” controls.
- [x] Added an interrupted-action path inspector with completed/resumable/conflicted/missing states. It performs no filesystem mutation and exposes a redacted, read-only report in Recovery Center.
- [x] Added route-scoped trusted-sender checks to every new Stage 23 IPC endpoint. Pet, wallpaper, and overlay routes cannot invoke interrupted-action recovery endpoints.
- [x] Added focused automated tests for search filtering/ranking, suggestion thresholds/cooldown/pause/idempotency, and all interruption inspection states.

## Stage 23 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 23 tests.
- `pnpm build`: passed.
- `pnpm verify:db`: passed. Existing encrypted weather and AI credentials remain intact.
- `pnpm dev`: passed after the development-session exit policy was corrected; Electron completed a real desktop activate/restore smoke run and returned Explorer icons safely.
- `pnpm dist`: passed. Updated NSIS installer is available under `release\\ProjectD-0.1.0-Setup.exe`.

## Stage 22 V2.1 Trusted Workspace Foundation

- [x] Added V2 domain contracts for `ActionPlan`, `ActionExecution`, `WorkspaceScene`, portal configuration, portal resources, and action risk levels.
- [x] Added persisted action-plan/execution journal, workspace-scene, portal-config, consent-scope, and schema-migration tables without replacing the existing `sql.js` database.
- [x] Added an upgrade backup marker before schema v2 migration; existing user settings and encrypted AI/weather credentials remain intact.
- [x] Implemented a constrained L2 desktop inbox action engine.
  - It only considers regular, non-shortcut files directly under the Windows desktop root.
  - It only moves files to `Desktop\\Project D 收纳\\<category>` after an in-app preview and explicit confirmation.
  - It never deletes, overwrites, recursively moves folders, or accepts arbitrary source/target paths.
  - Each execution has item-level results and an audited, one-click undo route.
- [x] Added a visible desktop-inbox preview/confirm/undo surface and a settings recovery center.
- [x] Added workspace-scene save/restore for container geometry, wallpaper selection, performance policy, pet visibility, and current layout reference.
- [x] Added user-approved, read-only Folder Portals using a native directory picker, 60-second approval token, portal-bound path resolution, symlink exclusion, offline/permission/large-directory states, and no mutation actions.
- [x] Added a portal and scene management surface in Settings.
- [x] Enabled Electron renderer sandbox for every Project D window and added navigation/window-open restrictions to trusted renderer URLs or safe external protocols.
- [x] Added `Ctrl+Alt+Space` workspace shortcut registration with conflict status persisted in app state.
- [x] Added automated temporary-directory coverage for real move/conflict/undo and portal path-escape safety.

## Stage 22 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 14 tests.
- `pnpm build`: passed, renderer and Electron main process built successfully.
- `pnpm verify:db`: passed. Existing database is healthy with 18 tables, 7 containers, 4 layouts, encrypted weather/AI credentials, and the existing Progman wallpaper host state.
- `pnpm dev`: passed with the sandboxed Electron runtime. Logs confirm database init, desktop watcher, pet window, wallpaper desktop host attachment, and successful `Ctrl+Alt+Space` registration; no new error-log entry was created.
- `pnpm dist`: passed. The V2 increment is packaged in `release\\ProjectD-0.1.0-Setup.exe`.

## Stage 22 Boundaries

- Folder portals are intentionally read-only and top-level only in this increment. They do not yet have background watch/refresh, Peek overlay integration, or portal search ranking.
- Workspace scenes currently restore the V2-safe local state listed above. Multi-display mapping and DPI-aware scene restoration remain later Gate 2 work.
- The V2 search provider chain, Luna structured tool calling, event-driven suggestion budget, signing/updating, licensing, and Electron major upgrade are not represented as complete.
- Action-engine fault injection currently covers temporary filesystem behavior. An interrupted live-desktop transaction recovery test still needs a controlled manual QA run.

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

## Stage 11 Container Layout Interaction

- [x] Extend `containers:update-position` IPC to persist container position, size, and collapsed state.
- [x] Add main-process validation for container id, x/y, width, height, and collapsed state.
- [x] Persist container `is_collapsed` into SQLite.
- [x] Add overlay titlebar drag behavior with viewport clamping.
- [x] Add overlay height resize handle with min/max bounds.
- [x] Add overlay collapse/expand button.
- [x] Keep the overlay container layout in Electron DIP/CSS-pixel coordinates.
- [x] Restore overlay containers as absolute desktop-coordinate regions rather than document-flow grid cards.
- [x] Add `docs/SPEC_REVIEW_NOTES.md` for v1.1 wording/asset dependency notes.

## Stage 11 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- Browser visual verification passed: overlay containers are absolute-positioned, titlebars show grab cursor, collapse buttons exist, and resize handles exist.
- Browser click/drag automation was attempted but the browser automation layer timed out; real mouse interaction still needs desktop-window/manual verification.
- `pnpm verify:db`: passed.
- `pnpm dist`: passed.
- Packaged smoke test passed: `release\win-unpacked\Project D.exe` stayed alive for 14 seconds, added `0` new error-log bytes, logged native watcher startup, and logged wallpaper host attach with `attached: true`.

## Stage 12 Luna Q Pet Sprite And Behavior

- [x] Import user-provided Q-version pet sheet into the project asset tree.
- [x] Generate clean transparent PNG sprites for idle, happy/waving, sitting/thinking, sleeping, pajamas, raincoat, winter, summer, and default states.
- [x] Add `public/pet/luna-q/manifest.json` as the lightweight sprite resource manifest.
- [x] Replace the circular placeholder portrait renderer with transparent sprite rendering.
- [x] Add anthropomorphic pet state mapping for idle, happy, cheerful, thinking, sitting, sleepy, sleeping, rain, winter, and summer.
- [x] Hook pet state selection into time-of-day and current weather when auto outfit is enabled.
- [x] Add click/double-click bubble reactions and lightweight emote effects.
- [x] Resize the Electron pet window default/min bounds so the sprite and bubble are not clipped.
- [x] Keep the implementation lightweight for the user's laptop hardware.
- [ ] Full Live2D/Spine or frame-sequenced animation remains pending until final layered assets are available.

## Stage 12 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed. Confirmed 12 tables, 7 containers, 50 desktop files, encrypted weather and AI keys, current weather mode `auto`, and active AI provider `deepseek`.
- `pnpm dev`: smoke test started Vite on `127.0.0.1:5173` and launched Electron. The first cleanup command interrupted its own shell while stopping processes, then residual Project D dev processes were verified and stopped manually; port `5173` was closed afterward.
- `pnpm dist`: passed. Generated updated NSIS installer and `win-unpacked` app with the Luna Q pet assets.
- Packaged smoke test: passed. `release\win-unpacked\Project D.exe` started, logged database init, desktop scan, wallpaper host attach, pet window creation/show, and added `0` new error-log bytes.
- Browser production preview passed for `http://127.0.0.1:4173/#/pet`.
- Pet visual verification confirmed the sprite is bounded inside the `146x164` stage and no longer stretches beyond the pet window.
- Pet interaction verification passed: clicking the pet changes action from `idle` to `happy`, shows the bubble, and switches to `/pet/luna-q/waving.png`.
- Final screenshot saved at `D:\桌面操作系统\recordings\projectd-pet-stage12-20260707.png`.

## Stage 13 Pet Transparency, Roaming, And Weather Visual Polish

- [x] Remove remaining dark root/background fill from the pet route by making `html`, `body`, `#app`, and `.pet-page` transparent in pet-window mode.
- [x] Add a pet-window root class during pet route mount and clean it up on unmount.
- [x] Add lightweight autonomous pet roaming that periodically moves the real Electron pet window through the existing safe IPC channel.
- [x] Prevent drag release from accidentally triggering a click bubble.
- [x] Enhance weather particle rendering with richer rain, snow, fog, leaves, and light modes.
- [x] Add a weather veil layer for rain/fog/light atmosphere.
- [x] Reduce heavy background ribbon width/opacity so weather particles feel less like thick placeholder stripes.
- [x] Keep PixiJS and Canvas fallback paths both functional for low-resource hardware.

## Stage 13 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed before and after packaged smoke.
- Browser pet transparency verification passed: `html`, `body`, and `.pet-page` all computed to `rgba(0, 0, 0, 0)` in `#/pet`.
- Browser pet roam timer verification passed: action changed from `idle` to `cheerful` after the first roam trigger; browser preview cannot move the actual OS window, but the Electron path uses `movePetWindow`.
- Browser wallpaper verification passed for `http://127.0.0.1:4173/#/wallpaper`; Canvas fallback produced a nonblank full-viewport canvas.
- Updated weather preview saved at `D:\桌面操作系统\recordings\projectd-weather-stage13-20260707.png`.
- `pnpm dist`: passed. Generated updated NSIS installer and `win-unpacked` app.
- Packaged smoke test passed. `release\win-unpacked\Project D.exe` started, logged pet/window/wallpaper creation, added `0` new error-log bytes, and `pnpm verify:db` confirmed pet bounds changed to `{"x":1048,"y":488,"width":300,"height":287}`, proving autonomous roaming moved the real desktop pet window.

## Stage 14 Realistic Desktop Weather Overlay

- [x] Replaced the abstract ribbon-led wallpaper effect direction with a transparent realistic weather overlay direction.
- [x] Added a dedicated DOM weather layer above wallpaper/canvas rendering.
- [x] Added continuous fog banks for a softer mist/air layer instead of oval particle blobs.
- [x] Added leaf-shaped falling leaves using CSS gradients, veins, rotation, drift, and opacity variation.
- [x] Added soft light beams and glowing dust motes for a gentler light-effect mode.
- [x] Kept PixiJS/Canvas as secondary low-level weather rendering and fallback, not the primary visual identity.
- [x] Added non-persistent URL preview overrides such as `?weather=fog#/wallpaper` for visual QA without changing stored weather settings.

## Stage 14 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed.
- Browser visual verification passed for the realistic fog overlay at `http://127.0.0.1:4173/?weather=fog#/wallpaper`.
- Browser visual verification passed for realistic falling leaves at `http://127.0.0.1:4173/?weather=leaves#/wallpaper`.
- Browser visual verification passed for soft light effects at `http://127.0.0.1:4173/?weather=light#/wallpaper`.
- Screenshots saved:
  - `D:\桌面操作系统\recordings\projectd-real-weather-fog-20260707.png`
  - `D:\桌面操作系统\recordings\projectd-real-weather-leaves-20260707.png`
  - `D:\桌面操作系统\recordings\projectd-real-weather-light-20260707.png`
- `pnpm dist`: passed.
- Packaged smoke test passed. `release\win-unpacked\Project D.exe` started, logged desktop scan, wallpaper host attach, pet window creation/show, and added `0` new error-log bytes.

## Stage 15 Desktop Wallpaper Library And AI Wallpaper Control

- [x] Added a shared wallpaper library manifest for local image/video wallpaper assets.
- [x] Exposed safe preload IPC for `getWallpaperLibrary` and `applyWallpaper`.
- [x] Added main-process wallpaper application so settings-page and AI-triggered wallpaper changes use the same desktop runtime path.
- [x] Broadcast settings updates to main, settings, overlay, pet, and wallpaper renderer windows.
- [x] Updated the wallpaper renderer to load packaged assets from `dist/renderer/wallpapers`.
- [x] Added settings-page UI for selecting a real wallpaper library asset and applying it to the desktop wallpaper layer.
- [x] Added AI local-tool handling for wallpaper commands such as switching to earth/calligraphy/evening-cloud or next wallpaper.
- [x] Kept normal AI chat provider fallback behavior for non-wallpaper conversations.
- [x] Fixed overlay pull-cord wallpaper switching so it no longer disables the real dynamic desktop wallpaper layer.

## Stage 15 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- Confirmed `dist\renderer\wallpapers` contains `calligraphy.png`, `earth.png`, and `evening-cloud.png`.
- `pnpm verify:db`: passed.
- `pnpm dist`: passed.
- Packaged smoke test passed. `release\win-unpacked\Project D.exe` started, added `0` new error-log bytes, logged pet window creation/show, and logged `wallpaper host attach result` plus `wallpaper window shown on desktop host` with `attached: true` and `parentKind: Progman`.

## Current Stage 15 Caveats

- The code path for AI wallpaper commands is implemented, but a screen-recorded manual/Electron chat test showing the live desktop wallpaper change is still pending.
- Current wallpaper library contains three placeholder local images. Final user-provided wallpaper assets still need to be integrated.

## Stage 16 Desktop-Native Visual Polish And Clean Desktop Mode

- [x] Reworked the settings page from a light theme into the same dark glass visual language as the main app.
- [x] Changed the overlay window to transparent mode in non-safe desktop mode.
- [x] Removed the overlay route's extra `WallpaperStage` layer so containers float over the real desktop/wallpaper host instead of a new page background.
- [x] Increased overlay container opacity and contrast while keeping a translucent wallpaper-revealing glass look.
- [x] Reduced desktop icon tile and icon-art sizes for denser multi-file layouts.
- [x] Improved extension/type labels with pill backgrounds and stronger contrast.
- [x] Moved and shortened the main pull-cord wallpaper button so it visually attaches to the desktop surface.
- [x] Increased AI chat history height for a usable conversation panel.
- [x] Polished right-click menu spacing, contrast, border, and glass styling.
- [x] Tightened overlay toolbar styling so it feels attached to the desktop layer.
- [x] Hardened preview text font fallback for mixed Chinese/code content.
- [x] Added one-click clean desktop mode from the main UI and tray menu.
- [x] Added clean desktop recovery through tray "恢复桌面" and existing safe restore path.

## Stage 16 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed. Database health remained intact; current desktop scan has 45 active records and 6 missing records.
- Browser visual metrics passed:
  - Main chat history height: `300px`.
  - Main icon border radius: `8px`.
  - Overlay page background: `rgba(0, 0, 0, 0)`.
  - Overlay route contains `0` internal wallpaper-stage nodes.
  - Overlay container background: `rgba(11, 13, 16, 0.68)`.
  - Settings shell uses dark background and light text.
- `pnpm dist`: passed.
- Packaged smoke test passed after clearing a stale Project D dev Electron instance. `release\win-unpacked\Project D.exe` started, added `1778` app-log bytes, added `0` error-log bytes, logged desktop watcher startup, pet window show, and wallpaper desktop-host attach with `attached: true`.

## Current Stage 16 Caveats

- Clean desktop mode hides Explorer desktop icons and Project D's overlay layer; it does not yet physically rearrange native Explorer icon coordinates.
- Directly arranging the native Windows desktop icon grid remains a separate high-risk integration item because it changes Explorer state and requires stronger recovery handling.

## Stage 17 Native Icon Rendering, Resize Completion, And Aesthetic Review Pass

- [x] Added optional native file icon data to desktop file records.
- [x] Added main-process Windows/Electron file icon extraction through `app.getFileIcon()`.
- [x] Added an in-memory icon cache so repeated desktop refreshes do not refetch every icon.
- [x] Render native file icons in main desktop tiles and overlay tiles, with category icon fallback.
- [x] Added overlay container bottom-right width/height resize handle.
- [x] Kept existing bottom height-only resize handle.
- [x] Persist both width and height through the existing container layout IPC.
- [x] Added wallpaper thumbnail selection cards to the settings page.
- [x] Reduced overlay desktop icon density again after visual review.
- [x] Completed at least two aesthetic review passes with browser visual metrics.

## Stage 17 Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm verify:db`: passed. Database remains healthy; current scan reported 41 active desktop records and 10 missing records from real desktop file changes.
- Aesthetic review pass 1:
  - Overlay background remained transparent.
  - Width/height resize handle existed with `nwse-resize`.
  - Wallpaper thumbnails were identified as the main missing visual refinement.
  - Overlay icon height was still too large at about `120px`.
- Aesthetic review pass 2:
  - Wallpaper thumbnail grid appeared with 3 thumbnails and 1 selected card.
  - Overlay icon art reduced to `42px`.
  - Overlay file tile height reduced to about `99px`.
  - Overlay background stayed transparent.
  - Width/height resize handle remained present.
- `pnpm dist`: passed.
- Packaged smoke test passed. `release\win-unpacked\Project D.exe` started, added `1779` app-log bytes, added `0` error-log bytes, logged desktop watcher startup, pet window show, and wallpaper desktop-host attach with `attached: true`.

## Current Stage 17 Caveats

- Native icon rendering is implemented in Electron runtime. Browser preview uses fallback/mock data, so native icons are best verified in the packaged/dev Electron app.
- Native Explorer desktop icon coordinate arrangement is still not implemented; Project D remains on the safer recoverable virtual overlay model.

## Stage 18 Product Hardening, Desktop Workflow, And Visual System

- [x] Re-read the v1.0 product specification and v1.1 engineering/acceptance constraints against the current implementation.
- [x] Ran the existing packaged app before editing and captured real Electron shortcomings: default menu chrome, page-like main layout, pet overlap, and packaged pet asset failure.
- [x] Replaced the main control console with a compact desktop-space command center that keeps real files visible without document-level scrolling.
- [x] Removed placeholder feature strips and browser-like activity chrome.
- [x] Added visible Progman/WorkerW/fallback host status and weather location-source status.
- [x] Rebuilt settings as a native-feeling fixed-sidebar workspace with seven functional pages.
- [x] Added working 2/4/6/8 layout presets and work-area-aware container repositioning.
- [x] Added virtual file drag-to-container, complete file context actions, and container snap behavior.
- [x] Fixed graceful quit so desktop icons are restored before app shutdown.
- [x] Connected the saved startup auto-activate preference to the real activation flow.
- [x] Fixed packaged pet asset paths and added a visual fallback.
- [x] Added transparent pet-window mouse forwarding and scale-aware window sizing.
- [x] Added performance profiles that reduce weather particle budgets on balanced/battery modes.
- [x] Added weather/time/default AI wallpaper commands.
- [x] Fixed intermittent wallpaper host attachment by switching multi-line PowerShell to UTF-16LE `EncodedCommand` and last-line JSON parsing.
- [x] Completed two browser visual review passes plus packaged Electron main/pet/settings review.
- [x] Saved packaged Electron evidence under `recordings/projectd-stage18-*-electron-20260712.png`.

## Stage 18 Verification

- `pnpm typecheck`: passed repeatedly after all code changes.
- `pnpm build`: passed; 2413 modules transformed.
- `pnpm verify:db`: passed with 12 tables, 7 containers, 4 layouts, 43 active desktop records, encrypted weather/AI keys, and wallpaper host `Progman`.
- `pnpm verify:weather`: passed through Open-Meteo. Current network egress resolved to Seattle, Washington, so automatic city reflects the active public IP/proxy rather than physical GPS.
- External `pnpm verify:ai`: intentionally could not read the safeStorage-encrypted key. The packaged Electron runtime test succeeded with DeepSeek (`fallback=false`, reply `连接正常`).
- Browser review pass 1 found the hidden chat input and default white overlay toolbar controls.
- Browser review pass 2 confirmed the chat input is visible, overlay controls are dark/glass, four layout presets render, and body dimensions match the viewport.
- Packaged Electron review confirmed native file icons, no default menu text, a valid transparent pet image, and settings pages without outer overflow.
- Final demo autorun activated and deactivated the desktop, attached wallpaper to `Progman`, returned database state to `idle`, and left no Project D processes.
- Final packaged smoke added 0 new error-log bytes.
- `release/ProjectD-0.1.0-Setup.exe` rebuilt successfully (185,352,840 bytes).

## Current Stage 18 Caveats

- Public-IP weather location is affected by VPN/proxy egress; this run resolved Seattle. Manual city remains available.
- Final user wallpaper pack and layered Live2D/Spine assets are still external inputs.
- Multi-monitor wallpaper hosting, full DPI matrix, installer wizard/uninstall, long soak, and real-desktop screen recordings remain manual/system QA.
- Native Explorer icon-coordinate mutation remains intentionally unimplemented because v1.1 defaults to recoverable virtual organization.

## Stage 19 Conversation, Pet Settings, Real Wallpaper Pack, And Host Resilience

- [x] Added the latest 10 persisted user/assistant messages to DeepSeek, MiMo, OpenAI-compatible, and Ollama provider requests.
- [x] Added a deterministic AI-context regression test that failed on the old implementation and passes after the fix.
- [x] Added a shared pet behavior module for eight personalities, four talk frequencies, action intervals, and AI voice instructions.
- [x] Removed the hidden 30-second cap from the pet action interval.
- [x] Added live settings refresh to the independent pet window.
- [x] Added a native Electron pet context menu with outfit, personality, settings, and close actions.
- [x] Expanded the wallpaper library from 3 to 12 local assets: anime, landscape, cinematic, cyberpunk, minimalist, and seasonal each have 2 assets.
- [x] Replaced pull-cord gradient cycling in the main/overlay windows with actual local wallpaper cycling.
- [x] Added wallpaper source traceability in `docs/WALLPAPER_CREDITS.md`.
- [x] Added short retry recovery for transient WallpaperHost PowerShell exits and stopped writing every transient attempt into `error.log`.
- [x] Completed two visual reviews: browser settings/main review and packaged Electron main/settings/pet review.

## Stage 19 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 5 behavior tests.
- `pnpm build`: passed, 2414 modules transformed.
- Wallpaper acceptance test: 6 required styles, 2 local assets per style, all files present and larger than placeholder size.
- Browser settings review at 1100x760: 12 thumbnails, 0 broken images, no outer body overflow; each style filter returns exactly 2 assets.
- Browser pull-cord review: persisted wallpaper changed to `anime-lakeside-station` and the real background layer rendered.
- Packaged Electron review: 12/12 wallpaper files fetched from `app.asar`, settings body matched 820x620, pet sprite rendered, and native menu templates contained all required actions.
- Wallpaper host soak: initial attach and two periodic repairs succeeded on `Progman`; no new `error.log` entry was added after the retry/logging fix.
- `pnpm exec electron-builder`: passed and rebuilt the NSIS installer.

## Current Stage 19 Caveats

- Multi-monitor wallpaper hosting and full DPI validation are still incomplete.
- Full Live2D/Spine motion still depends on final layered pet assets; the current sprite state machine remains the lightweight laptop path.
- Real desktop recordings, clean-profile installer/uninstaller verification, and a long soak remain manual acceptance work.
- `src/main/main.ts` still owns too many responsibilities and is the strongest architecture-deepening candidate for the next engineering pass.

## Stage 20 Runtime Resilience And Module Deepening

- [x] Extracted wallpaper attachment retry and repair scheduling into a testable `WallpaperHostSupervisor`.
- [x] Changed wallpaper-host maintenance from a 30-second polling loop to display/resume events with a 90-second fallback check.
- [x] Coalesced concurrent host repairs so display changes cannot start overlapping PowerShell attachment commands.
- [x] Extracted the native pet context-menu structure from `main.ts` and covered its actions with a deterministic test.
- [x] Added a renderer-side wallpaper player with asset preloading, request ordering, failed-load rollback, and an 800-900ms crossfade.
- [x] Kept the previous wallpaper visible when a new image or video cannot load.
- [x] Added a bounded character budget to the latest 10 AI history messages while preserving both the beginning and end of oversized entries.
- [x] Increased automated coverage from 5 to 11 tests across AI context, pet behavior/menu, wallpaper library/player, and host supervision.

## Stage 20 Verification

- `pnpm test`: passed, 11/11 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; 2415 modules transformed.
- Browser transition review at 1920x1080: two wallpaper layers existed during crossfade, one active layer remained after cleanup, and the page had no body overflow.
- Settings review: all 12 wallpaper thumbnails rendered, one selected state was present, and there was no horizontal overflow.
- `pnpm exec electron-builder --dir`: passed.
- Packaged Electron smoke: wallpaper attached to `Progman`; a simulated `display-metrics-changed` event triggered a logged repair with `attached: true` and `reason: display-metrics-changed`.
- Test processes and preview server were closed after verification.

## Current Stage 20 Caveats

- `src/main/main.ts` remains large. Wallpaper supervision and pet-menu construction are now separate modules, but window lifecycle, IPC registration, and tray control still need extraction.
- Multi-monitor bounds/hosting, DPI matrix, sleep/wake on real hardware, Explorer restart, clean-profile install/uninstall, and four-hour soak remain system-level acceptance work.
- Native Explorer icon-coordinate mutation remains intentionally unimplemented pending an approved snapshot and rollback design.
- Full Live2D/Spine motion still depends on final layered and licensed pet assets; the current sprite path remains the low-resource implementation.

## Stage 21 Interaction Semantics And Feedback Fixes

- [x] Unified wallpaper control labels as `wallpaper name · style`, for example `湖畔车站 · 动漫`.
- [x] Changed overlay arrow tooltips from style navigation to explicit previous/next wallpaper navigation.
- [x] Shared wallpaper label formatting between the main window and desktop overlay.
- [x] Changed direct pet clicks to use the active personality sentence library instead of the current animation state's generic bubble.
- [x] Kept weather, outfit, clock, and animation-state bubbles for their appropriate automatic state transitions.
- [x] Chat now clears only after a successful send, retains failed input for retry, restores input focus, and displays a concise success status.
- [x] Added a wallpaper label semantics regression test; the automated suite now contains 12 tests.

## Stage 21 Verification

- `pnpm test`: passed, 12/12 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; 2415 modules transformed.
- Browser interaction review: pull-cord changed from `选择壁纸` to `湖畔车站 · 动漫`; overlay showed the same label and previous/next wallpaper tooltips.
- Browser chat review: input cleared after success, focus returned to the input, and `已发送，可以继续输入` was announced as status feedback.
- Browser pet review: after applying the cold personality, a direct click returned `已待命。需要时叫我。` from the cold sentence set.
- Packaged Electron review: main-window wallpaper label and real pet-window cold-personality click both passed.
- Visual evidence saved under `recordings/projectd-stage21-*-20260713.png`.
- Final NSIS installer rebuilt successfully at 196,292,789 bytes; no preview server or Project D test process remained.

## Stage 29 Report Audit And Runtime Completion (2026-07-16)

- Audited every claim in `docs/HANAKO_CHANGES_REPORT.md` against current source and Electron runtime.
- Moved all remaining shortcut/privacy IPC handlers out of `main.ts`; direct `ipcMain.handle` count in the active entry is now zero.
- Restored exact renderer URL, route, BrowserWindow, and `webContents.id` validation across every extracted IPC module.
- Implemented real Windows Search through the local Windows index. The optional Everything adapter remains dormant because `es.exe` is not installed.
- Fixed global search relevance, external opaque handles, duplicate copy UI, and real scene-pin persistence.
- Added schema v3 with `auto_rules`, backup-before-migrate, temporary-database integrity checks, CRUD IPC, a settings page, and a no-side-effect match preview.
- Routed real chat IPC through `AiService.sendMessage`, restoring Luna intent previews, wallpaper tools, and the user-confirmed ActionPlan path.
- Added per-file action journals, identity verification, persisted resume/rollback, and recovery-center controls.
- Added versioned full-data export without credentials and a two-confirmation reset flow that deletes the database before rebuilding it.
- Current estimate: V2.1 code scope is about 85% complete; full commercial acceptance is about 75% complete after counting installer, multi-monitor/DPI, Explorer restart, sleep/wake, and soak work.

### Stage 29 Verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 76/76.
- `pnpm build`: passed, 2419 modules transformed.
- Windows Search live probe returned a real indexed Project D document.
- Fresh isolated Electron launch stayed alive, initialized schema v3, and attached the wallpaper host to `Progman`.
- v2 migration drill created `database.sqlite.pre-v2.backup`; migrated DB reported version 3, `auto_rules`, and `PRAGMA integrity_check = ok`; backup remained version 2.
- Reset drill removed an old-data sentinel and reset marker, then recreated a fresh 180224-byte database.
- Electron visual review confirmed the automatic-rules CRUD page and privacy export/delete controls render without overflow.

## Stage 34 - Packaged Startup Reliability (Complete)

- The E-drive startup crash was reproduced and fixed; the cause was an omitted `electron-updater` runtime dependency in the old package.
- Production startup now uses a guarded bootstrap entry with a stable app-data path and fatal-startup termination.
- Electron Builder 26.5.0 packages the complete pnpm runtime dependency graph under Electron 43.1.1.
- Automated status: 110/110 tests passed, the production installer built, and the packaged runtime probe passed 33/33 module loads.
- Runtime status: the corrected E-drive copy starts with the existing user database, creates a real main window and three healthy renderer processes, and has no new startup-fatal log.
- Current installer: `release/ProjectD-0.1.0-Setup.exe`, SHA-256 `A2D989396D6D8686432EF9A723EBC7110AE81CE43703C828EE672C386696F915`.

## Stage 35 - Wallpaper Startup Containment (Complete)

- Fixed a critical startup race where the wallpaper BrowserWindow could become a visible top-level fullscreen window before Windows desktop attachment completed.
- Wallpaper windows now remain hidden until attachment is both settled and confirmed successful; failed and repair states hide the window before retrying.
- Early-start Win32 inspection found zero visible fullscreen Project D windows, and the physical-screen capture confirmed the normal Project D interface without the white overlay.
- Automated verification: `pnpm test` passed 111/111; the production NSIS build completed; packaged runtime verification loaded 33/33 modules.
- Current installer: `release/ProjectD-0.1.0-Setup.exe`, SHA-256 `3CF02E83C1129EB1993D295C3F0E1B4FD94717D5CC7F8D2FCE210F8DFE36ABA8`.
- Distribution caveat: the installer is functional but unsigned, so Windows SmartScreen may warn until a code-signing certificate and timestamp service are configured.

## Stage 36 - Wallpaper Host P0 Root-Cause Fix (Complete)

- Confirmed the white desktop was an unattached Electron top-level window: `SetParent` had not created an Explorer child, but `SWP_SHOWWINDOW` still forced the fullscreen window visible.
- The Win32 host now converts the wallpaper window from `WS_POPUP` to `WS_CHILD`, aligns the caller DPI context, verifies the actual parent handle, places the child at the host bottom, and never shows it from PowerShell.
- Presentation now requires attachment, renderer media/canvas readiness, and a post-show non-white pixel check. Every failure path hides the wallpaper window.
- Added emergency desktop recovery through `Ctrl+Alt+Shift+Escape` and the tray menu.
- Real Electron validation passed for a normal wallpaper (`renderReady: true`) and a deliberately injected all-white renderer (never presented). Final screen capture was normal, `HideIcons=0`, and no Project D process remained.
- Verification: `pnpm test` 112/112 passed; `pnpm build` passed with 2420 modules transformed.
- Stage 36 NSIS installer rebuilt and packaged-runtime verification loaded 33/33 modules. SHA-256: `8E188A3714514E082B9B7FC6A70A66EAB25130925FEF74C277127349E2C14848`.
- Captured and pixel-checked 24 screenshots from the packaged Electron application under `docs/screenshots/stage36`; no files are empty or hash-duplicates.

## Stage 37 - Stale Desktop Shortcut Deployment Incident (Complete)

- Confirmed the recurrence did not come from the Stage 36 source or installer. `D:\Desktop\Project D.lnk` still launched a manually copied E-drive build whose executable and `app.asar` hashes predated Stage 36.
- Terminated the blocking legacy process, restored `HideIcons=0`, and visually confirmed that Explorer, the taskbar, and desktop icons were usable again.
- Synchronized the verified Stage 36 `release/win-unpacked` build to `E:\新建文件夹 (3)\Project D`; the deployed executable and `app.asar` now match the release hashes exactly.
- Retargeted the local acceptance shortcut to `D:\桌面操作系统\release\win-unpacked\Project D.exe`, eliminating future drift between a newly packaged build and the old manual E-drive copy.
- Launched through the real desktop shortcut. The wallpaper host recorded `attached: true` and `renderReady: true`, and a physical screen capture showed the normal Project D interface instead of a white fullscreen window.
- Launched the same shortcut twice more in quick succession. Both secondary processes received `locked: false`; one main instance remained, so repeated double-clicks cannot create duplicate wallpaper hosts.
- Invoked `Ctrl+Alt+Shift+Escape` against the deployed build. The wallpaper window was destroyed, 72 Explorer icons were visible, `HideIcons=0`, and desktop state returned to `idle`.
- No Project D Run key, Startup shortcut, or scheduled task exists on this machine. The recurrence path was the manually opened stale desktop shortcut target.

## Stage 38 - V3 Runtime, Performance And Release Evidence (Complete)

- Implemented one PauseArbiter for manual pause, external fullscreen, lock, suspend, critical thermal state, battery state, and quality mode.
- Video decoding, Pixi, Canvas, weather animations, and wallpaper refresh now pause and resume from the same runtime snapshot.
- Replaced repeated PowerShell/WMI calls with one disposable Windows presence helper.
- Separated hidden login startup from automatic desktop activation.
- Added schema v5/v6 media assets, persistent per-display wallpaper assignments, and bounded runtime metrics.
- Added per-display Settings UI, runtime controls, local performance evidence, and bounded LRU wallpaper caching.
- Added a 12-asset SHA-256 ledger, commercial evidence gate, GitHub quality workflow, secret scan, dependency audit, and SBOM.
- Stress and static-idle short runs both exit cleanly with zero error entries. Static idle CPU: average 0.44%, median 0.32%, P95 1.33%.
- Verification: 120/120 tests, production build, zero known npm audit vulnerabilities, packaged runtime 33/33 modules, and NSIS packaging passed.
- Installer: `release/ProjectD-0.1.0-Setup.exe`, 226,421,090 bytes, SHA-256 `F53C92772E2BD7D2C4ECC3AF92CF26E8DFAA163E211B7C4BBB53DC4F00958265`.
- Commercial release remains blocked by unsigned binaries, pending wallpaper license evidence, physical hardware matrix, and four-hour/24-hour soak duration.

## Stage 39 - Mixed-Display Pets And Clean Desktop Escape (Complete)

- Wallpaper effects now choose a bounded render scale from the active display DPI, CSS resolution, and quality profile; balanced 4K rendering is capped to an 8-million-pixel budget.
- Pet windows clamp and resize within small, portrait, negative-origin, and mixed-resolution display work areas.
- All five supplied character sheets are available in Settings and the pet context menu. Luna Q retains its complete transparent action pack; the other supplied design sheets render as animated portrait characters.
- Clean desktop registers `Escape` only while active, coalesces concurrent exit requests, and refuses to hide the main window if Explorer icons could not be hidden.
- Explorer icon commands now use `SendMessageTimeout`, and the recovery watchdog starts as a detached child without WMI.
- Live acceptance entered clean desktop, sent `Esc`, returned from `active` to `idle`, verified `HideIcons=0`, and restored 73 desktop icons.
- Visual acceptance captured 24 screenshots under `artifacts/qa/stage39-final3/screenshots`; the pet roster, wallpaper display metadata, wallpaper host, and live pet rendered without overflow.
- Verification: `pnpm typecheck` passed, all 127 tests passed, and the development asset gate verified 17 wallpaper/character assets.
- Stage 39 NSIS package and packaged-runtime verification passed. Installer size: 239,154,024 bytes; SHA-256: `CCFCFEE3821DDA1EB5802810F346C83E690613E18F475F90A5B14BE9C94F6DC6`; Authenticode remains `NotSigned`.

## Stage 40 - V3 Commercial Foundations And Release Automation (Code Complete)

- Replaced the `any`-based IPC service bag with strongly typed dependency contracts for all 16 handler modules.
- Added an explicit wallpaper media state machine covering loading, playing, paused, error, fallback, runtime pause/resume, bounded play attempts, and `canplay/playing/pause/ended/error/stalled` events.
- Video playback and decode failures now preserve the previous visible layer or use a required static poster instead of exposing a black frame.
- Added a persistent update recovery ledger with failure budgets, pending-install reconciliation, last-successful-version evidence, and bounded automatic retries.
- Added an isolated install/upgrade/corrupt-package/offline/rollback harness. It is deliberately fixture-only and does not claim a real installer acceptance pass.
- Added local CycloneDX SBOM, `pnpm audit` JSON, asset-ledger `sync/check/report`, and matching CI evidence uploads.
- Added Gate 8 signed remote-configuration policy and main-process HTTPS/cache integration. AI, weather, wallpaper assets, versions, and update distribution now obey verified controls while protected desktop recovery remains available; bounded local sessions and hashed crash fingerprints feed the local dashboard and P0/P1 rules.
- Added a Gate 5 server-side domain skeleton for accounts, devices, orders, verified/idempotent payment callbacks, refunds, signed entitlement snapshots, and append-only audit records.
- Added Gate 6 privacy-policy and user-agreement drafts plus a payment integration runbook. They remain drafts pending legal review.
- Verification: `pnpm quality` passed; 165/165 tests, renderer/main/server type checks, production build, 358-component SBOM, zero known audit findings, and five release-lifecycle fixture checks.
- A 30-second hidden Electron idle preflight exited cleanly with zero errors; CPU median 0.26% and P95 0.97%. The sample is intentionally not counted as four-hour or 24-hour evidence.
- Final `pnpm dist` and `pnpm verify:packaged` passed with Electron 43.1.1 and 39/39 packaged runtime modules. The NSIS installer is 239,167,277 bytes, SHA-256 `6DF1082EA41160C357751AD53FF459E6CE189FD2DB4CDD6AE47F2E28A89040F0`; Authenticode remains `NotSigned`.

### Stage 40 External Closure Requirements

- Real signed N-2/N-1 installation, update, rollback, uninstall, disk-full, and interrupted-update acceptance remains open.
- A production HTTPS remote-config service, protected signing key, server-side telemetry transport, hosted dashboard, and alert destination remain open; the client refresh/cache/decision path and local dashboard are implemented.
- The commercial service uses in-memory adapters and test verification only; production storage, authentication, channel SDKs, merchant credentials, deployment, penetration testing, and disaster recovery remain open.
- All 35 files distributed under `public` and `assets` are now tracked; every entry still requires auditable commercial-license evidence.

## Stage 41 - 0.2.0-beta.1 Internal Beta Candidate

- Internal-test decision: approved for controlled Windows x64 testing with no known P0 defect in the exercised scope.
- Fixed expiring date literals in signed operations-control tests.
- Serialized complete wallpaper-host repairs and added bounded second-frame confirmation after a transient compositor blank; the 120-second accelerated stress replay then passed with zero error-log entries.
- Added a marker-gated packaged runtime smoke path. The packaged product reached core-ready, exited with code 0, completed shutdown, and wrote no error entries.
- `pnpm quality`: passed 167/167 tests, all TypeScript targets, production build, 358-component SBOM, zero known dependency findings, and release lifecycle fixture QA.
- Forced-kill restart passed all seven checks, including database integrity and desktop-state restoration.
- Hidden idle preflight passed: CPU median 0.257%, P95 0.508%; the short run does not establish long-term memory stability.
- Electron 43.1.1 package verification passed 39/39 modules.
- Installer: `release\ProjectD-0.2.0-beta.1-Setup.exe`, 239,167,131 bytes, SHA-256 `585CC4AE3B183497AFA92B307944D2291A02AFD2DB41655D4B6209993FCBC145`, Authenticode `NotSigned`.
- Full release comparison and operating limits: `docs/INTERNAL_BETA_0.2.0-beta.1.md`.
