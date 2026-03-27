import React, { useState } from 'react';
import { ZoneData } from '../types';
import { ChevronDown, ChevronUp, Info, Thermometer, AlertCircle } from 'lucide-react';

interface ZoneDetailProps {
  data: ZoneData;
}

const ZoneDetail: React.FC<ZoneDetailProps> = ({ data }) => {
  const [openSection, setOpenSection] = useState<string>('bestFor');

  const toggleSection = (section: string) => {
    // If clicking the active section, keep it open (tab behavior) rather than collapsing it.
    if (openSection !== section) {
      setOpenSection(section);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col">
      <div className="p-6 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
              ${data.spoilageRisk === 'High' ? 'bg-red-100 text-red-700' : 
                data.spoilageRisk === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-green-100 text-green-700'}`}>
              Risk: {data.spoilageRisk}
            </span>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Thermometer size={14} />
              <span>{data.temperature}</span>
            </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-800">{data.name}</h2>
        <p className="text-slate-600 mt-2">{data.description}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Accordion Item: What Goes Here */}
        <div className={`border rounded-lg overflow-hidden transition-colors ${openSection === 'bestFor' ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}>
          <button 
            onClick={() => toggleSection('bestFor')}
            className={`w-full flex items-center justify-between p-4 transition-colors ${openSection === 'bestFor' ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <Info size={18} className="text-blue-500" />
              <span>What Goes Here?</span>
            </div>
            {openSection === 'bestFor' ? <ChevronUp size={18} className="text-blue-500" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
          
          {openSection === 'bestFor' && (
            <div className="p-4 bg-white border-t border-blue-100">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.bestFor.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded shadow-sm border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></div>
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Accordion Item: Critical Tips */}
        <div className={`border rounded-lg overflow-hidden transition-colors ${openSection === 'tips' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'}`}>
          <button 
            onClick={() => toggleSection('tips')}
            className={`w-full flex items-center justify-between p-4 transition-colors ${openSection === 'tips' ? 'bg-amber-50/50' : 'bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <AlertCircle size={18} className="text-amber-500" />
              <span>Safety & Spoilage Tips</span>
            </div>
            {openSection === 'tips' ? <ChevronUp size={18} className="text-amber-500" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
          
          {openSection === 'tips' && (
            <div className="p-4 bg-white border-t border-amber-100">
              <ul className="space-y-3">
                {data.tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-slate-700">
                    <span className="font-bold text-amber-500 shrink-0">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneDetail;