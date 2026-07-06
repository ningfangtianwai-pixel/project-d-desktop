# Next Steps

1. Add Windows shell icon extraction so desktop tiles can show each file's actual native icon when available, with category icons as fallback.
2. Add overlay container drag, resize, snap, and persistence using the existing `containers.position_x`, `position_y`, `width`, and `height` fields.
3. Add container layout presets for 2/4/6/8 regions and a reset-layout action.
4. Add multi-monitor wallpaper and container placement support, then verify per-display bounds.
5. Deepen WorkerW shell probing or introduce a tiny native helper if strict WorkerW hosting is required beyond the current functional Progman fallback.
6. Run the NSIS installer wizard and uninstall flow, then document install/uninstall results.
7. Replace the temporary pet renderer with a sprite/Spine-style asset pipeline, including idle, happy, thinking, sleepy, outfit, and weather-linked states.
8. Add settings-page provider validation buttons for OpenWeatherMap, DeepSeek, Xiaomi MiMo, OpenAI-compatible, and Ollama.
9. Add visible geolocation status in settings and main UI so users can see whether weather is using IP-derived city, stored coordinates, or manual city.
10. Add stronger desktop/file interaction tests, including create/rename/delete watcher events and another screen-recorded activate/deactivate demo.
11. Add log rotation or a diagnostics panel so old resolved errors do not confuse future verification.
12. Integrate real wallpaper asset packs after the user provides final assets, while keeping the current lightweight generated styles as low-resource fallback.
