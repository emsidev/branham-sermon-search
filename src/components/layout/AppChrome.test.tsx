import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppChrome from './AppChrome';
import type { BootstrapStatus } from '@/data/desktopBootstrap';

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'n',
      result_prev: 'm',
      toggle_reading_mode: 'r',
      toggle_slide_view: 'p',
      add_slide_highlight: 'g',
      cycle_highlight_mode: 'h',
      reader_extend_selection: 'ArrowRight',
      reader_shrink_selection: 'ArrowLeft',
    },
    syncStatus: 'synced',
    syncWarning: null,
    setShortcutBinding: vi.fn(),
    resetShortcutBinding: vi.fn(),
    resetAllShortcutBindings: vi.fn(),
    registerSearchInputResolver: () => () => undefined,
    getSearchInputElement: () => null,
    registerResultListController: () => () => undefined,
    getResultListController: () => null,
  }),
  useShortcutSearchInputRegistration: vi.fn(),
}));

const defaultBootstrapStatus: BootstrapStatus = {
  phase: 'ready',
  receivedBytes: 0,
  totalBytes: null,
  error: null,
  usingFallbackData: false,
};

const mockRetryDownload = vi.fn();
const mockUseDesktopBootstrapStatus = vi.fn(() => ({
  isDesktop: true,
  status: defaultBootstrapStatus,
  startDownload: mockRetryDownload,
  isStartingDownload: false,
}));

vi.mock('@/hooks/useDesktopBootstrapStatus', () => ({
  useDesktopBootstrapStatus: () => mockUseDesktopBootstrapStatus(),
}));

function renderAtPath(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route element={<AppChrome />}>
          <Route path="/" element={<div>home route</div>} />
          <Route path="/books" element={<div>books route</div>} />
          <Route path="/settings" element={<div>settings route</div>} />
          <Route path="/about" element={<div>about route</div>} />
          <Route path="/sermons/:id" element={<div>sermon route</div>} />
          <Route path="/search" element={<div>search route</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AppChrome', () => {
  beforeEach(() => {
    mockRetryDownload.mockReset();
    mockUseDesktopBootstrapStatus.mockReset();
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: defaultBootstrapStatus,
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });
  });

  it('shows download prompt while desktop bootstrap needs a DB', () => {
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: {
        phase: 'needs-download',
        receivedBytes: 0,
        totalBytes: null,
        error: null,
        usingFallbackData: true,
      },
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });

    renderAtPath('/search');

    expect(screen.getByText('Download sermons')).toBeInTheDocument();
    const downloadButton = screen.getByRole('button', { name: 'Download' });
    expect(downloadButton).toBeInTheDocument();

    fireEvent.click(downloadButton);
    expect(mockRetryDownload).toHaveBeenCalledTimes(1);
  });

  it('shows downloading sermons status while desktop bootstrap is downloading', () => {
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: {
        phase: 'downloading',
        receivedBytes: 50,
        totalBytes: 100,
        error: null,
        usingFallbackData: false,
      },
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });

    renderAtPath('/search');

    expect(screen.getByText('Downloading sermons')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    const downloadButton = screen.getByRole('button', { name: 'Downloading...' });
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).toBeDisabled();
  });

  it('shows retry-capable error banner when download failed', () => {
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: {
        phase: 'error',
        receivedBytes: 0,
        totalBytes: null,
        error: 'Network unavailable',
        usingFallbackData: true,
      },
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });

    renderAtPath('/search');

    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('renders navbar links and footer on home route without header search input', () => {
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: defaultBootstrapStatus,
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });

    renderAtPath('/');

    expect(screen.queryByLabelText('Search sermons')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /books/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /about/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('A fast, modern browser for the table')).toBeInTheDocument();
  });

  it.each(['/books', '/settings', '/about', '/sermons/42'])(
    'renders global navbar and footer on %s',
    (path) => {
      mockUseDesktopBootstrapStatus.mockReturnValue({
        isDesktop: true,
        status: defaultBootstrapStatus,
        startDownload: mockRetryDownload,
        isStartingDownload: false,
      });

      renderAtPath(path);

      expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /books/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /about/i }).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'the table search' })).toBeInTheDocument();
      expect(screen.getByText('A fast, modern browser for the table')).toBeInTheDocument();
    }
  );

  it('hides global navbar and footer on sermon reading mode route', () => {
    mockUseDesktopBootstrapStatus.mockReturnValue({
      isDesktop: true,
      status: defaultBootstrapStatus,
      startDownload: mockRetryDownload,
      isStartingDownload: false,
    });

    renderAtPath('/sermons/42?reading=1');

    expect(screen.queryByLabelText('Search sermons')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /books/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /about/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'the table search' })).not.toBeInTheDocument();
    expect(screen.queryByText('A fast, modern browser for the table')).not.toBeInTheDocument();
    expect(screen.getByText('sermon route')).toBeInTheDocument();
  });
});
