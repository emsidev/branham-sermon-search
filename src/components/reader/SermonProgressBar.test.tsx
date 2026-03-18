import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SermonProgressBar from './SermonProgressBar';

describe('SermonProgressBar', () => {
  it('renders fixed bar with accessible progress metadata', () => {
    render(<SermonProgressBar progressPercent={47} />);

    expect(screen.getByTestId('sermon-progress-bar')).toHaveClass('fixed');
    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toHaveAttribute('aria-valuenow', '47');
    expect(screen.getByTestId('sermon-progress-indicator')).toHaveStyle({ width: '47%' });
  });

  it('clamps out-of-range values', () => {
    const { rerender } = render(<SermonProgressBar progressPercent={120} />);
    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toHaveAttribute('aria-valuenow', '100');

    rerender(<SermonProgressBar progressPercent={-5} />);
    expect(screen.getByRole('progressbar', { name: 'Sermon reading progress' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('does not render when hidden', () => {
    render(<SermonProgressBar progressPercent={63} hidden />);
    expect(screen.queryByTestId('sermon-progress-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: 'Sermon reading progress' })).not.toBeInTheDocument();
  });
});
