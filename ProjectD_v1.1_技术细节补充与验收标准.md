# Project D v1.1 技术细节补充与验收标准

> 适用对象：AI 开发助手 / 人类开发者  
> 适用原文档：`Project D — 完整开发说明书 v1.0`  
> 补充目标：在不降低产品目标的前提下，补齐工程边界、实现细节、异常处理、降级策略、日志、安全与验收标准，确保第一版尽可能做到「可运行、可演示、相对美观、可继续迭代」。  
> 关键原则：原文档定义的产品能力不删减；本补充文档只负责让开发过程更可执行、更安全、更容易验收。

---

## 1. 产品目标不降低声明

Project D 的第一版仍然要呈现「桌面整理 + 壁纸氛围 + 天气粒子 + 桌宠陪伴 + AI 对话 + 设置面板 + 托盘控制」的完整产品形态。

不允许把产品退化为单纯的文件分类工具，也不允许只做一个普通网页 Demo。第一版即使存在少量降级实现，也必须让用户打开后直观看到：

1. 桌面被重新组织成美观的分区容器。
2. 背景壁纸、边框、天气粒子形成统一氛围。
3. 桌宠可见、可互动、有基础动作和对话气泡。
4. 用户可以通过设置面板切换布局、壁纸、天气、桌宠人格和 AI 接口。
5. 托盘可以控制启动、归位、设置、退出。
6. 应用关闭后不能破坏用户原始桌面状态。

开发允许采用「先可运行、再增强」的工程策略，但不允许删除核心产品能力。对于高风险能力，可以实现稳定降级，例如：

- Spine 资源暂缺时，用 PNG 序列帧或静态角色占位，但接口和资源目录必须为 Spine 预留。
- 粒子与边框碰撞效果首版可简化为视觉交互，但必须保留配置字段和后续增强入口。
- AI Provider 首版至少打通一个 OpenAI-compatible 接口，同时保留 Ollama/custom adapter 架构。
- macOS 如果底层桌面控制不稳定，必须保证应用能编译运行，并以安全模式展示覆盖层，不得造成桌面异常。

---

## 2. 第一版定义：V1 可运行体验版

V1 不是最小 MVP，而是「可运行体验版」。它的目标是让用户安装后能完整体验 Project D 的产品想象，同时保证系统安全和可恢复。

### 2.1 V1 必须包含的功能

| 模块 | V1 要求 | 是否允许降级 |
|---|---|---|
| 桌面扫描 | 自动扫描桌面文件，按类型分类 | 不允许缺失 |
| 分区容器 | 展示程序、文档、图片媒体、代码脚本、压缩包、文件夹、其他 | 不允许缺失 |
| 虚拟整理 | 容器内分类展示，不默认移动真实文件 | 不允许缺失 |
| 一键整理 | 隐藏或弱化系统桌面图标，显示 Project D 桌面 | 不允许缺失 |
| 一键归位 | 恢复桌面图标或退出 Project D 桌面 | 不允许缺失 |
| 壁纸 | 至少 6 种风格，每种至少 2 张可切换 | 数量可少于原目标，但结构保留 |
| 拉绳 | 可点击或拖拽切换壁纸 | 动画可简化 |
| 天气 | 自动或手动天气模式至少一个可用 | 自动天气失败时手动模式兜底 |
| 粒子 | 雨、雪、光斑、落叶至少可切换 | 粒子碰撞可简化 |
| 桌宠 | 可见、可拖动、可双击互动、有至少 4 个动作 | Spine 缺失时可用占位动画 |
| AI 对话 | 至少一个 provider 可连接并返回内容 | 无 key 时使用本地预设回复 |
| 设置面板 | 布局、壁纸、天气、桌宠、AI 基础配置 | 不允许缺失 |
| 托盘菜单 | 激活、归位、设置、刷新、退出 | 不允许缺失 |
| 打包 | Windows 可安装运行；macOS 可构建或进入安全模式 | macOS 桌面控制可降级 |
| 恢复机制 | 崩溃后下次启动可检测并恢复状态 | 不允许缺失 |

### 2.2 V1 不允许出现的问题

1. 不能导致用户真实桌面文件丢失。
2. 不能默认移动、删除、重命名用户文件。
3. 不能让用户桌面图标永久隐藏且无法恢复。
4. 不能在没有用户授权的情况下读取桌面以外的任意目录。
5. 不能把 API Key 明文暴露给渲染进程。
6. 不能因为 AI、天气、资源加载失败导致主程序无法启动。
7. 不能出现全屏窗口无法退出、无法点击托盘、无法恢复系统桌面的情况。

---

## 3. 产品模式与文件整理边界

### 3.1 默认采用虚拟整理

V1 默认只做「虚拟整理」。

所谓虚拟整理，是指 Project D 扫描桌面文件后，在自己的覆盖层中按容器展示文件，但不改变文件在系统桌面上的真实路径。用户拖动文件到其他容器时，默认只更新 `custom_category` 或 `container_id`，不执行系统层面的 `fs.rename` 或移动操作。

这样做的原因：

1. 安全，避免移动文件导致用户找不到。
2. 可逆，关闭 Project D 后桌面仍保持原样。
3. 易恢复，崩溃不会造成文件路径变化。
4. 后续可以增加「真实整理」作为高级选项。

### 3.2 真实文件移动作为未来高级功能

如果后续增加真实移动，必须满足以下条件：

1. 默认关闭。
2. 用户必须手动开启。
3. 首次开启时显示风险说明。
4. 每次批量移动前生成操作日志。
5. 提供撤销按钮。
6. 不移动 `.lnk`、`.app`、`.url`、云盘同步占位文件、系统保护文件。
7. 失败时回滚已完成操作。

V1 的开发者不得把拖拽容器误实现为真实移动文件。

### 3.3 文件唯一标识策略

`full_path` 可以作为第一版唯一键，但需要补充更稳健的识别字段：

```sql
ALTER TABLE desktop_files ADD COLUMN path_hash TEXT;
ALTER TABLE desktop_files ADD COLUMN inode TEXT;
ALTER TABLE desktop_files ADD COLUMN volume_id TEXT;
ALTER TABLE desktop_files ADD COLUMN last_seen_at TEXT;
ALTER TABLE desktop_files ADD COLUMN is_missing INTEGER DEFAULT 0;
```

实现要求：

1. Windows 首版可以使用 `full_path + size + modified_at` 作为弱指纹。
2. macOS 可尝试使用 inode，但不可强依赖。
3. 文件被删除时不要立刻物理删除数据库记录，应先标记 `is_missing = 1`。
4. 文件重新出现时，如果路径一致，应恢复原分类。
5. 文件重命名时，首版允许视为旧文件消失、新文件出现，但日志中要记录。

---

## 4. 桌面状态机与恢复机制

### 4.1 增加状态机

Project D 必须使用明确状态机控制桌面模式，避免重复激活、重复归位、异常退出造成桌面状态错乱。

```typescript
export type DesktopModeState =
  | 'inactive'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'recovering'
  | 'error';
```

状态流转：

```text
inactive -> activating -> active -> deactivating -> inactive
active -> error -> recovering -> inactive
activating -> error -> recovering -> inactive
deactivating -> error -> recovering -> inactive
```

### 4.2 激活流程补充

激活桌面时必须按顺序执行：

1. 检查当前状态是否为 `inactive`。
2. 写入 `desktop_state = activating`。
3. 扫描桌面文件。
4. 创建本次激活快照。
5. 保存快照到 SQLite 和 JSON 文件。
6. 创建覆盖窗口。
7. 渲染壁纸、容器、桌宠。
8. 执行系统桌面图标隐藏或安全模式降级。
9. 写入 `desktop_state = active`。
10. 托盘切换为激活态。

如果任意步骤失败：

1. 写入错误日志。
2. 执行 `recoverDesktopState()`。
3. 回到 `inactive` 或 `error`。
4. 给用户弹出可读错误提示。

### 4.3 归位流程补充

归位时必须按顺序执行：

1. 检查状态是否为 `active` 或 `error`。
2. 写入 `desktop_state = deactivating`。
3. 保存当前 Project D 布局配置。
4. 隐藏覆盖窗口。
5. 恢复系统桌面图标。
6. 如果支持图标位置恢复，则恢复图标坐标。
7. 销毁或暂停 Pixi/Spine 渲染循环。
8. 写入 `desktop_state = inactive`。
9. 托盘切换为默认态。

### 4.4 崩溃恢复

应用启动时，第一件事不是渲染 UI，而是检查上次状态：

```typescript
async function bootRecoveryCheck() {
  const state = db.getAppState('desktop_state');
  if (state === 'active' || state === 'activating' || state === 'deactivating' || state === 'error') {
    await recoverDesktopState();
  }
}
```

恢复策略：

1. 恢复桌面图标显示。
2. 关闭残留覆盖窗口。
3. 清理临时锁文件。
4. 写入恢复日志。
5. 提示用户「上次异常退出，已自动恢复桌面」。

### 4.5 紧急恢复脚本

首次安装后生成紧急恢复脚本：

Windows：`ProjectD-Recover-Desktop.bat`

```bat
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideIcons /t REG_DWORD /d 0 /f
taskkill /f /im explorer.exe
start explorer.exe
```

macOS：`ProjectD-Recover-Desktop.command`

```bash
defaults write com.apple.finder CreateDesktop -bool true
killall Finder
```

脚本位置：

```text
userData/recovery/ProjectD-Recover-Desktop.bat
userData/recovery/ProjectD-Recover-Desktop.command
```

设置页「关于」中必须显示恢复脚本路径。

---

## 5. 窗口层级与点击交互补充

### 5.1 推荐窗口架构

V1 推荐使用三类窗口：

| 窗口 | 作用 | 是否透明 | 是否接收鼠标 | 层级 |
|---|---|---|---|---|
| DesktopStageWindow | 壁纸、粒子、容器、桌宠主舞台 | 是 | 动态接收 | 桌面层或普通窗口底层 |
| SettingsWindow | 设置面板 | 否 | 是 | 普通应用窗口 |
| RecoveryDialogWindow | 异常恢复提示 | 否 | 是 | 普通弹窗 |

如果后续需要更高级控制，可以拆成：

1. WallpaperWindow：只渲染壁纸和粒子。
2. OverlayWindow：只渲染容器和 UI。
3. PetWindow：桌宠独立窗口。

但 V1 为减少复杂度，优先使用一个 DesktopStageWindow。

### 5.2 Windows 桌面层实现优先级

Windows 上按以下顺序尝试：

1. 优先尝试 WorkerW / Progman 桌面层挂载。
2. 如果失败，使用全屏透明窗口 + 不抢焦点策略。
3. 如果仍失败，进入安全模式：Project D 作为普通全屏桌面窗口运行，托盘可退出。

实现要求：

1. 不允许为了刷新桌面频繁重启 `explorer.exe`。
2. 不允许无退出入口的全屏窗口。
3. 每次切换桌面层模式都要写日志。
4. 设置面板应显示当前窗口模式：`desktop-attached` / `overlay` / `safe-mode`。

### 5.3 macOS 桌面层实现优先级

macOS 上按以下顺序尝试：

1. 使用透明无边框窗口 + 合理 window level。
2. 对非交互区域启用鼠标穿透。
3. 如果 Finder 桌面隐藏造成明显闪烁或权限异常，则进入安全模式。

macOS V1 的重点是「能运行、能展示、能退出、不会破坏桌面」。

### 5.4 点击穿透策略

全屏透明窗口不能简单全局 `ignoreMouseEvents = true`，否则容器、桌宠、拉绳都无法交互。

推荐策略：

1. 根容器默认 `pointer-events: none`。
2. 可交互组件设置 `pointer-events: auto`。
3. 鼠标进入交互组件时，主进程关闭窗口穿透。
4. 鼠标离开交互组件时，主进程恢复窗口穿透。
5. 拖拽期间强制接收鼠标事件。
6. 拖拽结束 300ms 后恢复穿透。

伪代码：

```typescript
function setInteractiveMode(enabled: boolean) {
  desktopWindow.setIgnoreMouseEvents(!enabled, { forward: true });
}
```

交互组件包括：

1. 分区容器。
2. 文件项。
3. 右键菜单。
4. 预览面板。
5. 拉绳。
6. 桌宠。
7. 对话气泡。
8. 设置入口。

### 5.5 坐标系统

所有 UI 坐标统一使用 Electron DIP 坐标，不直接使用物理像素。

保存容器位置时使用：

```typescript
interface SavedRect {
  displayId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  workAreaWidth: number;
  workAreaHeight: number;
}
```

当屏幕尺寸变化时：

1. 如果 displayId 仍存在，按比例恢复位置。
2. 如果 displayId 不存在，移动到主屏幕可见区域。
3. 如果容器超出屏幕，自动吸附到屏幕内。
4. 任务栏或 Dock 区域不可被容器默认遮挡。

---

## 6. 多屏、高 DPI 与任务栏适配

### 6.1 多屏策略

V1 要求至少支持主屏幕稳定运行。多屏支持采用渐进策略：

1. 默认只覆盖主显示器。
2. 设置中提供「覆盖全部显示器」开关。
3. 开启后，每个显示器创建一个 DesktopStageWindow。
4. 文件容器默认只显示在主屏，其他屏可显示壁纸和粒子。
5. 后续版本允许用户把容器拖到任意屏幕。

### 6.2 DPI 缩放

必须测试以下 Windows 缩放比例：

1. 100%。
2. 125%。
3. 150%。
4. 200%。

验收要求：

1. 容器位置不漂移。
2. 点击区域与视觉区域一致。
3. 拉绳不会偏移。
4. 预览面板不会超出屏幕。
5. 桌宠拖拽位置保存后重启仍基本一致。

### 6.3 任务栏与 Dock

容器布局应使用 `screen.getPrimaryDisplay().workArea`，而不是完整 bounds。

如果任务栏在左侧、右侧、顶部或底部，容器默认布局都必须避让任务栏。

---

## 7. 文件扫描、分类与监控补充

### 7.1 扫描范围

V1 默认只扫描系统桌面路径：

```typescript
const desktopPath = app.getPath('desktop');
```

不递归扫描子文件夹内容。文件夹本身作为一个条目显示。

### 7.2 过滤规则

必须过滤：

1. `.DS_Store`
2. `desktop.ini`
3. `Thumbs.db`
4. 以 `.~` 开头的临时 Office 文件
5. 明显的系统隐藏文件
6. Project D 自己生成的恢复脚本快捷方式或缓存快捷方式

### 7.3 分类补充

建议把 `image` 拆成显示名称「图片与媒体」，内部类型仍可保持 `image`，但 UI 中应显示得更自然。

建议扩展分类：

```typescript
export type FileCategory =
  | 'program'
  | 'document'
  | 'image'
  | 'media'
  | 'code'
  | 'archive'
  | 'folder'
  | 'design'
  | 'other';
```

如果不想改动原类型，也可以把 `media/design` 作为 `customCategory` 支持。

### 7.4 增量更新

chokidar 监听必须使用防抖：

```typescript
const SCAN_DEBOUNCE_MS = 500;
const MAX_BATCH_DELAY_MS = 2000;
```

事件处理：

| 事件 | 处理 |
|---|---|
| add | 插入新文件，重新分类 |
| unlink | 标记 missing 或删除记录 |
| change | 更新 size、modified_at、thumbnail |
| addDir | 插入 folder |
| unlinkDir | 标记 folder missing |

### 7.5 大桌面性能策略

当桌面文件数量较多时：

| 文件数量 | 策略 |
|---|---|
| 0-300 | 正常渲染 |
| 301-1000 | 容器内部虚拟滚动 |
| 1001-3000 | 默认折叠低频容器，延迟加载图标 |
| >3000 | 显示性能提示，启用轻量模式 |

轻量模式：

1. 不生成缩略图。
2. 粒子数量减半。
3. 预览面板默认关闭。
4. 动画降级为 CSS transition。

---

## 8. 分区容器交互补充

### 8.1 默认布局

V1 首次启动默认 4 列布局：

| 列 | 容器 |
|---|---|
| 1 | 程序与快捷方式、压缩包 |
| 2 | 文档、代码与脚本 |
| 3 | 图片与媒体 |
| 4 | 文件夹、其他 |

如果屏幕宽度小于 1440px，自动改成 2 列。

### 8.2 容器行为

每个容器必须支持：

1. 拖动位置。
2. 调整高度。
3. 折叠/展开。
4. 滚动文件列表。
5. 显示文件数量。
6. 右键容器菜单。
7. 记住位置和折叠状态。

V1 可以暂不支持自由调整宽度，但数据库字段必须保留。

### 8.3 文件项行为

文件项交互定义：

| 操作 | 行为 |
|---|---|
| 单击 | 选中，并显示预览 |
| 双击 | 使用系统默认程序打开 |
| 右键 | 打开菜单 |
| 拖拽到容器 | 修改虚拟分类 |
| 拖拽到桌面空白 | V1 暂不处理，提示未来支持 |

右键菜单必须包含：

1. 打开。
2. 打开所在位置。
3. 移动到容器。
4. 重命名显示名（仅 Project D 内部别名，V1 不改真实文件名）。
5. 从 Project D 隐藏。
6. 刷新文件信息。

### 8.4 空状态

容器为空时显示：

```text
这里暂时没有文件
```

不要显示空白黑框。

---

## 9. 壁纸、边框与天气粒子补充

### 9.1 壁纸资源最低要求

V1 至少内置：

| 风格 | 最低数量 |
|---|---|
| anime | 2 |
| landscape | 2 |
| cinematic | 2 |
| cyberpunk | 2 |
| minimalist | 2 |
| seasonal | 2 |

运动、水墨等风格可以保留目录但暂用占位图。

### 9.2 壁纸加载策略

1. 当前壁纸立即加载。
2. 下一张壁纸预加载。
3. 非当前风格不全部加载。
4. 4K 壁纸应按屏幕尺寸生成运行时纹理。
5. 切换失败时回退到上一张壁纸。

### 9.3 边框主题

边框主题应由壁纸风格和天气共同决定。

```typescript
interface ResolvedVisualTheme {
  wallpaperStyle: WallpaperStyle;
  weather: WeatherCondition;
  cardBackground: string;
  cardBorder: string;
  cardGlow: string;
  textPrimary: string;
  textSecondary: string;
  particlePreset: ParticleEffectType;
}
```

V1 最低要求：

1. 晴天有轻微光斑。
2. 雨天有雨滴粒子。
3. 雪天有雪花粒子。
4. 风天有落叶粒子。
5. 雾天可使用半透明雾层。

### 9.4 粒子性能等级

```typescript
export type PerformanceMode = 'auto' | 'quality' | 'balanced' | 'batterySaver';
```

默认 `auto`：

| 条件 | 策略 |
|---|---|
| 电池供电 | batterySaver |
| CPU 高占用 | balanced |
| 窗口不可见 | 暂停 Pixi ticker |
| 文件数量 >1000 | balanced |
| 用户手动选择高质量 | quality |

### 9.5 粒子碰撞降级

原需求中的边框碰撞保留，但 V1 可以分两档：

1. 完整档：粒子与容器边框做 bounding box 检测，有 splash/stick/bounce。
2. 简化档：不做真实逐粒子碰撞，只在容器边缘叠加 CSS 水珠/积雪/光晕效果。

验收时简化档可通过，但代码结构必须保留 `enableBorderCollision` 和 `borderEffect` 字段。

---

## 10. 桌宠系统补充

### 10.1 资源降级策略

V1 首选 Spine，但必须提供降级：

| 资源状态 | 实现 |
|---|---|
| Spine 完整 | 使用 spine-pixi 加载 |
| Spine 缺少服装 | 只加载默认服装 |
| Spine 缺少部分动作 | 动作用 idle 替代，并写日志 |
| Spine 完全缺失 | 使用 PNG 序列帧或静态角色图 |
| 所有角色资源缺失 | 显示极简发光圆点桌宠，占位可互动 |

桌宠不可因为资源缺失导致应用启动失败。

### 10.2 桌宠基础动作

V1 至少实现：

1. idle
2. wave
3. think
4. sleep
5. walk 或 floating
6. stretch 或 jump

原文档要求的更多动作仍保留为完整目标。

### 10.3 桌宠交互

必须支持：

1. 双击打开 AI 对话。
2. 拖拽改变位置。
3. 右键打开桌宠菜单。
4. 长时间不操作时自动切换 idle/sleep。
5. 天气变化时触发气泡。
6. 深夜提醒可关闭。

### 10.4 自动冒泡限制

避免打扰用户：

| 频率 | 行为 |
|---|---|
| silent | 不主动冒泡 |
| rare | 每小时最多 1 次 |
| normal | 每 30 分钟最多 1 次 |
| chatty | 每 10 分钟最多 1 次 |

所有自动冒泡必须满足：

1. 不抢焦点。
2. 5 秒后自动消失。
3. 鼠标悬停时不消失。
4. 用户正在全屏应用时不弹出，或进入低打扰模式。

---

## 11. AI 对话系统补充

### 11.1 Provider Adapter 架构

不要把所有 API 写死在一个 fetch 中。必须抽象：

```typescript
export interface AIProviderAdapter {
  id: string;
  name: string;
  validateConfig(config: AIConfig): Promise<boolean>;
  chat(input: ChatInput): Promise<ChatOutput>;
  listModels?(config: AIConfig): Promise<string[]>;
}
```

V1 至少实现：

1. `OpenAICompatibleAdapter`
2. `OllamaAdapter`
3. `LocalFallbackAdapter`

### 11.2 LocalFallbackAdapter

当用户没有配置 API Key、网络失败或模型报错时，桌宠不应失效，而应使用本地预设语句。

示例：

```typescript
const fallbackReplies = {
  gentle: ['我在呢。先慢慢来。', '今天已经做得不错了。'],
  humorous: ['服务器摸鱼了，但我还在营业。'],
  cold: ['失败了。重试。']
};
```

### 11.3 请求限制

AI 请求必须有：

1. 30 秒超时。
2. 用户可取消。
3. 错误提示。
4. 最近 10 条上下文限制。
5. 最大输出 token 限制。
6. 每日计数可关闭。
7. 不在渲染进程保存明文 API Key。

### 11.4 隐私边界

AI 对话默认只发送用户主动输入和最近聊天上下文，不自动发送桌面文件列表。

如果未来要让 AI 理解桌面文件，必须单独加权限开关：

```text
允许桌宠读取桌面文件名，用于提供整理建议
```

默认关闭。

---

## 12. 设置面板补充

V1 设置面板至少包含以下页面：

### 12.1 通用设置

1. 开机自启。
2. 启动后自动激活 Project D。
3. 性能模式。
4. 语言。
5. 恢复桌面按钮。
6. 打开日志目录。

### 12.2 布局设置

1. 2/4/6/8 列选择。
2. 重置布局。
3. 容器显示/隐藏。
4. 容器透明度。
5. 字体大小。

### 12.3 壁纸设置

1. 风格切换。
2. 上一张/下一张。
3. 自动轮播。
4. 拉绳开关。
5. 动效强度。

### 12.4 天气设置

1. 自动天气。
2. 手动天气。
3. 城市/API Key。
4. 粒子强度。
5. 低电量时关闭粒子。

### 12.5 桌宠设置

1. 显示/隐藏桌宠。
2. 人格选择。
3. 话频率。
4. 缩放比例。
5. 自动换装。
6. 重置位置。

### 12.6 AI 设置

1. Provider 选择。
2. API Endpoint。
3. API Key。
4. Model。
5. 测试连接。
6. 清空对话历史。

---

## 13. 安全与权限补充

### 13.1 IPC 参数校验

所有 IPC handler 必须做参数校验。推荐使用 zod。

```typescript
const UpdateContainerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(30).optional(),
  positionX: z.number().finite().optional(),
  positionY: z.number().finite().optional(),
  width: z.number().min(180).max(800).optional(),
  height: z.number().min(120).max(1000).optional(),
});
```

禁止渲染进程直接传任意 path 给主进程读取。所有文件读取必须基于数据库中已扫描的 `fileId`。

### 13.2 文件访问边界

V1 只允许读取：

1. 用户桌面路径下的文件。
2. Project D 自己的 userData 目录。
3. 用户在设置中明确导入的壁纸文件。

不允许读取：

1. 系统目录。
2. 浏览器数据目录。
3. SSH Key。
4. 任意用户输入路径。

### 13.3 API Key 存储

API Key 必须通过 Electron `safeStorage` 加密后再写入 SQLite。

数据库中字段应存储：

```typescript
interface EncryptedSecret {
  encrypted: true;
  value: string;
  algorithm: 'electron-safeStorage';
}
```

渲染进程读取配置时，不返回完整 Key，只返回脱敏格式：

```text
sk-****abcd
```

### 13.4 错误返回格式

所有 IPC 返回统一格式：

```typescript
export type IPCResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; detail?: unknown };
```

---

## 14. 日志、错误与可观测性

### 14.1 日志目录

```text
userData/logs/app.log
userData/logs/error.log
userData/logs/desktop-state.log
userData/logs/ai.log
```

### 14.2 必须记录的事件

1. 应用启动和退出。
2. activate/deactivate 状态变化。
3. 桌面图标隐藏/恢复结果。
4. 覆盖窗口创建/销毁。
5. 扫描文件数量和耗时。
6. 天气 API 请求结果。
7. AI 请求失败原因。
8. 资源加载失败。
9. 崩溃恢复执行结果。

### 14.3 用户可读错误

错误提示不能只有技术堆栈，应显示用户能理解的话：

```text
Project D 没能成功接管桌面，但你的原始桌面没有被修改。你可以继续使用安全模式，或点击「恢复桌面」退出。
```

---

## 15. 打包、安装与卸载补充

### 15.1 Windows 打包要求

1. 生成 NSIS 安装包。
2. 默认安装到用户目录，不需要管理员权限。
3. 安装后创建开始菜单入口。
4. 安装后生成恢复脚本。
5. 卸载前如果 Project D 处于 active 状态，先执行恢复桌面。
6. 卸载时询问是否保留用户配置。

### 15.2 macOS 打包要求

1. 生成 dmg。
2. Apple Silicon 和 Intel 尽量分别构建。
3. 如果没有签名，文档中说明 Gatekeeper 打开方式。
4. 不强行申请不必要权限。
5. 桌面控制不稳定时自动进入安全模式。

### 15.3 自动更新预留

V1 可不做自动更新，但必须预留配置：

```typescript
interface UpdateConfig {
  enabled: boolean;
  channel: 'stable' | 'beta';
  lastCheckedAt: string | null;
}
```

---

## 16. AI 开发执行顺序

为了让 AI 长时间跑也不迷路，开发必须按下面顺序执行。

### Stage 0：项目初始化

目标：项目能启动空窗口。

任务：

1. 初始化 Electron + Vue + TypeScript + Vite。
2. 建立 main/renderer/preload/shared 目录。
3. 配置 ESLint/Prettier/tsconfig strict。
4. 配置 electron-builder。
5. 实现空托盘和设置窗口。

验收：

1. `npm install` 成功。
2. `npm run dev` 能启动。
3. 托盘可见。
4. 设置窗口可打开关闭。

### Stage 1：数据库与状态

目标：本地状态可保存。

任务：

1. 初始化 SQLite。
2. 创建所有表。
3. 插入默认容器和默认设置。
4. 实现 app_state KV。
5. 实现日志系统。

验收：

1. 首次启动自动创建数据库。
2. 重启后设置不丢失。
3. 日志文件可生成。

### Stage 2：桌面扫描与容器 UI

目标：用户能看到桌面文件被分区展示。

任务：

1. 扫描桌面文件。
2. 分类并写入数据库。
3. 渲染分区容器。
4. 支持单击选中、双击打开。
5. 支持容器滚动。
6. 支持刷新。

验收：

1. 桌面文件分类正确率 >= 90%。
2. 双击文件能用系统默认程序打开。
3. 1000 个文件以内不卡死。

### Stage 3：激活/归位与恢复

目标：Project D 能安全接管和退出桌面。

任务：

1. 实现状态机。
2. 实现 activate/deactivate。
3. 实现恢复脚本。
4. 实现崩溃恢复检测。
5. 实现托盘控制。

验收：

1. 连续激活/归位 20 次无异常。
2. 强制退出后重启能恢复桌面。
3. 用户始终能通过托盘退出。

### Stage 4：壁纸、拉绳、视觉主题

目标：产品变美。

任务：

1. 接入 PixiJS。
2. 加载壁纸资源。
3. 实现壁纸切换。
4. 实现拉绳交互。
5. 实现容器毛玻璃主题。
6. 实现主题与壁纸联动。

验收：

1. 壁纸切换无白屏。
2. 拉绳 1 秒防抖有效。
3. 容器在浅色/深色壁纸上均可读。

### Stage 5：天气与粒子

目标：桌面有氛围。

任务：

1. 实现手动天气。
2. 接入 OpenWeatherMap。
3. 实现雨、雪、落叶、光斑、雾。
4. 实现粒子强度调节。
5. 实现性能模式。

验收：

1. 手动切换天气立即改变粒子。
2. 天气 API 失败不影响主程序。
3. balanced 模式 CPU 占用可接受。

### Stage 6：桌宠

目标：桌面有陪伴感。

任务：

1. 加载桌宠资源。
2. 实现桌宠位置保存。
3. 实现基础动作。
4. 实现气泡。
5. 实现人格选择。
6. 实现资源降级。

验收：

1. 桌宠可拖动。
2. 双击可打开对话窗口。
3. 资源缺失时有占位，不崩溃。

### Stage 7：AI 对话

目标：桌宠能对话。

任务：

1. 实现 AI Provider Adapter。
2. 实现 OpenAI-compatible 调用。
3. 实现 Ollama 调用。
4. 实现 LocalFallback。
5. 实现对话历史。
6. 实现连接测试。

验收：

1. API 配置正确时可回复。
2. API 错误时显示友好提示。
3. 无 API Key 时 fallback 可用。

### Stage 8：设置、打包与最终 QA

目标：生成可交付安装包。

任务：

1. 补齐设置页。
2. 补齐错误提示。
3. 补齐日志入口。
4. Windows 打包。
5. macOS 构建测试。
6. 做验收清单。

验收：

1. Windows 安装包可运行。
2. 所有 P0 验收项通过。
3. 无破坏性 bug。

---

## 17. V1 验收标准

### 17.1 验收分级

| 等级 | 含义 | 发布要求 |
|---|---|---|
| P0 | 阻塞项，失败则不可交付 | 必须 100% 通过 |
| P1 | 核心体验项，失败影响第一印象 | 至少 90% 通过 |
| P2 | 增强项，失败不阻塞但要记录 | 可延期，但不得影响 P0/P1 |

### 17.2 P0 阻塞验收

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| P0-01 | 应用启动 | 双击应用后 10 秒内出现托盘或主界面 |
| P0-02 | 安全退出 | 托盘退出后进程关闭，无残留全屏窗口 |
| P0-03 | 桌面恢复 | 激活后归位，系统桌面图标恢复显示 |
| P0-04 | 崩溃恢复 | active 状态强制杀进程后重启，自动恢复桌面 |
| P0-05 | 文件安全 | 不移动、不删除、不重命名真实桌面文件 |
| P0-06 | 扫描桌面 | 能扫描当前用户桌面并显示文件 |
| P0-07 | 文件打开 | 双击容器内文件可调用系统默认程序打开 |
| P0-08 | 设置可用 | 设置窗口可打开、保存、关闭、重启后配置仍在 |
| P0-09 | 托盘可用 | 托盘至少包含激活、归位、设置、退出 |
| P0-10 | 异常不崩 | 天气失败、AI 失败、资源缺失均不导致主程序崩溃 |
| P0-11 | API Key 安全 | 渲染进程无法读取完整明文 API Key |
| P0-12 | 日志可查 | 关键错误写入 userData/logs |

### 17.3 P1 核心体验验收

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| P1-01 | 视觉完整 | 打开后能看到壁纸、容器、桌宠、基础 UI |
| P1-02 | 分类正确 | 常见文件类型分类正确率 >= 90% |
| P1-03 | 布局切换 | 2/4/6/8 列至少 2/4 列稳定可用，6/8 不错乱 |
| P1-04 | 容器拖动 | 容器位置可调整并保存 |
| P1-05 | 容器滚动 | 文件数超出容器高度时可滚动 |
| P1-06 | 预览面板 | 图片和文本预览稳定可用 |
| P1-07 | 壁纸切换 | 至少 6 种风格可切换，不白屏 |
| P1-08 | 拉绳交互 | 点击或拖拽拉绳能切换壁纸 |
| P1-09 | 天气手动模式 | 手动切换晴、雨、雪、风后视觉变化明显 |
| P1-10 | 粒子效果 | 雨、雪、落叶、光斑至少 4 种可见 |
| P1-11 | 桌宠互动 | 桌宠可见、可拖动、可双击打开对话 |
| P1-12 | 对话气泡 | 桌宠能显示人格/天气/时间气泡 |
| P1-13 | AI 对话 | 至少一个 provider 可成功返回回复 |
| P1-14 | Fallback | AI 不可用时本地预设回复可用 |
| P1-15 | 性能 | 300 个桌面文件以内交互不卡顿 |

### 17.4 P2 增强体验验收

| 编号 | 验收项 | 通过标准 |
|---|---|---|
| P2-01 | PDF 预览 | PDF 前 3 页可预览 |
| P2-02 | 视频音频预览 | HTML5 video/audio 可播放 |
| P2-03 | 粒子碰撞 | 雨/雪与容器边缘有交互或伪交互 |
| P2-04 | 自动天气 | OpenWeatherMap 自动天气可用 |
| P2-05 | 自动换装 | 天气变化时桌宠服装变化 |
| P2-06 | 多屏支持 | 主屏稳定，副屏不出现异常窗口 |
| P2-07 | 高 DPI | 125%/150% 缩放下点击区域准确 |
| P2-08 | 低功耗模式 | 低功耗模式粒子数量减少 |
| P2-09 | macOS 安全模式 | macOS 可运行并可退出 |
| P2-10 | 商业化占位 | 设置页中有付费内容占位但不影响使用 |

---

## 18. 测试场景清单

### 18.1 桌面文件测试集

准备一个测试桌面，包含：

1. `.lnk` 快捷方式。
2. `.exe` 程序。
3. `.pdf` 文档。
4. `.docx` 文档。
5. `.xlsx` 表格。
6. `.pptx` 演示文稿。
7. `.txt` 文本。
8. `.md` Markdown。
9. `.png` 图片。
10. `.jpg` 图片。
11. `.mp4` 视频。
12. `.mp3` 音频。
13. `.zip` 压缩包。
14. `.rar` 压缩包。
15. 文件夹。
16. 中文文件名。
17. 超长文件名。
18. 带空格文件名。
19. 带特殊符号文件名。
20. 只读文件。

### 18.2 异常测试

必须测试：

1. 没有网络。
2. 天气 API Key 错误。
3. AI API Key 错误。
4. 桌宠资源缺失。
5. 壁纸资源缺失。
6. 数据库文件损坏。
7. 强制杀进程。
8. 桌面文件数量超过 1000。
9. 显示器分辨率变化。
10. Windows 缩放比例变化。

### 18.3 长时间运行测试

至少连续运行 4 小时，观察：

1. 内存是否持续增长。
2. CPU 是否长期过高。
3. 粒子是否卡死。
4. 桌宠动作是否异常。
5. chokidar 是否重复触发过多。
6. AI 失败是否影响主程序。

---

## 19. 给 AI 开发助手的执行规则

AI 开发助手必须遵守：

1. 不得删除原需求中的核心模块。
2. 遇到复杂功能时先实现稳定版本，再实现高级效果。
3. 每完成一个 Stage 必须运行项目并修复启动错误。
4. 每次修改桌面状态相关代码后，必须测试 activate/deactivate。
5. 任何读取文件的功能必须通过主进程 IPC，不能在渲染进程直接访问文件系统。
6. 任何失败都要返回用户可读错误，不允许静默失败。
7. 每个模块必须有 fallback，不能因为单个资源或 API 失败导致整个应用不可用。
8. 最终交付前必须跑完 P0 验收清单。

---

## 20. 最终交付物

V1 交付时应包含：

```text
ProjectD-v1/
├── ProjectD-Setup.exe
├── ProjectD.dmg                 # 如已完成 macOS 构建
├── README.md
├── CHANGELOG.md
├── RECOVERY.md                  # 桌面恢复说明
├── docs/
│   ├── 原始需求说明书.md
│   ├── v1.1技术细节补充与验收标准.md
│   └── 验收记录.md
└── test-report/
    ├── p0-checklist.md
    ├── p1-checklist.md
    └── known-issues.md
```

`known-issues.md` 必须记录未完成或降级实现的部分，但不能包含 P0 阻塞问题。

---

## 21. 最终判断

这份补充不降低 Project D 的产品要求，而是把原需求从「理想完整说明」推进到「可以让 AI 长时间执行的工程任务书」。

第一版目标应该定为：

> 能安装、能启动、能接管桌面、能安全归位、能展示漂亮分区、能切换壁纸天气、能看到桌宠、能进行基础 AI 对话、失败时可恢复。

只要 P0 全部通过，P1 大部分通过，这个版本就可以作为 Project D 的第一版可运行样机继续迭代。
