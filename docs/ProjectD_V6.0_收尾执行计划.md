# Project D V6.0 收尾与开源候选执行计划

> 文档日期：2026-07-30
> 适用平台：Windows 10 / 11
> 当前分支：`codex/v4-free-release`
> 真实 HEAD：`e95b1f6`（checkpoint Project D V6 stage 109+）
> 内部版本：`0.3.0-dev.0`
> 目标：在已落地的 V6.0 架构上，补齐收尾与开源候选门禁

## 0. 为什么需要这份计划（与原计划的关系）

原 `docs/ProjectD_V6.0_沉浸式AI桌面空间重构执行计划.md`、`ACCEPTANCE_CHECKLIST.md`、`PROJECT_STATUS.md` 均写于 **Stage 83 快照（HEAD `7f04dd7`）**，并明确声明：

- "Phase A 尚未开始"
- "旧默认控制台仍有迁移和删除计划（未删除）"

但真实代码已经前进到 **stage 109+**，V6.0 的核心架构（状态机、Surface 组件、App 编排、安全底座）**已经落地**。原文档的 "当前真实基线" 章节已严重偏离当前代码，直接照它执行会重复劳动、误删已建能力，或低估现状。

本文目标：

1. 把计划与 **2026-07-30 真实代码现状** 对齐；
2. 映射 V6.0 完成定义 33 项到真实状态；
3. 定义 **真正剩余的收尾工作**（主要是原 Phase H + 量化验收 + 开源候选门禁）；
4. 给出可执行的阶段划分、验证命令与需人工拍板的决策。

> 原 V6.0 计划的"北极星""不可让步""七层模型""Agent 权限""P0 定义"等约束**继续有效**，本文不重复，只在偏离处引用。

---

## 1. 当前真实状态（代码复盘）

### 1.1 已完成（对照原计划 Phase A–G）

| 领域 | 真实状态 |
|---|---|
| 状态机 | `src/shared/desktop-experience.ts` 完全落地：`native / immersive / task / clean / safe` + `InteractionState` + 单一 `ActiveTaskSurface`，含纯函数 `enterImmersive / openDesktopSurface / closeDesktopSurface / enterNative / enterClean / enterSafe`。 |
| Surface 组件 | 齐全：`EdgeRail`、`AmbientStatus`、`AmbientFileSpace`、`SearchSurface`、`OrganizerSurface`、`SceneSurface`、`WallpaperSurface`、`AssistantSurface`、`CompatibilitySurface`(=Safe/Recovery)、`WallpaperStage`。 |
| App 编排 | `src/renderer/App.vue` 按 V6 状态机编排：四入口、单任务面互斥、Escape 返回 Immersive、Clean/Safe 通道、AmbientFileSpace 仅在 immersive 且无任务面时出现。 |
| 安全底座 | `DesktopController`、`WorkerW/Progman` 宿主、`PauseArbiter`、`SQL.js`、`ActionPlan`（冲突/撤销/中断恢复）、`WorkspaceScene`、本地搜索、文件门户授权、preload IPC 桥、托盘/快捷键、白屏/崩溃/强杀恢复均保留并可测。 |
| 测试基建 | Node 单元测试 + 组件测试 + Playwright E2E（30+ spec，覆盖 assistant / search / organizer / scene / wallpaper / weather / clean / force-kill / ai-no-key / corrupted-config 等）。 |
| 默认界面 | 新 shell 已是默认；旧控制台 `OverlayPage / PetPage / WallpaperPage` 仅通过 `#/overlay`、`#/pet`、`#/wallpaper` 显式可达。`WallpaperPage` 仍被 `SceneSurface` 的"图库"动作桥接打开（刻意保留的详情视图，非默认）。 |

**验证证据（2026-07-30 实跑）：** `pnpm test` → **254/254 Node 测试通过**（计划记录基线为 235，已增长）。工作区为脏状态（stage 109 之后有未提交改动），但单元测试健康。

### 1.2 未关闭（真正剩余）

1. **旧控制台未删除**：`OverlayPage.vue`、`PetPage.vue`、`WallpaperPage.vue` 及对应路由仍存在（`SettingsPage` 按计划保留为独立设置窗口，不删）。原 Phase H 要求"能力等价验证后删除旧默认控制台"。
2. **重复状态/CSS 未清理**：`styles.css` 仍约 3600 行，包含旧控制台与新 shell 两套样式；存在计划禁止的"用 CSS 隐藏旧产品"残留风险。
3. **量化指标未验证**：壁纸可感知面积 ≥72%、常驻玻璃 UI 15%–22%、中央安全区 ≥50%、四档性能档位、多屏/横竖/100–200% DPI 可读性——均为代码具备但**未经视觉/性能 QA 实测**。
4. **桌宠渲染路径需确认**：`PetPage` 仅由 `#/pet` 路由挂载；`WallpaperStage` 不含桌宠渲染代码；CSS 中存在 `body.pet-window-body`，表明桌宠由**独立 pet window**承载。需核实沉浸式桌宠锚点是否已完全由新 `scene-anchor` 驱动，且 `PetPage` 路由是否仅为遗留/调试入口。
5. **物理硬件/安装/长浸泡证据未关闭**：真实多屏、混合 DPI、热插拔、睡眠/唤醒、锁屏/解锁、安装/覆盖升级/卸载、4h/24h 浸泡、代码签名与素材授权证据仍缺。
6. **工作区脏**：stage 109 之后的未提交改动（多个 `tests/e2e/*.spec.ts`、`main` 进程、`renderer` 组件、`AmbientFileSpace/RecoverySurface/WallpaperSurface` 等新文件、`qa-*` 脚本）建议先结构化提交再收尾，避免混乱。

---

## 2. V6.0 完成定义（33 项）现状映射

| # | 完成标准 | 状态 | 备注 |
|---|---|---|---|
| 1 | 目标版本统一 | ✅ | 文档/计划均统一引用 V6.0；内部版本仍 `0.3.0-dev.0`（计划允许） |
| 2 | Native 接近 Windows | 🟡 | 代码具备，需视觉 QA 确认不抢焦点/不拦鼠标 |
| 3 | 打开后进入参考图方向 Immersive | 🟡 | `wakeImmersive` 已实现，需面积/构图实测 |
| 4 | 无传统大主窗 | 🟡 | 默认已是新 shell；`OverlayPage` 仍作为路由存在，删后达成 |
| 5 | 壁纸/天气/桌宠/玻璃/工具统一 | ✅ | 统一在 App shell 编排下 |
| 6 | 桌宠不固定右侧 | ✅ | 锚点/安全区驱动（需 §1.2-4 核实 pet window） |
| 7 | 四入口 | ✅ | `EdgeRail` 固定 search/organize/scene/assistant |
| 8 | 壁纸面积 ≥72% | ⬜ | 未实测（视觉 QA） |
| 9 | 任务按需展开 | ✅ | 单任务面 on-demand |
| 10 | 最多一个任务面 | ✅ | `ActiveTaskSurface` 唯一性约束 |
| 11 | Task 返回 Immersive | ✅ | `closeDesktopSurface → enterImmersive` |
| 12 | 文件可虚拟整理 | ✅ | `AmbientFileSpace` + `OrganizerSurface` |
| 13 | 未确认不真实移动 | ✅ | `ActionPlan` 确认 + AI 不绕过 |
| 14 | 整理闭环完整 | ✅ | 发现→方案→冲突→预览→确认→执行→撤销→恢复 |
| 15 | Clean 可进退 | ✅ | `enter/exitCleanDesktop` + Escape |
| 16 | Clean 恢复前态 | ✅ | 退出返回进入前模式 |
| 17 | Agent 权限清楚 | 🟡 | A/B/C 分级已定义，运行时强制需核查 |
| 18 | AI 不绕过 ActionPlan | ✅ | 强制路径 |
| 19 | 无 Key 本地可用 | 🟡 | `ai-no-key-fallback` E2E 存在，需复跑确认 |
| 20 | 明暗/多屏/横竖/DPI 可读 | 🟡 | 主题 + 多显示器支持具备，需 QA |
| 21 | 核显可降级 | 🟡 | `static/battery/balanced/high` + `PauseArbiter`，需性能 QA |
| 22 | 不以黑屏卡顿换特效 | 🟡 | 回退/封面/恢复具备，需 QA |
| 23 | 正常退出恢复 | ✅ | tray exit E2E 存在 |
| 24 | 白屏恢复 | ✅ | 渲染器韧性 supervisor |
| 25 | 崩溃恢复 | ✅ | supervisor + WMI 看门狗 |
| 26 | 强杀恢复 | ✅ | `force-kill-recovery` E2E |
| 27 | 旧控制台删除 | ⬜ | 路由仍在（本文 §3 阶段 W2） |
| 28 | 无两套默认界面 | 🟡 | 默认唯一；遗留路由待删 |
| 29 | 重复状态/CSS 清理 | ⬜ | `styles.css` 含两套样式（W3） |
| 30 | 自动化不低于当前 | ✅ | 254 测试 + 30+ E2E，且增长 |
| 31 | 权利边界清楚 | 🟡 | 同 #17 |
| 32 | 安装包无未批准素材 | ⬜ | 需 `pnpm verify:assets` 实测 |
| 33 | 无已知 P0 | ⬜ | 需 P0 审计（本文 §6） |

图例：✅ 已达成（代码+测试）｜🟡 已具备待量化/复跑验证｜⬜ 未完成。

---

## 3. 收尾阶段划分（取代原 Phase H，含等价验证）

原 Phase H 的目标不变——"删除旧 UI 与开源候选版"——但执行顺序必须先从**等价审计**开始，禁止先删后验。

### 阶段 W1：等价审计与迁移契约（先验证再删）
- 为每个待删旧页面建立"能力等价表"：旧能力 → 新 Surface 覆盖点 → 是否等价 → 是否有测试。
  - `OverlayPage`（整理/搜索/场景/门户/ActionPlan/预览）→ `OrganizerSurface` + `SearchSurface` + `SceneSurface` + `CompatibilitySurface`。
  - `PetPage`（角色/动作/人格/漫游/建议/安全区）→ pet window + `SceneSurface` 锚点 + `AssistantSurface` 短气泡。
  - `WallpaperPage`（库/导入/Live Photo/显示器映射/画布）→ `WallpaperSurface` + `SceneSurface` 图库桥。
- **核实 §1.2-4 桌宠渲染路径**：确认 pnpm 启动后沉浸式桌宠由 pet window + scene-anchor 驱动，而非依赖 `#/pet` 路由。
- 复跑关键 E2E 确认新 Surface 已覆盖旧能力：`pnpm test:e2e:built`（需 `pnpm build`，串行，预算 >7 分钟）。
- 任何"不等价"项进入 W2 的补齐清单，禁止删除未覆盖能力。

### 阶段 W2：删除旧控制台（Overlay/Pet/Wallpaper 路由 + 组件）
- 仅当 W1 等价表全部 ✅ 后执行。
- 删除 `src/renderer/views/OverlayPage.vue`、`PetPage.vue`、`WallpaperPage.vue` 及其路由分支（`isOverlayRoute/isPetRoute/isWallpaperRoute` 与 `App.vue` 中对应 `v-else-if`）。
- `SettingsPage` 保留为独立设置窗口，不删。
- 删除 `SceneSurface` 对 `WallpaperPage` 的桥接（`openWallpaperPage`），改由 `WallpaperSurface` 内联图库。
- 验证：删除后默认界面唯一、无路由可达旧控制台。

### 阶段 W3：CSS/状态清理与令牌落地
- 拆分 `styles.css`（3633 行）为 `tokens.css / base.css / native.css / immersive-shell.css / edge-rail.css / task-surface.css / organizer.css / assistant.css / pet.css / wallpaper.css / weather.css / clean.css / recovery.css`。
- 删除旧控制台遗留样式与"用 CSS 隐藏旧产品"的残留。
- 提升跨页面共享状态到 `desktop-experience.ts` / 新的 shell store，禁止用大量 `showXxx` 代替状态机。

### 阶段 W4：视觉/性能量化验收
- 面积预算 QA：Immersive 壁纸 ≥72%、常驻玻璃 15%–22%、中央安全区 ≥50%（脚本化截图 + 像素占比测量）。
- 四档性能：`static/battery/balanced/high` 在 1080p 的 CPU/内存基线（复用 `qa:soak`、`runtime-metrics`）。
- 多屏 / 横竖 / 100–200% DPI 可读性（浏览器模拟仅早期证据，需真机补充）。
- 天气五通道与全屏 2 秒内暂停高频层（复用 `weather-quality-matrix`、`qa:weather-visual`）。
- 不依赖线条圆点；不黑屏；不破坏穿透与 Safe。

### 阶段 W5：开源候选打包与素材登记
- `pnpm verify:assets`（素材登记：来源/作者/用途/分发状态，MIT 不自动覆盖视觉素材）。
- `pnpm verify:supply-chain --audit-level high`。
- `pnpm dist` + `pnpm verify:packaged` + `pnpm verify:package-budget`（安装包无未批准素材，区分 Electron/业务/依赖/壁纸/视频/桌宠/字体）。
- README、SHA256、素材授权证据、贡献指引。

### 阶段 W6（可并行/外部）：长浸泡与硬件证据
- 真实多屏、混合 DPI、热插拔、睡眠/唤醒、锁屏/解锁、安装/覆盖升级/卸载、4h/24h 浸泡。
- 代码签名与素材授权法律证据。
- 不阻断 W1–W5 的代码收尾，但阻塞"开源候选发布"对外宣称。

---

## 4. 每阶段任务与最小验证命令

| 阶段 | 主要修改 | 最小验收命令 | 主要风险 |
|---|---|---|---|
| W1 | 等价表、pet 渲染核实、E2E 复跑 | `pnpm test`、`pnpm test:component`、`pnpm test:e2e:built` | 误判等价、pet window 路径错 |
| W2 | 删 3 个旧 view + 路由 + 桥接 | `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build` | 删掉未覆盖能力、路由残留 |
| W3 | 拆 `styles.css`、清理状态 | `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:component` | 视觉回归、令牌缺失 |
| W4 | 面积/性能 QA 脚本与证据 | `pnpm qa:v51-visual-matrix`、`pnpm qa:weather-visual`、`pnpm qa:soak` | 面积不达标、核显高占用 |
| W5 | 素材/供应链/打包/README | `pnpm verify:assets`、`pnpm verify:supply-chain`、`pnpm dist`、`pnpm verify:packaged` | 未授权素材混入、预算超 |
| W6 | 硬件/浸泡/签名（外部） | 手动 + 真机 | 时间成本高、需真机 |

---

## 5. 当前工作区处理建议

stage 109 之后有未提交改动（新 Surface、`qa-*` 脚本、E2E 更新）。建议**先结构化提交**再开始 W1，避免收尾过程中脏工作树与删除操作互相干扰：

1. `git add` 仅本次相关的 Surface/测试/脚本，按"能力"分组 commit（如 `feat: add AmbientFileSpace virtual organization`、`test: extend organizer e2e`）。
2. 保留 `docs/V4.0_UI收敛/`（未跟踪，历史参考，由你决定是否纳入版本控制）。
3. 提交后再从真实 HEAD 继续 W1。

> 不回退到 `86ae722` 或 `7f04dd7`：当前 HEAD `e95b1f6` 已是有效施工基线，回退会丢失后续修复。

---

## 6. P0 审计（完成定义 #33）

对照原 V6.0 §28 P0 清单，逐项确认当前代码是否触发：

- [ ] 白屏遮桌面且无法关闭 → 渲染器韧性 + Safe 层应已覆盖
- [ ] 黑屏无法恢复 → 封面/上一帧回退应已覆盖
- [ ] 图标/任务栏退出后不可见 → `windows-desktop-icons`/`windows-taskbar` 看门狗已覆盖
- [ ] 壁纸宿主永久黑屏 → `wallpaper-host` 回退已覆盖
- [ ] 整理错误移动/覆盖/丢失 → `ActionPlan` 确认 + 撤销已覆盖
- [ ] 强杀无法恢复 Explorer → WMI 看门狗已覆盖
- [ ] Clean 无法恢复 → `clean-desktop-escape` 已覆盖
- [ ] 透明层阻止 Windows → 输入穿透不变量需 W4 实测
- [ ] API Key/完整私人路径进日志 → `logger` 脱敏需核查
- [ ] 私人文件未经授权上传 → 隐私暂停 + 最小披露需核查
- [ ] 桌宠崩溃导致桌面不可用 → pet window 隔离需核查
- [ ] 两套默认界面长期并存 → 默认唯一，旧路由待删（W2）

任一 ⬜ 项在 W1/W2 期间需先修复再删旧 UI。

---

## 7. 需你拍板的人工决策

原计划 §34 列出、至今未决：

1. 边缘轨（EdgeRail）是否自动换边（依据任务栏位置/DPI）。
2. Clean 是否默认隐藏任务栏。
3. 连续对话是否保持显示器唤醒。
4. 合法雨夜素材与角色分发状态（开源素材授权）。
5. 是否接受"默认 shell 已替代旧控制台"，从而授权 W2 删除 `#/overlay`、`#/pet`、`#/wallpaper` 路由。
6. `docs/V4.0_UI收敛/` 是否纳入版本控制。

---

## 8. 进入条件与建议起点

- W1 不需要额外人工输入即可开始（除 §7-5 授权外）。
- 建议起点：**先按 §5 提交脏工作树 → 启动 W1 等价审计（重点核实 pet 渲染路径与三个旧页面的能力覆盖）→ 复跑 E2E**。
- 全程禁止：先于等价验证删除旧 UI、用 CSS 隐藏代替删除、回退到历史锚点、让 AI 绕过 ActionPlan 确认、在旧 UI 上嵌套新壳。

---

## 9. 验收门禁（开源候选发布前全量）

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:component
pnpm test:e2e
pnpm test:coverage
pnpm build
pnpm verify:assets
pnpm verify:supply-chain
pnpm qa:v51-visual-matrix
pnpm qa:packaged-smoke
pnpm dist
pnpm verify:packaged
pnpm verify:package-budget
```

V6.0 应新增：状态矩阵 QA、UI 面积预算 QA（§W4）。无 P0、仅一个默认界面、残留进程 0、安装包无未批准素材，方可对外宣称开源候选。
