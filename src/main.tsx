import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const APP_SHELL_CACHE_PREFIX = 'the-table-search-shell-';
const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.desktopRuntime?.isElectron);

async function clearAppShellOfflineState(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Ignore cleanup failures in development mode.
    }
  }

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(APP_SHELL_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      );
    } catch {
      // Ignore cleanup failures in development mode.
    }
  }
}

if (isDesktopRuntime) {
  void clearAppShellOfflineState();
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Ignore registration failures; app can still run online.
    });
  });
} else if (import.meta.env.DEV) {
  void clearAppShellOfflineState();
}

createRoot(document.getElementById("root")!).render(<App />);
