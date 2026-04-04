import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChefHat, ChevronDown, Grid2X2, LogOut, Menu, Refrigerator, ShoppingCart } from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import InventoryManager from './components/InventoryManager';
import MealPlanner from './components/MealPlanner';
import ShoppingListManager from './components/ShoppingListManager';
import SpoilageSection from './components/SpoilageSection';
import ZoneDetail from './components/ZoneDetail';
import { FRIDGE_ZONES } from './constants';
import { useAuth, AuthProvider } from './lib/auth';
import {
  APP_SIZE_OPTIONS,
  getAppSizeOption,
  getThemeOption,
  THEME_OPTIONS,
  ThemeProvider,
  useTheme,
} from './lib/theme';
import { AppSizeName, ThemeName, ZoneId } from './types';
import {
  PageHeader,
  Panel,
  PrimaryButton,
  SectionHeader,
  SurfaceSheet,
  cx,
} from './components/ui';

type AppView = 'inventory' | 'meals' | 'shopping' | 'guide';

type AppearanceSectionProps<T extends string> = {
  title: string;
  currentLabel: string;
  currentDescription: string;
  currentSwatch?: { fill: string; border: string };
  open: boolean;
  onToggle: () => void;
  options: Array<{ value: T; label: string; description: string; swatch?: { fill: string; border: string } }>;
  value: T;
  onSelect: (value: T) => void;
};

const AppearanceSection = <T extends string,>({
  title,
  currentLabel,
  currentDescription,
  currentSwatch,
  open,
  onToggle,
  options,
  value,
  onSelect,
}: AppearanceSectionProps<T>) => (
  <div className="space-y-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{title}</p>
    <div className="app-menu-card rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <button
        type="button"
        onClick={onToggle}
        className="app-picker-trigger flex w-full items-center justify-between gap-3 border border-neutral-200 bg-white px-3 py-3 text-left transition hover:border-neutral-950"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Current {title.toLowerCase()}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-neutral-950">{currentLabel}</span>
        </span>
        <span className="flex items-center gap-2">
          {currentSwatch ? (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-none rounded-full border"
              style={{ backgroundColor: currentSwatch.fill, borderColor: currentSwatch.border }}
            />
          ) : null}
          <ChevronDown size={14} className={cx('transition', open ? 'rotate-180' : '')} />
        </span>
      </button>
      {open ? (
        <div role="listbox" className="mt-2 border border-neutral-200 bg-white p-2">
          <div className="space-y-1">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cx(
                    'flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition',
                    isActive
                      ? 'border-neutral-950 bg-neutral-50 text-neutral-950'
                      : 'border-transparent bg-transparent text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{option.description}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {option.swatch ? (
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 flex-none rounded-full border"
                        style={{ backgroundColor: option.swatch.fill, borderColor: option.swatch.border }}
                      />
                    ) : null}
                    {isActive ? <Check size={14} className="shrink-0 text-neutral-950" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-neutral-500">{currentDescription}</p>
      )}
    </div>
  </div>
);

export const AppShell: React.FC<{ displayName?: string; onSignOut?: () => void }> = ({
  displayName,
  onSignOut,
}) => {
  const { theme, setTheme, appSize, setAppSize } = useTheme();
  const [currentView, setCurrentView] = useState<AppView>('inventory');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [showMenu, setShowMenu] = useState(false);
  const [openAppearance, setOpenAppearance] = useState<'theme' | 'size' | null>(null);

  const navItems = useMemo(
    () => [
      { view: 'inventory' as const, label: 'My Fridge', shortLabel: 'Fridge', icon: Refrigerator },
      { view: 'meals' as const, label: 'Meal Plan', shortLabel: 'Meals', icon: ChefHat },
      { view: 'shopping' as const, label: 'Shopping List', shortLabel: 'Shop', icon: ShoppingCart },
      { view: 'guide' as const, label: 'Guide & Tips', shortLabel: 'Guide', icon: BookOpen },
    ],
    [],
  );

  const guideZoneList = Object.values(FRIDGE_ZONES);
  const currentThemeOption = getThemeOption(theme);
  const currentSizeOption = getAppSizeOption(appSize);

  useEffect(() => {
    if (!showMenu) setOpenAppearance(null);
  }, [showMenu]);

  return (
    <div className="app-shell flex min-h-screen w-full min-w-0 flex-col bg-[#f5f5f3] text-neutral-950 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:overflow-hidden">
      <header className="app-header z-50 shrink-0 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="app-brand-mark rounded-2xl border border-neutral-950 bg-transparent p-2 text-neutral-950">
              <Grid2X2 size={18} />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">FreshKeeper</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <nav className="app-desktop-nav flex items-center gap-1 rounded-2xl border border-neutral-200 bg-transparent p-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => setCurrentView(item.view)}
                    className={cx(
                      'flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition',
                      isActive
                        ? 'border border-neutral-950 bg-transparent text-neutral-950'
                        : 'text-neutral-600 hover:text-neutral-950',
                    )}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {displayName ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs uppercase tracking-[0.16em] text-neutral-600">
                <span className="text-neutral-950">{displayName}</span>
              </div>
            ) : null}

            <button
              type="button"
              className="rounded-2xl border border-neutral-200 bg-transparent p-2 text-neutral-700"
              aria-label="App menu"
              onClick={() => setShowMenu(true)}
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              className="rounded-2xl border border-neutral-200 bg-transparent p-2 text-neutral-700"
              aria-label="App menu"
              onClick={() => setShowMenu(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="app-scroll mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-12 md:pt-7">
        <div className="w-full min-w-0 space-y-6">
          {currentView === 'inventory' ? <InventoryManager /> : null}
          {currentView === 'meals' ? <MealPlanner /> : null}
          {currentView === 'shopping' ? <ShoppingListManager /> : null}
          {currentView === 'guide' ? (
            <div className="space-y-6">
              <PageHeader
                eyebrow="Reference"
                title="Guide and storage tips"
                description="Storage zones and spoilage rules."
              />

              <div className="md:hidden">
                <Panel className="p-4">
                  <SectionHeader title="Storage zones" description="Open a zone to inspect it." />
                  <div className="mt-4 space-y-2">
                    {guideZoneList.map((zone) => (
                      <details
                        key={`mobile-zone-${zone.id}`}
                        className="border border-neutral-200 bg-white"
                        onToggle={(event) => {
                          if ((event.currentTarget as HTMLDetailsElement).open) setSelectedZone(zone.id);
                        }}
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4">
                          <span>
                            <span className="block text-sm font-semibold text-neutral-950">{zone.name}</span>
                            <span className="mt-1 block text-xs text-neutral-500">{zone.temperature}</span>
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">{zone.spoilageRisk}</span>
                        </summary>
                        <div className="border-t border-neutral-200 px-4 py-4">
                          <p className="text-sm leading-6 text-neutral-600">{zone.description}</p>

                          <div className="mt-4 space-y-3">
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                What belongs here?
                              </p>
                              <div className="space-y-2">
                                {zone.bestFor.map((value) => (
                                  <div
                                    key={`${zone.id}-best-${value}`}
                                    className="border-l border-neutral-300 pl-3 text-sm leading-6 text-neutral-700"
                                  >
                                    {value}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                                Storage notes
                              </p>
                              <div className="space-y-2">
                                {zone.tips.map((value) => (
                                  <div
                                    key={`${zone.id}-tip-${value}`}
                                    className="border-l border-neutral-300 pl-3 text-sm leading-6 text-neutral-700"
                                  >
                                    {value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="hidden gap-4 md:grid xl:grid-cols-[300px_minmax(0,1fr)]">
                <Panel className="p-4 md:p-5">
                  <SectionHeader title="Storage zones" description="Select a zone." />
                  <div className="mt-4 space-y-2">
                    {guideZoneList.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedZone(zone.id)}
                        className={cx(
                          'flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition',
                          selectedZone === zone.id
                            ? 'border-neutral-950 bg-transparent text-neutral-950'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400',
                        )}
                      >
                        <span>
                          <span className="block text-sm font-semibold">{zone.name}</span>
                          <span
                            className={cx(
                              'mt-1 block text-xs',
                              selectedZone === zone.id ? 'text-neutral-500' : 'text-neutral-500',
                            )}
                          >
                            {zone.temperature}
                          </span>
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">{zone.spoilageRisk}</span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <div>
                  <ZoneDetail data={FRIDGE_ZONES[selectedZone]} />
                </div>
              </div>

              <div className="space-y-4">
                <SectionHeader title="Spoilage reference" description="Core spoilage signs and discard rules." />
                <SpoilageSection />
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <nav className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-1 md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setCurrentView(item.view)}
                className={cx(
                  'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] transition',
                  isActive
                    ? 'border border-neutral-950 bg-transparent text-neutral-950'
                    : 'text-neutral-500',
                )}
              >
                <Icon size={16} />
                {item.shortLabel}
              </button>
            );
          })}
        </div>
      </nav>

      <SurfaceSheet open={showMenu} onClose={() => setShowMenu(false)} title="Menu">
        <div className="space-y-6">
          {displayName ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Signed in as <span className="font-semibold text-neutral-950">{displayName}</span>
            </div>
          ) : null}

          <AppearanceSection<AppSizeName>
            title="App Size"
            currentLabel={currentSizeOption.label}
            currentDescription={currentSizeOption.description}
            open={openAppearance === 'size'}
            onToggle={() => setOpenAppearance((current) => (current === 'size' ? null : 'size'))}
            options={APP_SIZE_OPTIONS}
            value={appSize}
            onSelect={(value) => {
              setAppSize(value);
              setOpenAppearance(null);
            }}
          />

          <AppearanceSection<ThemeName>
            title="Theme"
            currentLabel={currentThemeOption.label}
            currentDescription={currentThemeOption.description}
            currentSwatch={{ fill: currentThemeOption.preview.accent, border: currentThemeOption.preview.text }}
            open={openAppearance === 'theme'}
            onToggle={() => setOpenAppearance((current) => (current === 'theme' ? null : 'theme'))}
            options={THEME_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              description: option.description,
              swatch: { fill: option.preview.accent, border: option.preview.text },
            }))}
            value={theme}
            onSelect={(value) => {
              setTheme(value);
              setOpenAppearance(null);
            }}
          />

          {onSignOut ? (
            <PrimaryButton
              type="button"
              onClick={() => {
                setShowMenu(false);
                onSignOut();
              }}
              className="w-full"
            >
              <LogOut size={18} />
              Sign out
            </PrimaryButton>
          ) : null}
        </div>
      </SurfaceSheet>
    </div>
  );
};

const AppBootstrap: React.FC = () => (
  <div className="min-h-screen bg-[#f5f5f3] px-4 py-8 text-neutral-950 md:px-6 md:py-12">
    <div className="mx-auto max-w-3xl">
      <Panel className="p-6 md:p-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">FreshKeeper</p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Loading your account</h1>
        </div>
      </Panel>
    </div>
  </div>
);

const AuthenticatedApp: React.FC = () => {
  const { status, isAuthenticated, profile, signOut } = useAuth();

  if (status === 'loading') return <AppBootstrap />;
  if (!isAuthenticated) return <AuthScreen />;

  return <AppShell displayName={profile?.displayName} onSignOut={() => { void signOut(); }} />;
};

const App: React.FC = () => (
  <AuthProvider>
    <ThemeProvider>
      <AuthenticatedApp />
    </ThemeProvider>
  </AuthProvider>
);

export default App;
