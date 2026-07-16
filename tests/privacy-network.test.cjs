const assert = require("node:assert/strict");
const test = require("node:test");

const { AiService } = require("../dist/main/ai-service.js");
const { getPrivacyNetworkState, setPrivacyNetworkPaused } = require("../dist/main/privacy-network.js");
const { WeatherService } = require("../dist/main/weather-service.js");

function stateStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getAppState: (key) => values.get(key) ?? null,
    setAppState: (key, value) => values.set(key, value)
  };
}

test("privacy network pause is persisted with a timestamp", () => {
  const store = stateStore();
  const state = setPrivacyNetworkPaused(store, true, new Date("2026-07-16T02:00:00.000Z"));
  assert.deepEqual(state, { paused: true, changedAt: "2026-07-16T02:00:00.000Z" });
  assert.deepEqual(getPrivacyNetworkState(store), state);
});

test("paused weather uses cache without any external request", async () => {
  const cached = {
    mode: "auto", condition: "clear", city: "Shanghai", temperatureC: 28,
    humidity: 65, windSpeed: 2, fetchedAt: "2026-07-16T01:55:00.000Z", source: "open-meteo"
  };
  const store = stateStore({
    privacy_network_paused: "true",
    weather_cache: JSON.stringify(cached)
  });
  store.getSettings = () => ({ weather: { mode: "auto", manualWeather: "clear", city: "" } });
  const logger = { warn: () => undefined };
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => { requests += 1; throw new Error("network should be paused"); };
  try {
    const weather = await new WeatherService(store, logger).getCurrentWeather();
    assert.equal(requests, 0);
    assert.equal(weather.source, "cache");
    assert.equal(weather.error, "privacy-network-paused");
  } finally {
    global.fetch = originalFetch;
  }
});

test("paused AI keeps local replies but never contacts a provider", async () => {
  const store = stateStore({ privacy_network_paused: "true" });
  let nextId = 1;
  store.getSettings = () => ({
    pet: { personality: "gentle" },
    ai: { enabled: true, provider: "deepseek", temperature: 0.7, maxTokens: 160 },
    wallpaper: { dynamicId: "anime-lakeside-station", currentIndex: 0 }
  });
  store.getChatHistory = () => [];
  store.addChatMessage = (role, content) => ({ id: nextId++, role, content, createdAt: new Date().toISOString() });
  store.getAiRuntimeConfig = () => ({ apiKey: "should-not-be-used", endpoint: "https://example.invalid", model: "test" });
  const weather = { getCurrentWeather: async () => ({ mode: "manual", condition: "clear", city: null, temperatureC: null, humidity: null, windSpeed: null, fetchedAt: new Date().toISOString(), source: "manual" }) };
  const logger = { info: () => undefined, warn: () => undefined };
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => { requests += 1; throw new Error("network should be paused"); };
  try {
    const response = await new AiService(store, weather, logger).sendMessage("今天心情怎么样");
    assert.equal(requests, 0);
    assert.equal(response.fallback, true);
    assert.equal(response.message.role, "assistant");
  } finally {
    global.fetch = originalFetch;
  }
});
