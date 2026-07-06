# Window Layering Notes

## Current Alignment

- Desktop organization is displayed through a full-screen Project D overlay window while Windows desktop icons are hidden and later restored.
- Dynamic wallpaper and weather particles now have a dedicated wallpaper window and can attach to the Windows desktop host.
- The pet now runs in an independent transparent always-on-top Electron window, closer to a QQ-style desktop pet.

## Desktop Wallpaper Host

Project D now creates a dedicated `#/wallpaper` renderer window and attempts to parent it into the Windows desktop window chain through PowerShell + .NET P/Invoke. This avoids native npm dependencies and does not require MSVC Build Tools.

Current verified host result on this machine:

- First attempt failed because `FindWindow("Progman", null)` returned `0`.
- Local window probing confirmed `FindWindow("Progman", "Program Manager")` works.
- After the fallback fix, the wallpaper window attached successfully to `Progman`.
- Smoke test result: `wallpaper host attach result` logged `{ attached: true, parentKind: "Progman" }`.
- Current code prefers a WorkerW host when it can discover one, then falls back to Progman.
- Current code periodically reattaches the wallpaper host to reduce damage from Explorer/window-chain changes.
- Wallpaper parallax responds to pointer movement without intercepting desktop/file clicks.

## Remaining Risks

- The host currently attaches to `Progman`, not `WorkerW`, on this machine. This is acceptable as a first desktop-background host, but deeper WorkerW probing or a tiny native helper may be needed if strict WorkerW hosting is required.
- Multi-monitor attachment has not been implemented yet.
- Current wallpaper window is set to ignore mouse events so it will not block desktop/file interactions. Pointer-move parallax is supported; direct click interaction still needs a separate safe interaction strategy.
- This is a Windows shell integration path and should keep strong fallback behavior because incorrect parenting can leave invisible or orphaned windows behind the desktop.
