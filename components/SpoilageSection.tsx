import React from 'react';
import { SPOILAGE_GUIDE } from '../constants';
import { Panel } from './ui';

const emergencySigns = [
  {
    title: 'Slimy coating',
    description: 'Often signals bacterial growth, especially on bagged greens or cut vegetables.',
  },
  {
    title: 'Visible mold',
    description: 'Soft produce should be discarded fully because mold spreads below the surface.',
  },
  {
    title: 'Sharp off odor',
    description: 'If it smells sour, fermented, or chemical, do not taste it to check.',
  },
];

const SpoilageSection: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {SPOILAGE_GUIDE.map((item) => (
          <Panel key={item.title} className="p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-700">
                <item.icon size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.content}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Discard immediately</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {emergencySigns.map((sign) => (
            <div key={sign.title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <h4 className="text-sm font-semibold text-neutral-950">{sign.title}</h4>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{sign.description}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default SpoilageSection;
