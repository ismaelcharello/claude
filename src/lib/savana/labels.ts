import type { AgentStatus, GatedAction, TaskPriority, TaskStatus, ApprovalStatus } from "./types";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  offline: "Offline",
  disponivel: "Disponível",
  preparando: "Preparando",
  trabalhando: "Trabalhando",
  bloqueado: "Bloqueado",
  aguardando_aprovacao: "Aguardando aprovação",
  em_revisao: "Em revisão",
  concluido: "Concluído",
  falhou: "Falhou",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  na_fila: "Na fila",
  preparando: "Preparando",
  trabalhando: "Trabalhando",
  bloqueado: "Bloqueada",
  aguardando_aprovacao: "Aguardando aprovação",
  em_revisao: "Em revisão",
  concluido: "Concluída",
  falhou: "Falhou",
  cancelada: "Cancelada",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const GATED_ACTION_LABEL: Record<GatedAction, string> = {
  escrita_externa: "Escrita externa",
  commit: "Commit",
  push: "Push",
  pull_request: "Pull request",
  mensagem: "Envio de mensagem",
  uso_de_credencial: "Uso de credencial",
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

/** Semantic tone per status, used by the UI for colour. */
export type StatusTone = "neutral" | "ok" | "active" | "warn" | "danger" | "gold";

export const AGENT_STATUS_TONE: Record<AgentStatus, StatusTone> = {
  offline: "neutral",
  disponivel: "ok",
  preparando: "active",
  trabalhando: "active",
  bloqueado: "danger",
  aguardando_aprovacao: "gold",
  em_revisao: "warn",
  concluido: "ok",
  falhou: "danger",
};

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  na_fila: "neutral",
  preparando: "active",
  trabalhando: "active",
  bloqueado: "danger",
  aguardando_aprovacao: "gold",
  em_revisao: "warn",
  concluido: "ok",
  falhou: "danger",
  cancelada: "neutral",
};
