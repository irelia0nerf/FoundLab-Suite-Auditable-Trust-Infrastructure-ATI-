# Relatório de Integração do Vertex AI

**Data:** 28 de janeiro de 2026

Este relatório detalha as modificações implementadas para iniciar a integração da plataforma Google Cloud Vertex AI no FoundLab Suite, especificamente no componente **Trust Engine (Backend)**. O objetivo é permitir o uso de modelos de Machine Learning hospedados no Vertex AI para capacidades de IA mais robustas e auditáveis, em complemento ou alternativa ao uso direto do Gemini.

## 1. Resumo das Alterações Realizadas

As seguintes alterações foram aplicadas ao domínio do servidor (Python):

### 1.1. Atualização de Dependências

A dependência `google-cloud-aiplatform` foi adicionada ao arquivo `server/requirements.txt`. Esta biblioteca é essencial para a interação programática do backend com a API do Google Cloud Vertex AI.

### 1.2. Módulo `VertexAIClient`

Foi criado um novo módulo `server/core/vertex_ai.py` que define a classe `VertexAIClient`. Esta classe serve como um invólucro para a inicialização e gestão da comunicação com a Vertex AI. Inclui um método placeholder `predict_text_model`, que será desenvolvido para realizar previsões contra modelos de texto implantados na plataforma Vertex AI.

### 1.3. Integração FastAPI

O arquivo principal da aplicação FastAPI, `server/main.py`, foi modificado para:
*   Importar e instanciar o `VertexAIClient` durante o processo de inicialização da aplicação, utilizando as variáveis de ambiente `GCP_PROJECT_ID` e `GCP_LOCATION` para configuração.
*   Expor um novo endpoint `POST /vertex_ai/predict`. Este endpoint foi projetado para receber requisições contendo o nome do modelo (`model_name`), o prompt (`prompt`) e argumentos adicionais (`kwargs`), encaminhando-os ao `VertexAIClient` para processamento e retornando a previsão resultante.

## 2. Blueprint para Próximos Passos

Para completar e operacionalizar a integração com o Vertex AI, as seguintes etapas são recomendadas:

### 2.1. Implementação da Lógica de Previsão no Backend

A função `predict_text_model` dentro de `server/core/vertex_ai.py` deve ser expandida para incluir a lógica real de chamada aos modelos do Vertex AI. Isso implicará a utilização de classes e métodos específicos da `google-cloud-aiplatform` (e `vertexai` se aplicável) para interagir com modelos de ML implantados (por exemplo, `TextGenerationModel` para tarefas de geração de texto). Deve-se considerar como o `model_name` será mapeado para modelos específicos e como os `kwargs` serão utilizados.

### 2.2. Configuração de Variáveis de Ambiente

É mandatório definir as variáveis de ambiente `GCP_PROJECT_ID` (ID do projeto Google Cloud) e `GCP_LOCATION` (região onde os modelos do Vertex AI estão implantados) no ambiente de execução do servidor Python. Estas variáveis são cruciais para a autenticação adequada e o direcionamento das chamadas à Google Cloud Platform.

### 2.3. Integração com o Frontend (Client)

Para que o frontend (`/client`) possa aproveitar os recursos do Vertex AI via backend, um novo serviço (ex: `client/src/services/vertexAIService.ts`) ou uma extensão do `geminiService.ts` deverá ser criada. Este serviço será responsável por fazer chamadas HTTP ao novo endpoint `POST /vertex_ai/predict` do backend.

### 2.4. Protocolo Veritas e Auditoria

Em conformidade com o `Veritas Protocol`, todas as interações significativas com o Vertex AI (incluindo entradas, saídas dos modelos e o `model_name` utilizado) devem ser devidamente auditadas. Chamadas ao `veritas.log` devem ser inseridas dentro do endpoint `POST /vertex_ai/predict` em `server/main.py` para garantir a rastreabilidade e integridade.

### 2.5. Tratamento de Erros e Validação

O endpoint `POST /vertex_ai/predict` no backend deve ser aprimorado com um tratamento de erros mais robusto, fornecendo mensagens descritivas para facilitar a depuração. Adicionalmente, a validação de entrada deve ser implementada para garantir que os parâmetros `model_name` e `prompt` sejam fornecidos corretamente e estejam em um formato esperado.

### 2.6. Gerenciamento de Múltiplos Tipos de Modelos

Caso o FoundLab Suite precise interagir com diferentes tipos de modelos do Vertex AI (além de modelos de texto), a classe `VertexAIClient` deverá ser expandida para acomodar essa diversidade. Isso pode ser alcançado através de métodos específicos para cada tipo de modelo ou com lógica condicional que adapte a chamada da API com base no `model_name` ou em outros metadados do modelo.