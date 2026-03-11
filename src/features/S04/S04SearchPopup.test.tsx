import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { S04SearchPopup } from './S04SearchPopup';

function buildProps(overrides: Partial<ComponentProps<typeof S04SearchPopup>> = {}) {
  return {
    isOpen: true,
    query: 'faith',
    totalResults: 47,
    activeResultIndex: 2,
    onQueryChange: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onClose: vi.fn(),
    shouldFocusInput: false,
    onInputFocusHandled: vi.fn(),
    ...overrides,
  };
}

describe('S04SearchPopup', () => {
  it('does not render when closed', () => {
    render(<S04SearchPopup {...buildProps({ isOpen: false })} />);
    expect(screen.queryByRole('dialog', { name: 'Search popup' })).not.toBeInTheDocument();
  });

  it('renders count and forwards query updates', () => {
    const props = buildProps();
    render(<S04SearchPopup {...props} />);

    expect(screen.getByText('3 of 47')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Find in sermon'), { target: { value: 'hope' } });
    expect(props.onQueryChange).toHaveBeenCalledWith('hope');
  });

  it('disables previous/next buttons when there are no results', () => {
    render(<S04SearchPopup {...buildProps({ totalResults: 0, activeResultIndex: 0 })} />);

    expect(screen.getByRole('button', { name: 'Previous result' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next result' })).toBeDisabled();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });

  it('invokes prev/next and close actions', () => {
    const props = buildProps();
    render(<S04SearchPopup {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous result' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next result' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close search popup' }));

    expect(props.onPrevious).toHaveBeenCalledTimes(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const props = buildProps();
    render(<S04SearchPopup {...props} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('focuses input when focus request is active', async () => {
    const props = buildProps({ shouldFocusInput: true });
    render(<S04SearchPopup {...props} />);

    const input = screen.getByLabelText('Find in sermon');
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
    expect(props.onInputFocusHandled).toHaveBeenCalledTimes(1);
  });
});
