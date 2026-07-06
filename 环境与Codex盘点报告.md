# 环境与 Codex 盘点报告

盘点时间：2026-07-03  
工作目录：`D:\桌面操作系统`

## 1. 已阅读的项目文档

本目录下只有两个 Markdown 文档，均已阅览：

1. `D:\桌面操作系统\桌面控制系统.md`
   - 2382 行，82537 字节。
   - 主题：Project D 完整开发说明书。
   - 技术栈：Electron 28+、Vue 3、TypeScript、Vite、PixiJS 7+、spine-pixi、better-sqlite3、chokidar、OpenWeatherMap、OpenAI Chat Completions 兼容接口、electron-builder。
   - 关键交付：Windows `.exe`、macOS `.dmg`、本地 SQLite、托盘、覆盖窗口、桌面扫描、桌面整理/归位、壁纸天气粒子、桌宠、AI 对话。

2. `D:\桌面操作系统\ProjectD_v1.1_技术细节补充与验收标准.md`
   - 1247 行，34009 字节。
   - 主题：技术细节补充、异常处理、降级策略、安全、日志、验收标准。
   - 执行顺序：Stage 0 初始化空窗口；Stage 1 数据库与状态；Stage 2 桌面扫描与容器 UI；Stage 3 激活/归位与恢复；Stage 4 壁纸与视觉主题；Stage 5 天气粒子；Stage 6 桌宠；Stage 7 AI 对话；Stage 8 设置、打包与 QA。

## 2. Codex 插件盘点

插件缓存根目录：

- `C:\Users\34395\.codex\plugins\cache`
- `E:\Caches\.codex\plugins\cache`

当前发现的 Codex 插件 manifest：

| 插件 | 版本 | 状态 |
|---|---:|---|
| actively | 1.0.0 | 已缓存；本轮未看到对应已加载 skill |
| browser | 26.623.81905 | 已缓存；提供 in-app browser 控制 |
| computer-use | 26.623.81905 | 已缓存；提供 Windows 桌面应用控制 |
| documents | 26.630.12135 | 已缓存；Word/Google Docs 文档能力 |
| hyperframes | 0.1.2 | 已缓存；HTML 视频与动画能力 |
| pdf | 26.630.12135 | 已缓存；PDF 读写、渲染、验证 |
| presentations | 26.630.12135 | 已缓存；PPT/Slides 能力 |
| remotion | 1.0.3 | 已缓存；Remotion 视频开发指导 |
| spreadsheets | 26.630.12135 | 已缓存；Excel/CSV/Sheets 能力 |
| template-creator | 26.630.12135 | 已缓存；个人 artifact 模板 skill |

## 3. Codex Skills 盘点

Codex skill 根目录：

- `C:\Users\34395\.codex\skills`
- `E:\Caches\.codex\skills`
- `E:\CodexSkills\installed`
- `C:\Users\34395\.agents\skills`
- `E:\Caches\.codex\plugins\cache\...\skills`

当前本轮可见/已缓存 skills：

| Skill | 来源 |
|---|---|
| imagegen | `C:\Users\34395\.codex\skills\.system\imagegen` |
| openai-docs | `C:\Users\34395\.codex\skills\.system\openai-docs` |
| plugin-creator | `C:\Users\34395\.codex\skills\.system\plugin-creator` |
| skill-creator | `C:\Users\34395\.codex\skills\.system\skill-creator` |
| skill-installer | `C:\Users\34395\.codex\skills\.system\skill-installer` |
| code-coach | `C:\Users\34395\.codex\skills\code-coach` |
| verified-image-collector | `C:\Users\34395\.codex\skills\verified-image-collector` |
| yunying-xuexi | `C:\Users\34395\.codex\skills\yunying-xuexi`，description 存在问号乱码，建议后续修复元数据 |
| using-coze-cli | `C:\Users\34395\.agents\skills\using-coze-cli` |
| browser:control-in-app-browser | browser 插件 |
| computer-use:computer-use | computer-use 插件 |
| hyperframes:gsap | hyperframes 插件或 `E:\CodexSkills\installed` |
| hyperframes:hyperframes | hyperframes 插件或 `E:\CodexSkills\installed` |
| hyperframes:hyperframes-cli | hyperframes 插件或 `E:\CodexSkills\installed` |
| hyperframes:hyperframes-registry | hyperframes 插件或 `E:\CodexSkills\installed` |
| hyperframes:website-to-hyperframes | hyperframes 插件或 `E:\CodexSkills\installed` |
| remotion:remotion-best-practices | remotion 插件 |
| documents:documents | documents 插件 |
| pdf:pdf | pdf 插件 |
| presentations:Presentations | presentations 插件 |
| spreadsheets:Spreadsheets | spreadsheets 插件 |
| template-creator:template-creator | template-creator 插件 |

## 4. PATH 与环境路径盘点

### 当前进程 PATH

```text
C:\Users\34395\.codex\tmp\arg0\codex-arg0MP1gFz
C:\Users\34395\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin
D:\Apps\ImageMagick
C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin
C:\WINDOWS\system32
C:\WINDOWS
C:\WINDOWS\System32\Wbem
C:\WINDOWS\System32\WindowsPowerShell\v1.0\
C:\WINDOWS\System32\OpenSSH\
C:\Program Files\dotnet\
E:\长城\
:\Edge下载\Git\cmd
\Program Files\Docker\Docker\resources\bin
D:\Edge下载\Git\cmd
D:\Apps\Ghostscript\bin
D:\Apps\GitHubCLI\
C:\Users\34395\AppData\Local\Microsoft\dotnet
E:\Python
E:\Python\Scripts
D:\codex
D:\Git\cmd
E:\vscode\Microsoft VS Code\bin
C:\Users\34395\AppData\Local\Microsoft\WinGet\Links
C:\Users\34395\AppData\Local\Microsoft\WindowsApps
D:\Apps\LibreOffice\program
D:\Apps\Tesseract-OCR
D:\Apps\FFmpeg\ffmpeg-8.1.1-full_build\bin
D:\miniforge3
D:\miniforge3\condabin
D:\miniforge3\Scripts
D:\miniforge3\Library\bin
D:\Go\bin
D:\rust\.cargo\bin
C:\Users\34395\AppData\Local\Programs\Python\Launcher
D:\Apps\Poppler\poppler-25.07.0\Library\bin
D:\cmake\bin
C:\Users\34395\AppData\Local\Microsoft\WindowsApps
C:\Users\34395\AppData\Local\OpenAI\Codex\bin\ada252862d154cdd
C:\Program Files\WindowsApps\OpenAI.Codex_26.623.11225.0_x64__2p2nqsd0c76g0\app\resources
```

### 用户 PATH

```text
C:\Users\34395\AppData\Local\Microsoft\dotnet
E:\Python
E:\Python\Scripts
D:\codex
D:\Git\cmd
E:\vscode\Microsoft VS Code\bin
C:\Users\34395\AppData\Local\Microsoft\WinGet\Links
C:\Users\34395\AppData\Local\Microsoft\WindowsApps
D:\Apps\LibreOffice\program
D:\Apps\Tesseract-OCR
D:\Apps\ImageMagick
D:\Apps\FFmpeg\ffmpeg-8.1.1-full_build\bin
D:\miniforge3
D:\miniforge3\condabin
D:\miniforge3\Scripts
D:\miniforge3\Library\bin
D:\Go\bin
D:\rust\.cargo\bin
C:\Users\34395\AppData\Local\Programs\Python\Launcher
D:\Apps\Poppler\poppler-25.07.0\Library\bin
D:\Apps\Ghostscript\bin
D:\cmake\bin
E:\长城
%USERPROFILE%\AppData\Local\Microsoft\WindowsApps
C:\Program Files\Docker\Docker\resources\bin
```

### 机器 PATH

```text
D:\Apps\ImageMagick
C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin
C:\WINDOWS\system32
C:\WINDOWS
C:\WINDOWS\System32\Wbem
C:\WINDOWS\System32\WindowsPowerShell\v1.0\
C:\WINDOWS\System32\OpenSSH\
C:\Program Files\dotnet\
E:\长城\
:\Edge下载\Git\cmd
\Program Files\Docker\Docker\resources\bin
D:\Edge下载\Git\cmd
D:\Apps\Ghostscript\bin
D:\Apps\GitHubCLI\
```

### 损坏或不存在的 PATH 项

| Scope | PATH 项 | 状态 |
|---|---|---|
| Machine | `:\Edge下载\Git\cmd` | 缺盘符，不存在 |
| Machine | `\Program Files\Docker\Docker\resources\bin` | 缺 `C:`，不存在 |
| Machine | `D:\Edge下载\Git\cmd` | 旧 Git 路径，不存在 |

已处理：

- 已把正确 Docker CLI 路径 `C:\Program Files\Docker\Docker\resources\bin` 加入用户 PATH。
- 未直接清理机器 PATH，因为机器级 PATH 需要管理员权限，强改风险较高。

## 5. 常用工具状态

| 工具 | 状态 |
|---|---|
| Codex | 存在：`D:\codex\codex.cmd`，以及 WindowsApps Codex |
| Claude | 存在：`D:\codex\claude.cmd`，以及 WinGet Links |
| Coze | 存在：`D:\codex\coze.cmd` |
| Node.js | 存在：`v24.15.0`，路径 `E:\长城\node.exe` |
| npm | 存在：`11.12.1` |
| npx | 存在：`11.12.1` |
| pnpm | 存在：`11.7.0` |
| Python | 默认 `Python 3.14.5`，路径 `E:\Python\python.exe` |
| Python 3.12 | 存在：`C:\Python312\python.exe` |
| pip | 存在：`26.1.1` |
| uv | 存在：`0.11.16` |
| Git | 存在：`2.54.0.windows.1`，路径 `D:\Git\cmd\git.exe` |
| Git Bash | 存在：推荐显式用 `D:\Git\bin\bash.exe` |
| FFmpeg | 存在：`8.1.1` |
| ImageMagick | 存在 |
| Tesseract | 存在 |
| LibreOffice | 存在 |
| Poppler | 存在 |
| Ghostscript | 存在 |
| Docker CLI | 存在：`29.4.3`，已修复用户 PATH |
| CMake | 存在：`4.3.3` |
| GitHub CLI | 存在：`2.95.0` |
| VS Code | 存在：`E:\vscode\Microsoft VS Code` |
| winget | 存在：`v1.29.280` |
| Java | 存在：Temurin OpenJDK 17.0.19 |
| .NET | 仅运行时 6.0.36，未发现 SDK |
| Go | 存在：`1.26.4` |
| Rust | 存在：`rustc 1.96.0`，`cargo 1.96.0` |
| choco | 未安装 |
| scoop | 未安装 |
| MSVC Build Tools / cl.exe | 未安装或未发现 |

## 6. 已做的环境修复

1. Docker CLI PATH 修复
   - 发现实际文件存在：`C:\Program Files\Docker\Docker\resources\bin\docker.exe`
   - 已加入用户 PATH。
   - 当前验证：`Docker version 29.4.3, build 055a478`

2. node-gyp Python 指向修复
   - 已设置用户环境变量：
     - `PYTHON=C:\Python312\python.exe`
     - `npm_config_python=C:\Python312\python.exe`
     - `npm_config_msvs_version=2022`
   - 原因：默认 `python` 是 3.14.5，native module 构建更稳妥地使用已安装的 Python 3.12。

3. 尝试安装 Visual Studio 2022 Build Tools
   - 命令使用 winget 安装 `Microsoft.VisualStudio.2022.BuildTools`，并请求 C++ workload。
   - 结果：安装器下载和哈希校验成功，但安装失败，退出码 `1602`。
   - 判断：很可能需要管理员/UAC 交互，当前非交互任务无法完成。

## 7. 仍缺或需注意

1. MSVC Build Tools 仍缺
   - Project D 后续使用 `better-sqlite3`，如果没有预编译包，可能需要 MSVC C++ 编译工具。
   - 建议后续以管理员身份安装 Visual Studio Build Tools 2022，选择 `Desktop development with C++` 或 `Microsoft.VisualStudio.Workload.VCTools`。

2. 机器级 PATH 有损坏项
   - 不影响现在的 Git 和 Docker，因为用户 PATH 已有正确路径。
   - 后续如果以管理员身份整理环境，建议删除或修正机器 PATH 中的 3 个损坏项。

3. Docker Desktop daemon 未做运行态验证
   - 当前只验证了 Docker CLI 可执行。
   - Project D 文档没有要求 Docker，因此不作为阻塞项。

4. `yunying-xuexi` skill 元数据乱码
   - 当前不是 Project D 阻塞项。
   - 如果要让该 skill 更好触发，建议后续修复 `SKILL.md` 的 description 编码。

## 8. 对 Project D 的环境判断

当前环境足够开始 Stage 0：

- Node/npm/pnpm 可用。
- Git、VS Code、Codex、Claude、Coze 可用。
- Electron/Vite/Vue/TypeScript/electron-builder 可以作为项目本地依赖安装。

进入 Stage 1 前建议补齐：

- Visual Studio Build Tools 2022 C++ workload。
- 或在安装 `better-sqlite3` 时确认预编译包可用，否则会卡在 native 编译。

本轮没有初始化项目源码，因为用户当前任务是盘点插件、skills、环境路径，并阅读两个 Markdown 文档。
