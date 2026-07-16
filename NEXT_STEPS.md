# Next Steps

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
