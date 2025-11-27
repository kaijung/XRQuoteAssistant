import React from 'react';
import { Transcript, SpeakerType } from '../types';

interface TranscriptItemProps {
  item: Transcript;
}

export const TranscriptItem: React.FC<TranscriptItemProps> = ({ item }) => {
  const isUser = item.speaker === SpeakerType.USER;
  
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-sm border ${
          isUser 
            ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-100 rounded-br-none' 
            : 'bg-slate-800/60 border-slate-700/50 text-slate-200 rounded-bl-none'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider ${isUser ? 'text-indigo-400' : 'text-cyan-400'}`}>
            {isUser ? 'You' : 'Nova (AI)'}
          </span>
          <span className="text-xs text-slate-500">
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="leading-relaxed text-sm md:text-base">
          {item.text}
        </p>
      </div>
    </div>
  );
};
