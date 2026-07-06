# Provider Configuration

## Weather

Project D supports these weather paths:

- OpenWeatherMap: preferred when a local API key is configured. It can use a manual city or automatically detected latitude/longitude.
- Public-IP geolocation: used when weather mode is `auto` and the city field is blank. Project D tries `ipapi.co` first, then `ipwho.is`.
- Open-Meteo: fallback when coordinates are available, including IP-detected coordinates or `PROJECTD_WEATHER_LATITUDE` and `PROJECTD_WEATHER_LONGITUDE`.
- Manual mode: safe fallback when no live weather source is ready.

The OpenWeatherMap key supplied by the user is stored only as an Electron `safeStorage` encrypted value in the local SQLite database under `weather_config.api_key`. It is decrypted only inside the main process at request time and is not written to source code or `.env.example`.

`pnpm configure:providers` can enable auto weather and store the key from `PROJECTD_OPENWEATHER_API_KEY`.
`pnpm verify:weather` performs a real IP geolocation and weather request, then writes the latest weather cache locally.

## AI Providers

The AI chat service currently supports these provider slots:

- `local-fallback`: always available, no key required.
- `openai-compatible`: uses configured endpoint/model and `PROJECTD_OPENAI_COMPATIBLE_API_KEY` or stored key.
- `deepseek`: uses `PROJECTD_DEEPSEEK_API_KEY` or stored key; defaults to `https://api.deepseek.com/chat/completions` when the endpoint is still the OpenAI placeholder.
- `xiaomi-mimo`: uses `PROJECTD_MIMO_API_KEY` or stored key, and requires `PROJECTD_MIMO_ENDPOINT` or a user-configured endpoint.
- `ollama`: uses local Ollama-compatible `/api/chat`.

Real provider calls fall back to the local assistant if the key, endpoint, or local service is missing.

Stored AI provider keys use Electron `safeStorage` encryption in `ai_config.api_key`. Renderer snapshots expose only whether a key is configured, never the raw key.

`pnpm configure:providers` can configure DeepSeek from `PROJECTD_DEEPSEEK_API_KEY`.
`pnpm verify:ai` performs a small DeepSeek chat-completion request and reports only a short response preview.
