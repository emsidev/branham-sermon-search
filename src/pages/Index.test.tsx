import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Index from './Index';

const useSermonsMock = vi.fn();
const useKeyboardNavMock = vi.fn();
const navigateMock = vi.fn();
let instantSearchEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();

vi.mock('@/hooks/useSermons', () => ({
  useSermons: () => useSermonsMock(),
}));

vi.mock('@/hooks/useKeyboardNav', () => ({
  useKeyboardNav: (...args: unknown[]) => useKeyboardNavMock(...args),
}));

vi.mock('@/lib/viewTransition', () => ({
  runWithViewTransition: (callback: () => void) => callback(),
}));

vi.mock('@/lib/preferences', () => ({
  getInstantSearchEnabled: () => instantSearchEnabledMock,
  setInstantSearchEnabled: (enabled: boolean) => {
    instantSearchEnabledMock = enabled;
    setInstantSearchEnabledMock(enabled);
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderIndex() {
  return render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>
  );
}

describe('Index', () => {
  beforeEach(() => {
    instantSearchEnabledMock = true;
    setInstantSearchEnabledMock.mockReset();
    vi.stubGlobal('__APP_BUILD_DATE__', '2026-03-10T00:00:00.000Z');
    vi.stubGlobal('__APP_VERSION__', '1.2.3');

    navigateMock.mockReset();
    useKeyboardNavMock.mockReset();
    useSermonsMock.mockReset();
    useSermonsMock.mockReturnValue({
      years: [1958, 1972, 1975],
    });
  });

  it('renders the hero page with nav and build metadata', () => {
    renderIndex();

    expect(screen.getByText('the table search')).toBeInTheDocument();
    expect(screen.getByText('a fast, modern browser for the table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /books/i })).toHaveAttribute('href', '/books');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
    expect(screen.getByText('built Mar 10, 2026 · v1.2.3')).toBeInTheDocument();
    expect(screen.getByText('1958')).toBeInTheDocument();
    expect(screen.getByText('1972')).toBeInTheDocument();
  });

  it('navigates to search route on submit with canonical params', () => {
    instantSearchEnabledMock = false;
    renderIndex();

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: '  only believe  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(navigateMock).toHaveBeenCalledWith('/search?q=only+believe&sort=relevance-desc&view=card');
  });

  it('does not navigate when query is empty', () => {
    renderIndex();

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('navigates instantly while typing when instant search is on', () => {
    instantSearchEnabledMock = true;
    renderIndex();

    fireEvent.change(screen.getByLabelText('Search sermons'), {
      target: { value: 'amen' },
    });

    expect(navigateMock).toHaveBeenCalledWith('/search?q=amen&sort=relevance-desc&view=card');
  });
});
