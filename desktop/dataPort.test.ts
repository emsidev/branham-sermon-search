import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => 'C:/tmp/the-table-search-test',
  },
}));

import { resolveRemoteContentUrl } from './dataPort';

describe('resolveRemoteContentUrl', () => {
  it('prefers downloadUrl when both downloadUrl and url are present', () => {
    const resolved = resolveRemoteContentUrl({
      downloadUrl: 'https://example.com/download/content.sqlite',
      url: 'https://example.com/fallback/content.sqlite',
    });

    expect(resolved).toBe('https://example.com/download/content.sqlite');
  });

  it('falls back to url when downloadUrl is not provided', () => {
    const resolved = resolveRemoteContentUrl({
      url: 'https://example.com/content.sqlite',
    });

    expect(resolved).toBe('https://example.com/content.sqlite');
  });

  it('returns null for non-http urls', () => {
    const resolved = resolveRemoteContentUrl({
      downloadUrl: '/data/content.sqlite',
      url: '/data/content.sqlite',
    });

    expect(resolved).toBeNull();
  });
});
