import { createApp, nextTick } from "vue";
import { describe, expect, it } from "vitest";
import AmbientFileSpace from "@/components/AmbientFileSpace.vue";
import type { ContainerWithFiles, DesktopFileRecord } from "@shared/types";

function file(id: number, name: string, category: DesktopFileRecord["category"] = "document"): DesktopFileRecord {
  return {
    id,
    filename: name,
    displayName: null,
    fullPath: `D:\\Desktop\\${name}`,
    extension: category === "folder" ? null : ".txt",
    category,
    sizeBytes: 10,
    modifiedAt: new Date().toISOString(),
    isShortcut: false,
    customCategory: null,
    containerId: 1,
    sortOrder: id,
    isMissing: false
  };
}

function container(files: DesktopFileRecord[]): ContainerWithFiles {
  return {
    id: 1,
    name: "工作区",
    icon: "folder",
    categoryFilter: [],
    positionX: 0,
    positionY: 0,
    width: 300,
    height: 240,
    sortOrder: 1,
    isCollapsed: false,
    isVisible: true,
    layoutGroup: 1,
    accentColor: "sky",
    files
  };
}

describe("AmbientFileSpace", () => {
  const Icon = { template: "<span />" };

  function mountSpace(props: Record<string, unknown>) {
    const events: Array<{ name: string; args: unknown[] }> = [];
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(AmbientFileSpace, {
      ...props,
      fileIcon: () => Icon,
      fileKindLabel: () => "TXT",
      containerVisualStyle: () => ({ "--container-accent": "105 208 255" }),
      onSelectFile: (...args: unknown[]) => events.push({ name: "selectFile", args }),
      onOpenFile: (...args: unknown[]) => events.push({ name: "openFile", args }),
      onShowFileMenu: (...args: unknown[]) => events.push({ name: "showFileMenu", args }),
      onOpenOrganizer: (...args: unknown[]) => events.push({ name: "openOrganizer", args })
    });
    app.mount(host);
    return { host, events, unmount: () => { app.unmount(); host.remove(); } };
  }

  it("shows a restrained native-like file extension and reuses safe actions", async () => {
    const wrapper = mountSpace({ containers: [container([file(1, "报告.docx"), file(2, "素材", "folder")])] });

    expect(wrapper.host.textContent).toContain("最近的文件");
    expect(wrapper.host.textContent).toContain("报告.docx");
    expect(wrapper.host.querySelector(".desktop-folder-art")).not.toBeNull();

    wrapper.host.querySelector<HTMLButtonElement>(".ambient-file-icon")?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await nextTick();
    expect(wrapper.events.find((event) => event.name === "openFile")?.args).toEqual([1]);

    wrapper.host.querySelector<HTMLButtonElement>(".ambient-file-space-header button")?.click();
    expect(wrapper.events.filter((event) => event.name === "openOrganizer")).toHaveLength(1);
    wrapper.unmount();
  });

  it("caps visible groups and files without hiding the organizer path", () => {
    const groups = Array.from({ length: 5 }, (_, groupIndex) => ({
      ...container(Array.from({ length: 8 }, (_, fileIndex) => file(groupIndex * 10 + fileIndex + 1, `file-${fileIndex}.txt`))),
      id: groupIndex + 1,
      name: `分组${groupIndex + 1}`
    }));
    const wrapper = mountSpace({ containers: groups, maxGroups: 4, maxFilesPerGroup: 6 });

    expect(wrapper.host.querySelectorAll(".ambient-file-group")).toHaveLength(4);
    expect(wrapper.host.querySelectorAll(".ambient-file-icon")).toHaveLength(24);
    expect(wrapper.host.textContent).toContain("+2");
    wrapper.unmount();
  });
});
