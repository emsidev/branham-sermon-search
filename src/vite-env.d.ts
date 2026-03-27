/// <reference types="vite/client" />
/// <reference types="node" />
import type { DataPort } from '@/data/contracts';

declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_PUBLIC_WEB_BASE_URL?: string;
}

interface Window {
  readonly desktopRuntime?: {
    readonly isElectron: true;
    readonly platform: NodeJS.Platform;
  };
  readonly desktopData?: DataPort;
}
