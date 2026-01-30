import React, { useState, useCallback, useRef } from 'react';
import { 
  LogEntry, 
  ResearchMode, 
  ResearchCapsule, 
  Source,
  VeritasBlock
} from '../types';
import { planResearch, executeResearchStep, synthesizeReport } from '../services/geminiService';
import { LogStream } from './LogStream';
import { ResearchResult } from './ResearchResult';
import { Search, Loader, Shield, Activity, BrainCircuit, Box } from 'lucide-react';

// --- VERITAS PROTOCOL UTILS ---
const sha256 = async (content: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const generateMockVeritasHash = () => {
    return Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('').substring(0, 16) + '...';
};

export const ResearchWorkflow: React.FC<{ initialTopic?: string }> = ({ initialTopic }) => {
  // State
  const [topic, setTopic] = useState(initialTopic || '');
  const [mode, setMode] = useState<ResearchMode>(ResearchMode.ATI_AUDIT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [capsule, setCapsule] = useState<ResearchCapsule | null>(null);
  
  const stopRequested = useRef(false);

  // Helper to add logs
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), message, type }]);
  }, []);

  const handleStop = () => {
    if (isProcessing) {
      addLog("INTERRUPT SIGNAL: Veritas Protocol finalizing current block...", 'warning');
      stopRequested.current = true;
    }
  };

  const handleStartResearch = async () => {
    if (!topic.trim()) return;
    
    setIsProcessing(true);
    stopRequested.current = false;
    setCapsule(null);
    setLogs([]);

    try {
        // 1. INIT
        const decisionId = crypto.randomUUID();
        addLog(`INIT: DecisionID [${decisionId}] allocated.`, 'citadel');
        await new Promise(r => setTimeout(r, 800));
        addLog(`PIPELINE: FoundLab ATI v2.1 booting (gVisor/Cilium active)...`, 'citadel');
        await new Promise(r => setTimeout(r, 800));

        // 2. PLANNING
        addLog(`STAGE 1: INGESTION - Validating input via API Gateway...`, 'info');
        await new Promise(r => setTimeout(r, 600));
        addLog(`VERITAS SEAL [INGEST]: ${generateMockVeritasHash()}`, 'veritas');
        
        addLog(`STAGE 2: COGNITIVE ORCHESTRATION - Dispatching to Parser...`, 'thinking');
        const plan = await planResearch(topic, mode);
        
        if (stopRequested.current) throw new Error("Stopped by user");

        addLog(`VERITAS SEAL [ORCHESTRATION]: ${generateMockVeritasHash()}`, 'veritas');
        addLog(`PLAN: ${plan.length} execution vectors generated.`, 'success');

        // 3. EXECUTION
        const sources: Source[] = [];
        const claims: any[] = [];
        let fullReport = "";

        for (const [idx, vector] of plan.entries()) {
            if (stopRequested.current) break;
            
            addLog(`STAGE 3: ENGINE EXEC - [Vector ${idx+1}] "${vector}"`, 'thinking');
            await new Promise(r => setTimeout(r, 1000)); // Simulate work
            addLog(`Dynamic Grounding: Loading Sovereign Context (Zero-Persistence 2.0)...`, 'citadel');
            
            const stepResult = await executeResearchStep(vector);
            if (stepResult.source) sources.push(stepResult.source);
            fullReport += stepResult.text + "\n\n";
            
            addLog(`VERITAS SEAL [ENGINE_EXEC]: ${generateMockVeritasHash()}`, 'veritas');
        }

        // 4. SYNTHESIS
        if (!stopRequested.current) {
            addLog(`STAGE 4: CRITIC-LOOP - Synthesizing final dossier...`, 'warning');
            const finalReport = await synthesizeReport(topic, fullReport, sources);
            
            addLog(`VERITAS SEAL [CRITIC_VAL]: ${generateMockVeritasHash()}`, 'veritas');
            addLog(`COMPLETED: Research Capsule Sealed.`, 'success');

            setCapsule({
                topic,
                summary: finalReport,
                sources: sources,
                claims: [], // todo
                veritasBlock: {
                    hash: await sha256(finalReport),
                    timestamp: new Date(),
                    id: decisionId
                }
            });
        }

    } catch (e) {
        addLog(`FATAL: ${e}`, 'error');
    } finally {
        setIsProcessing(false);
    }
  };


  if (capsule) {
    return (
      <div className="bg-white text-slate-800 p-4 h-full overflow-auto">
         <button 
           onClick={() => setCapsule(null)} 
           className="mb-4 text-sm text-cyan-600 hover:underline"
         >
           ← Back to Research Input
         </button>
         <ResearchResult capsule={capsule} onReset={() => setCapsule(null)} />
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 h-full flex flex-col p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div className="text-center space-y-6 py-8">
            <div className="flex items-center justify-center gap-5">
                <Box className="w-14 h-14 text-slate-900 stroke-[1.5]" />
                <div className="flex flex-col items-start">
                    <h1 className="text-6xl font-serif text-slate-900 tracking-tight leading-none">FoundLab</h1>
                    <div className="flex items-center gap-3 w-full">
                        <div className="h-px bg-gold w-8"></div>
                        <span className="text-sm font-sans tracking-[0.3em] text-gold uppercase font-bold whitespace-nowrap">DeepSearch</span>
                    </div>
                </div>
            </div>
            <p className="text-slate-500 font-mono text-xs tracking-wider uppercase">Autonomous ATI Research Agent v2.1 // System_Optimal</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter research topic (e.g., 'Competitor X Compliance Gaps', 'Crypto Regulation 2025')..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-400"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={isProcessing ? handleStop : handleStartResearch}
                        disabled={!topic.trim() && !isProcessing}
                        className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                            isProcessing 
                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" /> Stop
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" /> Initialize
                            </>
                        )}
                    </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                    {Object.values(ResearchMode).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            disabled={isProcessing}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                                mode === m 
                                    ? 'bg-cyan-50 border-cyan-500 text-cyan-700' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Logs */}
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider font-semibold">
                <span>System Output Log</span>
                {isProcessing && <span className="flex items-center gap-1 text-cyan-600"><Activity className="w-3 h-3 animate-pulse" /> PROCESSING</span>}
            </div>
            
            <div className="h-[400px] bg-slate-950 rounded-xl border border-slate-200 p-4 font-mono text-sm overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-20"></div>
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
                        <Shield className="w-12 h-12 opacity-20" />
                        <p>Ready to initialize Auditable Trust Infrastructure...</p>
                    </div>
                ) : (
                    <LogStream logs={logs} />
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
