
import React, { useState } from 'react';
import { analyzePaperContent } from '../services/geminiService.ts';

interface AssistantProps {
  onClose?: () => void;
}

const Assistant: React.FC<AssistantProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleSend = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');

    try {
      const res = await analyzePaperContent(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: res || "I am an AI assistant who can only help you with research papers and their formats. Other information is not in my memory." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Please ask about research paper formats." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl">
      <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-sparkles text-sm"></i>
          </div>
          <h3 className="font-bold text-slate-800 text-sm md:text-base">AI Expert</h3>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <i className="fa-solid fa-circle-xmark text-lg"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-400 px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-message-sparkles text-2xl opacity-20"></i>
            </div>
            <p className="text-sm font-medium text-slate-600">How can I help you with your research paper today?</p>
            <p className="text-[11px] mt-2 leading-relaxed">I am specialized in IEEE standards and academic paper formatting.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
              <div className="whitespace-pre-wrap leading-relaxed overflow-hidden break-words">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-400 flex items-center gap-2 animate-pulse">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Thinking</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm sticky bottom-0">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Ask about research papers..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            disabled={loading}
            onClick={handleSend}
            className="bg-blue-600 text-white w-12 h-12 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100 flex items-center justify-center shrink-0"
          >
            <i className="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
