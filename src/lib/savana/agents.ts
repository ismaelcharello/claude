import type { AgentDefinition, AgentId } from "./types";

/**
 * The five Savana agents. Permissions are declarative: the runtime layer is
 * expected to enforce them, and every `aprovacao` entry maps to the approval
 * gate on the backend.
 */
export const SAVANA_AGENTS: readonly AgentDefinition[] = [
  {
    id: "nexo",
    name: "NEXO",
    role: "Orquestrador",
    mission:
      "Priorizar o trabalho da Savana, delegar para o agente certo e identificar dependências e bloqueios antes que travem a operação.",
    responsibilities: [
      "Priorizar a fila de tarefas",
      "Delegar tarefas aos agentes especialistas",
      "Mapear dependências entre tarefas",
      "Sinalizar e escalar bloqueios",
    ],
    permissions: [
      { id: "ler_tarefas", label: "Ler todas as tarefas e agentes", level: "livre" },
      { id: "reatribuir", label: "Sugerir reatribuição de tarefas", level: "livre" },
      { id: "mensagem", label: "Enviar mensagens para fora do escritório", level: "aprovacao" },
      { id: "credencial", label: "Usar credenciais de serviços externos", level: "aprovacao" },
      { id: "codigo", label: "Alterar código diretamente", level: "negado" },
    ],
    color: "#C8A66A",
    area: "Mesa central de comando",
  },
  {
    id: "atlas",
    name: "ATLAS",
    role: "Estratégia e Produto",
    mission:
      "Transformar visão em ofertas, jornadas e planos claros, mantendo a documentação de produto da Savana viva e coerente.",
    responsibilities: [
      "Desenhar ofertas e propostas de valor",
      "Mapear jornadas de clientes e membros",
      "Escrever planos e roadmaps",
      "Manter documentação de produto",
    ],
    permissions: [
      { id: "documentos", label: "Criar e editar documentos internos", level: "livre" },
      { id: "escrita_externa", label: "Publicar documentos fora do workspace", level: "aprovacao" },
      { id: "mensagem", label: "Enviar mensagens", level: "aprovacao" },
      { id: "codigo", label: "Alterar código", level: "negado" },
    ],
    color: "#7FA88E",
    area: "Sala de estratégia",
  },
  {
    id: "lume",
    name: "LUME",
    role: "Marca e Conteúdo",
    mission:
      "Cuidar da voz e da imagem da Savana: branding, copy, campanhas, apresentações e conteúdo com acabamento executivo.",
    responsibilities: [
      "Guardar a identidade e o tom de voz",
      "Escrever copy e roteiros",
      "Planejar campanhas",
      "Montar apresentações e peças de conteúdo",
    ],
    permissions: [
      { id: "rascunhos", label: "Criar rascunhos de conteúdo", level: "livre" },
      { id: "publicar", label: "Publicar em canais externos", level: "aprovacao" },
      { id: "mensagem", label: "Enviar mensagens", level: "aprovacao" },
      { id: "credencial", label: "Usar credenciais de redes sociais", level: "aprovacao" },
    ],
    color: "#E2C79A",
    area: "Estúdio de marca",
  },
  {
    id: "pulso",
    name: "PULSO",
    role: "Comercial e Comunidade",
    mission:
      "Manter o relacionamento da Savana pulsando: CRM, eventos, parcerias, follow-ups e uma experiência impecável para a comunidade.",
    responsibilities: [
      "Organizar o CRM e o funil",
      "Planejar eventos e encontros",
      "Conduzir parcerias",
      "Preparar follow-ups e cuidar da experiência",
    ],
    permissions: [
      { id: "rascunhos", label: "Preparar rascunhos de follow-up", level: "livre" },
      { id: "mensagem", label: "Enviar mensagens a contatos", level: "aprovacao" },
      { id: "crm", label: "Escrever em CRM externo", level: "aprovacao" },
      { id: "credencial", label: "Usar credenciais de CRM", level: "aprovacao" },
    ],
    color: "#4F8A6A",
    area: "Lounge da comunidade",
  },
  {
    id: "forja",
    name: "FORJA",
    role: "Tecnologia",
    mission:
      "Construir e manter a tecnologia da Savana: código, testes, integrações e documentação técnica, sempre em ambiente isolado.",
    responsibilities: [
      "Implementar código em worktrees isoladas",
      "Escrever e rodar testes",
      "Preparar integrações",
      "Documentar decisões técnicas",
    ],
    permissions: [
      { id: "worktree", label: "Editar arquivos na worktree isolada da tarefa", level: "livre" },
      { id: "testes", label: "Rodar testes locais", level: "livre" },
      { id: "commit", label: "Criar commits", level: "aprovacao" },
      { id: "push", label: "Fazer push / abrir PR", level: "aprovacao" },
      { id: "credencial", label: "Usar credenciais e tokens", level: "aprovacao" },
      { id: "comandos_perigosos", label: "Comandos destrutivos (rm -rf, reset --hard, etc.)", level: "negado" },
    ],
    color: "#9DB8A6",
    area: "Forja (laboratório técnico)",
  },
];

export const getAgentDefinition = (id: string): AgentDefinition | undefined =>
  SAVANA_AGENTS.find((agent) => agent.id === id);

export const isAgentId = (value: unknown): value is AgentId =>
  typeof value === "string" && SAVANA_AGENTS.some((agent) => agent.id === value);
