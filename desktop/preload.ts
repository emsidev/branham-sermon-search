import { contextBridge, ipcRenderer } from 'electron';

const desktopRuntime = Object.freeze({
  isElectron: true as const,
  platform: process.platform,
});

contextBridge.exposeInMainWorld('desktopRuntime', desktopRuntime);

const desktopData = Object.freeze({
  getSearchMeta: () => ipcRenderer.invoke('desktop-data:getSearchMeta'),
  listSermons: (params: unknown) => ipcRenderer.invoke('desktop-data:listSermons', params),
  searchSermonHits: (params: unknown) => ipcRenderer.invoke('desktop-data:searchSermonHits', params),
  getSearchSuggestions: (params: unknown) => ipcRenderer.invoke('desktop-data:getSearchSuggestions', params),
  getSermonDetail: (id: string) => ipcRenderer.invoke('desktop-data:getSermonDetail', id),
  getAdjacentSermons: (date: string) => ipcRenderer.invoke('desktop-data:getAdjacentSermons', date),
  getBoundarySermons: () => ipcRenderer.invoke('desktop-data:getBoundarySermons'),
  getShortcutBindings: () => ipcRenderer.invoke('desktop-data:getShortcutBindings'),
  saveShortcutBindings: (rows: unknown) => ipcRenderer.invoke('desktop-data:saveShortcutBindings', rows),
});

contextBridge.exposeInMainWorld('desktopData', desktopData);

const DESKTOP_BOOTSTRAP_STATUS_CHANNEL = 'desktop-bootstrap:status';

const desktopBootstrap = Object.freeze({
  getStatus: () => ipcRenderer.invoke('desktop-bootstrap:getStatus'),
  retryDownload: () => ipcRenderer.invoke('desktop-bootstrap:retryDownload'),
  subscribe: (listener: (status: unknown) => void) => {
    const eventHandler = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      listener(payload);
    };

    ipcRenderer.on(DESKTOP_BOOTSTRAP_STATUS_CHANNEL, eventHandler);
    return () => {
      ipcRenderer.off(DESKTOP_BOOTSTRAP_STATUS_CHANNEL, eventHandler);
    };
  },
});

contextBridge.exposeInMainWorld('desktopBootstrap', desktopBootstrap);
