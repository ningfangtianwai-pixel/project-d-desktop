<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Application, Container, Graphics } from "pixi.js";
import type { CurrentWeather, SettingsSnapshot } from "@shared/types";

const host = ref<HTMLDivElement | null>(null);
let app: Application | null = null;
let rafReady = false;
let settings: SettingsSnapshot | null = null;
let currentWeather: CurrentWeather | null = null;
let fallbackFrame = 0;
let runtimeTimer = 0;
let pointer = { x: 0.5, y: 0.5 };
const showUserBg = ref(false);
const showUserVideo = ref(false);
const userBgStyle = ref<Record<string, string>>({});
const userVideoSrc = ref("");

const USER_WALLPAPER_MAP: Record<string, { type: "image" | "video"; file: string }> = {
  "cloud-light": { type: "video", file: "cloud-light.mp4" },
  calligraphy: { type: "image", file: "calligraphy.png" },
  earth: { type: "image", file: "earth.png" },
  "evening-cloud": { type: "image", file: "evening-cloud.png" }
};

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

async function refreshRuntime(): Promise<void> {
  settings = await window.projectD.getSettings();
  currentWeather = await window.projectD.getCurrentWeather();
  const styleId = currentStyleId();
  if (host.value) {
    host.value.style.background = currentPalette().css;
  }

  // 处理用户壁纸资源
  const dynamicId = settings?.wallpaper.dynamicId ?? "";
  const userWallpaper = USER_WALLPAPER_MAP[dynamicId];
  if (styleId === "user" && userWallpaper) {
    const basePath = window.location.origin.startsWith("http") ? "/wallpapers/" : "./assets/wallpapers/user/";
    if (userWallpaper.type === "video") {
      showUserBg.value = false;
      showUserVideo.value = true;
      userVideoSrc.value = basePath + userWallpaper.file;
    } else {
      showUserVideo.value = false;
      showUserBg.value = true;
      userBgStyle.value = { backgroundImage: `url(${basePath + userWallpaper.file})` };
    }
  } else {
    showUserBg.value = false;
    showUserVideo.value = false;
    userVideoSrc.value = "";
  }
}

function updatePointer(event: PointerEvent): void {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  pointer = {
    x: Math.max(0, Math.min(1, event.clientX / width)),
    y: Math.max(0, Math.min(1, event.clientY / height))
  };
}

onMounted(async () => {
  if (!host.value) {
    return;
  }

  window.addEventListener("pointermove", updatePointer);

  try {
    await refreshRuntime();
    window.addEventListener("projectd:settings-changed", refreshRuntime);
    runtimeTimer = window.setInterval(() => {
      void refreshRuntime();
    }, 30_000);
    const pixiApp = new Application();
    await pixiApp.init({
      resizeTo: host.value,
      backgroundAlpha: 0,
      antialias: true,
      preference: "webgl"
    });

    host.value.appendChild(pixiApp.canvas);
    app = pixiApp;
    rafReady = true;

    const layer = new Container();
    pixiApp.stage.addChild(layer);
    const particleLayer = new Container();
    pixiApp.stage.addChild(particleLayer);

    const ribbons = Array.from({ length: 7 }, (_, index) => {
      const graphic = new Graphics();
      graphic.alpha = 0.22;
      layer.addChild(graphic);
      return { graphic, index };
    });
    const particles = Array.from({ length: 72 }, (_, index) => {
      const graphic = new Graphics();
      particleLayer.addChild(graphic);
      return {
        graphic,
        index,
        xSeed: Math.random(),
        ySeed: Math.random(),
        speed: 0.35 + Math.random() * 0.9,
        size: 1.5 + Math.random() * 3
      };
    });

    pixiApp.ticker.add((ticker) => {
      if (!rafReady || !host.value) {
        return;
      }

      const width = host.value.clientWidth;
      const height = host.value.clientHeight;
      const time = ticker.lastTime / 1000;
      const weather = currentWeather?.condition ?? settings?.weather.manualWeather ?? "clear";
      const intensity = Math.max(0.2, Math.min(1.2, settings?.weather.particleIntensity ?? 0.55));
      const palette = currentPalette();

      for (const ribbon of ribbons) {
        const pointerOffset = (pointer.y - 0.5) * 42 + (pointer.x - 0.5) * 22;
        const y = (height / ribbons.length) * ribbon.index + Math.sin(time * 0.35 + ribbon.index) * 26 + pointerOffset;
        ribbon.graphic.clear();
        ribbon.graphic.moveTo(-80, y);
        ribbon.graphic.bezierCurveTo(width * 0.25, y - 90, width * 0.55, y + 96, width + 80, y - 18);
        ribbon.graphic.stroke({
          width: 18 + ribbon.index * 2,
          color: ribbon.index % 2 === 0 ? palette.primary : palette.secondary,
          alpha: 0.16
        });
      }

      for (const particle of particles) {
        particle.graphic.clear();
        particle.graphic.rotation = 0;
        const drift = weather === "rain" ? time * 280 * particle.speed : time * 34 * particle.speed;
        const x = (particle.xSeed * width + Math.sin(time * 0.2 + particle.index) * 24 + (weather === "rain" ? drift * 0.28 : 0)) % (width + 60);
        const y = (particle.ySeed * height + drift) % (height + 60);

        if (weather === "rain") {
          particle.graphic.moveTo(x, y);
          particle.graphic.lineTo(x - 10, y + 28);
          particle.graphic.stroke({ width: 1.4, color: 0x9fd7ed, alpha: 0.18 * intensity });
        } else if (weather === "snow") {
          particle.graphic.circle(x, y, particle.size);
          particle.graphic.fill({ color: 0xf6f3ec, alpha: 0.2 * intensity });
        } else if (weather === "fog") {
          particle.graphic.ellipse(x, y, particle.size * 9, particle.size * 1.8);
          particle.graphic.fill({ color: palette.haze, alpha: 0.1 * intensity });
        } else if (weather === "leaves") {
          particle.graphic.rotation = Math.sin(time + particle.index) * 0.65;
          particle.graphic.ellipse(x, y, particle.size * 2.1, particle.size * 0.9);
          particle.graphic.fill({ color: palette.secondary, alpha: 0.18 * intensity });
        } else {
          particle.graphic.circle(x, y, particle.size * (weather === "light" ? 1.6 : 0.9));
          particle.graphic.fill({ color: palette.accent, alpha: (weather === "light" ? 0.16 : 0.1) * intensity });
        }
      }
    });
  } catch {
    startCanvasFallback(host.value);
  }
});

onBeforeUnmount(() => {
  rafReady = false;
  window.removeEventListener("pointermove", updatePointer);
  if (fallbackFrame) {
    cancelAnimationFrame(fallbackFrame);
  }
  if (runtimeTimer) {
    window.clearInterval(runtimeTimer);
  }
  window.removeEventListener("projectd:settings-changed", refreshRuntime);
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
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = 0.22;
    const weather = currentWeather?.condition ?? settings?.weather.manualWeather ?? "clear";
    const palette = currentPalette();
    container.style.background = palette.css;

    for (let index = 0; index < 8; index += 1) {
      const y = (height / 8) * index + Math.sin(time / 1800 + index) * 28;
      const pointerOffset = (pointer.y - 0.5) * 36 + (pointer.x - 0.5) * 18;
      context.beginPath();
      context.moveTo(-80, y + pointerOffset);
      context.bezierCurveTo(width * 0.25, y - 80 + pointerOffset, width * 0.58, y + 92 + pointerOffset, width + 80, y - 16 + pointerOffset);
      context.lineWidth = 16 + index * 2;
      context.strokeStyle = index % 2 === 0 ? `#${palette.primary.toString(16).padStart(6, "0")}` : `#${palette.secondary.toString(16).padStart(6, "0")}`;
      context.stroke();
    }

    if (weather === "rain" || weather === "snow" || weather === "fog" || weather === "leaves" || weather === "light") {
      context.globalAlpha = weather === "fog" ? 0.08 : 0.18;
      for (let index = 0; index < 48; index += 1) {
        const x = (index * 97 + time / (weather === "rain" ? 8 : 22)) % (width + 80);
        const y = (index * 53 + time / (weather === "rain" ? 3 : 18)) % (height + 80);
        context.beginPath();
        if (weather === "rain") {
          context.moveTo(x, y);
          context.lineTo(x - 8, y + 24);
          context.strokeStyle = "#9fd7ed";
          context.lineWidth = 1.3;
          context.stroke();
        } else if (weather === "snow") {
          context.fillStyle = "#f6f3ec";
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fill();
        } else if (weather === "fog") {
          context.fillStyle = "#d6dde2";
          context.ellipse(x, y, 24, 5, 0, 0, Math.PI * 2);
          context.fill();
        } else if (weather === "leaves") {
          context.fillStyle = `#${palette.secondary.toString(16).padStart(6, "0")}`;
          context.ellipse(x, y, 5, 2, Math.sin(time / 900 + index), 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
          context.arc(x, y, 3, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    fallbackFrame = requestAnimationFrame(render);
  };

  fallbackFrame = requestAnimationFrame(render);
}
</script>

<template>
  <div ref="host" class="wallpaper-stage" :data-style="currentStyleId()" aria-hidden="true">
    <div v-if="showUserBg" class="wallpaper-bg-img" :style="userBgStyle"></div>
    <video
      v-if="showUserVideo"
      class="wallpaper-bg-video"
      :src="userVideoSrc"
      autoplay
      loop
      muted
      playsinline
    ></video>
  </div>
</template>
