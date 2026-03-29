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
import { ThemeProvider, useTheme } from './lib/theme';
import { ThemeName, ZoneId } from './types';
import {
  PageHeader,
  Panel,
  PrimaryButton,
  SectionHeader,
  SurfaceSheet,
  cx,
} from './components/ui';

type AppView = 'inventory' | 'meals' | 'shopping' | 'guide';

type ThemeOption = {
  value: ThemeName;
  label: string;
  description: string;
  preview: { page: string; accent: string; text: string };
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Black base with white highlight.',
    preview: { page: '#050608', accent: '#f5f5f5', text: '#f5f5f5' },
  },
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Light base with dark highlight.',
    preview: { page: '#f5f5f3', accent: '#090b10', text: '#090b10' },
  },
  {
    value: 'zen',
    label: 'Zen Mode',
    description: 'Dark base with a calm yellow accent.',
    preview: { page: '#0a0b08', accent: '#d8b84f', text: '#f6f2dc' },
  },
  {
    value: 'banana',
    label: 'Banana Mode',
    description: 'Light base with a warm yellow accent.',
    preview: { page: '#fffdf3', accent: '#d6b728', text: '#231d08' },
  },
  {
    value: 'arctic',
    label: 'Arctic Mode',
    description: 'Cool light surfaces with icy blue accents.',
    preview: { page: '#eff5fb', accent: '#7aa7d8', text: '#1f2d3d' },
  },
  {
    value: 'summer',
    label: 'Summer Mode',
    description: 'Warm light surfaces with soft coral-yellow highlights.',
    preview: { page: '#fff7ef', accent: '#e8a04d', text: '#3a2410' },
  },
  {
    value: 'pitch_black',
    label: 'Pitch Black Mode',
    description: 'Deep black with restrained gray highlights.',
    preview: { page: '#010101', accent: '#5e6672', text: '#b8bec7' },
  },
  {
    value: 'red',
    label: 'Red Mode',
    description: 'Dark base with a restrained red accent.',
    preview: { page: '#090405', accent: '#b64a57', text: '#f2d7db' },
  },
];

export const AppShell: React.FC<{ displayName?: string; onSignOut?: () => void }> = ({
  displayName,
  onSignOut,
}) => {
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<AppView>('inventory');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [showMenu, setShowMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

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

  useEffect(() => {
    if (!showMenu) setShowThemePicker(false);
  }, [showMenu]);

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-neutral-950 bg-transparent p-2 text-neutral-950">
              <Grid2X2 size={18} />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">FreshKeeper</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-neutral-500 sm:block">
                kitchen operating system
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <nav className="rounded-2xl border border-neutral-200 bg-transparent p-1">
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
              aria-label="Navigation menu"
              onClick={() => setShowMenu(true)}
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              className="rounded-2xl border border-neutral-200 bg-transparent p-2 text-neutral-700"
              aria-label="Navigation menu"
              onClick={() => setShowMenu(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-12 md:pt-7">
        {currentView === 'inventory' ? <InventoryManager /> : null}
        {currentView === 'meals' ? <MealPlanner /> : null}
        {currentView === 'shopping' ? <ShoppingListManager /> : null}
        {currentView === 'guide' ? (
          <div className="space-y-6">
            <PageHeader
              eyebrow="Reference"
              title="Guide and storage tips"
              description="Review storage zones and spoilage rules in one reference flow."
            />

            <div className="md:hidden">
              <Panel className="p-4">
                <SectionHeader
                  title="Storage zones"
                  description="Open only the zones you need so the reference stays compact."
                />
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
                        <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                          {zone.spoilageRisk}
                        </span>
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
                <SectionHeader
                  title="Storage zones"
                  description="Select a zone to inspect what belongs there and what to watch for."
                />
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
              <SectionHeader
                title="Spoilage reference"
                description="Keep this as the quick safety section: core spoilage mechanics and the signs that mean discard."
              />
              <SpoilageSection />
            </div>
          </div>
        ) : null}
      </main>

      <footer className="hidden border-t border-neutral-200 bg-white md:block">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-600 md:px-6">
          FreshKeeper keeps inventory, meal planning, shopping, and storage guidance in one connected workflow.
        </div>
      </footer>

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

      <SurfaceSheet
        open={showMenu}
        onClose={() => setShowMenu(false)}
        title="Navigate"
        description="Switch sections, change theme, and keep account actions in one place."
      >
        <div className="space-y-6">
          {displayName ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Signed in as <span className="font-semibold text-neutral-950">{displayName}</span>
            </div>
          ) : null}

          <div className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={`menu-${item.view}`}
                  type="button"
                    onClick={() => {
                      setCurrentView(item.view);
                      setShowThemePicker(false);
                      setShowMenu(false);
                    }}
                  className={cx(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition',
                    isActive
                      ? 'border-neutral-950 bg-transparent text-neutral-950'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.18em]">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Theme</p>
                <p className="text-sm text-neutral-600">Keep the picker collapsed until you want to switch modes.</p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                <button
                  type="button"
                  onClick={() => setShowThemePicker((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 border border-neutral-200 bg-white px-3 py-3 text-left transition hover:border-neutral-950"
                  aria-expanded={showThemePicker}
                  aria-haspopup="listbox"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      Current theme
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-neutral-950">
                      {THEME_OPTIONS.find((option) => option.value === theme)?.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 flex-none rounded-full border"
                      style={{
                        backgroundColor: THEME_OPTIONS.find((option) => option.value === theme)?.preview.accent,
                        borderColor: THEME_OPTIONS.find((option) => option.value === theme)?.preview.text,
                      }}
                    />
                    <ChevronDown size={14} className={cx('transition', showThemePicker ? 'rotate-180' : '')} />
                  </span>
                </button>
                {showThemePicker ? (
                  <div
                    role="listbox"
                    className="mt-2 max-h-64 overflow-y-auto border border-neutral-200 bg-white p-2"
                  >
                    <div className="space-y-1">
                      {THEME_OPTIONS.map((option) => {
                        const isActive = theme === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setTheme(option.value);
                              setShowThemePicker(false);
                            }}
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
                              <span
                                aria-hidden="true"
                                className="h-2.5 w-2.5 flex-none rounded-full border"
                                style={{ backgroundColor: option.preview.accent, borderColor: option.preview.text }}
                              />
                              {isActive ? <Check size={14} className="text-neutral-950" /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <p className="mt-2 text-xs leading-5 text-neutral-600">
                  {THEME_OPTIONS.find((option) => option.value === theme)?.description}
                </p>
              </div>
            </div>

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
          <p className="text-sm leading-6 text-neutral-600">
            Checking your session, theme, and household workspace.
          </p>
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
