import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';

const setThemeMock = vi.fn();
let themeMock: 'system' | 'light' | 'dark' = 'system';
let instantSearchEnabledMock = true;
const setInstantSearchEnabledMock = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: themeMock,
    setTheme: setThemeMock,
  }),
}));

vi.mock('@/lib/preferences', () => ({
  getInstantSearchEnabled: () => instantSearchEnabledMock,
  setInstantSearchEnabled: (enabled: boolean) => {
    instantSearchEnabledMock = enabled;
    setInstantSearchEnabledMock(enabled);
  },
}));

describe('Settings', () => {
  it('updates theme via selector', () => {
    themeMock = 'system';
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('toggles instant search preference', () => {
    instantSearchEnabledMock = true;
    setInstantSearchEnabledMock.mockReset();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /turn off/i }));
    expect(setInstantSearchEnabledMock).toHaveBeenCalledWith(false);
  });
});
