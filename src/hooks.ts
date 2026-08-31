import { BasicExampleFactory } from "./modules/examples";
import { httpServer } from "./modules/httpServer"; // 使用单例导出
import { serverPreferences } from "./modules/serverPreferences";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { MCPSettingsService } from "./modules/mcpSettingsService";

// Track all setTimeout calls for cleanup on shutdown
const pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

// Global flag to prevent new async operations during shutdown
let isShuttingDown = false;

/**
 * Create a tracked setTimeout that will be cleaned up on shutdown
 */
function trackedSetTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    pendingTimeouts.delete(timer);
    if (!isShuttingDown) {
      callback();
    }
  }, delay);
  pendingTimeouts.add(timer);
  return timer;
}

/**
 * Clear all pending tracked timeouts
 */
function clearAllPendingTimeouts(): void {
  for (const timer of pendingTimeouts) {
    clearTimeout(timer);
  }
  pendingTimeouts.clear();
  ztoolkit.log(`[MCP Plugin] All pending timeouts cleared`);
}

/**
 * Startup entry point
 */
async function onStartup() {
  // 进程诊断 - 检测当前运行在哪个进程中
  try {
    const runtime = (Cc as any)["@mozilla.org/xre/app-info;1"]?.getService((Ci as any).nsIXULRuntime);
    const processType = runtime?.processType;
    const processID = runtime?.processID;
    const processTypeNames: Record<number, string> = { 0: 'PARENT', 2: 'CONTENT', 4: 'GPU', 9: 'UTILITY' };
    ztoolkit.log(`[MCP Plugin] ======== STARTUP BEGIN ======== PID=${processID}, processType=${processType} (${processTypeNames[processType] || 'UNKNOWN'})`);
  } catch (e) {
    ztoolkit.log(`[MCP Plugin] ======== STARTUP BEGIN ======== (process info unavailable: ${e})`);
  }

  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  ztoolkit.log("[MCP Plugin] [STARTUP] Zotero initialization promises resolved");

  initLocale();

  // Initialize MCP settings with defaults
  try {
    MCPSettingsService.initializeDefaults();
    ztoolkit.log(`[MCP Plugin] [STARTUP] MCP settings initialized`);
  } catch (error) {
    ztoolkit.log(`[MCP Plugin] [STARTUP] Error initializing MCP settings: ${error}`, 'error');
  }

  // Check if this is first installation and show config prompt
  checkFirstInstallation();

  // 启动HTTP服务器
  try {
    const port = serverPreferences.getPort();
    const enabled = serverPreferences.isServerEnabled();
    ztoolkit.log(`[MCP Plugin] [STARTUP] HTTP server config - enabled: ${enabled}, port: ${port}`);

    addon.data.httpServer = httpServer;

    if (enabled === false) {
      ztoolkit.log(`[MCP Plugin] [STARTUP] HTTP server disabled, skipping`);
    } else {
      if (!port || isNaN(port)) {
        throw new Error(`Invalid port value: ${port}`);
      }
      ztoolkit.log(`[MCP Plugin] [STARTUP] Starting HTTP server on port ${port}...`);
      httpServer.start(port);
      ztoolkit.log(`[MCP Plugin] [STARTUP] HTTP server started on port ${port}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ztoolkit.log(`[MCP Plugin] [STARTUP] Failed to start HTTP server: ${err.message}`, "error");
  }

  // 监听偏好设置变化
  serverPreferences.addObserver(async (name) => {
    if (isShuttingDown) return; // 关闭时不处理偏好变化
    ztoolkit.log(`[MCP Plugin] Preference changed: ${name}`);

    if (name === "extensions.zotero.zotero-mcp-manager.mcp.server.port" || name === "extensions.zotero.zotero-mcp-manager.mcp.server.enabled") {
      try {
        if (httpServer.isServerRunning()) {
          httpServer.stop();
          ztoolkit.log("[MCP Plugin] HTTP server stopped for restart");
        }

        if (serverPreferences.isServerEnabled()) {
          const port = serverPreferences.getPort();
          httpServer.start(port);
          ztoolkit.log(`[MCP Plugin] HTTP server restarted on port ${port}`);
        } else {
          ztoolkit.log("[MCP Plugin] HTTP server disabled by user");
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        ztoolkit.log(`[MCP Plugin] Error handling preference change: ${err.message}`, "error");
      }
    }
  });

  BasicExampleFactory.registerPrefs();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
  ztoolkit.log("[MCP Plugin] [STARTUP] Main windows loaded");

  addon.data.initialized = true;
  ztoolkit.log("[MCP Plugin] ======== STARTUP COMPLETE ========");
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  // Also load addon.ftl and preferences.ftl
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-addon.ftl`,
  );
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-preferences.ftl`,
  );
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.log("[MCP Plugin] ======== SHUTDOWN START ========");

  // Set shutdown flag to prevent new async operations
  isShuttingDown = true;

  // Clear all pending timeouts immediately
  ztoolkit.log("[MCP Plugin] [SHUTDOWN 1/2] Clearing pending timeouts...");
  clearAllPendingTimeouts();
  ztoolkit.log("[MCP Plugin] [SHUTDOWN 1/2] Done");

  // 停止HTTP服务器 - 这是阻止进程退出的最可能原因
  try {
    ztoolkit.log(`[MCP Plugin] [SHUTDOWN 2/2] Stopping HTTP server (running: ${httpServer.isServerRunning()})...`);
    if (httpServer.isServerRunning()) {
      httpServer.stop();
    }
    ztoolkit.log(`[MCP Plugin] [SHUTDOWN 2/2] Done (running: ${httpServer.isServerRunning()})`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ztoolkit.log(`[MCP Plugin] [SHUTDOWN 2/2] Error: ${err.message}`, "error");
  }

  ztoolkit.log("[MCP Plugin] [SHUTDOWN] Unregistering server preferences...");
  serverPreferences.unregister();

  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];

  ztoolkit.log("[MCP Plugin] ======== SHUTDOWN COMPLETE ========");
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Preferences event: ${type}`);
  
  switch (type) {
    case "load":
      ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Loading preference scripts...`);
      
      // 诊断设置面板加载环境
      try {
        if (data.window) {
          ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Preference window available`);
          
          // 检查当前偏好设置状态
          const currentEnabled = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.enabled", true);
          const currentPort = Zotero.Prefs.get("extensions.zotero.zotero-mcp-manager.mcp.server.port", true);
          ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Current prefs at panel load - enabled: ${currentEnabled}, port: ${currentPort}`);
          
          // 检查preference元素是否存在
          trackedSetTimeout(() => {
            try {
              const doc = data.window.document;
              const enabledElement = doc?.querySelector(`#zotero-prefpane-${addon.data.config.addonRef}-mcp-server-enabled`);
              const portElement = doc?.querySelector(`#zotero-prefpane-${addon.data.config.addonRef}-mcp-server-port`);

              ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Preference elements - enabled: ${!!enabledElement}, port: ${!!portElement}`);

              if (enabledElement) {
                const hasChecked = enabledElement.hasAttribute('checked');
                ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Enabled checkbox state: ${hasChecked}`);
              }

            } catch (error) {
              ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Error checking preference elements: ${error}`, 'error');
            }
          }, 500);
          
        } else {
          ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] WARNING: No preference window in data`, 'error');
        }
      } catch (error) {
        ztoolkit.log(`===MCP=== [hooks.ts] [DIAGNOSTIC] Error in preference load diagnostic: ${error}`, 'error');
      }
      
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

/**
 * Check if this is the first installation and prompt user to configure
 */
function checkFirstInstallation() {
  try {
    const hasShownPrompt = Zotero.Prefs.get("mcp.firstInstallPromptShown", false);
    if (!hasShownPrompt) {
      // Mark as shown immediately to prevent multiple prompts
      Zotero.Prefs.set("mcp.firstInstallPromptShown", true);
      
      // Show prompt after a short delay to ensure UI is ready
      trackedSetTimeout(() => {
        showFirstInstallPrompt();
      }, 3000);
    }
  } catch (error) {
    ztoolkit.log(`[MCP Plugin] Error checking first installation: ${error}`, "error");
  }
}

/**
 * Show first installation configuration prompt
 */
function showFirstInstallPrompt() {
  try {
    // Use bilingual text for first install prompt
    const title = "欢迎使用 Zotero MCP Manager / Welcome to Zotero MCP Manager";
    const promptText = "感谢安装 Zotero MCP Manager！为了开始使用，您需要为您的 AI 客户端生成配置文件。是否现在打开设置页面来生成配置？\n\nThank you for installing Zotero MCP Manager! To get started, you need to generate configuration files for your AI clients. Would you like to open the settings page now to generate configurations?";
    const openPrefsText = "打开设置 / Open Settings";
    const laterText = "稍后配置 / Configure Later";
    
    // Use a simple window confirm instead of Services.prompt for compatibility
    const message = `${title}\n\n${promptText}\n\n${openPrefsText} (OK) / ${laterText} (Cancel)`;
    
    const mainWindow = Zotero.getMainWindow();
    if (!mainWindow) {
      ztoolkit.log("[MCP Plugin] No main window available", "error");
      return;
    }
    
    const result = mainWindow.confirm(message);
    
    if (result) {
      // User chose to open preferences
      trackedSetTimeout(() => {
        openPreferencesWindow();
      }, 100);
    }
  } catch (error) {
    ztoolkit.log(`[MCP Plugin] Error showing first install prompt: ${error}`, "error");
  }
}

/**
 * Open the preferences window
 */
function openPreferencesWindow() {
  try {
    const windowName = `${addon.data.config.addonRef}-preferences`;
    const existingWindow = Zotero.getMainWindow().ZoteroPane.openPreferences(null, windowName);
    
    if (existingWindow) {
      existingWindow.focus();
    }
  } catch (error) {
    ztoolkit.log(`[MCP Plugin] Error opening preferences: ${error}`, "error");
    
    // Fallback: try to open standard preferences
    try {
      Zotero.getMainWindow().openPreferences();
    } catch (fallbackError) {
      ztoolkit.log(`[MCP Plugin] Fallback preferences open failed: ${fallbackError}`, "error");
    }
  }
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
};
