# Project D V6.0 沉浸式 AI 桌面空间重构执行计划

- 产品目标版本：V6.0
- 文档名称：Project D V6.0 沉浸式 AI 桌面空间重构执行计划
- 文档日期：2026-07-27
- 适用平台：Windows 10 / Windows 11
- 当前代码分支：`codex/v4-free-release`
- 重构起点提交：`86ae722da1b1cfc2379937c9b20b72633f53e5c3`
- 重构起点标签：`v5.1-wallpaper-first-baseline-20260724`
- 本轮审计 HEAD：`7f04dd76b4b73e76fa912d023a3b29e2bef6dd71`
- 当前程序内部版本：`0.3.0-dev.0`
- 当前目标：个人使用优先、开源候选版
- 文档状态：设计、开发、测试与验收统一执行基线

> V6.0 是产品目标；`0.3.0-dev.0` 是程序内部版本；历史标签是重构前快照；V4.0 与 V5.1 是历史方案，不再作为当前目标版本。

## 1. 执行结论

Project D 已经拥有较完整的桌面基础设施，但仍处在“壁纸优先理念已经进入代码、默认体验仍由控制台结构主导”的过渡状态。

V6.0 不增加新的大型页面，也不重写数据库、搜索、Action Engine 或 Windows 桌面宿主。核心工作是建立统一体验状态、统一桌面分层、迁移已有功能、删除旧默认控制台，并让所有能力围绕同一场景运行。

产品应从：

> 功能完整但由控制台主导的桌面管理工具

升级为：

> 平时尊重 Windows、打开后进入沉浸世界、需要时提供 Agent 工作能力、可以纯享陪伴、任何情况下都能安全恢复的 AI 桌面空间。

## 2. 产品北极星

Project D 不是：

- 带壁纸的文件管理器；
- 带桌宠的聊天程序；
- 传统大型控制中心；
- Windows Shell 替代品；
- 新操作系统；
- 全屏文件管理器；
- 在壁纸上堆叠大量功能卡片的后台界面。

Project D V6.0 是：

> 运行在 Windows 原生桌面体系之上的、本地优先、可退出、可恢复的沉浸式 AI 桌面空间。

统一产品表达：

> 壁纸构成世界，  
> 天气改变空气，  
> 桌宠生活在其中，  
> 文件遵守空间秩序，  
> AI 负责理解和行动，  
> 工具只在需要时出现，  
> 任务完成后桌面重新安静。

不可让步：

1. Windows 的退出、恢复和操作权高于视觉效果。
2. 未经确认，不真实移动、覆盖、删除或上传用户文件。
3. 新体验完成后删除旧默认控制台，不长期维护两套产品。

## 3. 当前真实基线

### 3.1 Git、版本与阶段

| 项目 | 真实状态 |
|---|---|
| 当前分支 | `codex/v4-free-release` |
| 当前 HEAD | `7f04dd76b4b73e76fa912d023a3b29e2bef6dd71` |
| 历史起点 | `86ae722da1b1cfc2379937c9b20b72633f53e5c3` |
| 历史标签 | `v5.1-wallpaper-first-baseline-20260724`，指向 `86ae722` |
| 内部版本 | `0.3.0-dev.0` |
| 当前阶段 | Stage 83：Packaged FPS IPC Route Repair |
| 当前安装包 | 约 152.9 MB |
| 工作区额外内容 | 未跟踪的 `docs/V4.0_UI收敛/`，本计划不修改 |

`86ae722` 是 V5.1 快照锚点；`7f04dd7` 包含 Stage 55–83 实现。Phase A 必须以当前 HEAD 为有效施工基线，不能回退并丢失后续修复。

### 3.2 上游文档差异

命令引用的根目录文件 `ProjectD_V4.0_沉浸式桌面层体验收敛计划.md` 在当前工作树中不存在。

实际可审计资料：

- `docs/ProjectD_V5.1_壁纸主导沉浸式桌面成品计划.md`；
- `docs/visual-concepts/v4-ambient/README.md`；
- 未跟踪的 `docs/V4.0_UI收敛/V4.0_UI收敛计划.md`；
- Stage 53–83 状态与开发记录。

本计划继承这些真实资料中的产品原则和安全边界，不编造不存在的已跟踪文件。

未跟踪的 `docs/V4.0_UI收敛/` 仅作为历史参考和用户待处理内容，不是第二套现行执行计划。其“四入口不含助手”“Luna 固定右侧且仅主屏显示”等决策已被本轮 V6.0 明确覆盖。该目录是否纳入版本控制由用户后续决定，不影响 V6.0 的唯一执行权。

### 3.3 最近验证证据

- Node 测试：235/235 通过；
- Lint、三路类型检查：通过；
- 生产构建和 `pnpm dist`：通过；
- 打包模块验证：38 个模块通过；
- 打包 Smoke：启动、核心就绪、退出、清理通过，错误日志为空；
- 最近完整 Electron E2E 成功基线：11/11；
- 最近 V5.1 视觉矩阵成功基线：9/9；
- 最近一次 E2E 重跑被外部 7 分钟命令超时终止，不能记为产品通过或失败。

未关闭：

- Windows 10/11、Intel/AMD/NVIDIA 真实矩阵；
- 真实多屏、混合 DPI、热插拔；
- 睡眠/唤醒、锁屏/解锁；
- 用户 MP4/MOV/WebM Live Photo；
- 安装、覆盖升级、卸载；
- 4 小时和 24 小时浸泡；
- 代码签名与素材授权证据。

## 4. 当前窗口与代码职责

| 文件/窗口 | 当前职责 | V6.0 判断 |
|---|---|---|
| `App.vue` | 路由、壁纸、边缘轨、文件网格、控制中心、搜索、建议、整理、聊天 | 收敛为体验状态与任务面编排 |
| `OverlayPage.vue` | 整理覆盖层、容器、搜索、门户、场景、ActionPlan、预览 | 保留闭环，迁移为 Organizer Surface |
| `PetPage.vue` | 桌宠窗口、动作、人格、漫游、建议、安全区 | 保留，改由场景锚点驱动 |
| `WallpaperPage.vue` | 壁纸库、导入、Live Photo、显示器映射、画布 | 迁移为 Wallpaper Surface |
| `WallpaperStage.vue` | 壁纸、回退、天气、性能、FPS | 可靠宿主，扩展氛围分层 |
| `ChatPanel.vue` | 历史、发送、意图预览 | Assistant Surface 内部组件 |
| `SettingsPage.vue` | 11 个设置领域 | 保留独立管理空间，后续拆分 |
| `styles.css` | 全局及全部领域样式 | 拆分令牌与领域样式 |

大型文件：

| 文件 | 行数 | 主要问题 |
|---|---:|---|
| `styles.css` | 3633 | 令牌、状态和领域样式混杂 |
| `main.ts` | 2852 | 窗口、宿主、恢复、协议和生命周期集中 |
| `SettingsPage.vue` | 2121 | 11 个领域集中 |
| `database.ts` | 1756 | 多领域持久化集中，但迁移链可靠 |
| `OverlayPage.vue` | 917 | 整理、搜索、场景、门户、动作状态并存 |
| `WallpaperStage.vue` | 782 | 媒体、天气、性能和回退集中 |
| `App.vue` | 758 | 体验壳与业务编排重复 |
| `PetPage.vue` | 668 | 渲染与行为时序集中 |

总代码规模与功能量基本匹配。治理目标不是机械减行，而是减少重复状态、跨领域耦合和单文件职责。

## 5. 当前体验偏离

1. 当前模型是 `quiet/attention/task/clean/safe`，没有分离 Native 与 Immersive。
2. `App.vue` 常驻六个边缘按钮，超过四入口约束。
3. 任务态可同时挂出文件网格、控制中心、建议、ActionPlan 和聊天。
4. `OverlayPage.vue` 仍是全屏容器矩阵加顶部工具栏。
5. 桌宠有安全区，但缺少统一透视、接触关系和场景停留带。
6. 天气有多效果和降级，但还不是以地平线、光源和景深为输入的统一光学系统。
7. 壁纸、天气、桌宠、玻璃、文件布局和性能档位尚未组成完整 AmbientScene。
8. 旧控制台仍是业务承载主体。

### 5.1 V4.0、V5.1 与当前代码的基线差异

| 项目 | V4.0/V5.1 上游判断 | 当前代码事实 | V6.0 处理 |
|---|---|---|---|
| 默认体验 | 壁纸优先、功能按需出现 | 已有 quiet 壳，但任务结构仍挂载旧控制台 | 建立 Native/Immersive，迁移后删除旧控制台 |
| 状态模型 | 安静、关注、工作、纯净、安全 | 已实现 `quiet/attention/task/clean/safe` | attention 降为 InteractionState，新增 Native/Immersive |
| 一级入口 | 四个或最多五个 | App 当前有搜索、整理、收件箱、AI、壁纸、设置六个 | 固定搜索、整理、场景、助手四个 |
| Luna 位置 | 早期 V4 稿曾固定右侧，V5.1 改为安全区 | 已有跨屏窗口、手动拖动与壁纸安全区提示 | 扩展为场景锚点和停留带，不固定右侧 |
| Live Photo | V5.1 要求真实预览和解码 | 已完成 prepare/preview/confirm、真实 H.264 解码探针 | 保留并纳入 Wallpaper Surface |
| 多屏壁纸 | 要求独立映射与裁剪 | 已有每屏窗口、映射、cover/contain 和场景恢复 | 增加视觉档案与物理矩阵证据 |
| 天气 | 要求近中远景和性能降级 | 已有雨雪雾落叶光效、Pixi、性能档位 | 重组为五通道光学，不重写 PauseArbiter |
| 整理 | 必须预览、确认、撤销、恢复 | ActionPlan 闭环存在，UI 仍是容器矩阵 | 迁入单一 Organizer Surface |
| AI | 气泡与完整对话分级 | ChatPanel、桌宠气泡、建议仍有重复入口风险 | 统一事件输出和 Assistant Surface |
| 安全 | Windows 恢复高于审美 | 已有图标、任务栏、白屏、强杀和宿主恢复 | 作为 L6/Safe 保留，不随 UI 重构删除 |
| 测试 | 需要视觉、E2E、性能和硬件矩阵 | 自动化较完整，真实硬件仍缺 | 自动化不回退，硬件证据继续单列 |

## 6. 必须保护的底座

禁止重复建设：

- DesktopController 桌面激活与安全归位；
- WorkerW/Progman 壁纸宿主；
- 图标、任务栏、白屏、崩溃和强杀恢复；
- PauseArbiter 和系统生命周期降级；
- SQL.js 数据库、备份、迁移和损坏恢复；
- ActionPlan、冲突、日志、撤销、中断恢复；
- WorkspaceScene 与显示器布局；
- 本地搜索、Everything/Windows Search、结果句柄；
- 文件门户授权和路径逃逸防护；
- 静态、视频、Live Photo 壁纸库和失败封面；
- 每屏映射和 cover/contain；
- 桌宠角色包、动作槽、人格和安全区域；
- AI Provider、安全存储、上下文与无 Key 降级；
- preload 安全桥和按窗口限制 IPC；
- 托盘、快捷键、隐私暂停、脱敏诊断；
- E2E、浸泡、供应链、打包和安装脚本。

## 7. 参考图定位

两张雨夜海岸概念图是 V6.0 Immersive 主页的视觉与产品基准，不是 Native、传统应用窗口、全屏控制台、Clean 或逐像素施工图。

约束：

- 全屏壁纸承担主要构图；
- 雨夜、云雾、暖灯、湿地反射形成统一空气；
- 玻璃控件贴边并占用负空间；
- 中央主体保持留白；
- 桌宠具有场景比例、锚点、阴影和局部气泡；
- 大型右栏只在任务状态出现；
- UI 冷暖关系来自壁纸，语义色保持稳定；
- 图标、文字和按钮必须真实可读、可执行、可访问。

伪文字、伪图标和未授权角色不得进入运行时。概念图不得描述为已实现效果。

## 8. V6.0 状态模型

```ts
type DesktopExperienceMode =
  | "native"
  | "immersive"
  | "task"
  | "clean"
  | "safe";

type InteractionState = "idle" | "attention" | "focused";

type ActiveTaskSurface =
  | "search"
  | "organize"
  | "scene"
  | "wallpaper"
  | "assistant"
  | null;
```

### 8.1 Native

- 接近普通 Windows；
- 原生图标、任务栏和系统操作可用；
- 不显示大型控制台、聊天或容器矩阵；
- 桌宠隐藏或极弱存在；
- 壁纸遵守低负载；
- 不抢焦点；
- 透明层不无差别拦截鼠标；
- 从快捷键、托盘或明确入口进入 Immersive。

### 8.2 Immersive

- 用户主动唤醒后进入；
- 壁纸、天气、光效、桌宠、边缘工具和轻量文件空间活跃；
- 桌宠位于场景锚点；
- 完整助手和任务面默认不常驻；
- 不操作后标签与高光降低；
- 常规一级入口固定为搜索、整理、场景、助手。

量化：

- 壁纸与场景可感知面积不低于 72%；
- 常驻玻璃 UI 15%–22%；
- 中央安全区至少为屏幕宽度 50%；
- 常驻一级入口恰好四个。

### 8.3 Task

- 同时只有一个非空 ActiveTaskSurface；
- 最多一个主任务面和一个确认弹层；
- 壁纸可感知面积不低于 60%–65%；
- Escape 关闭最上层；
- 草稿不直接丢失；
- 未确认 ActionPlan 不执行；
- 完成后返回 Immersive。

### 8.4 Clean

- 隐藏文件、工具和任务面；
- 可选隐藏任务栏；
- 保留壁纸、环境和允许的桌宠；
- 允许连续对话；
- 禁止工作 Task；
- Escape 或绑定键立即退出；
- 恢复进入前状态；
- 异常退出仍可归位。

### 8.5 Safe

- 可中断所有模式；
- 保存可恢复上下文；
- 说明异常、影响、步骤和结果；
- 始终提供安全归位；
- 恢复后返回 Native 或 Immersive；
- 不依赖 AI。

### 8.6 InteractionState

`attention` 只是局部悬停、焦点或命中状态：

- 只提高局部对比；
- 可显示短标签；
- 不展开大型面板；
- 离开后有界恢复 idle；
- 不因悬停执行任务。

## 9. 状态转换与不变量

| 来源 | 事件 | 目标 | 失败处理 |
|---|---|---|---|
| Native | 主动唤醒 | Immersive | 保留 Native，可重试 |
| Immersive | 主动收起 | Native | 进入 Safe |
| Immersive | 打开入口 | Task | 保持 Immersive |
| Task | 完成/关闭 | Immersive | 保留草稿 |
| Immersive | 进入纯享 | Clean | 取消进入 |
| Clean | Escape | Immersive | 进入 Safe |
| 任意 | 关键异常 | Safe | 暂停非必要层 |
| Safe | 恢复成功 | Native/Immersive | 保持 Safe 并说明 |

不变量：

- Native、Immersive 的 ActiveTaskSurface 为 null；
- Task 必须且只能有一个非空 Surface；
- Clean 禁止 Task；
- Safe 可打断所有状态；
- 建议是短事件，不新增模式；
- 退出后 Windows 原生桌面可用。

## 10. 桌面唤醒

顺序：

1. 用户主动触发；
2. 壁纸进入完整动态；
3. 天气和光效渐入；
4. 桌宠从锚点出现；
5. 四入口淡入；
6. 文件进入虚拟空间；
7. 状态胶囊出现；
8. 稳定为 Immersive。

目标 600–1200ms。

不显示启动页，不等待 AI、完整索引或全部缩略图；动态失败显示上一帧或封面；不得出现不可关闭的黑白屏。

退出 Immersive 按反向顺序恢复：

1. 关闭或安全收起当前任务面；
2. 保存未提交草稿，不自动执行未确认 ActionPlan；
3. 桌宠退场或降低到 Native 存在感；
4. 边缘工具与状态胶囊收起；
5. 虚拟文件分组退出；
6. 恢复 Windows 原生图标、任务栏、输入与焦点；
7. 不改变真实文件位置；
8. 任一步失败立即进入 Safe，并保留已完成步骤和待恢复上下文。

## 11. 七层桌面

| 层 | 名称 | 内容 | 输入 | 失败 |
|---|---|---|---|---|
| L0 | Windows 原生层 | Explorer、图标、任务栏 | Windows 管理 | 退出后完整可用 |
| L1 | 壁纸世界层 | 静态、视频、Live Photo、裁剪 | 穿透 | 上一帧或封面 |
| L2 | 环境氛围层 | 雨雪雾、落叶、光效 | 永远穿透 | 降级或关闭 |
| L3 | 角色层 | 桌宠、动作、气泡 | 真实命中区 | 隐藏角色 |
| L4 | 边缘工具层 | 四入口、状态、轻控制 | 精确命中 | 托盘恢复 |
| L5 | 临时任务层 | 搜索、整理、场景、壁纸、助手 | 单任务 | 保存草稿关闭 |
| L6 | 安全恢复层 | 错误、恢复、归位 | 明确阻断 | 真实恢复 |

禁止一个全屏透明窗口无差别拦截 Windows。

输入不变量：

- L1、L2 永远不接收鼠标；
- L3 只在角色和气泡真实轮廓内接收；
- L4 只在可见控件区域接收；
- L5 任务面接收输入，任务面之外的透明区域尽量保持穿透；
- L6 可以阻断输入，但必须明确说明原因、影响和恢复动作；
- 任一非原生层失效都不得阻止托盘、快捷键和 Safe 归位。

## 12. 四个一级入口

Immersive 仅常驻：

1. 搜索；
2. 整理；
3. 场景；
4. 助手。

桌宠属于助手；壁纸库从场景进入；设置从托盘或更多进入；安全归位不计入业务入口但持续可达；不允许搜索、整理、助手出现多个同级入口。

## 13. 氛围场景

扩展现有 WorkspaceScene，禁止第二套 Scene。

```ts
interface AmbientScene {
  id: string;
  name: string;
  wallpaper: {
    sourceId: string;
    posterFallback?: string;
    cropByDisplay?: Record<string, DisplayCrop>;
  };
  visualProfile: {
    brightness: "dark" | "light" | "mixed";
    subjectSafeRegions: SafeRegion[];
    accentPalette: string[];
    horizonY?: number;
  };
  weather: {
    type: "none" | "rain" | "snow" | "fog" | "leaves" | "light";
    intensity: number;
    qualityPolicy: string;
  };
  pet: {
    characterId: string;
    personality: string;
    anchorLanes: PetAnchor[];
    actionFrequency: string;
  };
  ui: {
    edgeRailPlacement: "left" | "right" | "bottom";
    glassPreset: string;
  };
  workspace: {
    virtualLayoutId?: string;
    portalIds?: string[];
    pinnedResourceIds?: string[];
  };
  performance: {
    profile: "static" | "battery" | "balanced" | "high";
  };
  audio?: { ambientTrack?: string; volume: number };
}
```

新字段有默认值；旧场景可读；只做向前迁移；应用失败保留上一状态；安全区可人工调整；首屏不依赖云视觉；环境音不阻断第一切片。

## 14. 文件整理

虚拟整理：

- 保持原生图标识别感；
- 标题、角标、轻玻璃表达分组；
- 空分组不显示大容器；
- 默认只改 Project D 内部布局；
- 退出 Immersive 不改变真实路径。

真实操作继续：

`发现 -> 方案 -> 冲突 -> 预览 -> 确认 -> 执行 -> 结果 -> 撤销 -> 中断恢复`

继续复用 ActionPlan。冲突、影响数量和不可撤销项明确显示；AI 不跳过确认；不创建第二套 Action Engine。

## 15. 壁纸世界

- 画布即预览；
- 缩略图只选择；
- 视频和 Live Photo 有封面；
- 导入前真实播放与解码；
- 支持填充、适应、静音、循环、每屏裁剪；
- 损坏媒体不替换当前壁纸；
- 切换失败保留上一帧；
- 删除前说明场景引用；
- 横、竖、超宽独立构图；
- 风格名和壁纸名不混淆；
- 用户资源不自动进入 Git 或安装包。

## 16. 天气与环境

五个通道：

1. 环境调色；
2. 远景雾和空气透视；
3. 中景雨雪、落叶或星光；
4. 近景水滴、虚焦雪片或光斑；
5. 光源散射和局部反射。

输入包括壁纸亮度、地平线、灯光、安全区、性能档位和系统状态。

环境层穿透鼠标、不遮关键文字、不全屏持续模糊、服从 PauseArbiter；全屏后 2 秒内停止高频层；省电关闭近景高成本层；失败不影响 Safe。

## 17. 桌宠属于场景

- 身份稳定，位置不固定；
- 依据安全区、任务栏、方向、DPI 和用户设置；
- 场景保存坐姿、站姿、工作、休息和漫游锚点；
- 每屏独立计算；
- 不跨屏拉伸；
- 不遮主体和系统区域；
- 气泡从角色附近出现；
- Assistant Surface 从最近安全边缘展开。

验收：

- 比例和锚点合理；
- 有接触阴影与低成本环境适配；
- 无明显白边和悬浮；
- 前景可局部遮挡；
- 角色崩溃不影响桌面。

第一切片不引入 Live2D、Spine 或 3D。

## 18. 桌宠与助手统一

同一事件输出：

`角色 + 人格 + 事件 + 动作 + 气泡 + AI 口吻 + 视觉语气 + 停留带`

禁止人格、动作和台词冲突，禁止气泡谎称执行，禁止同一建议重复出现在多个入口。

点击桌宠是短互动；助手入口打开完整面；气泡详情进入对应上下文；Clean 可连续对话但不显示永久聊天墙。

无 Key 时壁纸、天气、基础桌宠、搜索、整理、记事、待办和 Safe 继续可用。

## 19. Agent 权限

### A 级：只读，可直接执行

- 搜索文件、桌面状态、天气、最近文件；
- 查看已授权记事和待办；
- 总结用户主动提交文本；
- 查询场景、壁纸和性能档位。

### B 级：可逆，先预览

- 新建记事、待办；
- 内部显示名、虚拟分类、虚拟容器；
- 修改场景、桌宠、天气、环境和布局。

### C 级：真实影响，明确确认

- 移动、重命名、删除、覆盖真实文件；
- 修改开机启动；
- 隐藏或恢复图标、任务栏；
- 调用外部程序；
- 上传私人文件内容；
- 无法完整撤销的动作。

统一链路：

`理解 -> 工具 -> ActionPlan -> 影响 -> 确认 -> 执行 -> 结果 -> 审计 -> 撤销`

API Key、完整路径和私人内容不得进入普通日志；云端不可用时本地核心继续工作。

额外隐私约束：

- 默认不得向任何 Provider 上传完整桌面目录、批量文件名或目录树；
- 路径、文件名、内容和上下文实行完成任务所需的最小披露；
- 私人文件内容只有在用户对本次请求明确同意后才能发送；
- 长期记忆必须独立授权，不得从普通聊天同意中推导；
- 用户可以查看、暂停、删除长期记忆，并看到最近一次使用时间；
- 隐私暂停后 AI、天气等外部请求停止，本地壁纸、整理、搜索和 Safe 继续可用。

## 20. 视觉系统

构图：

- 壁纸是主体；
- 中央不放常驻大面板；
- 控件占边缘和负空间；
- 避让面部、地标、文字和强光；
- 右侧不形成永久侧墙；
- 任务完成后收起；
- 桌宠与任务面不重叠。

1080p 首轮范围：

| 项目 | 范围 |
|---|---:|
| 快捷轨 | 48–64px |
| 边缘距离 | 20–40px |
| 任务面 | 260–380px |
| 桌宠高度 | 屏高 28%–42% |
| 气泡 | 最多两行 |
| 安静玻璃 | 12%–20% |
| 沉浸玻璃 | 16%–30% |
| 工作玻璃 | 24%–38% |
| 安全界面 | 82%–94% |
| 圆角 | 14–22px |
| 面板动画 | 180–260ms |
| 场景切换 | 320–600ms |

统一透明度、模糊、饱和、描边、内高光、阴影、圆角、间距、动效和明暗适配。禁止大面积纯黑纯白和高成本全屏取色。

可访问性：

- 按钮有名称和 Tooltip；
- 键盘可达；
- 焦点环清晰；
- 命中不小于 36×36 CSS px；
- 减少动态关闭非必要动画；
- 200% DPI 不裁切；
- 透明不等于低对比。

## 21. 多屏与 DPI

- 每屏独立裁剪、安全区、工具轨和角色比例；
- 不拉伸单一 CSS 画布；
- 竖屏使用独立构图；
- 热插拔先保留封面；
- 负坐标和任务栏位置纳入布局；
- 一屏失败不影响其他屏；
- 100%、125%、150%、200% 需要物理证据；
- 浏览器模拟只作早期证据。

## 22. 性能与暂停

档位：`static`、`battery`、`balanced`、`high`。

目标：

- 静态待机 CPU 中位数不高于 1%，P95 不高于 3%；
- 1080p 均衡动态尽量低于 5%；
- 24 小时末值不高于稳态基线 15%；
- 内存不持续单调增长；
- 全屏暂停后解码与高频层接近空闲；
- 关闭任务面无无意义高频计时器；
- 正常退出残留进程 0；
- Task 首开 P95 不高于 300ms；
- 搜索首批 P95 不高于 500ms。

## 23. 代码治理

目标职责：

| 文件 | V6.0 职责 |
|---|---|
| `App.vue` | 状态、桌面层、恢复、任务编排 |
| `OverlayPage.vue` | Organizer Surface |
| `PetPage.vue` | 角色、动作、命中、停留带 |
| `WallpaperStage.vue` | 壁纸、回退、环境、性能 |
| `ChatPanel.vue` | Assistant 内部对话 |
| `SettingsPage.vue` | 独立设置 |
| `styles.css` | 拆分后的入口和兼容层 |
| `types.ts` | 状态、场景、任务和视觉档案 |
| `database.ts` | 向前迁移 |
| `wallpaper-host.ts` | 宿主和恢复 |
| `main.ts` | 窗口和生命周期编排 |

建议组件：

- `AmbientDesktopShell.vue`
- `NativeDesktopBridge.vue`
- `EdgeRail.vue`
- `AmbientStatus.vue`
- `TaskSurface.vue`
- `PetAnchorLayer.vue`
- `OrganizerSurface.vue`
- `AssistantSurface.vue`
- `SceneSurface.vue`
- `WallpaperSurface.vue`
- `RecoverySurface.vue`

建议样式：

- `tokens.css`
- `base.css`
- `native.css`
- `immersive-shell.css`
- `edge-rail.css`
- `task-surface.css`
- `organizer.css`
- `assistant.css`
- `pet.css`
- `wallpaper.css`
- `weather.css`
- `clean.css`
- `recovery.css`

规则：

- 三个以上业务职责即拆分；
- 多页面维护同一状态则提升；
- 不用大量 `showXxx` 代替状态机；
- 不为减行删除测试、恢复和兼容；
- 新体验完成后删除旧模板和无效 CSS；
- 不只用 CSS 隐藏旧产品。

## 24. 旧界面迁移

顺序：

1. 冻结功能、截图、性能、恢复、测试；
2. 建立状态机与迁移表；
3. 建立 NativeDesktopBridge；
4. 建立 AmbientDesktopShell；
5. 迁移搜索、整理、助手、场景和壁纸；
6. 验证旧能力全部可达；
7. 完成 E2E 与恢复；
8. 删除 App.vue 旧控制台；
9. 删除重复状态、入口、CSS；
10. 更新文档与截图。

| 原能力 | 原入口 | V6.0 新入口 | 功能是否等价 | 是否通过测试 | 是否删除旧实现 |
|---|---|---|---:|---:|---:|
| 搜索 | App、Overlay | Search Surface | 待迁移 | 当前服务已测，新 UI 未测 | 否 |
| 整理 | App、Overlay | Organizer Surface | 待迁移 | ActionPlan 已测，新 UI 未测 | 否 |
| 场景 | Overlay、设置 | Scene Surface | 待迁移 | 服务与恢复已测，新 UI 未测 | 否 |
| 壁纸 | App、Overlay、WallpaperPage、设置 | Wallpaper Surface | 部分等价 | 媒体与映射已测，新 UI 未测 | 否 |
| 助手 | ChatPanel、桌宠气泡、建议 | Assistant Surface + 短气泡 | 待统一 | Provider/气泡已有测试 | 否 |
| 设置 | App、托盘 | 独立设置窗口 | 已等价 | 已有设置持久化 E2E | 保留，不删除 |
| 安全归位 | 主界面、Overlay、托盘、快捷键 | 托盘、快捷键、Safe | 已有底座 | 已有恢复测试和打包 Smoke | 仅删除重复业务按钮 |

禁止隐藏路由长期维护经典版、新壳嵌套旧控制台、未验证等价就删除安全链。

## 25. 第一成品切片

包括：

- 一张合法雨夜场景；
- 一名可用桌宠；
- 五种状态；
- 四入口；
- 一个统一 TaskSurface；
- 完整搜索路径；
- 完整整理闭环；
- 完整助手面；
- 短气泡分级；
- 唤醒与恢复；
- 1920×1080、125% DPI；
- 正常退出、白屏、强杀、配置损坏恢复；
- AI 无 Key 降级。

不阻断于五角色全精修、八人格全调优、全天气重做、Live2D、3D、环境音、账号、支付、云同步、社区、AI 壁纸和商业 GA。

## 26. 阶段路线

### Phase A：基线、状态机、代码治理

- 冻结截图、性能、恢复、测试；
- 建立五状态、InteractionState、ActiveTaskSurface；
- 建立迁移表和视觉令牌；
- 不改变业务语义。

验收：现有测试不回退；状态转换有单测；没有平行业务系统。

### Phase B：Native 与 Immersive 壳

- 默认 Native；
- 建立桌面壳、唤醒、四入口、状态、锚点；
- 旧控制台退出默认界面。

验收：Native 保持 Windows；Immersive 壁纸 >=72%；UI 15%–22%；恢复不回退。

### Phase C：单任务面和空间整理

- 统一 TaskSurface；
- 五任务互斥；
- Overlay 迁移 Organizer；
- 保留完整可信整理。

验收：最多一个任务面；壁纸 >=60%；100+ 文件可用；Escape、草稿和整理闭环正确。

### Phase D：氛围场景和壁纸

- 扩展 WorkspaceScene；
- 视觉档案、安全区、每屏裁剪；
- 胶片带、检查器、Live Photo 真实预览。

验收：旧场景可读；坏媒体不替换；失败保留上一帧；横竖屏主体安全。

### Phase E：桌宠和助手统一

- 锚点、调色、阴影；
- 统一动作、人格、气泡、口吻；
- Assistant Surface 和 Agent 权限。

验收：不裁切、不悬浮、结果一致、多屏可见、无 Key 可用。

### Phase F：Clean

- 隐藏工作层；
- 可选隐藏任务栏；
- 保留场景、桌宠、对话；
- 恢复进入前状态。

验收：Escape 退出；禁止 Task；强杀后可归位；不是聊天墙。

### Phase G：天气与性能

- 近中远天气、环境光；
- 四档质量、全屏和电池降级；
- 截图和性能证据。

验收：不只依赖线条圆点；全屏 2 秒内暂停高频层；不黑屏、不破坏穿透和 Safe。

### Phase H：删除旧 UI 与开源候选版

- 删除旧控制台、重复状态、入口和样式；
- 自动化、截图、打包、短浸泡；
- 资源贡献、素材登记、README、SHA256。

验收：无 P0；只有一个默认界面；恢复正常；残留进程 0；安装包无未批准素材。

### 26.1 阶段施工控制表

| Phase | 主要修改文件 | 必须保留 | 依赖 | 主要风险 | 最小验收命令 |
|---|---|---|---|---|---|
| A | `desktop-experience.ts`、`types.ts`、`App.vue`、状态测试 | 当前业务语义、DesktopMode、恢复链 | 当前 HEAD 与测试基线 | 状态命名迁移破坏旧 E2E | `pnpm test`、`pnpm typecheck`、`pnpm lint` |
| B | `App.vue`、新桌面壳与边缘组件、壳样式 | WallpaperStage、托盘、快捷键、窗口安全 | Phase A | 全屏透明层抢输入、旧控制台仍常驻 | 组件测试、关键 E2E、视觉面积 QA |
| C | `OverlayPage.vue`、TaskSurface、Organizer/Search Surface | ActionPlan、搜索、门户、场景服务 | Phase B | 功能迁移遗漏、草稿丢失、确认绕过 | Node、组件、organizer/search E2E |
| D | `types.ts`、scene-service、database、Wallpaper Surface/Stage | 旧场景、壁纸回退、迁移备份 | Phase A-C | 数据迁移不兼容、坏媒体黑屏 | 数据库、场景、壁纸 QA、视觉矩阵 |
| E | `PetPage.vue`、PetAnchorLayer、Assistant Surface、AI 编排 | 角色包、人格、无 Key 降级、IPC 权限 | Phase B-D | 角色丢屏、重复建议、Agent 越权 | pet/AI/IPC 测试与多屏 E2E |
| F | Clean 状态、任务栏/图标恢复编排 | Escape Guard、power blocker、Safe | Phase B-E | 退出无法恢复、应用保持唤醒失控 | clean E2E、强杀恢复、残留进程 |
| G | WallpaperStage、天气样式/渲染、性能采样 | PauseArbiter、封面回退、输入穿透 | Phase D | 核显高占用、黑屏、内存增长 | 天气视觉 QA、短浸泡、全屏暂停 |
| H | 删除旧模板/CSS、文档、发布脚本 | 全部等价能力和恢复路径 | Phase A-G 全部通过 | 误删功能、安装包带未授权素材 | `pnpm quality:v4` 等价门禁、E2E、dist、packaged smoke |

### 26.2 每阶段交付记录

每个 Phase 完成后必须同时更新：

- `PROJECT_STATUS.md`：阶段结论与未关闭门禁；
- `DEV_LOG.md`：改动、命令、成功和失败；
- `NEXT_STEPS.md`：下一阶段明确任务；
- `ACCEPTANCE_CHECKLIST.md`：只勾选有证据的项目；
- 功能迁移表：等价、测试和旧实现删除状态；
- 截图或报告路径：不得只写“肉眼通过”；
- Git 基线：提交 SHA、工作区状态和回退点。

## 27. 验收矩阵

视觉：

- 暗、亮、高细节、低对比；
- 主体左、右、中、纯风景；
- Native、Immersive、Task、Clean、Safe；
- 1080p、1440p、4K、21:9、竖屏、横加竖；
- 100%、125%、150%、200%。

检查主体遮挡、桌宠裁切、任务栏冲突、文字、命中、穿透、面积和割裂。

交互：

- 状态转换和四入口；
- 鼠标、键盘、触控板、Escape；
- 面板互斥和草稿；
- 桌宠点击、拖动、漫游、跨屏；
- 搜索动作；
- 整理预览、冲突、确认、执行、撤销、恢复；
- Clean、Safe；
- AI 无 Key/超时；
- 壁纸失败和热插拔。

性能：

- 四档质量；
- 15/20/30/60 FPS；
- 前后台、全屏、锁屏、休眠、唤醒、电池、低电量、多屏、热插拔。

Phase H 全量命令：

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

V6.0 应新增状态矩阵和 UI 面积预算 QA。

## 28. P0 定义

任一项即 P0：

- 白屏遮桌面且无法关闭；
- 黑屏无法恢复；
- 图标或任务栏退出后不可见；
- 壁纸宿主永久黑屏；
- 整理错误移动、覆盖或丢失；
- 强杀无法恢复 Explorer；
- Clean 无法恢复；
- 透明层阻止 Windows；
- API Key、完整私人路径进入日志；
- 私人文件未经授权上传；
- 桌宠崩溃导致桌面不可用；
- 两套默认界面长期并存。

## 29. 安装包与资源

当前安装包约 152.9 MB。Phase H 区分 Electron/Chromium/Node、业务代码、依赖、壁纸、视频、Live Photo、桌宠、动作、字体、图标、天气、Source Map 和重复资源。

先清理未引用与旧 UI，再优化编码、缩略图和可选资源包；保留最小完整离线与恢复体验，不以下载器伪造小体积。

## 30. 素材与开源

- MIT 不自动覆盖视觉素材；
- 壁纸、视频、角色、动作、字体、音频、贴纸分别授权；
- 用户媒体不自动进 Git 和安装包；
- docs-only 不进入运行时；
- pending-evidence 不进入公开安装包；
- 运行时素材登记来源、作者、用途和分发状态；
- Web 壁纸不执行不受控脚本；
- 核心离线体验不依赖未授权远程资源。

## 31. 当前范围与不做

V6.0 是个人使用优先、开源候选版。支付、订单、退款、会员、云同步、社区、生产账号和商业灾备不阻断。

不替换 Shell、Explorer、任务栏和开始菜单；不新建数据库、搜索、Action Engine、WorkspaceScene；不让 AI 绕过确认；不因视觉重构删除恢复、托盘、设置、天气、桌宠、整理、壁纸；不长期维护两套产品；第一切片不做 Live2D、3D、支付、云同步、社区或 AI 壁纸。

商业要求见 `docs/ProjectD_未来商业化GA门禁附录.md`。

## 32. V6.0 完成定义

1. 目标版本统一；
2. Native 接近 Windows；
3. 打开后进入参考图方向 Immersive；
4. 无传统大主窗；
5. 壁纸、天气、桌宠、玻璃、工具统一；
6. 桌宠不固定右侧；
7. 四入口；
8. 壁纸面积 >=72%；
9. 任务按需展开；
10. 最多一个任务面；
11. Task 返回 Immersive；
12. 文件可虚拟整理；
13. 未确认不真实移动；
14. 整理闭环完整；
15. Clean 可进退；
16. Clean 恢复前态；
17. Agent 权限清楚；
18. AI 不绕过 ActionPlan；
19. 无 Key 本地可用；
20. 明暗、多屏、横竖、DPI 可读；
21. 核显可降级；
22. 不以黑屏卡顿换特效；
23. 正常退出恢复；
24. 白屏恢复；
25. 崩溃恢复；
26. 强杀恢复；
27. 旧控制台删除；
28. 无两套默认界面；
29. 重复状态和 CSS 清理；
30. 自动化不低于当前；
31. 权利边界清楚；
32. 安装包无未批准素材；
33. 无已知 P0。

## 33. Phase A 可执行任务

1. 冻结状态、窗口、路由和截图。
2. 为现有状态写迁移测试。
3. 引入 V6 状态纯函数。
4. 定义不变量和非法转换。
5. 解耦 Windows DesktopMode 与体验状态。
6. 定义 ActiveTaskSurface 唯一性。
7. 建立能力迁移契约。
8. 抽取视觉令牌，不改变行为。
9. 建立 App 编排边界。
10. 建立 Overlay 到 Organizer 适配边界。
11. 保持旧 E2E 兼容。
12. 运行分层回归。
13. 更新职责、Diff 和验收记录。

Phase A 不删除旧 UI；删除发生在功能等价验证后的 Phase H。

## 34. 后续人工决策与进入条件

Phase A 不需要额外人工输入。

后续需要决定：

- 合法雨夜素材和角色分发状态；
- 边缘轨是否自动换边；
- Clean 是否默认隐藏任务栏；
- 连续对话是否保持显示器唤醒；
- 真实硬件、DPI、睡眠和安装测试；
- 安全邮箱、素材登记和公开范围。

进入 Phase A 的工程注意：

1. 从真实 HEAD `7f04dd7` 继续，不回退到历史锚点。
2. 完整 E2E 超过默认七分钟预算，应提高执行预算并保持串行。
3. 未跟踪 `docs/V4.0_UI收敛/` 是否纳入 Git 由用户决定，但不阻塞 Phase A。

没有发现阻止 Phase A 的文档级 P0。
