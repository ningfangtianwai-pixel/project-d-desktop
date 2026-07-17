import { findWallpaperByInput, nextWallpaperId, WALLPAPER_LIBRARY } from "../shared/wallpaper-library.js";
import { petPersonalityInstruction } from "../shared/pet-behavior.js";
import type { ChatMessage, ChatResponse, SettingsSnapshot } from "../shared/types.js";
import { parseLunaIntent } from "./luna/intent-parser.js";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";
import type { WeatherService } from "./weather-service.js";
import { getPrivacyNetworkState } from "./privacy-network.js";

export class AiService {
  private settingsChangedHandler: ((settings: SettingsSnapshot) => void) | null = null;

  constructor(
    private readonly database: DatabaseService,
    private readonly weather: WeatherService,
    private readonly logger: AppLogger,
    private readonly networkAllowed: () => boolean = () => true
  ) {}

  setSettingsChangedHandler(handler: (settings: SettingsSnapshot) => void): void {
    this.settingsChangedHandler = handler;
  }

  getHistory() {
    return this.database.getChatHistory(40);
  }

  async sendMessage(content: string): Promise<ChatResponse> {
    const normalized = content.trim();
    if (normalized.length === 0 || normalized.length > 2000) {
      throw new Error("Invalid chat message length");
    }

    const settings = this.database.getSettings();
    const weather = await this.weather.getCurrentWeather();
    const recentHistory = this.database.getChatHistory(10);
    this.database.addChatMessage("user", normalized, settings.pet.personality, JSON.stringify(weather));

    const intent = parseLunaIntent({ message: normalized });
    if (intent.kind === "unsupported" && intent.reason.startsWith("For your safety")) {
      const message = this.database.addChatMessage("assistant", intent.reason, settings.pet.personality, JSON.stringify(weather));
      this.logger.info("ai", "luna policy rejected unsafe request", { input: normalized });
      return { message, provider: "luna-local-policy", fallback: false };
    }

    if (intent.kind === "desktop-inbox-preview") {
      const reply = "我可以先生成一份桌面收件箱整理方案。它只会展示可移动项和冲突项，确认前不会移动任何文件。";
      const message = this.database.addChatMessage("assistant", reply, settings.pet.personality, JSON.stringify(weather));
      this.logger.info("ai", "luna requested desktop inbox preview", { input: normalized });
      return {
        message,
        provider: "luna-local-policy",
        fallback: false,
        intentPreview: {
          kind: "desktop-inbox-preview",
          title: "桌面收件箱方案",
          detail: "先审查可整理项与冲突项，再由你决定是否执行。"
        }
      };
    }

    const localToolReply = this.tryWallpaperTool(normalized, weather.condition);
    if (localToolReply) {
      const message = this.database.addChatMessage("assistant", localToolReply, settings.pet.personality, JSON.stringify(weather));
      this.logger.info("ai", "local wallpaper tool completed", { input: normalized });
      return {
        message,
        provider: "local-wallpaper-tool",
        fallback: false
      };
    }

    const providerReply = await this.tryProviderReply(normalized, weather.condition, recentHistory, settings.pet.personality);
    const reply = providerReply ?? this.createLocalReply(normalized, settings.pet.personality, weather.condition);
    const message = this.database.addChatMessage("assistant", reply, settings.pet.personality, JSON.stringify(weather));

    this.logger.info("ai", "chat completed", {
      provider: settings.ai.provider,
      fallback: !providerReply,
      weather: weather.condition
    });

    return {
      message,
      provider: settings.ai.provider,
      fallback: !providerReply
    };
  }

  private tryWallpaperTool(input: string, weatherCondition: string): string | null {
    if (!this.isWallpaperIntent(input)) {
      return null;
    }

    if (input.includes("有哪些") || input.includes("壁纸库") || input.includes("列表")) {
      const names = WALLPAPER_LIBRARY.map((item) => `「${item.label}」`).join("、");
      return `现在壁纸库里有 ${names}。你可以直接说“换成地球壁纸”或“随机换一张壁纸”。`;
    }

    const current = this.database.getSettings();
    if (input.includes("恢复默认动态壁纸") || input.includes("默认动态壁纸")) {
      const next = this.database.updateSettings({
        wallpaper: {
          currentStyle: "user",
          dynamicId: "anime-lakeside-station",
          isDynamic: true,
          currentIndex: current.wallpaper.currentIndex + 1
        }
      });
      this.settingsChangedHandler?.(next);
      return "已恢复 Project D 默认湖畔车站壁纸，并保留当前天气氛围。";
    }

    const requested = findWallpaperByInput(input);
    const followsWeather = /按.*天气|根据.*天气|跟随天气/.test(input);
    const followsTime = /按.*时间|根据.*时间|跟随时间|白天壁纸|夜晚壁纸/.test(input);
    let contextualWallpaperId: string | null = null;
    if (followsWeather) {
      const weather = weatherCondition.toLowerCase();
      contextualWallpaperId = /rain|snow|fog|mist|cloud|haze/.test(weather) ? "evening-cloud" : "calligraphy";
    } else if (followsTime) {
      const hour = new Date().getHours();
      contextualWallpaperId = hour >= 18 || hour < 6 ? "earth" : hour >= 15 ? "evening-cloud" : "calligraphy";
    }
    const wantsRandom =
      input.includes("随机") ||
      input.includes("随便") ||
      input.includes("换一张") ||
      input.includes("下一张") ||
      input.includes("换壁纸") ||
      input.includes("切换壁纸") ||
      input.includes("换个壁纸");
    const wallpaperId = requested?.id ?? contextualWallpaperId ?? (wantsRandom ? nextWallpaperId(current.wallpaper.dynamicId) : null);

    if (!wallpaperId) {
      const names = WALLPAPER_LIBRARY.map((item) => item.label).join("、");
      return `我能换桌面壁纸。现在可选：${names}。告诉我想换哪一张就行。`;
    }

    const wallpaper = WALLPAPER_LIBRARY.find((item) => item.id === wallpaperId);
    if (!wallpaper) {
      return "这张壁纸还没有加入本地壁纸库，我先不乱切换。";
    }

    const next = this.database.updateSettings({
      wallpaper: {
        currentStyle: "user",
        dynamicId: wallpaper.id,
        isDynamic: true,
        currentIndex: current.wallpaper.currentIndex + 1
      }
    });
    this.settingsChangedHandler?.(next);

    return `已把真实桌面壁纸切换为「${wallpaper.label}」。这次切换会作用在 Project D 的桌面壁纸层，不只是预览页。`;
  }

  private isWallpaperIntent(input: string): boolean {
    const lower = input.toLowerCase();
    const explicitWallpaper = input.includes("壁纸") || input.includes("背景") || lower.includes("wallpaper");
    const action = input.includes("换") || input.includes("切") || input.includes("改") || input.includes("用") || input.includes("设置");
    return (
      explicitWallpaper ||
      (action && findWallpaperByInput(input) !== null)
    );
  }

  private async tryProviderReply(input: string, weather: string, history: ChatMessage[], personality: string): Promise<string | null> {
    const settings = this.database.getSettings();
    if (!this.networkAllowed() || getPrivacyNetworkState(this.database).paused || !settings.ai.enabled || settings.ai.provider === "local-fallback") {
      return null;
    }

    try {
      if (settings.ai.provider === "ollama") {
        return await this.callOllama(input, weather, history, personality);
      }

      return await this.callOpenAiCompatible(input, weather, history, personality);
    } catch (error) {
      this.logger.warn("ai", "provider chat failed; using local fallback", {
        provider: settings.ai.provider,
        message: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async callOpenAiCompatible(input: string, weather: string, history: ChatMessage[], personality: string): Promise<string | null> {
    const settings = this.database.getSettings();
    const runtime = this.database.getAiRuntimeConfig();
    const apiKey = runtime.apiKey || this.envKeyForProvider(settings.ai.provider);
    if (!apiKey) {
      return null;
    }

    const endpoint = this.endpointForProvider(settings.ai.provider, runtime.endpoint);
    if (!endpoint) {
      return null;
    }

    const model = this.modelForProvider(settings.ai.provider, runtime.model);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: this.buildProviderMessages(
          {
            role: "system",
            content: `你是 Project D 桌宠助手。回答要简短、具体、偏桌面整理和陪伴。${petPersonalityInstruction(personality)}当前天气粒子: ${weather}。`
          },
          history,
          input
        ),
        temperature: settings.ai.temperature,
        max_tokens: settings.ai.maxTokens
      }),
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`${settings.ai.provider} returned ${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  }

  private async callOllama(input: string, weather: string, history: ChatMessage[], personality: string): Promise<string | null> {
    const runtime = this.database.getAiRuntimeConfig();
    const endpoint = runtime.endpoint && runtime.endpoint.includes("11434") ? runtime.endpoint : "http://127.0.0.1:11434/api/chat";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: runtime.model || "qwen2.5:latest",
        stream: false,
        messages: this.buildProviderMessages(
          { role: "system", content: `你是 Project D 桌宠助手。${petPersonalityInstruction(personality)}当前天气粒子: ${weather}。` },
          history,
          input
        )
      }),
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || null;
  }

  private buildProviderMessages(
    system: { role: "system"; content: string },
    history: ChatMessage[],
    input: string
  ): Array<{ role: "system" | "user" | "assistant"; content: string }> {
    const recent = history.slice(-10).map((message) => ({
      role: message.role,
      content: this.truncateHistoryContent(message.content)
    }));
    return [system, ...recent, { role: "user", content: input }];
  }

  private truncateHistoryContent(content: string, limit = 1_800): string {
    if (content.length <= limit) {
      return content;
    }

    const marker = "\n...[中间内容已截断]...\n";
    const available = limit - marker.length;
    const headLength = Math.ceil(available * 0.67);
    return `${content.slice(0, headLength)}${marker}${content.slice(-(available - headLength))}`;
  }

  private envKeyForProvider(provider: string): string | undefined {
    if (provider === "deepseek") {
      return process.env.PROJECTD_DEEPSEEK_API_KEY;
    }
    if (provider === "xiaomi-mimo") {
      return process.env.PROJECTD_MIMO_API_KEY;
    }
    return process.env.PROJECTD_OPENAI_COMPATIBLE_API_KEY;
  }

  private endpointForProvider(provider: string, configuredEndpoint: string): string | null {
    if (provider === "deepseek") {
      return configuredEndpoint.includes("api.openai.com") ? "https://api.deepseek.com/chat/completions" : configuredEndpoint;
    }
    if (provider === "xiaomi-mimo") {
      const envEndpoint = process.env.PROJECTD_MIMO_ENDPOINT;
      if (envEndpoint) {
        return envEndpoint;
      }
      return configuredEndpoint.includes("api.openai.com") ? null : configuredEndpoint;
    }
    return configuredEndpoint;
  }

  private modelForProvider(provider: string, configuredModel: string): string {
    if (provider === "deepseek" && configuredModel === "gpt-3.5-turbo") {
      return "deepseek-chat";
    }
    return configuredModel;
  }

  private createLocalReply(input: string, personality: string, weather: string): string {
    const lower = input.toLowerCase();
    if (input.includes("整理") || input.includes("文件")) {
      return "桌面文件已按虚拟分区管理。拖到其他容器只会更新分类，不会移动或改名真实文件。";
    }
    if (input.includes("天气") || lower.includes("weather")) {
      return `当前天气粒子模式是 ${weather}。你可以在设置里切换手动天气，自动天气会优先走缓存降级。`;
    }
    if (input.includes("桌宠") || input.includes("宠物")) {
      return "我现在是独立置顶桌宠窗口，会按时间和天气切换状态，也可以拖动、双击对话或在设置里调整人格。";
    }
    if (personality === "gentle") {
      return "收到。我会先按本地安全逻辑处理，不会擅自移动真实文件；需要外部 AI 时再走可配置 provider。";
    }
    return "收到，Project D 会优先保持桌面可复位，再逐步增强自动化。";
  }
}
