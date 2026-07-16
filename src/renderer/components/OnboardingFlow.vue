<script setup lang="ts">
import { computed, ref } from "vue";
import { Bot, Check, ChevronLeft, ChevronRight, CloudSun, FolderKanban, ShieldCheck, Sparkles } from "lucide-vue-next";
import { advanceOnboarding, finishOnboarding, readOnboardingState, writeOnboardingState } from "@shared/onboarding";

const emit = defineEmits<{ completed: []; skipped: [] }>();

const steps = [
  { icon: Sparkles, kicker: "欢迎来到 Project D", title: "让桌面成为工作空间", body: "Project D 直接在 Windows 桌面层工作。你的原壁纸、文件和应用仍留在原处，随时可以安全退出。" },
  { icon: FolderKanban, kicker: "整理之前先预览", title: "每次移动都由你确认", body: "收件箱会先生成完整计划，列出来源、目标与冲突。只有点击确认后才会移动，并保留动作历史和撤销入口。" },
  { icon: CloudSun, kicker: "环境会跟随你", title: "壁纸与天气属于真实桌面", body: "动态壁纸挂载到 Windows 桌面宿主，雾、落叶和光效按性能档位渲染，不需要独立网页常驻前台。" },
  { icon: Bot, kicker: "认识 Luna", title: "她会陪伴，也会克制", body: "Luna 可以聊天、换壁纸并提醒待整理内容。涉及文件的请求始终进入预览，不会自行删除、覆盖或执行脚本。" },
  { icon: ShieldCheck, kicker: "隐私由你决定", title: "目录授权清晰可撤销", body: "Project D 只读取桌面和你在原生选择器中授权的门户。可在隐私中心查看授权、AI 用量和本机诊断范围。" }
] as const;

const state = ref(readOnboardingState(localStorage, steps.length));
const activeStep = computed(() => steps[state.value.currentStep] ?? steps[0]);
const isLast = computed(() => state.value.currentStep === steps.length - 1);

function persist(): void {
  writeOnboardingState(localStorage, state.value);
}

function next(): void {
  state.value = advanceOnboarding(state.value, steps.length);
  persist();
  if (state.value.status === "completed") emit("completed");
}

function previous(): void {
  state.value = { ...state.value, currentStep: Math.max(0, state.value.currentStep - 1), updatedAt: new Date().toISOString() };
  persist();
}

function skip(): void {
  state.value = finishOnboarding(state.value, "skipped");
  persist();
  emit("skipped");
}
</script>

<template>
  <div class="onboarding-backdrop" role="presentation">
    <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <header>
        <div class="onboarding-brand"><span>D</span><strong>Project D</strong></div>
        <button type="button" class="onboarding-skip" @click="skip">稍后再看</button>
      </header>
      <div class="onboarding-visual" aria-hidden="true">
        <component :is="activeStep.icon" :size="38" :stroke-width="1.6" />
        <i v-for="index in 12" :key="index" :style="{ '--index': index }"></i>
      </div>
      <div class="onboarding-copy">
        <p>{{ activeStep.kicker }}</p>
        <h1 id="onboarding-title">{{ activeStep.title }}</h1>
        <div>{{ activeStep.body }}</div>
      </div>
      <footer>
        <div class="onboarding-progress" :aria-label="`第 ${state.currentStep + 1} 步，共 ${steps.length} 步`">
          <span v-for="(_, index) in steps" :key="index" :class="{ active: index === state.currentStep, done: index < state.currentStep }"></span>
        </div>
        <div class="onboarding-actions">
          <button v-if="state.currentStep > 0" type="button" class="onboarding-secondary" @click="previous"><ChevronLeft :size="17" />上一步</button>
          <button type="button" class="onboarding-primary" @click="next">
            <template v-if="isLast"><Check :size="17" />进入桌面</template>
            <template v-else>下一步<ChevronRight :size="17" /></template>
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.onboarding-backdrop { position: fixed; inset: 0; z-index: 5000; display: grid; place-items: center; padding: 24px; background: rgba(5,7,9,.66); backdrop-filter: blur(16px) saturate(.8); }
.onboarding-dialog { display: grid; grid-template-rows: auto 190px auto auto; width: min(620px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; border: 1px solid rgba(255,255,255,.14); border-radius: 8px; color: #f5f2eb; background: #121519; box-shadow: 0 32px 90px rgba(0,0,0,.55); }
.onboarding-dialog header, .onboarding-dialog footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 22px; }
.onboarding-dialog header { border-bottom: 1px solid rgba(255,255,255,.08); }
.onboarding-brand { display: flex; align-items: center; gap: 9px; }
.onboarding-brand span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; color: #0d1114; background: #9fd7ed; font-weight: 850; }
.onboarding-skip, .onboarding-secondary, .onboarding-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; border-radius: 7px; padding: 0 12px; cursor: pointer; }
.onboarding-skip { border: 0; color: rgba(245,242,235,.58); background: transparent; }
.onboarding-skip:hover { color: #f5f2eb; }
.onboarding-visual { position: relative; display: grid; place-items: center; overflow: hidden; color: #b8e8f7; background: radial-gradient(circle at center, rgba(74,151,177,.26), transparent 42%), linear-gradient(145deg, #18242a, #101317 65%); }
.onboarding-visual svg { position: relative; z-index: 2; filter: drop-shadow(0 8px 18px rgba(78,181,216,.36)); }
.onboarding-visual i { position: absolute; left: calc((var(--index) * 8%) - 4%); top: calc(18% + (var(--index) % 4) * 17%); width: 3px; height: 3px; border-radius: 50%; background: rgba(210,242,250,.55); box-shadow: 0 0 12px rgba(159,215,237,.5); }
.onboarding-copy { padding: 26px 34px 20px; text-align: center; }
.onboarding-copy p { margin: 0 0 8px; color: #9fd7ed; font-size: 11px; letter-spacing: 0; }
.onboarding-copy h1 { margin: 0; font-size: 25px; letter-spacing: 0; }
.onboarding-copy div { max-width: 480px; margin: 12px auto 0; color: rgba(245,242,235,.63); font-size: 13px; line-height: 1.75; }
.onboarding-dialog footer { border-top: 1px solid rgba(255,255,255,.08); }
.onboarding-progress { display: flex; align-items: center; gap: 6px; }
.onboarding-progress span { width: 20px; height: 3px; border-radius: 3px; background: rgba(255,255,255,.12); }
.onboarding-progress span.done, .onboarding-progress span.active { background: #7fc5df; }
.onboarding-progress span.active { width: 32px; }
.onboarding-actions { display: flex; gap: 8px; }
.onboarding-secondary { border: 1px solid rgba(255,255,255,.12); color: #f5f2eb; background: rgba(255,255,255,.05); }
.onboarding-primary { min-width: 104px; border: 1px solid #9fd7ed; color: #0b1114; background: #9fd7ed; font-weight: 700; }
@media (max-width: 560px) { .onboarding-backdrop { padding: 10px; } .onboarding-dialog { width: 100%; grid-template-rows: auto 150px auto auto; } .onboarding-copy { padding: 22px 20px 18px; } .onboarding-dialog footer { align-items: flex-end; } }
</style>
