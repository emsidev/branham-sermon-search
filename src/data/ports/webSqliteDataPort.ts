import type { DataPort } from '@/data/contracts';

interface WorkerRpcRequest {
  type: 'rpc';
  id: number;
  method: keyof DataPort | 'init';
  params: unknown;
}

interface WorkerRpcResponse {
  type: 'rpc';
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

class WorkerRpcClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private idCounter = 0;

  constructor() {
    this.worker = new Worker(new URL('./webSqliteWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerRpcResponse>) => {
      const payload = event.data;
      const pendingRequest = this.pending.get(payload.id);
      if (!pendingRequest) {
        return;
      }

      this.pending.delete(payload.id);
      if (payload.ok) {
        pendingRequest.resolve(payload.result);
        return;
      }

      pendingRequest.reject(new Error(payload.error ?? 'Worker request failed'));
    };
  }

  request<T>(method: keyof DataPort | 'init', params: unknown): Promise<T> {
    const id = ++this.idCounter;
    const payload: WorkerRpcRequest = { type: 'rpc', id, method, params };
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(payload);
    });
  }
}

let clientSingleton: WorkerRpcClient | null = null;
let initPromise: Promise<void> | null = null;

function getClient(): WorkerRpcClient {
  if (!clientSingleton) {
    clientSingleton = new WorkerRpcClient();
  }
  return clientSingleton;
}

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = getClient().request('init', {}).then(() => undefined);
  }
  await initPromise;
}

function invoke<T>(method: keyof DataPort, params: unknown): Promise<T> {
  return ensureInitialized().then(() => getClient().request<T>(method, params));
}

export const webSqliteDataPort: DataPort = {
  getSearchMeta() {
    return invoke('getSearchMeta', {});
  },
  listSermons(params) {
    return invoke('listSermons', params);
  },
  searchSermonHits(params) {
    return invoke('searchSermonHits', params);
  },
  getSearchSuggestions(params) {
    return invoke('getSearchSuggestions', params);
  },
  getSermonDetail(id) {
    return invoke('getSermonDetail', id);
  },
  getAdjacentSermons(date) {
    return invoke('getAdjacentSermons', date);
  },
  getBoundarySermons() {
    return invoke('getBoundarySermons', {});
  },
  getShortcutBindings() {
    return invoke('getShortcutBindings', {});
  },
  saveShortcutBindings(bindings) {
    return invoke('saveShortcutBindings', bindings);
  },
};
