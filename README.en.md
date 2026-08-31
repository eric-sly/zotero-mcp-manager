# zotero-manager-mcp

[English](README.en.md) | [简体中文](README.md)

> **Zotero Manager MCP** — an MCP (Model Context Protocol) plugin for Zotero **metadata management and location**. A slim fork of [cookjohn/zotero-mcp](https://github.com/cookjohn/zotero-mcp) v1.5.0 that drops the broken PDF full-text extraction, full-text service, and semantic search, keeping only the most practical metadata capabilities. Optimized for **Zotero 10**.

---

## Why this fork

The upstream cookjohn/zotero-mcp v1.5.0 has compatibility issues on Zotero 10:

- **Silent PDF full-text extraction failure** (GitHub issue #104): Zotero 10 changed internals of the PDF worker, so the plugin can no longer extract PDF text; failures are swallowed and items only index title + abstract.
- `search_fulltext` times out consistently (30s); semantic index idles with 0 vectors (no embedding service configured).

Content retrieval (reading PDFs, semantic search) already has better local substitutes (e.g. zoterU/MinerU Markdown pipeline + knowledge base), so the plugin-internal pipeline is duplicated and exactly broken.

This fork therefore focuses on **metadata management & location**, removing the broken, duplicated content-retrieval capabilities.

**Key differences:**
- ❌ Removed: `search_fulltext`, `semantic_search`, `find_similar`, `semantic_status`, `fulltext_database` (5 retrieval tools)
- ❌ Removed: PDF extraction (pdfProcessor/pdfService), full-text service (fulltextService), semantic indexing (vector store + auto-index + preference panel)
- ✅ Kept: `search_library`'s **native** fulltext parameter (uses Zotero's own index), metadata management, annotations, collections, write operations
- 🎨 New identity: plugin name `zotero-manager-mcp`, new ID `zotero-mcp-manager@autoagent.my`, default port **23121** (separate from upstream's 23120), loopback-only.

---

## Features

| Category | Tools |
|---|---|
| **Search** | `search_library` (author/year/tags/DOI/native fulltext), `search_libraries` |
| **Items** | `get_item_details`, `get_item_abstract`, `get_content` (reads Notes/Markdown attachments/abstract/webpage) |
| **Annotations** | `search_annotations`, `get_annotations` |
| **Collections** | `get_collections`, `search_collections`, `get_collection_details`, `get_collection_items`, `get_subcollections` |
| **Collection write** | `create_collection`, `update_collection`, `delete_collection`, `add_items_to_collection`, `remove_items_from_collection` |
| **Item write** | `write_note`, `write_tag`, `write_metadata`, `write_item` |
| **Libraries** | `get_libraries` |

---

## Installation

### Method 1: Manual (recommended, current version)

1. Download the latest xpi from [Releases](https://github.com/eric-sly/zotero-mcp-manager/releases) or [GitHub Pages](https://eric-sly.github.io/zotero-mcp-manager/).
2. Zotero → Tools → Add-ons → ⚙️ (gear) → **Install Plugin From File…**
3. Select the `.xpi`, then **restart Zotero**.

> When upgrading, remove the old version first, then install.

### Method 2: Zotero auto-update

The plugin's `update_url` points to `update.json` hosted on GitHub Pages; Zotero will detect and install new versions automatically (only when the version number increases).

---

## Connecting an MCP client

On startup the plugin exposes a **Streamable HTTP** `/mcp` endpoint at `127.0.0.1:23121` (loopback only, no remote access).

In the plugin preference panel, the **"MCP Connection Info"** section shows the endpoint and lets you copy it. Connect your own AI client (Claude Code / Cursor / Codex / Qwen Code etc.) per your client's MCP setup. The endpoint is:

```
http://127.0.0.1:23121/mcp
```

Generic JSON shape (field names vary by client — check your client docs):

```json
{
  "type": "http",
  "url": "http://127.0.0.1:23121/mcp"
}
```

> This fork no longer generates one-click configs per client — please adapt to your agent's documentation yourself.

---

## Tool reference

### Search

**`search_library`** — advanced search with boolean operators and relevance ranking.
Common params: `q`, `title`, `yearRange`, `fulltext` (Zotero native), `fulltextMode` (attachment/note/both), `fulltextOperator` (contains/exact/regex), `itemType`, `tags`, `limit`, `offset`.

**`search_libraries`** / **`get_libraries`** — search / list libraries.

### Items

**`get_item_details`** — full item metadata (citation info, creators, tags, attachments, ...).

**`get_item_abstract`** — item abstract (reads the `abstractNote` field).

**`get_content`** — reads item content, aggregating:
- Notes
- Markdown / text attachments (e.g. zoterU/MinerU note-style attachments)
- Abstract
- Web snapshots (HTML)

> PDF attachments are no longer extracted by the plugin (replaced by the external Markdown pipeline); content length is capped by mode (see below).

### Annotations

**`search_annotations`** / **`get_annotations`** — search / read highlights and comments.

### Collections

**`get_collections`** / **`search_collections`**, **`get_collection_details`**, **`get_collection_items`**, **`get_subcollections`**.

**Collection write**: `create_collection` / `update_collection` / `delete_collection` / `add_items_to_collection` / `remove_items_from_collection`.

### Write operations (disabled by default)

`write_note`, `write_tag`, `write_metadata`, `write_item` are **disabled** by default (safety). Enable the **"Write Operations"** toggle in the plugin settings.

---

## Content modes & defaults

The plugin caps per-request reading by content mode. Default is `standard`:

| Mode | maxContentLength | maxAttachments | maxNotes | searchItemLimit |
|---|---|---|---|---|
| `minimal` | 1000 | 5 | 8 | 50 |
| `preview` | 4000 | 15 | 25 | 100 |
| `standard` (default) | 8000 | 30 | 50 | 200 |
| `complete` | unlimited | unlimited | unlimited | 2000 |

You can override with a `mode` parameter in a tool call.

---

## Migrating from upstream

Upstream and this fork are two independent plugins (different IDs) and can coexist. Default ports differ (upstream 23120, this fork 23121), so no conflict. Suggested:

1. Install and enable this fork.
2. Remove the upstream plugin (optional, harmless to keep).
3. Update your MCP client config, changing the port from `23120` to `23121`.

---

## Development

```bash
npm install
npm run build     # builds to .scaffold/build/zotero-manager-mcp.xpi
npm run start     # dev mode with hot reload
```

Stack: TypeScript + [zotero-plugin-scaffold](https://github.com/windingwind/zotero-plugin-scaffold).

### Release

Tagging `vX.Y.Z` triggers GitHub Actions (`.github/workflows/release.yml`): builds the xpi and deploys `update.json` + `zotero-manager-mcp-X.Y.Z.xpi` to **GitHub Pages** (the auto-update channel).

---

## License

[MIT](LICENSE). Built on [cookjohn/zotero-mcp](https://github.com/cookjohn/zotero-mcp) (MIT).
