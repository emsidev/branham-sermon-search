import { describe, expect, it } from 'vitest';
import { buildShareUrl } from './shareUrl';

describe('buildShareUrl', () => {
  it('preserves browser URLs for web runtime', () => {
    const shareUrl = buildShareUrl({
      currentHref: 'https://branham.example/search?q=faith',
      pathname: '/search',
      search: '?q=faith',
      hash: '',
    });

    expect(shareUrl).toBe('https://branham.example/search?q=faith');
  });

  it('maps app protocol URLs to the configured public web base URL', () => {
    const shareUrl = buildShareUrl({
      currentHref: 'app://app/sermons/65-0221m?reading=1#p-12',
      pathname: '/sermons/65-0221m',
      search: '?reading=1',
      hash: '#p-12',
      desktopRuntime: {
        isElectron: true,
      },
      publicWebBaseUrl: 'https://branham.example',
    });

    expect(shareUrl).toBe('https://branham.example/sermons/65-0221m?reading=1#p-12');
  });

  it('falls back to route-only links in Electron when no public base URL is configured', () => {
    const shareUrl = buildShareUrl({
      currentHref: 'app://app/sermons/65-0221m?reading=1#p-12',
      pathname: '/sermons/65-0221m',
      search: '?reading=1',
      hash: '#p-12',
      desktopRuntime: {
        isElectron: true,
      },
    });

    expect(shareUrl).toBe('/sermons/65-0221m?reading=1#p-12');
  });
});
