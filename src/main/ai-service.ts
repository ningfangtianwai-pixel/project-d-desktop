import type { ChatResponse } from "../shared/types.js";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";
import type { WeatherService } from "./weather-service.js";

export class AiService {
  constructor(
    private readonly database: DatabaseService,
    private readonly weather: WeatherService,
    private readonly logger: AppLogger
  ) {}

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
    this.database.addChatMessage("user", normalized, settings.pet.personality, JSON.stringify(weather));

    const providerReply = await this.tryProviderReply(normalized, weather.condition);
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

  private async tryProviderReply(input: string, weather: string): Promise<string | null> {
    const settings = this.database.getSettings();
    if (!settings.ai.enabled || settings.ai.provider === "local-fallback") {
      return null;
    }

    try {
      if (settings.ai.provider === "ollama") {
        return await this.callOllama(input, weather);
      }

      return await this.callOpenAiCompatible(input, weather);
    } catch (error) {
      this.logger.warn("ai", "provider chat failed; using local fallback", {
        provider: settings.ai.provider,
        message: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async callOpenAiCompatible(input: string, weather: string): Promise<string | null> {
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
        messages: [
          {
            role: "system",
            content: `你是 Project D 桌宠助手。回答要简短、具体、偏桌面整理和陪伴。当前天气粒子: ${weather}。`
          },
          { role: "user", content: input }
        ],
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

  private async callOllama(input: string, weather: string): Promise<string | null> {
    const runtime = this.database.getAiRuntimeConfig();
    const endpoint = runtime.endpoint && runtime.endpoint.includes("11434") ? runtime.endpoint : "http://127.0.0.1:11434/api/chat";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: runtime.model || "qwen2.5:latest",
        stream: false,
        messages: [
          { role: "system", content: `你是 Project D 桌宠助手。当前天气粒子: ${weather}。` },
          { role: "user", content: input }
        ]
      }),
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || null;
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
      return "我已经在看桌面文件了。现在可以先用虚拟分区整理，后面再接入更聪明的规则和 AI 标签。";
    }
    if (input.includes("天气") || lower.includes("weather")) {
      return `当前天气粒子模式是 ${weather}。你可以在设置里切换手动天气，自动天气会优先走缓存降级。`;
    }
    if (input.includes("桌宠") || input.includes("宠物")) {
      return "我现在已经是独立置顶窗口了，下一步会补动作状态机、外观和更自然的待机动作。";
    }
    if (personality === "gentle") {
      return "收到。我会先按本地安全逻辑处理，不会擅自移动真实文件；需要外部 AI 时再走可配置 provider。";
    }
    return "收到，Project D 会优先保持桌面可复位，再逐步增强自动化。";
  }
}
