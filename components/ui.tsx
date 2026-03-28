import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const cx = joinClasses;

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-end md:justify-between">
    <div className="max-w-2xl space-y-2">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">{title}</h1>
      <p className="max-w-xl text-sm leading-6 text-neutral-600 md:text-base">{description}</p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
);

export const SectionHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
      {description ? <p className="text-sm text-neutral-600">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <section className={cx('rounded-3xl border border-neutral-200 bg-white', className)}>{children}</section>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
    <div className="mx-auto max-w-sm space-y-2">
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm leading-6 text-neutral-600">{description}</p>
    </div>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const StatStrip: React.FC<{
  items: Array<{ label: string; value: React.ReactNode; note?: string }>;
}> = ({ items }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{item.value}</p>
        {item.note ? <p className="mt-1 text-xs text-neutral-500">{item.note}</p> : null}
      </div>
    ))}
  </div>
);

export const SegmentedControl = <T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; note?: string }>;
  className?: string;
}) => (
  <div className={cx('inline-flex rounded-2xl border border-neutral-200 bg-neutral-100 p-1', className)}>
    {options.map((option) => {
      const isActive = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-2xl px-4 py-2 text-sm font-medium transition',
            isActive ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-900',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ className, active = false, ...props }) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition',
      active
        ? 'border-neutral-950 bg-neutral-950 text-white'
        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300',
      className,
    )}
    {...props}
  />
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300',
      className,
    )}
    {...props}
  />
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400',
      className,
    )}
    {...props}
  />
);

const overlayRoot = typeof document !== 'undefined' ? document.body : null;

export const SurfaceSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, description, children, footer }) => {
  if (!open || !overlayRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-x-0 bottom-0 max-h-[88vh] rounded-t-[28px] border border-neutral-200 bg-white md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:max-h-none md:rounded-none md:border-l">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
              {description ? <p className="text-sm text-neutral-600">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:text-neutral-950"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-neutral-200 px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>,
    overlayRoot,
  );
};

export const ConfirmationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  actions: React.ReactNode;
}> = ({ open, onClose, title, description, children, actions }) => {
  if (!open || !overlayRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white">
        <div className="space-y-3 border-b border-neutral-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-neutral-950">{title}</h3>
          <div className="text-sm leading-6 text-neutral-600">{description}</div>
          {children}
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">{actions}</div>
      </div>
    </div>,
    overlayRoot,
  );
};
