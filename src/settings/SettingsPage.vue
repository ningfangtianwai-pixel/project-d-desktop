<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Bot, CloudSun, FolderOpen, KeyRound, LayoutGrid, MonitorCog, Palette, Save } from "lucide-vue-next";
import type { SettingsSnapshot } from "@shared/types";

const autoActivate = ref(false);
const particleIntensity = ref(100);
const petEnabled = ref(true);
const wallpaperDynamic = ref(true);
const wallpaperStyle = ref("anime");
const weatherMode = ref("manual");
const manualWeather = ref("clear");
const city = ref("");
const weatherApiKey = ref("");
const provider = ref("local-fallback");
const aiApiKey = ref("");
const aiEndpoint = ref("");
const aiModel = ref("");
const settings = ref<SettingsSnapshot | null>(null);
const saveStatus = ref("设置已载入");
const weatherTestStatus = ref("");
const aiTestStatus = ref("");

async function loadSettings(): Promise<void> {
  settings.value = await window.projectD.getSettings();
  particleIntensity.value = Math.round(settings.value.weather.particleIntensity * 100);
  petEnabled.value = settings.value.pet.isVisible;
  wallpaperDynamic.value = settings.value.wallpaper.isDynamic;
  wallpaperStyle.value = settings.value.wallpaper.currentStyle;
  weatherMode.value = settings.value.weather.mode;
  manualWeather.value = settings.value.weather.manualWeather;
  city.value = settings.value.weather.city ?? "";
  weatherApiKey.value = "";
  provider.value = settings.value.ai.provider;
  aiApiKey.value = "";
  aiEndpoint.value = settings.value.ai.apiEndpoint;
  aiModel.value = settings.value.ai.model;
  autoActivate.value = (await window.projectD.getState("auto_activate_on_start")) === "true";
}

onMounted(async () => {
  await loadSettings();
});

async function openLogs(): Promise<void> {
  await window.projectD.openLogs();
}

async function testWeather(): Promise<void> {
  weatherTestStatus.value = "测试中...";
  try {
    const weather = await window.projectD.getCurrentWeather();
    weatherTestStatus.value = weather.error
      ? `失败：${weather.error}`
      : `${weather.city || "定位中"} ${weather.condition} ${weather.temperatureC != null ? `${weather.temperatureC}°C` : ""}`;
  } catch (e: any) {
    weatherTestStatus.value = `失败：${e.message ?? String(e)}`;
  }
  setTimeout(() => { weatherTestStatus.value = ""; }, 8000);
}

async function testAi(): Promise<void> {
  aiTestStatus.value = "测试中...";
  try {
    const response = await window.projectD.sendChatMessage("你好，这是一个连通性测试。");
    aiTestStatus.value = response.fallback ? "仅本地回复（未配置 API）" : `${response.provider} 响应正常`;
  } catch (e: any) {
    aiTestStatus.value = `失败：${e.message ?? String(e)}`;
  }
  setTimeout(() => { aiTestStatus.value = ""; }, 8000);
}

async function saveSettings(): Promise<void> {
  settings.value = await window.projectD.updateSettings({
    wallpaper: {
      isDynamic: wallpaperDynamic.value,
      currentStyle: wallpaperStyle.value
    },
    weather: {
      mode: weatherMode.value,
      manualWeather: manualWeather.value,
      city: city.value,
      apiKey: weatherApiKey.value,
      particleIntensity: particleIntensity.value / 100
    },
    pet: {
      isVisible: petEnabled.value
    },
    ai: {
      provider: provider.value,
      apiKey: aiApiKey.value,
      apiEndpoint: aiEndpoint.value,
      model: aiModel.value
    },
    appState: {
      auto_activate_on_start: autoActivate.value ? "true" : "false"
    }
  });

  weatherApiKey.value = "";
  aiApiKey.value = "";
  saveStatus.value = `已保存 ${new Date().toLocaleTimeString()}`;
}
</script>

<template>
  <main class="settings-shell">
    <header class="settings-header">
      <div>
        <p>Project D</p>
        <h1>设置</h1>
      </div>
      <button class="settings-save" type="button" @click="openLogs">
        <FolderOpen :size="18" />
        <span>日志</span>
      </button>
    </header>

    <section class="settings-grid">
      <article class="settings-section">
        <div class="settings-title">
          <MonitorCog :size="22" />
          <h2>通用</h2>
        </div>
        <label class="toggle-row">
          <span>启动后自动激活</span>
          <input v-model="autoActivate" type="checkbox" />
        </label>
        <p class="settings-note">启动项仅保存配置，真实自动激活会在恢复横幅完成后接入。</p>
      </article>

      <article class="settings-section">
        <div class="settings-title">
          <LayoutGrid :size="22" />
          <h2>布局</h2>
        </div>
        <select>
          <option>默认 4 列</option>
          <option>紧凑 5 列</option>
          <option>安全 3 列</option>
        </select>
      </article>

      <article class="settings-section">
        <div class="settings-title">
          <Palette :size="22" />
          <h2>壁纸</h2>
        </div>
        <label class="toggle-row">
          <span>动态桌面背景</span>
          <input v-model="wallpaperDynamic" type="checkbox" />
        </label>
        <select v-model="wallpaperStyle">
          <option value="anime">轻量动态</option>
          <option value="aurora">极光</option>
          <option value="ink">水墨</option>
          <option value="garden">花园</option>
          <option value="ocean">海洋</option>
          <option value="sunset">日落</option>
        </select>
      </article>

      <article class="settings-section">
        <div class="settings-title">
          <CloudSun :size="22" />
          <h2>天气</h2>
        </div>
        <select v-model="weatherMode">
          <option value="manual">手动</option>
          <option value="auto">自动缓存</option>
        </select>
        <select v-model="manualWeather">
          <option value="clear">晴天</option>
          <option value="rain">雨</option>
          <option value="snow">雪</option>
          <option value="fog">雾</option>
          <option value="leaves">落叶</option>
          <option value="light">光斑</option>
        </select>
        <input v-model="city" class="text-input" type="text" placeholder="城市显示名；留空按公网 IP 自动定位" />
        <input
          v-model="weatherApiKey"
          class="text-input"
          type="password"
          :placeholder="settings?.weather.apiKeyConfigured ? 'OpenWeatherMap Key 已配置' : 'OpenWeatherMap Key'"
        />
        <input v-model="particleIntensity" min="0" max="100" type="range" />
        <div class="test-row">
          <button class="settings-save settings-btn-small" type="button" @click="testWeather">测试天气</button>
          <small v-if="weatherTestStatus" :class="{ 'test-ok': !weatherTestStatus.includes('失败'), 'test-err': weatherTestStatus.includes('失败') }">{{ weatherTestStatus }}</small>
        </div>
      </article>

      <article class="settings-section">
        <div class="settings-title">
          <Bot :size="22" />
          <h2>桌宠</h2>
        </div>
        <label class="toggle-row">
          <span>显示桌宠</span>
          <input v-model="petEnabled" type="checkbox" />
        </label>
      </article>

      <article class="settings-section">
        <div class="settings-title">
          <KeyRound :size="22" />
          <h2>AI</h2>
        </div>
        <select v-model="provider">
          <option value="local-fallback">LocalFallback</option>
          <option value="openai-compatible">OpenAI Compatible</option>
          <option value="deepseek">DeepSeek</option>
          <option value="xiaomi-mimo">小米 MiMo</option>
          <option value="ollama">Ollama</option>
        </select>
        <input
          v-model="aiApiKey"
          class="text-input"
          type="password"
          :placeholder="settings?.ai.apiKeyConfigured ? 'AI Key 已配置' : 'AI Key'"
        />
        <input v-model="aiEndpoint" class="text-input" type="text" placeholder="API Endpoint" />
        <input v-model="aiModel" class="text-input" type="text" placeholder="模型名" />
        <div class="test-row">
          <button class="settings-save settings-btn-small" type="button" @click="testAi">测试 AI</button>
          <small v-if="aiTestStatus" :class="{ 'test-ok': !aiTestStatus.includes('失败') && !aiTestStatus.includes('仅本地'), 'test-err': aiTestStatus.includes('失败') || aiTestStatus.includes('仅本地') }">{{ aiTestStatus }}</small>
        </div>
      </article>
    </section>

    <footer class="settings-footer">
      <span>{{ saveStatus }}</span>
      <button class="settings-save" type="button" @click="saveSettings">
        <Save :size="18" />
        <span>保存</span>
      </button>
    </footer>
  </main>
</template>

<style scoped>
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid rgba(31, 33, 31, 0.12);
  padding: 24px;
}

.settings-header p,
.settings-header h1 {
  margin: 0;
}

.settings-header p {
  color: #527585;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.settings-header h1 {
  margin-top: 4px;
  font-size: 30px;
  letter-spacing: 0;
}

.settings-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  padding: 0 18px;
  color: #f7f3ea;
  background: #1f211f;
  cursor: pointer;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 24px;
}

.settings-section {
  border: 1px solid rgba(31, 33, 31, 0.12);
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.48);
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.settings-title h2 {
  margin: 0;
  font-size: 17px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

select,
input[type="range"],
.text-input {
  width: 100%;
}

select,
.text-input {
  min-height: 38px;
  border: 1px solid rgba(31, 33, 31, 0.16);
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 0 10px;
  color: #1f211f;
  background: #fffaf1;
}

.settings-note {
  margin: 12px 0 0;
  color: rgba(31, 33, 31, 0.62);
  font-size: 13px;
}

.test-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.settings-btn-small {
  min-height: 32px !important;
  padding: 0 12px !important;
  font-size: 13px !important;
}

.test-row small {
  font-size: 12px;
}

.test-ok {
  color: #2a7a3b;
}

.test-err {
  color: #b33a3a;
}

.settings-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid rgba(31, 33, 31, 0.12);
  padding: 14px 24px;
  color: rgba(31, 33, 31, 0.68);
  background: rgba(244, 240, 232, 0.94);
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
