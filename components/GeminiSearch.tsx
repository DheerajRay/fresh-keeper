import React, { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { askFridgeAI } from '../services/openai';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

const GeminiSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ChatMessage | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    const answer = await askFridgeAI(query);
    
    setResult({
      role: 'model',
      text: answer
    });
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-lg text-white">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="text-yellow-300" />
          Ask the FreshKeeper AI
        </h3>
        <p className="text-blue-100 mb-4 text-sm">
          Not sure where something goes? Ask specific questions like "Where do I put avocados?" or "How long does cooked chicken last?"
        </p>
        
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'How to store fresh basil?'"
            className="w-full py-3 px-5 pr-12 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-inner"
          />
          <button 
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 rounded-lg transition-colors text-white"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </form>

        {result && (
          <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 animate-fade-in">
             <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{result.text}</ReactMarkdown>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiSearch;
