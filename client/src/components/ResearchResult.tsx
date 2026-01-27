import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ResearchCapsule } from '../types';
import { SourceCard } from './SourceCard';
import { queryCapsule } from '../services/geminiService';

interface ResearchResultProps {
  capsule: ResearchCapsule;
  onReset: () => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const ResearchResult: React.FC<ResearchResultProps> = ({ capsule, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'ledger' | 'oracle'>('summary');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
      { role: 'assistant', content: 'I have access to the Veritas-sealed capsule. What evidence do you need?' }
  ]);
  const [isChatting, setIsChatting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (activeTab === 'oracle') {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, activeTab]);

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(capsule, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `veritas_seal_${capsule.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadMD = () => {
    const header = `# ${capsule.topic}\n\n**DecisionID:** ${capsule.id}\n**Mode:** ${capsule.mode}\n\n## Executive Summary\n${capsule.executiveSummary}\n\n---\n\n`;
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(header + capsule.fullReport);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `report_${capsule.id}.md`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatting) return;

      const userQ = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', content: userQ }]);
      setIsChatting(true);

      const context = `
        DecisionID: ${capsule.id}
        Topic: ${capsule.topic}
        Executive Summary: ${capsule.executiveSummary}
        Full Report: ${capsule.fullReport}
        Risks: ${capsule.risks.join(', ')}
        Key Insights: ${capsule.keyInsights.join(', ')}
      `;

      const answer = await queryCapsule(userQ, context);
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      setIsChatting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Sidebar Navigation & Tools */}
      <div className="lg:col-span-4 flex flex-col h-[calc(100vh-6rem)]">
        
        <div className="flex gap-1 mb-4">
             <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
                    activeTab === 'summary' 
                    ? 'bg-foundlab-600 text-white border-foundlab-500' 
                    : 'bg-foundlab-dark-card text-gray-400 border-foundlab-dark-border hover:bg-gray-800'
                }`}
             >
                Summary
             </button>
             <button 
                onClick={() => setActiveTab('ledger')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'ledger' 
                    ? 'bg-blue-900/50 text-blue-300 border-blue-800' 
                    : 'bg-foundlab-dark-card text-gray-400 border-foundlab-dark-border hover:bg-gray-800'
                }`}
             >
                <span>🔒</span> Veritas
             </button>
             <button 
                onClick={() => setActiveTab('oracle')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'oracle' 
                    ? 'bg-purple-900/50 text-purple-300 border-purple-800' 
                    : 'bg-foundlab-dark-card text-gray-400 border-foundlab-dark-border hover:bg-gray-800'
                }`}
             >
                <span>🔮</span> Oracle
             </button>
        </div>

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                <div className="bg-foundlab-dark-card border border-foundlab-dark-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-foundlab-400 font-mono uppercase tracking-widest">Decision Capsule</div>
                    <div className="flex gap-2">
                        <button onClick={handleDownloadJSON} title="Download JSON" className="text-gray-400 hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                        <button onClick={handleDownloadMD} title="Download Markdown" className="text-gray-400 hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                    </div>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">{capsule.topic}</h1>
                <div className="font-mono text-[10px] text-gray-500 mb-6 break-all">
                    ID: {capsule.id}
                </div>
                
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-200 uppercase mb-2 border-b border-gray-800 pb-1">Rationale</h3>
                    <p className="text-sm text-gray-400 leading-relaxed italic border-l-2 border-foundlab-700 pl-3">
                    {capsule.decision_rationale}
                    </p>
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-200 uppercase mb-2 border-b border-gray-800 pb-1">Verified Claims</h3>
                    <div className="space-y-3">
                    {capsule.claims?.map((claim, i) => (
                        <div key={i} className="bg-black/40 p-3 rounded border border-gray-800">
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${
                                    claim.confidence === 'High' ? 'bg-green-900/30 text-green-400' :
                                    claim.confidence === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                    'bg-red-900/30 text-red-400'
                                }`}>{claim.confidence}</span>
                                <span className="text-[10px] text-gray-500 uppercase">{claim.type}</span>
                            </div>
                            <p className="text-xs text-gray-300">{claim.text}</p>
                        </div>
                    ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <button onClick={onReset} className="col-span-2 py-3 bg-foundlab-900 hover:bg-foundlab-800 text-white rounded border border-foundlab-800 uppercase text-xs font-bold flex items-center justify-center gap-2">
                        <span>🔄</span> New Audit
                    </button>
                </div>
                </div>
            </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'ledger' && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <div className="bg-foundlab-dark-card border border-foundlab-dark-border rounded-lg p-6">
                    <h3 className="text-sm font-bold text-blue-300 uppercase mb-4 flex items-center gap-2">
                        <span>🔒</span> Veritas Audit Trail
                    </h3>
                    <div className="space-y-4 relative">
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-800"></div>
                        {capsule.veritasLedger?.map((block, i) => (
                            <div key={i} className="relative pl-8">
                                <div className="absolute left-[0.2rem] top-1 w-3 h-3 rounded-full bg-gray-700 border-2 border-foundlab-dark-bg z-10"></div>
                                <div className="bg-black p-3 rounded border border-gray-800 font-mono text-[10px]">
                                    <div className="flex justify-between text-gray-500 mb-1">
                                        <span>BLOCK #{block.index}</span>
                                        <span>{block.eventType}</span>
                                    </div>
                                    <div className="text-gray-400 break-all mb-1">
                                        <span className="text-blue-500">HASH:</span> {block.chainHash}
                                    </div>
                                    <div className="text-gray-600 break-all">
                                        <span className="text-gray-700">PREV:</span> {block.previousChainHash}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 p-3 bg-blue-900/10 border border-blue-900/30 rounded text-[10px] text-blue-400 font-mono">
                        STATUS: WORM LOCKED (deletion_protection=true)
                    </div>
                </div>
            </div>
        )}

        {/* ORACLE TAB */}
        {activeTab === 'oracle' && (
             <div className="flex-1 flex flex-col bg-foundlab-dark-card border border-foundlab-dark-border rounded-lg overflow-hidden h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                                m.role === 'user' 
                                ? 'bg-foundlab-700 text-white' 
                                : 'bg-black border border-gray-800 text-gray-300'
                            }`}>
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isChatting && <div className="text-xs text-gray-500 p-2 animate-pulse">Consulting Veritas Ledger...</div>}
                    <div ref={chatBottomRef} />
                </div>
                <div className="p-4 bg-black border-t border-foundlab-dark-border">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Query the audit trail..."
                            className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:outline-none focus:border-foundlab-500"
                        />
                        <button 
                            type="submit" 
                            disabled={isChatting || !chatInput.trim()}
                            className="px-4 bg-foundlab-700 text-white rounded font-bold text-sm"
                        >
                            Ask
                        </button>
                    </form>
                </div>
             </div>
        )}

      </div>

      {/* Main Content - Full Report */}
      <div className="lg:col-span-8 bg-black border border-foundlab-dark-border rounded-lg p-8 lg:p-12 overflow-y-auto shadow-2xl h-[calc(100vh-6rem)]">
        {/* Thought Trace Section - Explicitly Exposed for Radical Auditability */}
        {capsule.thought_process && (
            <div className="mb-10 bg-gray-900/50 border border-gray-800 rounded-lg p-6 font-mono text-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="text-foundlab-500">⚡</span> Antifragile Intelligence / Trace
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <span className="block text-[10px] text-gray-500 uppercase mb-1">Consensus Check</span>
                        <p className="text-gray-300 leading-relaxed border-l border-gray-700 pl-3">{capsule.thought_process.consensus_check}</p>
                    </div>
                    <div>
                        <span className="block text-[10px] text-gray-500 uppercase mb-1 text-red-400">Contrarian Inversion</span>
                        <p className="text-gray-300 leading-relaxed border-l border-red-900/50 pl-3">{capsule.thought_process.contrarian_inversion}</p>
                    </div>
                </div>
                
                {capsule.thought_process.veritas_validation && (
                    <div className="mb-6 p-3 bg-blue-900/10 border border-blue-900/30 rounded">
                        <span className="block text-[10px] text-blue-400 font-bold mb-1">VERITAS VALIDATION</span>
                        <p className="text-gray-300 text-xs">{capsule.thought_process.veritas_validation}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <span className="block text-[10px] text-gray-500 uppercase">Strategic Lenses</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black p-3 rounded border border-gray-800">
                             <span className="block text-[10px] text-blue-400 font-bold mb-1">LEGAL / COMPLIANCE</span>
                             <p className="text-xs text-gray-400">{capsule.thought_process.strategic_analysis.legal_lens}</p>
                        </div>
                        <div className="bg-black p-3 rounded border border-gray-800">
                             <span className="block text-[10px] text-green-400 font-bold mb-1">FINANCIAL</span>
                             <p className="text-xs text-gray-400">{capsule.thought_process.strategic_analysis.financial_lens}</p>
                        </div>
                        <div className="bg-black p-3 rounded border border-gray-800">
                             <span className="block text-[10px] text-orange-400 font-bold mb-1">TECHNICAL / ARCH</span>
                             <p className="text-xs text-gray-400">{capsule.thought_process.strategic_analysis.technical_lens}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="prose prose-invert prose-headings:text-foundlab-50 prose-a:text-foundlab-400 max-w-none">
          <ReactMarkdown>
            {capsule.fullReport}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};