import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('switches between tabs and opens the guide storage map', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /My Fridge/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Guide & Tips/i }));
    expect(screen.getByText(/Guide and storage tips/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open storage map/i }));
    expect(screen.getByRole('heading', { name: /Storage map/i })).toBeInTheDocument();

    await user.click(screen.getByLabelText(/close panel/i));
    await user.click(screen.getByRole('button', { name: /Shopping List/i }));
    expect(screen.getByText(/Suggestion intake/i)).toBeInTheDocument();
  });
});
