interface BuildShareUrlInput {
  currentHref: string;
  pathname: string;
  search: string;
  hash: string;
  desktopRuntime?: {
    readonly isElectron: true;
  };
  publicWebBaseUrl?: string;
}

function normalizePublicBaseUrl(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawValue);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
    return `${parsedUrl.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

function resolveRoutePath(pathname: string, search: string, hash: string): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${normalizedPathname}${search}${hash}`;
}

export function buildShareUrl({
  currentHref,
  pathname,
  search,
  hash,
  desktopRuntime,
  publicWebBaseUrl,
}: BuildShareUrlInput): string {
  const routePath = resolveRoutePath(pathname, search, hash);

  try {
    const parsedUrl = new URL(currentHref);
    const protocol = parsedUrl.protocol;

    if (protocol === 'http:' || protocol === 'https:') {
      return currentHref;
    }

    if (protocol === 'app:' && desktopRuntime?.isElectron) {
      const publicBaseUrl = normalizePublicBaseUrl(publicWebBaseUrl);
      if (publicBaseUrl) {
        return `${publicBaseUrl}${routePath}`;
      }

      return routePath;
    }

    return currentHref;
  } catch {
    return desktopRuntime?.isElectron ? routePath : currentHref;
  }
}
