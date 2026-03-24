import { contextBridge } from 'electron';

const desktopRuntime = Object.freeze({
  isElectron: true as const,
  platform: process.platform,
});

contextBridge.exposeInMainWorld('desktopRuntime', desktopRuntime);
