<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { DesktopTaskSurface } from "@shared/desktop-experience";

const props = defineProps<{
  active: DesktopTaskSurface;
  label: string;
  experienceMode: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const SURFACE_ORDER: Record<Exclude<DesktopTaskSurface, null>, number> = {
  search: 1,
  organize: 2,
  scene: 3,
  assistant: 4,
};

const surfaceStack = ref<Exclude<DesktopTaskSurface, null>[]>([]);

/** Mutex: record last-active surface; never allow two surfaces */
watch(
  () => props.active,
  (next) => {
    if (next) {
      surfaceStack.value = surfaceStack.value.filter((s) => s !== next);
      surfaceStack.value.push(next);
    } else {
      surfaceStack.value = [];
    }
  },
  { immediate: true },
);

const transitionName = computed(() => {
  if (surfaceStack.value.length < 2) return "surface-fade";
  const prev = surfaceStack.value[surfaceStack.value.length - 2];
  const curr = surfaceStack.value[surfaceStack.value.length - 1];
  const prevOrder = SURFACE_ORDER[prev] ?? 0;
  const currOrder = SURFACE_ORDER[curr] ?? 0;
  return currOrder > prevOrder ? "surface-slide-left" : "surface-slide-right";
});
</script>

<template>
  <Transition :name="transitionName" mode="out-in">
    <div
      v-if="active"
      :key="active"
      class="task-surface-panel"
      :data-surface="active"
    >
      <div class="task-surface-heading">
        <div>
          <span>当前任务面</span>
          <strong>{{ label }}</strong>
        </div>
        <button
          type="button"
          class="task-surface-close"
          title="关闭任务面"
          aria-label="关闭任务面"
          @click="emit('close')"
        >
          &times;
        </button>
      </div>
      <div class="task-surface-body">
        <slot :name="active" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.task-surface-panel {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  overflow: hidden;
}

.task-surface-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
  flex-shrink: 0;
}

.task-surface-heading strong {
  display: block;
  font-size: 13px;
  color: var(--c-text-primary, #e0e0e0);
}

.task-surface-heading span {
  font-size: 10px;
  color: var(--c-text-tertiary, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-surface-close {
  background: none;
  border: none;
  color: var(--c-text-secondary, #999);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  border-radius: 4px;
}

.task-surface-close:hover {
  color: var(--c-text-primary, #e0e0e0);
  background: rgb(255 255 255 / 6%);
}

.task-surface-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ----- transitions ----- */
.surface-fade-enter-active,
.surface-fade-leave-active {
  transition: opacity 220ms ease;
}

.surface-fade-enter-from,
.surface-fade-leave-to {
  opacity: 0;
}

.surface-slide-left-enter-active,
.surface-slide-left-leave-active {
  transition: all 240ms ease;
}

.surface-slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.surface-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.surface-slide-right-enter-active,
.surface-slide-right-leave-active {
  transition: all 240ms ease;
}

.surface-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.surface-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
