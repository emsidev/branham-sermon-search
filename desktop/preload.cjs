const { contextBridge, ipcRenderer } = require('electron');

const desktopRuntime = Object.freeze({
  isElectron: true,
  platform: process.platform,
});

contextBridge.exposeInMainWorld('desktopRuntime', desktopRuntime);

const desktopData = Object.freeze({
  getSearchMeta: () => ipcRenderer.invoke('desktop-data:getSearchMeta'),
  listSermons: (params) => ipcRenderer.invoke('desktop-data:listSermons', params),
  searchSermonHits: (params) => ipcRenderer.invoke('desktop-data:searchSermonHits', params),
  getSearchSuggestions: (params) => ipcRenderer.invoke('desktop-data:getSearchSuggestions', params),
  getSermonDetail: (id) => ipcRenderer.invoke('desktop-data:getSermonDetail', id),
  getAdjacentSermons: (date) => ipcRenderer.invoke('desktop-data:getAdjacentSermons', date),
  getBoundarySermons: () => ipcRenderer.invoke('desktop-data:getBoundarySermons'),
  getShortcutBindings: () => ipcRenderer.invoke('desktop-data:getShortcutBindings'),
  saveShortcutBindings: (rows) => ipcRenderer.invoke('desktop-data:saveShortcutBindings', rows),
});

contextBridge.exposeInMainWorld('desktopData', desktopData);

const DESKTOP_BOOTSTRAP_STATUS_CHANNEL = 'desktop-bootstrap:status';

const desktopBootstrap = Object.freeze({
  getStatus: () => ipcRenderer.invoke('desktop-bootstrap:getStatus'),
  startDownload: () => ipcRenderer.invoke('desktop-bootstrap:startDownload'),
  subscribe: (listener) => {
    const eventHandler = (_event, payload) => {
      listener(payload);
    };

    ipcRenderer.on(DESKTOP_BOOTSTRAP_STATUS_CHANNEL, eventHandler);
    return () => {
      ipcRenderer.off(DESKTOP_BOOTSTRAP_STATUS_CHANNEL, eventHandler);
    };
  },
});

contextBridge.exposeInMainWorld('desktopBootstrap', desktopBootstrap);
