import { createApp, nextTick } from "vue";
import { describe, expect, it } from "vitest";
import SearchSurface from "../../src/renderer/components/SearchSurface.vue";
import type { WorkspaceScene, WorkspaceSearchResult } from "@shared/types";

const result: WorkspaceSearchResult = {
  id: "desktop:42",
  title: "ProjectD.md",
  origin: "desktop",
  category: "document",
  modifiedAt: "2026-07-29T00:00:00.000Z"
};

const scene: WorkspaceScene = {
  id: "scene:night",
  name: "雨夜工作",
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
  layoutId: null,
  wallpaperId: "wallpaper:rain",
  performanceMode: "balanced",
  petVisible: true,
  containerLayout: [],
  pinnedResources: []
};

function mountSearch(props: Record<string, unknown> = {}) {
  const events: Array<{ name: string; args: unknown[] }> = [];
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(SearchSurface, {
    query: "",
    results: [],
    status: "",
    scenes: [],
    pickerResultId: null,
    ...props,
    "onUpdate:query": (value: string) => events.push({ name: "update:query", args: [value] }),
    onSearch: () => events.push({ name: "search", args: [] }),
    onClear: () => events.push({ name: "clear", args: [] }),
    onOpen: (...args: unknown[]) => events.push({ name: "open", args }),
    onReveal: (...args: unknown[]) => events.push({ name: "reveal", args }),
    onCopy: (...args: unknown[]) => events.push({ name: "copy", args }),
    onPortal: (...args: unknown[]) => events.push({ name: "portal", args }),
    onToggleScene: (...args: unknown[]) => events.push({ name: "toggleScene", args }),
    onPinScene: (...args: unknown[]) => events.push({ name: "pinScene", args })
  });
  app.mount(host);
  return { host, events, unmount: () => { app.unmount(); host.remove(); } };
}

describe("SearchSurface", () => {
  it("renders a self-contained search task and supports clear/search actions", async () => {
    const wrapper = mountSearch({ query: "draft" });
    const input = wrapper.host.querySelector<HTMLInputElement>("input[type=search]");
    expect(wrapper.host.querySelector(".search-surface-header h2")?.textContent).toBe("找到你要的东西");
    expect(wrapper.host.querySelector(".workspace-search-clear")).not.toBeNull();

    input?.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    wrapper.host.querySelector<HTMLButtonElement>(".workspace-search-clear")?.click();
    wrapper.host.querySelector<HTMLButtonElement>("form button[type=submit]")?.click();

    expect(wrapper.events.map((event) => event.name)).toEqual(["update:query", "clear", "search"]);
    wrapper.unmount();
  });

  it("exposes result actions and scene selection without hiding the result", async () => {
    const wrapper = mountSearch({ results: [result], status: "找到 1 项", scenes: [scene], pickerResultId: result.id });
    const actionButtons = wrapper.host.querySelectorAll<HTMLButtonElement>(".search-result-actions button");
    expect(wrapper.host.querySelector(".workspace-search-result")).not.toBeNull();
    expect(wrapper.host.querySelector(".search-scene-picker")?.textContent).toContain("雨夜工作");

    actionButtons.forEach((button) => button.click());
    wrapper.host.querySelector<HTMLButtonElement>(".search-scene-picker [role=menuitem]")?.click();
    await nextTick();

    expect(wrapper.events.map((event) => event.name)).toEqual(["reveal", "copy", "portal", "toggleScene", "pinScene"]);
    expect(wrapper.events.at(-1)?.args).toEqual([result, scene]);
    wrapper.unmount();
  });

  it("binds feedback to the matching result", () => {
    const wrapper = mountSearch({
      results: [result],
      status: "copied",
      actionNotice: { resultId: result.id, tone: "success", message: "copied" }
    });
    expect(wrapper.host.querySelector(".search-result-feedback")?.getAttribute("data-tone")).toBe("success");
    expect(wrapper.host.querySelector(".search-result-feedback")?.textContent).toContain("copied");
    wrapper.unmount();
  });
});
