import React, { useState, useCallback } from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  Search, 
  MapPin, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Loader,
  ChevronRight,
  BrainCircuit,
  Globe,
  Download,
  Database,
  Activity,
  Microscope,
  X
} from 'lucide-react';
import { AnalysisStatus, ExtractedEntity, EnrichmentData, RiskReport, VerificationResult } from './types';
import * as geminiService from './services/geminiService';
import * as pdfService from './services/pdfService';
import * as auditService from './services/auditService';
import RiskChart from './components/RiskChart';
import ChatWidget from './components/ChatWidget';
import DocumentPreview from './components/DocumentPreview';
import RegistrySearch from './components/RegistrySearch';
import AuditLogViewer from './components/AuditLogViewer';
import { ResearchWorkflow } from './components/ResearchWorkflow';
import TechCard from './components/ui/TechCard';
import { AppLayout } from './components/layout/AppLayout';

type AppView = 'WORKFLOW' | 'REGISTRY' | 'AUDIT' | 'RESEARCH';

const sha256 = async (content: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('WORKFLOW');
  
  // Workflow State
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [extractedEntity, setExtractedEntity] = useState<ExtractedEntity | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Verification State
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Preview State
  const [files, setFiles] = useState<{ name: string; type: string; preview: string; base64: string }[]>([]);
  const [contextNote, setContextNote] = useState("");
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);

  // Navigation Helper
  const changeView = (view: AppView) => {
    setCurrentView(view);
    auditService.log('USER_ACTION', 'Navigation Changed', { to: view });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    // Don't clear previous files immediately if we want to support append, but here we replace
    setFiles([]); 
    setExtractedEntity(null);

    try {
      const filePromises = Array.from(selectedFiles).map(file => {
        return new Promise<{ base64: string; mimeType: string; name: string; preview: string; base64Raw: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             const result = reader.result as string;
             resolve({
                base64Raw: result.split(',')[1],
                base64: result.split(',')[1], // Keep for compatibility
                mimeType: file.type,
                name: file.name,
                preview: result
             });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const loadedFiles = await Promise.all(filePromises);
      setFiles(loadedFiles.map(f => ({ name: f.name, type: f.mimeType, preview: f.preview, base64: f.base64Raw })));
      
    } catch (e) {
      setError("Error reading files.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const startParsing = async () => {
      if (files.length === 0) return;
      
      setStatus(AnalysisStatus.PARSING_DOC);
      
      // Hash Context for Audit
      let contextHash = "NO_CONTEXT";
      if (contextNote.trim()) {
          contextHash = await sha256(contextNote);
          // Veritas Log for Context
          auditService.log('USER_ACTION', 'CASE_CONTEXT_PROVIDED', {
            payload_hash: contextHash,
            context_length: contextNote.length
          });
      }

      auditService.log('USER_ACTION', 'Multi-Document Upload Started', { count: files.length, contextHash });

      try {
        const entity = await geminiService.parseDocument(files.map(f => ({ base64: f.base64, mimeType: f.type })), contextNote);
        setExtractedEntity(entity);
        setStatus(AnalysisStatus.EXTRACTED);
        auditService.log('SYSTEM_EVENT', 'Multi-Document Parsing Success', { entityName: entity.name });
      } catch (err) {
        console.error(err);
        setError("Failed to parse documents. Please ensure clear images/PDFs.");
        setStatus(AnalysisStatus.ERROR);
      }
  };

  const handleEnrichment = async () => {
    if (!extractedEntity) return;
    setStatus(AnalysisStatus.ENRICHING);
    auditService.log('USER_ACTION', 'Enrichment Started', { entity: extractedEntity.name });

    try {
      const data = await geminiService.enrichEntityData(extractedEntity);
      setEnrichmentData(data);
      setStatus(AnalysisStatus.ANALYZING_RISK);
      auditService.log('SYSTEM_EVENT', 'Enrichment Completed', { 
        verifiedAddress: data.locationVerification.verified, 
        adverseMediaCount: data.adverseMedia.length 
      });
      
      // Auto-trigger risk analysis after enrichment
      handleRiskAnalysis(extractedEntity, data);
    } catch (e) {
      console.error(e);
      setError("Agentic enrichment failed.");
      setStatus(AnalysisStatus.ERROR);
      auditService.log('ERROR', 'Enrichment Failed', { error: String(e) });
    }
  };

  const handleRiskAnalysis = async (entity: ExtractedEntity, enrichment: EnrichmentData) => {
    try {
      const report = await geminiService.generateRiskAssessment(entity, enrichment);
      setRiskReport(report);
      setStatus(AnalysisStatus.COMPLETE);
      auditService.log('SYSTEM_EVENT', 'Risk Assessment Generated', { 
        score: report.riskScore, 
        level: report.riskLevel,
        recommendation: report.recommendation 
      });
    } catch (e) {
      console.error(e);
      setError("Risk assessment generation failed.");
      setStatus(AnalysisStatus.ERROR);
      auditService.log('ERROR', 'Risk Analysis Failed', { error: String(e) });
    }
  };

  const handleVerification = async () => {
    if (!extractedEntity) return;
    setIsVerifying(true);
    auditService.log('USER_ACTION', 'Sanctions Verification Started', { entity: extractedEntity.name });
    try {
        const result = await geminiService.verifyEntitySanctions(extractedEntity);
        setVerificationResult(result);
        auditService.log('SYSTEM_EVENT', 'Sanctions Verification Completed', { 
          status: result.overallStatus,
          matchCount: result.checks.filter(c => c.status !== 'CLEAN').length 
        });
    } catch (e) {
        console.error("Verification failed", e);
        setError("Sanctions verification failed.");
        auditService.log('ERROR', 'Sanctions Verification Failed', { error: String(e) });
    } finally {
        setIsVerifying(false);
    }
  };

  const reset = useCallback(() => {
    auditService.log('USER_ACTION', 'Session Reset');
    setStatus(AnalysisStatus.IDLE);
    setExtractedEntity(null);
    setEnrichmentData(null);
    setRiskReport(null);
    setError(null);
    setVerificationResult(null);
    setIsVerifying(false);
    setFiles([]);
    setContextNote("");
  }, []);

  const handleDownloadReport = () => {
    if (extractedEntity && enrichmentData && riskReport) {
      pdfService.generatePDFReport(extractedEntity, enrichmentData, riskReport);
      auditService.log('USER_ACTION', 'Report Downloaded', { entity: extractedEntity.name });
    }
  };

  const ConsoleLoader = () => (
    <div className="w-full max-w-md bg-black border border-slate-800 font-mono text-xs p-4 rounded-lg shadow-2xl mx-auto my-12">
      <div className="border-b border-slate-800 pb-2 mb-2 flex justify-between text-slate-500">
        <span>SYSTEM_KERNEL_LOG</span>
        <span className="animate-pulse text-signal-success">● LIVE</span>
      </div>
      <div className="space-y-1 text-slate-400">
        <p>{'>'} Initializing Optical Sieve...</p>
        <p>{'>'} Uploading to Volatile Memory Enclave...</p>
        <p>{'>'} Gemini 3.0 Pro handshake <span className="text-signal-success">[OK]</span></p>
        {(status === AnalysisStatus.ENRICHING || status === AnalysisStatus.ANALYZING_RISK) && (
          <>
            <p>{'>'} Parsing unstructured pixels...</p>
            <p className="text-signal-success animate-pulse">{'>'} Executing Cognitive Vectors...</p>
          </>
        )}
        <p className="animate-pulse">_</p>
      </div>
    </div>
  );

  return (
    <AppLayout 
      currentView={currentView} 
      onChangeView={changeView}
      headerActions={
        currentView === 'WORKFLOW' && status === AnalysisStatus.COMPLETE && (
           <>
             <button 
              onClick={handleDownloadReport} 
              className="flex items-center gap-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200 px-3 py-1.5 text-sm font-mono transition-colors rounded-md shadow-sm"
             >
               <Download size={14} />
               EXPORT_REPORT
             </button>
             <button onClick={reset} className="text-sm font-mono text-slate-500 hover:text-cyan-600 transition-colors ml-2">[ RESET_SESSION ]</button>
           </>
         )
      }
    >
      {currentView === 'WORKFLOW' && (
        <div className="max-w-7xl mx-auto space-y-12 pb-24">
           {/* Section Header */}
           <div className="flex items-center gap-4">
              <div className="h-10 w-1 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50"></div>
              <div>
                 <h2 className="text-xl font-bold tracking-tight text-slate-900">OPTICAL SIEVE // EXECUTION</h2>
                 <p className="text-xs text-slate-500 font-mono">Zero-Persistence Document Analysis Pipeline</p>
              </div>
           </div>

           {/* Pipeline Steps Visualization */}
           <div className="grid grid-cols-4 gap-4 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
               {['DATA_INGEST', 'OCR_EXTRACTION', 'INTEL_ENRICHMENT', 'RISK_ASSESSMENT'].map((step, idx) => {
                  const isActive = (
                    (idx === 0 && status === AnalysisStatus.IDLE) ||
                    (idx === 1 && status === AnalysisStatus.PARSING_DOC) ||
                    (idx === 2 && (status === AnalysisStatus.EXTRACTED || status === AnalysisStatus.ENRICHING)) ||
                    (idx === 3 && (status === AnalysisStatus.ANALYZING_RISK || status === AnalysisStatus.COMPLETE))
                  );
                  
                  return (
                    <div key={step} className={`flex items-center gap-3 p-3 rounded border ${isActive ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'border-transparent opacity-40'}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${isActive ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                           {idx + 1}
                        </div>
                        <span className={`text-xs font-mono tracking-wider ${isActive ? 'text-cyan-900 font-semibold' : 'text-slate-500'}`}>
                           {step}
                        </span>
                        {idx < 3 && <div className="flex-1 h-px bg-slate-200 mx-2"></div>}
                    </div>
                  )
               })}
           </div>

           {status === AnalysisStatus.IDLE && (
              <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-6 hover:bg-slate-50/50 transition-colors bg-white shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto border border-slate-200 shadow-inner">
                      <UploadCloud className="text-slate-400 w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-lg font-medium text-slate-900 font-mono tracking-tight">INGEST SOURCE MATERIAL</h3>
                     <p className="text-sm text-slate-500 font-mono uppercase">Supported_Formats: PDF, JPG, PNG // Max_Batch: 10</p>
                  </div>
                  
                  <div className="relative inline-block group">
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <button className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold tracking-wider text-sm shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all rounded">
                         [ SELECT_FILES ]
                      </button>
                  </div>

                  <div className="max-w-md mx-auto">
                     <textarea
                       value={contextNote}
                       onChange={(e) => setContextNote(e.target.value)}
                       placeholder="Add contextual notes or case ID (Optional)..."
                       className="w-full bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all resize-none h-24 font-mono shadow-inner"
                     />
                  </div>
              
              {files.length > 0 && (
              <div className="mt-12 w-full max-w-3xl mx-auto text-left">
                 <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <FileText size={14} className="text-cyan-600" />
                    <span className="font-mono text-xs text-cyan-600 uppercase">Buffer Contents ({files.length})</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    {files.map((file, index) => (
                        <div key={index} className="bg-white p-2 border border-slate-200 flex items-start gap-3 relative group shadow-sm">
                            <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>

                            <div 
                                className="h-16 w-16 bg-slate-50 border border-slate-200 cursor-pointer p-1"
                                onClick={() => setPreviewFile({ url: file.preview, type: file.type, name: file.name })}
                            >
                                {file.type.includes('image') ? (
                                    <img src={file.preview} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" alt="preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">PDF</div>
                                )}
                            </div>
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="font-mono text-xs text-slate-700 truncate w-40">{file.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 uppercase">{file.type}</span>
                                <span className="font-mono text-[10px] text-emerald-600 mt-1">READY_TO_PARSE</span>
                            </div>
                        </div>
                    ))}
                 </div>
                 
                 <div className="mt-6 flex flex-col gap-4">
                    <button 
                        onClick={startParsing}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 font-mono tracking-widest hover:shadow-lg hover:shadow-cyan-500/20 transition-all rounded"
                    >
                        INITIATE_OPTICAL_SIEVE_SEQUENCE
                    </button>
                 </div>
              </div>
            )}
            </div>
           )}

           {status !== AnalysisStatus.IDLE && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {status !== AnalysisStatus.COMPLETE && <ConsoleLoader />}
                 
                 {extractedEntity && (
                    <div className="space-y-8 pb-20">
                        {/* Report Header */}
                        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Intelligence Report</h2>
                                <p className="text-sm font-mono text-slate-500 mt-1 uppercase tracking-widest">Reference: {extractedEntity.idNumber || 'REQ-' + Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                                <div className="inline-block px-3 py-1 border border-slate-200 text-[10px] font-bold font-mono tracking-[0.2em] uppercase mb-1 text-slate-400">Confidential</div>
                                <div className="text-xs text-slate-400 font-mono">{new Date().toISOString().split('T')[0]}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            {/* Left Column: Entity & Enrichment */}
                            <div className="lg:col-span-2 space-y-10">
                                {/* 1. Entity Designation */}
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 font-mono flex items-center gap-2">
                                        <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                        01 // Target Designation
                                    </h3>
                                    <div className="bg-slate-50 p-8 border-l-2 border-slate-900 shadow-sm">
                                        <h1 className="text-4xl font-serif text-slate-900 mb-6">{extractedEntity.name}</h1>
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity Type</label>
                                                <div className="font-mono text-sm text-slate-800 border-b border-slate-200 pb-1">{extractedEntity.type}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Identification</label>
                                                <div className="font-mono text-sm text-slate-800 border-b border-slate-200 pb-1">{extractedEntity.idNumber || "UNKNOWN"}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nationality</label>
                                                <div className="font-mono text-sm text-slate-800 border-b border-slate-200 pb-1">{extractedEntity.nationality || "N/A"}</div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</label>
                                                <div className="font-mono text-sm text-slate-800 border-b border-slate-200 pb-1">{extractedEntity.dateOfBirth || "N/A"}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Address</label>
                                                <div className="font-mono text-sm text-slate-800 border-b border-slate-200 pb-1">{extractedEntity.address || "N/A"}</div>
                                            </div>
                                        </div>
                                        
                                        {!enrichmentData && (
                                            <div className="mt-8 pt-6 border-t border-slate-200">
                                                <button 
                                                    onClick={handleEnrichment}
                                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 font-mono tracking-widest hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 rounded"
                                                >
                                                    <Search size={18} />
                                                    EXECUTE_DEEP_SEARCH
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* 2. Deep Dive Analysis */}
                                {riskReport && (
                                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 font-mono flex items-center gap-2">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                            02 // Deep Dive Analysis
                                        </h3>
                                        
                                        <div className="space-y-6">
                                            {/* FATF & OFAC Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-white p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-cyan-500 transition-colors"></div>
                                                    <h4 className="font-serif text-lg text-slate-900 mb-3">FATF Alignment</h4>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{riskReport.fatfAlignment}</p>
                                                </div>
                                                <div className="bg-white p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-cyan-500 transition-colors"></div>
                                                    <h4 className="font-serif text-lg text-slate-900 mb-3">OFAC Screening</h4>
                                                    <p className="text-sm text-slate-600 leading-relaxed">{riskReport.ofacScreening}</p>
                                                </div>
                                            </div>

                                            {/* Red Flags */}
                                            {riskReport.redFlags.length > 0 && (
                                                <div className="bg-red-50 p-6 border border-red-100 rounded-sm">
                                                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <AlertTriangle size={14} /> Detected Risk Indicators
                                                    </h4>
                                                    <ul className="grid grid-cols-1 gap-2">
                                                        {riskReport.redFlags.map((flag, i) => (
                                                            <li key={i} className="flex items-start gap-3 text-sm text-red-900/80">
                                                                <span className="mt-1.5 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"></span>
                                                                {flag}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Right Column: Risk Score & Summary */}
                            <div className="space-y-10">
                                {/* 3. Risk Matrix */}
                                {riskReport && (
                                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 font-mono flex items-center gap-2">
                                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                            03 // Risk Matrix
                                        </h3>
                                        
                                        <div className="bg-slate-900 text-white p-8 shadow-2xl relative overflow-hidden rounded-sm">
                                            <div className="relative z-10 flex flex-col items-center text-center">
                                                <div className="mb-4">
                                                    <RiskChart score={riskReport.riskScore} />
                                                </div>
                                                
                                                <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6 ${
                                                    riskReport.riskLevel === 'HIGH' || riskReport.riskLevel === 'CRITICAL' ? 'bg-red-500 text-white' : 
                                                    riskReport.riskLevel === 'MEDIUM' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'
                                                }`}>
                                                    {riskReport.riskLevel} Risk
                                                </div>

                                                <div className="w-full h-px bg-slate-700 my-6"></div>

                                                <div className="text-left w-full space-y-4">
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Adverse Media Hits</div>
                                                        <div className="text-lg font-mono text-cyan-400">{enrichmentData?.adverseMedia?.length || 0} Records</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Location Verified</div>
                                                        <div className={`text-sm font-mono flex items-center gap-2 ${enrichmentData?.locationVerification?.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {enrichmentData?.locationVerification?.verified ? 'POSITIVE MATCH' : 'UNVERIFIED'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Executive Summary */}
                                {riskReport && (
                                    <div className="bg-slate-50 p-6 border-t-4 border-cyan-500 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                        <h4 className="font-serif text-lg text-slate-900 mb-4">Executive Summary</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed text-justify">
                                            {riskReport.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                {riskReport && (
                                    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                                        <button 
                                            onClick={handleDownloadReport}
                                            className="w-full py-4 bg-slate-900 text-white font-mono text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Download size={14} /> DOWNLOAD_FULL_DOSSIER
                                        </button>
                                        <button 
                                            onClick={handleEnrichment}
                                            className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-mono text-xs tracking-widest hover:bg-slate-50 transition-all"
                                        >
                                            RE-RUN ENRICHMENT
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                 )}
              </div>
           )}
        </div>
      )}

      {currentView === 'RESEARCH' && (
        <ResearchWorkflow initialTopic={extractedEntity?.name} />
      )}
      
      {currentView === 'REGISTRY' && (
        <RegistrySearch />
      )}
      
      {currentView === 'AUDIT' && (
        <AuditLogViewer />
      )}

      {/* Chat Widget */}
      {currentView !== 'RESEARCH' && <ChatWidget entity={extractedEntity} riskReport={riskReport} />}

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8 animate-in fade-in duration-200">
          <TechCard className="relative w-full max-w-6xl h-[90vh] flex flex-col !p-0 overflow-hidden shadow-2xl" title={`PREVIEW // ${previewFile.name}`}>
            {/* Header Actions */}
            <div className="absolute top-0 right-0 p-2 z-10">
              <button 
                onClick={() => setPreviewFile(null)}
                className="bg-red-50 hover:bg-red-100 text-red-500 p-2 transition-colors border border-red-200 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-slate-50 p-4">
               <DocumentPreview url={previewFile.url} mimeType={previewFile.type} />
            </div>
          </TechCard>
        </div>
      )}
    </AppLayout>
  );
};

export default App;
