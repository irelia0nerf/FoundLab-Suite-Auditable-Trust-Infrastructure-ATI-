import React from 'react';

interface TechCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'alert' | 'success';
}

const TechCard: React.FC<TechCardProps> = ({ children, title, className = "", variant = 'default' }) => {
  // Define a cor da borda baseada na variante
  const borderColor = 
    variant === 'alert' ? 'border-red-200' : 
    variant === 'success' ? 'border-cyan-200' : 
    'border-slate-200';

  const glowClass = 
    variant === 'alert' ? 'shadow-sm shadow-red-100' : 
    variant === 'success' ? 'shadow-sm shadow-cyan-100' : 
    'shadow-sm';

  return (
    <div className={`relative bg-white backdrop-blur-sm border ${borderColor} ${glowClass} p-1 ${className}`}>
      {/* Decorative Corner Markers - Dá o visual "Técnico" */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-slate-300 opacity-50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-slate-300 opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-slate-300 opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-slate-300 opacity-50"></div>

      {/* Header Técnico Opcional */}
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-slate-900/30">
          <span className="font-mono text-xs uppercase tracking-widest text-slate-400 font-bold">
            // {title}
          </span>
          <div className="flex gap-1">
             <div className="w-1 h-1 rounded-full bg-slate-600"></div>
             <div className="w-1 h-1 rounded-full bg-slate-600"></div>
          </div>
        </div>
      )}

      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

export default TechCard;
