# Project D 文档导航

公开仓库只保留能够帮助使用、验证和理解产品的文档。阶段性聊天记录、个人环境盘点、重复生成产物和过期规划不属于产品文档。

## 使用与配置

- [用户指南](./USER_GUIDE.md)：桌面整理、壁纸、Luna、隐私与安全退出。
- [提供商配置](./PROVIDER_CONFIG.md)：可选 AI 与天气服务的本地配置方法。
- [隐私政策草案](./PRIVACY_POLICY_DRAFT.md)：本地数据、网络请求和诊断边界。

## 工程与验证

- [0.2.0-beta.1 内测快照](./INTERNAL_BETA_0.2.0-beta.1.md)：测试结论、已知限制和发布门槛。
- [发布与稳定性手册](./RELEASE_AND_STABILITY_RUNBOOK.md)：构建、恢复和发布验证流程。
- [运营手册](./OPERATIONS_RUNBOOK.md)：诊断、运行状态和异常处置。
- [Windows 窗口分层笔记](./WINDOW_LAYERING_NOTES.md)：桌面宿主与窗口层级实现说明。
- [系统架构与安全边界](./ARCHITECTURE.md)：Electron 进程、类型化 IPC、桌面服务与恢复链路。
- [资产台账](./ASSET_LEDGER.json)：仓库媒体资产的来源与哈希记录。
- [壁纸与媒体署名](./WALLPAPER_CREDITS.md)：壁纸来源和使用说明。

## 产品证据

- [Stage 36 截图集](./screenshots/stage36/README.md)：24 张来自打包 Electron 应用的验收截图。
- [Quality Gate](../.github/workflows/quality-gate.yml)：Windows 构建、测试、类型检查、SBOM 与密钥扫描。

## 文档原则

1. 可公开：不包含本机路径、真实密钥、个人数据或内部对话记录。
2. 可验证：产品完成度必须能关联测试、截图、构建或明确的人工验收记录。
3. 不夸大：原型、内测、生产能力和未完成门槛分别说明。
4. 少而有效：过期计划被当前状态文档替代，不在根目录堆叠阶段日志。
