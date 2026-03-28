import React, { useMemo, useState } from 'react';
import { BookOpen, ChefHat, Grid2X2, Menu, Refrigerator, ShoppingCart } from 'lucide-react';
import FridgeVisual from './components/FridgeVisual';
import GuideAiSearch from './components/GuideAiSearch';
import InventoryManager from './components/InventoryManager';
import MealPlanner from './components/MealPlanner';
import ShoppingListManager from './components/ShoppingListManager';
import SpoilageSection from './components/SpoilageSection';
import ZoneDetail from './components/ZoneDetail';
import { FRIDGE_ZONES } from './constants';
import { ZoneId } from './types';
import {
  EmptyState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SurfaceSheet,
  cx,
} from './components/ui';

type AppView = 'inventory' | 'meals' | 'shopping' | 'guide';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('inventory');
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [showGuideMap, setShowGuideMap] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-2.5 text-white">
              <Grid2X2 size={18} />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">FreshKeeper</p>
              <p className="hidden text-xs uppercase tracking-[0.2em] text-neutral-500 sm:block">
                kitchen operating system
              </p>
            </div>
          </div>

          <nav className="hidden rounded-2xl border border-neutral-200 bg-neutral-100 p-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setCurrentView(item.view)}
                  className={cx(
                    'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition',
                    isActive ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950',
                  )}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="md:hidden">
            <button
              type="button"
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2 text-neutral-700"
              aria-label="Navigation menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-6 md:pb-12 md:pt-8">
        {currentView === 'inventory' ? <InventoryManager /> : null}
        {currentView === 'meals' ? <MealPlanner /> : null}
        {currentView === 'shopping' ? <ShoppingListManager /> : null}
        {currentView === 'guide' ? (
          <div className="space-y-8">
            <PageHeader
              eyebrow="Reference"
              title="Guide and storage tips"
              description="Search storage guidance, review zone rules, and use the fridge map only when you need a visual check."
              action={
                <SecondaryButton type="button" onClick={() => setShowGuideMap(true)}>
                  Open storage map
                </SecondaryButton>
              }
            />

            <GuideAiSearch />

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
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
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400',
                      )}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{zone.name}</span>
                        <span
                          className={cx(
                            'mt-1 block text-xs',
                            selectedZone === zone.id ? 'text-neutral-300' : 'text-neutral-500',
                          )}
                        >
                          {zone.temperature}
                        </span>
                      </span>
                      <span
                        className={cx(
                          'text-[11px] uppercase tracking-[0.16em]',
                          selectedZone === zone.id ? 'text-neutral-400' : 'text-neutral-400',
                        )}
                      >
                        {zone.spoilageRisk}
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>

              <div className="space-y-6">
                <ZoneDetail data={FRIDGE_ZONES[selectedZone]} />

                <details className="rounded-3xl border border-neutral-200 bg-white p-4 md:hidden">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-950">
                    View storage map
                  </summary>
                  <div className="mt-4">
                    <FridgeVisual selectedZone={selectedZone} onZoneSelect={setSelectedZone} />
                  </div>
                </details>

                <div className="hidden md:block">
                  <Panel className="p-5">
                    <SectionHeader
                      title="Optional visual map"
                      description="Use the map if you want a quick mental model of cold versus dry storage."
                    />
                    <div className="mt-5">
                      <FridgeVisual selectedZone={selectedZone} onZoneSelect={setSelectedZone} />
                    </div>
                  </Panel>
                </div>
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

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-600 md:px-6">
          FreshKeeper keeps inventory, meal planning, shopping, and storage guidance in one local workflow.
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 px-2 py-2 backdrop-blur md:hidden">
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
                  'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition',
                  isActive ? 'bg-neutral-950 text-white' : 'text-neutral-500',
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
        open={showGuideMap}
        onClose={() => setShowGuideMap(false)}
        title="Storage map"
        description="Use the map for orientation only. The zone list remains the primary reference."
      >
        <FridgeVisual selectedZone={selectedZone} onZoneSelect={setSelectedZone} />
      </SurfaceSheet>
    </div>
  );
};

export default App;
