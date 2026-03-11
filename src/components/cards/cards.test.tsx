import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CardPill } from './CardPill';
import BookMatchCard from './BookMatchCard';
import SearchHitCard from './SearchHitCard';

function LocationStateSpy() {
  const location = useLocation();
  return <div data-testid="location-state">{JSON.stringify(location.state ?? null)}</div>;
}

describe('cards primitives', () => {
  it('renders pill variants', () => {
    const { rerender } = render(<CardPill>neutral</CardPill>);
    expect(screen.getByText('neutral')).toHaveClass('pill-neutral');

    rerender(<CardPill variant="accent">accent</CardPill>);
    expect(screen.getByText('accent')).toHaveClass('pill-accent');
  });

  it('renders book match card pills and image fallback', () => {
    render(
      <MemoryRouter>
        <BookMatchCard
          to="/sermons/1"
          title="Have Faith in God"
          summary="A concise overview for the top title match."
          sermonCode="58-0105"
          location="Jeffersonville, IN"
          year={1958}
          tags={['faith', 'healing']}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('exact-title-card')).toHaveAttribute('href', '/sermons/1');
    expect(screen.getByText('58-0105')).toBeInTheDocument();
    expect(screen.getByTestId('book-match-summary')).toHaveTextContent(
      'A concise overview for the top title match.'
    );
    expect(screen.getByText('Jeffersonville, IN')).toBeInTheDocument();
    expect(screen.getByText('1958')).toBeInTheDocument();
    expect(screen.getByText('faith')).toBeInTheDocument();
    expect(screen.getByText('healing')).toBeInTheDocument();

    fireEvent.error(screen.getByTestId('book-match-image'));
    expect(screen.getByTestId('book-match-fallback')).toHaveTextContent('H');
  });

  it('renders search hit card metadata pills', () => {
    render(
      <MemoryRouter>
        <SearchHitCard
          to="/sermons/2?q=faith"
          title="Only Believe"
          snippet="... only believe ..."
          sermonCode="61-0428"
          location="Phoenix, AZ"
          date="1961-04-28"
          matchLabel="Paragraph 3 (1/2)"
          tags={['faith']}
          isExact
          selected
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /only believe/i })).toHaveAttribute('href', '/sermons/2?q=faith');
    expect(screen.getByText('Paragraph 3 (1/2)')).toBeInTheDocument();
    expect(screen.getByText('faith')).toBeInTheDocument();
    expect(screen.getByText('exact')).toBeInTheDocument();
  });

  it('forwards link state for book match card links', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <div>
                <BookMatchCard
                  to="/sermons/1"
                  linkState={{ searchReturnTo: '/search?q=have+faith&sort=relevance-desc&view=card&page=2' }}
                  title="Have Faith in God"
                />
                <SearchHitCard
                  to="/sermons/2?q=faith"
                  linkState={{ searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4' }}
                  title="Only Believe"
                  snippet="... only believe ..."
                  date="1961-04-28"
                  matchLabel="Paragraph 3"
                />
              </div>
            )}
          />
          <Route path="/sermons/:id" element={<LocationStateSpy />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('exact-title-card'));
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '"searchReturnTo":"/search?q=have+faith&sort=relevance-desc&view=card&page=2"',
    );
  });

  it('forwards link state for search hit card links', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <SearchHitCard
                to="/sermons/2?q=faith"
                linkState={{ searchReturnTo: '/search?q=only+believe&sort=date-desc&view=table&page=4' }}
                title="Only Believe"
                snippet="... only believe ..."
                date="1961-04-28"
                matchLabel="Paragraph 3"
              />
            )}
          />
          <Route path="/sermons/:id" element={<LocationStateSpy />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: /only believe/i }));
    expect(screen.getByTestId('location-state')).toHaveTextContent(
      '"searchReturnTo":"/search?q=only+believe&sort=date-desc&view=table&page=4"',
    );
  });
});
