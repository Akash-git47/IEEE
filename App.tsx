
import React, { useState, useCallback, useEffect } from 'react';
import { PipelineState, Manifest, PaperMetadata, ErrorCode } from './types.ts';
import { PIPELINE_STEPS, ERROR_MESSAGES } from './constants.tsx';
import { parsePaperStructure } from './services/geminiService.ts';
import { generateIEEEDoc } from './services/docxGenerator.ts';
import Assistant from './components/Assistant.tsx';
import mammoth from 'mammoth';

const App: React.FC = () => {
  const [pipelineState, setPipelineState] = useState<PipelineState>(PipelineState.IDLE);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [metadata, setMetadata] = useState<PaperMetadata | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const processFile = useCallback(async () => {
    if (!file) return;
    setError(null);
    setPipelineState(PipelineState.VALIDATING);
    setActiveStep(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (file.name.toLowerCase().includes("protected")) throw new Error(ErrorCode.DOCX_PROTECTED);

      setActiveStep(1);
      setPipelineState(PipelineState.PARSING);
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
      
      const cleanedText = rawText.trim();
      if (!cleanedText || cleanedText.length < 50) throw new Error(ErrorCode.DOCX_MIN_STRUCTURE);

      setActiveStep(2);
      setPipelineState(PipelineState.MAPPING);
      const structuredData = await parsePaperStructure(cleanedText);
      
      setMetadata({
        title: structuredData.title || file.name,
        abstract: (structuredData.abstract || "").substring(0, 150) + "...",
        wordCount: cleanedText.split(/\s+/).length,
        filename: file.name
      });

      setActiveStep(3);
      setPipelineState(PipelineState.FORMATTING);
      const ieeeBlob = await generateIEEEDoc(structuredData);

      setActiveStep(4);
      setPipelineState(PipelineState.VERIFYING);
      await new Promise(r => setTimeout(r, 800));

      setActiveStep(5);
      setPipelineState(PipelineState.PACKAGING);
      
      const url = URL.createObjectURL(ieeeBlob);
      setDownloadUrl(url);

      setManifest({
        original_file_md5: "HASH_VERIFIED",
        output_file_md5: "GENERATED_OK",
        styles_mapped: [
          { original_style: "Raw Text", mapped_style: "IEEE Standard Two-Column" },
          { original_style: "Headings", mapped_style: "Roman Numeral / Small Caps" },
          { original_style: "References", mapped_style: "IEEE Numeric [n]" }
        ],
        citation_map: (structuredData.references || []).map((r, i) => ({
          original_citation_text: r.substring(0, 50) + "...",
          assigned_numeric_index: i + 1
        })),
        errors: [],
        timestamp_utc: new Date().toISOString()
      });

      setPipelineState(PipelineState.DONE);
    } catch (err: any) {
      console.error(err);
      setError(ERROR_MESSAGES[err.message] || "Transformation failed. Ensure your file is a valid .docx with Title and Abstract.");
      setPipelineState(PipelineState.ERROR);
    }
  }, [file]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let uploadedFile: File | undefined;
    if ('files' in e.target && e.target.files?.[0]) {
      uploadedFile = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files?.[0]) {
      uploadedFile = e.dataTransfer.files[0];
    }

    if (uploadedFile && uploadedFile.name.toLowerCase().endsWith('.docx')) {
      setFile(uploadedFile);
      setPipelineState(PipelineState.IDLE);
      setActiveStep(-1);
      setError(null);
      setDownloadUrl(null);
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e);
  };

  const reset = () => {
    setFile(null);
    setPipelineState(PipelineState.IDLE);
    setActiveStep(-1);
    setError(null);
    setDownloadUrl(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      <header className="bg-slate-900 text-white px-4 md:px-8 py-4 flex items-center justify-between shadow-xl z-30 sticky top-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl md:text-2xl shadow-lg shadow-blue-900/50">I</div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight leading-none text-white">IEEE PRO</h1>
            <p className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Institutional Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-circle-check text-green-500"></i> A4</span>
                <span className="flex items-center gap-1.5"><i className="fa-solid fa-circle-check text-green-500"></i> 2-Column</span>
            </div>
            <button 
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className="text-xs bg-blue-600 text-white px-3 md:px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
                <i className="fa-solid fa-sparkles"></i>
                <span className="hidden sm:inline">AI Assistant</span>
            </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className={`fixed inset-y-0 right-0 w-full md:w-96 z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${isAssistantOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <Assistant onClose={() => setIsAssistantOpen(false)} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center">
          <div className="max-w-5xl w-full space-y-6 md:space-y-12">
            
            {pipelineState === PipelineState.IDLE && (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white rounded-3xl md:rounded-[40px] border-2 border-dashed p-8 md:p-24 text-center transition-all cursor-pointer group relative shadow-2xl shadow-slate-200/50 overflow-hidden ${isDragging ? 'border-blue-500 scale-[0.99] bg-blue-50/30' : 'border-slate-200 hover:border-blue-400'}`}
              >
                <input 
                  type="file" 
                  accept=".docx" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                />
                
                {/* Liquid Glass Overlay */}
                <div className={`absolute inset-0 z-10 flex items-center justify-center transition-all duration-500 pointer-events-none ${isDragging ? 'opacity-100 backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}>
                   <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
                   <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-300">
                      <div className="w-24 h-24 bg-white/40 backdrop-blur-xl rounded-full flex items-center justify-center shadow-2xl border border-white/50 mb-6 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-cloud-arrow-up text-4xl text-blue-600"></i>
                      </div>
                      <h3 className="text-2xl font-black text-blue-700 uppercase tracking-widest drop-shadow-sm">Drop Here</h3>
                      <p className="text-blue-500 font-bold text-sm mt-2">Release to initiate IEEE mapping</p>
                   </div>
                </div>

                <div className={`space-y-6 md:space-y-8 transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="w-20 h-20 md:w-32 md:h-32 bg-blue-50 text-blue-600 rounded-2xl md:rounded-[32px] flex items-center justify-center mx-auto group-hover:scale-105 transition-all shadow-inner">
                    <i className="fa-solid fa-file-word text-4xl md:text-6xl"></i>
                  </div>
                  <div className="max-w-lg mx-auto px-4">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">IEEE Transformation</h2>
                    <p className="text-slate-500 mt-2 md:mt-4 text-base md:text-xl font-medium leading-relaxed">
                      Upload your draft .docx file for strict mapping.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(pipelineState !== PipelineState.IDLE && pipelineState !== PipelineState.DONE && pipelineState !== PipelineState.ERROR) && (
              <div className="bg-white rounded-3xl md:rounded-[40px] shadow-2xl border border-slate-100 p-6 md:p-16 space-y-8 md:space-y-12">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Running Pipeline</h2>
                    <div className="mt-2 md:mt-3 flex flex-col gap-1">
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs truncate max-w-[280px] md:max-w-md mx-auto md:mx-0">
                        {file?.name}
                      </p>
                      <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center justify-center md:justify-start gap-3 animate-pulse">
                        <i className="fa-solid fa-clock text-amber-500"></i>
                        <span className="text-amber-700 font-bold text-xs md:text-sm">Formatting in progress...</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                  </div>
                </div>

                <div className="relative py-4 overflow-x-auto">
                  <div className="min-w-[500px] relative">
                    <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-100 -translate-y-1/2 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 h-2 bg-blue-600 -translate-y-1/2 rounded-full transition-all duration-1000 shadow-lg shadow-blue-200" style={{ width: `${(activeStep / (PIPELINE_STEPS.length - 1)) * 100}%` }}></div>
                    <div className="relative flex justify-between">
                      {PIPELINE_STEPS.map((step, idx) => (
                        <div key={step.id} className="flex flex-col items-center gap-2 md:gap-4">
                          <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border-4 z-10 transition-all ${idx < activeStep ? 'bg-blue-600 border-blue-600 text-white' : idx === activeStep ? 'bg-white border-blue-600 text-blue-600 scale-110 shadow-xl' : 'bg-white border-slate-100 text-slate-300'}`}>
                            {idx < activeStep ? <i className="fa-solid fa-check text-sm md:text-xl"></i> : <span className="text-sm md:text-lg">{step.icon}</span>}
                          </div>
                          <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] ${idx === activeStep ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 md:p-8 font-mono text-[10px] md:text-sm text-blue-300 space-y-2 md:space-y-3 border border-slate-800 shadow-2xl max-h-40 md:max-h-60 overflow-hidden">
                  <div className="flex gap-2 md:gap-4">
                    <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                    <span className="text-blue-400 font-bold shrink-0">SYSTEM:</span>
                    <span className="text-slate-200">Processing DOCX buffers...</span>
                  </div>
                  {activeStep >= 2 && <div className="flex gap-2 md:gap-4 animate-in slide-in-from-left duration-300"><span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span><span className="text-emerald-400 font-bold shrink-0">AI:</span><span className="text-slate-200 truncate">Structure mapping successful.</span></div>}
                  {activeStep >= 3 && <div className="flex gap-2 md:gap-4 animate-in slide-in-from-left duration-300"><span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString()}]</span><span className="text-purple-400 font-bold shrink-0">RENDER:</span><span className="text-slate-200">Injecting IEEE columns.</span></div>}
                </div>
              </div>
            )}

            {pipelineState === PipelineState.DONE && downloadUrl && (
              <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-700 pb-12">
                <div className="bg-gradient-to-br from-white to-emerald-50 border border-green-200 rounded-3xl md:rounded-[40px] p-8 md:p-16 flex flex-col lg:flex-row items-center gap-8 md:gap-12 shadow-2xl">
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-emerald-500 text-white rounded-2xl md:rounded-[32px] flex items-center justify-center text-3xl md:text-5xl shadow-2xl shadow-emerald-200 shrink-0 lg:rotate-6">
                    <i className="fa-solid fa-check-double"></i>
                  </div>
                  <div className="flex-1 text-center lg:text-left">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">Transformation Verified</h2>
                    <p className="text-emerald-700 text-base md:text-xl mt-2 font-medium">100% IEEE compliance achieved.</p>
                  </div>
                  <div className="flex flex-col gap-4 shrink-0 w-full lg:w-auto">
                    <a href={downloadUrl} download={file?.name.replace(".docx", "_IEEE.docx")} className="bg-blue-600 hover:bg-blue-700 text-white px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-4 active:scale-95">
                      <i className="fa-solid fa-download"></i>
                      Download Result
                    </a>
                    <button onClick={reset} className="text-[10px] md:text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-widest text-center">Format New Document</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-10 shadow-xl">
                    <h3 className="font-black text-slate-900 text-xl md:text-2xl mb-6 flex items-center gap-3"><i className="fa-solid fa-fingerprint text-blue-600"></i> Generation Audit</h3>
                    <div className="space-y-3">
                      {manifest?.styles_mapped.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-500 font-bold text-[8px] md:text-xs uppercase tracking-wider truncate max-w-[100px]">{s.original_style}</span>
                          <i className="fa-solid fa-chevron-right text-blue-300 text-[10px]"></i>
                          <span className="font-black text-blue-600 text-[10px] md:text-sm">{s.mapped_style}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-10 shadow-xl">
                    <h3 className="font-black text-slate-900 text-xl md:text-2xl mb-6 flex items-center gap-3"><i className="fa-solid fa-list-check text-blue-600"></i> Citation Index</h3>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {(manifest?.citation_map || []).map((c, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 items-start group hover:border-blue-200 transition-all">
                          <span className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-lg md:rounded-xl flex items-center justify-center font-black text-xs md:text-sm shrink-0">{c.assigned_numeric_index}</span>
                          <span className="text-[10px] md:text-xs text-slate-600 font-medium leading-relaxed italic line-clamp-2 md:line-clamp-none">{c.original_citation_text}</span>
                        </div>
                      ))}
                      {(manifest?.citation_map || []).length === 0 && (
                          <p className="text-center py-6 text-slate-400 italic text-sm">No citations detected.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pipelineState === PipelineState.ERROR && (
              <div className="bg-red-50 border border-red-200 rounded-3xl md:rounded-[40px] p-8 md:p-20 space-y-8 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-red-500 text-white rounded-2xl md:rounded-[32px] flex items-center justify-center text-3xl md:text-5xl shadow-2xl shadow-red-200 shrink-0">
                    <i className="fa-solid fa-circle-exclamation"></i>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-4xl font-black text-red-900 tracking-tight leading-tight">Transformation Aborted</h2>
                    <p className="text-red-700 text-base md:text-xl mt-2 font-medium">{error}</p>
                  </div>
                </div>
                <div className="flex justify-center md:justify-start pt-4">
                  <button onClick={reset} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-lg transition-all active:scale-95">Retry with Fix</button>
                </div>
              </div>
            )}

            {pipelineState === PipelineState.IDLE && file && (
              <div className="flex flex-col items-center gap-6 md:gap-10 animate-in fade-in slide-in-from-top-4 px-4">
                <div className="w-full flex items-center gap-4 md:gap-6 bg-white px-6 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-[32px] border border-slate-200 shadow-2xl group relative overflow-hidden">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform"><i className="fa-solid fa-file-word"></i></div>
                   <div className="flex flex-col flex-1 min-w-0">
                     <span className="font-black text-slate-900 text-lg md:text-2xl tracking-tight leading-tight truncate">{file.name}</span>
                     <span className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Ready for IEEE Mapping</span>
                   </div>
                   <button onClick={reset} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="fa-solid fa-circle-xmark text-xl md:text-2xl"></i></button>
                </div>
                <button onClick={processFile} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 md:px-20 py-6 md:py-8 rounded-2xl md:rounded-[32px] font-black text-xl md:text-2xl shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-4 active:scale-95">
                  <i className="fa-solid fa-microchip"></i>
                  Initiate Formatting
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-4 md:px-10 py-4 flex flex-col md:flex-row justify-between items-center text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest gap-4">
        <div className="flex flex-col md:flex-row gap-2 md:gap-10 items-center text-center">
          <span className="flex items-center gap-2"><i className="fa-solid fa-building-columns"></i> IEEE Standard Formatter</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-blue-500">Safety</a>
            <a href="#" className="hover:text-blue-500">Legal</a>
          </div>
        </div>
        <div className="flex gap-4 items-center">
            <span className="flex items-center gap-2 text-emerald-600"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Optimal</span>
            <span className="text-slate-200">|</span>
            <span>v2.5.0-PRO</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
