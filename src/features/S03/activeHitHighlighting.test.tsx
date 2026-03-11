import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderActiveHitHighlights } from './activeHitHighlighting';

interface HighlightHarnessProps {
  text?: string;
  terms?: string[];
  requestedActiveIndex?: number | null;
}

function HighlightHarness({
  text = 'Faith rises. Faith keeps moving. Faith remains.',
  terms = ['faith'],
  requestedActiveIndex,
}: HighlightHarnessProps) {
  const rendered = renderActiveHitHighlights(text, terms, requestedActiveIndex);

  return (
    <div
      data-testid="highlight-root"
      data-total-matches={String(rendered.totalMatches)}
      data-active-match-index={rendered.activeMatchIndex == null ? '' : String(rendered.activeMatchIndex)}
    >
      {rendered.content}
    </div>
  );
}

function getMatchMarks(): HTMLElement[] {
  return Array.from(document.querySelectorAll('mark[data-search-match="true"]'));
}

describe('renderActiveHitHighlights', () => {
  it('highlights only the requested active index and dims all other matches', () => {
    render(<HighlightHarness requestedActiveIndex={2} />);

    const marks = getMatchMarks();
    expect(marks).toHaveLength(3);

    expect(marks[0]).toHaveAttribute('data-search-match-index', '0');
    expect(marks[0]).toHaveAttribute('data-search-match-active', 'false');
    expect(marks[0]).toHaveClass('bg-yellow-200/30');
    expect(marks[0]).toHaveClass('text-foreground/70');

    expect(marks[1]).toHaveAttribute('data-search-match-index', '1');
    expect(marks[1]).toHaveAttribute('data-search-match-active', 'false');
    expect(marks[1]).toHaveClass('bg-yellow-200/30');
    expect(marks[1]).toHaveClass('text-foreground/70');

    expect(marks[2]).toHaveAttribute('data-search-match-index', '2');
    expect(marks[2]).toHaveAttribute('data-search-match-active', 'true');
    expect(marks[2]).toHaveClass('bg-yellow-200/70');
    expect(marks[2]).toHaveClass('text-foreground');

    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-total-matches', '3');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '2');
  });

  it.each([undefined, null])('defaults first match active when requested index is %s', (requestedActiveIndex) => {
    render(<HighlightHarness requestedActiveIndex={requestedActiveIndex} />);

    const marks = getMatchMarks();
    expect(marks).toHaveLength(3);
    expect(marks[0]).toHaveAttribute('data-search-match-active', 'true');
    expect(marks[1]).toHaveAttribute('data-search-match-active', 'false');
    expect(marks[2]).toHaveAttribute('data-search-match-active', 'false');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '0');
  });

  it.each([-1, 99])('falls back to first active match for invalid requested index %s', (invalidIndex) => {
    render(<HighlightHarness requestedActiveIndex={invalidIndex} />);

    const marks = getMatchMarks();
    expect(marks).toHaveLength(3);
    expect(marks[0]).toHaveAttribute('data-search-match-active', 'true');
    expect(marks[1]).toHaveAttribute('data-search-match-active', 'false');
    expect(marks[2]).toHaveAttribute('data-search-match-active', 'false');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '0');
  });

  it('updates active match semantics correctly across rerenders', () => {
    const { rerender } = render(<HighlightHarness requestedActiveIndex={0} />);

    let marks = getMatchMarks();
    expect(marks[0]).toHaveAttribute('data-search-match-active', 'true');
    expect(marks[1]).toHaveAttribute('data-search-match-active', 'false');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '0');

    rerender(<HighlightHarness requestedActiveIndex={1} />);

    marks = getMatchMarks();
    expect(marks[0]).toHaveAttribute('data-search-match-active', 'false');
    expect(marks[1]).toHaveAttribute('data-search-match-active', 'true');
    expect(marks[2]).toHaveAttribute('data-search-match-active', 'false');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '1');
  });

  it('returns plain text with no marks when terms are empty or do not match', () => {
    const { rerender } = render(
      <HighlightHarness
        text="No highlighted tokens should appear."
        terms={[]}
      />
    );

    expect(getMatchMarks()).toHaveLength(0);
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-total-matches', '0');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '');
    expect(screen.getByText('No highlighted tokens should appear.')).toBeInTheDocument();

    rerender(
      <HighlightHarness
        text="No highlighted tokens should appear."
        terms={['faith']}
      />
    );

    expect(getMatchMarks()).toHaveLength(0);
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-total-matches', '0');
    expect(screen.getByTestId('highlight-root')).toHaveAttribute('data-active-match-index', '');
  });
});
