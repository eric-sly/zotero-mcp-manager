pref-help = { $name } Build { $version } { $time }

pref-server-title = MCP Server
pref-section-server-desc = AI clients connect to your Zotero library through this service
pref-server-enable =
    .label = Enable Server
pref-server-enable-text = Enable Server
pref-server-port = Port
pref-server-port-invalid = Port must be between 1024 and 65535.
pref-server-port-restart-hint = Restart server after changing
pref-server-allow-remote =
    .label = Allow remote access (listen on 0.0.0.0)
pref-server-remote-text = Allow Remote Access
pref-server-remote-sub = Ensure your network is secure before enabling
pref-server-allow-remote-warning = Warning: This will expose the MCP server to the network. Only enable if you need remote access or have VPN/proxy issues.
pref-server-off-hint = MCP server is disabled. Enable it to configure clients and search features.

pref-mcp-settings-title = Content Settings
pref-mcp-settings-description = Configure how the MCP server processes and returns content to AI clients
pref-section-content-desc = Control the amount and format of content returned to AI
pref-max-tokens-label = Max Tokens
pref-content-mode-label = Content Mode
pref-mode-minimal = Minimal (500 chars)
pref-mode-preview = Preview (1.5K chars)
pref-mode-standard = Standard (3K chars)
pref-mode-complete = Complete (unlimited)
pref-mode-custom = Custom
pref-custom-settings-title = Custom Parameters
pref-custom-settings-hint = Effective when Custom mode is selected
pref-content-length-label = Max Content Length
pref-max-attachments-label = Max Attachments
pref-max-notes-label = Max Notes
pref-truncate-length-label = Truncate Length
pref-keyword-count-label = Keywords
pref-search-limit-label = Search Limit
pref-max-annotations-label = Max Annotations
pref-include-webpage-label =
    .label = Include webpage snapshots
pref-include-webpage-text = Include webpage snapshots
pref-enable-compression-label =
    .label = Enable content compression
pref-enable-compression-text = Enable content compression
pref-include-metadata-label =
    .label = Include item metadata in responses
pref-include-metadata-text = Include Metadata
pref-include-metadata-sub = Return title, authors, DOI and other fields

pref-client-config-title = Client Configuration
pref-client-config-description = Generate MCP server configuration files for popular AI clients to easily connect to the Zotero MCP server.
pref-section-client-desc = Select your AI client and generate connection config
pref-client-type-label = Client
pref-server-name-label = Server Name
pref-generate-config-button =
    .label = Generate Config
pref-generate-config-button-text = Generate Config
pref-copy-config-button =
    .label = Copy Config
pref-copy-config-button-text = Copy Config
pref-copy-instr-button =
    .label = Copy Instructions
pref-copy-instr-button-text = Copy Instructions
pref-config-output-label = Configuration
pref-config-output-placeholder = Click Generate Config to generate client configuration...
pref-config-guide-title = Instructions
pref-config-guide-placeholder = Select client type and generate configuration to display detailed setup guide here...
pref-client-codex-cli = Codex CLI
pref-client-custom-http = Custom HTTP Client

pref-section-index-label = Index

pref-detail-stats-title = Detailed Stats & API Usage
pref-detail-index-section = Index Details
pref-detail-api-section = API Cumulative

first-install-title = Welcome to Zotero MCP Manager
first-install-prompt = Thank you for installing the Zotero MCP Manager! To get started, you need to generate configuration files for your AI clients. Would you like to open the settings page now to generate configurations?
first-install-open-prefs = Open Settings
first-install-later = Configure Later

pref-write-enable-text = Enable Write Operations
pref-write-enable-sub = Allow AI clients to create and modify notes (disabled by default for safety)

pref-contact-title = Contact Information
pref-contact-email = Email: sly@autoagent.my
pref-contact-github = GitHub: https://github.com/eric-sly/zotero-mcp-manager
pref-contact-wechat = WeChat: 未来论文实验室
