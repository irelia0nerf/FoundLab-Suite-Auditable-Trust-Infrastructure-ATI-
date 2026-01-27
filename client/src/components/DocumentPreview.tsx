import React from 'react';
import { FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface DocumentPreviewProps {
  url: string | null;
  mimeType: string | null;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ url, mimeType }) => {
  if (!url || !mimeType) return null;

  const isPdf = mimeType.includes('pdf');

  return (
    <div className="h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-lg">
      <div className="bg-slate-800/50 p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPdf ? <FileText size={16} className="text-brand-400"/> : <ImageIcon size={16} className="text-brand-400"/>}
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Source Document</span>
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-1 min-h-[500px]">
        {isPdf ? (
           <object data={url} type="application/pdf" className="w-full h-full rounded bg-slate-800">
             <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
               <FileText size={48} className="mb-4 text-slate-700" />
               <p className="mb-2">PDF Preview Unavailable</p>
               <a href={url} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline text-sm">
                 Click to open document
               </a>
             </div>
           </object>
        ) : (
          <img src={url} alt="KYC Document" className="w-full h-full object-contain rounded" />
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;