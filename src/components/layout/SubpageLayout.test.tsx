import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SubpageLayout from './SubpageLayout';

function renderWithHistory(options: { initialEntries: string[]; initialIndex?: number; fallbackTo?: string }) {
  const { initialEntries, initialIndex, fallbackTo } = options;

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route
          path="/settings"
          element={(
            <SubpageLayout title="settings" backFallbackTo={fallbackTo}>
              <p>settings content</p>
            </SubpageLayout>
          )}
        />
        <Route path="/" element={<p>home page</p>} />
        <Route path="/search" element={<p>search page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SubpageLayout', () => {
  it('navigates back when history exists', () => {
    renderWithHistory({
      initialEntries: ['/', '/settings'],
      initialIndex: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('falls back to home when no back history exists', () => {
    renderWithHistory({
      initialEntries: ['/settings'],
    });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('uses a custom fallback route when configured', () => {
    renderWithHistory({
      initialEntries: ['/settings'],
      fallbackTo: '/search',
    });

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('search page')).toBeInTheDocument();
  });
});
