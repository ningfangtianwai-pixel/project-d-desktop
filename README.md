# Project D

Project D 是面向 Windows 的本地优先桌面整理与氛围桌面应用，包含桌面文件整理、场景、静态/动态壁纸、天气效果、桌宠、本地搜索和可选 AI 对话。

> 当前状态：V4 免费版发布准备分支。当前构建仅适合开发和受控测试，不代表已经通过公开发布、商用素材、代码签名、真实硬件矩阵或法律审核门禁。

## 免费版范围

- Windows 本地桌面整理、计划预览、用户确认、执行、撤销和恢复。
- 静态/动态壁纸、天气视觉效果、桌宠和场景。
- 本地搜索、门户、自动规则、快捷键和本地设置。
- 本地诊断、数据导出与数据删除。
- 用户主动配置后才启用的天气和兼容 AI 服务。

V4 免费版不包含生产账号、订单、支付、会员、云同步或 Project D 云端遥测服务。仓库中的未来领域模型或测试骨架不表示对应服务已经上线。

## 系统要求

- Windows 10 或 Windows 11 x64。
- Node.js 与 pnpm；依赖版本以 `pnpm-lock.yaml` 为准。
- Windows 安装包构建需要 Windows 环境。

低配置或仅核显设备可以使用静态与降级能力。动态壁纸、粒子数量、多显示器和高分辨率会增加资源占用；公开发布前仍需完成真实硬件矩阵验证。

## 本地开发

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

涉及桌面整理、纯净桌面或壁纸宿主调试时，应先确认托盘中的恢复路径可用，并避免在未保存的重要工作上直接试验。

## 质量检查

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:component
pnpm test:e2e
pnpm build
pnpm verify:assets
pnpm verify:supply-chain
pnpm dist
pnpm verify:package-budget
```

`pnpm quality:v4` 执行主要本地质量门禁。构建或自动化测试通过只代表产物可生成，不等同于通过签名、素材授权、法律文本、长期稳定性和真实硬件验收。

## 隐私与联网

- 核心桌面能力采用本地处理，不要求 Project D 账号或服务端。
- 天气和 AI 是可选联网能力，仅在用户启用并完成配置后使用。
- 不要把真实 API Key、Token、邮箱、用户名、私人文件名或完整个人路径写入源码、提交、日志、截图或诊断包。
- 文件动作应先预览和确认，并保留撤销或恢复记录。

隐私草案见 [PRIVACY.md](PRIVACY.md)，安全报告方式见 [SECURITY.md](SECURITY.md)。

## 发布状态

Project D 尚未宣称可公开分发。公开发布前至少还需关闭以下门禁：

- 随包素材的来源、作者、授权范围和证据尚未全部确认。
- 隐私文本、免责声明和适用地区结论尚待合格专业人士审核。
- Windows 安装包尚需可信代码签名。
- Windows 10/11、不同显卡、多屏/DPI 与长时间稳定性仍需真实设备证据。
- 私密安全报告渠道和长期维护联系人仍需确认。

素材证据要求与当前阻断结论见[素材登记](docs/ASSET_REGISTRY.md)。

## 许可证

Project D 自有源码采用 [MIT License](LICENSE)。该许可不自动授予仓库中第三方、用户提供或生成素材的使用权；素材必须分别依据其登记与授权证据处理。未完成证据审核的素材不得据此被宣称可商用或可公开分发。

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
