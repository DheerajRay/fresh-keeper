import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideAiSearch from './GuideAiSearch';
import { askFridgeAI } from '../services/openai';

vi.mock('../services/openai', () => ({
  askFridgeAI: vi.fn(),
}));

describe('GuideAiSearch', () => {
  it('keeps the submit button disabled for blank questions', () => {
    render(<GuideAiSearch />);

    expect(screen.getByRole('button', { name: /Ask FreshKeeper AI/i })).toBeDisabled();
  });

  it('submits the query and renders the AI response', async () => {
    const user = userEvent.setup();
    vi.mocked(askFridgeAI).mockResolvedValue('**Counter:** Best for ripening.');

    render(<GuideAiSearch />);

    await user.type(screen.getByPlaceholderText(/store fresh basil/i), 'Where should bananas go?');
    await user.click(screen.getByRole('button', { name: /ask freshkeeper ai/i }));

    await waitFor(() => {
      expect(askFridgeAI).toHaveBeenCalledWith('Where should bananas go?');
    });

    expect(await screen.findByText('Counter:')).toBeInTheDocument();
    expect(screen.getByText(/Best for ripening/i)).toBeInTheDocument();
  });

  it('keeps the submit button disabled until text is entered', () => {
    render(<GuideAiSearch />);

    expect(screen.getByRole('button', { name: /ask freshkeeper ai/i })).toBeDisabled();
  });

  it('ignores direct form submission when the query is blank', () => {
    render(<GuideAiSearch />);

    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    expect(askFridgeAI).not.toHaveBeenCalled();
  });

  it('collapses long answers until expanded', async () => {
    const user = userEvent.setup();
    vi.mocked(askFridgeAI).mockResolvedValue('A'.repeat(320));

    render(<GuideAiSearch />);

    await user.type(screen.getByPlaceholderText(/store fresh basil/i), 'How should I store herbs?');
    await user.click(screen.getByRole('button', { name: /ask freshkeeper ai/i }));

    expect(await screen.findByRole('button', { name: /show more/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show more/i }));
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });
});
