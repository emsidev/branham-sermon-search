import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_HOST,
  APP_SCHEME,
  registerAppProtocolHandler,
  registerAppProtocolScheme,
} from './protocol.js';
import { DesktopDataPort, type DesktopBootstrapStatus } from './dataPort.js';

const DEV_SERVER_ORIGIN = 'http://127.0.0.1:8080';
const WINDOW_MIN_WIDTH = 1024;
const WINDOW_MIN_HEIGHT = 720;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDirectory = path.resolve(projectRoot, 'dist');
const preloadPath = path.resolve(__dirname, 'preload.js');

const isDevelopment = process.env.NODE_ENV === 'development';
let desktopDataPort: DesktopDataPort | null = null;
let desktopDataPortReady: Promise<DesktopDataPort> | null = null;
let retryDownloadInFlight: Promise<void> | null = null;
type DesktopListSermonsParams = Parameters<DesktopDataPort['listSermons']>[0];
type DesktopSearchSermonHitsParams = Parameters<DesktopDataPort['searchSermonHits']>[0];
type DesktopSearchSuggestionsParams = Parameters<DesktopDataPort['getSearchSuggestions']>[0];
type DesktopShortcutBindings = Parameters<DesktopDataPort['saveShortcutBindings']>[0];

const DEFAULT_BOOTSTRAP_STATUS: DesktopBootstrapStatus = {
  phase: 'checking',
  receivedBytes: 0,
  totalBytes: null,
  error: null,
  usingFallbackData: false,
};

let bootstrapStatus: DesktopBootstrapStatus = DEFAULT_BOOTSTRAP_STATUS;

registerAppProtocolScheme();

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

function ensureDirectory(absolutePath: string): void {
  if (!existsSync(absolutePath)) {
    mkdirSync(absolutePath, { recursive: true });
  }
}

function configureAppStoragePaths(): void {
  if (isDevelopment) {
    const appDataPath = app.getPath('appData');
    const dedicatedUserDataPath = path.join(appDataPath, 'the-table-search-dev');
    if (app.getPath('userData') !== dedicatedUserDataPath) {
      app.setPath('userData', dedicatedUserDataPath);
    }
  }

  const userDataPath = app.getPath('userData');
  const sessionDataPath = path.join(userDataPath, 'session-data');

  ensureDirectory(userDataPath);
  ensureDirectory(sessionDataPath);

  app.setPath('sessionData', sessionDataPath);
}

configureAppStoragePaths();

function resolveBrowserIconPath(): string  {
  const iconCandidates = [
    path.resolve(projectRoot, 'public', 'favicon.ico'),
    path.resolve(process.resourcesPath, 'favicon.ico'),
    path.resolve(process.resourcesPath, 'public', 'favicon.ico'),
  ];

  return iconCandidates.find((candidatePath) => existsSync(candidatePath)) ?? '';
}

function isHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function isAllowedInAppNavigation(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    if (isDevelopment) {
      return parsedUrl.origin === DEV_SERVER_ORIGIN;
    }

    return parsedUrl.protocol === `${APP_SCHEME}:` && parsedUrl.hostname === APP_HOST;
  } catch {
    return false;
  }
}

function createMainWindow(): BrowserWindow {
  const browserIconPath = resolveBrowserIconPath();
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    ...(existsSync(browserIconPath) ? { icon: browserIconPath } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedInAppNavigation(url)) {
      return;
    }

    if (isHttpUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  return mainWindow;
}

function emitBootstrapStatus(nextStatus: DesktopBootstrapStatus): void {
  bootstrapStatus = nextStatus;
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('desktop-bootstrap:status', bootstrapStatus);
  }
}

async function initializeDesktopDataPort(
  forceDownload = false,
  allowEmptyOnFailure = true
): Promise<DesktopDataPort> {
  const nextPort = await DesktopDataPort.initialize(projectRoot, isDevelopment, {
    forceDownload,
    allowEmptyOnFailure,
    onStatus: emitBootstrapStatus,
  });

  const previousPort = desktopDataPort;
  desktopDataPort = nextPort;

  if (previousPort && previousPort !== nextPort) {
    previousPort.close();
  }

  return nextPort;
}

function ensureDesktopDataPortReady(): Promise<DesktopDataPort> {
  if (desktopDataPort) {
    return Promise.resolve(desktopDataPort);
  }

  if (!desktopDataPortReady) {
    desktopDataPortReady = initializeDesktopDataPort(false);
  }

  return desktopDataPortReady;
}

async function retryDesktopDownload(): Promise<void> {
  if (retryDownloadInFlight) {
    return retryDownloadInFlight;
  }

  retryDownloadInFlight = (async () => {
    try {
      desktopDataPortReady = initializeDesktopDataPort(true, false);
      await desktopDataPortReady;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      emitBootstrapStatus({
        phase: 'error',
        receivedBytes: 0,
        totalBytes: null,
        error: errorMessage,
        usingFallbackData: true,
      });
    }
  })();

  try {
    await retryDownloadInFlight;
  } finally {
    retryDownloadInFlight = null;
  }
}

async function clearDevelopmentRendererState(mainWindow: BrowserWindow): Promise<void> {
  if (!isDevelopment) {
    return;
  }

  const rendererSession = mainWindow.webContents.session;

  try {
    await rendererSession.clearCache();
  } catch {
    // Ignore cache cleanup failures in development mode.
  }

  try {
    await rendererSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage'],
    });
  } catch {
    // Ignore storage cleanup failures in development mode.
  }
}

async function loadMainWindow(mainWindow: BrowserWindow): Promise<void> {
  if (isDevelopment) {
    await clearDevelopmentRendererState(mainWindow);
    await mainWindow.loadURL(DEV_SERVER_ORIGIN);
    return;
  }

  await mainWindow.loadURL(`${APP_SCHEME}://${APP_HOST}/`);
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  if (!isDevelopment) {
    registerAppProtocolHandler(distDirectory);
  }

  ipcMain.handle('desktop-bootstrap:getStatus', () => bootstrapStatus);
  ipcMain.handle('desktop-bootstrap:retryDownload', async () => {
    await retryDesktopDownload();
    return bootstrapStatus;
  });

  ipcMain.handle('desktop-data:getSearchMeta', async () => (await ensureDesktopDataPortReady()).getSearchMeta());
  ipcMain.handle('desktop-data:listSermons', async (_event, params: unknown) => (await ensureDesktopDataPortReady()).listSermons(params as DesktopListSermonsParams));
  ipcMain.handle('desktop-data:searchSermonHits', async (_event, params: unknown) => (await ensureDesktopDataPortReady()).searchSermonHits(params as DesktopSearchSermonHitsParams));
  ipcMain.handle('desktop-data:getSearchSuggestions', async (_event, params: unknown) => (await ensureDesktopDataPortReady()).getSearchSuggestions(params as DesktopSearchSuggestionsParams));
  ipcMain.handle('desktop-data:getSermonDetail', async (_event, id: string) => (await ensureDesktopDataPortReady()).getSermonDetail(id));
  ipcMain.handle('desktop-data:getAdjacentSermons', async (_event, date: string) => (await ensureDesktopDataPortReady()).getAdjacentSermons(date));
  ipcMain.handle('desktop-data:getBoundarySermons', async () => (await ensureDesktopDataPortReady()).getBoundarySermons());
  ipcMain.handle('desktop-data:getShortcutBindings', async () => (await ensureDesktopDataPortReady()).getShortcutBindings());
  ipcMain.handle('desktop-data:saveShortcutBindings', async (_event, rows: unknown) => (await ensureDesktopDataPortReady()).saveShortcutBindings(rows as DesktopShortcutBindings));

  const mainWindow = createMainWindow();
  await loadMainWindow(mainWindow);
  emitBootstrapStatus(bootstrapStatus);
  desktopDataPortReady = initializeDesktopDataPort(false, true);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const nextWindow = createMainWindow();
      void loadMainWindow(nextWindow).then(() => {
        nextWindow.webContents.send('desktop-bootstrap:status', bootstrapStatus);
      });
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

void bootstrap().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Desktop bootstrap failed:', error);

  try {
    await app.whenReady();
    dialog.showErrorBox('Startup failed', message);
  } finally {
    app.quit();
  }
});
