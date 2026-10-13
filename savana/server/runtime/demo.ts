import { getAgentDefinition } from "../../../src/lib/savana/agents";
import type { Approval, RuntimeInfo, Task } from "../../../src/lib/savana/types";
import type { MutationContext, SavanaService } from "../service";
import type { AgentRuntime } from "./types";

const DEMO: MutationContext = { actor: "demonstracao", simulated: true };
const TAG = "[DEMONSTRAÇÃO]";

const DEMO_SUBTASKS: Record<string, string[]> = {
  nexo: ["Mapear dependências", "Definir ordem de execução", "Sinalizar riscos"],
  atlas: ["Levantar premissas", "Esboçar estrutura do documento", "Revisar coerência"],
  lume: ["Definir tom e mensagem-chave", "Rascunhar copy", "Checar aderência à marca"],
  pulso: ["Listar contatos envolvidos", "Rascunhar follow-up", "Planejar próximos passos"],
  forja: ["Criar worktree isolada", "Implementar alteração", "Rodar testes"],
};

/**
 * Demonstration runtime. Walks each task through the real state machine on a
 * timer so the office and Command Center can be explored. Every row it writes
 * is flagged `simulated` and every message starts with [DEMONSTRAÇÃO]; it
 * never executes commands or touches anything outside the demo database.
 */
export class DemoRuntime implements AgentRuntime {
  private timers = new Set<NodeJS.Timeout>();
  private disposed = false;

  constructor(
    private readonly service: SavanaService,
    private readonly stepMs: number
  ) {}

  info(): RuntimeInfo {
    return {
      mode: "demonstracao",
      label: "Modo demonstração",
      canExecute: true,
      simulated: true,
      summary:
        "Tudo o que os agentes 'fazem' aqui é simulado por um roteiro fixo para demonstrar o fluxo. " +
        "Nenhum código é executado, nenhuma mensagem é enviada e os resultados não são reais. " +
        "Os dados ficam num banco separado (savana-demo.db).",
      requirements: [],
      nextSteps: [
        "Para trabalho real, rode `npm run savana` (sem demonstração) e siga o IMPLEMENTATION_STATUS.md.",
      ],
    };
  }

  private schedule(fn: () => void, steps = 1) {
    if (this.disposed) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.disposed) return;
      try {
        fn();
      } catch (error) {
        // A human may have moved the task meanwhile; the demo simply stops.
        console.warn("[savana-demo] passo ignorado:", error instanceof Error ? error.message : error);
      }
    }, this.stepMs * steps);
    this.timers.add(timer);
  }

  private stillIn(taskId: string, ...statuses: Task["status"][]) {
    try {
      return statuses.includes(this.service.getTask(taskId).status);
    } catch {
      return false;
    }
  }

  onTaskCreated(task: Task): void {
    const agent = getAgentDefinition(task.agentId);
    const name = agent?.name ?? task.agentId;
    this.schedule(() => {
      if (!this.stillIn(task.id, "na_fila")) return;
      this.service.transitionTask(task.id, "preparando", DEMO, { note: `${TAG} ${name} lendo o briefing` });
      this.service.addLog(task.agentId, `${TAG} Lendo briefing de "${task.title}"`, DEMO, { taskId: task.id });
      for (const title of DEMO_SUBTASKS[task.agentId] ?? []) {
        this.service.addSubtask(task.id, `${title} (simulado)`, DEMO);
      }
      this.schedule(() => {
        if (!this.stillIn(task.id, "preparando")) return;
        this.service.transitionTask(task.id, "trabalhando", DEMO, { note: `${TAG} execução simulada` });
        this.service.addLog(task.agentId, `${TAG} Trabalhando (simulado) em "${task.title}"`, DEMO, {
          taskId: task.id,
        });
        this.schedule(() => this.afterWork(task), 2);
      });
    });
  }

  private afterWork(task: Task) {
    if (!this.stillIn(task.id, "trabalhando")) return;
    if (task.agentId === "forja") {
      this.service.requestApproval(
        {
          taskId: task.id,
          action: "commit",
          summary: `${TAG} Criar commit com a alteração simulada de "${task.title}"`,
          details:
            "Exemplo de pedido de aprovação. Em modo demonstração nada é commitado: aprovar apenas avança o roteiro.",
        },
        DEMO
      );
      this.service.addLog(task.agentId, `${TAG} Aguardando aprovação humana para commit`, DEMO, {
        taskId: task.id,
      });
      return;
    }
    if (task.agentId === "pulso") {
      this.service.requestApproval(
        {
          taskId: task.id,
          action: "mensagem",
          summary: `${TAG} Enviar follow-up referente a "${task.title}"`,
          details: "Exemplo de pedido de aprovação. Nenhuma mensagem é enviada em modo demonstração.",
        },
        DEMO
      );
      return;
    }
    this.finish(task);
  }

  private finish(task: Task) {
    if (!this.stillIn(task.id, "trabalhando")) return;
    this.service.transitionTask(task.id, "em_revisao", DEMO, { note: `${TAG} resultado simulado pronto` });
    this.service.addArtifact(
      {
        taskId: task.id,
        kind: "relatorio",
        title: "Resultado simulado (demonstração)",
        content:
          `${TAG} Este artefato foi gerado por um roteiro fixo e não representa trabalho real.\n\n` +
          `Tarefa: ${task.title}\nProjeto: ${task.project}`,
      },
      DEMO
    );
    this.schedule(() => {
      if (!this.stillIn(task.id, "em_revisao")) return;
      this.service.transitionTask(task.id, "concluido", DEMO, { note: `${TAG} roteiro encerrado` });
      this.service.addLog(task.agentId, `${TAG} Roteiro concluído para "${task.title}"`, DEMO, {
        taskId: task.id,
      });
    }, 2);
  }

  onApprovalResolved(approval: Approval): void {
    if (approval.status !== "aprovada") return;
    const task = this.service.getTask(approval.taskId);
    this.schedule(() => this.finish(task));
  }

  dispose(): void {
    this.disposed = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
