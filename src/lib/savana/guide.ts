import type { AgentId, TaskPriority, TaskStatus } from "./types";

/**
 * Conteúdo de ajuda da Savana, compartilhado pelo guia (/savana/guia) e pelos
 * textos de apoio do formulário de tarefas.
 */

export const BRIEFING_TEMPLATE = `Contexto:
(Por que isso importa agora? O que já existe?)

Objetivo:
(O que precisa ficar diferente quando a tarefa terminar?)

Entregável esperado:
(Documento, plano, copy, lista, código… em que formato?)

Critérios de pronto:
-
-

Restrições e cuidados:
(Prazos, tom de voz, orçamento, o que NÃO fazer.)`;

export type AgentGuide = {
  whenToUse: string;
  examples: { title: string; briefing: string; priority: TaskPriority; project: string }[];
};

export const AGENT_GUIDE: Record<AgentId, AgentGuide> = {
  nexo: {
    whenToUse:
      "Quando você não sabe por onde começar, tem várias frentes ao mesmo tempo ou precisa organizar prioridades e dependências entre os outros agentes.",
    examples: [
      {
        title: "Priorizar as frentes do mês",
        project: "Operação Savana",
        priority: "alta",
        briefing: `Contexto:
Temos lançamento do programa de liderança, evento de comunidade e ajustes na plataforma acontecendo juntos.

Objetivo:
Definir a ordem de prioridade das frentes e quem cuida de cada parte.

Entregável esperado:
Lista priorizada com responsável sugerido (ATLAS, LUME, PULSO ou FORJA) e dependências entre as tarefas.

Critérios de pronto:
- Cada frente tem prioridade e responsável
- Bloqueios e dependências estão explícitos

Restrições e cuidados:
Não iniciar nenhuma ação externa; é só planejamento.`,
      },
    ],
  },
  atlas: {
    whenToUse:
      "Para pensar produto e estratégia: ofertas, jornadas de clientes e membros, planos, roadmaps e documentação.",
    examples: [
      {
        title: "Jornada do membro fundador",
        project: "Comunidade",
        priority: "media",
        briefing: `Contexto:
Vamos abrir a comunidade Savana para os primeiros membros fundadores.

Objetivo:
Mapear a jornada do convite até o primeiro evento presencial.

Entregável esperado:
Documento com as etapas da jornada, o que o membro sente/precisa em cada uma e pontos de contato.

Critérios de pronto:
- Etapas do convite ao primeiro evento
- Momentos críticos sinalizados

Restrições e cuidados:
Tom executivo e acolhedor.`,
      },
    ],
  },
  lume: {
    whenToUse:
      "Para tudo que é marca e comunicação: copy, posts, campanhas, roteiros, apresentações e revisão de tom de voz.",
    examples: [
      {
        title: "Copy da página do programa de liderança",
        project: "Programa de Liderança",
        priority: "alta",
        briefing: `Contexto:
Novo programa de liderança executiva da Savana, turma de 20 pessoas.

Objetivo:
Escrever a copy da página de inscrição.

Entregável esperado:
Título, subtítulo, 3 blocos de benefícios, prova social (placeholder) e chamada para ação.

Critérios de pronto:
- Texto pronto para revisão
- Duas opções de título

Restrições e cuidados:
Sofisticado e direto; evitar clichês e referências literais à África ou à selva. Nada é publicado sem aprovação.`,
      },
    ],
  },
  pulso: {
    whenToUse:
      "Para relacionamento: CRM, follow-ups, parcerias, eventos e experiência de membros e clientes.",
    examples: [
      {
        title: "Follow-up dos parceiros do evento",
        project: "Evento de lançamento",
        priority: "media",
        briefing: `Contexto:
Fizemos o evento de lançamento e 8 parceiros participaram.

Objetivo:
Preparar mensagens de follow-up personalizadas.

Entregável esperado:
Rascunho de mensagem por parceiro e sugestão de próximo passo.

Critérios de pronto:
- 8 rascunhos prontos para revisão

Restrições e cuidados:
Nenhuma mensagem pode ser enviada sem aprovação.`,
      },
    ],
  },
  forja: {
    whenToUse:
      "Para tecnologia: código, testes, integrações, automações e documentação técnica.",
    examples: [
      {
        title: "Formulário de inscrição no site",
        project: "Plataforma",
        priority: "alta",
        briefing: `Contexto:
O site precisa de um formulário de inscrição para o programa de liderança.

Objetivo:
Criar o formulário com validação e salvar as inscrições.

Entregável esperado:
Código em uma branch separada, com testes.

Critérios de pronto:
- Campos: nome, e-mail, empresa, cargo
- Testes passando

Restrições e cuidados:
Nada de commit, push ou deploy sem aprovação.`,
      },
    ],
  },
};

export const FIELD_HELP = {
  title: "Uma frase curta com um verbo. Ex.: “Escrever a copy da página do programa”.",
  briefing:
    "Tudo o que o agente precisa saber para fazer sem te perguntar: contexto, objetivo, entregável e critérios de pronto. Use o modelo.",
  agent: "Quem é responsável. Na dúvida, escolha o NEXO, que organiza e redistribui.",
  priority:
    "Crítica: para tudo agora. Alta: esta semana. Média: próximas semanas. Baixa: quando houver espaço.",
  project: "Agrupa tarefas relacionadas. Reutilize o mesmo nome para ver tudo junto.",
  dueDate: "Opcional. Só preencha se houver uma data real; tarefas atrasadas aparecem em vermelho.",
} as const;

export const STATUS_HELP: Record<TaskStatus, string> = {
  na_fila: "Criada e esperando alguém começar.",
  preparando: "Entendendo o briefing e organizando subtarefas.",
  trabalhando: "Em execução.",
  bloqueado: "Parada por um motivo que precisa ser resolvido (sempre informe o motivo).",
  aguardando_aprovacao: "Esperando sua decisão sobre uma ação sensível. Decida na seção Aprovações.",
  em_revisao: "Resultado pronto para você conferir.",
  concluido: "Entregue e aceita.",
  falhou: "Não deu certo. Registre o motivo numa nota e devolva para a fila se quiser tentar de novo.",
  cancelada: "Não será mais feita.",
};
