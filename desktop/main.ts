import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_HOST,
  APP_SCHEME,
  registerAppProtocolHandler,
  registerAppProtocolScheme,
} from './protocol.js';
import { DesktopDataPort } from './dataPort.js';

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

  desktopDataPort = DesktopDataPort.initialize(projectRoot, isDevelopment);
  ipcMain.handle('desktop-data:getSearchMeta', () => desktopDataPort?.getSearchMeta());
  ipcMain.handle('desktop-data:listSermons', (_event, params: unknown) => desktopDataPort?.listSermons(params as any));
  ipcMain.handle('desktop-data:searchSermonHits', (_event, params: unknown) => desktopDataPort?.searchSermonHits(params as any));
  ipcMain.handle('desktop-data:getSermonDetail', (_event, id: string) => desktopDataPort?.getSermonDetail(id));
  ipcMain.handle('desktop-data:getAdjacentSermons', (_event, date: string) => desktopDataPort?.getAdjacentSermons(date));
  ipcMain.handle('desktop-data:getBoundarySermons', () => desktopDataPort?.getBoundarySermons());
  ipcMain.handle('desktop-data:getShortcutBindings', () => desktopDataPort?.getShortcutBindings());
  ipcMain.handle('desktop-data:saveShortcutBindings', (_event, rows: unknown) => desktopDataPort?.saveShortcutBindings(rows as any));

  const mainWindow = createMainWindow();
  await loadMainWindow(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const nextWindow = createMainWindow();
      void loadMainWindow(nextWindow);
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

void bootstrap();
