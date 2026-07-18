# Project D 0.2.0-beta.1 Internal Beta Snapshot

## Release identity

- Version: `0.2.0-beta.1`
- Snapshot date: 2026-07-18
- Git tag: `v0.2.0-beta.1`
- Public repository: `https://github.com/ningfangtianwai-pixel/project-d-desktop`
- GitHub pre-release: `https://github.com/ningfangtianwai-pixel/project-d-desktop/releases/tag/v0.2.0-beta.1`
- Intended audience: controlled internal testers on Windows 10/11 x64
- Installer: `release/ProjectD-0.2.0-beta.1-Setup.exe`
- Installer size: 239,167,131 bytes
- SHA-256: `585CC4AE3B183497AFA92B307944D2291A02AFD2DB41655D4B6209993FCBC145`
- Authenticode: `NotSigned`

## Readiness decision

This build is approved for controlled internal testing. No known P0 defect remains in the tested scope: startup, isolated database creation, renderer readiness, desktop recovery, forced-process restart, bounded wallpaper recovery, clean shutdown, production packaging, and packaged-runtime module loading all pass.

This is not a public commercial release. Code signing, licensed-asset evidence, production update/operations services, real payment channels, legal approval, the physical hardware matrix, and four-hour/24-hour soak evidence remain release gates.

## Progress compared with 0.1.0

| Area | Earlier 0.1.0 baseline | 0.2.0-beta.1 |
| --- | --- | --- |
| Desktop safety | White-screen and hidden-icon incidents depended heavily on manual recovery | Renderer health supervision, bounded reload, safe-renderer escalation, Explorer icon verification, shutdown deadline, and clean-desktop `Esc` recovery are implemented |
| Wallpaper host | A single desktop host and intermittent attach races could expose blank output | Per-display stages, attach serialization, full repair serialization, visible-frame validation, and a bounded second compositor confirmation protect against transient blank frames |
| Video wallpaper | Playback behavior was mostly renderer-driven without a complete lifecycle | Explicit idle/loading/playing/paused/error/fallback states, bounded play attempts, poster fallback, previous-frame preservation, pause/resume, and decode/stall handling |
| Multi-display and DPI | Basic bounds handling | DIP-based container restoration, missing-display fallback, portrait/negative-origin pet clamping, per-display render scaling, hot-plug reconstruction, and independent wallpaper mapping foundations |
| Performance | No unified runtime policy or repeatable evidence | Pause arbiter combines fullscreen, lock, suspend, thermal and battery reasons; runtime metrics, 4h/24h scripts, and stress/idle preflights are available |
| Desktop pet | One primary character path | Five supplied characters are selectable; personality, talk frequency, action timing, context menu, mixed-resolution placement, and settings integration are active |
| Clean desktop | Exit and Explorer messaging could race or block | `Escape` is armed only while active, exit requests coalesce, Explorer messages have timeouts, and icon state is verified before hiding the app |
| AI and weather | Online providers worked but operational control was local-only | Conversation context, privacy pause, signed remote feature stops, safe low-risk fallback behavior, and protected desktop-core rules are connected |
| Search, portals, and scenes | Product flows existed with less isolation | Opaque expiring search handles, authorized folder portals, scene geometry/pinned resources/portal state, action previews, recovery journals, and provider boundaries are covered |
| Updates and recovery | Update checks existed without a complete failure ledger | Failure budgets, pending-install reconciliation, last-successful-version evidence, bounded retries, update distribution stops, and fixture lifecycle QA are present |
| Security and privacy | Local safety controls and diagnostics | Typed IPC module contracts, strict settings validation, explicit diagnostics consent/redaction, SBOM, dependency audit, complete asset ledger, signed operations config, and privacy-safe crash fingerprints |
| Commercial foundations | No durable commercial domain boundary | Server-side account/device/order/payment-callback/refund/entitlement/audit domain skeleton with idempotency and rollback tests; still intentionally not production payment infrastructure |
| Release verification | Repeated manual builds shared the same `0.1.0` filename | Versioned beta artifact, 167 automated tests, 39 packaged module imports, packaged graceful-start/stop smoke, crash restart, stress preflight, and traceable snapshot documentation |

## Verification evidence

- `pnpm quality`: passed, 167/167 tests.
- Vue, Electron main/preload/shared, and server TypeScript checks: passed.
- Production renderer build: passed, 2,422 modules transformed.
- CycloneDX SBOM: 358 components; dependency audit reports zero known findings at all severities.
- Release lifecycle fixture: fresh install, overwrite upgrade, corrupt-package rejection, offline preservation, and rollback restoration all passed.
- Forced-process restart: database integrity `ok`, desktop state restored to `idle`, graceful second shutdown, no temporary database residue.
- 120-second accelerated stress preflight: clean exit, core ready, shutdown complete, zero error-log entries, no safe-renderer relaunch.
- 30-second hidden idle preflight: CPU median 0.257%, P95 0.508%, clean exit, zero error-log entries. It is too short for a memory-leak conclusion.
- Packaged runtime: 39/39 declared modules loaded from `app.asar`.
- Packaged product smoke: core ready, exit code 0, shutdown complete, zero error-log entries.
- GitHub Actions: both the `main` push and `v0.2.0-beta.1` tag quality gates passed on Windows; the independent Linux Gitleaks job scanned the complete Git history and found no secret.

## Issues found and closed during snapshot qualification

1. Fixed date literals made remote-operations tests expire after midnight. Signed fixtures now use bounded relative timestamps.
2. Aggressive renderer churn exposed overlapping wallpaper repairs and a transient visible blank frame. The complete repair operation is now serialized and the compositor receives one bounded second confirmation before failure is recorded.
3. Packaged QA could not exit gracefully because all QA hooks were disabled in packaged mode. Auto-exit now works only when both a dedicated `--projectd-qa-run=` marker and the QA environment value are present, preserving normal user startup behavior.
4. Clean GitHub checkouts exposed two generated pet preview files incorrectly listed as distributed assets. The ledger now excludes `_grid` and `_preview` production aids and hashes text assets consistently across line-ending conventions.
5. Gitleaks Action's Windows installer requested a nonexistent `.tar.gz` asset. Secret scanning now runs as an isolated Linux job while the product quality gate remains on Windows.
6. Anchore's tag default attempted to write the SBOM directly to the GitHub Release. Duplicate release upload is disabled, preserving read-only workflow permissions while the evidence bundle still contains the generated SBOM.

## Known non-P0 limitations

- The installer is unsigned and may trigger Windows reputation warnings.
- The production update URL remains intentionally disabled; no signed N-2/N-1 update has been replayed.
- Four-hour and 24-hour tests are scripted but not completed for this snapshot.
- Multi-display/DPI code is covered by automated geometry tests, but the full physical Windows/GPU/display matrix is not complete.
- All 33 distributed assets are inventoried but still lack approved commercial-license evidence.
- Payment/account code is an in-memory domain skeleton; no real merchant channel, production database, authentication service, or financial reconciliation is enabled.
- Remote operations and crash alerting have client/local implementations, but no production cloud endpoint or alert transport is deployed.

## Recovery and rollback

- Source rollback: check out tag `v0.2.0-beta.1` to reproduce this snapshot.
- Installer identity: verify the SHA-256 above before testing.
- Product recovery: `Esc` exits clean desktop; the emergency desktop shortcut remains available; renderer recovery is bounded and escalates to safe-renderer mode instead of looping indefinitely.
- Testers should not use this unsigned beta as a public download or a paid distribution build.
