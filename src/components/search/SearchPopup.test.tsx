import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchPopup } from './SearchPopup';

function buildProps(overrides: Partial<ComponentProps<typeof SearchPopup>> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    children: <div data-testid="popup-content">content</div>,
    ...overrides,
  };
}

describe('SearchPopup', () => {
  it('does not render when closed', () => {
    render(<SearchPopup {...buildProps({ isOpen: false })} />);
    expect(screen.queryByRole('dialog', { name: 'Search popup' })).not.toBeInTheDocument();
  });

  it('renders children in dialog shell', () => {
    render(<SearchPopup {...buildProps()} />);
    expect(screen.getByRole('dialog', { name: 'Search popup' })).toBeInTheDocument();
    expect(screen.getByTestId('popup-content')).toHaveTextContent('content');
  });

  it('invokes close on overlay and close button click', () => {
    const props = buildProps();
    render(<SearchPopup {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close search popup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close search popup overlay' }));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('invokes close when Escape is pressed', () => {
    const props = buildProps();
    render(<SearchPopup {...props} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

