# 🎨 FoundLab Design System: "Corporate Premium"

Este documento define os padrões visuais e arquitetônicos para a interface do FoundLab, alinhados com o template oficial do website.

## 1. Identidade Visual (The "Trust" Aesthetic)

O objetivo é transmitir **Autoridade**, **Legado** e **Precisão**. Afastamo-nos do "Sci-Fi Dark" para um visual "Banco Tier 1 / Consultoria de Elite".

### ✒️ Tipografia
A combinação de Serif e Sans-Serif cria uma hierarquia clara entre "Título Oficial" e "Dados Técnicos".

*   **Títulos / Headers:** `Cormorant Garamond` (Serif)
    *   Uso: Nome da Entidade, Títulos de Seção, "Due Diligence Workflow".
    *   Peso: 400 (Regular) a 600 (Semi-Bold).
    *   *Sensação: Documento Jurídico, Contrato, Prestígio.*
*   **Corpo / UI / Dados:** `Inter` (Sans-Serif)
    *   Uso: Menus, Labels, Valores de Risco, Botões, Logs.
    *   Peso: 300 (Light) a 500 (Medium).
    *   *Sensação: Modernidade, Clareza, Software.*

### 🎨 Paleta de Cores
*   **Fundo Principal:** `Slate-50` (#f8fafc) - Quase branco, limpo, papel de alta gramatura.
*   **Sidebar / Superfícies Escuras:** `Navy-900` (#0f172a) - Azul profundo, corporativo.
*   **Acentos de Valor:** `Gold-400` (#d4af37) - Usado com parcimônia para destacar elementos premium ou ações importantes.
*   **Texto Principal:** `Navy-900` (Títulos) e `Slate-600` (Corpo).

### 💎 Texturas e Efeitos
*   **Cinematic Grain:** Uma camada sutil de ruído (`opacity-3`) sobre toda a aplicação para evitar o aspecto "plástico" e dar textura de filme/papel.
*   **Glassmorphism (TrustCard):**
    *   Fundo: Branco translúcido (`bg-white/80`).
    *   Desfoque: `backdrop-blur-md`.
    *   Borda: Muito fina e clara (`border-white/40`).
    *   Sombra: Suave e elevada (`shadow-card` ou `shadow-elevation`).

## 2. Componentes Principais

### `TrustCard` (Container Padrão)
Substitui as divs genéricas. É o bloco fundamental da UI.
- **Visual:** Painel flutuante, bordas arredondadas (`rounded-xl`), sombra suave.
- **Header:** Linha divisória sutil, título em Serif.

### Sidebar "Corporate Vault"
- **Visual:** Escura (`bg-navy-900`), texto branco.
- **Detalhes:** Badge do Google em tons de cinza (grayscale) para não brigar com o design. Indicadores de status discretos.

## 3. Plano de Implementação (Próximos Passos)

Para garantir consistência total, devemos replicar este sistema em:

1.  **Geração de PDF (`pdfService.ts`):**
    *   O relatório exportado DEVE usar a fonte `Cormorant Garamond` para títulos.
    *   Layout deve ser fundo branco, texto navy, linhas douradas sutis.
2.  **Tratamento de Erros (Backend):**
    *   Resolver o erro 503 do Gemini com retries automáticos, mantendo a UI estável.
3.  **Outras Views (Registry, Audit, Research):**
    *   Atualizar para usar `TrustCard` e remover resquícios do tema antigo.

---
*Documento vivo. Atualizar conforme novos padrões forem definidos.*
