# Next Steps

## V5 Immediate Queue

1. Run `pnpm verify:clean-checkout` from the committed `0.3.0-dev.0` baseline, then create a new internal installer with matching SHA-256 evidence.
2. Retain the successful full Electron E2E report and configure CI with an execution budget above five minutes for the serial suite.
3. Verify scene save/apply/restart behavior and recovery after interrupted organizer actions from the packaged installer; browser-visible pinned-resource and search actions are covered.
4. Start Wallpaper 2.0 with a persistent user-library data model, bounded thumbnail cache, CRUD paths, and a static-cover fallback contract for Live Photo/video import.
5. Add weather performance controls only after wallpaper playback establishes reliable pause/resume and fallback behavior.

## After Stage 44

1. Have qualified counsel replace the draft privacy/user-agreement material with approved final text.
2. Resolve all 33 `pending-evidence` asset records without changing their status until source, license, evidence hash, and distribution scope are verified.
3. Obtain Authenticode signing and timestamping, then rebuild and regenerate all release evidence against the signed installer.
4. Execute the real clean-account install, overwrite-upgrade, and uninstall matrix on Windows 10 and Windows 11; fixture results are not a substitute.
5. Run `pnpm qa:soak:4h` and `pnpm qa:soak:24h` to completion and retain reports whose `claimEligible` field is `true`.
6. Complete Intel/AMD/NVIDIA, single/multi-display, 100/125/150/200% DPI, mixed refresh, hot-plug, sleep/wake, and fullscreen-game physical tests.
7. After external gates close, rerun `pnpm quality:v4`, full clean checkout, `pnpm dist`, evidence generation, packaged smoke, malware scan, and `pnpm verify:release-ready` before any public Release.

## After Stage 43

1. Choose the source license as repository owner; do not claim open-source permissions until the final `LICENSE` is committed.
2. Approve or replace all 33 blocked assets, then rerun `pnpm verify:assets:commercial` and rebuild the installer.
3. Finalize legally reviewed `docs/PRIVACY_POLICY.md` and `docs/USER_AGREEMENT.md` with the real operator and support contact.
4. Supply an Authenticode certificate and production HTTPS update host; sign and replay real N-1 to N update, interrupted update, rollback, and uninstall recovery.
5. Run the physical Win10/Win11, Intel/AMD/NVIDIA, 1/2/3-display, 100/125/150/200% DPI, refresh-rate, hot-plug, sleep/wake, and fullscreen matrix.
6. Run 4-hour interactive and 24-hour idle soak against the exact signed build hash; retain CPU/GPU/memory/handle/frame/log evidence.
7. After external gates close, rerun `pnpm quality:v4`, `pnpm dist`, `pnpm verify:release-ready`, packaged smoke, and malware scanning before publishing.

## After Stage 42

1. Obtain an Authenticode certificate, legal publisher identity, and timestamp service; sign the executable, installer, uninstaller, and update packages.
2. Provide a production HTTPS update/operations host, then replay signed stable/beta `N-1 -> N` updates, rollback, staged rollout, config expiry, and revision-replay rejection.
3. Run the real Win10/Win11, Intel/AMD/NVIDIA, 1/2/3-display, 100/125/150/200% DPI, sleep/wake, lock/unlock, hot-plug, and fullscreen matrix.
4. Complete the 4-hour interactive and 24-hour idle runs. Retain CPU/GPU/private-memory/handle/frame/log evidence against the exact build hash.
5. Close all 33 asset-ledger `pending-evidence` records with author, source, license, commercial scope, and approval evidence.
6. Continue code work with a bounded Playwright Electron P0 suite, window/lifecycle extraction from `main.ts`, renderer error boundaries, and measurable startup/search/animation SLO gates.
7. Keep real payment disabled until merchant credentials, production server/database/KMS, callback verification, reconciliation, disaster recovery, and legal review are available.

The complete acceptance split and external-input list is in `docs/PROJECT_ACCEPTANCE_AUDIT_2026-07-19.md`.

## Stage 33 Immediate Queue

1. Obtain the production HTTPS update domain and Windows code-signing certificate, replace the `.invalid` build URL, then publish signed `0.1.0` and `0.1.1` artifacts with immutable metadata.
2. Replay a real installed `N-1 -> N` update on stable and beta channels. Start beta at `stagingPercentage: 5`, verify anonymous cohort behavior and rollback, then raise to 20/50/100 percent.
3. Run the same stability harness for 1 hour, then 8 hours overnight, then a true 24-hour release gate. Add physical sleep/wake, network loss, Explorer restart, full-screen pause, wallpaper changes, and desktop file events during the final run.
4. Separate idle/static/dynamic performance profiles from the high-churn recovery test and record CPU, GPU, private memory, handles, frame rate, and log growth at 60-second intervals.
5. Install the final Stage 33 NSIS package and replay tray Exit, force-kill/restart, update download/install, and uninstall restoration with zero residual processes.
6. Continue the physical 1/2/3-display and 100/125/150/200 percent DPI matrix on actual hardware.

There is no code blocker for the next round. The immediate external inputs are an HTTPS release host and signing certificate; a real 24-hour clock remains mandatory for final stability acceptance.

## Stage 32 Immediate Queue

1. Install the rebuilt Electron 43.1.1 NSIS package, exit through the real tray menu, and confirm cleanup plus zero residual processes. The unpacked artifact and forced-shutdown paths have passed.
2. Run 20 physical sleep/wake and 20 lock/unlock cycles. Keep the renderer lifecycle, WallpaperHost, Explorer, and shutdown logs with the exact installer hash.
3. Begin V3 Gate 1 with a unified pause arbiter connecting user pause, fullscreen, lock, suspend, battery, video playback, Pixi weather, and refresh timers.
4. Add per-display wallpaper assignments and preserve them across unplug/reconnect; validate with real multi-monitor hardware before claiming support.
5. Add Windows login-start control separately from the existing “activate desktop after app launch” preference.
6. Build local CPU/GPU/memory/frame sampling and 4-hour/24-hour reports before tuning effects by intuition.
7. Obtain licensed video wallpaper samples, a Windows code-signing certificate, physical compatibility devices, and later payment merchant/cloud credentials as listed in the V3 plan.

There is no current code blocker. The remaining Gate 0 work is packaged and physical-system evidence; the next code track is V3 Gate 1 wallpaper runtime reliability.

## Stage 31 Immediate Queue

1. Install the rebuilt Stage 31 NSIS artifact in an isolated location and repeat activation plus forced-main-process termination. Confirm the WMI watchdog restores Explorer icons and the installed recovery batch contains no Explorer kill/restart command.
2. Run physical 1/2/3-display recovery at 100/125/150/200 percent DPI, including primary-display changes and hot unplug. The mapping, fallback, clamping, and per-display stage code is complete; only real hardware evidence remains.
3. Run real sleep/wake and lock/unlock loops after arranging a wake-safe test window. Explorer restart detection, actual self-healing, and force-kill icon recovery passed; sleep must not be simulated or claimed from unit tests.
4. Run the four-hour interactive soak, then the 24-hour idle soak. Record private working set per process, handle count, log growth, wallpaper repair latency, portal watcher health, file-event reconciliation, and watchdog cleanup.
5. Repeat install/replacement/uninstall on a genuinely clean Windows user account. Current-account isolated-directory tests passed without changing the database, but they do not substitute for a clean profile.
6. Obtain a Windows code-signing certificate and add timestamped signing. The final installer compiles and installs but remains unsigned, so SmartScreen identity acceptance is blocked externally.
7. Route automatic-rule file changes into an ActionPlan preview and add explicit Everything/Windows Search consent/provider health UI. Windows Search is live; Everything remains optional because `es.exe` is absent.

No current code blocker. Settings startup and real desktop-icon crash recovery are closed in code and live runtime; the remaining work is mostly packaged replay, physical-system acceptance, extended stability evidence, signing, and two bounded V2.1 product follow-ups.

## Stage 28 Immediate Queue

1. Continue the handler extraction in low-risk groups: desktop/actions recovery, suggestion delivery, diagnostics export, settings/media, and pet/window lifecycle. Keep sender-route validation in every owning module and add one boundary assertion per group.
2. Add an explicit Privacy Center detail drawer for recent AI/weather request timestamps and local retention controls without exposing prompts, chat contents, filenames, paths, or credentials.
3. Add keyboard navigation and reduced-motion behavior to onboarding, then verify replay after app upgrade and storage-version migration.
4. Define the future entitlement provider contract for signed local receipts, offline grace, account switching, and restore-purchase behavior. Keep all current capabilities open until a complete product/pricing decision is approved.
5. Add a focused automated window-lifecycle test for onboarding/Luna visibility and settings-window activation so the current live Electron behavior cannot regress.

## Stage 27 Immediate Queue

1. Add persisted portal-zone geometry and a lightweight Portal Peek interaction without changing the approved-root, `realpath`-validated read-only portal safety boundary.
2. Run a short human mouse recording for native portal-picker open/cancel, scene list/apply, desktop search open/reveal/copy, and toolbar safe return. Transparent multi-window automation already verified visual rendering but was not reliable enough to claim these pointer paths.
3. Prove the new 20-second WallpaperHost budget with repeated cold starts, Explorer restart, sleep/resume, and the existing supervisor logs; replace the PowerShell bridge only if the measured latency still fails.
4. Add an Overlay interaction regression harness for toolbar panel state so search, ActionPlan, scene, and portal controls can be tested without depending on transparent Windows pointer automation.
5. Keep Luna away from active Overlay work panels and toolbar hit regions while roaming; preserve click-through outside the visible sprite.
6. Complete Workspace Scene pinned resources, to-do summary, and multi-display mapping; enabled portals, weather, pet, wallpaper, performance, and suggestion controls are now included.
7. Add the privacy-safe “加入门户” and “放入当前场景” search actions. Native folder consent must remain mandatory and opaque search handles must never become reusable path capabilities.

## V2.1 Priority Queue

1. Add the explicit opt-in provider adapters: Everything only when the user has installed it, Windows Search through an isolated helper. Retain the current approved Desktop/Portal provider and the new keyboard-first focus behavior as the privacy-preserving base.
2. Add a schema-validated, privacy-redacted provider JSON fallback for ambiguous Luna intent. It must be parse-only, reject unrecognized fields, and still route all changes through local preview/confirmation.
3. Add a compact local suggestion-decision history and optional calendar/meeting focus provider. Quiet hours, external fullscreen/low-battery signals, global/per-kind budgets, cooldown, visible delivered reason, snooze, and disable/re-enable are complete.
4. Add Portal Peek overlay behavior to the existing shortcut. Current portal refresh/watch behavior with debounce and offline/permission reporting is complete.
5. Add a user-confirmed interrupted-action recovery executor only after controlled fault injection proves resume and rollback behavior across conflict/missing cases. The current inspector remains read-only.
6. Complete the Electron supported-version upgrade matrix, signing/update release pipeline, Windows-only release metadata, and remaining low-risk IPC audit. The consented diagnostics flow, exact renderer trust, BrowserWindow identity checks, high-risk endpoint allowlists, and settings schema validation are complete.
7. Add multi-display scene mapping and 100/125/150/200 percent DPI restore QA before claiming multi-monitor support.
8. Keep the earlier manual V1 acceptance recordings, installer/uninstall clean-profile flow, wallpaper asset replacement, and long soak testing below this V2 queue.

## Existing Manual And Asset Work

1. Record the real Windows desktop clean-mode flow: activate, hide all desktop content, restore from tray, and confirm Explorer icons return after quit.
2. Record AI chat changing the live desktop wallpaper host, including weather-based, time-based, and default-wallpaper commands.
3. Record real mouse verification for container drag, width/height resize, collapse/expand, file drop classification, snapping, and restart persistence.
4. Record fog, leaves, and light effects on the actual desktop wallpaper host at balanced and battery performance settings.
5. Record the pet roaming over the Windows desktop and a normal application window, including mouse pass-through outside the visible sprite.
6. Replace or extend the new 12-image V1 wallpaper pack when the final user-authored wallpaper pack arrives; preserve the six-style manifest, credits, aliases, and tests.
7. Run the NSIS install, launch, upgrade, uninstall, and desktop-recovery flow on a clean Windows user profile.
8. Implement and verify per-display wallpaper/container bounds for multi-monitor arrangements, then run the 100/125/150/200 percent DPI matrix.
9. Run a four-hour soak with desktop file create/rename/delete events, weather refreshes, pet actions, sleep/wake, and Explorer restart; add log rotation or a diagnostics export if logs grow unbounded.
10. Replace the low-resource sprite fallback with final layered Live2D/Spine assets only after those assets are supplied and licensed; keep sprite mode available for the lightweight laptop profile.
11. Decide whether native Explorer icon-coordinate mutation is a V1 requirement. If approved, first implement shell-state snapshot, crash recovery, explicit confirmation, and one-click rollback before moving any native icon.
12. Confirm whether automatic weather should follow public-IP/proxy location or a user-approved physical-city signal; manual city remains the reliable option when a VPN is active.
13. Continue the main-process split completed in Stage 20: extract window lifecycle, IPC registration, and tray control from `src/main/main.ts`, then add integration tests at those interfaces.
14. Validate the Stage 20 wallpaper preload/crossfade failure path with deliberately corrupt image and video files in packaged Electron, including a visible non-blocking error notice.

There is no current code blocker. Items above are ordered by acceptance risk and external dependency.

## After Stage 34

1. Manually confirm the currently running E-drive build paints correctly on the physical display. Renderer health and window accessibility passed, but the resumed Computer Use capture component was unavailable for a final screenshot.
2. Run a clean-account installer, replacement-install, and uninstall pass against the new Stage 34 installer.
3. Complete physical multi-monitor/DPI, sleep/wake, and four-hour/24-hour soak gates before commercial distribution.
4. Code-sign and timestamp the installer; the current artifact remains unsigned.

## After Stage 35

1. Run the signed installer on a genuinely clean Windows 10 and Windows 11 account; record install, first launch, replacement install, and uninstall recovery.
2. Obtain an Authenticode certificate and configure timestamped signing to remove the current unsigned-distribution warning.
3. Complete physical 1/2/3-display tests at 100/125/150/200 percent scaling, including unplug/reconnect and primary-display changes.
4. Complete real sleep/wake, lock/unlock, fullscreen pause, and four-hour/24-hour stability evidence.
5. Configure a real HTTPS update endpoint before enabling production auto-update checks; the placeholder domain must not be treated as a release service.

## After Stage 36

1. Obtain an Authenticode certificate and sign the rebuilt Stage 36 installer; the functional artifact is current but remains unsigned.
2. Repeat the wallpaper-host validation on Windows 10 and on physical 125/150/200 percent DPI configurations.
3. Run sleep/wake, Explorer restart, display hot-plug, and four-hour/24-hour soak evidence with the Stage 36 host implementation.

## After Stage 37

1. Stop distributing manual copies without a deployment record. Future local acceptance must install the current NSIS artifact or synchronize the full unpacked directory and verify `Project D.exe` plus `resources/app.asar` hashes before launch.
2. Add a visible build identifier to diagnostics and the About/Recovery view so support can distinguish stale deployments without filesystem forensics.
3. Repeat the Stage 37 real-shortcut launch, duplicate-launch, and emergency-recovery checks after every wallpaper-host or packaging change.
4. Keep full-screen machine captures with personal filenames in ignored QA artifacts; publish only redacted or app-cropped evidence.

## After Stage 38

1. Run `pnpm qa:soak:4h` and `pnpm qa:soak:24h`; retain JSON and CSV reports. Short runs do not close the memory-growth gate.
2. Execute the physical Windows/GPU/display/DPI matrix, including hot-plug, 20 sleep/resume cycles, and 50 display transitions.
3. Supply Authenticode signing credentials and a timestamp service; require signature status `Valid` before external distribution.
4. Replace each `pending-evidence` asset-ledger entry with license snapshots and proof hashes; the commercial asset gate must pass.
5. Configure the real HTTPS update service and execute N-2/N-1, corrupt package, disconnect, disk-full, and migration rollback drills.
6. Keep payment, account, order, and entitlement work paused as requested.

## After Stage 39

1. Produce transparent idle/happy/thinking/sleeping/action frames for the four design-sheet-only characters; the supplied sheets are now selectable, but only Luna Q has a complete transparent action pack.
2. Run the physical two/three-display matrix at 100/125/150/200 percent scaling, including portrait rotation, primary-display changes, hot unplug, reconnect, and per-display wallpaper persistence.
3. Repeat clean desktop entry and `Esc` recovery from the packaged installer on Windows 10 and Windows 11, including Explorer-busy and forced-process-exit cases.
4. Complete four-hour and 24-hour soak evidence, Authenticode signing, HTTPS update infrastructure, and commercial license evidence for all distributed artwork.
5. Keep payment, account, order, and entitlement implementation paused until the merchant and server-side architecture is approved.

## After Stage 40

1. Add licensed 1080p/2K/4K H.264 video samples with matching static posters, then execute 100-loop playback and 300-switch packaged-runtime evidence.
2. Run the real four-hour interactive and 24-hour idle soak commands; include sleep/wake, Explorer restart, network loss, full-screen pause, and display changes.
3. Provide a production HTTPS operations endpoint and Ed25519 public key, then connect signed configuration refresh and persisted cursor handling to the main process.
4. Connect crash/session events to an approved telemetry service and alert destination without uploading desktop filenames, paths, chat text, or API keys.
5. Replace Gate 5 in-memory adapters with a separately deployed service using durable transactions, authenticated sessions, encrypted secrets, merchant-channel SDKs, and append-only audit storage.
6. Obtain legal review for the privacy policy, user agreement, membership/payment terms, refund flow, and data-retention schedule.
7. Execute signed N-2/N-1 installer/update/rollback/uninstall acceptance on clean Windows 10 and Windows 11 accounts.
8. Complete the real Windows/GPU/multi-display/DPI/refresh-rate matrix and commercial asset-license evidence.

## After Stage 41 Internal Beta

1. Run a controlled tester cohort on clean Windows 10 and Windows 11 x64 accounts; collect diagnostics only with explicit user consent.
2. Execute `pnpm qa:soak:4h` and `pnpm qa:soak:24h`, retaining JSON/CSV evidence and investigating any sustained memory growth.
3. Complete the physical Intel/AMD/NVIDIA, 1080p/2K/4K, 100/125/150/200 percent DPI, multi-display, hot-plug, sleep/wake, and mixed-refresh matrix.
4. Obtain Authenticode signing and a timestamp service before widening distribution beyond controlled internal testers.
5. Replace the disabled update endpoint with signed production infrastructure and replay real N-2/N-1 upgrade and rollback scenarios.
6. Close all 35 commercial asset-license records before public or paid distribution.
7. Keep real payment channels disabled until the server, merchant account, legal review, reconciliation, fraud controls, and disaster recovery are production-ready.

## After Stage 46

1. Verify wallpaper switching on the physical Windows desktop host with one and two displays, then confirm clean-desktop entry/exit restores both Explorer icons and the previous wallpaper.
2. Test the dedicated AI connection button with the user's currently configured DeepSeek credentials. Automated local-fallback and remote-provider fixture coverage passed, but no paid live request was made during Stage 46.
3. Replace each of the four new single-pose cutouts with licensed transparent idle, happy, thinking, sleeping, and action frames when final artwork is available.
4. Run the 100/125/150/200 percent DPI, display hot-plug, Windows 10/11, sleep/wake, four-hour, and 24-hour acceptance matrices.
5. Approve or replace all 37 `pending-evidence` asset records before public distribution, then sign the installer with Authenticode.

## After Stage 49

1. Export approved transparent idle/walk/happy/thinking/sleeping and outfit frames for the four non-Luna character sheets. The runtime/action system is ready; true garment replacement remains an artwork task.
2. Repeat clean-desktop taskbar/icon restoration on Windows 10 and a second Windows 11 machine, including forced termination, Explorer restart, sleep/wake, and a non-default exit shortcut.
3. Run physical dual-display tests with a negative-origin monitor, mixed DPI, portrait orientation, hot-plug, and cross-display pet dragging.
4. Evaluate organizer density with a real desktop containing 100+ mixed items at 100/125/150/200 percent scaling and tune only from captured evidence.
5. Complete the 4-hour/24-hour soak and asset-license/signing gates before public distribution.

## After Stage 50

1. Build a persistent custom-wallpaper asset store with checksum, quota, thumbnail generation, removal, and recovery before wiring DIY exports directly into the live library.
2. Design Live Photo/video import as a separate media pipeline with poster extraction, supported codec checks, loop/pause policy, decode-failure fallback, and package/runtime tests.
3. Obtain approved transparent idle/walk/happy/thinking/sleeping and outfit frames for the four non-Luna characters; the current source directory contains design sheets, not complete animation packs.
4. Define the exact vision-provider schema, consent boundary, cost limit, moderation policy, and deterministic prompt output before adding automatic character/personality generation.
5. Run 100+ real-desktop-item density tests for 2/4/6/8 columns across 100/125/150/200 percent DPI and portrait/landscape displays.
6. Repeat organizer activate/safe-restore, folder preview, wallpaper apply, and cache cleanup from the packaged installer on Windows 10 and a clean Windows 11 account.

## After Stage 51

1. Use an approved image-capable OpenAI-compatible or MiMo key to complete a live visual-profile request; DeepSeek V4 remains a text-only provider and must not receive image uploads.
2. Obtain and record commercial source/license evidence for every generated weather, wallpaper, and action asset before enabling public commercial distribution.
3. Run physical multi-display, DPI, sleep/wake, battery, and long-soak verification with the new bitmap weather layers enabled.
4. Profile and split the 501.70 kB renderer chunk only after runtime measurements identify the dominant modules.
5. Define a moderated user-sticker import policy before allowing arbitrary external sticker packs in Wallpaper Studio.

## After Stage 52

1. Exercise the packaged installer through clean-desktop activation, forced termination, Explorer restart, and recovery on a second Windows machine before public beta distribution.
2. Keep startup auto-activation opt-in and inspect any future recovery failure through the structured `desktop-state.log` before changing icon behavior.

## After Stage 53

1. Add an explicit pre-import preview sheet for Live Photo pairs, including a browser decode probe and an editable fit/loop/mute policy before file copying.
2. Add user-managed sticker-pack import only with a local source/attribution note, checksum, and removal workflow; procedural stickers remain the default.
3. Conduct an interactive five-character pass for every personality and action slot on real displays, then tune only from captured behavior evidence.

## After Stage 54

1. Implement Phase A from `docs/ProjectD_V5.1_壁纸主导沉浸式桌面成品计划.md`: freeze visual screenshots and extract glass, spacing, motion, safe-area, and experience-state tokens without changing behavior.
2. Replace the current always-visible `App.vue` control console with the quiet desktop shell while keeping every existing action reachable through one task surface.
3. Convert `OverlayPage.vue` into the explicit organizer task state, using spatial group markers and one bottom action strip while preserving ActionPlan preview, conflict, execution, and undo.
4. Add pre-import Live Photo playback and browser decode probing as part of the wallpaper canvas workflow.
5. Validate each implementation phase against dark, bright, detailed, low-contrast, left-subject, right-subject, portrait, and ultrawide wallpapers before moving to the next phase.
-
## After Stage 55

1. Add task-surface-specific composition so search, organizer, inbox, assistant, and wallpaper work do not all reveal the entire legacy console at once.
2. Convert `OverlayPage.vue` into the organizer task surface with spatial groups and a bottom action strip while preserving preview, conflict, execute, and undo behavior.
3. Investigate and stabilize the Windows taskbar/icon probe used by `clean-desktop-system-state`; rerun the isolated and full Electron E2E suites.
4. Add renderer screenshot checks for quiet, task, clean, bright-wallpaper, and low-contrast-wallpaper states.
5. Continue Phase D only after the shell passes visual and recovery gates: Live Photo pre-import probing, wallpaper library task surface, and mixed-display visual validation.

## After Stage 56

1. Add a real wallpaper task canvas with a bottom filmstrip, current-asset metadata, and a compact inspector without moving privileged wallpaper operations out of Settings IPC.
2. Add Live Photo pre-import playback and a browser decode probe; keep the current wallpaper when media validation or playback fails.
3. Add wallpaper visual profiles for subject-safe regions, crop mode, display assignment, and bright/dark contrast checks.
4. Run the full Electron suite again after the wallpaper task surface lands; separately stabilize the Windows taskbar/icon PowerShell probe.
5. Continue to Phase E only after the wallpaper task surface passes damaged-media, portrait, ultrawide, and mixed-DPI checks.

## After Stage 57

1. Add a real pre-copy Live Photo chooser preview or a bounded temporary staging path so cover/video playback can be confirmed before permanent library writes.
2. Add wallpaper crop/fit controls and subject-safe region metadata for portrait, ultrawide, and mixed-DPI displays.
3. Add screenshot checks for quiet, bright, high-detail, low-contrast, and video-poster studio states.
4. Split the renderer chunk only after measuring the studio and Pixi contributions; preserve startup and recovery timing.
5. Begin Phase E with dynamic pet anchor lanes and verify pet placement against the selected wallpaper safe region.

## After Stage 58

1. Add runtime reposition prompts when a wallpaper changes and the current pet position falls inside a declared subject-safe exclusion zone; never move without consent unless the position is invalid.
2. Add a compact pet task surface for character, personality, talk frequency, and action preview without opening the full settings page.
3. Verify pet anchor behavior on mixed-DPI portrait/landscape displays and after sleep/wake or display hot-plug.
4. Continue Phase F with weather quality tiers and screenshot/pixel baselines after the wallpaper and pet layers are stable.
## After Stage 59

1. Investigate the isolated Windows `clean-desktop-system-state` E2E failure in the taskbar/icon PowerShell probe.
2. Add screenshot baselines for quiet, task, clean, bright-wallpaper, low-contrast-wallpaper, and weather-quality states.
3. Run physical acceptance for mixed-DPI, portrait/landscape, multi-display hot-plug, fullscreen pause, sleep/wake, and 4/24-hour stability.
4. Add the consented pet reposition prompt after wallpaper changes, then verify it on the same display matrix.
## After Stage 60

1. Capture screenshot baselines for quiet, task, clean, bright-wallpaper, low-contrast-wallpaper, and weather-quality states.
2. Run physical mixed-DPI, portrait/landscape, multi-display hot-plug, fullscreen pause, sleep/wake, and 4/24-hour stability checks.
3. Verify the reposition prompt on an actual left-subject and right-subject wallpaper, including a user dismissal and a confirmed move.
4. Add a compact pet task surface only if the existing settings and context menu do not cover character, personality, talk frequency, and action preview ergonomically.
## After Stage 61

1. Review the six captured images visually and tune only evidence-backed contrast or spacing issues.
2. Repeat the matrix at 125%, 150%, and 200% browser/DPI emulation after the physical display pass is available.
3. Add full-screen and battery-profile captures to the weather matrix.
## After Stage 62

1. Keep the corrected six-image matrix as the visual baseline for future changes.
2. Add 125%, 150%, and 200% DPI emulation captures, then repeat on physical portrait and external displays.
3. Run the matrix with rain, snow, fog, and battery-saver profiles and compare the resulting atmosphere rather than only DOM visibility.
4. Continue manual acceptance for multi-display hot-plug, sleep/wake, fullscreen pause, and long soak.
## After Stage 63

1. Compare the three emulated-DPI screenshots for text, rail, status capsule, pet, and wallpaper-studio overflow.
2. Repeat the same states on physical 100%, 125%, 150%, and 200% Windows scaling.
3. Add weather-quality captures for balanced and battery-saver modes after confirming the runtime profile can be set deterministically in preview.
## After Stage 64

1. Keep the 20-second guarded shutdown deadline and verify it on a real clean-desktop exit after taskbar hiding.
2. Run the physical Windows matrix: DPI, portrait/external displays, hot-plug, sleep/wake, fullscreen pause, and 4/24-hour soak.
3. Decide whether to implement pre-copy Live Photo preview and user-editable wallpaper safe-region controls; both remain intentionally outside this hardening patch.
## After Stage 65

1. Exercise the Live Photo prepare/preview/confirm flow with real MP4, MOV, and WebM pairs, including malformed headers and decode failure.
2. Add user-editable crop/fit and safe-region controls only after the real preview flow is validated on representative wallpapers.
3. Continue physical Windows acceptance: mixed DPI, portrait/external displays, hot-plug, sleep/wake, fullscreen pause, and long soak.
## After Stage 66

1. Verify cover/contain independently on real portrait, ultrawide, and mixed-DPI displays.
2. Add editable normalized safe-region controls only if bundled safe-region metadata is insufficient during real wallpaper review.
3. Continue Live Photo real-media validation and the remaining physical V5.1 matrix.
## After Stage 67

1. Verify saved scenes restore the visual profile on the real renderer, including display fit mode and future shell controls.
2. Exercise cover/contain independently on real portrait, ultrawide, and mixed-DPI displays.
3. Exercise the Live Photo prepare/preview/confirm flow with real MP4, MOV, and WebM pairs.
4. Continue physical V5.1 acceptance: hot-plug, sleep/wake, fullscreen pause, GPU/battery profiles, and 4/24-hour soak.

5. Run the complete Electron E2E suite serially after the cleanup hardening; retain any Windows file-lock failures as test infrastructure defects until reproduced against the product lifecycle.
## After Stage 68

1. Run the full Electron E2E and visual matrix after the scene display-fit correction when the long serial validation window is available.
2. Verify scene restoration on physical portrait, ultrawide, mixed-DPI, and hot-plug display setups.
3. Exercise real paired Live Photo media and retain the current wallpaper on malformed or undecodable input.
4. Keep hardware, signing, artwork, and long-soak evidence separate from the local code baseline.
