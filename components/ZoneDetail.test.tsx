import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ZoneDetail from './ZoneDetail';
import { FRIDGE_ZONES } from '../constants';
import { ZoneId } from '../types';

describe('ZoneDetail', () => {
  it('renders zone details and switches accordion sections', async () => {
    const user = userEvent.setup();
    render(<ZoneDetail data={FRIDGE_ZONES[ZoneId.LOWER_SHELVES]} />);

    expect(screen.getByText('Lower Shelves')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /What belongs here\?/i }));
    expect(screen.getByText('Raw Meat')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Storage notes/i }));
    expect(screen.getByText(/Keep raw meat on a plate/i)).toBeInTheDocument();
  });
});
