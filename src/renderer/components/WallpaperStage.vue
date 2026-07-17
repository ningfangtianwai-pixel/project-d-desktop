<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { Application, Container, Graphics } from "pixi.js";
import type { CurrentWeather, SettingsSnapshot, WallpaperLibraryItem } from "@shared/types";
import { WallpaperPlayer, type WallpaperAsset } from "@shared/wallpaper-player";
import type { RuntimePauseSnapshot } from "@shared/runtime";
import { wallpaperRenderScale, type WallpaperRenderProfile } from "@shared/wallpaper-render-scale";

const host = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let rafReady = false;
let settings: SettingsSnapshot | null = null;
let currentWeather: CurrentWeather | null = null;
let wallpaperLibrary: WallpaperLibraryItem[] = [];
let performanceMode = "auto";
let fallbackFrame = 0;
let fallbackRender: FrameRequestCallback | null = null;
let runtimeTimer = 0;
let wallpaperTransitionTimer = 0;
let unsubscribeSettingsUpdated: (() => void) | null = null;
let unsubscribeRuntimeState: (() => void) | null = null;
const wallpaperLayers = ref<Array<WallpaperAsset & { active: boolean }>>([]);
const weatherMode = ref<WeatherVisualMode>("clear");
const weatherIntensity = ref(0.55);
const performanceProfile = ref("auto");
const runtimePaused = ref(false);

function activeRenderProfile(): WallpaperRenderProfile {
  if (performanceMode === "quality" || performanceMode === "battery-saver") return performanceMode;
  return "balanced";
}

async function syncMediaPlayback(): Promise<void> {
  await nextTick();
  const videos = host.value?.querySelectorAll<HTMLVideoElement>(".wallpaper-bg-video") ?? [];
  for (const video of videos) {
    const shouldPlay = !runtimePaused.value && video.classList.contains("is-active");
    if (!shouldPlay) {
      video.pause();
      continue;
    }
    void video.play().catch(() => undefined);
  }
}

function applyRuntimeState(state: RuntimePauseSnapshot): void {
  runtimePaused.value = state.paused;
  performanceMode = state.effectiveProfile;
  performanceProfile.value = state.effectiveProfile;
  if (host.value) host.value.dataset.runtimePaused = String(state.paused);
  if (state.paused) {
    app?.ticker.stop();
  } else {
    app?.ticker.start();
    if (fallbackRender && !fallbackFrame) fallbackFrame = requestAnimationFrame(fallbackRender);
  }
  void syncMediaPlayback();
}

function loadBrowserWallpaper(asset: WallpaperAsset): Promise<void> {
  if (asset.type === "image") {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`壁纸图片加载失败: ${asset.id}`));
      image.src = asset.src;
    });
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      handler();
    };
    const timeout = window.setTimeout(
      () => finish(() => reject(new Error(`壁纸视频加载超时: ${asset.id}`))),
      12_000
    );
    video.preload = "metadata";
    video.muted = true;
    video.onloadeddata = () => finish(resolve);
    video.onerror = () => finish(() => reject(new Error(`壁纸视频加载失败: ${asset.id}`)));
    video.src = asset.src;
    video.load();
  });
}

const wallpaperPlayer = new WallpaperPlayer(loadBrowserWallpaper);

function wallpaperAsset(item: WallpaperLibraryItem): WallpaperAsset {
  const basePath = window.location.protocol === "file:" ? "./wallpapers/" : "/wallpapers/";
  return { id: item.id, type: item.type, src: basePath + item.file };
}

async function selectWallpaper(item: WallpaperLibraryItem): Promise<void> {
  const result = await wallpaperPlayer.select(wallpaperAsset(item));
  if (result.stale) return;
  if (result.error) {
    if (host.value) host.value.dataset.wallpaperError = result.error;
    return;
  }
  if (!result.current) return;

  if (host.value) delete host.value.dataset.wallpaperError;
  if (result.changed) {
    if (wallpaperTransitionTimer) window.clearTimeout(wallpaperTransitionTimer);
    wallpaperLayers.value = [
      ...(result.previous ? [{ ...result.previous, active: false }] : []),
      { ...result.current, active: true }
    ];
    wallpaperTransitionTimer = window.setTimeout(() => {
      wallpaperLayers.value = result.current ? [{ ...result.current, active: true }] : [];
      void syncMediaPlayback();
    }, 900);
  } else if (wallpaperLayers.value.length === 0) {
    wallpaperLayers.value = [{ ...result.current, active: true }];
  }
  void syncMediaPlayback();

  const currentIndex = wallpaperLibrary.findIndex((wallpaper) => wallpaper.id === item.id);
  const next = wallpaperLibrary[(currentIndex + 1) % wallpaperLibrary.length];
  if (next && next.id !== item.id) {
    void wallpaperPlayer.preload(wallpaperAsset(next)).catch(() => undefined);
  }
}

const fogBanks = Array.from({ length: 7 }, (_, index) => ({
  id: `fog-${index}`,
  style: {
    "--fog-y": `${8 + index * 12}%`,
    "--fog-scale": `${0.78 + index * 0.08}`,
    "--fog-delay": `${index * -8}s`,
    "--fog-duration": `${54 + index * 9}s`,
    "--fog-alpha": `${0.13 - index * 0.008}`
  }
}));
const leafSprites = Array.from({ length: 34 }, (_, index) => ({
  id: `leaf-${index}`,
  style: {
    "--leaf-x": `${(index * 31) % 100}%`,
    "--leaf-size": `${9 + (index % 6) * 2}px`,
    "--leaf-delay": `${index * -0.78}s`,
    "--leaf-duration": `${10 + (index % 7) * 1.6}s`,
    "--leaf-drift": `${(index % 2 === 0 ? 1 : -1) * (70 + (index % 8) * 18)}px`,
    "--leaf-rotate": `${(index % 2 === 0 ? 1 : -1) * (160 + index * 17)}deg`,
    "--leaf-alpha": `${0.34 + (index % 5) * 0.08}`
  }
}));
const lightOrbs = Array.from({ length: 18 }, (_, index) => ({
  id: `light-${index}`,
  style: {
    "--light-x": `${(index * 23) % 100}%`,
    "--light-y": `${18 + (index * 17) % 64}%`,
    "--light-size": `${24 + (index % 7) * 9}px`,
    "--light-delay": `${index * -1.35}s`,
    "--light-duration": `${9 + (index % 5) * 2}s`
  }
}));

const styleIds = ["anime", "aurora", "ink", "garden", "ocean", "sunset", "user"] as const;
type WallpaperStyleId = (typeof styleIds)[number];

const stylePalettes: Record<WallpaperStyleId, { primary: number; secondary: number; accent: number; haze: number; css: string }> = {
  anime: {
    primary: 0x8dd8ff,
    secondary: 0xd7d28d,
    accent: 0xf6f3ec,
    haze: 0x204e62,
    css: "linear-gradient(135deg, rgba(32,78,98,0.46), transparent 42%), radial-gradient(circle at 85% 8%, rgba(176,209,118,0.2), transparent 34%), #101114"
  },
  aurora: {
    primary: 0x7af7c4,
    secondary: 0xa89dff,
    accent: 0xf4fff8,
    haze: 0x102b33,
    css: "linear-gradient(150deg, rgba(18,88,76,0.48), transparent 48%), radial-gradient(circle at 78% 20%, rgba(168,157,255,0.24), transparent 32%), #0e1417"
  },
  ink: {
    primary: 0xd8d6c8,
    secondary: 0x6f8a92,
    accent: 0xf2eee0,
    haze: 0x202829,
    css: "linear-gradient(145deg, rgba(216,214,200,0.13), transparent 48%), radial-gradient(circle at 22% 18%, rgba(111,138,146,0.22), transparent 36%), #111515"
  },
  garden: {
    primary: 0x8fd18c,
    secondary: 0xf1c2a7,
    accent: 0xfff3d5,
    haze: 0x18352b,
    css: "linear-gradient(140deg, rgba(42,89,66,0.5), transparent 45%), radial-gradient(circle at 82% 16%, rgba(241,194,167,0.22), transparent 30%), #111915"
  },
  ocean: {
    primary: 0x65c7df,
    secondary: 0x3c7ea8,
    accent: 0xe8fbff,
    haze: 0x0f2b3b,
    css: "linear-gradient(150deg, rgba(20,84,112,0.54), transparent 45%), radial-gradient(circle at 80% 12%, rgba(101,199,223,0.2), transparent 35%), #0f1519"
  },
  sunset: {
    primary: 0xffb36a,
    secondary: 0x8ec7d2,
    accent: 0xffeed2,
    haze: 0x322036,
    css: "linear-gradient(145deg, rgba(130,68,92,0.44), transparent 48%), radial-gradient(circle at 82% 18%, rgba(255,179,106,0.25), transparent 34%), #171216"
  },
  user: {
    primary: 0x8dd8ff,
    secondary: 0xd7d28d,
    accent: 0xf6f3ec,
    haze: 0x204e62,
    css: "#0e1215"
  }
};

function currentStyleId(): WallpaperStyleId {
  const value = settings?.wallpaper.currentStyle;
  return styleIds.includes(value as WallpaperStyleId) ? (value as WallpaperStyleId) : "anime";
}

function currentPalette() {
  return stylePalettes[currentStyleId()];
}

function performanceFactor(): number {
  if (performanceMode === "quality") return 1;
  if (performanceMode === "batterySaver") return 0.38;
  if (performanceMode === "balanced") return 0.62;
  return 0.72;
}

function particleBudget(maximum: number): number {
  return Math.max(12, Math.round(maximum * performanceFactor()));
}

type WeatherVisualMode = "clear" | "rain" | "snow" | "fog" | "leaves" | "light";

function weatherPreviewOverride(): WeatherVisualMode | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("weather");
  if (value === "clear" || value === "rain" || value === "snow" || value === "fog" || value === "leaves" || value === "light") {
    return value;
  }
  return null;
}

function currentWeatherMode(): WeatherVisualMode {
  const override = weatherPreviewOverride();
  if (override) {
    return override;
  }
  const raw = (currentWeather?.condition ?? settings?.weather.manualWeather ?? "clear").toLowerCase();
  if (raw.includes("rain") || raw.includes("drizzle") || raw.includes("thunder")) {
    return "rain";
  }
  if (raw.includes("snow") || raw.includes("sleet")) {
    return "snow";
  }
  if (raw.includes("fog") || raw.includes("mist") || raw.includes("haze") || raw.includes("smoke") || raw.includes("cloud")) {
    return "fog";
  }
  if (raw.includes("leaves") || raw.includes("leaf")) {
    return "leaves";
  }
  if (raw.includes("light") || raw.includes("clear")) {
    return "light";
  }
  return "clear";
}

async function refreshRuntime(): Promise<void> {
  const [nextSettings, nextWeather, nextLibrary, nextRuntimeState, nextDisplays] = await Promise.all([
    window.projectD.getSettings(),
    window.projectD.getCurrentWeather(),
    window.projectD.getWallpaperLibrary(),
    window.projectD.getRuntimeState(),
    window.projectD.getWallpaperDisplays()
  ]);
  settings = nextSettings;
  currentWeather = nextWeather;
  wallpaperLibrary = nextLibrary;
  applyRuntimeState(nextRuntimeState);
  weatherMode.value = currentWeatherMode();
  weatherIntensity.value = Math.max(0.2, Math.min(1.2, settings?.weather.particleIntensity ?? 0.55));
  const styleId = currentStyleId();
  if (host.value) {
    host.value.style.background = currentPalette().css;
  }

  const displayId = new URLSearchParams(window.location.search).get("displayId");
  const assignedId = nextDisplays.find((display) => display.id === displayId)?.wallpaperId ?? null;
  const dynamicId = assignedId ?? settings?.wallpaper.dynamicId ?? "";
  const userWallpaper = wallpaperLibrary.find((item) => item.id === dynamicId);
  if ((assignedId || styleId === "user") && userWallpaper) {
    await selectWallpaper(userWallpaper);
  } else {
    wallpaperLayers.value = [];
  }
}

onMounted(async () => {
  if (!host.value) {
    return;
  }

  try {
    await refreshRuntime();
    window.addEventListener("projectd:settings-changed", refreshRuntime);
    unsubscribeSettingsUpdated = window.projectD.onSettingsUpdated(() => {
      void refreshRuntime();
    });
    unsubscribeRuntimeState = window.projectD.onRuntimeStateChanged(applyRuntimeState);
    runtimeTimer = window.setInterval(() => {
      if (!runtimePaused.value) void refreshRuntime();
    }, 30_000);
    const pixiApp = new Application();
    const initialRenderScale = wallpaperRenderScale({
      cssWidth: host.value.clientWidth || window.innerWidth,
      cssHeight: host.value.clientHeight || window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      profile: activeRenderProfile()
    });
    await pixiApp.init({
      resizeTo: host.value,
      backgroundAlpha: 0,
      antialias: true,
      resolution: initialRenderScale,
      autoDensity: true,
      preference: "webgl"
    });

    host.value.appendChild(pixiApp.canvas);
    app = pixiApp;
    rafReady = true;
    if (runtimePaused.value) pixiApp.ticker.stop();

    const weatherLayer = new Container();
    pixiApp.stage.addChild(weatherLayer);
    const veil = new Graphics();
    weatherLayer.addChild(veil);
    const particleLayer = new Container();
    pixiApp.stage.addChild(particleLayer);

    const particles = Array.from({ length: 116 }, (_, index) => {
      const graphic = new Graphics();
      particleLayer.addChild(graphic);
      return {
        graphic,
        index,
        xSeed: Math.random(),
        ySeed: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 1.15,
        size: 1.2 + Math.random() * 3.6,
        depth: 0.45 + Math.random() * 0.9,
        spin: Math.random() > 0.5 ? 1 : -1
      };
    });

    pixiApp.ticker.add((ticker) => {
      if (!rafReady || !host.value || document.hidden || runtimePaused.value) {
        return;
      }

      const width = host.value.clientWidth;
      const height = host.value.clientHeight;
      const time = ticker.lastTime / 1000;
      const weather = currentWeatherMode();
      const intensity = Math.max(0.2, Math.min(1.2, settings?.weather.particleIntensity ?? 0.55));
      const palette = currentPalette();

      veil.clear();
      if (weather === "rain") {
        veil.rect(0, 0, width, height);
        veil.fill({ color: 0x0f2630, alpha: 0.06 * intensity });
        for (let index = 0; index < 3; index += 1) {
          const mistY = height * (0.66 + index * 0.1) + Math.sin(time * 0.28 + index) * 16;
          veil.ellipse(width * (0.22 + index * 0.28), mistY, width * 0.32, 18 + index * 7);
          veil.fill({ color: 0xb7d7df, alpha: 0.025 * intensity });
        }
      } else if (weather === "fog") {
        for (let index = 0; index < 6; index += 1) {
          const x = ((time * (10 + index * 2) + index * width * 0.22) % (width + 260)) - 130;
          const y = height * (0.18 + index * 0.13) + Math.sin(time * 0.23 + index) * 20;
          veil.ellipse(x, y, width * (0.18 + index * 0.025), 18 + index * 5);
          veil.fill({ color: palette.haze, alpha: (0.075 - index * 0.006) * intensity });
        }
      } else if (weather === "light") {
        for (let index = 0; index < 5; index += 1) {
          const glow = Math.sin(time * 0.5 + index) * 0.5 + 0.5;
          veil.circle(width * (0.18 + index * 0.18), height * (0.22 + (index % 2) * 0.36), 80 + glow * 38);
          veil.fill({ color: palette.accent, alpha: 0.018 * intensity });
        }
      }

      for (const particle of particles) {
        particle.graphic.clear();
        if (particle.index >= particleBudget(particles.length)) {
          continue;
        }
        particle.graphic.rotation = 0;
        const rainSpeed = time * 360 * particle.speed * particle.depth;
        const softSpeed = time * 42 * particle.speed * particle.depth;
        const drift = weather === "rain" ? rainSpeed : softSpeed;
        const sway = Math.sin(time * 0.9 + particle.phase + particle.index) * (weather === "snow" ? 28 : 18);
        const x = (particle.xSeed * width + sway + (weather === "rain" ? drift * 0.34 : 0)) % (width + 90);
        const y = (particle.ySeed * height + drift) % (height + 90);
        const alphaDepth = Math.max(0.25, Math.min(1, particle.depth));

        if (weather === "rain") {
          const length = 22 + particle.size * 5 + particle.depth * 12;
          particle.graphic.moveTo(x, y);
          particle.graphic.lineTo(x - 12 - particle.depth * 5, y + length);
          particle.graphic.stroke({ width: 0.8 + particle.depth * 0.8, color: 0xa8def0, alpha: 0.13 * intensity * alphaDepth });
          if (y > height - 46 && particle.index % 5 === 0) {
            particle.graphic.ellipse(x - 10, height - 12 - (particle.index % 4) * 8, 5 + particle.depth * 3, 1.2);
            particle.graphic.fill({ color: 0xc7edf7, alpha: 0.08 * intensity });
          }
        } else if (weather === "snow") {
          const size = particle.size * (0.8 + particle.depth * 0.4);
          particle.graphic.circle(x, y, size);
          particle.graphic.fill({ color: 0xf6f3ec, alpha: 0.22 * intensity * alphaDepth });
          if (particle.index % 4 === 0) {
            particle.graphic.moveTo(x - size * 2, y);
            particle.graphic.lineTo(x + size * 2, y);
            particle.graphic.moveTo(x, y - size * 2);
            particle.graphic.lineTo(x, y + size * 2);
            particle.graphic.stroke({ width: 0.7, color: 0xf6f3ec, alpha: 0.12 * intensity });
          }
        } else if (weather === "fog") {
          continue;
        } else if (weather === "leaves") {
          particle.graphic.rotation = Math.sin(time * 1.8 + particle.phase) * 0.9 * particle.spin;
          particle.graphic.ellipse(x, y, particle.size * 2.5, particle.size * 0.95);
          particle.graphic.fill({ color: particle.index % 3 === 0 ? palette.primary : palette.secondary, alpha: 0.18 * intensity * alphaDepth });
          particle.graphic.moveTo(x - particle.size * 1.4, y);
          particle.graphic.lineTo(x + particle.size * 1.4, y);
          particle.graphic.stroke({ width: 0.6, color: palette.accent, alpha: 0.08 * intensity });
        } else if (weather === "light") {
          const pulse = 0.65 + (Math.sin(time * 1.7 + particle.phase) * 0.5 + 0.5) * 0.75;
          particle.graphic.circle(x, y, particle.size * pulse * 1.4);
          particle.graphic.fill({ color: palette.accent, alpha: 0.13 * intensity * alphaDepth });
          particle.graphic.circle(x, y, particle.size * pulse * 3.6);
          particle.graphic.fill({ color: palette.accent, alpha: 0.025 * intensity });
        } else {
          particle.graphic.circle(x, y, particle.size * 0.8);
          particle.graphic.fill({ color: palette.accent, alpha: 0.08 * intensity });
        }
      }
    });
  } catch {
    startCanvasFallback(host.value);
  }
});

onBeforeUnmount(() => {
  rafReady = false;
  if (fallbackFrame) {
    cancelAnimationFrame(fallbackFrame);
  }
  if (runtimeTimer) {
    window.clearInterval(runtimeTimer);
  }
  if (wallpaperTransitionTimer) {
    window.clearTimeout(wallpaperTransitionTimer);
  }
  window.removeEventListener("projectd:settings-changed", refreshRuntime);
  unsubscribeSettingsUpdated?.();
  unsubscribeSettingsUpdated = null;
  unsubscribeRuntimeState?.();
  unsubscribeRuntimeState = null;
  app?.destroy(true);
  app = null;
});

function startCanvasFallback(container: HTMLDivElement): void {
  container.dataset.fallback = "canvas";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    container.dataset.fallback = "true";
    return;
  }

  container.appendChild(canvas);

  const render = (time: number) => {
    fallbackFrame = 0;
    if (runtimePaused.value) return;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const renderScale = wallpaperRenderScale({
      cssWidth: width,
      cssHeight: height,
      devicePixelRatio: window.devicePixelRatio,
      profile: activeRenderProfile()
    });
    const pixelWidth = Math.max(1, Math.round(width * renderScale));
    const pixelHeight = Math.max(1, Math.round(height * renderScale));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    context.clearRect(0, 0, width, height);
    const weather = currentWeatherMode();
    const palette = currentPalette();
    container.style.background = palette.css;

    if (weather === "rain" || weather === "snow" || weather === "leaves" || weather === "light") {
      if (weather === "rain") {
        context.globalAlpha = 0.08;
        context.fillStyle = "#0f2630";
        context.fillRect(0, 0, width, height);
      }
      context.globalAlpha = 0.2;
      for (let index = 0; index < particleBudget(78); index += 1) {
        const x = (index * 97 + time / (weather === "rain" ? 6 : 20) + Math.sin(time / 1000 + index) * 18) % (width + 100);
        const y = (index * 53 + time / (weather === "rain" ? 2.4 : 17)) % (height + 100);
        context.beginPath();
        if (weather === "rain") {
          context.moveTo(x, y);
          context.lineTo(x - 12, y + 34);
          context.strokeStyle = "#9fd7ed";
          context.lineWidth = 1.3;
          context.stroke();
        } else if (weather === "snow") {
          context.fillStyle = "#f6f3ec";
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fill();
        } else if (weather === "leaves") {
          context.fillStyle = `#${palette.secondary.toString(16).padStart(6, "0")}`;
          context.ellipse(x, y, 5, 2, Math.sin(time / 900 + index), 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
          context.arc(x, y, 2 + Math.sin(time / 500 + index) * 1.2, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    fallbackFrame = requestAnimationFrame(render);
  };

  fallbackRender = render;
  fallbackFrame = requestAnimationFrame(render);
}
</script>

<template>
  <div ref="host" class="wallpaper-stage" :data-style="currentStyleId()" :data-runtime-paused="String(runtimePaused)" aria-hidden="true">
    <template v-for="layer in wallpaperLayers" :key="layer.id">
      <div
        v-if="layer.type === 'image'"
        class="wallpaper-bg-media wallpaper-bg-img"
        :class="{ 'is-active': layer.active }"
        :style="{ backgroundImage: `url(${layer.src})` }"
      ></div>
      <video
        v-else
        class="wallpaper-bg-media wallpaper-bg-video"
        :class="{ 'is-active': layer.active }"
        :src="layer.src"
        :autoplay="!runtimePaused"
        loop
        muted
        playsinline
      ></video>
    </template>
    <div
      class="real-weather-layer"
      :data-weather="weatherMode"
      :data-performance="performanceProfile"
      :style="{ '--weather-intensity': String(weatherIntensity) }"
    >
      <div class="weather-fog" aria-hidden="true">
        <span v-for="bank in fogBanks" :key="bank.id" class="fog-bank" :style="bank.style"></span>
      </div>
      <div class="weather-leaves" aria-hidden="true">
        <span v-for="leaf in leafSprites" :key="leaf.id" class="leaf-sprite" :style="leaf.style"></span>
      </div>
      <div class="weather-light" aria-hidden="true">
        <span class="light-beam light-beam-primary"></span>
        <span class="light-beam light-beam-secondary"></span>
        <span v-for="orb in lightOrbs" :key="orb.id" class="light-orb" :style="orb.style"></span>
      </div>
    </div>
  </div>
</template>
