<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Bot, SendHorizontal } from "lucide-vue-next";
import type { ChatMessage, CurrentWeather } from "@shared/types";

const messages = ref<ChatMessage[]>([]);
const weather = ref<CurrentWeather | null>(null);
const input = ref("");
const sending = ref(false);
const error = ref("");

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
  input.value = "";

  try {
    await window.projectD.sendChatMessage(content);
    messages.value = await window.projectD.getChatHistory();
    weather.value = await window.projectD.getCurrentWeather();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : String(caught);
  } finally {
    sending.value = false;
  }
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

    <form class="chat-input" @submit.prevent="send">
      <input v-model="input" maxlength="500" type="text" placeholder="问 Project D 一句" />
      <button type="submit" :disabled="sending || input.trim().length === 0" title="发送">
        <SendHorizontal :size="18" />
      </button>
    </form>
    <p v-if="error" class="chat-error">{{ error }}</p>
  </section>
</template>
