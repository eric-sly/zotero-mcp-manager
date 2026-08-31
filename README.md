# zotero-manager-mcp

[English](README.en.md) | [简体中文](README.md)

> **Zotero Manager MCP** — 一个用于 Zotero **元数据管理与定位**的 MCP（Model Context Protocol）插件。是 [cookjohn/zotero-mcp](https://github.com/cookjohn/zotero-mcp) v1.5.0 的精简 fork，砍掉了 PDF 全文抽取、全文服务与语义搜索，只保留最实用的元数据能力，适配 **Zotero 10**。

---

## 为什么要做这个 fork

官方 cookjohn/zotero-mcp v1.5.0 在 Zotero 10 下存在适配问题：

- **PDF 全文抽取静默失效**（GitHub issue #104）：Zotero 10 改了 PDF worker 的内部接口，插件无法再抽取 PDF 文本，失败被静默吞掉，条目只索引到标题+摘要。
- `search_fulltext` 稳定超时（30s），语义索引 0 向量空转（未配置嵌入服务）。

而内容检索（读 PDF、语义搜索）在本地已有更好的替代（如 zoterU/MinerU 的 Markdown 管线 + 知识库），插件内这套是重复建设且恰好坏掉。

因此本 fork **聚焦元数据管理与定位**，删掉被破坏的、重复的内容检索能力。

**核心差异：**
- ❌ 删除：`search_fulltext`、`semantic_search`、`find_similar`、`semantic_status`、`fulltext_database`（5 个检索工具）
- ❌ 删除：PDF 抽取（pdfProcessor / pdfService）、全文服务（fulltextService）、语义索引（向量库 + 自动索引 + 偏好面板）
- ✅ 保留：`search_library` 的**原生** fulltext 参数（走 Zotero 自带索引）、元数据管理、注释、分类、写操作
- 🎨 换成全新身份：插件名 `zotero-manager-mcp`、新 ID `zotero-mcp-manager@autoagent.my`、默认端口 **23121**（与官方版 23120 分离）、只监听本机

---

## 功能特性

| 类别 | 工具 |
|---|---|
| **检索** | `search_library`（含作者/年份/标签/DOI/原生全文）、`search_libraries` |
| **条目** | `get_item_details`、`get_item_abstract`、`get_content`（读 Notes/Markdown 附件/摘要/网页） |
| **注释** | `search_annotations`、`get_annotations` |
| **分类** | `get_collections`、`search_collections`、`get_collection_details`、`get_collection_items`、`get_subcollections` |
| **分类写** | `create_collection`、`update_collection`、`delete_collection`、`add_items_to_collection`、`remove_items_from_collection` |
| **条目写** | `write_note`、`write_tag`、`write_metadata`、`write_item` |
| **库** | `get_libraries` |

完整工具说明见下方 **工具参考**。

---

## 安装

### 方式一：手动安装（推荐，当前版本）

1. 下载最新的 xpi 文件（见 [Releases](https://github.com/eric-sly/zotero-mcp-manager/releases) 或 [GitHub Pages](https://eric-sly.github.io/zotero-mcp-manager/)）。
2. Zotero → 工具 → 插件 → ⚙️（设置齿轮）→ **Install Plugin From File…**
3. 选择下载的 `.xpi`，然后**重启 Zotero**。

> 如果升级，先移除旧版本再安装。

### 方式二：Zotero 自动更新

插件的 `update_url` 指向 GitHub Pages 上的 `update.json`，Zotero 会自动检测并安装新版本（仅当版本号升高时）。

---

## 连接 MCP 客户端

插件启动后在 `127.0.0.1:23121` 提供 **Streamable HTTP** 的 `/mcp` 端点（只监听本机，无远程访问）。

在 Zotero 插件设置里的 **「MCP 连接信息」** 面板能看到端点并一键复制。自己的 AI 客户端（Claude Code / Cursor / Codex / Qwen Code 等）按各自的 MCP 配置方式接入，端点统一为：

```
http://127.0.0.1:23121/mcp
```

通用 JSON 形态（各客户端字段名可能不同，请查阅对应文档自行适配）：

```json
{
  "type": "http",
  "url": "http://127.0.0.1:23121/mcp"
}
```

> 本 fork 不再提供各客户端的一键配置生成——agent 适配请按你的客户端文档自行完成。

---

## 工具参考

### 检索

**`search_library`** — 高级检索，支持布尔运算与相关性排序。
常用参数：`q`（关键词）、`title`、`yearRange`、`fulltext`（Zotero 原生全文）、`fulltextMode`（attachment/note/both）、`fulltextOperator`（contains/exact/regex）、`itemType`、`tags`、`limit`、`offset`。

**`search_libraries`** / **`get_libraries`** — 检索 / 列出库。

### 条目

**`get_item_details`** — 条目的完整元数据（题录信息、创建者、标签、附件等）。

**`get_item_abstract`** — 条目的摘要（读 `abstractNote` 字段）。

**`get_content`** — 读取条目的正文内容，聚合来源：
- Notes（笔记）
- Markdown / 文本附件（如 zoterU/MinerU 生成的笔记类附件）
- 摘要（abstract）
- 网页快照（HTML）

> PDF 附件不再被插件抽取（由外部 Markdown 管线替代）；内容长度受模式限制（见下）。

### 注释

**`search_annotations`** / **`get_annotations`** — 检索 / 读取批注与高亮。

### 分类（集合）

**`get_collections`** / **`search_collections`**、**`get_collection_details`**、**`get_collection_items`**、**`get_subcollections`**。

**分类写**：`create_collection` / `update_collection` / `delete_collection` / `add_items_to_collection` / `remove_items_from_collection`。

### 写操作（默认关闭）

`write_note`、`write_tag`、`write_metadata`、`write_item` 默认**禁用**（安全考虑）。需要在 Zotero 插件设置里打开 **「启用写入操作」** 开关。

---

## 内容模式与默认参数

插件按内容模式（mode）控制单次读取的量。默认 `standard`：

| 模式 | maxContentLength | maxAttachments | maxNotes | searchItemLimit |
|---|---|---|---|---|
| `minimal` | 1000 | 5 | 8 | 50 |
| `preview` | 4000 | 15 | 25 | 100 |
| `standard`（默认） | 8000 | 30 | 50 | 200 |
| `complete` | 无限制 | 无限制 | 无限制 | 2000 |

可在工具调用时传 `mode` 参数覆盖。

---

## 从官方版迁移

官方版与这个 fork 是**两个独立插件**（不同 ID），可同时安装。默认端口不同（官方 23120、本 fork 23121），不冲突。建议：

1. 安装并启用本 fork。
2. 删除官方版（可选，保留也无碍）。
3. 更新你的 MCP 客户端配置，把端口从 `23120` 改为 `23121`。

---

## 开发

```bash
npm install
npm run build     # 构建到 .scaffold/build/zotero-manager-mcp.xpi
npm run start     # 开发模式（热重载）
```

技术栈：TypeScript + [zotero-plugin-scaffold](https://github.com/windingwind/zotero-plugin-scaffold)。

### 发布

打 tag `vX.Y.Z` 会触发 GitHub Actions（`.github/workflows/release.yml`）：自动构建 xpi，并把 `update.json` + `zotero-manager-mcp-X.Y.Z.xpi` 部署到 **GitHub Pages**（即自动更新通道）。

---

## License

[MIT](LICENSE)。基于 [cookjohn/zotero-mcp](https://github.com/cookjohn/zotero-mcp)（MIT）构建。
