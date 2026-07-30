<script setup lang="ts">
import { AlertTriangle, RefreshCcw } from "lucide-vue-next";
import type { DesktopExperienceMode } from "@shared/desktop-experience";

const props = defineProps<{
  mode: DesktopExperienceMode;
  errorMessage: string;
  recovered: boolean;
}>();

const emit = defineEmits<{
  restore: [];
}>();
</script>

<template>
  <section class="recovery-surface" role="alert" aria-live="assertive">
    <div class="recovery-surface-icon">
      <AlertTriangle :size="24" />
    </div>
    <div class="recovery-surface-content">
      <h2>{{ recovered ? '已恢复' : '桌面需要恢复' }}</h2>
      <p v-if="!recovered">{{ errorMessage || '检测到异常状态，点击下方按钮恢复桌面。' }}</p>
      <p v-else>桌面已恢复到正常状态。</p>
    </div>
    <button
      v-if="!recovered"
      type="button"
      class="recovery-surface-action"
      @click="emit('restore')"
    >
      <RefreshCcw :size="16" /> 安全归位
    </button>
  </section>
</template>

<style scoped>
.recovery-surface {
  position: fixed;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  background: rgba(10, 12, 16, 0.92);
  backdrop-filter: blur(8px);
}

.recovery-surface-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(240, 135, 120, 0.15);
  color: #f08778;
}

.recovery-surface-content {
  text-align: center;
  max-width: 400px;
}

.recovery-surface-content h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #f6f3ec;
}

.recovery-surface-content p {
  margin: 0;
  color: rgba(246, 243, 236, 0.65);
  font-size: 14px;
  line-height: 1.5;
}

.recovery-surface-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid rgba(112, 216, 174, 0.4);
  border-radius: 10px;
  padding: 0 20px;
  color: #70d8ae;
  background: rgba(112, 216, 174, 0.1);
  font-size: 14px;
  font-weight: 500;
}

.recovery-surface-action:hover {
  background: rgba(112, 216, 174, 0.2);
}
</style>
