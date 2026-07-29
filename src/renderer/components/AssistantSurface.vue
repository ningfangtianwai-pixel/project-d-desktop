<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import ChatPanel from "./ChatPanel.vue";

const emit = defineEmits<{
  requestInboxPlan: [];
}>();
</script>

<template>
  <section class="assistant-surface" aria-label="AI 助手">
    <header class="assistant-surface-header">
      <div>
        <span class="surface-kicker"><Sparkles :size="14" /> Local assistant</span>
        <h2>和桌面一起思考</h2>
        <p>对话可以理解上下文；涉及整理时，始终先给你预览方案。</p>
      </div>
      <span class="assistant-surface-badge">无 Key 也可用</span>
    </header>
    <ChatPanel @request-inbox-plan="emit('requestInboxPlan')" />
  </section>
</template>
