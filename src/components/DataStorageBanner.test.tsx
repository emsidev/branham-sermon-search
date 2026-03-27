import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataStorageBanner from '@/components/DataStorageBanner';

const mockGetResolvedDataPortMode = vi.fn();

vi.mock('@/data/dataPort', () => ({
  getResolvedDataPortMode: () => mockGetResolvedDataPortMode(),
}));

describe('DataStorageBanner', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetResolvedDataPortMode.mockResolvedValue('web-sqlite-unavailable');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        downloadUrl: 'https://example.com/content.sqlite',
      }),
    })) as unknown as typeof fetch);
  });

  it('renders retry and download buttons when web sqlite is unavailable', async () => {
    render(<DataStorageBanner />);

    await waitFor(() => {
      expect(screen.getByText('Local storage is unavailable in this tab. This tab is running without offline sermon data.')).toBeInTheDocument();
    });
    expect(screen.getByText('Browser mode cannot auto-install the SQLite DB. Use the desktop installer for automatic download and offline use.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry check' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download DB file' })).toBeInTheDocument();
  });

  it('opens manifest download URL when Download DB is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<DataStorageBanner />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Download DB file' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download DB file' }));
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/content.sqlite',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
