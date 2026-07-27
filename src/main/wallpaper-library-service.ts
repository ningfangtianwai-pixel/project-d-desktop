import { nativeImage } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";
import type { WallpaperLibraryItem } from "../shared/types.js";
import { WALLPAPER_LIBRARY, wallpaperSafeRegion } from "../shared/wallpaper-library.js";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
const MAX_IMPORT_BYTES = 30 * 1024 * 1024;
const MAX_VIDEO_IMPORT_BYTES = 300 * 1024 * 1024;

export class WallpaperLibraryService {
  private readonly rootDirectory: string;
  private readonly originalsDirectory: string;
  private readonly thumbnailsDirectory: string;
  private readonly coversDirectory: string;

  constructor(
    userDataDirectory: string,
    private readonly database: DatabaseService,
    private readonly logger: Pick<AppLogger, "info" | "warn">
  ) {
    this.rootDirectory = path.join(userDataDirectory, "wallpapers");
    this.originalsDirectory = path.join(this.rootDirectory, "originals");
    this.thumbnailsDirectory = path.join(this.rootDirectory, "thumbnails");
    this.coversDirectory = path.join(this.rootDirectory, "covers");
  }

  async initialize(): Promise<void> {
    await Promise.all([
      fs.promises.mkdir(this.originalsDirectory, { recursive: true }),
      fs.promises.mkdir(this.thumbnailsDirectory, { recursive: true }),
      fs.promises.mkdir(this.coversDirectory, { recursive: true })
    ]);
  }

  list(): WallpaperLibraryItem[] {
    const bundled = WALLPAPER_LIBRARY.map((item) => ({ ...item, safeRegion: wallpaperSafeRegion(item.id) }));
    return [...bundled, ...this.database.getUserMediaAssets()];
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
      source: "user",
      safeRegion: wallpaperSafeRegion(null)
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

  async importGeneratedPng(dataUrl: string, requestedLabel: string): Promise<WallpaperLibraryItem> {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match) throw new Error("Generated wallpaper must be a PNG data URL");
    const data = Buffer.from(match[1].replace(/\s/g, ""), "base64");
    if (data.length === 0 || data.length > MAX_IMPORT_BYTES) {
      throw new Error("Generated wallpaper must be no larger than 30 MB");
    }
    const image = nativeImage.createFromBuffer(data);
    if (image.isEmpty()) throw new Error("The generated wallpaper could not be decoded");

    const id = `user-${randomUUID()}`;
    const storedFile = `${id}.png`;
    const storedPath = path.join(this.originalsDirectory, storedFile);
    const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
    const label = requestedLabel.trim().replace(/\s+/g, " ").slice(0, 80) || "My creation";
    const item: WallpaperLibraryItem = {
      id,
      label,
      style: "minimalist",
      type: "image",
      file: storedFile,
      aliases: ["user", "created", "创作", label],
      source: "user",
      safeRegion: wallpaperSafeRegion(null)
    };

    try {
      await this.writeAtomically(storedPath, data);
      await this.writeAtomically(thumbnailPath, image.resize({ width: 480, quality: "good" }).toPNG());
      this.database.saveUserMediaAsset(item, storedPath);
      this.logger.info("app", "generated wallpaper imported", { id, bytes: data.length });
      return item;
    } catch (error) {
      await Promise.allSettled([fs.promises.rm(storedPath, { force: true }), fs.promises.rm(thumbnailPath, { force: true })]);
      throw error;
    }
  }

  async importLivePhoto(coverPath: string, videoPath: string): Promise<WallpaperLibraryItem> {
    const resolvedCover = path.resolve(coverPath);
    const resolvedVideo = path.resolve(videoPath);
    const inspection = await this.inspectLivePhoto(resolvedCover, resolvedVideo);
    const { coverExtension, videoExtension, coverStat, videoStat, coverImage, coverSize } = inspection;

    const id = `user-${randomUUID()}`;
    const storedVideoFile = `${id}${videoExtension}`;
    const coverFile = `${id}.png`;
    const storedVideoPath = path.join(this.originalsDirectory, storedVideoFile);
    const coverPathInLibrary = path.join(this.coversDirectory, coverFile);
    const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
    const item: WallpaperLibraryItem = {
      id,
      label: path.basename(resolvedCover, coverExtension).slice(0, 80) || "My Live Photo",
      style: "minimalist",
      type: "video",
      file: storedVideoFile,
      posterFile: coverFile,
      livePhoto: true,
      livePhotoMeta: {
        coverWidth: coverSize.width,
        coverHeight: coverSize.height,
        videoBytes: videoStat.size,
        videoExtension,
        loop: true,
        muted: true,
        fit: "cover",
        importedAt: new Date().toISOString()
      },
      aliases: ["user", "local", "live photo", "动态照片", path.basename(resolvedCover, coverExtension).slice(0, 80)],
      source: "user",
      safeRegion: wallpaperSafeRegion(null)
    };

    try {
      await this.copyAtomically(resolvedVideo, storedVideoPath);
      const coverPng = coverImage.toPNG();
      const thumbnail = coverImage.resize({ width: 480, quality: "good" }).toPNG();
      await Promise.all([
        this.writeAtomically(coverPathInLibrary, coverPng),
        this.writeAtomically(thumbnailPath, thumbnail)
      ]);
      this.database.saveUserMediaAsset(item, storedVideoPath);
      this.logger.info("app", "user Live Photo imported", { id, coverBytes: coverStat.size, videoBytes: videoStat.size });
      return item;
    } catch (error) {
      await Promise.allSettled([fs.promises.rm(storedVideoPath, { force: true }), fs.promises.rm(coverPathInLibrary, { force: true }), fs.promises.rm(thumbnailPath, { force: true })]);
      throw error;
    }
  }

  async inspectLivePhoto(coverPath: string, videoPath: string): Promise<{
    coverExtension: string;
    videoExtension: string;
    coverStat: fs.Stats;
    videoStat: fs.Stats;
    coverImage: Electron.NativeImage;
    coverSize: { width: number; height: number };
  }> {
    const resolvedCover = path.resolve(coverPath);
    const resolvedVideo = path.resolve(videoPath);
    const coverExtension = path.extname(resolvedCover).toLowerCase();
    const videoExtension = path.extname(resolvedVideo).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(coverExtension)) throw new Error("Live Photo cover must be a supported image");
    if (!VIDEO_EXTENSIONS.has(videoExtension)) throw new Error("Live Photo video must be MP4, WebM, or MOV");

    const [coverStat, videoStat] = await Promise.all([fs.promises.stat(resolvedCover), fs.promises.stat(resolvedVideo)]);
    if (!coverStat.isFile() || coverStat.size <= 0 || coverStat.size > MAX_IMPORT_BYTES) throw new Error("Live Photo cover must be a valid image no larger than 30 MB");
    if (!videoStat.isFile() || videoStat.size <= 0 || videoStat.size > MAX_VIDEO_IMPORT_BYTES) throw new Error("Live Photo video must be no larger than 300 MB");
    await this.assertSupportedVideoContainer(resolvedVideo, videoExtension);
    const coverImage = nativeImage.createFromPath(resolvedCover);
    if (coverImage.isEmpty()) throw new Error("The selected Live Photo cover could not be decoded");
    return { coverExtension, videoExtension, coverStat, videoStat, coverImage, coverSize: coverImage.getSize() };
  }

  delete(id: string): void {
    const originalPath = this.database.getUserMediaAssetPath(id);
    if (!originalPath) throw new Error("Wallpaper is not a user library asset");
    const safeOriginalPath = this.ensureManagedPath(originalPath, this.originalsDirectory);
    const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
    this.database.deleteUserMediaAsset(id);
    void Promise.allSettled([
      fs.promises.rm(safeOriginalPath, { force: true }),
      fs.promises.rm(thumbnailPath, { force: true }),
      fs.promises.rm(path.join(this.coversDirectory, `${id}.png`), { force: true })
    ]).then((results) => {
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) this.logger.warn("app", "user wallpaper files could not be removed", { id, failed: failed.length });
    });
  }

  resolveAssetPath(id: string, variant: "original" | "thumbnail" | "cover"): string | null {
    const originalPath = this.database.getUserMediaAssetPath(id);
    if (!originalPath) return null;
    if (variant === "thumbnail") {
      const thumbnailPath = path.join(this.thumbnailsDirectory, `${id}.png`);
      return fs.existsSync(thumbnailPath) ? thumbnailPath : this.ensureManagedPath(originalPath, this.originalsDirectory);
    }
    if (variant === "cover") {
      const coverPath = path.join(this.coversDirectory, `${id}.png`);
      return fs.existsSync(coverPath) ? coverPath : this.ensureManagedPath(originalPath, this.originalsDirectory);
    }
    return this.ensureManagedPath(originalPath, this.originalsDirectory);
  }

  private ensureManagedPath(candidate: string, parent: string): string {
    const resolved = path.resolve(candidate);
    const root = path.resolve(parent) + path.sep;
    if (!resolved.startsWith(root)) throw new Error("Wallpaper asset path is outside managed storage");
    return resolved;
  }

  private async assertSupportedVideoContainer(sourcePath: string, extension: string): Promise<void> {
    const handle = await fs.promises.open(sourcePath, "r");
    try {
      const header = Buffer.alloc(16);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      const isWebm = header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      const hasIsoBaseMediaBrand = bytesRead >= 8 && header.subarray(4, 8).toString("ascii") === "ftyp";
      if ((extension === ".webm" && isWebm) || ((extension === ".mp4" || extension === ".mov") && hasIsoBaseMediaBrand)) return;
      throw new Error("The selected Live Photo video has an invalid or unsupported container header");
    } finally {
      await handle.close();
    }
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
