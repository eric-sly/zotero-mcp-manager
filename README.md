# zotero-manager-mcp

[English](README.en.md) | [简体中文](README.md)

> **Zotero Manager MCP** — 一个精简的 Zotero 条目管理 MCP（Model Context Protocol）插件。提供元数据管理、注释、分类等能力，适配 **Zotero 10**。

---

## 简介

本插件是 Zotero 的 MCP 服务器实现，面向 **元数据管理与定位**。它移除了笨重的全文抽取与语义检索，专注在条目、注释、分类的管理上，轻量干净。

**定位：** 精简版条目管理 MCP。

---

## 功能

| 类别 | 工具 |
|---|---|
| **检索** | `search_library`（含作者/年份/标签/DOI/全文）、`search_libraries` |
| **条目** | `get_item_details`、`get_item_abstract`、`get_content`（Notes/Markdown 附件/摘要/网页） |
| **注释** | `search_annotations`、`get_annotations` |
| **分类** | `get_collections`、`search_collections`、`get_collection_details`、`get_collection_items`、`get_subcollections` |
| **分类写** | `create_collection`、`update_collection`、`delete_collection`、`add_items_to_collection`、`remove_items_from_collection` |
| **条目写** | `write_note`、`write_tag`、`write_metadata`、`write_item` |
| **库** | `get_libraries` |

---

## 安装

### 方式一：手动安装（推荐）

1. 下载最新的 xpi 文件（见 [Releases](https://github.com/eric-sly/zotero-mcp-manager/releases) 或 [GitHub Pages](https://eric-sly.github.io/zotero-mcp-manager/)）。
2. Zotero → 工具 → 插件 → ⚙️ → **Install Plugin From File…**
3. 选择下载的 `.xpi`，**重启 Zotero**。

> 升级时先移除旧版本再安装。

### 方式二：Zotero 自动更新

插件 `update_url` 指向 GitHub Pages 上的 `update.json`，Zotero 会自动检测并安装新版本（版本号升高时）。

---

## 连接 MCP 客户端

插件启动后在 `127.0.0.1:23121` 提供 **Streamable HTTP** 的 `/mcp` 端点（只监听本机）。

在 Zotero 插件设置的 **「MCP 连接信息」** 面板可查看端点并一键复制。

```
http://127.0.0.1:23121/mcp
```

通用 JSON 形态（字段名因客户端而异，请按对应文档适配）：

```json
{
  "type": "http",
  "url": "http://127.0.0.1:23121/mcp"
}
```

---

## 工具参考

### 检索

**`search_library`** — 高级检索，支持布尔运算与相关性排序。
常用参数：`q`、`title`、`yearRange`、`fulltext`（Zotero 原生全文）、`fulltextMode`（attachment/note/both）、`fulltextOperator`（contains/exact/regex）、`itemType`、`tags`、`limit`、`offset`。

**`search_libraries`** / **`get_libraries`** — 检索 / 列出库。

### 条目

**`get_item_details`** — 条目完整元数据（题录信息、创建者、标签、附件等）。

**`get_item_abstract`** — 条目摘要（`abstractNote`）。

**`get_content`** — 条目正文，聚合 Notes、Markdown/文本附件、摘要、网页快照。

### 注释

**`search_annotations`** / **`get_annotations`** — 检索 / 读取批注与高亮。

### 分类

**`get_collections`** / **`search_collections`**、**`get_collection_details`**、**`get_collection_items`**、**`get_subcollections`**。

**分类写**：`create_collection` / `update_collection` / `delete_collection` / `add_items_to_collection` / `remove_items_from_collection`。

### 写操作（默认关闭）

`write_note`、`write_tag`、`write_metadata`、`write_item` 默认**禁用**（安全考虑）。在插件设置里打开 **「启用写入操作」**。

---

## 内容模式与默认参数

默认 `standard` 模式，单次读取量受模式限制：

| 模式 | maxContentLength | maxAttachments | maxNotes | searchItemLimit |
|---|---|---|---|---|
| `minimal` | 1000 | 5 | 8 | 50 |
| `preview` | 4000 | 15 | 25 | 100 |
| `standard`（默认） | 8000 | 30 | 50 | 200 |
| `complete` | 无限制 | 无限制 | 无限制 | 2000 |

工具调用时可传 `mode` 参数覆盖。

---

## 开发

```bash
npm install
npm run build     # 构建到 .scaffold/build/zotero-manager-mcp.xpi
npm run start     # 开发模式（热重载）
```

技术栈：TypeScript + [zotero-plugin-scaffold](https://github.com/windingwind/zotero-plugin-scaffold)。

打 tag `vX.Y.Z` 触发 GitHub Actions，自动构建 xpi 并部署 `update.json` + xpi 到 GitHub Pages（自动更新通道）。

---

## License

[MIT](LICENSE)。
