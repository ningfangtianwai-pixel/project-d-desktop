<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { Bot, SendHorizontal } from "lucide-vue-next";
import type { ChatMessage, CurrentWeather, LunaIntentPreview } from "@shared/types";

const emit = defineEmits<{
  requestInboxPlan: [];
}>();

const messages = ref<ChatMessage[]>([]);
const weather = ref<CurrentWeather | null>(null);
const input = ref("");
const inputElement = ref<HTMLInputElement | null>(null);
const sending = ref(false);
const error = ref("");
const sendStatus = ref("");
const intentPreview = ref<LunaIntentPreview | null>(null);

onMounted(async () => {
  messages.value = await window.projectD.getChatHistory();
  weather.value = await window.projectD.getCurrentWeather();
});

async function send(): Promise<void> {
  const content = input.value.trim();
  if (content.length === 0 || sending.value) {
    return;
  }

  sending.value = true;
  error.value = "";
  sendStatus.value = "";

  try {
    const response = await window.projectD.sendChatMessage(content);
    intentPreview.value = response.intentPreview ?? null;
    messages.value = await window.projectD.getChatHistory();
    weather.value = await window.projectD.getCurrentWeather();
    input.value = "";
    sendStatus.value = "已发送，可以继续输入";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    sending.value = false;
    await nextTick();
    inputElement.value?.focus();
  }
}

function requestInboxPlan(): void {
  emit("requestInboxPlan");
  intentPreview.value = null;
}
</script>

<template>
  <section class="chat-panel">
    <header>
      <div>
        <Bot :size="20" />
        <strong>AI 对话</strong>
      </div>
      <span>{{ weather?.condition ?? "clear" }}</span>
    </header>

    <div class="chat-history">
      <p v-if="messages.length === 0" class="chat-empty">还没有对话</p>
      <article v-for="message in messages.slice(-6)" :key="message.id" :data-role="message.role">
        {{ message.content }}
      </article>
    </div>

    <section v-if="intentPreview" class="chat-intent-preview" aria-live="polite">
      <span><strong>{{ intentPreview.title }}</strong><small>{{ intentPreview.detail }}</small></span>
      <button type="button" @click="requestInboxPlan">生成方案</button>
    </section>

    <form class="chat-input" @submit.prevent="send">
      <input ref="inputElement" v-model="input" maxlength="500" type="text" placeholder="问 Project D 一句" @input="sendStatus = ''" />
      <button type="submit" :disabled="sending || input.trim().length === 0" title="发送">
        <SendHorizontal :size="18" />
      </button>
    </form>
    <p v-if="error" class="chat-error">{{ error }}</p>
    <p v-else-if="sendStatus" class="chat-status" role="status" aria-live="polite">{{ sendStatus }}</p>
  </section>
</template>
