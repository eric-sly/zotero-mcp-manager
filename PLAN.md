# Zotero MCP 精简版 — 实施计划（归档）

> 状态：**已归档，待实施**（2026-08-31 确认方案，老大批准后执行）
> 依据：cookjohn/zotero-mcp **v1.5.0** 源码（`git clone https://github.com/cookjohn/zotero-mcp.git`）

## 背景与目标

cookjohn/zotero-mcp v1.5.0 在 Zotero 10 下存在适配问题：

- **PDF 全文抽取静默失效**（GitHub issue #104，2026-08-26 开）：Zotero 10 改了 PDF worker 三个内部接口（worker URL → `resource://zotero/document-worker/worker.js`、action `"getFulltext"` → `"pdf.getFulltext"`、资源回调统一为 `FetchData` 返回裸 `Uint8Array`），失败被 catch 静默吞掉，条目只索引到标题+摘要。作者未回、未发版。
- 本机实测：`search_fulltext` 稳定 30s 超时；语义索引 0 向量空转（未配嵌入）。

**目标**：fork 一份精简版「Zotero MCP 管理器」，砍掉插件自带的 PDF 全文抽取、全文服务、语义搜索，只保留**元数据管理与定位**能力。内容检索能力已有更好替代（zoterU/MinerU 的 Markdown 管线 + 副机 composites-kb 知识库），插件内这套是重复建设且恰好坏掉。

## 已拍板决策（老大 2026-08-31 确认）

| # | 决策 | 选择 |
|---|---|---|
| 1 | 语义搜索（semantic_search/find_similar/semantic_status + 向量库 + 自动索引） | **一并砍掉** |
| 2 | search_library 的 fulltext 参数（走 Zotero 原生索引，非坏掉的那套） | **保留**（searchEngine.ts 不动） |
| 3 | 插件 ID | **换新 ID**：`zotero-mcp-manager@autoagent.my`（可与官方并存） |
| 4 | 分发更新 | **推 GitHub 私有仓库**（源码私有） |

## 保留 vs 删除

**保留**（元数据管理，实测全正常）：
`search_library`（含 Zotero 原生 fulltext 参数）、`get_item_details`、`get_content`（读 md 附件/笔记/摘要/网页，去掉 PDF 抽取兜底）、`get_item_abstract`、`search_annotations`/`get_annotations`、全部 collection 工具（树/详情/成员/子分类/CRUD）、全部 write 工具（note/tag/metadata/item）。

**删除**（内容检索，5 个工具 + 整套基础模块）：
`search_fulltext`、`semantic_search`、`find_similar`、`semantic_status`、`fulltext_database`；
PDF 抽取（pdfProcessor/pdfService）、全文服务（fulltextService）、语义索引（semantic/ 目录 + semanticIndexColumn + hooks 索引逻辑 + 偏好 UI 语义面板 + 向量库）。

## 关键依赖处理（隐藏坑）

1. **get_content 依赖 pdfProcessor 做 PDF 抽文回退** → 改 `unifiedContentExtractor.ts`：删 PDF 分支（:10 import、:401-403、:490-504 getZoteroCachedFulltext、:509-534 extractPDFText）。md 附件走 `isText → extractPlainText`（与 PDF 无关，自动保留）。
2. **get_item_abstract（保留）依赖 FulltextService.getItemAbstract** → 在 `apiHandlers.ts:1005` 内联为 `item.getField('abstractNote')`（纯元数据，约 7 行逻辑），之后才能删 fulltextService.ts。
3. **pdfService.ts 是死代码**（0 引用者），直接删。
4. **hooks.ts 有整片语义索引接线**（notifier、10 分钟定时器、右键菜单、索引状态列、shutdown 清理）→ 整片删除。

## 文件改动清单（行号基于 v1.5.0 源，实施时以实际为准）

### 删整文件
- `src/modules/semantic/`（5 个：index.ts / semanticSearchService.ts / embeddingService.ts / textChunker.ts / vectorStore.ts）
- `src/modules/semanticIndexColumn.ts`
- `src/modules/pdfService.ts`
- `src/modules/fulltextService.ts`（先内联 getItemAbstract）
- `scripts/download-models.ps1`（语义模型下载，纯语义相关）

### streamableMCPServer.ts（工具注册/分发/实现核心，2859 行）
- 删 import：`:11` handleSearchFulltext、`:22` getSemanticSearchService/SemanticSearchService
- 删工具定义：`:757-784`（search_fulltext）、`:805-862`（semantic_search/find_similar/semantic_status，含注释）、`:863-895`（fulltext_database）
- 删语义工具过滤逻辑 `:1071-1076`（semanticToolNames），`:1083-1085` 改回直接用 `tools`
- 删分发 case：`:1238-1243`（search_fulltext）、`:1252-1270`（semantic 合并块）、`:1272-1277`（fulltext_database）
- 删实现方法：`:1651-1687`（callSearchFulltext）、`:1707-1813`（callSemanticSearch/callFindSimilar/callSemanticStatus）、`:1815-1927`（callFulltextDatabase）、`:2768-2792`（getFulltextModeConfiguration，仅被 callSearchFulltext 用）
- 删 availableTools：`:2746`（search_fulltext）、`:2748-2753`（semantic 三件套 + fulltext_database）
- **search_library 的 fulltext 参数保留**（走 Zotero 原生索引）

### apiHandlers.ts
- 删 `import { FulltextService }`（:15）
- 删 `handleSearchFulltext`（:908-965）
- `handleGetItemAbstract`（:973）内联 `item.getField('abstractNote')`

### unifiedContentExtractor.ts
- 删 `import { PDFProcessor }`（:10）
- 删 processAttachment 的 PDF 分支（:401-403）
- 删 `getZoteroCachedFulltext`（:490-504）、`extractPDFText`（:509-534）
- ContentIncludeOptions.pdf 选项删除
- 保留 md/notes/abstract/HTML 分支（md 自动保留）

### hooks.ts（1317 行，删全部语义索引接线）
- 删 import semanticIndexColumn（:8）、PREF 常量（:11-12）
- 删 `processPendingAutoUpdates`/`scheduleAutoUpdate`（:66-129）
- 删 `handleItemsDeleted`（:134-172）
- 删 `registerItemNotifier`/`unregisterItemNotifier`（:174-230、:359）
- 删 `startAutoIndexCheck`/`stopAutoIndexCheck`（:232-270）
- 删 `triggerAutoIndexBuild`（:275-357）
- 删 onStartup 注册 notifier（:467）、onMainWindowLoad 菜单/列注册（:491-498）
- 删 shutdown 语义清理（:526-580）
- 删右键菜单 + 5 个 index/clear 处理函数（:755-1296）

### 偏好 UI
- `addon/content/preferences.xhtml`：删 `:33-34`（两条 pref 声明）、`:244`（CSS）、`:492-761`（语义搜索整节）
- `src/modules/preferenceScript.ts`：删 `:163`、`:285-296`、`:378-1720`（bindSemanticEnabledToggle / bindEmbeddingSettings / bindSemanticStatsSettings 全部，含 18 处 `require("./semantic/...")`）
- locale：`addon/locale/en-US/preferences.ftl:69-203`（pref-semantic-*/pref-embedding-*/pref-stat-*/pref-api-*）、`addon.ftl:319-328`（menu-semantic-*）；zh-CN 等其余语言同理

### 不动
`serverPreferences.ts`、`mcpSettingsService.ts`、`addon/prefs.js`、`textFormatter.ts`、`itemFormatter.ts`（hasFulltext 布尔标记可留可清）、`searchEngine.ts`

## 身份与更新通道（关键限制）

**Zotero 插件自动更新是匿名 HTTP，无法访问私有仓库 release 资产** —— "私有仓库 + 自动更新"不可直接组合。采用与 zoterU 一致的模式：

- **源码推 GitHub 私有仓库**（源码私有）
- **GitHub Pages 托管 `update.json` + `xpi`**（仅这两个文件公开、匿名可下载，Zotero 可自动更新）
- 备选：接受无自动更新 → 私有仓库 + 手动装 xpi

改动点：
- 新插件 ID `zotero-mcp-manager@autoagent.my`：改 `addon/manifest.json` 模板 __addonID__、`package.json` config（addonID/addonRef/prefsPrefix）、update.json 的 addons key、名称改为 "Zotero MCP Manager"
- 版本从 v1.0.0 起（标记独立精简版）
- `zotero-plugin.config.ts`：updateURL → 新通道 update.json；xpiDownloadLink 模板 → 新仓库
- `update.json`：重建，指向新通道的 xpi
- `scripts/prepare-release.js`：改 repoUrl（:20）、update_link（:24）、版本兼容范围（:36-37）

## 构建与安装

1. 源码 clone/copy 到本目录（`F:\LLM\zcode workspace\zotero-mcp-slim`），重新 `git init`
2. `npm install` + `npm run build` → `.scaffold/build/zotero-mcp-plugin.xpi`
3. **备份当前官方版 xpi**：`C:\Users\sly\AppData\Roaming\Zotero\Zotero\Profiles\uwaqfgd7.default\extensions\zotero-mcp-plugin@autoagent.my.xpi`（复制留存，防回退）
4. 安装新 xpi 到 Zotero（需重启 Zotero，新旧并存）
5. 在 ZCode 里验证 MCP 工具（若端口冲突需调新插件端口）

## 验证清单

- `tsc --noEmit` 编译通过；grep 确认无 search_fulltext/semantic/fulltext_database/PDFProcessor/FulltextService 残留（search_library 的 Zotero 原生 fulltext 参数除外）
- 安装后实测保留工具：search_library（关键词/作者/年份/标签/DOI）、get_item_details、get_content（读 MinerU md 附件）、get_item_abstract、注释、分类、写操作
- 确认 tools/list 里 5 个检索工具已消失
- Zotero 日志无启动错误（无对已删模块的引用）

## 风险与回退

- 3 个大文件（streamableMCPServer 2859 行、hooks 1317 行、preferenceScript 1796 行）改动面大，注意行号漂移；逐文件验证
- 装插件需 Zotero 重启，期间短暂影响当前 zotero-mcp 使用
- 回退：已备份官方版 xpi，随时重装恢复

## 环境备注

- 本机 Zotero 10.0（`C:\Program Files\Zotero\zotero.exe`），官方版 v1.5.0 插件位于 `...\Profiles\uwaqfgd7.default\extensions\zotero-mcp-plugin@autoagent.my.xpi`，MCP 端口 23120
- 官方版 tools/list 共 27 个工具；v1.5.0 语义索引 0 向量（未配嵌入）
- 副机 192.168.1.105 Ollama（11434）可作将来嵌入后端（本次不涉及）
