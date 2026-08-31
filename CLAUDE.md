# Zotero MCP Manager

## Project Overview
A Zotero plugin that provides MCP (Model Context Protocol) server functionality for **metadata management and location**. Fork of cookjohn/zotero-mcp v1.5.0 with full-text extraction, fulltext service, and semantic search removed.

## Tech Stack
- TypeScript
- Zotero Plugin API (Firefox/Gecko-based)
- zotero-plugin-scaffold for building

## Key Directories
- `src/` - TypeScript source code
- `addon/` - Plugin assets (manifest, locales, preferences UI)
- `.scaffold/build/` - Build output
- `update.json` - Zotero auto-update manifest (hosted on GitHub Pages)

## Build Commands
```bash
npm run build      # Production build
npm run start      # Development with hot reload
```

## Important Patterns

### Preferences
- Prefix: `extensions.zotero.zotero-mcp-manager`
- Defined in `addon/content/preferences.xhtml`
- Accessed via `Zotero.Prefs.get/set`

### Localization
- English: `addon/locale/en-US/preferences.ftl`
- Chinese: `addon/locale/zh-CN/preferences.ftl`

### Release Workflow
Zotero auto-update is anonymous HTTP, so release assets are hosted on **GitHub Pages** (not private release assets):
- `update.json` + `zotero-mcp-manager-<version>.xpi` → `https://eric-sly.github.io/zotero-mcp-manager/`
- Source repo is private: `https://github.com/eric-sly/zotero-mcp-manager`

Key points:
- Version in: `package.json`, `update.json`
- Build: `npm run build` → `.scaffold/build/zotero-mcp-plugin.xpi`
- Release: tag `vX.Y.Z` → `release.yml` builds + deploys Pages assets

## Code Style
- Use ztoolkit.log for logging
- Follow existing patterns in codebase
- Chinese comments are acceptable
