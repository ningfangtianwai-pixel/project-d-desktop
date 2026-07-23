const assert = require("node:assert/strict");
const test = require("node:test");

const { AiService } = require("../dist/main/ai-service.js");

test("AI provider receives the latest conversation before the current message", async () => {
  const existingHistory = [
    { id: 1, role: "user", content: "我叫小满", createdAt: "2026-07-13 09:00:00" },
    { id: 2, role: "assistant", content: "记住了，你叫小满。", createdAt: "2026-07-13 09:00:01" }
  ];
  const storedMessages = [...existingHistory];
  const settings = {
    wallpaper: { currentStyle: "anime", currentIndex: 0, borderStyle: "none", borderColor: "#000", borderWidth: 0, isDynamic: true, dynamicId: null, autoRotate: false, rotateInterval: 300 },
    weather: { mode: "manual", manualWeather: "clear", city: null, particleIntensity: 1, enableBorderInteraction: false, apiKeyConfigured: false },
    pet: { characterId: "luna", currentOutfit: "default", positionX: 0, positionY: 0, scale: 1, isVisible: true, personality: "gentle", autoOutfit: true, actionInterval: 120, talkFrequency: "normal" },
    ai: { provider: "deepseek", apiEndpoint: "https://api.deepseek.com/chat/completions", model: "deepseek-chat", temperature: 0.7, maxTokens: 150, dailyCount: 0, dailyLimit: 100, enabled: true, apiKeyConfigured: true }
  };
  const database = {
    getAppState: () => null,
    getSettings: () => settings,
    getAiRuntimeConfig: () => ({ apiKey: "test-key", endpoint: settings.ai.apiEndpoint, model: settings.ai.model }),
    getChatHistory: (limit) => storedMessages.slice(-limit),
    addChatMessage: (role, content) => {
      const message = { id: storedMessages.length + 1, role, content, createdAt: "2026-07-13 09:00:02" };
      storedMessages.push(message);
      return message;
    }
  };
  const weather = {
    getCurrentWeather: async () => ({ mode: "manual", condition: "clear", city: null, temperatureC: 24, humidity: 50, windSpeed: 1, fetchedAt: "2026-07-13T09:00:00Z", source: "manual" })
  };
  const logger = { info() {}, warn() {}, error() {} };
  let requestBody;
  const originalFetch = global.fetch;
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "你叫小满。" } }] }) };
  };

  try {
    await new AiService(database, weather, logger).sendMessage("我叫什么？");
  } finally {
    global.fetch = originalFetch;
  }

  assert.deepEqual(requestBody.messages.slice(1), [
    { role: "user", content: "我叫小满" },
    { role: "assistant", content: "记住了，你叫小满。" },
    { role: "user", content: "我叫什么？" }
  ]);
  assert.equal(requestBody.messages[0].role, "system");
  assert.match(requestBody.messages[0].content, /始终保持这一人格/);
  assert.match(requestBody.messages[0].content, /最多三步/);
  assert.match(requestBody.messages[0].content, /不要声称已经替用户执行/);
  assert.match(requestBody.messages[0].content, /当前天气粒子: clear/);
});

test("AI connection test reaches the configured provider without writing chat history", async () => {
  const settings = {
    wallpaper: { dynamicId: null },
    weather: {},
    pet: { personality: "gentle" },
    ai: {
      provider: "deepseek",
      apiEndpoint: "https://api.deepseek.com/chat/completions",
      model: "deepseek-chat",
      temperature: 0.7,
      maxTokens: 80,
      enabled: true
    }
  };
  let writes = 0;
  const database = {
    getAppState: () => null,
    getSettings: () => settings,
    getAiRuntimeConfig: () => ({
      apiKey: "test-key",
      endpoint: settings.ai.apiEndpoint,
      model: settings.ai.model,
      provider: settings.ai.provider
    }),
    addChatMessage: () => {
      writes += 1;
    }
  };
  const weather = { getCurrentWeather: async () => ({ condition: "clear" }) };
  const logger = { info() {}, warn() {}, error() {} };
  const originalFetch = global.fetch;
  let requestBody;
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "OK" } }] })
    };
  };

  try {
    const result = await new AiService(database, weather, logger).testConnection();
    assert.deepEqual(result, { provider: "deepseek", mode: "remote", message: "deepseek 连接正常" });
    assert.equal(requestBody.model, "deepseek-v4-flash");
    assert.equal(writes, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("AI connection test reports the local fallback without network access", async () => {
  const database = {
    getSettings: () => ({ ai: { provider: "local-fallback" }, pet: { personality: "gentle" } })
  };
  const service = new AiService(database, {}, { info() {}, warn() {}, error() {} }, () => false);
  const result = await service.testConnection();
  assert.deepEqual(result, { provider: "local-fallback", mode: "local", message: "本地降级通道可用" });
});

test("AI context keeps ten recent turns while bounding oversized history", async () => {
  const oversized = "长".repeat(8_000);
  const history = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `${index}:${oversized}`,
    createdAt: "2026-07-13 09:00:00"
  }));
  const settings = {
    wallpaper: { currentStyle: "anime", currentIndex: 0, borderStyle: "none", borderColor: "#000", borderWidth: 0, isDynamic: true, dynamicId: null, autoRotate: false, rotateInterval: 300 },
    weather: { mode: "manual", manualWeather: "clear", city: null, particleIntensity: 1, enableBorderInteraction: false, apiKeyConfigured: false },
    pet: { characterId: "luna", currentOutfit: "default", positionX: 0, positionY: 0, scale: 1, isVisible: true, personality: "gentle", autoOutfit: true, actionInterval: 120, talkFrequency: "normal" },
    ai: { provider: "deepseek", apiEndpoint: "https://api.deepseek.com/chat/completions", model: "deepseek-chat", temperature: 0.7, maxTokens: 150, dailyCount: 0, dailyLimit: 100, enabled: true, apiKeyConfigured: true }
  };
  const database = {
    getAppState: () => null,
    getSettings: () => settings,
    getAiRuntimeConfig: () => ({ apiKey: "test-key", endpoint: settings.ai.apiEndpoint, model: settings.ai.model }),
    getChatHistory: (limit) => history.slice(-limit),
    addChatMessage: (role, content) => ({ id: 99, role, content, createdAt: "2026-07-13 09:00:02" })
  };
  const weather = {
    getCurrentWeather: async () => ({ mode: "manual", condition: "clear", city: null, temperatureC: 24, humidity: 50, windSpeed: 1, fetchedAt: "2026-07-13T09:00:00Z", source: "manual" })
  };
  const logger = { info() {}, warn() {}, error() {} };
  let requestBody;
  const originalFetch = global.fetch;
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "收到" } }] }) };
  };

  try {
    await new AiService(database, weather, logger).sendMessage("继续");
  } finally {
    global.fetch = originalFetch;
  }

  const injectedHistory = requestBody.messages.slice(1, -1);
  assert.equal(injectedHistory.length, 10);
  assert.ok(injectedHistory.every((message) => message.content.length <= 1_800));
  assert.ok(injectedHistory.reduce((sum, message) => sum + message.content.length, 0) <= 18_000);
});

test("Luna creates only an inbox preview request and refuses destructive wording locally", async () => {
  const messages = [];
  const settings = {
    wallpaper: { currentStyle: "anime", currentIndex: 0, borderStyle: "none", borderColor: "#000", borderWidth: 0, isDynamic: true, dynamicId: null, autoRotate: false, rotateInterval: 300 },
    weather: { mode: "manual", manualWeather: "clear", city: null, particleIntensity: 1, enableBorderInteraction: false, apiKeyConfigured: false },
    pet: { characterId: "luna", currentOutfit: "default", positionX: 0, positionY: 0, scale: 1, isVisible: true, personality: "gentle", autoOutfit: true, actionInterval: 120, talkFrequency: "normal" },
    ai: { provider: "local-fallback", apiEndpoint: "", model: "", temperature: 0.7, maxTokens: 150, dailyCount: 0, dailyLimit: 100, enabled: false, apiKeyConfigured: false }
  };
  const database = {
    getSettings: () => settings,
    getChatHistory: (limit) => messages.slice(-limit),
    addChatMessage: (role, content) => {
      const message = { id: messages.length + 1, role, content, createdAt: "2026-07-13 09:00:02" };
      messages.push(message);
      return message;
    }
  };
  const weather = { getCurrentWeather: async () => ({ mode: "manual", condition: "clear", city: null, temperatureC: 24, humidity: 50, windSpeed: 1, fetchedAt: "2026-07-13T09:00:00Z", source: "manual" }) };
  const logger = { info() {}, warn() {}, error() {} };
  const service = new AiService(database, weather, logger);

  const preview = await service.sendMessage("\u5e2e\u6211\u6536\u62fe\u684c\u9762");
  assert.equal(preview.provider, "luna-local-policy");
  assert.equal(preview.intentPreview?.kind, "desktop-inbox-preview");
  assert.match(preview.message.content, /\u4e0d\u4f1a\u79fb\u52a8/);

  const refused = await service.sendMessage("\u5220\u9664\u684c\u9762\u4e0a\u7684\u6587\u4ef6");
  assert.equal(refused.provider, "luna-local-policy");
  assert.equal(refused.intentPreview, undefined);
  assert.match(refused.message.content, /cannot delete/i);
});
