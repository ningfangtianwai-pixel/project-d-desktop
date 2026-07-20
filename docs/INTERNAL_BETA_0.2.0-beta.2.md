# Project D 0.2.0-beta.2 V4 本地测试快照

## 快照身份

- 版本：`0.2.0-beta.2`
- 分支：`codex/v4-free-release`
- 平台：Windows x64，Electron 43.1.1
- 安装包：`release/ProjectD-0.2.0-beta.2-Setup.exe`
- 安装包大小：140,424,966 bytes（133.92 MiB）
- SHA-256：`EB0D71B430723B708B20E0D8D6321CB6F05C6520BC49CE5F1B581DE3B47AC1DC`
- Authenticode：`NotSigned`

## 相比 0.2.0-beta.1

| 领域 | beta.1 | beta.2 |
|---|---|---|
| 版本身份 | 本地构建仍可能与同名远端产物碰撞，浏览器预览显示 0.1.0 | 构建时从 `package.json` 注入唯一版本；预览、关于页、诊断和安装包一致 |
| 自动化测试 | 175 个 Node 测试，无 Lint、组件测试或 Electron E2E | 181 个 Node 测试、2 个 Vue 组件测试、1 个隔离 Electron E2E，并接入 Windows CI |
| 覆盖率 | 81.57% / 75.52% / 83.31% | 82.00% / 75.70% / 83.75%，并明确 Electron/renderer 使用独立 E2E 证据而非伪装成数值覆盖率 |
| 生命周期 | 显示器/电源和更新事件存在匿名监听，IPC handler 不可统一释放 | 系统事件、延时任务、更新监听和 16 组 IPC handler 都有明确所有者与幂等清理 |
| 供应链 | 358 个组件，零已知漏洞 | 485 个组件（含测试工具链），零 info/low/moderate/high/critical 已知漏洞 |
| 安装包 | 约 227.9 MiB，`app.asar` 约 195.1 MiB | 133.92 MiB，`app.asar` 55.35 MiB；增加 180/110 MiB 自动预算 |
| 发布判断 | 主要依赖人工文档 | 机器门禁明确阻断缺失许可证、法律定稿、素材授权、签名和正式更新源 |

## 已执行验收

- `pnpm install --frozen-lockfile`：通过。
- `pnpm quality:v4`：通过。
- Node 单元测试：181/181 通过，0 失败、0 跳过。
- Vue 组件测试：2/2 通过。
- Electron E2E：1/1 通过；使用临时用户数据目录和 idle 模式，确认窗口非白屏、安全 preload API 与版本身份。
- `pnpm dist`：通过。
- 打包模块：39/39 可加载。
- 打包启动：core-ready、正常退出、shutdown-complete、零错误日志全部通过。
- 强制终止后恢复：数据库 integrity `ok`、桌面状态 `idle`、无临时数据库残留。
- 60 秒隐藏 idle 预检：CPU 平均 0.31%、中位 0.26%、P95 0.77%，零错误日志；时长不足，不能用于判断长期内存趋势。
- 测试收尾：Project D 残留进程 0，Explorer `HideIcons=0`。

## 发布判定

此快照适合受控本地测试，没有在已执行范围内发现 P0。它不是可公开分发版本：`pnpm verify:release-ready` 会因以下外部门禁返回失败。

1. 尚未由权利人选择并添加源码 `LICENSE`。
2. 隐私政策和用户协议仍是草案，缺少法律审核后的正式文本。
3. 33 项分发素材仍为 `pending-evidence` 且禁止分发。
4. 安装包没有 Authenticode 签名。
5. 自动更新仍使用 `.invalid` 占位端点。

真实 Win10/Win11、GPU、多屏/DPI、休眠唤醒和 4/24 小时浸泡仍需独立完成，不能由本机短时自动化替代。
