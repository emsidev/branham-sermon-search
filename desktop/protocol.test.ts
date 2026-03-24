/* @vitest-environment node */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAppFileRequest } from './protocol';

function createFileExistsStub(existingPaths: string[]): (absolutePath: string) => boolean {
  const normalized = new Set(existingPaths.map((entry) => path.resolve(entry)));
  return (absolutePath: string) => normalized.has(path.resolve(absolutePath));
}

describe('resolveAppFileRequest', () => {
  const distRoot = path.resolve('/virtual/dist');
  const indexPath = path.join(distRoot, 'index.html');
  const appJsPath = path.join(distRoot, 'assets', 'app.js');

  it('returns an existing static asset directly', () => {
    const fileExists = createFileExistsStub([indexPath, appJsPath]);
    const result = resolveAppFileRequest('app://app/assets/app.js', distRoot, fileExists);

    expect(result.status).toBe(200);
    expect(result.fallbackToIndex).toBe(false);
    expect(result.filePath).toBe(appJsPath);
  });

  it('falls back to index.html for unknown SPA routes', () => {
    const fileExists = createFileExistsStub([indexPath, appJsPath]);
    const result = resolveAppFileRequest('app://app/sermons/65-0221m?reading=1', distRoot, fileExists);

    expect(result.status).toBe(200);
    expect(result.fallbackToIndex).toBe(true);
    expect(result.filePath).toBe(indexPath);
  });

  it('does not fallback for missing assets that include a file extension', () => {
    const fileExists = createFileExistsStub([indexPath, appJsPath]);
    const result = resolveAppFileRequest('app://app/assets/missing-chunk.js', distRoot, fileExists);

    expect(result.status).toBe(404);
    expect(result.fallbackToIndex).toBe(false);
    expect(result.filePath).toBe(path.join(distRoot, 'assets', 'missing-chunk.js'));
  });
});
