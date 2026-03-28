import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FridgeVisual, { getFreshnessLabel } from './FridgeVisual';
import { ZoneId } from '../types';

const items = [
  {
    id: 'item-1',
    name: 'Milk',
    zoneId: ZoneId.LOWER_SHELVES,
    addedDate: 1,
    expiryDate: Date.now() + 86400000,
    estimatedDays: 2,
    quantity: 1,
    unit: 'carton',
    note: 'Use within two days.',
  },
  {
    id: 'item-2',
    name: 'Bananas',
    zoneId: ZoneId.COUNTER,
    addedDate: 1,
    expiryDate: Date.now() - 86400000,
    estimatedDays: 2,
    quantity: 3,
    unit: 'item',
  },
];

describe('FridgeVisual', () => {
  it('formats freshness labels across all status ranges', () => {
    expect(getFreshnessLabel(Date.now() - 1000)).toBe('Expired');
    expect(getFreshnessLabel(Date.now() + 60 * 60 * 1000)).toBe('Soon');
    expect(getFreshnessLabel(Date.now() + 72 * 60 * 60 * 1000)).toBe('Fresh');
  });

  it('switches storage groups and shows tooltips when used as a passive map', async () => {
    const user = userEvent.setup();
    render(<FridgeVisual selectedZone={ZoneId.COUNTER} items={items} />);

    expect(screen.getByText('Countertop')).toBeInTheDocument();
    expect(screen.getByText('Bananas')).toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Bananas' }));
    expect(await screen.findByText(/Expired/i)).toBeInTheDocument();
    await user.unhover(screen.getByRole('button', { name: 'Bananas' }));
    expect(screen.queryByText(/Expired/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cold storage/i }));
    expect(screen.getByText('Lower Shelves')).toBeInTheDocument();
    await user.hover(screen.getByRole('button', { name: 'Milk' }));
    expect(await screen.findByText(/Use within two days/i)).toBeInTheDocument();
  });

  it('calls the zone and item callbacks in interactive mode', async () => {
    const user = userEvent.setup();
    const onZoneSelect = vi.fn();
    const onItemClick = vi.fn();

    render(
      <FridgeVisual
        selectedZone={ZoneId.LOWER_SHELVES}
        items={items}
        onZoneSelect={onZoneSelect}
        onItemClick={onItemClick}
      />,
    );

    await user.click(screen.getByText('Lower Shelves'));
    expect(onZoneSelect).toHaveBeenCalledWith(ZoneId.LOWER_SHELVES);

    await user.click(screen.getByRole('button', { name: 'Milk' }));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }));
  });

  it('renders fallback tooltip details when quantity and notes are missing', async () => {
    const user = userEvent.setup();

    render(
      <FridgeVisual
        items={[
          {
            id: 'item-3',
            name: 'Herbs',
            zoneId: ZoneId.UPPER_SHELVES,
            addedDate: 1,
            expiryDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
            estimatedDays: 3,
          } as any,
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Cold storage/i }));
    await user.hover(screen.getByRole('button', { name: 'Herbs' }));

    expect(await screen.findByText('Fresh')).toBeInTheDocument();
    expect(screen.getByText(/item$/i)).toBeInTheDocument();
  });
});
