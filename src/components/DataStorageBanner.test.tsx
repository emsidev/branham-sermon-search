import { render, screen, waitFor } from '@testing-library/react';
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
  });

  it('renders retry button and no direct DB download button when web sqlite is unavailable', async () => {
    render(<DataStorageBanner />);

    await waitFor(() => {
      expect(screen.getByText('Local storage is unavailable in this tab. This tab is running without offline sermon data.')).toBeInTheDocument();
    });
    expect(screen.getByText('Browser mode cannot auto-install the SQLite DB. Use the desktop installer for automatic download and offline use.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry check' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download DB file' })).not.toBeInTheDocument();
  });

  it('renders nothing when web sqlite is available', async () => {
    mockGetResolvedDataPortMode.mockResolvedValue('web-sqlite');
    render(<DataStorageBanner />);

    await waitFor(() => {
      expect(screen.queryByText('Local storage is unavailable in this tab. This tab is running without offline sermon data.')).not.toBeInTheDocument();
    });
  });
});
