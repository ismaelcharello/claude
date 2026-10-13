import type { RuntimeInfo, Task } from "../../../src/lib/savana/types";
import type { SavanaService } from "../service";
import type { AgentRuntime } from "./types";
import { describeClaudeCodeRequirements } from "./claudeCode";
import type { SavanaConfig } from "../config";

export const UNCONFIGURED_NOTE =
  "Runtime de agentes não configurado: nenhum agente executa esta tarefa. Ela fica registrada na fila " +
  "e pode ser acompanhada e atualizada manualmente até um runtime real ser ativado.";

/**
 * Default runtime. It never executes anything and never simulates progress;
 * it only records, honestly, that no runtime picked the task up.
 */
export class UnconfiguredRuntime implements AgentRuntime {
  constructor(
    private readonly service: SavanaService,
    private readonly config: SavanaConfig
  ) {}

  info(): RuntimeInfo {
    return {
      mode: "nao_configurado",
      label: "Runtime não configurado",
      canExecute: false,
      simulated: false,
      summary:
        "Os agentes aparecem no escritório, mas estão offline: nenhum runtime está conectado. " +
        "Tarefas, aprovações e histórico funcionam de verdade e ficam salvos no SQLite local; " +
        "nenhuma tarefa é executada automaticamente.",
      requirements: describeClaudeCodeRequirements(this.config),
      nextSteps: [
        "Para explorar o fluxo completo sem executar nada real, rode `npm run savana:demo` (dados separados, marcados como SIMULADO).",
        "Para ligar a IA de verdade: instale o Claude Code, faça login e inicie com `npm run savana:ia` (passo a passo no guia, seção 'Ligar a IA').",
      ],
    };
  }

  onTaskCreated(task: Task): void {
    this.service.addRuntimeNote(task.id, UNCONFIGURED_NOTE, { actor: "sistema" });
  }

  onApprovalResolved(): void {}

  dispose(): void {}
}
