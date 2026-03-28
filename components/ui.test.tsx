import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmationDialog,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  StatStrip,
  SurfaceSheet,
  cx,
} from './ui';

describe('ui primitives', () => {
  it('renders static layout primitives', () => {
    render(
      <div>
        <PageHeader eyebrow="Ops" title="Title" description="Description" action={<button>Action</button>} />
        <PageHeader title="Plain title" description="No extras" />
        <SectionHeader title="Section" description="More detail" action={<button>Do</button>} />
        <Panel className="custom-panel">Panel body</Panel>
        <EmptyState title="Empty" description="Nothing here" action={<button>Fill</button>} />
        <StatStrip items={[{ label: 'Count', value: 2, note: 'Tracked' }]} />
        <IconButton active>Icon</IconButton>
        <IconButton>Plain icon</IconButton>
        <PrimaryButton>Primary</PrimaryButton>
        <SecondaryButton disabled>Secondary</SecondaryButton>
      </div>,
    );

    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.queryByText('No extras')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Panel body')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Tracked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeDisabled();
    expect(cx('a', false, 'b')).toBe('a b');
  });

  it('supports segmented controls and overlay primitives', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCloseSheet = vi.fn();
    const onCloseDialog = vi.fn();

    render(
      <div>
        <SegmentedControl
          value="one"
          onChange={onChange}
          options={[
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
          ]}
        />
        <SurfaceSheet
          open
          onClose={onCloseSheet}
          title="Sheet"
          description="Sheet description"
          footer={<button>Footer</button>}
        >
          Body
        </SurfaceSheet>
        <ConfirmationDialog
          open
          onClose={onCloseDialog}
          title="Confirm"
          description={<p>Are you sure?</p>}
          actions={<button>Proceed</button>}
        >
          <span>Extra</span>
        </ConfirmationDialog>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Two' }));
    expect(onChange).toHaveBeenCalledWith('two');

    await user.click(screen.getByLabelText(/close panel/i));
    expect(onCloseSheet).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Proceed'));
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Extra')).toBeInTheDocument();

    const overlays = document.querySelectorAll('.fixed.inset-0');
    await user.click(overlays[1] as HTMLElement);
    expect(onCloseDialog).toHaveBeenCalledTimes(1);
  });

  it('renders overlay primitives without optional content', () => {
    render(
      <div>
        <SurfaceSheet open onClose={() => {}} title="Bare sheet">
          Body
        </SurfaceSheet>
        <ConfirmationDialog open onClose={() => {}} title="Bare confirm" description="Text" actions={<button>Ok</button>} />
      </div>,
    );

    expect(screen.getByText('Bare sheet')).toBeInTheDocument();
    expect(screen.queryByText('Sheet description')).not.toBeInTheDocument();
    expect(screen.queryByText('Footer')).not.toBeInTheDocument();
    expect(screen.getByText('Bare confirm')).toBeInTheDocument();
  });

  it('only closes overlays when the backdrop itself is clicked', async () => {
    const user = userEvent.setup();
    const onCloseSheet = vi.fn();
    const onCloseDialog = vi.fn();

    render(
      <div>
        <SurfaceSheet open onClose={onCloseSheet} title="Backdrop sheet">
          <button>Inner sheet action</button>
        </SurfaceSheet>
        <ConfirmationDialog
          open
          onClose={onCloseDialog}
          title="Backdrop confirm"
          description="Text"
          actions={<button>Confirm</button>}
        >
          <button>Inner dialog action</button>
        </ConfirmationDialog>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /inner sheet action/i }));
    await user.click(screen.getByRole('button', { name: /inner dialog action/i }));

    expect(onCloseSheet).not.toHaveBeenCalled();
    expect(onCloseDialog).not.toHaveBeenCalled();

    const overlays = document.querySelectorAll('.fixed.inset-0');
    await user.click(overlays[0] as HTMLElement);
    await user.click(overlays[1] as HTMLElement);

    expect(onCloseSheet).toHaveBeenCalledTimes(1);
    expect(onCloseDialog).toHaveBeenCalledTimes(1);
  });
});
