<script setup lang="ts">
import { computed } from "vue";
import { Sparkles } from "lucide-vue-next";
import { getPetCharacter } from "@shared/pet-characters";
import ChatPanel from "./ChatPanel.vue";

const props = defineProps<{
  wallpaperLabel: string;
  weatherLabel: string;
  city: string;
  performanceMode: string;
  petCharacterId: string;
  petPersonality: string;
  petVisible: boolean;
  providerLabel: string;
  providerConfigured: boolean;
}>();

const emit = defineEmits<{
  requestInboxPlan: [];
}>();

const petCharacter = computed(() => getPetCharacter(props.petCharacterId));
const petPreviewAsset = computed(() => {
  const asset = petCharacter.value.id === "luna-q"
    ? "pet/luna-q/idle.png"
    : `pet/${petCharacter.value.id}/actions/idle.png`;
  return `${import.meta.env.BASE_URL}${asset}`;
});
const petPreviewStyle = computed(() => ({ backgroundImage: `url("${petPreviewAsset.value}")` }));
const assistantProviderLabel = computed(() => props.providerConfigured ? props.providerLabel : "本地降级");
const performanceLabel = computed(() => {
  if (props.performanceMode === "quality") return "高质量";
  if (props.performanceMode === "batterySaver") return "省电";
  return "均衡";
});
</script>

<template>
  <section class="assistant-surface" aria-label="AI 助手">
    <header class="assistant-surface-header">
      <div class="assistant-pet-portrait" :data-visible="petVisible" aria-label="当前桌宠">
        <span v-if="petVisible" class="assistant-pet-art" :style="petPreviewStyle" aria-hidden="true"></span>
        <Sparkles v-else :size="18" aria-hidden="true" />
      </div>
      <div class="assistant-surface-heading">
        <span class="surface-kicker"><Sparkles :size="14" /> Local assistant</span>
        <h2>和桌面一起思考</h2>
        <p>助手会先读取当前场景，再决定是回答、给出方案，还是请求你的确认。</p>
      </div>
      <span class="assistant-surface-badge">无 Key 也可用</span>
    </header>
    <section class="assistant-context-strip" aria-label="当前桌面上下文">
      <div class="assistant-context-chip">
        <small>场景</small>
        <strong>{{ wallpaperLabel }}</strong>
        <span>{{ city }}</span>
      </div>
      <div class="assistant-context-chip">
        <small>天气</small>
        <strong>{{ weatherLabel }}</strong>
        <span>环境层已接入</span>
      </div>
      <div class="assistant-context-chip">
        <small>桌宠</small>
        <strong>{{ petVisible ? petCharacter.name : "已隐藏" }}</strong>
        <span>{{ petVisible ? petPersonality : "没有桌宠窗口" }}</span>
      </div>
      <div class="assistant-context-chip">
        <small>运行状态</small>
        <strong>{{ performanceLabel }}</strong>
        <span>{{ assistantProviderLabel }}</span>
      </div>
    </section>
    <ChatPanel @request-inbox-plan="emit('requestInboxPlan')" />
  </section>
</template>
