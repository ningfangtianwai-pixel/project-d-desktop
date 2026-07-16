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
  ActionExecution,
  ActionPlan,
  PortalConfig,
  WorkspaceScene,
  SettingsPatch,
  SettingsSnapshot
} from "../shared/types.js";
import { normalizeContainerAccent, type ContainerAccent } from "../shared/container-accents.js";
import type { AutoRule } from "../shared/auto-rules.js";
import { autoRuleToRow, rowToAutoRule, type AutoRuleRow } from "./auto-rules/auto-rules-service.js";

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

const LATEST_SCHEMA_VERSION = 4;

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
    accent_color    TEXT NOT NULL DEFAULT 'neutral',
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

CREATE TABLE IF NOT EXISTS schema_migrations (
    version         INTEGER PRIMARY KEY,
    applied_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_plans (
    id              TEXT PRIMARY KEY,
    source          TEXT NOT NULL,
    risk_level      TEXT NOT NULL,
    status          TEXT NOT NULL,
    summary         TEXT NOT NULL,
    payload_json    TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_executions (
    id              TEXT PRIMARY KEY,
    plan_id         TEXT NOT NULL,
    status          TEXT NOT NULL,
    undoable        INTEGER NOT NULL DEFAULT 0,
    summary         TEXT NOT NULL,
    payload_json    TEXT NOT NULL,
    started_at      TEXT NOT NULL,
    completed_at    TEXT,
    updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_executions_updated ON action_executions(updated_at DESC);

CREATE TABLE IF NOT EXISTS workspace_scenes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL COLLATE NOCASE UNIQUE,
    payload_json    TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_configs (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL UNIQUE,
    real_path       TEXT,
    is_enabled      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_scopes (
    id              TEXT PRIMARY KEY,
    scope_type      TEXT NOT NULL,
    path            TEXT NOT NULL,
    is_granted      INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    UNIQUE(scope_type, path)
);

CREATE TABLE IF NOT EXISTS auto_rules (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    conditions_json TEXT NOT NULL,
    action_type     TEXT NOT NULL,
    action_target   TEXT NOT NULL DEFAULT '',
    priority        INTEGER NOT NULL DEFAULT 0,
    enabled         INTEGER NOT NULL DEFAULT 1,
    run_count       INTEGER NOT NULL DEFAULT 0,
    last_run_at     TEXT,
    created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_priority ON auto_rules(priority, created_at);
`;

const DEFAULT_CONTAINERS = [
  { name: "程序与快捷方式", icon: "app-window", filter: ["program"], x: 32, y: 80, order: 0, accent: "sky" },
  { name: "文档", icon: "file-text", filter: ["document"], x: 356, y: 80, order: 1, accent: "mint" },
  { name: "图片与媒体", icon: "image", filter: ["image", "media"], x: 680, y: 80, order: 2, accent: "rose" },
  { name: "代码与脚本", icon: "code-2", filter: ["code"], x: 1004, y: 80, order: 3, accent: "violet" },
  { name: "压缩包", icon: "archive", filter: ["archive"], x: 32, y: 520, order: 4, accent: "amber" },
  { name: "文件夹", icon: "folder", filter: ["folder"], x: 356, y: 520, order: 5, accent: "teal" },
  { name: "其他", icon: "circle-help", filter: ["other"], x: 680, y: 520, order: 6, accent: "neutral" }
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

    if (this.createdNow) {
      this.db = new this.SQL.Database();
      this.db.run(SCHEMA_SQL);
      this.db.run("INSERT OR REPLACE INTO app_state(key, value) VALUES ('schema_version', ?)", [String(LATEST_SCHEMA_VERSION)]);
      this.db.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)", [LATEST_SCHEMA_VERSION, new Date().toISOString()]);
      this.seedDefaults();
      this.migrateSecretsToSafeStorage();
      this.setAppState("last_boot_time", new Date().toISOString());
      this.persist();
      const status = this.getStatus();
      this.logger.info("app", "database initialized (fresh)", status);
      return status;
    }

    const rawBytes = fs.readFileSync(this.dbPath);
    const currentVersion = this.peekVersionFromBytes(rawBytes);
    const backupPath = `${this.dbPath}.pre-v${currentVersion}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, rawBytes);
    }

    const migrated = this.migrateInTempDb(rawBytes, currentVersion);

    if (migrated) {
      const tmpPath = this.dbPath + ".tmp";
      try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
      fs.writeFileSync(tmpPath, Buffer.from(migrated));
      fs.renameSync(tmpPath, this.dbPath);
    }

    this.db = new this.SQL.Database(fs.readFileSync(this.dbPath));
    this.db.run(SCHEMA_SQL);
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

  saveActionPlan(plan: ActionPlan): void {
    const now = new Date().toISOString();
    this.getDb().run(
      `INSERT INTO action_plans(id, source, risk_level, status, summary, payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, summary = excluded.summary, payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
      [plan.id, plan.source, plan.riskLevel, plan.status, plan.summary, JSON.stringify(plan), plan.createdAt, now]
    );
    this.persist();
  }

  getActionPlan(planId: string): ActionPlan | null {
    const row = this.selectRows("SELECT payload_json FROM action_plans WHERE id = ?", [planId])[0];
    return row ? this.parseJson<ActionPlan>(row.payload_json) : null;
  }

  saveActionExecution(execution: ActionExecution): void {
    const now = new Date().toISOString();
    this.getDb().run(
      `INSERT INTO action_executions(id, plan_id, status, undoable, summary, payload_json, started_at, completed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, undoable = excluded.undoable, summary = excluded.summary,
          payload_json = excluded.payload_json, completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
      [execution.id, execution.planId, execution.status, execution.undoable ? 1 : 0, execution.summary, JSON.stringify(execution), execution.startedAt, execution.completedAt, now]
    );
    this.persist();
  }

  getActionExecution(executionId: string): ActionExecution | null {
    const row = this.selectRows("SELECT payload_json FROM action_executions WHERE id = ?", [executionId])[0];
    return row ? this.parseJson<ActionExecution>(row.payload_json) : null;
  }

  getActionHistory(limit = 30): ActionExecution[] {
    const rows = this.selectRows(
      "SELECT payload_json FROM action_executions ORDER BY updated_at DESC LIMIT ?",
      [Math.max(1, Math.min(100, Math.round(limit)))]
    );
    return rows.flatMap((row) => {
      const execution = this.parseJson<ActionExecution>(row.payload_json);
      return execution ? [execution] : [];
    });
  }

  saveWorkspaceScene(scene: WorkspaceScene): void {
    this.getDb().run(
      `INSERT INTO workspace_scenes(id, name, payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
      [scene.id, scene.name, JSON.stringify(scene), scene.createdAt, scene.updatedAt]
    );
    this.persist();
  }

  getWorkspaceScenes(): WorkspaceScene[] {
    return this.selectRows("SELECT payload_json FROM workspace_scenes ORDER BY updated_at DESC").flatMap((row) => {
      const scene = this.parseJson<WorkspaceScene>(row.payload_json);
      return scene ? [scene] : [];
    });
  }

  getWorkspaceScene(sceneId: string): WorkspaceScene | null {
    const row = this.selectRows("SELECT payload_json FROM workspace_scenes WHERE id = ?", [sceneId])[0];
    return row ? this.parseJson<WorkspaceScene>(row.payload_json) : null;
  }

  getAutoRules(): AutoRule[] {
    return this.selectRows("SELECT * FROM auto_rules ORDER BY priority ASC, created_at ASC").flatMap((row) => {
      try {
        return [rowToAutoRule(row as unknown as AutoRuleRow)];
      } catch {
        return [];
      }
    });
  }

  saveAutoRule(rule: AutoRule): AutoRule {
    const row = autoRuleToRow(rule);
    this.getDb().run(
      `INSERT INTO auto_rules(id, name, conditions_json, action_type, action_target, priority, enabled, run_count, last_run_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, conditions_json = excluded.conditions_json,
         action_type = excluded.action_type, action_target = excluded.action_target, priority = excluded.priority,
         enabled = excluded.enabled, run_count = excluded.run_count, last_run_at = excluded.last_run_at`,
      [row.id, row.name, row.conditions_json, row.action_type, row.action_target, row.priority, row.enabled, row.run_count, row.last_run_at, row.created_at]
    );
    this.persist();
    return rule;
  }

  deleteAutoRule(ruleId: string): void {
    this.getDb().run("DELETE FROM auto_rules WHERE id = ?", [ruleId]);
    this.persist();
  }

  savePortalConfig(portal: PortalConfig): void {
    this.getDb().run(
      `INSERT INTO portal_configs(id, name, path, real_path, is_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, path = excluded.path, real_path = excluded.real_path,
          is_enabled = excluded.is_enabled, updated_at = excluded.updated_at`,
      [portal.id, portal.name, portal.path, portal.realPath, portal.isEnabled ? 1 : 0, portal.createdAt, portal.updatedAt]
    );
    this.getDb().run(
      `INSERT INTO consent_scopes(id, scope_type, path, is_granted, created_at, updated_at)
       VALUES (?, 'portal-read', ?, 1, ?, ?)
       ON CONFLICT(scope_type, path) DO UPDATE SET is_granted = 1, updated_at = excluded.updated_at`,
      [`portal-read:${portal.path.toLowerCase()}`, portal.path, portal.createdAt, portal.updatedAt]
    );
    this.persist();
  }

  getPortalConfigs(): PortalConfig[] {
    return this.selectRows("SELECT id, name, path, real_path, is_enabled, created_at, updated_at FROM portal_configs ORDER BY updated_at DESC").map((row) => ({
      id: String(row.id),
      name: String(row.name),
      path: String(row.path),
      realPath: row.real_path ? String(row.real_path) : String(row.path),
      isEnabled: Boolean(row.is_enabled),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  getPortalConfig(portalId: string): PortalConfig | null {
    return this.getPortalConfigs().find((portal) => portal.id === portalId) ?? null;
  }

  removePortalConfig(portalId: string): void {
    const portal = this.getPortalConfig(portalId);
    if (!portal) return;
    this.getDb().run("DELETE FROM portal_configs WHERE id = ?", [portalId]);
    this.getDb().run("UPDATE consent_scopes SET is_granted = 0, updated_at = ? WHERE scope_type = 'portal-read' AND path = ?", [new Date().toISOString(), portal.path]);
    this.persist();
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
              sort_order, is_collapsed, is_visible, layout_group, accent_color
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
      layoutGroup: Number(row.layout_group),
      accentColor: normalizeContainerAccent(row.accent_color)
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

  updateContainerPosition(containerId: number, x: number, y: number, width: number, height: number, isCollapsed?: boolean): void {
    const params: Array<number> = [
      x,
      y,
      Math.max(180, Math.min(800, width)),
      Math.max(120, Math.min(1000, height))
    ];
    let sql = "UPDATE containers SET position_x = ?, position_y = ?, width = ?, height = ?";
    if (typeof isCollapsed === "boolean") {
      sql += ", is_collapsed = ?";
      params.push(isCollapsed ? 1 : 0);
    }
    sql += " WHERE id = ?";
    params.push(containerId);

    this.getDb().run(
      sql,
      params
    );
    this.persist();
  }

  updateContainerAccent(containerId: number, accentColor: ContainerAccent): void {
    this.getDb().run("UPDATE containers SET accent_color = ? WHERE id = ?", [accentColor, containerId]);
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

  applyLayout(layoutId: number, workAreaWidth = 1920, workAreaHeight = 1080): void {
    const db = this.getDb();
    const layout = this.selectRows("SELECT columns FROM layouts WHERE id = ? LIMIT 1", [layoutId])[0];
    if (!layout) {
      throw new Error("Layout was not found");
    }

    const requestedColumns = Math.max(1, Math.min(8, Number(layout.columns)));
    const gap = requestedColumns >= 6 ? 14 : 18;
    const left = 24;
    const top = 88;
    const bottom = 24;
    const maxColumns = Math.max(1, Math.floor((workAreaWidth - left * 2 + gap) / (180 + gap)));
    const columns = Math.min(requestedColumns, maxColumns);
    const containerWidth = Math.max(
      180,
      Math.min(420, Math.floor((workAreaWidth - left * 2 - gap * (columns - 1)) / columns))
    );
    const containers = this.selectRows("SELECT id FROM containers WHERE is_visible = 1 ORDER BY sort_order ASC");
    const rows = Math.max(1, Math.ceil(containers.length / columns));
    const availableHeight = workAreaHeight - top - bottom - gap * (rows - 1);
    const containerHeight = Math.max(180, Math.min(420, Math.floor(availableHeight / rows)));

    db.run("BEGIN TRANSACTION");
    try {
      containers.forEach((container, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        db.run(
          `UPDATE containers
           SET position_x = ?, position_y = ?, width = ?, height = ?, is_collapsed = 0
           WHERE id = ?`,
          [
            left + column * (containerWidth + gap),
            top + row * (containerHeight + gap),
            containerWidth,
            containerHeight,
            Number(container.id)
          ]
        );
      });

      db.run("UPDATE layouts SET is_active = 0");
      db.run("UPDATE layouts SET is_active = 1 WHERE id = ?", [layoutId]);
      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
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

  exportUserData(): Record<string, unknown> {
    const parsePayloads = (table: "action_plans" | "action_executions" | "workspace_scenes") => (
      this.selectRows(`SELECT payload_json FROM ${table} ORDER BY rowid ASC`).flatMap((row) => {
        const parsed = this.parseJson<unknown>(row.payload_json);
        return parsed === null ? [] : [parsed];
      })
    );
    const appState = Object.fromEntries(
      this.selectRows("SELECT key, value FROM app_state ORDER BY key ASC")
        .filter((row) => !/(api[_-]?key|token|secret)/i.test(String(row.key)))
        .map((row) => [String(row.key), row.value === null ? null : String(row.value)])
    );
    const chatHistory = this.selectRows("SELECT id, role, content, personality, weather_context, created_at FROM chat_history ORDER BY id ASC").map((row) => ({
      id: Number(row.id),
      role: String(row.role),
      content: String(row.content),
      personality: row.personality === null ? null : String(row.personality),
      weatherContext: row.weather_context === null ? null : String(row.weather_context),
      createdAt: String(row.created_at)
    }));
    const consentScopes = this.selectRows("SELECT scope_type, path, is_granted, created_at, updated_at FROM consent_scopes ORDER BY created_at ASC").map((row) => ({
      scopeType: String(row.scope_type),
      path: String(row.path),
      granted: Boolean(row.is_granted),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));

    return {
      settings: this.getSettings(),
      appState,
      containers: this.getContainers(),
      layouts: this.getLayouts(),
      desktopFiles: this.getDesktopFiles(),
      chatHistory,
      actionPlans: parsePayloads("action_plans"),
      actionExecutions: parsePayloads("action_executions"),
      scenes: parsePayloads("workspace_scenes"),
      portals: this.getPortalConfigs(),
      consentScopes,
      autoRules: this.getAutoRules()
    };
  }

  clearChatHistory(): void {
    this.getDb().run("DELETE FROM chat_history");
    this.persist();
  }

  persist(): void {
    const db = this.getDb();
    const data = db.export();
    const tmpPath = this.dbPath + ".tmp";
    try { fs.unlinkSync(tmpPath); } catch { /* ok */ }
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, this.dbPath);
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
          `INSERT INTO containers(name, icon, category_filter, position_x, position_y, width, height, sort_order, accent_color)
           VALUES (?, ?, ?, ?, ?, 300, 400, ?, ?)`
        );
        for (const container of DEFAULT_CONTAINERS) {
          statement.run([
            container.name,
            container.icon,
            JSON.stringify(container.filter),
            container.x,
            container.y,
            container.order,
            container.accent
          ]);
        }
        statement.free();
      }

      const defaultLayouts = [
        { name: "舒展 2 列", columns: 2 },
        { name: "默认 4 列", columns: 4 },
        { name: "紧凑 6 列", columns: 6 },
        { name: "高密 8 列", columns: 8 }
      ];
      for (const layout of defaultLayouts) {
        const existing = this.selectRows("SELECT id FROM layouts WHERE columns = ? LIMIT 1", [layout.columns])[0];
        if (!existing) {
          db.run(
            "INSERT INTO layouts(name, columns, grid_template, is_active) VALUES (?, ?, ?, ?)",
            [layout.name, layout.columns, JSON.stringify({ columns: layout.columns, gap: layout.columns >= 6 ? 14 : 18 }), layout.columns === 4 ? 1 : 0]
          );
        }
      }

      this.insertSingleton("wallpaper_config");
      this.insertSingleton("weather_config");
      this.insertSingleton("pet_config");
      this.insertSingleton("ai_config");

      if (this.getAppState("wallpaper_default_enabled_applied") === null) {
        db.run("UPDATE wallpaper_config SET is_dynamic = 1 WHERE id = (SELECT id FROM wallpaper_config ORDER BY id LIMIT 1)");
        this.seedState("wallpaper_default_enabled_applied", "true");
      }

      if (this.getAppState("wallpaper_real_library_default_applied") === null) {
        db.run(
          "UPDATE wallpaper_config SET current_style = 'user', dynamic_id = 'anime-lakeside-station' WHERE id = (SELECT id FROM wallpaper_config ORDER BY id LIMIT 1) AND dynamic_id IS NULL"
        );
        this.seedState("wallpaper_real_library_default_applied", "true");
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

  private peekVersionFromBytes(rawBytes: Buffer): number {
    try {
      const tempDb = new this.SQL!.Database(rawBytes);
      try {
        const result = tempDb.exec("SELECT value FROM app_state WHERE key = 'schema_version'");
        const version = result.length > 0 && result[0].values.length > 0 ? Number(result[0].values[0][0]) : 0;
        return Number.isFinite(version) ? version : 0;
      } finally {
        tempDb.close();
      }
    } catch {
      return 0;
    }
  }

  private migrateInTempDb(rawBytes: Buffer, currentVersion: number): Uint8Array | null {
    const SQL = this.SQL!;
    const tempDb = new SQL.Database(rawBytes);
    let modified = false;

    try {
      tempDb.run(SCHEMA_SQL);

      if (currentVersion < 2) {
        tempDb.run("BEGIN");
        try {
          for (const col of [
            ["desktop_files", "display_name", "TEXT"],
            ["desktop_files", "is_hidden", "INTEGER DEFAULT 0"],
            ["desktop_files", "is_missing", "INTEGER DEFAULT 0"],
            ["desktop_files", "fingerprint", "TEXT"],
            ["portal_configs", "real_path", "TEXT"]
          ] as const) {
            if (!this.columnExistsInDb(tempDb, col[0], col[1])) {
              tempDb.run(`ALTER TABLE ${col[0]} ADD COLUMN ${col[1]} ${col[2]}`);
            }
          }
          tempDb.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, ?)", [new Date().toISOString()]);
          tempDb.run("DELETE FROM app_state WHERE key = 'schema_version'");
          tempDb.run("INSERT OR REPLACE INTO app_state(key, value) VALUES ('schema_version', '2')");
          tempDb.run("COMMIT");
          modified = true;
        } catch {
          tempDb.run("ROLLBACK");
          throw new Error("v2 migration failed");
        }
      }

      if (currentVersion < 3) {
        tempDb.run("BEGIN");
        try {
          tempDb.run(`CREATE TABLE IF NOT EXISTS auto_rules (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, conditions_json TEXT NOT NULL,
            action_type TEXT NOT NULL, action_target TEXT NOT NULL DEFAULT '',
            priority INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1,
            run_count INTEGER NOT NULL DEFAULT 0, last_run_at TEXT, created_at TEXT NOT NULL
          )`);
          tempDb.run("CREATE INDEX IF NOT EXISTS idx_auto_rules_priority ON auto_rules(priority, created_at)");
          tempDb.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (3, ?)", [new Date().toISOString()]);
          tempDb.run("INSERT OR REPLACE INTO app_state(key, value) VALUES ('schema_version', '3')");
          tempDb.run("COMMIT");
          modified = true;
        } catch {
          tempDb.run("ROLLBACK");
          throw new Error("v3 migration failed");
        }
      }

      if (currentVersion < 4) {
        tempDb.run("BEGIN");
        try {
          if (!this.columnExistsInDb(tempDb, "containers", "accent_color")) {
            tempDb.run("ALTER TABLE containers ADD COLUMN accent_color TEXT NOT NULL DEFAULT 'neutral'");
          }
          tempDb.run("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (4, ?)", [new Date().toISOString()]);
          tempDb.run("INSERT OR REPLACE INTO app_state(key, value) VALUES ('schema_version', '4')");
          tempDb.run("COMMIT");
          modified = true;
        } catch {
          tempDb.run("ROLLBACK");
          throw new Error("v4 migration failed");
        }
      }

      const integrity = tempDb.exec("PRAGMA integrity_check");
      const integrityOk = integrity.length === 1
        && integrity[0].values.length === 1
        && String(integrity[0].values[0][0]).toLowerCase() === "ok";
      if (!integrityOk) {
        throw new Error(`Database integrity check failed: ${JSON.stringify(integrity)}`);
      }

      if (modified) {
        const exported = tempDb.export();
        this.cleanupOldBackups(LATEST_SCHEMA_VERSION);
        return exported;
      }
      return null;

    } catch (error) {
      this.logger.error("app", "migration failed, keeping original database", {
        currentVersion,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      try { tempDb.close(); } catch { /* ok */ }
    }
  }

  private columnExistsInDb(db: Database, table: string, column: string): boolean {
    try {
      const result = db.exec(`PRAGMA table_info(${table})`);
      return result.length > 0 && result[0].values.some((row) => String(row[1]) === column);
    } catch {
      return false;
    }
  }

  private cleanupOldBackups(keep: number): void {
    try {
      const dir = path.dirname(this.dbPath);
      const base = path.basename(this.dbPath);
      const backups = fs.readdirSync(dir)
        .filter((f) => f.startsWith(base + ".pre-v") && f.endsWith(".backup"))
        .map((f) => ({ name: f, full: path.join(dir, f) }))
        .sort((a, b) => b.name.localeCompare(a.name));
      for (let i = keep; i < backups.length; i++) {
        try { fs.unlinkSync(backups[i].full); } catch { /* ok */ }
      }
    } catch { /* non-critical */ }
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

  private parseJson<T>(value: unknown): T | null {
    if (typeof value !== "string") {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn("app", "discarded malformed persisted json payload");
      return null;
    }
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
