# Specification Review Notes

## 2026-07-07

### Needs wording adjustment

- `ProjectD_v1.1_技术细节补充与验收标准.md` section 7.4 says the incremental watcher "must use chokidar". This is too implementation-specific for the current Windows packaging constraints.
- Project D now uses native `fs.watch` with the required 500 ms debounce and 2000 ms max batch delay. This preserves the acceptance intent while avoiding packaged `chokidar`/pnpm/asar dependency failures.
- Suggested acceptance wording: "incremental desktop watcher must use debounce and must mark add/change/unlink/addDir/unlinkDir through a safe rescan flow"; implementation may be `chokidar`, native `fs.watch`, or a platform adapter.

### External dependency

- The V1 wallpaper asset-count requirement is valid as product direction, but final real wallpaper packs depend on user-provided assets. The current generated wallpaper styles remain a low-resource fallback and should not replace final assets.

### Not a conflict

- v1.1 recommends a single `DesktopStageWindow`, but explicitly allows splitting into `WallpaperWindow`, `OverlayWindow`, and `PetWindow`. The current split-window architecture is acceptable because it improves click-through and always-on-top pet behavior.
