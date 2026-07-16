# Project D 改动思路报告

> 接手日期：2026-07-06  
> 当前状态：typecheck 零错误，build 通过  
> 总源码：约 16000 行 / 40+ 文件

---

## 总览

所有改动围绕一个核心原则展开：**让 Project D 从"能演示的 Beta"变成"可交付的商业 V2"。** 每个改动都有对应的 V2.1 方案章节约束。

共完成 **10 个大项**，其中 7 项我自己写、3 项派子 Agent 并行完成。以下是逐项说明。

---

## 第 1 项：200 句温暖对话集成

**为什么做：** 用户提供了 Word 文档，要求桌宠自动随机弹出。

**做了什么：**
- 新建 `src/shared/warm-sentences.ts`（225 行），从 Word 文档提取 200 句温暖短句
- 重写 `src/renderer/views/PetPage.vue`，集成自动气泡系统

**关键决策：**
- 气泡随机 3-15 分钟弹出一次，显示 60 秒后自动消失
- 点击气泡关闭，双击本体打开主界面
- 后来被 Codex Stage 28 完全重写为精灵图系统，但 `warm-sentences.ts` 保留作为人格短句的来源

---

## 第 2 项：壁纸资源处理

**为什么做：** 用户提供了 4 个壁纸文件（1 个视频、3 个静态图）。

**做了什么：**
- 复制到 `assets/wallpapers/user/` 和 `public/wallpapers/`
- 更新 `WallpaperStage.vue` 支持 `user` 风格的视频/图片背景

**关键决策：**
- dev 模式用 `/wallpapers/` 路径（Vite public 目录），生产模式用 `./assets/wallpapers/user/`（electron-builder extraResources）
- 后来被 Stage 15 升级为完整的 `WALLPAPER_LIBRARY` 系统（`shared/wallpaper-library.ts`），壁纸从 4 张扩展到 12 张

---

## 第 3 项：桌宠人像动画

**为什么做：** 用户提供了 Luna 角色设计图。

**做了什么：**
- 最初将设计图作为 CSS background 裁剪使用
- 后来被 Codex 完全重写为精灵图系统（`public/pet/luna-q/` 下 10 张状态图 + `manifest.json`）

**当前状态：** 10 种宠物状态（idle/happy/cheerful/thinking/sitting/sleepy/sleeping/rain/winter/summer），含天气换装和自动漫游。

---

## 第 4 项：容器拖拽 + 预览面板 + 拉绳 + 布局

**为什么做：** V1 验收标准 P1 缺口。

**做了什么：**
- `OverlayPage.vue` 重写：容器 pointer 拖拽 + 松手保存到数据库
- 文件单击滑出预览面板（支持 20+ 文本格式 + 8 种图片格式）
- 工具栏拉绳切换壁纸风格
- 布局下拉菜单

**关键决策：**
- 拖拽使用 window-level `pointermove` 监听（不依赖 `setPointerCapture`）
- 文件预览通过 IPC `preview:file` → 主进程读取文件内容
- 后来被 Stage 16/21/27 多次增强（吸附对齐、容器缩放、文件 DnD、右键菜单完善）

---

## 第 5 项：主进程 IPC 模块拆分

**为什么做：** V2.1 方案 Gate 0 要求"按领域拆分 IPC router 与 sender 校验"，原 `main.ts` 2183 行单文件不可维护。

**做了什么：**
- 新建 5 个 IPC 模块文件：
  - `main/ipc/desktop-ipc.ts` — 桌面生命周期 + 文件管理（17 个 handler）
  - `main/ipc/settings-ipc.ts` — 设置/壁纸/天气/AI（9 个 handler）
  - `main/ipc/window-ipc.ts` — 窗口管理（3 个 handler）
  - `main/ipc/pet-ipc.ts` — 桌宠管理（8 个 handler）
  - `main/ipc/suggestion-ipc.ts` — 建议/诊断（8 个 handler）
- 新建 `main/ipc/register-all.ts` — DI 注册桥，连接所有模块到 main.ts
- `main.ts` 从 2183 行 → 1633 行（-550 行，删除 43 个重复 handler）

**每个模块的设计模式：**
```
interface XxxIpcDependencies { ... }          // 依赖声明
function registerXxxIpcHandlers(deps) { ... }  // 注册函数
```
通过依赖注入（DI）模式接收 `ipc` 实例和 `assertTrustedSender` 守卫，不直接依赖全局变量。

**注意（接手必读）：**
1. 所有 handler 只通过 `registerAllIpcHandlers(buildIpcDeps())` 注册一次
2. `buildIpcDeps()` 在 `main.ts` 中定义，把所有全局变量/函数注入到 ServiceDeps
3. **绝对不要在 main.ts 中再新增直接 `ipcMain.handle()` 调用**，应添加到对应的 ipc 模块文件
4. sender 白名单必须和原代码对齐，特别是 `#/wallpaper` 路由

---

## 第 6 项：数据库迁移与回滚

**为什么做：** V2.1 方案 Gate 0 要求"正式 schema version 和迁移流水线"、"迁移失败自动回滚"。

**原始问题：**
- `initialize()` 流程是 `SCHEMA_SQL → runMigrations()`，SCHEMA_SQL 已经改了内存，备份在迁移之后
- `persist()` 直接 `writeFileSync(dbPath)`，写入中途崩溃会损坏数据库

**做了什么（`database.ts`）：**

1. **`initialize()` 重写：**
   - 新增 `createdNow` 分支：全新安装跳过迁移
   - 已有数据库：`fs.readFileSync(dbPath)` → 备份到 `.pre-v${version}.backup` → 在临时 sql.js 实例上迁移 → integrity_check → 原子替换

2. **`migrateInTempDb()` 新方法：**
   - 从 `rawBytes` 创建临时 `new SQL.Database(rawBytes)`（不是 `this.db`）
   - 在临时库上逐版本执行 migration（`BEGIN → ALTER → COMMIT`）
   - 执行 `PRAGMA integrity_check` 并确认返回 `"ok"`
   - 导出 `tempDb.export()` → 原子替换 `dbPath`

3. **`peekVersionFromBytes()` 新方法：**
   - 从原始字节创建临时库，读取 `schema_version`，不污染当前实例

4. **`persist()` 原子化：**
   - `export()` → `writeFileSync(dbPath + ".tmp")` → `renameSync(tmp, dbPath)`

5. **`columnExistsInDb(db, table, column)` 新方法：**
   - 接收指定 db 实例参数，执行 `PRAGMA table_info` 检查列是否存在
   - 替代旧的 `ensureColumn`（已删除）

**迁移失败处理：**
- 临时库迁移失败 → `catch` 记录日志 → 返回 `null` → 旧库完好无损
- 原子替换后不会回退（rename 是 NTFS 原子操作）
- 保留最近 2 个备份文件

---

## 第 7 项：Everything / Windows Search 三档降级

**为什么做：** V2.1 方案 Gate 3 要求"Everything → Windows Search → 局部索引"。

**做了什么：**

1. **`search/everything-provider.ts`（新，194 行）：**
   - 注册表检测 Everything 安装路径（HKLM 两处 + `%APPDATA%` 便携版）
   - 使用 ES.exe CLI：`spawn(esExe, [query, "-n", limit, "-csv", ...])`
   - 输入过滤：移除控制字符，限制 200 字符长度
   - 超时 8 秒、stdout 最大 256KB
   - 解析 CSV 输出 → `SearchCandidate[]`

2. **`search/windows-search-provider.ts`（新，15 行）：**
   - V2 阶段 stub，返回空数组
   - 接口已预留，后续可接入 Windows Search COM API

3. **`search/search-service.ts` 重写：**
   - `SearchOrigin` 扩展为 `"desktop" | "portal" | "everything" | "windows-search"`
   - `search()` 方法：三档串行降级（不是并行）
     - 先查 Everything → 再查 Windows Search → 最后 boost 桌面/门户结果
   - 局部结果不截断全局搜索（merge 而非 replace）
   - 新增 `providerScore` 字段用于归一化评分

4. **`main.ts` 接线：**
   - SearchService 构造时注入 `everythingSearch` 和 `windowsSearch` provider
   - `isEverythingAvailable()` 在启动时检测一次

---

## 第 8 项：完整数据导出 + 两阶段全量删除

**为什么做：** V2.1 方案 Gate 4 要求"隐私中心"、"数据导出"、"彻底删除"。

**做了什么：**

1. **IPC 通道（`shared/ipc.ts`）：**
   - `PRIVACY_EXPORT_DATA: "privacy:export-data"`
   - `PRIVACY_RESET_ALL: "privacy:reset-all-data"`

2. **导出 handler（`main.ts`）：**
   - 收集聊天记录、动作历史、场景、门户（路径脱敏）、偏好（不含 API Key）
   - `dialog.showSaveDialog` → 写入 JSON

3. **删除 handler（`main.ts`）— 两阶段设计：**
   - **阶段一（当前进程）：** 关闭 watcher/suggestion → 恢复桌面宿主 → 关闭所有窗口 → 写入 `reset-requested.json` → `app.relaunch()` → `app.exit(0)`
   - **阶段二（新进程启动时，`app.whenReady` 中）：** 检测 `reset-requested.json` → 删除日志/缓存/备份/诊断 → 正常启动（等同于全新安装）

4. **前端（`preload.ts` + `types.ts`）：**
   - `exportAllData()` → `Promise<{ cancelled: boolean; filename: string | null }>`
   - `resetAllData()` → `Promise<void>`

---

## 第 9 项：Luna → ActionPlan（受控入口）

**为什么做：** V2.1 方案要求"AI 不直接操作文件，Luna 只能输出结构化请求"。

**做了什么（`actions/action-engine.ts`）：**

1. **`createLunaMovePlan(files, target)` — 受限入口：**
   - 不接受任意 `ActionPlanItem[]`，只接受文件 ID 列表 + 目标描述
   - target 解析：`KnownFolderRef`（{ kind: "known-folder", value: "documents"|"downloads"|... }）或 `ContainerRef`（{ kind: "container", containerId: number }）
   - 内部完成路径解析和安全检查
   - Plan 写入数据库（不做纯内存暂存）

2. **`resolveKnownFolder(value)` — 目标解析：**
   - 将自然语言目标（"文档"→"documents"）映射到 Project D 收纳子目录

3. **`createDesktopInboxPlan()` 保留不变**

---

## 第 10 项：Action Engine 故障恢复

**为什么做：** V2.1 方案 Gate 1 要求"进程崩溃后可恢复一致状态"。

**做了什么：**

1. **`action-engine.ts` — per-item journal（`moveOne` 方法重写）：**
   - 移动前记录 pre-move identity：`{ size, mtimeMs, birthtimeMs, dev, ino }`（NTFS 稳定标识）
   - 移动后记录 post-move identity 并比对
   - journal 写入 `(item as any).journalPreIdentity` / `journalPostIdentity`（临时类型，后续应扩展 `ActionPlanItem`）

2. **`action-recovery.ts` — identity 验证：**
   - 新增 `verifyMoveIdentity(targetPath, preIdentity, fsStat)` 函数
   - 同盘移动：按 dev/ino 比对（NTFS 稳定）
   - 跨盘移动：按 size + mtime + birthtime 比对（较不可靠）
   - `classify()` 扩展为接受 `identityMatch?: boolean` 参数
   - identity 不匹配 → `"conflicted"` 状态（不是自动 abandoned）

3. **`shared/types.ts` — 状态扩展：**
   - `ActionItemStatus` 新增 `"contested"` 和 `"abandoned"`

---

## 已通过子 Agent 并行完成的三项

这三项由子 Agent 独立完成，我验证了 typecheck：

### A. 快捷键设置 UI
- SettingsPage.vue 新增录制输入框 + IPC handler
- 按 live 录制键位组合 → Enter 确认 → 失败保留旧键并提示冲突

### B. 场景数据结构补全
- 新增 `DesktopResourceRef` 类型
- `WorkspaceScene` 新增 `pinnedResources`、`displayAssignments`、`todoSummary`
- `SceneService` 新增字段初始化和恢复逻辑

### C. 自动规则模型 + 搜索结果动作
- `shared/auto-rules.ts`：`AutoRule` 类型 + `evaluateAutoRule()` + `createAutoRule()`
- `main/auto-rules/auto-rules-service.ts`：SQL schema + 序列化
- `search-ipc.ts`：新增 `pin-to-scene`、`add-to-portal`、`resolve-path` IPC
- `OverlayPage.vue`：搜索卡片新增"钉到场景"和"复制路径"按钮

---

## 文件改动清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `shared/warm-sentences.ts` | **新建** | 200 句温暖短句 |
| `shared/ipc.ts` | 修改 | 新增 6 个 IPC 通道 |
| `shared/types.ts` | 修改 | 新增 8 个接口/类型、扩展 3 个联合类型 |
| `shared/auto-rules.ts` | **新建** | 自动规则模型 |
| `shared/pet-behavior.ts` | **新建** | 宠物人格定义 |
| `shared/wallpaper-library.ts` | **新建** | 壁纸库清单 |
| `shared/onboarding.ts` | **新建** | 新手引导状态 |
| `shared/entitlement.ts` | **新建** | Free/Pro 分层 |
| `main/main.ts` | 重大修改 | -550 行，IPC 全迁出到模块 |
| `main/database.ts` | 重大修改 | 迁移重写 + atomic persist |
| `main/actions/action-engine.ts` | 修改 | Luna Plan + per-item journal |
| `main/actions/action-recovery.ts` | 修改 | identity 验证 |
| `main/actions/action-ipc.ts` | **新建** | 动作 IPC handler |
| `main/ipc/desktop-ipc.ts` | **新建** | 桌面 IPC handler |
| `main/ipc/settings-ipc.ts` | **新建** | 设置 IPC handler |
| `main/ipc/window-ipc.ts` | **新建** | 窗口 IPC handler |
| `main/ipc/pet-ipc.ts` | **新建** | 桌宠 IPC handler |
| `main/ipc/suggestion-ipc.ts` | **新建** | 建议 IPC handler |
| `main/ipc/register-all.ts` | **新建** | DI 注册桥 |
| `main/search/everything-provider.ts` | **新建** | ES.exe 适配器 |
| `main/search/windows-search-provider.ts` | **新建** | WS stub |
| `main/search/search-service.ts` | 重写 | 三档降级搜索 |
| `main/search/search-ipc.ts` | 修改 | 搜索结果动作 |
| `main/auto-rules/auto-rules-service.ts` | **新建** | 规则引擎 |
| `main/portals/portal-ipc.ts` | **新建** | 门户 IPC handler |
| `main/scenes/scene-ipc.ts` | **新建** | 场景 IPC handler |
| `main/entitlement.ts` | **新建** | Free/Pro 许可 |
| `preload/preload.ts` | 修改 | 新增 6 个 API 方法 |
| `renderer/views/OverlayPage.vue` | 多次修改 | 拖拽/DnD/搜索/预览 |
| `renderer/views/PetPage.vue` | 多次修改 | 气泡/精灵图/人格 |
| `renderer/components/OnboardingFlow.vue` | **新建** | 新手引导 |
| `settings/SettingsPage.vue` | 多次修改 | 隐私/快捷键/场景等 |
| `renderer/styles.css` | 多次修改 | 预览/搜索/工具栏样式 |
| `renderer/main.ts` | 修改 | mockApi 补全 |

---

## 对后续接手的建议

1. **所有 IPC handler 都在 `main/ipc/` 下**，加新功能时先在对应模块找模板
2. **不要不指定 model 参数派子 Agent**，派之前确认模型 ID 存在
3. **改完代码后立即 `pnpm typecheck`**，不要堆到最后
4. **sender 白名单有 `#/wallpaper` 这个特殊路由**，壁纸窗口会调 settings API
5. **数据库迁移只有 v1→v2**，加 v3 时在 MIGRATIONS 常量中追加即可
6. **`createLunaMovePlan` 的 journal identity 用 `(item as any)` 临时类型**，正式接入时应扩展 `ActionPlanItem` 接口
7. **`main.ts` 的 `buildIpcDeps()`** 是唯一连接全局变量和 IPC 模块的地方，修改全局变量后同步更新这里
