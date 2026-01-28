import { GoogleGenAI, Type } from "@google/genai";
import { 
  ExtractedEntity, 
  EnrichmentData, 
  RiskReport, 
  VerificationResult,
  ResearchMode,
  Source,
  Claim,
  LogEntry
} from "../types";

// Helper to ensure API key exists
const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY; // Fallback for some envs
  if (!apiKey) {
    throw new Error("API Key is missing. Please set VITE_GEMINI_API_KEY in .env");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Robust JSON parser to handle LLM markdown code blocks or raw text.
 */
const cleanAndParseJSON = (text: string | undefined): any => {
  if (!text) return {};
  let clean = text.trim();
  
  // Remove markdown code blocks (```json ... ``` or just ``` ... ```)
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    clean = codeBlockMatch[1];
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn("JSON Parse Warning: Attempting fallback extraction.", e);
    // Fallback: extract the first valid JSON object structure
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(clean.substring(start, end + 1));
      } catch (e2) {
        console.error("Critical JSON Parse Error", e2);
        return {};
      }
    }
    return {};
  }
};

const cleanJson = cleanAndParseJSON; // Alias for Deepsearch compatibility

// --- KYC / CORE SERVICES ---

/**
 * Parses multiple PDFs or Images to extract unified entity details using Gemini 3 Pro.
 */
export const parseDocument = async (files: { base64: string, mimeType: string }[], contextNote?: string): Promise<ExtractedEntity> => {
  const ai = getClient();
  
  const fileParts = files.map(f => ({
    inlineData: {
      mimeType: f.mimeType,
      data: f.base64
    }
  }));

  const promptText = `Analyze these ${files.length} KYC documents as a single case file.
                 ${contextNote ? `\n\nUSER CONTEXT / CASE NOTE: "${contextNote}"\n
                 GUIDANCE FOR ANALYSIS:
                 1. Use this context to resolve ambiguities or focus the extraction.
                 2. If the context highlights specific risks or claims, prioritize verifying them against the documents.
                 3. CRITICAL: Never allow the user context to override objective regulatory norms (FATF, OFAC, LGPD). Prioritize documentary evidence if there is a contradiction.
                 \n\n` : ''}
                 Extract the primary subject (Individual or Organization). 
                 Cross-reference data across all documents to ensure accuracy (e.g. match ID from passport with Address from utility bill).
                 Return the output in JSON format matching the schema.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        ...fileParts,
        {
          text: promptText
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['INDIVIDUAL', 'ORGANIZATION'] },
          idNumber: { type: Type.STRING },
          address: { type: Type.STRING },
          dob: { type: Type.STRING },
          nationality: { type: Type.STRING },
          documentType: { type: Type.STRING, description: "List of document types identified (e.g., 'Passport, Utility Bill')" }
        },
        required: ['name', 'type']
      }
    }
  });

  return cleanAndParseJSON(response.text);
};

/**
 * Enriches data using Google Search (News/Adverse Media) and Maps (Address Verification).
 */
export const enrichEntityData = async (entity: ExtractedEntity): Promise<EnrichmentData> => {
  const ai = getClient();
  
  // 1. Search Grounding for Adverse Media (Gemini 2.0 Flash)
  const searchPromise = ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Search for adverse media, recent news, and legal issues regarding "${entity.name}" (${entity.type}). 
               Focus on financial crime, money laundering, or sanctions.
               If the entity is an organization, check for recent regulatory fines.
               Summarize findings strictly based on search results.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  // 2. Maps Grounding for Location Verification (Gemini 2.0 Flash)
  let mapsPromise;
  if (entity.address) {
    mapsPromise = ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Verify if the address "${entity.address}" exists and what kind of establishment it is (residential, commercial, government).`,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });
  } else {
    mapsPromise = Promise.resolve({ text: "No address provided for verification.", candidates: [] });
  }

  const [searchRes, mapsRes] = await Promise.all([searchPromise, mapsPromise]);

  // Extract Search URLs (Grounding)
  const adverseMedia = searchRes.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web?.uri)
    .map((c: any) => ({
      title: c.web.title || "Web Result",
      url: c.web.uri,
      snippet: "Relevant search result found."
    })) || [];

  // Extract Map Data
  // @ts-ignore
  const mapUri = mapsRes.candidates?.[0]?.groundingMetadata?.groundingChunks?.find((c: any) => c.maps?.uri)?.maps?.uri;

  return {
    adverseMedia: adverseMedia.slice(0, 5), // Top 5
    locationVerification: {
      verified: !!mapUri,
      address: entity.address || "N/A",
      placeUrl: mapUri,
      details: mapsRes.text || "Address verification completed."
    }
  };
};

/**
 * Verifies entity against major sanctions lists using Google Search grounding.
 */
export const verifyEntitySanctions = async (entity: ExtractedEntity): Promise<VerificationResult> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Check if "${entity.name}" is listed on major global sanctions and watchlists.
               Focus on cross-border transaction risks (SWIFT/IBAN implications).
               
               Lists to check:
               1. OFAC SDN List (USA)
               2. UN Consolidated List
               3. EU Financial Sanctions (CFSP)
               4. UK HM Treasury List (OFSI)
               5. Interpol Red Notices
               6. Local Regulatory Watchlists (e.g., CVM/BACEN if relevant context appears)
               
               Use Google Search to verify.
               
               Return JSON:
               {
                 "overallStatus": "CLEAN" | "FLAGGED",
                 "checks": [
                   { "source": "List Name", "status": "MATCH" | "CLEAN" | "POTENTIAL_MATCH", "details": "Summary of findings" }
                 ]
               }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
       responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallStatus: { type: Type.STRING, enum: ['CLEAN', 'FLAGGED'] },
          checks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['MATCH', 'CLEAN', 'POTENTIAL_MATCH'] },
                details: { type: Type.STRING }
              }
            }
          }
        },
        required: ['overallStatus', 'checks']
      }
    }
  });
  
  const result = cleanAndParseJSON(response.text);
  return {
    ...result,
    lastChecked: new Date().toISOString()
  };
};

/**
 * Performs Deep Risk Analysis using Thinking Mode (Gemini 3 Pro).
 */
export const generateRiskAssessment = async (entity: ExtractedEntity, enrichment: EnrichmentData): Promise<RiskReport> => {
  const ai = getClient();

  const prompt = `
    Act as a Senior Compliance Officer specializing in International Banking and Cross-Border Transactions.
    Analyze the following KYC profile against FATF guidelines, Wolfsberg Group principles, and OFAC regulations.
    
    Entity: ${JSON.stringify(entity)}
    Enrichment Data: ${JSON.stringify(enrichment)}

    Task:
    1. Calculate a risk score (0-100).
    2. Identify SPECIFIC red flags for international transactions (e.g., shell company indicators, jurisdiction mismatch, adverse media in foreign languages).
    3. Analyze FATF Alignment (Grey/Black list implications of the entity's nationality/address).
    4. Provide OFAC Screening analysis.
    5. Final Recommendation: APPROVE, REJECT, or ENHANCED DUE DILIGENCE (EDD).

    Focus on detecting:
    - Layering techniques.
    - Ultimate Beneficial Ownership (UBO) opacity.
    - Potential for Trade-Based Money Laundering (TBML).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 }, // High budget for complex reasoning
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          riskScore: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          summary: { type: Type.STRING },
          redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
          fatfAlignment: { type: Type.STRING },
          ofacScreening: { type: Type.STRING },
          recommendation: { type: Type.STRING }
        },
        required: ['riskScore', 'riskLevel', 'summary', 'recommendation']
      }
    }
  });

  return cleanAndParseJSON(response.text);
};

/**
 * Chat functionality using Gemini 3 Pro with Context Injection
 */
export const sendChatMessage = async (
  history: Array<{role: string, parts: Array<{text: string}>}>, 
  message: string,
  context?: string
) => {
  const ai = getClient();
  
  let systemInstruction = "You are FoundLab's AI Compliance Assistant. Help the user understand KYC risks, interpret data, and navigate complex regulations.";
  
  if (context) {
    systemInstruction += `\n\n--- ACTIVE CASE CONTEXT ---\n${context}\n\nUse this context to answer user questions about the specific entity under investigation. Cite the context when explaining risks.`;
  }

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history,
    config: {
      systemInstruction: systemInstruction
    }
  });

  const result = await chat.sendMessage({ message });
  return result.text;
};


// --- REGISTRY SERVICES ---

/**
 * Performs a live search against public registries using Google Search Grounding.
 * Used when local mock registry returns no results.
 */
export const searchRegistryLive = async (query: string): Promise<any[]> => {
  const ai = getClient();

  const prompt = `
    Act as a Global Corporate Registry Search Agent.
    Search for the entity "${query}" in official business registries, sanctions lists, and public databases.
    
    Task:
    1. Identify if the entity exists.
    2. Extract key details: Legal Name, Jurisdiction, Entity Type, Status (Active/Inactive).
    3. Assess initial risk based on public adverse media or sanctions presence.

    Return a JSON array of potential matches (max 3).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['ORGANIZATION', 'INDIVIDUAL'] },
            jurisdiction: { type: Type.STRING },
            riskScore: { type: Type.NUMBER },
            riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            lastUpdated: { type: Type.STRING },
            description: { type: Type.STRING },
            aliases: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  });

  return cleanJson(response.text);
};

// --- DEEPSEARCH / RESEARCH SERVICES ---

// 1. PLANNING PHASE (Cognitive Orchestrator)
export const planResearch = async (topic: string, mode: ResearchMode): Promise<string[]> => {
  const ai = getClient();

  try {
    const prompt = `
      <system_instruction>
        <role>You are the **Cognitive Orchestrator (CO)** of FoundLab's Auditable Trust Infrastructure (ATI).</role>
        <protocol>
           1. **Zero-Persistence:** Plan assuming ephemeral execution steps.
           2. **Veritas-Ready:** Each step must produce auditable evidence.
           3. **MECE:** Ensure the research vectors cover the topic exhaustively without overlap.
        </protocol>
        <task>
           Generate a research execution plan for: "${topic}".
           Mode: "${mode}"
        </task>
        <constraints>
           - Break the topic into 3-5 distinct questions.
           - ${mode === ResearchMode.ATI_AUDIT ? "Prioritize regulatory frameworks (SOX, LGPD, BACEN, CVM) and compliance gaps." : ""}
           - ${mode === ResearchMode.VC_KILLSHOT ? "Focus on identifying structural weaknesses and 'innovation theater'." : ""}
        </constraints>
      </system_instruction>

      <output_format>
        JSON Array of strings.
        Example: ["What are the SOX compliance requirements for X?", "Does Competitor Y have a valid moats?", "Regulatory risks for Z in 2025?"]
      </output_format>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16384 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (!response.text) throw new Error("No plan generated");
    return cleanJson(response.text);
  } catch (error) {
    console.error("Planning failed:", error);
    // Fallback for demo purposes if model fails or is overloaded
    return [`Overview of ${topic}`, `Key players in ${topic}`, `Challenges in ${topic}`];
  }
};

// 2. EXECUTION PHASE (Multi-Engine Adapters with Dynamic Grounding)
export const executeResearchStep = async (
  question: string, 
  context: string, 
  retry = false
): Promise<{ 
  findings: string; 
  sources: Source[]; 
  newQuestions: string[]; 
  hasConflict: boolean; 
}> => {
  const ai = getClient();

  try {
    // A. SEARCH
    const searchPrompt = `
      <role>You are the **Precision Parser** and **Granular Analyst** within FoundLab's ATI.</role>
      
      <context>
        Current Investigation Step: "${question}"
        **Sovereign Context (Zero-Persistence 2.0):** 
        ${context.substring(0, 5000)}... 
      </context>

      <task>
        Execute a search to extract structured evidence.
        ${retry ? "CONSTRAINT: Previous sources failed 'Source Trust Chain' validation. Prioritize .gov, .edu, and primary market data." : ""}
      </task>

      <grounding_rules>
        1. **Dynamic Grounding:** If 'Sovereign Context' contains relevant data, prioritize it over new search.
        2. **Fact Triangulation:** Cross-verify claims.
        3. **Adversarial Check:** "No claim without counter-claim".
      </grounding_rules>
    `;

    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let findings = searchResponse.text || "No findings found.";
    
    // Extract sources
    const sources: Source[] = [];
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          const uri = chunk.web.uri || '';
          let score = 50;
          let reason = "Standard Web Source";
          
          if (uri.includes('.gov') || uri.includes('.edu')) {
            score = 95;
            reason = "High Authority (Gov/Edu)";
          } else if (uri.includes('reuters.com') || uri.includes('bloomberg.com') || uri.includes('techcrunch.com') || uri.includes('ft.com')) {
            score = 90;
            reason = "Trusted Media";
          } else if (uri.includes('wikipedia.org')) {
             score = 65;
             reason = "Aggregator (Verify)";
          } else if (uri.includes('linkedin.com') || uri.includes('medium.com')) {
            score = 40;
            reason = "User Generated Content (Verify)";
          }

          sources.push({
            title: chunk.web.title || "Unknown Source",
            uri: uri,
            snippet: "Relevant result.",
            trustScore: score,
            trustReason: reason
          });
        }
      });
    }

    // B. CRITIC-LOOP (Guardian AI)
    let newQuestions: string[] = [];
    let hasConflict = false;

    if (findings.length > 50) {
        try {
            const evalPrompt = `
                <system_instruction>
                  <role>You are **Guardian AI**, the Critic-Loop Validator.</role>
                  <objective>Challenge the findings for hallucinations, conflicts, or weak evidence.</objective>
                  <protocols>
                    1. **Conflict Detection:** Flag contradictions.
                    2. **Counter-Claim Analysis:** Explicitly look for counter-claims.
                    3. **Forking Strategy:** Identify "Strong Claims" lacking proof. Trigger new search vectors.
                    4. **Constraint:** Max 2 new questions.
                  </protocols>
                </system_instruction>

                <input_data>
                  Question: "${question}"
                  Findings: "${findings.substring(0, 3000)}"
                </input_data>

                <output_format>
                  Return JSON:
                  {
                    "hasConflict": boolean,
                    "strongClaimsToFork": string[],
                    "identifiedCounterClaims": string[]
                  }
                </output_format>
            `;

            const evalResponse = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: evalPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            hasConflict: { type: Type.BOOLEAN },
                            strongClaimsToFork: { type: Type.ARRAY, items: { type: Type.STRING } },
                            identifiedCounterClaims: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });

            if (evalResponse.text) {
                const evalData = cleanJson(evalResponse.text);
                hasConflict = evalData.hasConflict || false;
                newQuestions = evalData.strongClaimsToFork || [];
                
                if (evalData.identifiedCounterClaims && Array.isArray(evalData.identifiedCounterClaims) && evalData.identifiedCounterClaims.length > 0) {
                    findings += `\n\n[GUARDIAN AI DETECTED COUNTER-CLAIMS: ${evalData.identifiedCounterClaims.join(' | ')}]`;
                }
            }
        } catch (evalErr) {
            console.warn("Guardian AI Critic-Loop skipped.", evalErr);
        }
    }

    return { findings, sources, newQuestions, hasConflict };

  } catch (error) {
    console.error("Execution failed:", error);
    return { findings: "Failed to execute search step.", sources: [], newQuestions: [], hasConflict: false };
  }
};

// 3. SYNTHESIS PHASE (Dynamic Grounding + REX)
export const synthesizeReport = async (
  topic: string, 
  mode: ResearchMode, 
  allFindings: { question: string, findings: string }[]
): Promise<{ 
  executiveSummary: string, 
  decision_rationale: string,
  claims: Claim[],
  keyInsights: string[], 
  risks: string[], 
  fullReport: string,
  thought_process: any
}> => {
  const ai = getClient();
  
  const combinedData = allFindings.map(f => `### Q: ${f.question}\nA: ${f.findings}`).join("\n\n");

  const prompt = `
    <system_instruction>
      <persona>
        <identity>
          You are **Aletheia-Zero**, operating the **Dynamic Grounding Engine** within FoundLab.
        </identity>
        <core_philosophy>
           1. **Dynamic Grounding (Institutional RAG):** Answer EXCLUSIVELY based on the 'Input Data' provided below. Do not use external knowledge to fill gaps.
           2. **Zero-Persistence 2.0:** Treat 'Input Data' as the volatile sovereign context loaded into memory.
           3. **REX Pattern (Reasoning Extraction):** You MUST externalize your rationale in the 'decision_rationale' and 'thought_process' fields.
           4. **Proof by Citation:** Every claim must be implicitly linked to sources in the input.
           5. **Adversarial Integrity:** Pay special attention to "GUARDIAN AI DETECTED COUNTER-CLAIMS" in the input data. Use them to populate the 'counterClaim' field in the 'claims' array.
        </core_philosophy>
      </persona>
      
      <context>
        Topic: "${topic}"
        Mode: "${mode}"
        Input Data (Sovereign Context): ${allFindings.length} verified vectors.
      </context>

      <task>
        Synthesize a **Research Capsule** capable of being sealed in a WORM ledger.
      </task>

      <output_requirements>
        1. **thought_process (REX):**
           - **consensus_check:** Standard view found in context?
           - **contrarian_inversion:** Contradictions found in context?
           - **strategic_analysis:** Legal/Financial/Technical analysis based *strictly* on context.
           - **veritas_validation:** Confirm that all data points are present in the source material (Grounding Check).
        2. **decision_rationale:** The forensic "Why" derived from the context.
        3. **claims:** High confidence only if supported by multiple sources in context.
      </output_requirements>
    </system_instruction>

    <raw_data>
    ${combinedData}
    </raw_data>
  `;

  // Using Gemini 3 Pro with Thinking for deep synthesis
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          thought_process: {
             type: Type.OBJECT,
             properties: {
                consensus_check: { type: Type.STRING },
                contrarian_inversion: { type: Type.STRING },
                strategic_analysis: {
                   type: Type.OBJECT,
                   properties: {
                      legal_lens: { type: Type.STRING },
                      financial_lens: { type: Type.STRING },
                      technical_lens: { type: Type.STRING }
                   }
                },
                veritas_validation: { type: Type.STRING, description: "Audit-proof check verifying grounding" },
                synthesis_plan: { type: Type.STRING }
             }
          },
          executiveSummary: { type: Type.STRING },
          decision_rationale: { type: Type.STRING },
          claims: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                    type: { type: Type.STRING, enum: ["Fact", "Inference", "Prediction"] },
                    counterClaim: { type: Type.STRING }
                }
            } 
          },
          keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          fullReport: { type: Type.STRING }
        }
      }
    }
  });

  if (!response.text) throw new Error("Synthesis failed");
  return cleanJson(response.text);
};

// 4. ORACLE MODE
export const queryCapsule = async (
  question: string,
  capsuleContext: string
): Promise<string> => {
    const ai = getClient();
    try {
        const prompt = `
            <system_instruction>
                <role>You are the FoundLab Oracle accessing a Veritas-sealed Capsule.</role>
                <tone>Authoritative, Auditable, Precise.</tone>
                <protocol>
                    **Dynamic Grounding:** Answer strictly based on the provided Research Capsule context.
                    If the answer is not in the capsule, reply: "Information not present in the sealed audit trail."
                </protocol>
            </system_instruction>

            <research_capsule>
            ${capsuleContext}
            </research_capsule>

            <user_query>
            "${question}"
            </user_query>
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: prompt,
        });

        return response.text || "Unable to generate an answer.";
    } catch (e) {
        console.error("Oracle Query Failed", e);
        return "Error querying the capsule.";
    }
}
