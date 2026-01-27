# FoundLab Suite: AI Agent Instructions

## 🧠 Project Context
**FoundLab Suite** is an Auditable Trust Infrastructure (ATI) composed of two sovereign domains:
1.  **Client (Cognitive Layer)**: React/Vite/TypeScript app for UI and orchestration.
2.  **Server (Trust Engine)**: Python backend for "Zero-Persistence" processing and "Veritas" auditing.

## 🏗️ Architecture & Patterns

### 1. Client Domain (`/client`)
- **Tech Stack**: React 19, Vite, TypeScript, Lucide React, Recharts.
- **Key Services** (`src/services/`):
    - `auditService.ts`: **MANDATORY** for all side effects. Records `USER_ACTION`, `API_CALL`, etc., to `localStorage` (**DEV-ONLY simulated ledger, NOT ATI-COMPLIANT**). Production implementations must stream audit events to Veritas Observer or WORM storage.
    - `geminiService.ts`: Interacts with Google Gemini 3.0.
- **Pattern - Audit Logging**:
    Every significant user interaction or system event MUST be logged.
    ```typescript
    import { log } from './services/auditService';
    log('USER_ACTION', 'Initiated Research', { query: '...' });
    ```

### 2. Server Domain (`/server`)
- **Tech Stack**: Python.
- **Key Modules**:
    - `core/umbrella.py` (**Umbrella KMS**): Handles encryption. Enforces **Crypto-Shredding**.
    - `pipeline/`: Contains `optical_sieve` (OCR) and `veritas_observer` (Audit).
- **Pattern - Zero-Persistence**:
    - **NEVER** write raw sensitive data (PII, OCR results) to disk.
    - Process in memory, encrypt via `UmbrellaKMS`, or hash via `Veritas Observer`.
- **Pattern - Encryption**:
    - Use `UmbrellaKMS` to convert Plaintext -> Ciphertext immediately.

## 🛡️ Security & Integrity Contracts

### UmbrellaKMS Contract (Server)
UmbrellaKMS MUST:
- Accept plaintext only in-memory
- Immediately return encrypted data or raise an error
- Never expose plaintext outside the class boundary
- Support crypto-shredding via key destruction

Any server code manipulating plaintext outside UmbrellaKMS is INVALID.

### LLM Output Rules
All LLM outputs MUST:
- Be valid JSON
- Conform to an explicit schema
- Be validated before use
- Fail closed on parse or validation errors

Natural language outputs are FORBIDDEN outside UI-only components.

## 🛠️ Workflows

### Client Development
- **Start**: `npm run dev` (in `/client`).
- **Env**: Requires `GEMINI_API_KEY` in `/client/.env.local`.

### Server Development
- **Structure**: Uses `setup.py`.
- **Execution**: Python scripts in `server/` (e.g., `pipeline` stages).

## 🚨 Critical Rules for AI Agents
1.  **Sovereignty**: Respect the boundary. Client handles UI/Orchestration; Server handles Trust/OCR.
2.  **Veritas Protocol**: If you modify logic that makes a decision, **Log it**.
3.  **Security**: Inspect `server/core/umbrella.py` before touching encryption code. The "Plaintext" must never leave the class unencrypted.

## ⛔ NON-NEGOTIABLE INVARIANTS (FAIL-CLOSED)

If any rule below cannot be satisfied, the AI agent MUST:
1. STOP
2. Explain why
3. Ask for clarification

The agent MUST NOT:
- Generate side-effecting code without audit logging (client: auditService, server: Veritas Observer).
- Persist raw or derived sensitive data (PII, OCR text, embeddings) to disk, cache, localStorage, or logs.
- Invent schemas, fields, enums, or data models not defined in the codebase.
- Handle plaintext outside UmbrellaKMS on the server.

Outputs that violate these rules are INVALID.
