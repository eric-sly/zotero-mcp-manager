# zotero-manager-mcp

[English](README.en.md) | [简体中文](README.md)

> **zotero-manager-mcp** — a Zotero item-management MCP plugin for Zotero 10.

Provides metadata management, annotations and collections for Zotero items.

---

## Features

| Category | Tools |
|---|---|
| **Search** | `search_library` (author/year/tags/DOI/fulltext), `search_libraries` |
| **Items** | `get_item_details`, `get_item_abstract`, `get_content` (Notes/Markdown attachments/abstract/webpage) |
| **Annotations** | `search_annotations`, `get_annotations` |
| **Collections** | `get_collections`, `search_collections`, `get_collection_details`, `get_collection_items`, `get_subcollections` |
| **Collection write** | `create_collection`, `update_collection`, `delete_collection`, `add_items_to_collection`, `remove_items_from_collection` |
| **Item write** | `write_note`, `write_tag`, `write_metadata`, `write_item` |
| **Libraries** | `get_libraries` |

---

## Installation

1. Download the latest xpi from [Releases](https://github.com/eric-sly/zotero-mcp-manager/releases) or [GitHub Pages](https://eric-sly.github.io/zotero-mcp-manager/).
2. Zotero → Tools → Add-ons → ⚙️ → **Install Plugin From File…**
3. Select the `.xpi`, **restart Zotero**.

> When upgrading, remove the old version first.

After installation, the plugin's `update_url` points to `update.json` on GitHub Pages; Zotero auto-detects and installs new versions when the version number increases.

---

## Connecting an MCP client

On startup the plugin exposes a **Streamable HTTP** `/mcp` endpoint at `127.0.0.1:23121` (loopback only).

In the plugin settings, the **"MCP Connection Info"** panel shows the endpoint and lets you copy it.

```
http://127.0.0.1:23121/mcp
```

Generic JSON shape (field names vary by client — check your client's docs):

```json
{
  "type": "http",
  "url": "http://127.0.0.1:23121/mcp"
}
```

---

## Tool reference

### Search

**`search_library`** — advanced search with boolean operators and relevance ranking.
Common params: `q`, `title`, `yearRange`, `fulltext` (Zotero native), `fulltextMode` (attachment/note/both), `fulltextOperator` (contains/exact/regex), `itemType`, `tags`, `limit`, `offset`.

**`search_libraries`** / **`get_libraries`** — search / list libraries.

### Items

**`get_item_details`** — full item metadata (citation info, creators, tags, attachments, ...).

**`get_item_abstract`** — item abstract (`abstractNote`).

**`get_content`** — item content, aggregating Notes, Markdown/text attachments, abstract, web snapshots.

### Annotations

**`search_annotations`** / **`get_annotations`** — search / read highlights and comments.

### Collections

**`get_collections`** / **`search_collections`**, **`get_collection_details`**, **`get_collection_items`**, **`get_subcollections`**.

**Collection write**: `create_collection` / `update_collection` / `delete_collection` / `add_items_to_collection` / `remove_items_from_collection`.

### Write operations (disabled by default)

`write_note`, `write_tag`, `write_metadata`, `write_item` are **disabled** by default (safety). Enable **"Write Operations"** in settings.

---

## Content modes & defaults

Default `standard` mode caps per-request reading:

| Mode | maxContentLength | maxAttachments | maxNotes | searchItemLimit |
|---|---|---|---|---|
| `minimal` | 1000 | 5 | 8 | 50 |
| `preview` | 4000 | 15 | 25 | 100 |
| `standard` (default) | 8000 | 30 | 50 | 200 |
| `complete` | unlimited | unlimited | unlimited | 2000 |

Override with a `mode` parameter in a tool call.

---

## Development

```bash
npm install
npm run build     # builds to .scaffold/build/zotero-manager-mcp.xpi
npm run start     # dev mode with hot reload
```

Stack: TypeScript + [zotero-plugin-scaffold](https://github.com/windingwind/zotero-plugin-scaffold).

Tagging `vX.Y.Z` triggers GitHub Actions: builds the xpi and deploys `update.json` + xpi to GitHub Pages (auto-update channel).

---

## License

[MIT](LICENSE).
