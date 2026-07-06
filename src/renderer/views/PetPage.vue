<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { getRandomSentence } from "@shared/warm-sentences";

const bubble = ref("我在桌面上。");
const bubbleVisible = ref(false);
const action = ref<"idle" | "happy" | "thinking" | "sleepy">("idle");
const dragging = ref(false);
const characterImage = ref("");
let lastPoint = { x: 0, y: 0 };
let actionTimer = 0;
let bubbleTimer = 0;
let bubbleHideTimer = 0;

const actions: Array<typeof action.value> = ["idle", "happy", "thinking", "sleepy"];

function scheduleNextSentence(): void {
  const nextMs = Math.floor(Math.random() * (15 - 3) + 3) * 60 * 1000;
  if (bubbleTimer) {
    window.clearTimeout(bubbleTimer);
  }
  bubbleTimer = window.setTimeout(() => {
    if (bubbleVisible.value) {
      scheduleNextSentence();
      return;
    }
    bubble.value = getRandomSentence();
    bubbleVisible.value = true;
    action.value = "happy";
    if (bubbleHideTimer) {
      window.clearTimeout(bubbleHideTimer);
    }
    bubbleHideTimer = window.setTimeout(() => {
      bubbleVisible.value = false;
      action.value = "idle";
    }, 60_000);
    scheduleNextSentence();
  }, nextMs);
}

function dismissBubble(): void {
  bubbleVisible.value = false;
  if (bubbleHideTimer) {
    window.clearTimeout(bubbleHideTimer);
    bubbleHideTimer = 0;
  }
  action.value = "idle";
}

async function handleBubbleClick(): Promise<void> {
  dismissBubble();
}

async function handlePetDoubleClick(): Promise<void> {
  await window.projectD.showMain();
}

onMounted(async () => {
  document.body.classList.add("pet-window-body");
  await window.projectD.getPetWindowBounds();

  // 设置角色图像路径
  characterImage.value = "/pet/portrait.png";

  const settings = await window.projectD.getSettings();
  const interval = Math.max(15, Math.min(3600, settings.pet.actionInterval)) * 1000;
  actionTimer = window.setInterval(() => {
    if (!bubbleVisible.value) {
      action.value = actions[Math.floor(Math.random() * actions.length)] ?? "idle";
    }
  }, Math.min(interval, 30_000));

  // 首次对话在 30-90 秒后
  const firstMs = Math.floor(Math.random() * 60 + 30) * 1000;
  setTimeout(() => {
    bubble.value = getRandomSentence();
    bubbleVisible.value = true;
    action.value = "happy";
    setTimeout(() => {
      bubbleVisible.value = false;
      action.value = "idle";
    }, 60_000);
    scheduleNextSentence();
  }, firstMs);
});

onUnmounted(() => {
  if (actionTimer) {
    window.clearInterval(actionTimer);
  }
  if (bubbleTimer) {
    window.clearTimeout(bubbleTimer);
  }
  if (bubbleHideTimer) {
    window.clearTimeout(bubbleHideTimer);
  }
});

function startDrag(event: PointerEvent): void {
  dragging.value = true;
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
  lastPoint = { x: event.screenX, y: event.screenY };
  await window.projectD.movePetWindow(deltaX, deltaY);
}

function stopDrag(): void {
  dragging.value = false;
  window.removeEventListener("pointermove", drag);
}
</script>

<template>
  <main class="pet-page">
    <button
      class="pet-shell"
      :class="{ dragging }"
      :data-action="action"
      type="button"
      title="Project D · 双击打开主界面"
      @pointerdown="startDrag"
      @dblclick="handlePetDoubleClick"
      @contextmenu.prevent="handleBubbleClick"
    >
      <span
        v-if="bubbleVisible"
        class="pet-bubble"
        @click.stop="handleBubbleClick"
      >{{ bubble }}</span>
      <span class="pet-body" :style="characterImage ? { backgroundImage: `url(${characterImage})` } : {}">
        <span v-if="!characterImage" class="pet-face">D</span>
      </span>
    </button>
  </main>
</template>
