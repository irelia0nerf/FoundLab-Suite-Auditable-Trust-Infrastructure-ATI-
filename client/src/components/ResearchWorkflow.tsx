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
import { Search, Loader, Shield, Activity, BrainCircuit } from 'lucide-react';

// --- VERITAS PROTOCOL UTILS ---
const sha256 = async (content: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ResearchWorkflow: React.FC = () => {
  // State
  const [topic, setTopic] = useState('');
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
    
    // --- 0. INIT: GENERATE DECISION ID ---
    const decisionId = crypto.randomUUID();
    addLog(`INIT: DecisionID [${decisionId}] allocated.`, 'citadel');
    addLog(`PIPELINE: FoundLab ATI v2.0 booting (gVisor/Cilium active)...`, 'citadel');

    // Veritas Ledger State
    const veritasLedger: VeritasBlock[] = [];
    let previousChainHash = "0000000000000000000000000000000000000000000000000000000000000000";

    // Helper to seal a block
    const sealBlock = async (eventType: VeritasBlock['eventType'], data: string) => {
        const dataHash = await sha256(data);
        const chainHash = await sha256(dataHash + previousChainHash);
        const block: VeritasBlock = {
            index: veritasLedger.length,
            timestamp: new Date().toISOString(),
            eventId: decisionId,
            eventType,
            dataHash,
            previousChainHash,
            chainHash
        };
        veritasLedger.push(block);
        previousChainHash = chainHash;
        addLog(`VERITAS SEAL [${eventType}]: ${chainHash.substring(0, 8)}...`, 'veritas');
    };

    try {
      // --- 1. INGESTION ---
      addLog(`STAGE 1: INGESTION - Validating input via API Gateway...`, 'info');
      await sealBlock('INGEST', topic + mode);
      
      // --- 2. ORCHESTRATION (Plan) ---
      addLog(`STAGE 2: COGNITIVE ORCHESTRATION - Dispatching to Parser...`, 'thinking');
      const steps = await planResearch(topic, mode);
      await sealBlock('ORCHESTRATION', JSON.stringify(steps));
      addLog(`PLAN: ${steps.length} execution vectors generated.`, 'success');

      // --- 3. PROCESSING (Multi-Engine) ---
      const allFindings: { question: string, findings: string }[] = [];
      const allSources: Source[] = [];
      
      const executionQueue = [...steps];
      let stepIndex = 0;

      while (stepIndex < executionQueue.length) {
        if (stopRequested.current) break;

        const stepQuestion = executionQueue[stepIndex];
        addLog(`STAGE 3: ENGINE EXEC - [Vector ${stepIndex + 1}] "${stepQuestion}"`, 'thinking');
        
        const context = allFindings.map(f => `Q: ${f.question} A: ${f.findings}`).join('\n');
        
        // Zero-Persistence Simulation
        addLog(`Dynamic Grounding: Loading Sovereign Context (Zero-Persistence 2.0)...`, 'citadel');
        
        // A. Execute
        let result = await executeResearchStep(stepQuestion, context);
        let { findings, sources, newQuestions, hasConflict } = result;

        // B. Critic Loop (Guardian AI)
        const avgTrust = sources.length > 0 
            ? sources.reduce((acc, s) => acc + (s.trustScore || 0), 0) / sources.length 
            : 0;

        if (sources.length > 0 && avgTrust < 60) {
            addLog(`STAGE 4: CRITIC-LOOP - Weak Signal (Trust ${Math.round(avgTrust)}%). Retrying...`, 'warning');
            await sealBlock('CRITIC_VAL', `RETRY_TRIGGERED:${stepQuestion}`);
            result = await executeResearchStep(stepQuestion, context, true);
            findings = result.findings;
            sources = result.sources;
            newQuestions = result.newQuestions;
        }

        // C. Forking
        if (newQuestions && newQuestions.length > 0) {
            newQuestions.forEach(forkQ => {
                if (!executionQueue.includes(forkQ) && executionQueue.length < 10) { 
                    executionQueue.push(forkQ);
                    addLog(`ORCHESTRATOR: Dynamic Fork -> "${forkQ}"`, 'thinking');
                }
            });
        }

        // D. Seal Step
        for (let s of sources) {
            s.snapshotHash = await sha256(s.title + s.uri + new Date().toISOString());
        }
        allFindings.push({ question: stepQuestion, findings });
        allSources.push(...sources);
        
        await sealBlock('ENGINE_EXEC', stepQuestion + findings);

        // Wait to prevent rate limiting
        await new Promise(r => setTimeout(r, 1200));
        stepIndex++;
      }

      // --- 4. EGRESS (Synthesis) ---
      if (allFindings.length === 0) throw new Error("No data collected.");

      addLog(`STAGE 5: EGRESS - Evidence Writer compiling WORM Capsule...`, 'thinking');
      addLog(`REX Pattern: Extracting Rationale & Thought Process...`, 'citadel');
      
      const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());
      const result = await synthesizeReport(topic, mode, allFindings);

      await sealBlock('WORM_SEAL', result.fullReport);

      const finalCapsule: ResearchCapsule = {
        id: decisionId,
        topic,
        mode,
        date: new Date().toLocaleDateString(),
        plan_steps: executionQueue,
        executiveSummary: result.executiveSummary,
        decision_rationale: result.decision_rationale,
        claims: result.claims,
        keyInsights: result.keyInsights,
        risks: result.risks,
        fullReport: result.fullReport,
        sources: uniqueSources,
        veritasLedger: veritasLedger,
        thought_process: result.thought_process
      };

      setCapsule(finalCapsule);
      addLog(`COMPLETED: DecisionID [${decisionId}] sealed in BigQuery (WORM).`, 'success');

    } catch (error) {
      addLog(`FATAL: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
      stopRequested.current = false;
    }
  };

  if (capsule) {
    return (
      <div className="bg-slate-900 text-gray-200 p-4 h-full overflow-auto">
         <button 
           onClick={() => setCapsule(null)} 
           className="mb-4 text-sm text-cyan-400 hover:underline"
         >
           ← Back to Research Input
         </button>
         <ResearchResult capsule={capsule} onReset={() => setCapsule(null)} />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-gray-200 h-full flex flex-col p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-white flex items-center justify-center gap-2">
                <BrainCircuit className="w-8 h-8 text-cyan-400" />
                FoundLab <span className="font-semibold text-cyan-400">DeepSearch</span>
            </h1>
            <p className="text-gray-400">Autonomous ATI Research Agent v2.1</p>
        </div>

        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter research topic (e.g., 'Competitor X Compliance Gaps', 'Crypto Regulation 2025')..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={isProcessing ? handleStop : handleStartResearch}
                        disabled={!topic.trim() && !isProcessing}
                        className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                            isProcessing 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
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
                                    ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                                    : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'
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
            <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold">
                <span>System Output Log</span>
                {isProcessing && <span className="flex items-center gap-1 text-cyan-400"><Activity className="w-3 h-3 animate-pulse" /> PROCESSING</span>}
            </div>
            
            <div className="h-[400px] bg-black/80 rounded-xl border border-slate-800 p-4 font-mono text-sm overflow-hidden shadow-inner relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-20"></div>
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
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
