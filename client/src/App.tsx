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
    setPreviewUrl(null);
    setFileType(null);
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
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden relative">
      {/* Camada de Grid de Fundo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Sidebar "Rackmount" */}
      <aside className="w-72 bg-[#0a0a0c] border-r border-tech-border flex flex-col z-20 shadow-2xl hidden md:flex">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-tech-border bg-slate-900/20 overflow-hidden">
            <img 
               src="https://lh3.googleusercontent.com/rd-gg-dl/AOI_d_-oGg7HUwy29H4C8Xqu_71f4aeyKncna9CYe32xx37zX0QqfB_0bKZjCd-Jej5YuVzI8Mp2iYsJkxfYYOpx5YQmwisFmPmQx76SQVKzaqYwifcOJfu7l1A8QrGX8VEQZOnD9X_3ZwLw-saFtjS9xHLwKBw2kVaUkDpjq6KdXIlRq7rR0fRoh-zfwU4pL8QStBYRwEKe0G302oqms-2RUklTllxe8ez927t4rdfAPxMCgYu9doYlKasRr0Aa-1WYvyUD7mNxMzUScBe08LXht_x-K4KerOLFGqhyxuYz57Y7ZD2u5HN3dz5deheiQlrs8wMEshvizSnibRLevnA5uuVJUi8P_zZ0x_T-D4tlHfE9XuB5xNznTfPuQMJUyOWWX1RNHUW0ePZGrhd4pd-6QhZNEteN_rqhANuLBkt3gLt5xr4g54cwhzVTrSAGsPOLI6xdhXCmJJRwoFr2pT-Tvcuuj4pjrtK6u1Po9oYJwfhM8oylQqZCQcMqCubBeTEw_9nThPsZINFOKoOI5hXAnOYgz68mYukpYv_3mbo_nTTVMRpZNH4d_u_C1g4MPBi2Wug90WmB2kWvwrtdt9TBWi3Hm5Xh-KR26zFaYQ7Ks8mBGPOlpuRqKbOOxR2L9UtBBKwotX1oxHnDqU9Kf-35udf5jzL0R0Og8nbNVRi2483ZVlMiL7TME5VRpcENiyUya8aWlZT2SB9jnxYvqLm0pkLhPSiLV5-y41lofPqX7Njp02DiRDE13LMExHfhKAC8oqeYyykiDHuOIru9eRJOu42vwP6uzdrHOSdnWEj3mi0xePs8EQ1hT8uLMZIRvZm3m0LVhYoQYQ2g2CDU91ls6YiFcd82yEsEC1lT8MyjtjOHxl_vQfh_tOl0t8LTOxI-GHrxGjnNiF3ofa-6v8Ot-DdmoMcoddZxM9AXttZmCkkA-P6YWW6w5uhtSZjmgUIwV_KTIgrLp3h70Iih_EO-Ye3FbXQH_Egg7SWi3BLwR2yjTL0AJz_bIOcW4v40EexYIgEzHsp9t3xyxGi1UQNp-yPOSJQkVuLHN8bOznSuQ8yLTk6Y7ahFizSTE817kzg8Jq1o6p5-E77hSxcBDb7tE9Q6ckw-L7v_KglthJqwIvecEz9Pikh8KZrKsKpqV3iYNq_VNLgkj2v4c-EFWRQC7b1w92Rfe38tIbwKUHEquAoaCMNoMNhA4uxPXDK-yZ5XRW7WdAa0rUf1GG9K8K101INGPjw=s1024-rj" 
               alt="FoundLab Logo" 
               className="h-10 w-auto object-contain"
            />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
            <div 
            onClick={() => changeView('WORKFLOW')}
            className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
                currentView === 'WORKFLOW' 
                ? 'bg-slate-900 border-signal-success text-signal-success' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
            >
            <FileText size={18} className={currentView === 'WORKFLOW' ? "text-cyan-400 shadow-[0_0_10px_cyan]" : ""} />
            <div className="flex flex-col">
                <span className="font-medium text-sm tracking-wide">Optical Sieve</span>
                <span className="text-[10px] font-mono opacity-50 group-hover:opacity-80">MODULE_KYC_01</span>
            </div>
            </div>

            <div 
            onClick={() => changeView('RESEARCH')}
            className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
                currentView === 'RESEARCH' 
                ? 'bg-slate-900 border-signal-success text-signal-success' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
            >
            <Microscope size={18} className={currentView === 'RESEARCH' ? "text-cyan-400 shadow-[0_0_10px_cyan]" : ""} />
            <div className="flex flex-col">
                <span className="font-medium text-sm tracking-wide">Cognitive DeepSearch</span>
                <span className="text-[10px] font-mono opacity-50 group-hover:opacity-80">MODULE_INTEL_04</span>
            </div>
            </div>

            <div 
            onClick={() => changeView('REGISTRY')}
            className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
                currentView === 'REGISTRY' 
                ? 'bg-slate-900 border-signal-success text-signal-success' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
            >
            <Search size={18} className={currentView === 'REGISTRY' ? "text-cyan-400 shadow-[0_0_10px_cyan]" : ""} />
            <div className="flex flex-col">
                <span className="font-medium text-sm tracking-wide">Global Registry</span>
                <span className="text-[10px] font-mono opacity-50 group-hover:opacity-80">MODULE_REG_09</span>
            </div>
            </div>

            <div 
            onClick={() => changeView('AUDIT')}
            className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-all border-l-2 ${
                currentView === 'AUDIT' 
                ? 'bg-slate-900 border-signal-success text-signal-success' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
            }`}
            >
            <Activity size={18} className={currentView === 'AUDIT' ? "text-cyan-400 shadow-[0_0_10px_cyan]" : ""} />
            <div className="flex flex-col">
                <span className="font-medium text-sm tracking-wide">Veritas Ledger</span>
                <span className="text-[10px] font-mono opacity-50 group-hover:opacity-80">MODULE_AUDIT_V1</span>
            </div>
            </div>
            <div className="px-4 py-2 text-slate-500 hover:bg-slate-900/50 rounded-lg flex items-center gap-3 cursor-pointer mt-4">
               <BrainCircuit size={18} />
               <span className="font-mono text-xs">COMPLIANCE_RULES</span>
            </div>
        </nav>
        
        <div className="p-4 border-t border-tech-border bg-slate-900/20">
            {/* Google Partner Badge */}
            <div className="mb-4 flex justify-start">
               <img 
                 src="https://www.foundlab.com.br/google_select_badge.png" 
                 alt="Google Cloud Partner" 
                 className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity" 
               />
            </div>

            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-signal-success animate-pulse"></div>
                <span className="text-[10px] font-mono text-cyan-500">SYSTEM_OPTIMAL</span>
            </div>
            <div className="text-[10px] text-slate-600 font-mono">
                SECURE CONNECTION<br/>
                AES-256-GCM
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-transparent z-10">
        {currentView !== 'RESEARCH' && (
          <header className="h-16 border-b border-tech-border bg-slate-950/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-8">
            <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-cyan-500"></div>
                <h1 className="text-lg font-medium text-white tracking-wide">
                {currentView === 'WORKFLOW' ? 'OPTICAL SIEVE // EXECUTION' : 
                currentView === 'REGISTRY' ? 'GLOBAL REGISTRY // QUERY' : 'VERITAS // AUDIT LOG'}
                </h1>
            </div>
            
            <div className="flex items-center gap-4">
               {currentView === 'WORKFLOW' && status === AnalysisStatus.COMPLETE && (
                 <>
                   <button 
                    onClick={handleDownloadReport} 
                    className="flex items-center gap-2 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 text-sm font-mono transition-colors"
                   >
                     <Download size={14} />
                     EXPORT_REPORT
                   </button>
                   <button onClick={reset} className="text-sm font-mono text-slate-500 hover:text-cyan-400 transition-colors ml-2">[ RESET_SESSION ]</button>
                 </>
               )}
            </div>
          </header>
        )}

        {currentView === 'RESEARCH' ? (
          <ResearchWorkflow initialTopic={extractedEntity?.name} />
        ) : currentView === 'REGISTRY' ? (
          <RegistrySearch />
        ) : currentView === 'AUDIT' ? (
          <AuditLogViewer />
        ) : (
          /* WORKFLOW VIEW */
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Status Tracker */}
            <TechCard className="!p-4">
                <div className="flex items-center justify-between overflow-x-auto">
                {[
                    { id: AnalysisStatus.IDLE, label: 'DATA_INGEST' },
                    { id: AnalysisStatus.EXTRACTED, label: 'OCR_EXTRACTION' },
                    { id: AnalysisStatus.ENRICHING, label: 'INTEL_ENRICHMENT' },
                    { id: AnalysisStatus.COMPLETE, label: 'RISK_ASSESSMENT' }
                ].map((step, idx, arr) => {
                    const isActive = status === step.id || Object.values(AnalysisStatus).indexOf(status) > Object.values(AnalysisStatus).indexOf(step.id);
                    const isPast = Object.values(AnalysisStatus).indexOf(status) > Object.values(AnalysisStatus).indexOf(step.id);
                    
                    return (
                    <div key={step.id} className="flex items-center gap-2 min-w-fit">
                        <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono border transition-colors ${
                        isActive || isPast ? 'bg-cyan-950 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-600'
                        }`}>
                        {idx + 1}
                        </div>
                        <span className={`text-xs font-mono uppercase tracking-wider ${isActive || isPast ? 'text-cyan-400' : 'text-slate-600'}`}>{step.label}</span>
                        {idx < arr.length - 1 && <div className={`h-px w-8 hidden md:block ${isActive || isPast ? 'bg-cyan-900' : 'bg-slate-800'}`}></div>}
                    </div>
                    );
                })}
                </div>
            </TechCard>

            {/* Error Banner */}
            {error && (
               <TechCard variant="alert" title="SYSTEM_ERROR">
                  <div className="flex items-center gap-3 text-red-400">
                     <AlertTriangle size={20} />
                     <span className="font-mono">{error}</span>
                  </div>
               </TechCard>
            )}

            {/* Step 1: Upload */}
            {status === AnalysisStatus.IDLE && (
              <div className="border border-dashed border-slate-700 bg-slate-900/20 p-12 flex flex-col items-center justify-center text-center hover:border-cyan-500/30 hover:bg-cyan-950/5 transition-all relative overflow-hidden group">
                 {/* Corner decorations */}
                 <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-slate-600 group-hover:border-cyan-500 transition-colors"></div>
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-slate-600 group-hover:border-cyan-500 transition-colors"></div>
                
                <div className="w-16 h-16 bg-slate-900 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  <UploadCloud size={32} />
                </div>
                <h2 className="text-xl font-mono text-slate-300 mb-2 tracking-wide uppercase">Ingest Source Material</h2>
                <p className="text-slate-500 font-mono text-xs max-w-md mb-8">
                  SUPPORTED_FORMATS: PDF, JPG, PNG // MAX_BATCH: 10
                </p>
                <label className="cursor-pointer bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 hover:border-cyan-500 px-8 py-3 font-mono text-sm tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  [ SELECT_FILES ]
                  <input type="file" multiple className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                </label>
            
            {files.length > 0 && (
              <div className="mt-12 w-full max-w-3xl">
                 <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <FileText size={14} className="text-cyan-500" />
                    <span className="font-mono text-xs text-cyan-500 uppercase">Buffer Contents ({files.length})</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    {files.map((file, index) => (
                        <div key={index} className="bg-slate-950 p-2 border border-slate-800 flex items-start gap-3 relative group">
                            <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                className="absolute top-2 right-2 text-slate-600 hover:text-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>

                            <div 
                                className="h-16 w-16 bg-black border border-slate-800 cursor-pointer p-1"
                                onClick={() => setPreviewFile({ url: file.preview, type: file.type, name: file.name })}
                            >
                                {file.type.includes('image') ? (
                                    <img src={file.preview} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" alt="preview" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">PDF</div>
                                )}
                            </div>
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="font-mono text-xs text-slate-300 truncate w-40">{file.name}</span>
                                <span className="font-mono text-[10px] text-slate-600 uppercase">{file.type}</span>
                                <span className="font-mono text-[10px] text-emerald-600 mt-1">READY_TO_PARSE</span>
                            </div>
                        </div>
                    ))}
                 </div>
                 
                 <div className="mt-6 flex flex-col gap-4">
                    <textarea
                        placeholder="ADD_CONTEXT_NOTES (OPTIONAL) // ENTITY_RELATIONSHIPS..."
                        className="w-full bg-black border border-slate-800 text-slate-300 p-4 font-mono text-sm focus:border-cyan-500 focus:outline-none placeholder:text-slate-700 min-h-[100px]"
                        value={contextNote}
                        onChange={(e) => setContextNote(e.target.value)}
                    />
                    
                    <button 
                        onClick={startParsing}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-4 font-mono tracking-widest hover:shadow-[0_0_20px_cyan] transition-all"
                    >
                        INITIATE_OPTICAL_SIEVE_SEQUENCE
                    </button>
                 </div>
              </div>
            )}
              </div>
            )}

            {/* PROCESSING STATES */}
            {(status === AnalysisStatus.PARSING_DOC || status === AnalysisStatus.ENRICHING || status === AnalysisStatus.ANALYZING_RISK) && (
               <ConsoleLoader />
            )}

            {/* RESULTS VIEW */}
            {status === AnalysisStatus.COMPLETE && extractedEntity && (
               <div className="space-y-6">
                  {/* Entity Header */}
                  <TechCard title="TARGET_ENTITY_DESIGNATOR" variant="success">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-mono text-2xl text-cyan-400 tracking-tight mb-2">
                                {extractedEntity.name}
                            </div>
                            <div className="flex gap-4">
                                <div className="font-mono text-xs text-slate-500">
                                    TYPE: <span className="text-slate-300 uppercase">{extractedEntity.type}</span>
                                </div>
                                <div className="font-mono text-xs text-slate-500">
                                    ID: <span className="text-slate-300">{extractedEntity.idNumber || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-[10px] text-slate-500 mb-1">CONFIDENCE_SCORE</div>
                            <div className="text-xl font-mono text-emerald-400">98.4%</div>
                        </div>
                    </div>
                  </TechCard>

                  {/* Rest of the results (Grid Layout) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Enriched Data */}
                      <TechCard title="INTEL_ENRICHMENT_DATA">
                          <div className="space-y-4">
                              <div>
                                  <div className="text-[10px] text-slate-500 font-mono mb-1">VERIFIED_LOCATION</div>
                                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                                      <MapPin size={12} className={enrichmentData?.locationVerification?.verified ? "text-emerald-500" : "text-amber-500"} />
                                      {enrichmentData?.locationVerification?.address || "UNKNOWN_COORDINATES"}
                                  </div>
                              </div>
                              <div className="border-t border-slate-800 pt-3">
                                  <div className="text-[10px] text-slate-500 font-mono mb-1">ADVERSE_MEDIA_HITS</div>
                                  <div className="font-mono text-sm text-amber-500">
                                      {enrichmentData?.adverseMedia?.length || 0} RECORDS_FOUND
                                  </div>
                              </div>
                          </div>
                      </TechCard>

                      {/* Risk Assessment */}
                      {riskReport && (
                          <TechCard title="RISK_MATRIX_EVALUATION" variant={riskReport.riskLevel === 'HIGH' ? 'alert' : 'default'}>
                             <div className="flex items-center gap-4 mb-4">
                                <div className={`text-4xl font-bold font-mono ${
                                    riskReport.riskLevel === 'HIGH' ? 'text-red-500' : 
                                    riskReport.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                                }`}>
                                    {riskReport.riskScore}/100
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 font-mono uppercase">THREAT_LEVEL</span>
                                    <span className={`text-lg font-mono tracking-widest ${
                                        riskReport.riskLevel === 'HIGH' ? 'text-red-500' : 
                                        riskReport.riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>{riskReport.riskLevel}</span>
                                </div>
                             </div>
                             <p className="font-mono text-xs text-slate-400 leading-relaxed border-l-2 border-slate-800 pl-3">
                                {riskReport.summary}
                             </p>
                          </TechCard>
                      )}
                  </div>
                  
                  {/* Reuse existing components inside TechCards or styled containers */}
                  <TechCard title="DEEP_DIVE_ANALYSIS">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div>
                            <div className="font-mono text-xs text-slate-500 mb-2">FATF_ALIGNMENT</div>
                            <p className="text-sm text-slate-300">{riskReport.fatfAlignment}</p>
                         </div>
                         <div>
                            <div className="font-mono text-xs text-slate-500 mb-2">OFAC_SCREENING</div>
                            <p className="text-sm text-slate-300">{riskReport.ofacScreening}</p>
                         </div>
                      </div>
                      
                      {riskReport.redFlags.length > 0 && (
                         <div className="mt-4 p-4 border border-red-500/20 bg-red-500/5">
                            <div className="font-mono text-xs text-red-400 mb-2 uppercase">DETECTED_RED_FLAGS</div>
                            <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
                                {riskReport.redFlags.map((flag, i) => (
                                    <li key={i}>{flag}</li>
                                ))}
                            </ul>
                         </div>
                      )}
                      
                      <div className="mt-6 flex justify-end">
                         <button 
                            onClick={handleDownloadReport} 
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 font-mono text-xs flex items-center gap-2 border border-slate-600"
                         >
                            <Download size={14} /> GENERATE_PDF_REPORT
                         </button>
                      </div>
                  </TechCard>
               </div>
            )}
            
            {/* Step 2 Review - Extracted Entity (Legacy/Transitioned UI) */}
            {status === AnalysisStatus.EXTRACTED && extractedEntity && (
               <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <TechCard title="OCR_EXTRACTION_REVIEW">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-2">
                                {files.map((f, idx) => (
                                    <div key={idx} className="bg-slate-900/50 p-2 border border-slate-800">
                                        <div className="h-32 bg-black rounded overflow-hidden mb-2">
                                            {f.type.includes('image') ? (
                                                <img src={f.preview} className="w-full h-full object-cover opacity-60" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700">PDF</div>
                                            )}
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-500 truncate">{f.name}</div>
                                    </div>
                                ))}
                             </div>
                         </div>
                         
                         <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Entity Name</div>
                                    <div className="text-lg text-white font-mono bg-slate-900 px-3 py-2 border border-slate-800">{extractedEntity.name}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-mono uppercase">Type</div>
                                        <div className="text-sm text-slate-300 font-mono bg-slate-900 px-3 py-2 border border-slate-800">{extractedEntity.type}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-mono uppercase">ID Number</div>
                                        <div className="text-sm text-slate-300 font-mono bg-slate-900 px-3 py-2 border border-slate-800">{extractedEntity.idNumber || "N/A"}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Address</div>
                                    <div className="text-sm text-slate-300 font-mono bg-slate-900 px-3 py-2 border border-slate-800">{extractedEntity.address || "N/A"}</div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleEnrichment}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold py-3 font-mono tracking-widest hover:shadow-[0_0_20px_cyan] transition-all flex items-center justify-center gap-2"
                            >
                                <Search size={18} />
                                EXECUTE_DEEP_SEARCH
                            </button>
                         </div>
                      </div>
                  </TechCard>
               </div>
            )}
          </div>
        )}
      </main>

      {/* Chat Widget */}
      {currentView !== 'RESEARCH' && <ChatWidget entity={extractedEntity} riskReport={riskReport} />}

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-8 animate-in fade-in duration-200">
          <TechCard className="relative w-full max-w-6xl h-[90vh] flex flex-col !p-0 overflow-hidden" title={`PREVIEW // ${previewFile.name}`}>
            {/* Header Actions */}
            <div className="absolute top-0 right-0 p-2 z-10">
              <button 
                onClick={() => setPreviewFile(null)}
                className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 transition-colors border border-red-500/50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-slate-950/50 p-4">
               <DocumentPreview url={previewFile.url} mimeType={previewFile.type} />
            </div>
          </TechCard>
        </div>
      )}
    </div>
  );
};

export default App;
