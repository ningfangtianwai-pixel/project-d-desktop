# Project D 0.2.0-beta.2 V4 本地测试快照

## 快照身份

- 版本：`0.2.0-beta.2`
- 分支：`codex/v4-free-release`
- 平台：Windows x64，Electron 43.1.1
- 安装包：`release/ProjectD-0.2.0-beta.2-Setup.exe`
- 安装包大小：140,019,106 bytes（133.53 MiB）
- SHA-256：`80E4A18C55AC5607EB6096F1AC214F3C262AED95646926CBDB10E6A3DB347E37`
- Authenticode：`NotSigned`

## 相比 0.2.0-beta.1

| 领域 | beta.1 | beta.2 |
|---|---|---|
| 版本身份 | 本地构建仍可能与同名远端产物碰撞，浏览器预览显示 0.1.0 | 构建时从 `package.json` 注入唯一版本；预览、关于页、诊断和安装包一致 |
| 自动化测试 | 175 个 Node 测试，无 Lint、组件测试或 Electron E2E | 184 个 Node 测试、2 个 Vue 组件测试、8 个隔离 Electron E2E，并接入 Windows CI |
| 覆盖率 | 81.57% / 75.52% / 83.31%（仅已加载模块） | 73.27% / 75.17% / 70.88%（完整 main/shared 库存分母），11 个高风险模块另设门槛 |
| 生命周期 | 显示器/电源和更新事件存在匿名监听，IPC handler 不可统一释放 | 系统事件、延时任务、更新监听和 16 组 IPC handler 都有明确所有者与幂等清理 |
| 供应链 | 358 个组件，零已知漏洞 | 480 个组件（含测试工具链），零 info/low/moderate/high/critical 已知漏洞 |
| 安装包 | 约 227.9 MiB，`app.asar` 约 195.1 MiB | 133.53 MiB，`app.asar` 53.27 MiB；增加 180/110 MiB 自动预算 |
| 发布判断 | 主要依赖人工文档 | 机器门禁明确阻断法律定稿、素材授权和签名；更新改为手动 GitHub Releases |

## 已执行验收

- `pnpm install --frozen-lockfile`：通过。
- `pnpm quality:v4`：通过。
- Node 单元测试：184/184 通过，0 失败、0 跳过。
- Vue 组件测试：2/2 通过。
- Electron E2E：8/8 通过；覆盖首次/重复启动、设置持久化、托盘退出、白屏恢复、强杀恢复、AI 无 Key 降级和配置损坏恢复。
- `pnpm dist`：通过。
- 打包模块：38/38 可加载。
- 打包启动：core-ready、正常退出、shutdown-complete、零错误日志全部通过。
- 强制终止后恢复：数据库 integrity `ok`、桌面状态 `idle`、无临时数据库残留。
- 60 秒隐藏 idle 预检：CPU 平均 0.31%、中位 0.26%、P95 0.77%，零错误日志；时长不足，不能用于判断长期内存趋势。
- 测试收尾：Project D 残留进程 0，Explorer `HideIcons=0`。

## 发布判定

此快照适合受控本地测试，没有在已执行范围内发现 P0。它不是可公开分发版本：`pnpm verify:release-ready` 会因以下外部门禁返回失败。

1. 隐私政策和用户协议仍是草案，缺少法律审核后的正式文本。
2. 33 项分发素材仍为 `pending-evidence` 且禁止分发。
3. 安装包没有 Authenticode 签名。

真实 Win10/Win11、GPU、多屏/DPI、休眠唤醒和 4/24 小时浸泡仍需独立完成，不能由本机短时自动化替代。
