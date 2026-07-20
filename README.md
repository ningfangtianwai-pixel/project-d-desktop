# Project D

Project D 是面向 Windows 的桌面整理与氛围桌面应用。它把文件整理、场景、壁纸、天气效果、桌宠、搜索和可选 AI 对话放在同一套可恢复的桌面体验中。

> 当前状态：公开测试前的 V4 免费版工程分支。项目尚未选定源码许可证，也尚未完成全部公开分发门禁。请先阅读[免费发布范围](docs/V4_FREE_RELEASE.md)和[外部门禁](docs/V4_EXTERNAL_GATES.md)。

## 免费版范围

- Windows 本地桌面整理、预览、执行、撤销和恢复。
- 静态/动态壁纸、天气视觉效果、桌宠和场景。
- 本地搜索、门户、自动规则和快捷键。
- 本地设置、日志、诊断导出与数据删除。
- 可选天气与 AI 服务；用户自行配置服务商密钥，核心本地功能不依赖账号、支付或 Project D 服务端。

V4 免费版不包含生产账号、订单、支付、会员、云同步或云端遥测服务。仓库中如存在相关领域模型或测试骨架，不代表这些服务已经上线。

## 系统要求

- Windows 10 或 Windows 11 x64。
- Node.js 与 pnpm。以锁文件安装结果为准。
- 打包需要 Windows 环境；安装包签名还需要有效的 Windows 代码签名证书。

低配置或仅核显设备可以运行，但动态壁纸、粒子数量、多显示器和高分辨率会影响资源占用。公开发布前仍需完成真实硬件矩阵验证。

## 本地开发

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` 会启动 Electron 桌面能力。调试桌面整理或纯净桌面前，请关闭重要的全屏工作并确认托盘中的“安全归位”可用。

## 构建与测试

```powershell
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm verify:assets
pnpm verify:supply-chain
pnpm qa:crash-restart
pnpm dist
```

更长时间的稳定性测试：

```powershell
pnpm qa:soak
pnpm qa:soak:4h
pnpm qa:soak:24h
```

部分 QA 命令会启动真实 Electron 进程。运行前请阅读脚本参数，并优先使用隔离的 QA 用户数据目录。构建成功只证明产物可生成，不等同于通过签名、版权、法律文本和真实硬件验收。

## 配置与隐私

可选服务通过环境变量或应用设置配置。不要把真实 API Key 写入源码、提交、日志、截图或诊断包。示例变量见 `.env.example`。

- 桌面索引、动作计划、设置和聊天历史默认保存在本机应用数据目录。
- 外部天气或 AI 服务仅在对应功能启用并配置后联网。
- 用户应能在隐私中心暂停外部请求、导出数据并删除本地数据。
- 桌面文件动作必须经过预览与确认，并保留可追踪的恢复路径。

安全问题请按 [SECURITY.md](SECURITY.md) 报告。普通缺陷和功能建议可使用 GitHub Issues。

## 贡献

在提交 Issue 或代码前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。许可证尚未确定期间，维护者不应合并外部代码贡献，以免产生权利归属不清。

## 许可证状态

**尚未选择许可证。** 当前仓库公开可见不表示已授予复制、修改、再分发或商用许可；在仓库加入经所有权利人确认的正式 `LICENSE` 前，默认保留全部权利。不要复制其他项目的许可证文本来替代权利人决策。

