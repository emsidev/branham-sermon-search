import type { DataPort } from '@/data/contracts';
import { getDesktopBridgeDataPort } from '@/data/ports/desktopBridgeDataPort';
import { webSqliteDataPort } from '@/data/ports/webSqliteDataPort';

export type ResolvedDataPortMode = 'desktop-sqlite' | 'web-sqlite' | 'web-sqlite-unavailable';

let cachedPort: DataPort | null = null;
let resolvedMode: ResolvedDataPortMode | null = null;

const emptyFallbackPort: DataPort = {
  async getSearchMeta() {
    return { years: [], titles: [], locations: [] };
  },
  async listSermons() {
    return { rows: [], total: 0 };
  },
  async searchSermonHits() {
    return [];
  },
  async getSearchSuggestions() {
    return [];
  },
  async getSermonDetail() {
    return null;
  },
  async getAdjacentSermons() {
    return { prev: null, next: null };
  },
  async getBoundarySermons() {
    return { first: null, last: null };
  },
  async getShortcutBindings() {
    return [];
  },
  async saveShortcutBindings() {
    return undefined;
  },
};

async function resolveBrowserDataPort(): Promise<DataPort> {
  try {
    await webSqliteDataPort.getSearchMeta();
    resolvedMode = 'web-sqlite';
    return webSqliteDataPort;
  } catch {
    resolvedMode = 'web-sqlite-unavailable';
    return emptyFallbackPort;
  }
}

export async function getDataPort(): Promise<DataPort> {
  if (cachedPort) {
    return cachedPort;
  }

  const desktopPort = getDesktopBridgeDataPort();
  if (desktopPort) {
    cachedPort = desktopPort;
    resolvedMode = 'desktop-sqlite';
    return cachedPort;
  }

  cachedPort = await resolveBrowserDataPort();
  return cachedPort;
}

export async function getResolvedDataPortMode(): Promise<ResolvedDataPortMode> {
  if (!resolvedMode) {
    await getDataPort();
  }

  return resolvedMode ?? 'web-sqlite-unavailable';
}

export function resetDataPortForTests(): void {
  cachedPort = null;
  resolvedMode = null;
}
