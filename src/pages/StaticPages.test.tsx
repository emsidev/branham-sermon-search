import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import About from './About';
import Books from './Books';

describe('Static pages', () => {
  it('renders books with back button and no return-to-home link', () => {
    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.queryByText(/return to home/i)).not.toBeInTheDocument();
  });

  it('renders about with back button and no return-to-home link', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.queryByText(/return to home/i)).not.toBeInTheDocument();
  });
});
