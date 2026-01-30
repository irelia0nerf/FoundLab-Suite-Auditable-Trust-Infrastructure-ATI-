import React from 'react';
import { 
  FileText, 
  Microscope, 
  Database, 
  Activity,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';

export type AppView = 'WORKFLOW' | 'REGISTRY' | 'AUDIT' | 'RESEARCH';

interface AppLayoutProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}> = ({ active, onClick, icon: Icon, title, subtitle }) => (
  <div 
    onClick={onClick}
    className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-l-2 relative overflow-hidden ${
      active 
        ? 'bg-slate-50 border-cyan-600 text-cyan-700' 
        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`}
  >
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/50 to-transparent pointer-events-none" />
    )}
    <Icon 
      size={18} 
      className={`transition-all duration-300 ${
        active ? "text-cyan-600" : "group-hover:text-slate-600"
      }`} 
    />
    <div className="flex flex-col relative z-10">
      <span className={`font-medium text-sm tracking-wide ${active ? 'text-slate-900' : ''}`}>
        {title}
      </span>
      <span className="text-[10px] font-mono opacity-50 group-hover:opacity-80">
        {subtitle}
      </span>
    </div>
  </div>
);

export const AppLayout: React.FC<AppLayoutProps> = ({ currentView, onChangeView, children, headerActions }) => {
  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans selection:bg-cyan-100 selection:text-cyan-900 overflow-hidden relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4]" 
           style={{ 
             backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl hidden md:flex h-full">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white relative">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center shadow-lg">
                 <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div>
                 <h1 className="text-slate-900 font-serif font-bold tracking-tight text-xl">FoundLab</h1>
                 <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Trust Engine</div>
              </div>
           </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
           <div className="px-4 py-2 text-[10px] font-mono uppercase text-slate-600 tracking-wider">Core Modules</div>
           
           <NavItem 
             active={currentView === 'WORKFLOW'}
             onClick={() => onChangeView('WORKFLOW')}
             icon={FileText}
             title="Optical Sieve"
             subtitle="MODULE_KYC_01"
           />
           
           <NavItem 
             active={currentView === 'RESEARCH'}
             onClick={() => onChangeView('RESEARCH')}
             icon={Microscope}
             title="Cognitive DeepSearch"
             subtitle="MODULE_INTEL_04"
           />

           <div className="px-4 py-2 text-[10px] font-mono uppercase text-slate-600 tracking-wider mt-6">Compliance</div>

           <NavItem 
             active={currentView === 'REGISTRY'}
             onClick={() => onChangeView('REGISTRY')}
             icon={Database}
             title="Global Registry"
             subtitle="MODULE_REG_02"
           />

           <NavItem 
             active={currentView === 'AUDIT'}
             onClick={() => onChangeView('AUDIT')}
             icon={Activity}
             title="Veritas Audit"
             subtitle="MODULE_AUD_03"
           />
        </nav>

        {/* System Status Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">System Operational</span>
           </div>
           <div className="font-mono text-[10px] text-slate-400">
              v2.4.0-stable
              <br/>
              Encrypted Enclave: Active
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/50 overflow-hidden relative">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
           <div className="flex items-center gap-3">
              <BrainCircuit className="text-slate-400 w-5 h-5" />
              <div className="h-4 w-px bg-slate-300 mx-1"></div>
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                 {currentView === 'WORKFLOW' && 'Intelligent Document Processing'}
                 {currentView === 'RESEARCH' && 'DeepSearch Intelligence'}
                 {currentView === 'REGISTRY' && 'Registry Reconnaissance'}
                 {currentView === 'AUDIT' && 'Veritas Immutable Ledger'}
              </span>
           </div>
           
           <div className="flex items-center gap-4">
              {headerActions && (
                  <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
                      {headerActions}
                  </div>
              )}
              <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-mono text-slate-500">GEMINI_3_PRO_PREVIEW</span>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative scroll-smooth">
           {children}
        </div>
      </main>
    </div>
  );
};
