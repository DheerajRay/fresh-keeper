import React, { useState } from 'react';
import FridgeVisual from './components/FridgeVisual';
import ZoneDetail from './components/ZoneDetail';
import SpoilageSection from './components/SpoilageSection';
import GeminiSearch from './components/GeminiSearch';
import InventoryManager from './components/InventoryManager';
import ShoppingListManager from './components/ShoppingListManager';
import MealPlanner from './components/MealPlanner';
import { FRIDGE_ZONES } from './constants';
import { ZoneId } from './types';
import { Snowflake, BookOpen, Refrigerator, X, Info, ShoppingCart, ChefHat } from 'lucide-react';

const App: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<ZoneId>(ZoneId.LOWER_SHELVES);
  const [currentView, setCurrentView] = useState<'guide' | 'inventory' | 'shopping' | 'meals'>('inventory');
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const handleZoneSelect = (zone: ZoneId) => {
    setSelectedZone(zone);
    setShowMobileDetail(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Snowflake size={24} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">FreshKeeper</span>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setCurrentView('inventory')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentView === 'inventory' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                My Fridge
              </button>
              <button 
                onClick={() => setCurrentView('meals')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentView === 'meals' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Meal Plan
              </button>
              <button 
                onClick={() => setCurrentView('shopping')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentView === 'shopping' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Shopping List
              </button>
              <button 
                onClick={() => setCurrentView('guide')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  currentView === 'guide' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Guide & Tips
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Mobile View Switcher */}
        <div className="md:hidden flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 mb-6 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setCurrentView('inventory')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentView === 'inventory' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <Refrigerator size={16} />
              Fridge
            </button>
            <button 
              onClick={() => setCurrentView('meals')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentView === 'meals' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <ChefHat size={16} />
              Meals
            </button>
            <button 
              onClick={() => setCurrentView('shopping')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentView === 'shopping' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <ShoppingCart size={16} />
              Shop
            </button>
            <button 
              onClick={() => setCurrentView('guide')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                currentView === 'guide' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
              }`}
            >
              <BookOpen size={16} />
              Guide
            </button>
        </div>

        {currentView === 'guide' && (
          <div className="space-y-16 animate-fade-in">
             {/* Intro */}
            <section className="text-center max-w-2xl mx-auto space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                Master Your Fridge,<br />
                <span className="text-blue-600">Stop the Spoilage.</span>
              </h1>
              <p className="text-base md:text-lg text-slate-600">
                Improper storage accelerates bacterial growth. 
                Use this guide to keep food fresh, safe, and delicious.
              </p>
            </section>

            <GeminiSearch />

            <section id="visual-guide" className="scroll-mt-24">
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Interactive Fridge Map</h2>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 xl:col-span-4 sticky top-24 z-10">
                  <FridgeVisual 
                    selectedZone={selectedZone} 
                    onZoneSelect={handleZoneSelect} 
                  />
                </div>
                <section className="hidden lg:block lg:col-span-7 xl:col-span-8">
                  <ZoneDetail data={FRIDGE_ZONES[selectedZone]} />
                </section>
              </div>
            </section>

            {showMobileDetail && (
              <div 
                className="lg:hidden fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowMobileDetail(false);
                }}
              >
                <div className="w-full max-w-md relative animate-scale-in">
                   <button 
                     onClick={() => setShowMobileDetail(false)}
                     className="absolute -top-3 -right-3 z-20 p-2 bg-white rounded-full shadow-md text-slate-500 hover:text-red-500 transition-colors border border-slate-100"
                   >
                     <X size={20} />
                   </button>
                   <div className="max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl custom-scrollbar">
                      <ZoneDetail data={FRIDGE_ZONES[selectedZone]} />
                   </div>
                </div>
              </div>
            )}

            <section id="spoilage-facts" className="scroll-mt-24">
               <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl font-bold text-slate-800">The Science of Spoilage</h2>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              <SpoilageSection />
            </section>
          </div>
        )}
        
        {currentView === 'inventory' && (
          <div className="max-w-2xl mx-auto">
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">My Fridge Inventory</h1>
                <p className="text-slate-500 mt-2">Track your groceries and let AI estimate expiration dates.</p>
             </div>
             <InventoryManager />
          </div>
        )}

        {currentView === 'meals' && (
          <div className="max-w-4xl mx-auto">
             <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Smart Meal Prep Planner</h1>
                <p className="text-slate-500 mt-2">AI-curated recipes prioritizing ingredients expiring soon.</p>
             </div>
             <MealPlanner />
          </div>
        )}

        {currentView === 'shopping' && (
           <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Smart Shopping List</h1>
                <p className="text-slate-500 mt-2">Restock what you've used and discover what you're missing.</p>
             </div>
             <ShoppingListManager />
           </div>
        )}

      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-4 text-slate-300 font-medium">FreshKeeper &copy; {new Date().getFullYear()}</p>
          <p className="text-sm max-w-xl mx-auto opacity-70 leading-relaxed">
            Keep your kitchen organized by tracking items in the <strong>My Fridge</strong> tab. 
            When you remove items, they populate suggestions in the <strong>Shopping List</strong> tab. 
            Use the <strong>Guide & Tips</strong> tab to learn the best storage practices for longevity.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
