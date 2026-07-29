<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { Bot, CheckCircle2, LoaderCircle, SendHorizontal, TriangleAlert } from "lucide-vue-next";
import type { ChatMessage, CurrentWeather, LunaIntentPreview } from "@shared/types";

const emit = defineEmits<{
  requestInboxPlan: [];
}>();

const messages = ref<ChatMessage[]>([]);
const weather = ref<CurrentWeather | null>(null);
const input = ref("");
const inputElement = ref<HTMLInputElement | null>(null);
const historyElement = ref<HTMLElement | null>(null);
const sending = ref(false);
const sendStatus = ref("");
type ChatStatusTone = "neutral" | "success" | "error";
const statusTone = ref<ChatStatusTone>("success");
const intentPreview = ref<LunaIntentPreview | null>(null);

function setStatus(message: string, tone: ChatStatusTone): void {
  sendStatus.value = message;
  statusTone.value = tone;
}

function scrollToLatest(): void {
  if (historyElement.value) historyElement.value.scrollTop = historyElement.value.scrollHeight;
}

onMounted(async () => {
  messages.value = await window.projectD.getChatHistory();
  weather.value = await window.projectD.getCurrentWeather();
  await nextTick();
  scrollToLatest();
});

async function send(): Promise<void> {
  const content = input.value.trim();
  if (content.length === 0 || sending.value) {
    return;
  }

  sending.value = true;
  setStatus("正在理解你的桌面请求……", "neutral");

  try {
    const response = await window.projectD.sendChatMessage(content);
    intentPreview.value = response.intentPreview ?? null;
    messages.value = await window.projectD.getChatHistory();
    weather.value = await window.projectD.getCurrentWeather();
    input.value = "";
    if (response.fallbackReason === "provider-timeout") {
      setStatus("云端响应超时 · 已切换本地降级", "error");
    } else if (response.fallbackReason === "provider-error") {
      setStatus("云端服务不可用 · 已切换本地降级", "error");
    } else {
      setStatus(response.fallback ? "已发送 · 当前使用本地降级" : `已发送 · ${response.provider}`, "success");
    }
  } catch (caught) {
    setStatus(`发送失败：${caught instanceof Error ? caught.message : String(caught)}`, "error");
  } finally {
    sending.value = false;
    await nextTick();
    scrollToLatest();
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

    <div ref="historyElement" class="chat-history">
      <p v-if="messages.length === 0" class="chat-empty">还没有对话</p>
      <article v-for="message in messages" :key="message.id" :data-role="message.role">
        {{ message.content }}
      </article>
    </div>

    <section v-if="intentPreview" class="chat-intent-preview" aria-live="polite">
      <span><strong>{{ intentPreview.title }}</strong><small>{{ intentPreview.detail }}</small></span>
      <button type="button" @click="requestInboxPlan">生成方案</button>
    </section>

    <form class="chat-input" :aria-busy="sending" @submit.prevent="send">
      <input ref="inputElement" v-model="input" maxlength="500" type="text" placeholder="问 Project D 一句" @input="sendStatus = ''" />
      <button type="submit" :disabled="sending || input.trim().length === 0" title="发送">
        <SendHorizontal :size="18" />
      </button>
    </form>
    <p v-if="sendStatus" class="chat-status" :data-tone="statusTone" role="status" aria-live="polite">
      <LoaderCircle v-if="statusTone === 'neutral'" :size="14" class="chat-status-spin" />
      <CheckCircle2 v-else-if="statusTone === 'success'" :size="14" />
      <TriangleAlert v-else :size="14" />
      <span>{{ sendStatus }}</span>
    </p>
  </section>
</template>
