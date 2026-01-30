import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LogStreamProps {
  logs: LogEntry[];
}

export const LogStream: React.FC<LogStreamProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-lg p-2 h-full overflow-hidden flex flex-col font-mono text-xs relative">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,6px_100%] opacity-20"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2 px-2 shrink-0 z-10 bg-slate-950">
        <span className="uppercase tracking-widest font-bold text-[10px] text-slate-500 flex items-center gap-2">
            <Terminal size={12} />
            Veritas Kernel Events
        </span>
        <div className="flex gap-2 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-500 font-bold tracking-wider">LIVE_FEED</span>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 z-10">
        {logs.length === 0 && (
            <div className="text-slate-700 italic pt-4 text-center">Waiting for Ingestion Stream...</div>
        )}
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200 hover:bg-slate-900/50 p-0.5 rounded">
            <span className="text-slate-600 shrink-0 font-mono select-none w-16">
              {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            <span className={`break-words flex-1 ${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'warning' ? 'text-amber-400' :
              log.type === 'veritas' ? 'text-cyan-400' :
              log.type === 'citadel' ? 'text-purple-400' :
              log.type === 'thinking' ? 'text-slate-400 italic' :
              'text-slate-300'
            }`}>
              {log.type === 'veritas' && <span className="font-bold mr-1">[AUDIT_LOCK]</span>}
              {log.type === 'citadel' && <span className="font-bold mr-1">[ENCLAVE]</span>}
              {log.type === 'thinking' && <span className="mr-1 opacity-50">{'>'}</span>}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};