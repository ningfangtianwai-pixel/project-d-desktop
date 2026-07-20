import { beforeEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";
import OnboardingFlow from "../../src/renderer/components/OnboardingFlow.vue";
import { ONBOARDING_STORAGE_KEY } from "../../src/shared/onboarding";

function mountOnboarding(listeners: { onCompleted?: () => void; onSkipped?: () => void } = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(OnboardingFlow, listeners);
  app.mount(host);
  return {
    host,
    unmount: () => {
      app.unmount();
      host.remove();
    }
  };
}

async function click(host: HTMLElement, selector: string): Promise<void> {
  const element = host.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing test element: ${selector}`);
  element.click();
  await nextTick();
}

describe("OnboardingFlow", () => {
  beforeEach(() => localStorage.clear());

  it("persists progress and emits completion after the last step", async () => {
    let completed = 0;
    const wrapper = mountOnboarding({ onCompleted: () => { completed += 1; } });

    expect(wrapper.host.querySelector("#onboarding-title")?.textContent).toBe("让桌面成为工作空间");
    for (let index = 0; index < 5; index += 1) await click(wrapper.host, ".onboarding-primary");

    expect(completed).toBe(1);
    expect(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}").status).toBe("completed");
    wrapper.unmount();
  });

  it("records an explicit skip", async () => {
    let skipped = 0;
    const wrapper = mountOnboarding({ onSkipped: () => { skipped += 1; } });
    await click(wrapper.host, ".onboarding-skip");

    expect(skipped).toBe(1);
    expect(JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? "{}").status).toBe("skipped");
    wrapper.unmount();
  });
});
