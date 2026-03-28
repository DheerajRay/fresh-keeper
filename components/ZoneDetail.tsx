import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ZoneData } from '../types';
import { Panel, cx } from './ui';

interface ZoneDetailProps {
  data: ZoneData;
}

const ZoneDetail: React.FC<ZoneDetailProps> = ({ data }) => {
  const [openSection, setOpenSection] = useState<'bestFor' | 'tips'>('bestFor');

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-neutral-200 px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
            Risk {data.spoilageRisk}
          </span>
          <span className="text-sm text-neutral-500">{data.temperature}</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{data.name}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{data.description}</p>
      </div>

      <div className="p-3">
        {[
          ['bestFor', 'What belongs here?', data.bestFor],
          ['tips', 'Storage notes', data.tips],
        ].map(([key, label, values], index) => {
          const sectionKey = key as 'bestFor' | 'tips';
          const isOpen = openSection === sectionKey;
          return (
            <div key={sectionKey} className="border-b border-neutral-200 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenSection(sectionKey)}
                className="flex w-full items-center justify-between px-3 py-4 text-left"
              >
                <span className="text-sm font-semibold text-neutral-900">{label}</span>
                <ChevronDown
                  size={18}
                  className={cx('text-neutral-500 transition', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen ? (
                <div className="space-y-2 px-3 pb-4">
                  {(values as string[]).map((value) => (
                    <div
                      key={value}
                      className="border-l border-neutral-300 pl-3 text-sm leading-6 text-neutral-700"
                    >
                      {value}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

export default ZoneDetail;
