import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppShell } from './App';

describe('App shell', () => {
  it('switches between tabs and renders the mobile guide accordion flow', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    expect(screen.getByRole('heading', { name: /My Fridge/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /Navigation menu/i })[0]);
    expect(screen.getByRole('heading', { name: /Navigate/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Meal Plan.*Meals/i }));
    expect(screen.getByRole('heading', { name: /Meal Plan/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Guide & Tips/i }));
    expect(screen.getByText(/Guide and storage tips/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open storage map/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Open only the zones you need/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Freezer$/i).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('details[open]')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Shopping List/i }));
    expect(screen.getByText(/Suggestion intake/i)).toBeInTheDocument();
  });
});
