# Project D 发布与稳定性运行手册

## 1. 自动更新发布条件

客户端已接入 `electron-updater`，支持：

- `stable` 稳定通道，对应 `latest.yml`；
- `beta` 灰度体验通道，对应 `beta.yml`；
- 更新元数据中的 `stagingPercentage` 分阶段百分比；
- 手动检查、手动下载、用户确认重启安装；
- 未配置 HTTPS 发布源时安全禁用。

正式启用前仍必须具备：

1. 代码签名证书和稳定的发布者名称；
2. HTTPS 更新域名与不可变版本文件；
3. `N-1 -> N` 和 `N-beta -> N-beta` 两条真实升级路径；
4. CDN 缓存刷新、限流、回滚和审计日志；
5. 将 `electron-builder.yml` 中的更新地址替换为正式 HTTPS 域名；受控测试也可使用 `PROJECTD_UPDATE_FEED_URL` 或 `update_feed_url` 覆盖；
6. 发布 `latest.yml`/`beta.yml`、安装包和 blockmap；
7. 灰度元数据设置 `stagingPercentage: 5`，验证后依次提高到 20、50、100。

当前 `electron-builder.yml` 中的 `.invalid` 地址仅用于生成更新元数据，绝不能作为正式发布地址。

## 2. 短时加速浸泡

短时浸泡会使用隔离用户目录启动真实 Electron 运行时，重复执行窗口健康探测、设置页重载和壁纸渲染重载，并每 3 秒记录进程树内存、CPU、句柄和进程数。

```powershell
pnpm qa:soak
```

报告保存到 `artifacts/qa/soak-*/report.json`。它用于提前发现启动崩溃、明显泄漏、渲染恢复失败和关机挂起。

短时加速测试不能替代真实 24 小时测试，因为定时任务、系统睡眠、网络变化、日志增长、缓存积累和显卡驱动状态依赖真实时间。

## 3. 强杀与恢复验证

```powershell
pnpm qa:crash-restart
```

测试使用隔离用户目录完成以下流程：

1. 启动并等待核心服务就绪；
2. 强制结束整个 Project D 进程树；
3. 使用同一用户目录重新启动；
4. 验证数据库完整性、桌面状态归位、临时数据库文件清理和第二次安全退出。

报告保存到 `artifacts/qa/crash-restart-*/report.json`。

## 4. 24 小时商业验收

正式候选版本仍需真实运行 24 小时，建议采样周期 60 秒。至少覆盖：

- 2 小时静态壁纸待机；
- 4 小时动态壁纸运行；
- 2 次睡眠/唤醒；
- 1 次 Explorer 重启；
- 2 次显示器插拔或显示设置变化；
- 1 次全屏应用自动暂停与恢复；
- 1 次网络断开与恢复；
- 期间执行壁纸切换、场景恢复、AI 对话和桌面整理预览。

通过门槛：无崩溃、无白屏/黑屏、数据库完整、桌面可恢复、私有内存无持续线性增长、退出后无残留进程。

建议分层执行：2 分钟加速预筛、1 小时燃烧测试、8 小时过夜测试、24 小时发布门禁。只有最后一项可以勾选“24 小时稳定性通过”。

纯待机基线可以使用同一采样器运行真实时钟，不执行高频窗口重载：

```powershell
node scripts/qa-soak.cjs --seconds 86400 --mode idle
```

该命令仍需配合人工安排睡眠/唤醒、显示器变化、网络中断和业务操作，单纯空转 24 小时只覆盖待机稳定性。

## 5. 打包门禁

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm dist
```

发布前记录安装包大小、SHA-256、签名状态、`latest.yml`/`beta.yml` 内容和一次干净虚拟机安装结果。任何一步失败都阻止发布。

浸泡报告同时生成 `samples.csv`，数据来自 Electron 自身的主进程、renderer、GPU 和 utility 指标，不再用高开销 WMI 反复枚举进程树。正式时长命令：

```powershell
pnpm qa:soak:4h
pnpm qa:soak:24h
```
