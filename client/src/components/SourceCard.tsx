import React from 'react';
import { Source } from '../types';

interface SourceCardProps {
  source: Source;
  index: number;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const scoreColor = (source.trustScore || 0) > 80 ? 'text-green-400 border-green-900 bg-green-950/20' : 
                     (source.trustScore || 0) > 50 ? 'text-yellow-400 border-yellow-900 bg-yellow-950/20' : 
                     'text-red-400 border-red-900 bg-red-950/20';

  return (
    <a href={source.uri} target="_blank" rel="noopener noreferrer" 
       className="block p-3 rounded border border-foundlab-dark-border bg-foundlab-dark-card hover:bg-gray-800 transition-colors group">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs font-mono text-gray-500">REF [{index + 1}]</span>
        <div className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${scoreColor}`}>
          TRUST: {source.trustScore}%
        </div>
      </div>
      <h4 className="text-sm font-medium text-gray-200 group-hover:text-foundlab-300 line-clamp-2 mb-1">
        {source.title}
      </h4>
      <div className="text-xs text-gray-500 font-mono truncate">
        {new URL(source.uri).hostname}
      </div>
      {source.trustReason && (
        <div className="mt-2 text-[10px] text-gray-600 uppercase tracking-wide">
          {source.trustReason}
        </div>
      )}
    </a>
  );
};
