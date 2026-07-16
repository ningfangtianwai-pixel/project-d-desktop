import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FileCategory, PortalConfig, PortalResource } from "../../shared/types.js";

interface PortalStore {
  savePortalConfig(portal: PortalConfig): void;
  getPortalConfigs(): PortalConfig[];
  getPortalConfig(portalId: string): PortalConfig | null;
  removePortalConfig(portalId: string): void;
}

const MAX_PORTAL_ENTRIES = 200;
const DOCUMENTS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".csv"]);
const IMAGES = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const MEDIA = new Set([".mp4", ".mov", ".mkv", ".mp3", ".wav"]);
const CODE = new Set([".js", ".ts", ".tsx", ".vue", ".py", ".json", ".html", ".css", ".ps1"]);

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

export class PortalService {
  constructor(private readonly store: PortalStore) {}

  list(): PortalConfig[] {
    return this.store.getPortalConfigs();
  }

  async add(folderPath: string, requestedName: string): Promise<PortalConfig> {
    const normalizedPath = path.resolve(folderPath);
    const stat = await fs.stat(normalizedPath);
    if (!stat.isDirectory()) {
      throw new Error("Folder portal path must be a directory");
    }
    const realPath = await fs.realpath(normalizedPath);
    const existing = this.store.getPortalConfigs().find((portal) => portal.path.toLowerCase() === normalizedPath.toLowerCase());
    if (existing) {
      const refreshed = { ...existing, realPath, isEnabled: true, updatedAt: new Date().toISOString() };
      this.store.savePortalConfig(refreshed);
      return refreshed;
    }
    const now = new Date().toISOString();
    const portal: PortalConfig = {
      id: randomUUID(),
      name: (requestedName.trim() || path.basename(normalizedPath)).slice(0, 60),
      path: normalizedPath,
      realPath,
      isEnabled: true,
      createdAt: now,
      updatedAt: now
    };
    this.store.savePortalConfig(portal);
    return portal;
  }

  remove(portalId: string): void {
    this.store.removePortalConfig(portalId);
  }

  async getResources(portalId: string): Promise<PortalResource[]> {
    const portal = this.requirePortal(portalId);
    try {
      const approvedRoot = await this.resolveApprovedRoot(portal);
      const entries = await fs.readdir(approvedRoot, { withFileTypes: true });
      if (entries.length > MAX_PORTAL_ENTRIES) {
        return [this.statusResource(portal, "too-large")];
      }
      const resources: PortalResource[] = [];
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const fullPath = path.join(approvedRoot, entry.name);
        try {
          const stat = await fs.stat(fullPath);
          resources.push({
            portalId,
            name: entry.name,
            relativePath: entry.name,
            fullPath,
            category: this.classify(entry.name, entry.isDirectory()),
            isDirectory: entry.isDirectory(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            status: "ready"
          });
        } catch {
          // A file may disappear between readdir and stat; a later refresh will reconcile it.
        }
      }
      return resources.sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory) || left.name.localeCompare(right.name, "zh-CN"));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      return [this.statusResource(portal, code === "EACCES" || code === "EPERM" ? "permission-denied" : "offline")];
    }
  }

  async resolveResourcePath(portalId: string, relativePath: string): Promise<string> {
    const portal = this.requirePortal(portalId);
    if (!relativePath || relativePath.length > 260 || path.isAbsolute(relativePath)) {
      throw new Error("Invalid portal resource path");
    }
    const approvedRoot = await this.resolveApprovedRoot(portal);
    const fullPath = path.resolve(approvedRoot, relativePath);
    if (!isInside(approvedRoot, fullPath)) {
      throw new Error("Portal resource escapes the approved folder");
    }

    const [realResource, resourceStat] = await Promise.all([
      fs.realpath(fullPath),
      fs.lstat(fullPath)
    ]);
    if (resourceStat.isSymbolicLink() || !isInside(approvedRoot, realResource)) {
      throw new Error("Portal resource escapes the approved folder through a link");
    }
    return realResource;
  }

  private async resolveApprovedRoot(portal: PortalConfig): Promise<string> {
    const currentRealPath = await fs.realpath(portal.path);
    if (!samePath(currentRealPath, portal.realPath)) {
      throw new Error("Folder portal root identity changed; reauthorization is required");
    }
    return currentRealPath;
  }

  private requirePortal(portalId: string): PortalConfig {
    const portal = this.store.getPortalConfig(portalId);
    if (!portal || !portal.isEnabled) {
      throw new Error("Folder portal was not found or is disabled");
    }
    return portal;
  }

  private statusResource(portal: PortalConfig, status: PortalResource["status"]): PortalResource {
    return {
      portalId: portal.id,
      name: status === "too-large" ? "目录条目过多，请缩小门户范围" : status === "permission-denied" ? "没有读取该目录的权限" : "目录暂时不可访问",
      relativePath: "",
      fullPath: portal.path,
      category: "folder",
      isDirectory: true,
      sizeBytes: 0,
      modifiedAt: portal.updatedAt,
      status
    };
  }

  private classify(filename: string, isDirectory: boolean): FileCategory {
    if (isDirectory) return "folder";
    const extension = path.extname(filename).toLowerCase();
    if (DOCUMENTS.has(extension)) return "document";
    if (IMAGES.has(extension)) return "image";
    if (MEDIA.has(extension)) return "media";
    if (CODE.has(extension)) return "code";
    return "other";
  }
}
