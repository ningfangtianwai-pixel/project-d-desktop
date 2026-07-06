import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type { AppLogger } from "./logger.js";
import type {
  ContainerRecord,
  ContainerWithFiles,
  DatabaseStatus,
  DesktopFileRecord,
  FileCategory,
  ChatMessage,
  SettingsPatch,
  SettingsSnapshot
} from "../shared/types.js";

export interface UpsertDesktopFileInput {
  filename: string;
  fullPath: string;
  extension: string;
  category: FileCategory;
  sizeBytes: number;
  modifiedAt: string;
  isShortcut: boolean;
  fingerprint: string;
}

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS desktop_files (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    filename        TEXT NOT NULL,
    full_path       TEXT NOT NULL UNIQUE,
    extension       TEXT,
    category        TEXT NOT NULL DEFAULT 'other',
    size_bytes      INTEGER,
    modified_at     TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    is_shortcut     INTEGER DEFAULT 0,
    custom_category TEXT,
    display_name    TEXT,
    container_id    INTEGER,
    sort_order      INTEGER DEFAULT 0,
    is_missing      INTEGER DEFAULT 0,
    is_hidden       INTEGER DEFAULT 0,
    fingerprint     TEXT,
    FOREIGN KEY (container_id) REFERENCES containers(id)
);

CREATE INDEX IF NOT EXISTS idx_files_category ON desktop_files(category);
CREATE INDEX IF NOT EXISTS idx_files_container ON desktop_files(container_id);
CREATE INDEX IF NOT EXISTS idx_files_missing ON desktop_files(is_missing);

CREATE TABLE IF NOT EXISTS containers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    icon            TEXT DEFAULT 'folder',
    category_filter TEXT NOT NULL,
    position_x      REAL DEFAULT 0,
    position_y      REAL DEFAULT 0,
    width           REAL DEFAULT 300,
    height          REAL DEFAULT 400,
    sort_order      INTEGER DEFAULT 0,
    is_collapsed    INTEGER DEFAULT 0,
    is_visible      INTEGER DEFAULT 1,
    layout_group    INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS layouts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    columns         INTEGER NOT NULL DEFAULT 4,
    grid_template   TEXT,
    is_active       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallpaper_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    current_style   TEXT DEFAULT 'anime',
    current_index   INTEGER DEFAULT 0,
    border_style    TEXT DEFAULT 'rounded',
    border_color    TEXT DEFAULT 'rgba(255,255,255,0.1)',
    border_width    REAL DEFAULT 1,
    is_dynamic      INTEGER DEFAULT 0,
    dynamic_id      TEXT,
    auto_rotate     INTEGER DEFAULT 0,
    rotate_interval INTEGER DEFAULT 300
);

CREATE TABLE IF NOT EXISTS weather_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mode            TEXT DEFAULT 'manual',
    manual_weather  TEXT DEFAULT 'clear',
    city            TEXT,
    api_key         TEXT,
    latitude        REAL,
    longitude       REAL,
    particle_intensity REAL DEFAULT 1.0,
    enable_border_interaction INTEGER DEFAULT 1,
    last_fetched_at TEXT,
    cached_weather  TEXT
);

CREATE TABLE IF NOT EXISTS pet_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id    TEXT DEFAULT 'default',
    current_outfit  TEXT DEFAULT 'default',
    position_x      REAL DEFAULT -1,
    position_y      REAL DEFAULT -1,
    scale           REAL DEFAULT 1.0,
    is_visible      INTEGER DEFAULT 1,
    personality     TEXT DEFAULT 'gentle',
    auto_outfit     INTEGER DEFAULT 1,
    action_interval INTEGER DEFAULT 120,
    talk_frequency  TEXT DEFAULT 'normal',
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    provider        TEXT DEFAULT 'local-fallback',
    api_key         TEXT,
    api_endpoint    TEXT DEFAULT 'https://api.openai.com/v1/chat/completions',
    model           TEXT DEFAULT 'gpt-3.5-turbo',
    temperature     REAL DEFAULT 0.8,
    max_tokens      INTEGER DEFAULT 150,
    system_prompt   TEXT,
    daily_count     INTEGER DEFAULT 0,
    daily_limit     INTEGER DEFAULT 999,
    last_reset_date TEXT,
    enabled         INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS chat_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    personality     TEXT,
    weather_context TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_history(created_at);

CREATE TABLE IF NOT EXISTS app_state (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS premium_content (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type    TEXT NOT NULL,
    content_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    price_cents     INTEGER DEFAULT 0,
    is_purchased    INTEGER DEFAULT 0,
    preview_url     TEXT,
    download_url    TEXT
);

CREATE TABLE IF NOT EXISTS user_account (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid            TEXT NOT NULL UNIQUE,
    display_name    TEXT DEFAULT '用户',
    created_at      TEXT DEFAULT (datetime('now'))
);
`;

const DEFAULT_CONTAINERS = [
  { name: "程序与快捷方式", icon: "app-window", filter: ["program"], x: 32, y: 80, order: 0 },
  { name: "文档", icon: "file-text", filter: ["document"], x: 356, y: 80, order: 1 },
  { name: "图片与媒体", icon: "image", filter: ["image", "media"], x: 680, y: 80, order: 2 },
  { name: "代码与脚本", icon: "code-2", filter: ["code"], x: 1004, y: 80, order: 3 },
  { name: "压缩包", icon: "archive", filter: ["archive"], x: 32, y: 520, order: 4 },
  { name: "文件夹", icon: "folder", filter: ["folder"], x: 356, y: 520, order: 5 },
  { name: "其他", icon: "circle-help", filter: ["other"], x: 680, y: 520, order: 6 }
];

const SAFE_SECRET_PREFIX = "safe:v1:";

export class DatabaseService {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private createdNow = false;
  private readonly dbPath: string;

  constructor(
    private readonly logger: AppLogger,
    dbPath = path.join(app.getPath("userData"), "database.sqlite")
  ) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<DatabaseStatus> {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.createdNow = !fs.existsSync(this.dbPath);

    this.SQL = await initSqlJs({
      locateFile: (file) => this.locateSqlJsFile(file)
    });

    const data = fs.existsSync(this.dbPath) ? fs.readFileSync(this.dbPath) : undefined;
    this.db = data ? new this.SQL.Database(data) : new this.SQL.Database();
    this.db.run(SCHEMA_SQL);
    this.runMigrations();
    this.seedDefaults();
    this.migrateSecretsToSafeStorage();
    this.setAppState("last_boot_time", new Date().toISOString());
    this.persist();

    const status = this.getStatus();
    this.logger.info("app", "database initialized", status);
    return status;
  }

  getStatus(): DatabaseStatus {
    return {
      path: this.dbPath,
      initialized: Boolean(this.db),
      createdNow: this.createdNow,
      containerCount: this.count("containers"),
      layoutCount: this.count("layouts")
    };
  }

  getAppState(key: string): string | null {
    const row = this.getDb().exec("SELECT value FROM app_state WHERE key = ?", [key])[0]?.values[0];
    return typeof row?.[0] === "string" ? row[0] : null;
  }

  setAppState(key: string, value: string): void {
    this.getDb().run(
      `INSERT INTO app_state(key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, value]
    );
    this.persist();
  }

  getContainers(): ContainerRecord[] {
    const rows = this.selectRows(
      `SELECT id, name, icon, category_filter, position_x, position_y, width, height,
              sort_order, is_collapsed, is_visible, layout_group
       FROM containers
       WHERE is_visible = 1
       ORDER BY sort_order ASC`
    );

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      icon: String(row.icon),
      categoryFilter: JSON.parse(String(row.category_filter)) as string[],
      positionX: Number(row.position_x),
      positionY: Number(row.position_y),
      width: Number(row.width),
      height: Number(row.height),
      sortOrder: Number(row.sort_order),
      isCollapsed: Boolean(row.is_collapsed),
      isVisible: Boolean(row.is_visible),
      layoutGroup: Number(row.layout_group)
    }));
  }

  getContainersWithFiles(): ContainerWithFiles[] {
    const files = this.getDesktopFiles();
    return this.getContainers().map((container) => ({
      ...container,
      files: files.filter((file) => file.containerId === container.id)
    }));
  }

  getDesktopFiles(): DesktopFileRecord[] {
    const rows = this.selectRows(
      `SELECT id, filename, full_path, extension, category, size_bytes, modified_at,
              is_shortcut, custom_category, display_name, container_id, sort_order, is_missing
       FROM desktop_files
       WHERE is_missing = 0 AND COALESCE(is_hidden, 0) = 0
       ORDER BY container_id ASC, sort_order ASC, filename COLLATE NOCASE ASC`
    );

    return rows.map((row) => ({
      id: Number(row.id),
      filename: String(row.filename),
      displayName: row.display_name === null ? null : String(row.display_name),
      fullPath: String(row.full_path),
      extension: row.extension === null ? null : String(row.extension),
      category: String(row.custom_category ?? row.category) as FileCategory,
      sizeBytes: Number(row.size_bytes ?? 0),
      modifiedAt: String(row.modified_at ?? ""),
      isShortcut: Boolean(row.is_shortcut),
      customCategory: row.custom_category === null ? null : String(row.custom_category),
      containerId: row.container_id === null ? null : Number(row.container_id),
      sortOrder: Number(row.sort_order ?? 0),
      isMissing: Boolean(row.is_missing)
    }));
  }

  getDesktopFileById(fileId: number): DesktopFileRecord | null {
    const row = this.selectRows(
      `SELECT id, filename, full_path, extension, category, size_bytes, modified_at,
              is_shortcut, custom_category, display_name, container_id, sort_order, is_missing
       FROM desktop_files
       WHERE id = ? AND is_missing = 0 AND COALESCE(is_hidden, 0) = 0`,
      [fileId]
    )[0];

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      filename: String(row.filename),
      displayName: row.display_name === null ? null : String(row.display_name),
      fullPath: String(row.full_path),
      extension: row.extension === null ? null : String(row.extension),
      category: String(row.custom_category ?? row.category) as FileCategory,
      sizeBytes: Number(row.size_bytes ?? 0),
      modifiedAt: String(row.modified_at ?? ""),
      isShortcut: Boolean(row.is_shortcut),
      customCategory: row.custom_category === null ? null : String(row.custom_category),
      containerId: row.container_id === null ? null : Number(row.container_id),
      sortOrder: Number(row.sort_order ?? 0),
      isMissing: Boolean(row.is_missing)
    };
  }

  upsertDesktopFiles(desktopPath: string, files: UpsertDesktopFileInput[]): { insertedOrUpdated: number; markedMissing: number } {
    const db = this.getDb();
    const seenPaths = new Set(files.map((file) => file.fullPath));
    const existingRows = this.selectRows("SELECT full_path FROM desktop_files WHERE full_path LIKE ?", [`${desktopPath}%`]);
    const missingPaths = existingRows.map((row) => String(row.full_path)).filter((fullPath) => !seenPaths.has(fullPath));

    db.run("BEGIN TRANSACTION");
    try {
      const upsert = db.prepare(
        `INSERT INTO desktop_files(
            filename, full_path, extension, category, size_bytes, modified_at,
            is_shortcut, container_id, sort_order, is_missing, is_hidden, fingerprint
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
          ON CONFLICT(full_path) DO UPDATE SET
            filename = excluded.filename,
            extension = excluded.extension,
            category = COALESCE(desktop_files.custom_category, excluded.category),
            size_bytes = excluded.size_bytes,
            modified_at = excluded.modified_at,
            is_shortcut = excluded.is_shortcut,
            container_id = excluded.container_id,
            is_missing = 0,
            fingerprint = excluded.fingerprint`
      );

      for (const file of files) {
        const containerId = this.findContainerIdForCategory(file.category);
        upsert.run([
          file.filename,
          file.fullPath,
          file.extension,
          file.category,
          file.sizeBytes,
          file.modifiedAt,
          file.isShortcut ? 1 : 0,
          containerId,
          file.fingerprint
        ]);
      }
      upsert.free();

      const markMissing = db.prepare("UPDATE desktop_files SET is_missing = 1 WHERE full_path = ?");
      for (const missingPath of missingPaths) {
        markMissing.run([missingPath]);
      }
      markMissing.free();

      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }

    this.persist();
    return { insertedOrUpdated: files.length, markedMissing: missingPaths.length };
  }

  moveFileToContainer(fileId: number, containerId: number): void {
    const container = this.selectRows("SELECT id, category_filter FROM containers WHERE id = ? AND is_visible = 1", [containerId])[0];
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const filters = JSON.parse(String(container.category_filter)) as string[];
    this.getDb().run("UPDATE desktop_files SET container_id = ?, custom_category = ? WHERE id = ?", [
      containerId,
      filters[0] ?? "other",
      fileId
    ]);
    this.persist();
  }

  renameFileAlias(fileId: number, displayName: string): void {
    const normalized = displayName.trim();
    this.getDb().run("UPDATE desktop_files SET display_name = ? WHERE id = ?", [normalized.length > 0 ? normalized : null, fileId]);
    this.persist();
  }

  hideFile(fileId: number): void {
    this.getDb().run("UPDATE desktop_files SET is_hidden = 1 WHERE id = ?", [fileId]);
    this.persist();
  }

  updateContainerPosition(containerId: number, x: number, y: number, width: number, height: number): void {
    this.getDb().run(
      "UPDATE containers SET position_x = ?, position_y = ?, width = ?, height = ? WHERE id = ?",
      [x, y, Math.max(220, Math.min(600, width)), Math.max(180, Math.min(800, height)), containerId]
    );
    this.persist();
  }

  getLayouts(): Array<{ id: number; name: string; columns: number; isActive: boolean }> {
    return this.selectRows("SELECT id, name, columns, is_active FROM layouts ORDER BY id ASC").map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      columns: Number(row.columns),
      isActive: Boolean(row.is_active)
    }));
  }

  applyLayout(layoutId: number): void {
    const db = this.getDb();
    db.run("UPDATE layouts SET is_active = 0");
    db.run("UPDATE layouts SET is_active = 1 WHERE id = ?", [layoutId]);
    this.setAppState("current_layout_id", String(layoutId));
    this.persist();
  }

  getSettings(): SettingsSnapshot {
    const wallpaper = this.firstRow("SELECT * FROM wallpaper_config ORDER BY id LIMIT 1");
    const weather = this.firstRow("SELECT * FROM weather_config ORDER BY id LIMIT 1");
    const pet = this.firstRow("SELECT * FROM pet_config ORDER BY id LIMIT 1");
    const ai = this.firstRow("SELECT * FROM ai_config ORDER BY id LIMIT 1");

    return {
      wallpaper: {
        currentStyle: String(wallpaper.current_style),
        currentIndex: Number(wallpaper.current_index),
        borderStyle: String(wallpaper.border_style),
        borderColor: String(wallpaper.border_color),
        borderWidth: Number(wallpaper.border_width),
        isDynamic: Boolean(wallpaper.is_dynamic),
        dynamicId: wallpaper.dynamic_id === null ? null : String(wallpaper.dynamic_id),
        autoRotate: Boolean(wallpaper.auto_rotate),
        rotateInterval: Number(wallpaper.rotate_interval)
      },
      weather: {
        mode: String(weather.mode),
        manualWeather: String(weather.manual_weather),
        city: weather.city === null ? null : String(weather.city),
        particleIntensity: Number(weather.particle_intensity),
        enableBorderInteraction: Boolean(weather.enable_border_interaction),
        apiKeyConfigured: this.hasSecretValue(weather.api_key)
      },
      pet: {
        characterId: String(pet.character_id),
        currentOutfit: String(pet.current_outfit),
        positionX: Number(pet.position_x),
        positionY: Number(pet.position_y),
        scale: Number(pet.scale),
        isVisible: Boolean(pet.is_visible),
        personality: String(pet.personality),
        autoOutfit: Boolean(pet.auto_outfit),
        actionInterval: Number(pet.action_interval),
        talkFrequency: String(pet.talk_frequency)
      },
      ai: {
        provider: String(ai.provider),
        apiEndpoint: String(ai.api_endpoint),
        model: String(ai.model),
        temperature: Number(ai.temperature),
        maxTokens: Number(ai.max_tokens),
        dailyCount: Number(ai.daily_count),
        dailyLimit: Number(ai.daily_limit),
        enabled: Boolean(ai.enabled),
        apiKeyConfigured: this.hasSecretValue(ai.api_key)
      }
    };
  }

  getWeatherRuntimeConfig(): { apiKey: string | null; latitude: number | null; longitude: number | null } {
    const weather = this.firstRow("SELECT api_key, latitude, longitude FROM weather_config ORDER BY id LIMIT 1");
    return {
      apiKey: this.decryptSecret(weather.api_key),
      latitude: typeof weather.latitude === "number" ? Number(weather.latitude) : null,
      longitude: typeof weather.longitude === "number" ? Number(weather.longitude) : null
    };
  }

  updateWeatherLocation(city: string | null, latitude: number | null, longitude: number | null, source: string): void {
    if (
      latitude !== null &&
      longitude !== null &&
      (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    ) {
      throw new Error("Invalid weather location coordinates");
    }

    this.updateSingleton(
      "weather_config",
      {
        city: city === null ? null : city.trim().slice(0, 80),
        latitude,
        longitude,
        last_fetched_at: new Date().toISOString()
      },
      true
    );
    this.setAppState("weather_location_source", source.slice(0, 80));
    this.persist();
  }

  getAiRuntimeConfig(): { apiKey: string | null; endpoint: string; model: string; provider: string } {
    const ai = this.firstRow("SELECT api_key, api_endpoint, model, provider FROM ai_config ORDER BY id LIMIT 1");
    return {
      apiKey: this.decryptSecret(ai.api_key),
      endpoint: String(ai.api_endpoint),
      model: String(ai.model),
      provider: String(ai.provider)
    };
  }

  updateSettings(patch: SettingsPatch): SettingsSnapshot {
    const db = this.getDb();
    db.run("BEGIN TRANSACTION");
    try {
      if (patch.wallpaper) {
        this.updateSingleton(
          "wallpaper_config",
          {
            current_style: this.stringOrUndefined(patch.wallpaper.currentStyle, 40),
            current_index: this.numberOrUndefined(patch.wallpaper.currentIndex, 0, 99),
            dynamic_id: this.stringOrUndefined(patch.wallpaper.dynamicId, 80),
            is_dynamic: this.booleanNumberOrUndefined(patch.wallpaper.isDynamic),
            auto_rotate: this.booleanNumberOrUndefined(patch.wallpaper.autoRotate),
            rotate_interval: this.numberOrUndefined(patch.wallpaper.rotateInterval, 30, 86400)
          },
          false
        );
      }

      if (patch.weather) {
        this.updateSingleton(
          "weather_config",
          {
            mode: this.pickString(patch.weather.mode, ["manual", "auto"], 20),
            manual_weather: this.pickString(patch.weather.manualWeather, ["clear", "rain", "snow", "fog", "leaves", "light"], 20),
            city: this.nullableStringOrUndefined(patch.weather.city, 80),
            api_key: this.secretOrUndefined(patch.weather.apiKey),
            particle_intensity: this.numberOrUndefined(patch.weather.particleIntensity, 0, 1.2),
            enable_border_interaction: this.booleanNumberOrUndefined(patch.weather.enableBorderInteraction)
          },
          true
        );
      }

      if (patch.pet) {
        this.updateSingleton(
          "pet_config",
          {
            character_id: this.stringOrUndefined(patch.pet.characterId, 60),
            current_outfit: this.stringOrUndefined(patch.pet.currentOutfit, 60),
            scale: this.numberOrUndefined(patch.pet.scale, 0.5, 2),
            is_visible: this.booleanNumberOrUndefined(patch.pet.isVisible),
            personality: this.stringOrUndefined(patch.pet.personality, 60),
            auto_outfit: this.booleanNumberOrUndefined(patch.pet.autoOutfit),
            action_interval: this.numberOrUndefined(patch.pet.actionInterval, 15, 3600),
            talk_frequency: this.stringOrUndefined(patch.pet.talkFrequency, 40)
          },
          false
        );
      }

      if (patch.ai) {
        this.updateSingleton(
          "ai_config",
          {
            provider: this.pickString(patch.ai.provider, ["local-fallback", "openai-compatible", "ollama", "deepseek", "xiaomi-mimo"], 60),
            api_key: this.secretOrUndefined(patch.ai.apiKey),
            api_endpoint: this.stringOrUndefined(patch.ai.apiEndpoint, 300),
            model: this.stringOrUndefined(patch.ai.model, 120),
            temperature: this.numberOrUndefined(patch.ai.temperature, 0, 2),
            max_tokens: this.numberOrUndefined(patch.ai.maxTokens, 32, 4096),
            daily_limit: this.numberOrUndefined(patch.ai.dailyLimit, 1, 100000),
            enabled: this.booleanNumberOrUndefined(patch.ai.enabled)
          },
          false
        );
      }

      if (patch.appState) {
        for (const [key, value] of Object.entries(patch.appState)) {
          if (key.length <= 80 && value.length <= 10_000) {
            this.getDb().run(
              `INSERT INTO app_state(key, value, updated_at)
               VALUES (?, ?, datetime('now'))
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
              [key, value]
            );
          }
        }
      }

      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }

    this.persist();
    return this.getSettings();
  }

  addChatMessage(role: "user" | "assistant", content: string, personality?: string, weatherContext?: string): ChatMessage {
    const normalized = content.trim().slice(0, 8000);
    if (normalized.length === 0) {
      throw new Error("Chat message is empty");
    }

    this.getDb().run(
      "INSERT INTO chat_history(role, content, personality, weather_context) VALUES (?, ?, ?, ?)",
      [role, normalized, personality ?? null, weatherContext ?? null]
    );
    this.persist();

    const row = this.firstRow("SELECT id, role, content, created_at FROM chat_history ORDER BY id DESC LIMIT 1");
    return {
      id: Number(row.id),
      role: String(row.role) === "assistant" ? "assistant" : "user",
      content: String(row.content),
      createdAt: String(row.created_at)
    };
  }

  getChatHistory(limit = 30): ChatMessage[] {
    const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
    const rows = this.selectRows(
      `SELECT id, role, content, created_at
       FROM chat_history
       ORDER BY id DESC
       LIMIT ?`,
      [safeLimit]
    );

    return rows
      .reverse()
      .map((row) => ({
        id: Number(row.id),
        role: String(row.role) === "assistant" ? "assistant" : "user",
        content: String(row.content),
        createdAt: String(row.created_at)
      }));
  }

  persist(): void {
    const db = this.getDb();
    const data = db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  close(): void {
    if (!this.db) {
      return;
    }
    this.persist();
    this.db.close();
    this.db = null;
  }

  private seedDefaults(): void {
    const db = this.getDb();
    db.run("BEGIN TRANSACTION");

    try {
      if (this.count("containers") === 0) {
        const statement = db.prepare(
          `INSERT INTO containers(name, icon, category_filter, position_x, position_y, width, height, sort_order)
           VALUES (?, ?, ?, ?, ?, 300, 400, ?)`
        );
        for (const container of DEFAULT_CONTAINERS) {
          statement.run([
            container.name,
            container.icon,
            JSON.stringify(container.filter),
            container.x,
            container.y,
            container.order
          ]);
        }
        statement.free();
      }

      if (this.count("layouts") === 0) {
        db.run(
          "INSERT INTO layouts(name, columns, grid_template, is_active) VALUES (?, ?, ?, 1)",
          ["默认 4 列布局", 4, JSON.stringify({ columns: 4, gap: 24, containerWidth: 300 })]
        );
      }

      this.insertSingleton("wallpaper_config");
      this.insertSingleton("weather_config");
      this.insertSingleton("pet_config");
      this.insertSingleton("ai_config");

      if (this.getAppState("wallpaper_default_enabled_applied") === null) {
        db.run("UPDATE wallpaper_config SET is_dynamic = 1 WHERE id = (SELECT id FROM wallpaper_config ORDER BY id LIMIT 1)");
        this.seedState("wallpaper_default_enabled_applied", "true");
      }

      if (this.count("user_account") === 0) {
        db.run("INSERT INTO user_account(uuid, display_name) VALUES (?, ?)", [randomUUID(), "用户"]);
      }

      this.seedState("desktop_state", "idle");
      this.seedState("is_active", "false");
      this.seedState("current_layout_id", "1");
      this.seedState("install_date", new Date().toISOString());

      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  }

  private insertSingleton(table: string): void {
    if (this.count(table) === 0) {
      this.getDb().run(`INSERT INTO ${table} DEFAULT VALUES`);
    }
  }

  private runMigrations(): void {
    this.ensureColumn("desktop_files", "display_name", "TEXT");
    this.ensureColumn("desktop_files", "is_hidden", "INTEGER DEFAULT 0");
    this.ensureColumn("desktop_files", "is_missing", "INTEGER DEFAULT 0");
    this.ensureColumn("desktop_files", "fingerprint", "TEXT");
  }

  private migrateSecretsToSafeStorage(): void {
    this.encryptSingletonSecret("weather_config", "api_key");
    this.encryptSingletonSecret("ai_config", "api_key");
  }

  private encryptSingletonSecret(table: string, column: string): void {
    const row = this.selectRows(`SELECT id, ${column} FROM ${table} WHERE ${column} IS NOT NULL AND length(${column}) > 0 ORDER BY id LIMIT 1`)[0];
    if (!row || typeof row[column] !== "string" || row[column].startsWith(SAFE_SECRET_PREFIX)) {
      return;
    }

    const encrypted = this.encryptSecret(row[column]);
    if (encrypted !== row[column]) {
      this.getDb().run(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [encrypted, Number(row.id)]);
      this.setAppState("safe_storage_last_migration", new Date().toISOString());
    }
  }

  private locateSqlJsFile(file: string): string {
    const candidates = [
      path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
      path.join(app.getAppPath(), "node_modules", "sql.js", "dist", file),
      path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", file),
      path.join(process.resourcesPath, "node_modules", "sql.js", "dist", file)
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
  }

  private updateSingleton(table: string, fields: Record<string, string | number | null | undefined>, allowNull: boolean): void {
    const entries = Object.entries(fields).filter((entry): entry is [string, string | number | null] => {
      if (entry[1] === undefined) {
        return false;
      }
      return allowNull || entry[1] !== null;
    });

    if (entries.length === 0) {
      return;
    }

    const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    this.getDb().run(`UPDATE ${table} SET ${assignments} WHERE id = (SELECT id FROM ${table} ORDER BY id LIMIT 1)`, values);
  }

  private stringOrUndefined(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    return value.trim().slice(0, maxLength);
  }

  private nullableStringOrUndefined(value: unknown, maxLength: number): string | null | undefined {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized.slice(0, maxLength);
  }

  private secretOrUndefined(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length === 0 ? undefined : this.encryptSecret(normalized.slice(0, 500));
  }

  private encryptSecret(value: string): string {
    if (value.startsWith(SAFE_SECRET_PREFIX)) {
      return value;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      this.logger.warn("app", "safeStorage is unavailable; secret kept in legacy storage");
      return value;
    }

    return `${SAFE_SECRET_PREFIX}${safeStorage.encryptString(value).toString("base64")}`;
  }

  private decryptSecret(value: unknown): string | null {
    if (typeof value !== "string" || value.length === 0) {
      return null;
    }

    if (!value.startsWith(SAFE_SECRET_PREFIX)) {
      return value;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      this.logger.warn("app", "safeStorage is unavailable; encrypted secret cannot be read");
      return null;
    }

    try {
      return safeStorage.decryptString(Buffer.from(value.slice(SAFE_SECRET_PREFIX.length), "base64"));
    } catch (error) {
      this.logger.error("error", "failed to decrypt stored secret", {
        message: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private hasSecretValue(value: unknown): boolean {
    return typeof value === "string" && value.length > 0;
  }

  private pickString(value: unknown, allowed: string[], maxLength: number): string | undefined {
    const normalized = this.stringOrUndefined(value, maxLength);
    return normalized && allowed.includes(normalized) ? normalized : undefined;
  }

  private booleanNumberOrUndefined(value: unknown): number | undefined {
    return typeof value === "boolean" ? (value ? 1 : 0) : undefined;
  }

  private numberOrUndefined(value: unknown, min: number, max: number): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(min, Math.min(max, value));
  }

  private ensureColumn(table: string, column: string, definition: string): void {
    const columns = this.selectRows(`PRAGMA table_info(${table})`).map((row) => String(row.name));
    if (!columns.includes(column)) {
      this.getDb().run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  private seedState(key: string, value: string): void {
    if (this.getAppState(key) === null) {
      this.getDb().run("INSERT INTO app_state(key, value) VALUES (?, ?)", [key, value]);
    }
  }

  private count(table: string): number {
    const row = this.getDb().exec(`SELECT COUNT(*) FROM ${table}`)[0]?.values[0];
    return Number(row?.[0] ?? 0);
  }

  private findContainerIdForCategory(category: FileCategory): number | null {
    const rows = this.selectRows("SELECT id, category_filter FROM containers WHERE is_visible = 1 ORDER BY sort_order ASC");

    for (const row of rows) {
      const filters = JSON.parse(String(row.category_filter)) as string[];
      if (filters.includes(category)) {
        return Number(row.id);
      }
    }

    return null;
  }

  private firstRow(sql: string): Record<string, unknown> {
    const row = this.selectRows(sql)[0];
    if (!row) {
      throw new Error(`No row returned for query: ${sql}`);
    }
    return row;
  }

  private selectRows(sql: string, params: Array<string | number | null> = []): Array<Record<string, unknown>> {
    const statement = this.getDb().prepare(sql, params);
    const rows: Array<Record<string, unknown>> = [];

    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    statement.free();
    return rows;
  }

  private getDb(): Database {
    if (!this.db) {
      throw new Error("Database has not been initialized");
    }
    return this.db;
  }
}
