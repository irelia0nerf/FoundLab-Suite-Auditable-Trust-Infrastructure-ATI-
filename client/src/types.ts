export enum AnalysisStatus {
  IDLE = 'IDLE',
  PARSING_DOC = 'PARSING_DOC',
  EXTRACTED = 'EXTRACTED',
  ENRICHING = 'ENRICHING',
  ANALYZING_RISK = 'ANALYZING_RISK',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface ExtractedEntity {
  name: string;
  type: 'INDIVIDUAL' | 'ORGANIZATION';
  idNumber?: string;
  address?: string;
  dob?: string;
  nationality?: string;
  documentType?: string;
}

export interface EnrichmentData {
  adverseMedia: Array<{ title: string; url: string; snippet: string }>;
  locationVerification: {
    verified: boolean;
    address: string;
    placeUrl?: string;
    details: string;
  };
}

export interface SanctionsHit {
  source: string;
  status: 'MATCH' | 'CLEAN' | 'POTENTIAL_MATCH';
  details: string;
}

export interface VerificationResult {
  overallStatus: 'CLEAN' | 'FLAGGED';
  checks: SanctionsHit[];
  lastChecked: string;
}

export interface RiskReport {
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  redFlags: string[];
  fatfAlignment: string;
  ofacScreening: string;
  recommendation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// --- Deepsearch / Research Types ---

export enum ResearchMode {
  STANDARD = 'Standard Deep Dive',
  ATI_AUDIT = 'ATI / Compliance Audit',
  VC_KILLSHOT = 'VC Killshot',
  ANTI_HALLUCINATION = 'Anti-Hallucination Strict'
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ResearchStep {
  id: string;
  question: string;
  status: StepStatus;
  findings?: string;
  sources?: Source[];
}

export interface Source {
  title: string;
  uri: string;
  snippet?: string;
  trustScore?: number; // 0-100
  trustReason?: string;
  snapshotHash?: string; // SHA-256 of the content at time of capture
}

export interface Claim {
  text: string;
  confidence: 'Low' | 'Medium' | 'High';
  type: 'Fact' | 'Inference' | 'Prediction';
  counterClaim?: string;
}

export interface VeritasBlock {
  index: number;
  timestamp: string;
  eventId: string; // DecisionID or Sub-event ID
  eventType: 'INGEST' | 'PARSING' | 'ORCHESTRATION' | 'ENGINE_EXEC' | 'CRITIC_VAL' | 'WORM_SEAL';
  dataHash: string;
  previousChainHash: string;
  chainHash: string; // SHA-256(dataHash + previousChainHash)
}

export interface ThoughtProcess {
  consensus_check: string;
  contrarian_inversion: string;
  strategic_analysis: {
    legal_lens: string;
    financial_lens: string;
    technical_lens: string;
  };
  synthesis_plan: string;
  veritas_validation?: string; // Specific to ATI
}

export interface ResearchCapsule {
  id: string; // The primary DecisionID (UUIDv4)
  topic: string;
  mode: ResearchMode;
  date: string;
  plan_steps: string[];
  executiveSummary: string;
  decision_rationale: string;
  claims: Claim[];
  keyInsights: string[];
  risks: string[];
  fullReport: string;
  sources: Source[];
  veritasLedger: VeritasBlock[]; // The immutable audit trail
  thought_process?: ThoughtProcess;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'thinking' | 'veritas' | 'citadel';
}
