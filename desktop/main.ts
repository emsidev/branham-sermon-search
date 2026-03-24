import { app, BrowserWindow, shell } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_HOST,
  APP_SCHEME,
  registerAppProtocolHandler,
  registerAppProtocolScheme,
} from './protocol.js';

const DEV_SERVER_ORIGIN = 'http://127.0.0.1:8080';
const WINDOW_MIN_WIDTH = 1024;
const WINDOW_MIN_HEIGHT = 720;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDirectory = path.resolve(projectRoot, 'dist');
const preloadPath = path.resolve(__dirname, 'preload.js');
const browserIconPath = path.resolve(projectRoot, 'public', 'favicon.ico');

const isDevelopment = process.env.NODE_ENV === 'development';

registerAppProtocolScheme();

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
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

async function loadMainWindow(mainWindow: BrowserWindow): Promise<void> {
  if (isDevelopment) {
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
