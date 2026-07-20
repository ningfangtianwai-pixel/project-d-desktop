# Contributing to Project D

感谢关注 Project D。当前仓库处于 V4 免费发布准备阶段，优先目标是桌面安全恢复、稳定性、隐私、性能和 Windows 兼容性。

## 当前贡献政策

项目尚未选择源码许可证，也没有贡献者许可协议。为避免代码权利归属不清：

- 欢迎提交可复现的 Issue、测试结果和不含敏感信息的诊断线索。
- 在正式 `LICENSE` 与贡献政策确定前，维护者不应合并外部代码贡献。
- 不要提交来源不明的图片、视频、字体、音频、角色素材或从其他项目复制的代码。
- 不要把真实 API Key、Token、邮箱、用户名、绝对个人路径或私人文件名放进提交。

许可证确定后，本文件应补充贡献授权、DCO/CLA、版权声明和素材准入流程。

## 开发准备

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

涉及安装包或 Electron 生命周期时，再运行：

```powershell
pnpm verify:supply-chain
pnpm qa:crash-restart
pnpm dist
```

## 变更原则

- 文件移动、桌面图标隐藏、壁纸宿主和 Explorer 交互必须默认可恢复。
- 新增外部网络请求时，必须有明确开关、失败降级、日志脱敏和隐私说明。
- 新增 IPC 时保持最小权限，验证发送方和参数，不向 renderer 暴露任意文件或 shell 能力。
- 新增计时器、监听器、Worker、窗口、子进程或数据库连接时，同时实现释放路径。
- 测试应覆盖成功、失败、取消、重复调用和异常退出。
- 不把账号、支付、会员或云端遥测偷偷带入 V4 免费离线版。

## Issue 信息

请提供版本/Commit、Windows 版本、显卡类型、屏幕数量、分辨率、缩放比例、复现步骤和已脱敏日志。涉及漏洞时不要公开细节，请遵循 [SECURITY.md](SECURITY.md)。

## 提交约定

提交保持单一目的，说明行为变化与验证命令。不要混入生成目录、安装包、个人配置、运行日志或无关格式化。
