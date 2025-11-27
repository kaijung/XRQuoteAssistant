import React, { useState, useEffect, useRef } from 'react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { AudioVisualizer } from './components/AudioVisualizer';
import { TranscriptItem } from './components/TranscriptItem';
import { Transcript } from './types';

export default function App() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleTranscriptUpdate = (newTranscript: Transcript) => {
    setTranscripts(prev => [...prev, newTranscript]);
  };

  const { connect, disconnect, isConnected, isConnecting, error, analyser } = useLiveAPI({
    onTranscriptUpdate: handleTranscriptUpdate
  });

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-cyan-500/30">
      
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 flex flex-col h-screen relative z-10">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
                XR Quote Assistant
              </h1>
              <p className="text-xs text-slate-400">Powered by Gemini Live</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`flex h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-600'}`}>
              {isConnected && <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>}
            </span>
            <span className="text-sm font-medium text-slate-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Visualizer Area */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl relative mb-6 shrink-0 transition-all duration-500">
           <AudioVisualizer analyser={analyser} isConnected={isConnected} />
           
           {/* Control Button Overlay */}
           <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30">
              {!isConnected ? (
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="group relative px-8 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-full font-semibold transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center gap-2"
                >
                  {isConnecting ? (
                     <>
                       <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Connecting...
                     </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      Start Conversation
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded-full font-semibold transition-all flex items-center gap-2 backdrop-blur-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                  End Session
                </button>
              )}
           </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-start gap-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
             {error}
          </div>
        )}

        {/* Transcription Log */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-inner">
           <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/30">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Conversation Log</h2>
              {transcripts.length > 0 && (
                <button 
                  onClick={() => setTranscripts([])}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear History
                </button>
              )}
           </div>
           
           <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 scroll-smooth"
           >
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-center max-w-xs">
                    Start a session to discuss your XR project with Nova.
                  </p>
                </div>
              ) : (
                transcripts.map((t) => (
                  <TranscriptItem key={t.id} item={t} />
                ))
              )}
           </div>
        </div>
        
      </div>
    </div>
  );
}