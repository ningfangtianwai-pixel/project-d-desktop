<script setup lang="ts">
import { computed } from "vue";
import type { WallpaperSafeRegion, SafeRegion, PetAnchor } from "@shared/types";
import { wallpaperSafeRegion } from "@shared/wallpaper-library";

const props = defineProps<{
  wallpaperId: string | null;
  displayBounds: { x: number; y: number; width: number; height: number };
  /** Multi-display virtual union, for per-screen anchoring */
  displays?: { id: string; x: number; y: number; width: number; height: number }[];
  /** Custom anchors from AmbientScene.pet.anchorLanes */
  customAnchors?: PetAnchor[];
}>();

const safeRegion = computed<WallpaperSafeRegion>(() => wallpaperSafeRegion(props.wallpaperId));
const anchorSide = computed(() => safeRegion.value.petAnchor);

/** Compute default anchors per role when no custom anchors are provided */
const activeAnchors = computed<PetAnchor[]>(() => {
  if (props.customAnchors && props.customAnchors.length > 0) {
    return props.customAnchors;
  }

  const { x, y, width, height } = props.displayBounds;
  if (width <= 0 || height <= 0) return [];

  const side = anchorSide.value;
  const baseX = side === "right" ? x + width * safeRegion.value.right - 80 : x + width * safeRegion.value.left + 20;
  const bottomY = y + height * safeRegion.value.bottom;

  return [
    { lane: side, role: "idle", x: baseX, y: bottomY - 120 },       // idle: above bottom
    { lane: side, role: "work", x: baseX, y: bottomY - 180 },       // work: higher up (desk-level)
    { lane: side, role: "rest", x: baseX + 40, y: bottomY - 80 },   // rest: near bottom, slightly offset
    { lane: "center", role: "roam", x: x + width / 2, y: bottomY - 100 }, // roam: center area
  ];
});

/** Subject safe regions from wallpaper for visual avoidance hints */
const avoidanceZones = computed<SafeRegion[]>(() => {
  // For now, derive from wallpaper safe region
  const { x, y, width, height } = props.displayBounds;
  if (width <= 0 || height <= 0) return [];
  const sr = safeRegion.value;
  return [
    { x: x + width * sr.left, y: y + height * sr.top, width: width * (sr.right - sr.left), height: height * (sr.bottom - sr.top), label: "safe-area" }
  ];
});
</script>

<template>
  <div class="pet-anchor-layer" :data-anchor-side="anchorSide" aria-hidden="true">
    <div
      v-for="(anchor, index) in activeAnchors"
      :key="`anchor-${anchor.role}-${index}`"
      class="pet-anchor-dot"
      :class="`pet-anchor--${anchor.role}`"
      :style="{
        left: `${anchor.x}px`,
        top: `${anchor.y}px`,
      }"
      :title="`桌宠锚点: ${anchor.role} (${anchor.lane})`"
    />
    <!-- Avoidance zone indicators (dev only) -->
    <div
      v-for="(zone, zi) in avoidanceZones"
      :key="`zone-${zi}`"
      class="pet-avoidance-zone"
      :style="{
        left: `${zone.x}px`,
        top: `${zone.y}px`,
        width: `${zone.width}px`,
        height: `${zone.height}px`,
      }"
    />
  </div>
</template>

<style scoped>
.pet-anchor-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.pet-anchor-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 300ms ease;
}

/* Only visible in dev/QA mode */
.pet-anchor-layer:hover .pet-anchor-dot,
:global(.pet-anchor-visible) .pet-anchor-dot {
  opacity: 0.35;
}

.pet-anchor--idle {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.pet-anchor--work {
  background: #3b82f6;
  box-shadow: 0 0 6px #3b82f6;
}

.pet-anchor--rest {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

.pet-anchor--roam {
  background: #8b5cf6;
  box-shadow: 0 0 6px #8b5cf6;
}

.pet-avoidance-zone {
  position: absolute;
  border: 1px dashed rgb(255 255 255 / 6%);
  background: rgb(255 0 0 / 3%);
  opacity: 0;
  transition: opacity 300ms ease;
}

.pet-anchor-layer:hover .pet-avoidance-zone {
  opacity: 0.25;
}
</style>
