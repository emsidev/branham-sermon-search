export type BootstrapPhase = 'checking' | 'downloading' | 'ready' | 'error';

export interface BootstrapStatus {
  phase: BootstrapPhase;
  receivedBytes: number;
  totalBytes: number | null;
  error: string | null;
  usingFallbackData: boolean;
}

export interface DesktopBootstrapBridge {
  getStatus(): Promise<BootstrapStatus>;
  subscribe(listener: (status: BootstrapStatus) => void): () => void;
  retryDownload(): Promise<BootstrapStatus>;
}

export const READY_BOOTSTRAP_STATUS: BootstrapStatus = {
  phase: 'ready',
  receivedBytes: 0,
  totalBytes: null,
  error: null,
  usingFallbackData: false,
};
