import { randomUUID } from "node:crypto";
import type { ContainerRecord, DesktopResourceRef, PortalConfig, SettingsPatch, SettingsSnapshot, SuggestionDeliveryControls, WorkspaceScene } from "../../shared/types.js";
import type { ContainerAccent } from "../../shared/container-accents.js";
import { restoreContainerRect, snapshotDisplays, type RuntimeDisplay } from "./display-layout.js";

interface SceneStore {
  getContainers(): ContainerRecord[];
  getSettings(): SettingsSnapshot;
  getAppState(key: string): string | null;
  saveWorkspaceScene(scene: WorkspaceScene): void;
  getWorkspaceScenes(): WorkspaceScene[];
  getWorkspaceScene(sceneId: string): WorkspaceScene | null;
  getPortalConfigs(): PortalConfig[];
  savePortalConfig(portal: PortalConfig): void;
  updateContainerPosition(id: number, x: number, y: number, width: number, height: number, isCollapsed?: boolean): void;
  updateContainerAccent(id: number, accent: ContainerAccent): void;
  updateSettings(patch: SettingsPatch): SettingsSnapshot;
}

export class SceneService {
  constructor(
    private readonly store: SceneStore,
    private readonly environment: { getDisplays: () => RuntimeDisplay[] } = { getDisplays: () => [] }
  ) {}

  list(): WorkspaceScene[] {
    return this.store.getWorkspaceScenes();
  }

  save(name: string): WorkspaceScene {
    const normalizedName = name.trim().slice(0, 40);
    if (!normalizedName) {
      throw new Error("Scene name is required");
    }
    const settings = this.store.getSettings();
    const now = new Date().toISOString();
    const id = randomUUID();
    const displays = this.environment.getDisplays();
    const primaryDisplay = displays.find((display) => display.isPrimary) ?? displays[0];
    const scene: WorkspaceScene = {
      id,
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
      layoutId: this.numberOrNull(this.store.getAppState("current_layout_id")),
      wallpaperId: settings.wallpaper.dynamicId,
      wallpaperDynamic: settings.wallpaper.isDynamic,
      performanceMode: this.store.getAppState("performance_mode") ?? "auto",
      petVisible: settings.pet.isVisible,
      portalIds: this.store.getPortalConfigs().filter((portal) => portal.isEnabled).map((portal) => portal.id),
      weatherState: {
        particleIntensity: settings.weather.particleIntensity,
        enableBorderInteraction: settings.weather.enableBorderInteraction
      },
      petState: {
        currentOutfit: settings.pet.currentOutfit,
        scale: settings.pet.scale,
        personality: settings.pet.personality,
        autoOutfit: settings.pet.autoOutfit,
        actionInterval: settings.pet.actionInterval,
        talkFrequency: settings.pet.talkFrequency
      },
      suggestionControls: this.parseSuggestionControls(this.store.getAppState("suggestion:delivery-controls")),
      pinnedResources: [],
      displayAssignments: snapshotDisplays(id, displays),
      todoSummary: { total: 0, active: 0 },
      containerLayout: this.store.getContainers().map((container) => ({
        id: container.id,
        positionX: container.positionX,
        positionY: container.positionY,
        width: container.width,
        height: container.height,
        isCollapsed: container.isCollapsed,
        accentColor: container.accentColor,
        ...(primaryDisplay ? {
          displayId: primaryDisplay.displayId,
          scaleFactor: primaryDisplay.scaleFactor,
          workAreaWidth: primaryDisplay.workArea.width,
          workAreaHeight: primaryDisplay.workArea.height
        } : {})
      }))
    };
    this.store.saveWorkspaceScene(scene);
    return scene;
  }

  apply(sceneId: string): WorkspaceScene {
    const scene = this.store.getWorkspaceScene(sceneId);
    if (!scene) {
      throw new Error("Workspace scene was not found");
    }
    const displays = this.environment.getDisplays();
    for (const savedContainer of scene.containerLayout) {
      const container = restoreContainerRect(savedContainer, scene.displayAssignments, displays);
      this.store.updateContainerPosition(
        container.id,
        container.positionX,
        container.positionY,
        container.width,
        container.height,
        container.isCollapsed
      );
      if (savedContainer.accentColor) this.store.updateContainerAccent(container.id, savedContainer.accentColor);
    }
    if (scene.portalIds) {
      const enabledIds = new Set(scene.portalIds);
      const now = new Date().toISOString();
      for (const portal of this.store.getPortalConfigs()) {
        const isEnabled = enabledIds.has(portal.id);
        if (portal.isEnabled !== isEnabled) this.store.savePortalConfig({ ...portal, isEnabled, updatedAt: now });
      }
    }
    this.store.updateSettings({
      wallpaper: {
        dynamicId: scene.wallpaperId,
        isDynamic: scene.wallpaperDynamic ?? Boolean(scene.wallpaperId)
      },
      weather: scene.weatherState,
      pet: { isVisible: scene.petVisible, ...scene.petState },
      appState: {
        performance_mode: scene.performanceMode,
        ...(scene.suggestionControls ? { "suggestion:delivery-controls": JSON.stringify(scene.suggestionControls) } : {}),
        ...(scene.layoutId ? { current_layout_id: String(scene.layoutId) } : {})
      }
    });
    return scene;
  }

  pinResource(sceneId: string, resource: DesktopResourceRef): WorkspaceScene {
    const scene = this.store.getWorkspaceScene(sceneId);
    if (!scene) throw new Error("Workspace scene was not found");
    const normalizedPath = resource.path.trim();
    if (!normalizedPath || normalizedPath.includes("\0")) throw new Error("Invalid scene resource");
    const existing = scene.pinnedResources ?? [];
    const identity = `${resource.origin}:${resource.portalId ?? ""}:${resource.fileId ?? ""}:${normalizedPath.toLocaleLowerCase()}`;
    const next = existing.filter((item) => (
      `${item.origin}:${item.portalId ?? ""}:${item.fileId ?? ""}:${item.path.toLocaleLowerCase()}` !== identity
    ));
    next.push({ ...resource, path: normalizedPath, label: resource.label.trim().slice(0, 160) || normalizedPath });
    const updated = { ...scene, pinnedResources: next.slice(-100), updatedAt: new Date().toISOString() };
    this.store.saveWorkspaceScene(updated);
    return updated;
  }

  private numberOrNull(value: string | null): number | null {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  private parseSuggestionControls(value: string | null): SuggestionDeliveryControls | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as SuggestionDeliveryControls;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
}
