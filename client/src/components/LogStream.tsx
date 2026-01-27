import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogStreamProps {
  logs: LogEntry[];
}

export const LogStream: React.FC<LogStreamProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-foundlab-dark-card border border-foundlab-dark-border rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs shadow-inner">
      <div className="sticky top-0 bg-foundlab-dark-card pb-2 border-b border-foundlab-dark-border mb-2 flex justify-between items-center text-gray-400">
        <span className="uppercase tracking-widest font-bold text-[10px]">Veritas Protocol Events</span>
        <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px]">LIVE</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {logs.length === 0 && (
            <div className="text-gray-600 italic">Waiting for Ingestion (API Gateway)...</div>
        )}
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <span className="text-gray-600 shrink-0">
              [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]
            </span>
            <span className={`break-words ${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              log.type === 'veritas' ? 'text-blue-400 font-bold' :
              log.type === 'citadel' ? 'text-purple-400 font-bold' :
              log.type === 'thinking' ? 'text-foundlab-400 italic' :
              'text-gray-300'
            }`}>
              {log.type === 'thinking' && <span className="mr-2">🧠</span>}
              {log.type === 'veritas' && <span className="mr-2">🔒</span>}
              {log.type === 'citadel' && <span className="mr-2">🛡️</span>}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};