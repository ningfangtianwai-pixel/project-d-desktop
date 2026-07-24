import { nativeImage } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";
import type { WallpaperLibraryItem } from "../shared/types.js";
import { WALLPAPER_LIBRARY } from "../shared/wallpaper-library.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".avif"]);
const MAX_IMPORT_BYTES = 30 * 1024 * 1024;

export class WallpaperLibraryService {
  private readonly rootDirectory: string;
  private readonly originalsDirectory: string;
  private readonly thumbnailsDirectory: string;

  constructor(
    userDataDirectory: string,
    private readonly database: DatabaseService,
    private readonly logger: Pick<AppLogger, "info" | "warn">
  ) {
    this.rootDirectory = path.join(userDataDirectory, "wallpapers");
    this.originalsDirectory = path.join(this.rootDirectory, "originals");
    this.thumbnailsDirectory = path.join(this.rootDirectory, "thumbnails");
  }

  async initialize(): Promise<void> {
    await Promise.all([
      fs.promises.mkdir(this.originalsDirectory, { recursive: true }),
      fs.promises.mkdir(this.thumbnailsDirectory, { recursive: true })
    ]);
  }

  list(): WallpaperLibraryItem[] {
    return [...WALLPAPER_LIBRARY, ...this.database.getUserMediaAssets()];
  }

  async importImage(sourcePath: string): Promise<WallpaperLibraryItem> {
    const resolvedSource = path.resolve(sourcePath);
    const extension = path.extname(resolvedSource).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) throw new Error("Unsupported wallpaper image type");

    const stat = await fs.promises.stat(resolvedSource);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_IMPORT_BYTES) {
      throw new Error("Wallpaper image must be a file no larger than 30 MB");
    }

    const image = nativeImage.createFromPath(resolvedSource);
    if (image.isEmpty()) throw new Error("The selected image could not be decoded");

    const id = `user-${randomUUID()}`;
    const storedFile = `${id}${extension}`;
    const storedPath = path.join(this.originalsDirectory, storedFile);
    const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
    const item: WallpaperLibraryItem = {
      id,
      label: path.basename(resolvedSource, extension).slice(0, 80) || "My wallpaper",
      style: "minimalist",
      type: "image",
      file: storedFile,
      aliases: ["user", "local", path.basename(resolvedSource, extension).slice(0, 80)],
      source: "user"
    };

    try {
      await this.copyAtomically(resolvedSource, storedPath);
      const thumbnail = image.resize({ width: 480, quality: "good" }).toPNG();
      await this.writeAtomically(thumbnailPath, thumbnail);
      this.database.saveUserMediaAsset(item, storedPath);
      this.logger.info("app", "user wallpaper imported", { id, bytes: stat.size });
      return item;
    } catch (error) {
      await Promise.allSettled([
        fs.promises.rm(storedPath, { force: true }),
        fs.promises.rm(thumbnailPath, { force: true })
      ]);
      throw error;
    }
  }

  delete(id: string): void {
    const originalPath = this.database.getUserMediaAssetPath(id);
    if (!originalPath) throw new Error("Wallpaper is not a user library asset");
    const safeOriginalPath = this.ensureManagedPath(originalPath, this.originalsDirectory);
    const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
    this.database.deleteUserMediaAsset(id);
    void Promise.allSettled([
      fs.promises.rm(safeOriginalPath, { force: true }),
      fs.promises.rm(thumbnailPath, { force: true })
    ]).then((results) => {
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) this.logger.warn("app", "user wallpaper files could not be removed", { id, failed: failed.length });
    });
  }

  resolveAssetPath(id: string, variant: "original" | "thumbnail"): string | null {
    const originalPath = this.database.getUserMediaAssetPath(id);
    if (!originalPath) return null;
    if (variant === "thumbnail") {
      const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
      return fs.existsSync(thumbnailPath) ? thumbnailPath : this.ensureManagedPath(originalPath, this.originalsDirectory);
    }
    return this.ensureManagedPath(originalPath, this.originalsDirectory);
  }

  private ensureManagedPath(candidate: string, parent: string): string {
    const resolved = path.resolve(candidate);
    const root = path.resolve(parent) + path.sep;
    if (!resolved.startsWith(root)) throw new Error("Wallpaper asset path is outside managed storage");
    return resolved;
  }

  private async copyAtomically(sourcePath: string, destinationPath: string): Promise<void> {
    const temporaryPath = `${destinationPath}.${randomUUID()}.tmp`;
    try {
      await fs.promises.copyFile(sourcePath, temporaryPath);
      await fs.promises.rename(temporaryPath, destinationPath);
    } finally {
      await fs.promises.rm(temporaryPath, { force: true });
    }
  }

  private async writeAtomically(destinationPath: string, data: Buffer): Promise<void> {
    const temporaryPath = `${destinationPath}.${randomUUID()}.tmp`;
    try {
      await fs.promises.writeFile(temporaryPath, data);
      await fs.promises.rename(temporaryPath, destinationPath);
    } finally {
      await fs.promises.rm(temporaryPath, { force: true });
    }
  }
}
