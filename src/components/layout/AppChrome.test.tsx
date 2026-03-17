import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppChrome from './AppChrome';

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    bindings: {
      focus_search: '/',
      open_books: 'b',
      open_settings: ',',
      result_next: 'n',
      result_prev: 'm',
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
  it.each(['/books', '/settings', '/about', '/sermons/42'])(
    'renders global navbar and footer on %s',
    (path) => {
      renderAtPath(path);

      expect(screen.getByLabelText('Search sermons')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /books/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('link', { name: /about/i }).length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'the table search' })).toBeInTheDocument();
      expect(screen.getByText('a fast, modern browser for the table')).toBeInTheDocument();
    }
  );
});
