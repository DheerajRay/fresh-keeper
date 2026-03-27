import React from 'react';
import { SPOILAGE_GUIDE } from '../constants';

const SpoilageSection: React.FC = () => {
  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Vegetable Spoilage & Spore Defense</h2>
        <p className="text-slate-600 mt-2">
          Vegetables are living organisms even after harvest. They breathe, lose moisture, and can be attacked by microscopic enemies.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {SPOILAGE_GUIDE.map((item, index) => (
          <div key={index} className="flex gap-4 items-start p-4 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="p-3 bg-white rounded-lg shadow-sm text-blue-600">
              <item.icon size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-100">
        <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          Emergency Spoilage Signs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-semibold text-red-700 mb-1">Slimy Coating</h4>
            <p className="text-xs text-slate-600">A sign of bacterial growth. Common in bagged greens. Discard immediately.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-semibold text-red-700 mb-1">Visible Mold</h4>
            <p className="text-xs text-slate-600">Fuzzy spots. For soft veg (tomatoes, cucumbers), toss the whole thing. Roots go deep.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-semibold text-red-700 mb-1">Off Odor</h4>
            <p className="text-xs text-slate-600">If it smells sour or ammonia-like, spoilage bacteria are active. Do not taste test.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpoilageSection;
