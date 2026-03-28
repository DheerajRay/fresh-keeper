import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryManager, { formatDaysLeft, formatQuantity, getRecommendedZone, getStatus } from './InventoryManager';
import { ZoneId } from '../types';
import { identifyItemFromImage, getShelfLifePrediction } from '../services/openai';

vi.mock('../services/openai', () => ({
  getShelfLifePrediction: vi.fn(),
  identifyItemFromImage: vi.fn(),
}));

describe('InventoryManager', () => {
  beforeEach(() => {
    vi.mocked(getShelfLifePrediction).mockResolvedValue({
      days: 5,
      advice: 'Store in the lower shelves.',
      isFood: true,
      recommendedStorage: 'FRIDGE',
    });
  });

  it('covers inventory helper formatting branches', () => {
    expect(getStatus(Date.now() - 1000)).toBe('Expired');
    expect(getStatus(Date.now() + 60 * 60 * 1000)).toBe('Soon');
    expect(getStatus(Date.now() + 72 * 60 * 60 * 1000)).toBe('Fresh');

    expect(formatDaysLeft(Date.now() - 24 * 60 * 60 * 1000)).toContain('overdue');
    expect(formatDaysLeft(Date.now())).toBe('Today');
    expect(formatDaysLeft(Date.now() + 24 * 60 * 60 * 1000)).toBe('1 day left');

    expect(formatQuantity(1)).toBe('1 item');
    expect(formatQuantity(3, 'bunch')).toBe('3 bunches');
    expect(formatQuantity(2, 'box')).toBe('2 boxes');
    expect(formatQuantity(4, 'carton')).toBe('4 cartons');
    expect(formatQuantity(2, 'kg')).toBe('2 kg');

    expect(getRecommendedZone()).toBe(ZoneId.LOWER_SHELVES);
    expect(getRecommendedZone('pantry shelf')).toBe(ZoneId.PANTRY);
    expect(getRecommendedZone('counter')).toBe(ZoneId.COUNTER);
    expect(getRecommendedZone('freezer')).toBe(ZoneId.FREEZER);
    expect(getRecommendedZone('crisper drawer')).toBe(ZoneId.CRISPER_DRAWER);
  });

  it('adds an item and removes it through the detail sheet', async () => {
    const user = userEvent.setup();

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Milk');
    await user.click(screen.getByRole('button', { name: /save item/i }));

    expect(await screen.findByText('Milk')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await user.click(screen.getByRole('button', { name: /remove from inventory/i }));

    await waitFor(() => {
      expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    });
  });

  it('uses scan to populate the add flow', async () => {
    const user = userEvent.setup();
    vi.mocked(identifyItemFromImage).mockResolvedValue({
      name: 'Bananas',
      quantity: 3,
      unit: 'item',
      zoneId: 'COUNTER',
      isFood: true,
    });

    mockScanningPrimitives();

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /scan item/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image-bytes'], 'banana.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByDisplayValue('Bananas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('handles scan warnings and scan failures', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(identifyItemFromImage)
      .mockResolvedValueOnce({
        name: 'Soap',
        isFood: false,
        recommendedStorage: 'OTHER',
        reasoning: 'Cleaner bottle detected.',
      })
      .mockRejectedValueOnce(new Error('scan failed'));

    mockScanningPrimitives();

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /scan item/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'soap.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByText(/does not look like food/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Close$/i }));

    fireEvent.change(fileInput, { target: { files: [new File(['b'], 'broken.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Could not identify the item. Please try again.');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it('handles scan files that cannot be read into base64', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    class EmptyResultFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

      readAsDataURL() {
        Promise.resolve().then(() =>
          this.onload?.({ target: { result: undefined } } as unknown as ProgressEvent<FileReader>),
        );
      }
    }

    vi.stubGlobal('FileReader', EmptyResultFileReader as unknown as typeof FileReader);

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /scan item/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'broken.jpg', { type: 'image/jpeg' })] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Could not identify the item. Please try again.');
      expect(consoleSpy).toHaveBeenCalled();
    });

    expect(identifyItemFromImage).not.toHaveBeenCalled();
  });

  it('shows non-food and expired warnings with their respective actions', async () => {
    const user = userEvent.setup();
    vi.mocked(getShelfLifePrediction)
      .mockResolvedValueOnce({
        days: 1,
        advice: 'Not food.',
        isFood: false,
        recommendedStorage: 'OTHER',
      })
      .mockResolvedValueOnce({
        days: 0,
        advice: 'Spoiled already.',
        isFood: true,
        recommendedStorage: 'FRIDGE',
      });

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Sponge');
    await user.click(screen.getByRole('button', { name: /save item/i }));

    expect(await screen.findByText(/does not look like food/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Close$/i }));

    await user.clear(screen.getByPlaceholderText(/Eggs, basil/i));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Old fish');
    await user.click(screen.getByRole('button', { name: /save item/i }));

    expect(await screen.findByText(/Potential spoilage detected/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add anyway/i }));

    expect(await screen.findByText('Old fish')).toBeInTheDocument();
  });

  it('handles storage mismatch by switching zones and supports map/detail actions', async () => {
    const user = userEvent.setup();
    vi.mocked(getShelfLifePrediction)
      .mockResolvedValueOnce({
        days: 4,
        advice: 'Store in pantry.',
        isFood: true,
        recommendedStorage: 'PANTRY',
      })
      .mockResolvedValueOnce({
        days: 4,
        advice: 'Store in pantry.',
        isFood: true,
        recommendedStorage: 'PANTRY',
      });

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Bread');
    await user.click(screen.getByRole('button', { name: /save item/i }));

    expect(await screen.findByText(/Storage mismatch/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Switch to better zone/i }));

    await user.click(screen.getByRole('button', { name: /save item/i }));
    const breadLabels = await screen.findAllByText('Bread');
    const breadRow = breadLabels
      .map((label) => label.closest('.rounded-3xl'))
      .find((candidate): candidate is HTMLElement => Boolean(candidate?.querySelector('button')));

    if (!breadRow) {
      throw new Error('Expected Bread inventory row to render.');
    }

    await user.click(within(breadRow).getByRole('button', { name: /^Details$/i }));
    await user.click(screen.getByRole('button', { name: /Pantry/i }));
    await user.click(screen.getByRole('button', { name: /remove from inventory/i }));

    await waitFor(() => {
      expect(screen.queryByText('Bread')).not.toBeInTheDocument();
    });
  });

  it('increments duplicate items, supports quantity controls, and closes sheets', async () => {
    const user = userEvent.setup();

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.click(screen.getByLabelText(/close panel/i));
    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Milk');
    await user.click(screen.getByRole('button', { name: /save item/i }));
    expect(await screen.findByText('Milk')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add to fridge/i }));
    await user.type(screen.getByPlaceholderText(/Eggs, basil/i), 'Milk');
    await user.click(screen.getByRole('button', { name: /save item/i }));
    expect(await screen.findByText('2 items')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(screen.getByText('3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));
    expect(screen.getByText('2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Close panel/i }));
  });

  it('opens the storage map, routes item clicks into detail, and shows mismatch guidance after moving zones', async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      'fridge_inventory',
      JSON.stringify([
        {
          id: 'inv-1',
          name: 'Milk',
          zoneId: ZoneId.LOWER_SHELVES,
          addedDate: Date.now(),
          expiryDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
          estimatedDays: 3,
          quantity: 1,
          unit: 'carton',
          recommendedStorage: 'FRIDGE',
          note: 'Keep chilled.',
        },
      ]),
    );

    render(<InventoryManager />);

    await user.click(screen.getByRole('button', { name: /Zones/i }));
    expect(screen.getByRole('heading', { name: /Storage map/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Milk' }));

    expect(await screen.findByText(/Move storage zone/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Pantry/i }));
    expect(screen.getByText(/keeps better in cold storage/i)).toBeInTheDocument();
  });
});

function mockScanningPrimitives() {
  class MockFileReader {
    onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

    readAsDataURL() {
      Promise.resolve().then(() =>
        this.onload?.({ target: { result: 'data:image/jpeg;base64,mock' } } as unknown as ProgressEvent<FileReader>),
      );
    }
  }

  vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);
}
