import React, { useState, useRef } from 'react';
import { searchGroundingQuery, analyzePaperContent, generatePaperFigure, analyzeUploadedImage } from '../services/geminiService.ts';

interface AssistantProps {
  onClose?: () => void;
}

const Assistant: React.FC<AssistantProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>([]);
  const [mode, setMode] = useState<'chat' | 'search' | 'image' | 'analyze'>('chat');
  const [imgSize, setImgSize] = useState<"1K" | "2K" | "4K">("1K");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!query.trim() && mode !== 'analyze') return;
    setLoading(true);
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');

    try {
      let response;
      if (mode === 'search') {
        const res = await searchGroundingQuery(userMsg);
        response = { content: res.text, sources: res.sources };
      } else if (mode === 'image') {
        const res = await generatePaperFigure(userMsg, imgSize);
        response = { content: `Generated Image:\n![Generated Figure](${res})` };
      } else {
        const res = await analyzePaperContent(userMsg);
        response = { content: res || "I couldn't generate a response." };
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response.content, sources: response.sources }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + (error as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: `Analyzing graph: ${file.name}` }]);
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await analyzeUploadedImage(base64, file.type);
        setMessages(prev => [...prev, { role: 'assistant', content: res || "Analysis failed" }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Error processing image" }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
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
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setMode('chat')} 
            className={`p-2 rounded-lg transition-all ${mode === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Chat"
          >
            <i className="fa-solid fa-brain text-xs"></i>
          </button>
          <button 
            onClick={() => setMode('search')} 
            className={`p-2 rounded-lg transition-all ${mode === 'search' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Search"
          >
            <i className="fa-solid fa-earth-americas text-xs"></i>
          </button>
          <button 
            onClick={() => setMode('image')} 
            className={`p-2 rounded-lg transition-all ${mode === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
            title="Generate Fig"
          >
            <i className="fa-solid fa-image text-xs"></i>
          </button>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 ml-2 text-slate-400 hover:text-red-500 transition-colors"
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
            <p className="text-sm font-medium text-slate-600">How can I assist your IEEE publication today?</p>
            <p className="text-[11px] mt-2 leading-relaxed">I can explain standards, search trends, or analyze scientific figures.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-2xl shadow-sm text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
              <div className="whitespace-pre-wrap leading-relaxed overflow-hidden break-words">
                {m.content.includes('![Generated Figure]') ? (
                   <div className="space-y-3">
                     <p className="font-bold text-xs uppercase opacity-70">Scientific Asset Generated:</p>
                     <img src={m.content.match(/\((.*?)\)/)?.[1]} className="rounded-lg max-w-full shadow-md border border-slate-200" alt="Scientific Figure" />
                   </div>
                ) : m.content}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Grounding Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((s, si) => (
                      <a key={si} href={s.web?.uri} target="_blank" rel="noreferrer" className="text-[9px] bg-white px-2 py-1 rounded-md border border-slate-200 text-blue-600 font-bold hover:border-blue-300 transition-all truncate max-w-[140px]">
                        {s.web?.title || 'External source'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
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
        <div className="flex items-center gap-2 mb-3 px-1">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-10 h-10 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            title="Upload Figure"
          >
            <i className="fa-solid fa-paperclip text-sm"></i>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          
          {mode === 'image' && (
            <div className="flex items-center gap-1.5 ml-auto">
              {(['1K', '2K', '4K'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setImgSize(s)}
                  className={`text-[9px] px-2.5 py-1.5 rounded-lg border font-black transition-all ${imgSize === s ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder={mode === 'image' ? 'Describe visual...' : mode === 'search' ? 'Current trends...' : 'Ask AI Expert...'}
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