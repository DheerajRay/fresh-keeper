import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideAiSearch from './GuideAiSearch';
import { askFridgeAI } from '../services/openai';

vi.mock('../services/openai', () => ({
  askFridgeAI: vi.fn(),
}));

describe('GuideAiSearch', () => {
  it('submits the query and renders the AI response', async () => {
    const user = userEvent.setup();
    vi.mocked(askFridgeAI).mockResolvedValue('**Counter:** Best for ripening.');

    render(<GuideAiSearch />);

    await user.type(screen.getByPlaceholderText(/How to store fresh basil/i), 'Where should bananas go?');
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(askFridgeAI).toHaveBeenCalledWith('Where should bananas go?');
    });

    expect(await screen.findByText('Counter:')).toBeInTheDocument();
    expect(screen.getByText(/Best for ripening/i)).toBeInTheDocument();
  });

  it('keeps the submit button disabled until text is entered', () => {
    render(<GuideAiSearch />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
