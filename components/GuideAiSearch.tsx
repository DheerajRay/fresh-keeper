import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, Search } from 'lucide-react';
import { askFridgeAI } from '../services/openai';
import { Panel, PrimaryButton, SectionHeader, SecondaryButton } from './ui';

const GuideAiSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [expanded, setExpanded] = useState(false);

  const canCollapse = useMemo(() => answer.length > 260, [answer]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setExpanded(false);
    const result = await askFridgeAI(query);
    setAnswer(result);
    setIsLoading(false);
  };

  return (
    <Panel className="p-4 md:p-5">
      <SectionHeader
        title="Ask storage guidance"
        description="Use the guide like a handbook. Ask one food-storage or shelf-life question at a time."
      />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Question
          </span>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. How should I store fresh basil?"
              className="min-h-[52px] flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-950"
            />
            <PrimaryButton type="submit" disabled={isLoading || !query.trim()} aria-label="Ask FreshKeeper AI">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              {isLoading ? 'Checking' : 'Ask'}
            </PrimaryButton>
          </div>
        </label>
      </form>

      {answer ? (
        <div className="mt-4 border-t border-neutral-200 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Answer</p>
          <div className={canCollapse && !expanded ? 'max-h-40 overflow-hidden' : ''}>
            <div className="prose prose-neutral mt-3 max-w-none text-sm leading-6">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </div>
          {canCollapse ? (
            <div className="mt-3">
              <SecondaryButton
                type="button"
                onClick={() => setExpanded((current) => !current)}
                aria-expanded={expanded}
              >
                {expanded ? 'Show less' : 'Show more'}
              </SecondaryButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
};

export default GuideAiSearch;
