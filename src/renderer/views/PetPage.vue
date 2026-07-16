<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { petActionIntervalMs, petBubbleDelayMs, petSentence } from "@shared/pet-behavior";
import type { CurrentWeather, SettingsSnapshot, SuggestionRecord } from "@shared/types";

const bubble = ref("我在桌面上。");
const bubbleVisible = ref(false);
const petShell = ref<HTMLElement | null>(null);
const spriteFailed = ref(false);
const petScale = ref(1);
const personality = ref("gentle");
const talkFrequency = ref("normal");
const autoOutfit = ref(true);
const currentOutfit = ref("default");
const activeSuggestion = ref<SuggestionRecord | null>(null);
type PetAction =
  | "idle"
  | "happy"
  | "cheerful"
  | "thinking"
  | "sitting"
  | "sleepy"
  | "sleeping"
  | "rain"
  | "winter"
  | "summer";

interface PetState {
  image: string;
  label: string;
  bubble: string;
}

function petAsset(filename: string): string {
  return `${import.meta.env.BASE_URL}pet/luna-q/${filename}`;
}

const petStates: Record<PetAction, PetState> = {
  idle: {
    image: petAsset("idle.png"),
    label: "Luna 待机",
    bubble: "我在这里陪你。"
  },
  happy: {
    image: petAsset("waving.png"),
    label: "Luna 开心",
    bubble: "好耶，今天也很棒！"
  },
  cheerful: {
    image: petAsset("waving.png"),
    label: "Luna 雀跃",
    bubble: "收到，我来陪你一起整理。"
  },
  thinking: {
    image: petAsset("sitting.png"),
    label: "Luna 思考",
    bubble: "我想想怎么安排更舒服。"
  },
  sitting: {
    image: petAsset("sitting.png"),
    label: "Luna 坐下",
    bubble: "我坐在桌面边上看着。"
  },
  sleepy: {
    image: petAsset("pajamas.png"),
    label: "Luna 困倦",
    bubble: "有点困了，慢慢来。"
  },
  sleeping: {
    image: petAsset("sleeping.png"),
    label: "Luna 睡觉",
    bubble: "晚安，桌面交给我守着。"
  },
  rain: {
    image: petAsset("raincoat.png"),
    label: "Luna 雨天",
    bubble: "下雨啦，我穿好雨衣了。"
  },
  winter: {
    image: petAsset("winter.png"),
    label: "Luna 冬装",
    bubble: "今天有点冷，围巾准备好了。"
  },
  summer: {
    image: petAsset("summer.png"),
    label: "Luna 夏装",
    bubble: "天气很好，适合轻快一点。"
  }
};

const action = ref<PetAction>("idle");
const dragging = ref(false);
let lastPoint = { x: 0, y: 0 };
let actionTimer = 0;
let bubbleTimer = 0;
let bubbleHideTimer = 0;
let firstBubbleTimer = 0;
let roamTimer = 0;
let roamStepTimer = 0;
let totalDragDistance = 0;
let suppressClickUntil = 0;
let removeSettingsListener: (() => void) | null = null;
let removeSuggestionListener: (() => void) | null = null;
let acceptingSuggestions = false;
const announcedSuggestionIds = new Set<string>();

const actions: PetAction[] = ["idle", "happy", "cheerful", "thinking", "sitting", "sleepy"];
const currentState = computed(() => petStates[action.value]);
const petStageStyle = computed(() => ({
  width: `${Math.round(146 * petScale.value)}px`,
  height: `${Math.round(164 * petScale.value)}px`
}));
let interactionEnabled = false;

watch(currentState, () => {
  spriteFailed.value = false;
});

function setPetInteraction(enabled: boolean): void {
  if (interactionEnabled === enabled) {
    return;
  }
  interactionEnabled = enabled;
  void window.projectD.setPetInteractive(enabled);
}

function syncPetInteraction(event: MouseEvent): void {
  const element = petShell.value;
  if (!element) {
    setPetInteraction(false);
    return;
  }
  const rect = element.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  setPetInteraction(dragging.value || inside);
}

function actionForWeather(weather: CurrentWeather | null): PetAction | null {
  const condition = (weather?.condition || weather?.mode || "").toLowerCase();
  if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunder")) {
    return "rain";
  }
  if (condition.includes("snow")) {
    return "winter";
  }
  if (condition.includes("clear") && weather?.temperatureC !== null && weather?.temperatureC !== undefined && weather.temperatureC >= 26) {
    return "summer";
  }
  if (weather?.temperatureC !== null && weather?.temperatureC !== undefined && weather.temperatureC <= 8) {
    return "winter";
  }
  return null;
}

function actionForClock(): PetAction | null {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) {
    return "sleeping";
  }
  if (hour >= 21 || hour < 8) {
    return "sleepy";
  }
  return null;
}

function chooseAmbientAction(): PetAction {
  if (!autoOutfit.value) {
    const outfitActions: Record<string, PetAction> = {
      raincoat: "rain",
      winter: "winter",
      summer: "summer",
      pajamas: "sleepy"
    };
    return outfitActions[currentOutfit.value] ?? actions[Math.floor(Math.random() * actions.length)] ?? "idle";
  }
  return actionForClock() ?? actions[Math.floor(Math.random() * actions.length)] ?? "idle";
}

function showBubble(message: string, nextAction: PetAction, durationMs = 12_000): void {
  activeSuggestion.value = null;
  bubble.value = message;
  bubbleVisible.value = true;
  action.value = nextAction;
  if (bubbleHideTimer) {
    window.clearTimeout(bubbleHideTimer);
  }
  bubbleHideTimer = window.setTimeout(() => {
    bubbleVisible.value = false;
    activeSuggestion.value = null;
    action.value = actionForClock() ?? "idle";
  }, durationMs);
}

function announceSuggestion(suggestion: SuggestionRecord | null): void {
  if (!acceptingSuggestions || suggestion?.status !== "ready" || announcedSuggestionIds.has(suggestion.id)) {
    return;
  }

  announcedSuggestionIds.add(suggestion.id);
  showBubble(`我发现「${suggestion.title}」：${suggestion.detail}`, "thinking", 20_000);
  activeSuggestion.value = suggestion;
}

function scheduleNextSentence(): void {
  if (bubbleTimer) {
    window.clearTimeout(bubbleTimer);
    bubbleTimer = 0;
  }
  const nextMs = petBubbleDelayMs(talkFrequency.value, false);
  if (nextMs === null) {
    dismissBubble();
    return;
  }
  bubbleTimer = window.setTimeout(() => {
    if (bubbleVisible.value) {
      scheduleNextSentence();
      return;
    }
    showBubble(petSentence(personality.value), Math.random() > 0.45 ? "cheerful" : "happy", 60_000);
    scheduleNextSentence();
  }, nextMs);
}

function scheduleFirstSentence(): void {
  if (firstBubbleTimer) {
    window.clearTimeout(firstBubbleTimer);
    firstBubbleTimer = 0;
  }
  const firstMs = petBubbleDelayMs(talkFrequency.value, true);
  if (firstMs === null) {
    return;
  }
  firstBubbleTimer = window.setTimeout(() => {
    if (bubbleVisible.value) {
      scheduleNextSentence();
      return;
    }
    showBubble(petSentence(personality.value), "cheerful", 60_000);
    scheduleNextSentence();
  }, firstMs);
}

function restartActionTimer(intervalSeconds: number): void {
  if (actionTimer) {
    window.clearInterval(actionTimer);
  }
  actionTimer = window.setInterval(() => {
    if (!bubbleVisible.value) {
      action.value = chooseAmbientAction();
    }
  }, petActionIntervalMs(intervalSeconds));
}

function dismissBubble(): void {
  bubbleVisible.value = false;
  activeSuggestion.value = null;
  if (bubbleHideTimer) {
    window.clearTimeout(bubbleHideTimer);
    bubbleHideTimer = 0;
  }
  action.value = actionForClock() ?? "idle";
}

async function handleBubbleClick(): Promise<void> {
  const suggestion = activeSuggestion.value;
  if (!suggestion) {
    dismissBubble();
    return;
  }

  try {
    await window.projectD.showMain();
  } finally {
    if (activeSuggestion.value?.id === suggestion.id) {
      dismissBubble();
    }
  }
}

async function handlePetContextMenu(): Promise<void> {
  dismissBubble();
  setPetInteraction(true);
  await window.projectD.showPetContextMenu();
}

async function handlePetDoubleClick(): Promise<void> {
  showBubble("主界面打开啦，我继续在桌面上陪你。", "cheerful", 8_000);
  await window.projectD.showMain();
}

function handlePetClick(): void {
  if (dragging.value || bubbleVisible.value || Date.now() < suppressClickUntil) {
    return;
  }
  showBubble(petSentence(personality.value), action.value === "idle" ? "happy" : action.value, 8_000);
}

function applyPetSettings(settings: SettingsSnapshot): void {
  petScale.value = Math.max(0.5, Math.min(1.6, settings.pet.scale));
  personality.value = settings.pet.personality;
  talkFrequency.value = settings.pet.talkFrequency;
  autoOutfit.value = settings.pet.autoOutfit;
  currentOutfit.value = settings.pet.currentOutfit;
}

async function refreshContextState(reschedule = false): Promise<void> {
  try {
    const [settings, weather] = await Promise.all([
      window.projectD.getSettings(),
      window.projectD.getCurrentWeather()
    ]);
    applyPetSettings(settings);
    restartActionTimer(settings.pet.actionInterval);
    const weatherAction = settings.pet.autoOutfit ? actionForWeather(weather) : null;
    if (!activeSuggestion.value) {
      action.value = weatherAction ?? chooseAmbientAction();
      bubble.value = petStates[action.value].bubble;
    }
    if (reschedule) {
      scheduleNextSentence();
    }
  } catch {
    if (!activeSuggestion.value) {
      action.value = actionForClock() ?? "idle";
    }
  }
}

function clearRoamStepTimer(): void {
  if (roamStepTimer) {
    window.clearInterval(roamStepTimer);
    roamStepTimer = 0;
  }
}

function scheduleRoam(delayMs = Math.floor(Math.random() * 30_000) + 25_000): void {
  if (roamTimer) {
    window.clearTimeout(roamTimer);
  }
  roamTimer = window.setTimeout(() => {
    void startRoam();
  }, delayMs);
}

async function startRoam(): Promise<void> {
  if (dragging.value || bubbleVisible.value || action.value === "sleeping") {
    scheduleRoam();
    return;
  }

  clearRoamStepTimer();
  const direction = Math.random() > 0.5 ? 1 : -1;
  const steps = Math.floor(Math.random() * 12) + 16;
  const stepX = direction * (Math.floor(Math.random() * 4) + 3);
  let currentStep = 0;
  action.value = Math.random() > 0.35 ? "cheerful" : "happy";

  roamStepTimer = window.setInterval(() => {
    currentStep += 1;
    const bob = currentStep % 2 === 0 ? -1 : 1;
    void window.projectD.movePetWindow(stepX, bob);
    if (currentStep >= steps) {
      clearRoamStepTimer();
      action.value = actionForClock() ?? "idle";
      scheduleRoam();
    }
  }, 90);
}

onMounted(async () => {
  document.documentElement.classList.add("pet-window-root");
  document.body.classList.add("pet-window-body");
  acceptingSuggestions = true;
  removeSuggestionListener = window.projectD.onSuggestionCreated(announceSuggestion);
  void window.projectD.getLatestSuggestion().then(announceSuggestion).catch(() => undefined);
  await window.projectD.getPetWindowBounds();
  window.addEventListener("mousemove", syncPetInteraction);
  setPetInteraction(false);
  await refreshContextState();
  removeSettingsListener = window.projectD.onSettingsUpdated(() => {
    void refreshContextState(true);
  });

  scheduleFirstSentence();
  scheduleRoam(8_000);
});

onUnmounted(() => {
  acceptingSuggestions = false;
  document.documentElement.classList.remove("pet-window-root");
  document.body.classList.remove("pet-window-body");
  window.removeEventListener("mousemove", syncPetInteraction);
  removeSettingsListener?.();
  removeSettingsListener = null;
  removeSuggestionListener?.();
  removeSuggestionListener = null;
  activeSuggestion.value = null;
  setPetInteraction(false);
  if (actionTimer) {
    window.clearInterval(actionTimer);
  }
  if (bubbleTimer) {
    window.clearTimeout(bubbleTimer);
  }
  if (bubbleHideTimer) {
    window.clearTimeout(bubbleHideTimer);
  }
  if (firstBubbleTimer) {
    window.clearTimeout(firstBubbleTimer);
  }
  if (roamTimer) {
    window.clearTimeout(roamTimer);
  }
  clearRoamStepTimer();
});

function startDrag(event: PointerEvent): void {
  dragging.value = true;
  setPetInteraction(true);
  clearRoamStepTimer();
  totalDragDistance = 0;
  lastPoint = { x: event.screenX, y: event.screenY };
  window.addEventListener("pointermove", drag);
  window.addEventListener("pointerup", stopDrag, { once: true });
}

async function drag(event: PointerEvent): Promise<void> {
  if (!dragging.value) {
    return;
  }
  const deltaX = event.screenX - lastPoint.x;
  const deltaY = event.screenY - lastPoint.y;
  totalDragDistance += Math.abs(deltaX) + Math.abs(deltaY);
  lastPoint = { x: event.screenX, y: event.screenY };
  await window.projectD.movePetWindow(deltaX, deltaY);
}

function stopDrag(): void {
  dragging.value = false;
  if (totalDragDistance > 5) {
    suppressClickUntil = Date.now() + 350;
  }
  window.removeEventListener("pointermove", drag);
  scheduleRoam();
}
</script>

<template>
  <main class="pet-page">
    <button
      ref="petShell"
      class="pet-shell"
      :class="{ dragging }"
      :data-action="action"
      type="button"
      title="Project D · 双击打开主界面"
      @pointerdown="startDrag"
      @click="handlePetClick"
      @dblclick="handlePetDoubleClick"
      @contextmenu.prevent="handlePetContextMenu"
    >
      <span
        v-if="bubbleVisible"
        class="pet-bubble"
        @click.stop="handleBubbleClick"
      >{{ bubble }}</span>
      <span class="pet-stage" :style="petStageStyle">
        <span class="pet-shadow"></span>
        <span class="pet-emote" aria-hidden="true"></span>
        <img
          v-if="!spriteFailed"
          class="pet-sprite"
          :src="currentState.image"
          :alt="currentState.label"
          draggable="false"
          @error="spriteFailed = true"
        />
        <span v-else class="pet-sprite-fallback" aria-label="桌宠资源加载失败">
          <span></span>
        </span>
      </span>
    </button>
  </main>
</template>
