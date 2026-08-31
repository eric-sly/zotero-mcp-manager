import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { ClientConfigGenerator } from "./clientConfigGenerator";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Registering preference scripts...`);
  
  addon.data.prefs = { window: _window };
  
  // 诊断当前偏好设置状态
  try {
    const currentEnabled = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.enabled", true);
    const currentPort = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.port", true);
    ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Current preferences - enabled: ${currentEnabled}, port: ${currentPort}`);
    
    // 检查是否是环境兼容性问题
    const doc = _window.document;
    ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Document available: ${!!doc}`);
    
    if (doc) {
      const prefElements = doc.querySelectorAll('[preference]');
      ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Found ${prefElements.length} preference-bound elements`);
      
      // 特别检查服务器启用元素
      const serverEnabledElement = doc.querySelector(`#zotero-prefpane-${config.addonRef}-mcp-server-enabled`);
      if (serverEnabledElement) {
        ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Server enabled element found, initial checked state: ${serverEnabledElement.hasAttribute('checked')}`);
      } else {
        ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] WARNING: Server enabled element NOT found`);
      }
    }
  } catch (error) {
    ztoolkit.log(`[PreferenceScript] [DIAGNOSTIC] Error in preference diagnostic: ${error}`, 'error');
  }
  
  bindPrefEvents();
}

/**
 * Bind an HTML checkbox to a Zotero preference (init + sync on change)
 */
function bindHtmlCheckbox(doc: Document, selector: string, prefKey: string) {
  const el = doc?.querySelector(selector) as HTMLInputElement;
  if (!el) return;
  const val = Zotero.Prefs.get(prefKey, true);
  el.checked = val !== false && val !== undefined;
  el.addEventListener("change", () => {
    Zotero.Prefs.set(prefKey, el.checked, true);
  });
}

/**
 * Bind an HTML text/number input to a Zotero preference
 */
function bindHtmlInput(doc: Document, selector: string, prefKey: string, isNumber = false) {
  const el = doc?.querySelector(selector) as HTMLInputElement;
  if (!el) return;
  const val = Zotero.Prefs.get(prefKey, true);
  if (val !== undefined && val !== null) el.value = String(val);
  el.addEventListener("change", () => {
    const v = isNumber ? parseInt(el.value, 10) : el.value;
    if (isNumber && isNaN(v as number)) return;
    Zotero.Prefs.set(prefKey, v, true);
  });
}

/**
 * Bind an HTML select to a Zotero preference
 */
function bindHtmlSelect(doc: Document, selector: string, prefKey: string) {
  const el = doc?.querySelector(selector) as HTMLSelectElement;
  if (!el) return;
  const val = Zotero.Prefs.get(prefKey, true);
  if (val !== undefined && val !== null) el.value = String(val);
  el.addEventListener("change", () => {
    Zotero.Prefs.set(prefKey, el.value, true);
  });
}

function bindPrefEvents() {
  const doc = addon.data.prefs!.window.document;

  // Server enabled toggle (HTML checkbox in toggle switch)
  const serverEnabledCheckbox = doc?.querySelector(
    `#zotero-prefpane-${config.addonRef}-mcp-server-enabled`,
  ) as HTMLInputElement;

  if (serverEnabledCheckbox) {
    // Initialize checkbox state
    const currentEnabled = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.enabled", true);
    serverEnabledCheckbox.checked = currentEnabled !== false;
    ztoolkit.log(`[PreferenceScript] Initialized checkbox state: ${currentEnabled}`);

    // Add change listener (HTML checkbox uses 'change' event)
    serverEnabledCheckbox.addEventListener("change", () => {
      const checked = serverEnabledCheckbox.checked;
      ztoolkit.log(`[PreferenceScript] Server toggle changed - checked: ${checked}`);

      // Update preference manually
      Zotero.Prefs.set("extensions.zotero.zotero-mcp-manager.mcp.server.enabled", checked, true);

      // Update cascade visibility
      updateServerDependentUI(doc, checked);

      // Directly control server
      try {
        const httpServer = addon.data.httpServer;
        if (httpServer) {
          if (checked) {
            if (!httpServer.isServerRunning()) {
              const portPref = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.port", true);
              const port = typeof portPref === 'number' ? portPref : 23120;
              httpServer.start(port);
              ztoolkit.log(`[PreferenceScript] Server started on port ${port}`);
            }
          } else {
            if (httpServer.isServerRunning()) {
              httpServer.stop();
              ztoolkit.log(`[PreferenceScript] Server stopped`);
            }
          }
        }
      } catch (error) {
        ztoolkit.log(`[PreferenceScript] Error controlling server: ${error}`, 'error');
      }
    });

    // Initialize cascade visibility
    updateServerDependentUI(doc, currentEnabled !== false);
  }
  
  // Port input validation
  const portInput = doc?.querySelector(
    `#zotero-prefpane-${config.addonRef}-mcp-server-port`,
  ) as HTMLInputElement;

  // Initialize port value from pref
  if (portInput) {
    const savedPort = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.port", true);
    if (savedPort) portInput.value = String(savedPort);
  }

  portInput?.addEventListener("change", () => {
    if (portInput) {
      const port = parseInt(portInput.value, 10);
      if (isNaN(port) || port < 1024 || port > 65535) {
        addon.data.prefs!.window.alert(
          getString("pref-server-port-invalid" as any),
        );
        const originalPort = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.port", true) || 23120;
        portInput.value = originalPort.toString();
      } else {
        Zotero.Prefs.set("extensions.zotero.zotero-mcp-manager.mcp.server.port", port, true);
      }
    }
  });

  // Bind HTML toggle switches (these need manual pref sync since they're not XUL checkboxes)
  bindHtmlCheckbox(doc, `#zotero-prefpane-${config.addonRef}-mcp-server-allow-remote`, "extensions.zotero.zotero-mcp-manager.mcp.server.allowRemote");
  bindHtmlCheckbox(doc, `#zotero-prefpane-${config.addonRef}-include-metadata`, "extensions.zotero.zotero-mcp-manager.ui.includeMetadata");
  bindHtmlCheckbox(doc, `#zotero-prefpane-${config.addonRef}-custom-include-webpage`, "extensions.zotero.zotero-mcp-manager.custom.includeWebpage");
  bindHtmlCheckbox(doc, `#zotero-prefpane-${config.addonRef}-custom-enable-compression`, "extensions.zotero.zotero-mcp-manager.custom.enableCompression");

  // Bind HTML number/text inputs that need manual pref sync
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-max-tokens`, "extensions.zotero.zotero-mcp-manager.ai.maxTokens", true);
  bindHtmlSelect(doc, `#zotero-prefpane-${config.addonRef}-content-mode`, "extensions.zotero.zotero-mcp-manager.content.mode");
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-content-length`, "extensions.zotero.zotero-mcp-manager.custom.maxContentLength", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-max-attachments`, "extensions.zotero.zotero-mcp-manager.custom.maxAttachments", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-max-notes`, "extensions.zotero.zotero-mcp-manager.custom.maxNotes", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-keyword-count`, "extensions.zotero.zotero-mcp-manager.custom.keywordCount", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-truncate-length`, "extensions.zotero.zotero-mcp-manager.custom.smartTruncateLength", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-search-limit`, "extensions.zotero.zotero-mcp-manager.custom.searchItemLimit", true);
  bindHtmlInput(doc, `#zotero-prefpane-${config.addonRef}-custom-max-annotations`, "extensions.zotero.zotero-mcp-manager.custom.maxAnnotationsPerRequest", true);

  // Client config generation
  const clientSelect = doc?.querySelector("#client-type-select") as HTMLSelectElement;
  const serverNameInput = doc?.querySelector("#server-name-input") as HTMLInputElement;
  const generateButton = doc?.querySelector("#generate-config-button") as HTMLButtonElement;
  const copyConfigButton = doc?.querySelector("#copy-config-button") as HTMLButtonElement;
  const copyInstrButton = doc?.querySelector("#copy-instr-button") as HTMLButtonElement;
  const configOutput = doc?.querySelector("#config-output") as HTMLElement;
  const configGuide = doc?.querySelector("#config-guide") as HTMLElement;

  let currentConfig = "";
  let currentGuide = "";

  generateButton?.addEventListener("click", () => {
    try {
      const clientType = clientSelect?.value || "claude-desktop";
      const serverName = serverNameInput?.value?.trim() || "zotero-mcp";
      const port = parseInt(portInput?.value || "23120", 10);

      // Generate configuration
      currentConfig = ClientConfigGenerator.generateConfig(clientType, port, serverName);
      currentGuide = ClientConfigGenerator.generateFullGuide(clientType, port, serverName);

      // Display configuration in div panel
      if (configOutput) {
        configOutput.textContent = currentConfig;
      }

      // Display guide in separate area
      if (configGuide) {
        configGuide.textContent = currentGuide;
      }

      // Enable copy button
      copyConfigButton.disabled = false;
      copyInstrButton.disabled = false;

      ztoolkit.log(`[PreferenceScript] Generated config for ${clientType}`);
    } catch (error) {
      addon.data.prefs!.window.alert(`配置生成失败: ${error}`);
      ztoolkit.log(`[PreferenceScript] Config generation failed: ${error}`, "error");
    }
  });

  copyConfigButton?.addEventListener("click", async () => {
    try {
      const success = await ClientConfigGenerator.copyToClipboard(currentConfig);
      if (success) {
        const originalText = copyConfigButton.textContent;
        copyConfigButton.textContent = "已复制!";
        copyConfigButton.style.backgroundColor = "var(--copy-ok-bg)";
        copyConfigButton.style.color = "var(--tog-knob)";
        setTimeout(() => {
          copyConfigButton.textContent = originalText;
          copyConfigButton.style.backgroundColor = "";
          copyConfigButton.style.color = "";
        }, 2000);
      } else {
        addon.data.prefs!.window.alert("自动复制失败，请手动复制配置内容");
      }
    } catch (error) {
      addon.data.prefs!.window.alert(`复制失败: ${error}`);
      ztoolkit.log(`[PreferenceScript] Copy failed: ${error}`, "error");
    }
  });

  copyInstrButton?.addEventListener("click", async () => {
    try {
      const success = await ClientConfigGenerator.copyToClipboard(currentGuide);
      if (success) {
        const originalText = copyInstrButton.textContent;
        copyInstrButton.textContent = "已复制!";
        copyInstrButton.style.backgroundColor = "var(--copy-ok-bg)";
        copyInstrButton.style.color = "var(--tog-knob)";
        setTimeout(() => {
          copyInstrButton.textContent = originalText;
          copyInstrButton.style.backgroundColor = "";
          copyInstrButton.style.color = "";
        }, 2000);
      } else {
        addon.data.prefs!.window.alert("自动复制失败，请手动复制说明内容");
      }
    } catch (error) {
      addon.data.prefs!.window.alert(`复制失败: ${error}`);
      ztoolkit.log(`[PreferenceScript] Copy instructions failed: ${error}`, "error");
    }
  });

  // Auto-generate config when client type changes
  clientSelect?.addEventListener("change", () => {
    if (currentConfig) {
      generateButton?.click();
    }
  });

  // Auto-generate config when server name changes
  serverNameInput?.addEventListener("input", () => {
    if (currentConfig) {
      generateButton?.click();
    }
  });

  // ============ Collapsible Panels ============
  bindCollapsiblePanels(doc);

  // ============ Content Mode → Custom Panel ============
  bindContentModeToggle(doc);
}

/**
 * Update server-dependent UI visibility (cascade hiding)
 */
function updateServerDependentUI(doc: Document, enabled: boolean) {
  const serverContent = doc?.querySelector('#server-dependent-content') as HTMLElement;
  const serverOffHint = doc?.querySelector('#server-off-hint') as HTMLElement;
  const portRow = doc?.querySelector('#server-port-row') as HTMLElement;
  const remoteRow = doc?.querySelector('#server-remote-row') as HTMLElement;

  if (serverContent) serverContent.style.display = enabled ? '' : 'none';
  if (serverOffHint) serverOffHint.style.display = enabled ? 'none' : 'block';
  if (portRow) portRow.style.display = enabled ? '' : 'none';
  if (remoteRow) remoteRow.style.display = enabled ? '' : 'none';
}

/**
 * Bind collapsible panel toggle logic
 */
function bindCollapsiblePanels(doc: Document) {
  const panels = [
    { toggle: '#custom-settings-toggle', panel: '#custom-settings-panel' },
    { toggle: '#rate-limit-toggle', panel: '#rate-limit-panel' },
    { toggle: '#detail-stats-toggle', panel: '#detail-stats-panel' },
  ];

  for (const { toggle, panel } of panels) {
    const toggleEl = doc?.querySelector(toggle) as HTMLElement;
    const panelEl = doc?.querySelector(panel) as HTMLElement;
    if (toggleEl && panelEl) {
      toggleEl.addEventListener('click', () => {
        panelEl.classList.toggle('open');
      });
    }
  }
}

/**
 * Auto-open custom settings panel when custom mode is selected
 */
function bindContentModeToggle(doc: Document) {
  const modeSelect = doc?.querySelector(`#zotero-prefpane-${config.addonRef}-content-mode`) as HTMLSelectElement;
  const customPanel = doc?.querySelector('#custom-settings-panel') as HTMLElement;

  if (modeSelect && customPanel) {
    // Auto-open on custom mode
    if (modeSelect.value === 'custom') {
      customPanel.classList.add('open');
    }

    modeSelect.addEventListener('change', () => {
      if (modeSelect.value === 'custom') {
        customPanel.classList.add('open');
      }
    });
  }
}
