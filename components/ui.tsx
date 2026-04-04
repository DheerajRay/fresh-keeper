import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChartColumnIncreasing, ChevronDown, Check, X } from 'lucide-react';

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
  <header className="app-page-header flex flex-col gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-end md:justify-between">
    <div className="max-w-2xl space-y-1.5">
      {eyebrow ? (
        <p className="app-page-eyebrow text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{eyebrow}</p>
      ) : null}
      <h1 className="app-page-title text-3xl font-semibold tracking-tight text-neutral-950 md:text-[2.15rem]">{title}</h1>
      <p className="app-page-description max-w-xl text-sm leading-6 text-neutral-600">{description}</p>
    </div>
    {action ? <div className="app-page-action shrink-0">{action}</div> : null}
  </header>
);

export const SectionHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="app-section-header flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div className="space-y-1">
      <h2 className="app-section-title text-base font-semibold uppercase tracking-[0.14em] text-neutral-950">{title}</h2>
      {description ? <p className="app-section-description text-sm text-neutral-600">{description}</p> : null}
    </div>
    {action ? <div className="app-section-action shrink-0">{action}</div> : null}
  </div>
);

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <section className={cx('app-panel rounded-3xl border border-neutral-200 bg-white', className)}>{children}</section>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="app-empty-state rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
    <div className="mx-auto max-w-sm space-y-2">
      <h3 className="app-empty-title text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="app-empty-description text-sm leading-6 text-neutral-600">{description}</p>
    </div>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const StatStrip: React.FC<{
  items: Array<{ label: string; value: React.ReactNode; note?: string }>;
  className?: string;
}> = ({ items, className }) => {
  const useCompactGrid = items.length <= 3;

  return (
    <div
      className={cx(
        'app-stat-strip',
        className,
        useCompactGrid
          ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3'
          : 'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:gap-3 md:overflow-visible md:pb-0 md:sm:grid-cols-2 md:xl:grid-cols-4',
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cx(
            'app-stat-card rounded-2xl border border-neutral-200 bg-neutral-50',
            useCompactGrid
              ? 'min-w-0 px-3 py-3'
              : 'min-w-[148px] shrink-0 px-4 py-3 md:min-w-0 md:px-4 md:py-4',
          )}
        >
          <p className="app-stat-label text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
          <p
            className={cx(
              'app-stat-value font-semibold tracking-tight text-neutral-950',
              useCompactGrid ? 'mt-1 text-lg md:mt-2 md:text-2xl' : 'mt-1 text-xl md:mt-2 md:text-2xl',
            )}
          >
            {item.value}
          </p>
          {item.note ? <p className="app-stat-note mt-1 line-clamp-2 text-[11px] leading-5 text-neutral-500 md:text-xs">{item.note}</p> : null}
        </div>
      ))}
    </div>
  );
};

export const MobileStatsButton: React.FC<{
  title: string;
  items: Array<{ label: string; value: React.ReactNode; note?: string }>;
}> = ({ title, items }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <IconButton
        type="button"
        className="md:hidden px-3"
        aria-label={`Show ${title.toLowerCase()} summary`}
        onClick={() => setOpen(true)}
      >
        <ChartColumnIncreasing size={16} />
      </IconButton>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description="Quick summary"
        actions={
          <PrimaryButton type="button" onClick={() => setOpen(false)}>
            Close
          </PrimaryButton>
        }
      >
        <div className="space-y-3 pt-1">
          {items.map((item) => (
            <div key={item.label} className="app-summary-card rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{item.value}</p>
              {item.note ? <p className="mt-2 text-sm leading-6 text-neutral-600">{item.note}</p> : null}
            </div>
          ))}
        </div>
      </ConfirmationDialog>
    </>
  );
};

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
  <div className={cx('app-segmented inline-flex rounded-2xl border border-neutral-200 bg-neutral-100 p-1', className)}>
    {options.map((option) => {
      const isActive = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'app-segment rounded-2xl px-4 py-2 text-sm font-medium transition',
            isActive
              ? 'border border-neutral-950 bg-transparent text-neutral-950'
              : 'text-neutral-600 hover:text-neutral-900',
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export const SelectMenu = <T extends string>({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: {
  value: T | '';
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; note?: string }>;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cx('app-select relative', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="app-select-trigger flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm text-neutral-900 outline-none transition hover:border-neutral-300"
      >
        <span className="min-w-0">
          <span className={cx('block truncate', selected ? 'text-neutral-900' : 'text-neutral-500')}>
            {selected?.label || placeholder || 'Select'}
          </span>
        </span>
        <ChevronDown size={14} className={cx('shrink-0 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="listbox"
          className="app-select-list absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm"
        >
          <div className="space-y-1">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cx(
                    'app-select-option flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition',
                    isActive
                      ? 'border-neutral-950 bg-neutral-50 text-neutral-950'
                      : 'border-transparent bg-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.note ? <span className="mt-0.5 block text-xs text-neutral-500">{option.note}</span> : null}
                  </span>
                  {isActive ? <Check size={14} className="shrink-0 text-neutral-950" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ className, active = false, ...props }) => (
  <button
    type="button"
    className={cx(
      'app-button app-button-icon inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm font-medium transition',
      active
        ? 'border-neutral-950 bg-transparent text-neutral-950'
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
      'app-button app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-950 bg-transparent px-4 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-transparent disabled:text-neutral-400',
      className,
    )}
    {...props}
  />
);

export const FloatingActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
> = ({ className, label, children, ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cx(
      'app-button app-button-primary fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-neutral-950 bg-transparent text-neutral-950 shadow-sm transition md:bottom-8 md:right-8 md:h-16 md:w-16',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => (
  <button
    type="button"
    className={cx(
      'app-button app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-400',
      className,
    )}
    {...props}
  />
);

const overlayRoot = typeof document !== 'undefined' ? document.body : null;
let overlayLockCount = 0;
let lockedScrollY = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyLeft = '';
let previousBodyRight = '';

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof window === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    if (overlayLockCount === 0) {
      lockedScrollY = window.scrollY;
      previousHtmlOverflow = html.style.overflow;
      previousBodyOverflow = body.style.overflow;
      previousBodyPosition = body.style.position;
      previousBodyTop = body.style.top;
      previousBodyWidth = body.style.width;
      previousBodyLeft = body.style.left;
      previousBodyRight = body.style.right;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${lockedScrollY}px`;
      body.style.width = '100%';
      body.style.left = '0';
      body.style.right = '0';
    }

    overlayLockCount += 1;

    return () => {
      overlayLockCount = Math.max(overlayLockCount - 1, 0);

      if (overlayLockCount === 0) {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.position = previousBodyPosition;
        body.style.top = previousBodyTop;
        body.style.width = previousBodyWidth;
        body.style.left = previousBodyLeft;
        body.style.right = previousBodyRight;
        window.scrollTo(0, lockedScrollY);
      }
    };
  }, [active]);
}

export const SurfaceSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, description, children, footer }) => {
  useBodyScrollLock(open);

  if (!open || !overlayRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] overscroll-y-contain bg-black/45 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="app-sheet fixed inset-x-0 bottom-0 h-[min(88dvh,calc(100dvh-0.75rem))] max-h-[88dvh] overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white [touch-action:pan-y] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[420px] md:max-h-none md:rounded-none md:border-l">
        <div className="flex h-full min-h-0 flex-col">
          <div className="app-sheet-header flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
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
          <div className="app-sheet-body min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
            {children}
          </div>
          {footer ? <div className="app-sheet-footer border-t border-neutral-200 px-5 py-4">{footer}</div> : null}
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
  useBodyScrollLock(open);

  if (!open || !overlayRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="app-dialog w-full max-w-md rounded-[28px] border border-neutral-200 bg-white">
        <div className="app-dialog-header space-y-3 border-b border-neutral-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-neutral-950">{title}</h3>
          <div className="text-sm leading-6 text-neutral-600">{description}</div>
          {children}
        </div>
        <div className="app-dialog-actions flex flex-col gap-3 px-6 py-5">{actions}</div>
      </div>
    </div>,
    overlayRoot,
  );
};
