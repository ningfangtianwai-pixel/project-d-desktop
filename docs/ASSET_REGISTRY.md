# Project D 素材登记骨架

本文件用于人工审阅素材来源与分发资格。机器可读台账以 `docs/ASSET_LEDGER.json` 为准；本文件不会替代原始授权文件、许可快照、作者确认或法律审核。

## 当前结论

- 当前机器台账登记 33 项分发候选素材。
- 现有结论保持不变：这些素材均为 `pending-evidence`。
- `distributionEnabled` 当前均为 `false`。
- 在逐项证据审核完成前，不得宣称这些素材已获商用授权或可随公开安装包分发。
- Project D 源码采用 MIT License，不会自动改变任何素材的权利状态。

## 登记字段

每项素材至少应记录：

| 字段 | 说明 | 必填阶段 |
|---|---|---|
| `assetId` | 稳定且唯一的素材标识 | 入库时 |
| `file` | 仓库内相对路径 | 入库时 |
| `assetType` | 图片、视频、字体、音频、角色、图标或其他 | 入库时 |
| `author` | 作者或权利主体 | 审核前 |
| `originalUrl` | 原始来源页面，不使用搜索结果页 | 审核前 |
| `acquiredAt` | 获取日期 | 入库时 |
| `licenseType` | 明确许可证、书面授权或自有作品 | 审核前 |
| `licenseSnapshot` | 许可文本或授权文件的受控存档位置 | 放行前 |
| `evidenceSha256` | 授权证据文件哈希 | 放行前 |
| `fileSha256` | 实际分发文件哈希 | 构建前 |
| `allowedUses` | 使用、修改、商业使用、再分发等具体范围 | 放行前 |
| `territoryAndTerm` | 地区与期限限制 | 放行前 |
| `attribution` | 必须展示的署名或声明 | 放行前 |
| `reviewStatus` | `pending-evidence`、`approved`、`rejected` | 持续维护 |
| `reviewedBy` | 审核责任人或角色 | 放行前 |
| `reviewedAt` | 审核日期 | 放行前 |
| `distributionEnabled` | 是否允许进入公开分发包 | 构建前 |
| `notes` | 限制、替换计划、投诉或下架记录 | 按需 |

## 单项登记模板

```text
Asset ID:
Repository path:
Asset type:
Author/rightsholder: [pending]
Original source URL: [pending]
Acquisition date:
License or permission: [pending evidence]
Evidence archive reference: [pending]
Evidence SHA-256: [pending]
Distributed file SHA-256:
Allowed uses: [pending]
Territory/term restrictions: [pending]
Required attribution: [pending]
Review status: pending-evidence
Reviewed by: [pending]
Reviewed at: [pending]
Distribution enabled: false
Notes:
```

## 放行规则

只有同时满足以下条件，单项素材才可改为 `approved` 并启用分发：

1. 作者或权利主体可识别，来源可追溯。
2. 授权明确覆盖实际用途、修改方式和公开分发范围。
3. 许可或书面授权已保存，证据文件及分发文件哈希可核验。
4. 必要署名、免责声明和第三方通知已落实。
5. 素材文件与审核版本一致，未被未经复核地替换。
6. 审核责任人与日期已记录。

来源页面声称“免费”、素材由用户提供、素材由 AI 生成或文件已经存在于仓库，都不能单独视为完成授权证据。

## 证据目录建议

授权证据可能包含个人信息或合同内容，不应默认提交到公开仓库。公开台账只记录必要摘要和哈希；受控原件应存放在项目负责人批准的访问受限位置，并建立备份、权限和保留规则。

## 维护流程

- 新增或替换素材时，先登记并保持 `distributionEnabled: false`。
- 构建公开候选包前，执行素材台账校验并阻止未批准素材进入包。
- 授权范围变化、投诉、撤回或来源失效时，立即禁用分发并记录处置。
- 每个发布版本保存对应素材清单、文件哈希和审核快照。
