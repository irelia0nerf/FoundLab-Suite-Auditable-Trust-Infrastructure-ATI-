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
  Microscope // Icon for Research
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

type AppView = 'WORKFLOW' | 'REGISTRY' | 'AUDIT' | 'RESEARCH';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  // Navigation Helper
  const changeView = (view: AppView) => {
    setCurrentView(view);
    auditService.log('USER_ACTION', 'Navigation Changed', { to: view });
  };

  // Helper to handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(AnalysisStatus.PARSING_DOC);
    setError(null);
    
    auditService.log('USER_ACTION', 'Document Upload Started', { fileName: file.name, type: file.type, size: file.size });

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        // Store preview data
        setPreviewUrl(result);
        setFileType(file.type);

        const base64String = result.split(',')[1];
        try {
          const entity = await geminiService.parseDocument(base64String, file.type);
          setExtractedEntity(entity);
          setStatus(AnalysisStatus.EXTRACTED);
          auditService.log('SYSTEM_EVENT', 'Document Parsed Successfully', { entityName: entity.name, entityType: entity.type });
        } catch (err) {
          console.error(err);
          const errorMsg = "Failed to parse document using Gemini. Please try again.";
          setError(errorMsg);
          setStatus(AnalysisStatus.ERROR);
          auditService.log('ERROR', 'Document Parsing Failed', { error: String(err) });
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Error reading file.");
      setStatus(AnalysisStatus.ERROR);
      auditService.log('ERROR', 'File Read Error', { error: String(e) });
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
  }, []);

  const handleDownloadReport = () => {
    if (extractedEntity && enrichmentData && riskReport) {
      pdfService.generatePDFReport(extractedEntity, enrichmentData, riskReport);
      auditService.log('USER_ACTION', 'Report Downloaded', { entity: extractedEntity.name });
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-brand-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2 border-b border-slate-800">
          <ShieldCheck className="text-brand-500" size={28} />
          <span className="text-xl font-bold tracking-tight text-white">FoundLab | ATI</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div 
            onClick={() => changeView('WORKFLOW')}
            className={`px-4 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
              currentView === 'WORKFLOW' 
                ? 'bg-brand-900/20 text-brand-400 border border-brand-900/50' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <FileText size={18} />
            <span className="font-medium">Optical Sieve (KYC)</span>
          </div>
          
          <div 
            onClick={() => changeView('RESEARCH')}
            className={`px-4 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
              currentView === 'RESEARCH' 
                ? 'bg-brand-900/20 text-brand-400 border border-brand-900/50' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Microscope size={18} />
            <span>Cognitive DeepSearch</span>
          </div>

          <div 
            onClick={() => changeView('REGISTRY')}
            className={`px-4 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
              currentView === 'REGISTRY' 
                ? 'bg-brand-900/20 text-brand-400 border border-brand-900/50' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Search size={18} />
            <span>Global Registry</span>
          </div>
          <div 
            onClick={() => changeView('AUDIT')}
            className={`px-4 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
              currentView === 'AUDIT' 
                ? 'bg-brand-900/20 text-brand-400 border border-brand-900/50' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Activity size={18} />
            <span>Veritas Ledger</span>
          </div>
          <div className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg flex items-center gap-3 cursor-pointer">
            <BrainCircuit size={18} />
            <span>Compliance Rules</span>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500">Powered by Gemini 3.0 • Veritas Protocol Active</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-950">
        {currentView !== 'RESEARCH' && (
          <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-8">
            <h1 className="text-lg font-medium text-white">
              {currentView === 'WORKFLOW' ? 'Optical Sieve: Due Diligence Workflow' : 
               currentView === 'REGISTRY' ? 'Global Registry Search' : 'Veritas Audit Logs'}
            </h1>
            <div className="flex items-center gap-4">
               {currentView === 'WORKFLOW' && status === AnalysisStatus.COMPLETE && (
                 <>
                   <button 
                    onClick={handleDownloadReport} 
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                   >
                     <Download size={14} />
                     Download Report
                   </button>
                   <button onClick={reset} className="text-sm text-slate-400 hover:text-white underline ml-2">Start New</button>
                 </>
               )}
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs font-bold">FL</div>
            </div>
          </header>
        )}

        {currentView === 'RESEARCH' ? (
          <ResearchWorkflow />
        ) : currentView === 'REGISTRY' ? (
          <RegistrySearch />
        ) : currentView === 'AUDIT' ? (
          <AuditLogViewer />
        ) : (
          /* WORKFLOW VIEW */
          <div className="p-8 max-w-6xl mx-auto space-y-8">
            
            {/* Status Tracker */}
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
               {[
                 { id: AnalysisStatus.IDLE, label: 'Upload' },
                 { id: AnalysisStatus.EXTRACTED, label: 'Extraction' },
                 { id: AnalysisStatus.ENRICHING, label: 'Deep Search' },
                 { id: AnalysisStatus.COMPLETE, label: 'Risk Report' }
               ].map((step, idx, arr) => {
                 const isActive = status === step.id || Object.values(AnalysisStatus).indexOf(status) > Object.values(AnalysisStatus).indexOf(step.id);
                 return (
                   <div key={step.id} className="flex items-center gap-2">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                       isActive ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-500'
                     }`}>
                       {idx + 1}
                     </div>
                     <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</span>
                     {idx < arr.length - 1 && <ChevronRight size={16} className="text-slate-700 ml-4" />}
                   </div>
                 );
               })}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-3">
                <AlertTriangle size={20} />
                {error}
              </div>
            )}

            {/* Step 1: Upload */}
            {status === AnalysisStatus.IDLE && (
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-brand-500/50 hover:bg-brand-900/5 transition-all">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-brand-500">
                  <UploadCloud size={32} />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Upload KYC Document</h2>
                <p className="text-slate-400 max-w-md mb-6">
                  Drag and drop or select a Passport, ID, or Business Registration. 
                  Supports PDF and Images. Powered by Gemini Multimodal Parsing.
                </p>
                <label className="cursor-pointer bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Select Document
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                </label>
              </div>
            )}

            {/* Processing State */}
            {(status === AnalysisStatus.PARSING_DOC || status === AnalysisStatus.ENRICHING || status === AnalysisStatus.ANALYZING_RISK) && (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                 <div className="relative">
                   <Loader size={48} className="text-brand-500 animate-spin mb-6" />
                   {status === AnalysisStatus.ANALYZING_RISK && (
                     <div className="absolute top-0 right-0 -mt-2 -mr-2">
                       <span className="flex h-3 w-3">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                       </span>
                     </div>
                   )}
                 </div>
                 
                 <h3 className="text-xl font-medium text-white tracking-tight">
                   {status === AnalysisStatus.PARSING_DOC && "Parsing Document with Gemini Vision..."}
                   {status === AnalysisStatus.ENRICHING && "Agents searching web & registries..."}
                   {status === AnalysisStatus.ANALYZING_RISK && "Reasoning Engine Active..."}
                 </h3>
                 <p className="text-slate-500 mt-2 text-sm max-w-sm text-center">
                   {status === AnalysisStatus.PARSING_DOC && "Extracting unstructured entities via multimodal OCR."}
                   {status === AnalysisStatus.ENRICHING && "Performing cross-reference checks against global adverse media and maps grounding."}
                   {status === AnalysisStatus.ANALYZING_RISK && "Applying FATF & OFAC logic to determine final risk score."}
                 </p>
              </div>
            )}

            {/* Step 2: Extraction Review */}
            {status === AnalysisStatus.EXTRACTED && extractedEntity && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Left Column: Document Preview */}
                <DocumentPreview url={previewUrl} mimeType={fileType} />

                {/* Right Column: Data & Actions */}
                <div className="space-y-6">
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-brand-400" />
                      Extracted Data
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Entity Name</span>
                        <p className="text-lg text-white font-medium">{extractedEntity.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 uppercase tracking-wider">Type</span>
                          <p className="text-slate-300">{extractedEntity.type}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 uppercase tracking-wider">ID Number</span>
                          <p className="text-slate-300">{extractedEntity.idNumber || "N/A"}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Address</span>
                        <p className="text-slate-300">{extractedEntity.address || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-brand-900/20 border border-brand-500/30 rounded-lg w-full">
                    <h4 className="font-medium text-brand-300 mb-2">Ready for Agentic Enrichment</h4>
                    <ul className="text-sm text-slate-400 space-y-2 mb-4">
                      <li className="flex items-center gap-2"><Globe size={14} /> Global Adverse Media Search</li>
                      <li className="flex items-center gap-2"><MapPin size={14} /> Address Verification via Maps</li>
                      <li className="flex items-center gap-2"><ShieldCheck size={14} /> OFAC/Sanctions Screening</li>
                    </ul>
                    <button 
                      onClick={handleEnrichment}
                      className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-900/50"
                    >
                      <Search size={18} />
                      Run Deep Search & Analyze
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Final Report */}
            {status === AnalysisStatus.COMPLETE && riskReport && enrichmentData && (
              <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Score Card */}
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                     <div>
                       <h3 className="text-sm text-slate-400 font-medium uppercase mb-4">Risk Assessment</h3>
                       <RiskChart score={riskReport.riskScore} />
                     </div>
                     <div className="text-center mt-[-20px] mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          riskReport.riskLevel === 'CRITICAL' || riskReport.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                          riskReport.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {riskReport.riskLevel} RISK
                        </span>
                     </div>
                  </div>

                  {/* External Verification Section */}
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col animate-in fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium flex items-center gap-2">
                        <Database size={18} className="text-brand-400" />
                        External Database Verification
                      </h3>
                      {!verificationResult && !isVerifying && (
                        <button 
                          onClick={handleVerification}
                          className="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shadow-lg shadow-brand-900/20"
                        >
                          <Search size={12} />
                          Run Check
                        </button>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      {!verificationResult && !isVerifying && (
                        <div className="text-center text-slate-500 py-8">
                          <p className="text-sm">Verify entity against OFAC, UN, and EU sanctions lists.</p>
                        </div>
                      )}

                      {isVerifying && (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400 text-sm py-8">
                          <Loader size={24} className="animate-spin text-brand-500" />
                          <span>Querying Global Sanctions Databases...</span>
                        </div>
                      )}

                      {verificationResult && (
                        <div className="space-y-4">
                          <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                            verificationResult.overallStatus === 'CLEAN' 
                              ? 'bg-green-500/10 border-green-500/30 text-green-300' 
                              : 'bg-red-500/10 border-red-500/30 text-red-300'
                          }`}>
                            {verificationResult.overallStatus === 'CLEAN' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <span className="font-semibold text-sm">
                              {verificationResult.overallStatus === 'CLEAN' 
                                ? "No Matches Found" 
                                : "Potential Matches Found"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
                            {verificationResult.checks.map((check, idx) => (
                              <div key={idx} className="bg-slate-800 p-2.5 rounded border border-slate-700">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-slate-300">{check.source}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    check.status === 'CLEAN' ? 'bg-green-500/20 text-green-400' : 
                                    check.status === 'MATCH' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {check.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 line-clamp-1">{check.details}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-right text-slate-600">
                            Checked: {new Date(verificationResult.lastChecked).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enrichment Data (Full Width) */}
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 md:col-span-2">
                    <h3 className="text-sm text-slate-400 font-medium uppercase mb-4">Agent Findings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                          <MapPin size={16} className="text-blue-400" /> Location Grounding
                        </h4>
                        <div className="text-sm text-slate-300 bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                          <p className="font-medium text-slate-200">{enrichmentData.locationVerification.address}</p>
                          <p className={`mt-1 ${enrichmentData.locationVerification.verified ? 'text-green-400' : 'text-yellow-400'}`}>
                            {enrichmentData.locationVerification.verified ? 'Verified Entity Location' : 'Location Unverified'}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">{enrichmentData.locationVerification.details}</p>
                          {enrichmentData.locationVerification.placeUrl && (
                            <a href={enrichmentData.locationVerification.placeUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline mt-1 block">
                              View on Google Maps
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                          <Globe size={16} className="text-purple-400" /> Search Grounding
                        </h4>
                        <div className="space-y-2">
                          {enrichmentData.adverseMedia.length > 0 ? (
                            enrichmentData.adverseMedia.slice(0, 2).map((media, i) => (
                              <a key={i} href={media.url} target="_blank" rel="noreferrer" className="block bg-slate-800 p-2 rounded hover:bg-slate-700 transition border border-slate-700/50">
                                <p className="text-xs font-medium text-brand-300 truncate">{media.title}</p>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{media.snippet}</p>
                              </a>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">No significant adverse media found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logic & Reasoning */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2 mb-6">
                    <BrainCircuit className="text-brand-500" />
                    <h3 className="text-lg font-semibold text-white">Compliance Logic Analysis</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                      <p className="text-slate-200 leading-relaxed">{riskReport.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-800 pt-6">
                      <div>
                        <h4 className="text-sm text-slate-400 uppercase tracking-wider mb-2">FATF Alignment</h4>
                        <p className="text-sm text-slate-300">{riskReport.fatfAlignment}</p>
                      </div>
                      <div>
                        <h4 className="text-sm text-slate-400 uppercase tracking-wider mb-2">OFAC Screening</h4>
                        <p className="text-sm text-slate-300">{riskReport.ofacScreening}</p>
                      </div>
                    </div>

                    {riskReport.redFlags.length > 0 && (
                       <div className="bg-red-500/10 border border-red-900/50 rounded-lg p-4">
                         <h4 className="text-red-300 font-medium mb-2 flex items-center gap-2">
                           <AlertTriangle size={16} /> Detected Red Flags
                         </h4>
                         <ul className="list-disc list-inside text-sm text-red-200/80 space-y-1">
                           {riskReport.redFlags.map((flag, i) => (
                             <li key={i}>{flag}</li>
                           ))}
                         </ul>
                       </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                      <div className="text-right">
                         <span className="text-xs text-slate-500 uppercase">Final Recommendation</span>
                         <p className={`text-xl font-bold ${
                           riskReport.recommendation.toLowerCase().includes('approve') ? 'text-green-400' : 'text-yellow-400'
                         }`}>
                           {riskReport.recommendation}
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Chat Widget */}
      {currentView !== 'RESEARCH' && <ChatWidget entity={extractedEntity} riskReport={riskReport} />}
    </div>
  );
};

export default App;
