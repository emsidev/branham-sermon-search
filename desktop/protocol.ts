import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';

export const APP_SCHEME = 'app';
export const APP_HOST = 'app';

const INDEX_FILE = 'index.html';

export interface ProtocolResolution {
  filePath: string;
  status: 200 | 404;
  fallbackToIndex: boolean;
}

type FileExistsFn = (absolutePath: string) => boolean;

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function toSafeRelativePath(pathname: string): string {
  const decodedPathname = decodeURIComponent(pathname);
  const withoutLeadingSlashes = decodedPathname.replace(/^\/+/, '');

  if (!withoutLeadingSlashes) {
    return INDEX_FILE;
  }

  const normalizedPath = path.posix.normalize(withoutLeadingSlashes);
  if (normalizedPath === '.' || normalizedPath.startsWith('../')) {
    return INDEX_FILE;
  }

  return normalizedPath;
}

function shouldFallbackToIndex(relativePath: string): boolean {
  return path.posix.extname(relativePath) === '';
}

export function resolveAppFileRequest(
  requestUrl: string,
  distDirectory: string,
  fileExists: FileExistsFn = existsSync,
): ProtocolResolution {
  const distRoot = path.resolve(distDirectory);
  const indexFilePath = path.join(distRoot, INDEX_FILE);
  const parsedUrl = new URL(requestUrl);

  if (parsedUrl.protocol !== `${APP_SCHEME}:` || parsedUrl.hostname !== APP_HOST) {
    return {
      filePath: indexFilePath,
      status: fileExists(indexFilePath) ? 200 : 404,
      fallbackToIndex: true,
    };
  }

  const relativePath = toSafeRelativePath(parsedUrl.pathname);
  const absolutePath = path.resolve(distRoot, relativePath);

  if (!isPathInsideRoot(absolutePath, distRoot)) {
    return {
      filePath: indexFilePath,
      status: fileExists(indexFilePath) ? 200 : 404,
      fallbackToIndex: true,
    };
  }

  if (fileExists(absolutePath)) {
    return {
      filePath: absolutePath,
      status: 200,
      fallbackToIndex: false,
    };
  }

  if (shouldFallbackToIndex(relativePath)) {
    return {
      filePath: indexFilePath,
      status: fileExists(indexFilePath) ? 200 : 404,
      fallbackToIndex: true,
    };
  }

  return {
    filePath: absolutePath,
    status: 404,
    fallbackToIndex: false,
  };
}

export function registerAppProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function registerAppProtocolHandler(distDirectory: string): void {
  const distRoot = path.resolve(distDirectory);

  protocol.handle(APP_SCHEME, async (request) => {
    const resolution = resolveAppFileRequest(request.url, distRoot, existsSync);
    if (resolution.status === 404) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(resolution.filePath).toString());
  });
}
