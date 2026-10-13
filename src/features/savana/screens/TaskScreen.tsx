"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { getAgentDefinition } from "@/lib/savana/agents";
import { TASK_STATUS_LABEL } from "@/lib/savana/labels";
import { TASK_TRANSITIONS } from "@/lib/savana/stateMachine";
import { STATUS_HELP } from "@/lib/savana/guide";
import type { Artifact, TaskStatus } from "@/lib/savana/types";
import { savanaApi } from "../api";
import { ApprovalCard } from "../components/ApprovalCard";
import { ErrorNotice, SavanaShell } from "../components/SavanaShell";
import {
  AgentAvatar,
  Button,
  EmptyState,
  Panel,
  PriorityLabel,
  SimulatedTag,
  TaskStatusBadge,
  fieldClass,
  formatDate,
  formatDateTime,
} from "../components/ui";
import { useLiveResource } from "../useSavanaData";

const ACTOR_LABEL = { humano: "Você", sistema: "Sistema", agente: "Agente", demonstracao: "Demonstração" } as const;

const ARTIFACT_KINDS: { value: Artifact["kind"]; label: string; placeholder: string }[] = [
  { value: "documento", label: "Documento (texto)", placeholder: "Conteúdo ou resumo do documento" },
  { value: "link", label: "Link", placeholder: "https://…" },
  { value: "arquivo", label: "Arquivo do workspace", placeholder: "caminho/relativo/arquivo.md" },
  { value: "relatorio", label: "Relatório", placeholder: "Resumo do resultado" },
];

const RUN_STATUS_LABEL: Record<string, string> = {
  planejado: "Planejada",
  executando: "Executando",
  concluido: "Concluída",
  falhou: "Falhou",
  cancelado: "Cancelada",
};

export function TaskScreen({ taskId }: { taskId: string }) {
  const load = useCallback(() => savanaApi.task(taskId), [taskId]);
  const { data, error, reload, realtime } = useLiveResource(load);
  const runtime = useLiveResource(savanaApi.overview).data?.runtime ?? null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [note, setNote] = useState("");
  const [subtask, setSubtask] = useState("");
  const [artifact, setArtifact] = useState<{ kind: Artifact["kind"]; title: string; content: string }>({
    kind: "documento",
    title: "",
    content: "",
  });

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      await reload();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro.");
      return false;
    }
  };

  const changeStatus = (status: TaskStatus) => {
    if (status === "bloqueado") {
      setBlocking(true);
      return;
    }
    void run(() => savanaApi.setStatus(taskId, status));
  };

  const submitBlock = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => savanaApi.setStatus(taskId, "bloqueado", { blockedReason }))) {
      setBlocking(false);
      setBlockedReason("");
    }
  };

  const task = data?.task;
  const activeRun = data?.runs.find((r) => r.status === "executando") ?? null;
  const agent = task ? getAgentDefinition(task.agentId) : undefined;
  const pendingApproval = data?.approvals.some((a) => a.status === "pendente") ?? false;
  const nextStatuses = task
    ? TASK_TRANSITIONS[task.status].filter((s) => s !== "aguardando_aprovacao")
    : [];
  const doneSubtasks = data?.subtasks.filter((s) => s.done).length ?? 0;

  return (
    <SavanaShell runtime={runtime} realtime={realtime} active="tarefa">
      <Link href="/savana" className="text-xs text-savana-ivory/50 hover:text-savana-ivory">
        ← Central de Comando
      </Link>
      {error ? <ErrorNotice message={error} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {!task || !data ? (
        <EmptyState>Carregando tarefa…</EmptyState>
      ) : (
        <>
          <header className="mt-4 mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <TaskStatusBadge status={task.status} />
              <PriorityLabel priority={task.priority} />
              {task.simulated ? <SimulatedTag /> : null}
              <span className="text-xs text-savana-ivory/45">Projeto {task.project}</span>
              {task.dueDate ? <span className="text-xs text-savana-ivory/45">· Prazo {formatDate(task.dueDate)}</span> : null}
            </div>
            <h1 className="mt-3 text-3xl font-light tracking-tight">{task.title}</h1>
            {agent ? (
              <Link href={`/savana/agents/${agent.id}`} className="mt-3 inline-flex items-center gap-2 text-sm text-savana-ivory/70 hover:text-savana-ivory">
                <AgentAvatar name={agent.name} color={agent.color} size={26} />
                {agent.name} · {agent.role}
              </Link>
            ) : null}
            {task.status === "bloqueado" && task.blockedReason ? (
              <p className="mt-3 rounded-lg border border-[#d9776b]/40 bg-[#d9776b]/10 px-3 py-2 text-sm text-[#f0aaa1]">
                Bloqueio: {task.blockedReason}
              </p>
            ) : null}
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <Panel title="Briefing">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-savana-ivory/85">{task.briefing}</p>
              </Panel>

              <Panel title={`Subtarefas · ${doneSubtasks}/${data.subtasks.length}`}>
                <ul className="space-y-1">
                  {data.subtasks.map((s) => (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-savana-mid/20">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#c8a66a]"
                          checked={s.done}
                          onChange={(e) => void run(() => savanaApi.setSubtaskDone(s.id, e.target.checked))}
                        />
                        <span className={`text-sm ${s.done ? "text-savana-ivory/40 line-through" : ""}`}>{s.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await run(() => savanaApi.addSubtask(taskId, subtask))) setSubtask("");
                  }}
                >
                  <input className={fieldClass} placeholder="Nova subtarefa" value={subtask} onChange={(e) => setSubtask(e.target.value)} maxLength={200} />
                  <Button type="submit" disabled={subtask.trim().length < 2}>
                    Adicionar
                  </Button>
                </form>
              </Panel>

              <Panel title="Linha do tempo">
                <ol className="relative space-y-4 border-l border-savana-gold/20 pl-5">
                  {data.timeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border border-savana-gold/60 bg-savana-deep" />
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-savana-ivory/45">
                        <span>{formatDateTime(event.createdAt)}</span>
                        <span>· {ACTOR_LABEL[event.actor]}</span>
                        {event.simulated ? <SimulatedTag /> : null}
                      </div>
                      <p className="mt-0.5 text-sm text-savana-ivory/85">{event.message}</p>
                    </li>
                  ))}
                </ol>
                <form
                  className="mt-5 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await run(() => savanaApi.addNote(taskId, note))) setNote("");
                  }}
                >
                  <input className={fieldClass} placeholder="Adicionar nota ao histórico" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
                  <Button type="submit" disabled={!note.trim()}>
                    Registrar
                  </Button>
                </form>
              </Panel>

              <Panel title="Execuções do runtime">
                {data.runs.length === 0 ? (
                  <EmptyState>
                    Nenhuma execução registrada. Quando a IA (Claude Code) executar esta tarefa, cada tentativa aparece aqui
                    com prompt, pasta de trabalho, arquivos produzidos, custo e resultado.
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {data.runs.map((r) => (
                      <li key={r.id} className="rounded-xl border border-savana-ivory/10 bg-savana-graphite/50 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded border border-savana-gold/40 px-1.5 text-savana-gold">{RUN_STATUS_LABEL[r.status] ?? r.status}</span>
                          <span className="text-savana-ivory/50">{r.runtime}</span>
                          <span className="ml-auto text-savana-ivory/40">{formatDateTime(r.createdAt)}</span>
                        </div>
                        {r.branch ? <p className="mt-2 text-xs text-savana-ivory/60">Branch {r.branch} · Worktree {r.worktreePath}</p> : null}
                        {!r.branch && r.worktreePath ? <p className="mt-2 break-all text-xs text-savana-ivory/50">Pasta: {r.worktreePath}</p> : null}
                        {r.filesChanged.length > 0 ? <p className="mt-1 text-xs text-savana-ivory/60">Arquivos: {r.filesChanged.join(", ")}</p> : null}
                        {r.resultSummary ? <p className="mt-1 text-xs text-savana-ivory/70">{r.resultSummary}</p> : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-savana-gold">Prompt registrado</summary>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] text-savana-ivory/70">
                            {r.prompt}
                          </pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <aside className="space-y-6">
              {runtime?.supportsManualRun ? (
                <Panel title="Execução com IA (Claude Code)">
                  {activeRun ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-2 text-sm text-[#9fe0bd]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#5fb38a]" /> {agent?.name} está executando esta tarefa…
                      </span>
                      <Button variant="danger" onClick={() => void run(() => savanaApi.cancelRun(taskId))}>
                        Cancelar execução
                      </Button>
                    </div>
                  ) : !runtime.canExecute ? (
                    <p className="text-sm text-savana-ivory/65">
                      A IA ainda não está pronta neste computador. Veja &quot;Como ativar agentes reais&quot; no topo da página.
                    </p>
                  ) : !runtime.runnableAgents?.includes(task.agentId) ? (
                    <p className="text-sm text-savana-ivory/65">
                      {agent?.name} ainda não executa com IA nesta versão. Tarefas de código precisam de pasta Git isolada e
                      aprovação de commit/push, que serão a próxima etapa.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-savana-ivory/75">
                        {agent?.name} vai ler o briefing e escrever a entrega em uma pasta isolada desta tarefa. Ele não tem
                        terminal nem internet e não pode publicar, enviar mensagens ou usar senhas. O resultado volta como
                        &quot;Em revisão&quot; para você conferir. <strong>Cada execução consome sua conta do Claude.</strong>
                      </p>
                      <Button
                        variant="gold"
                        disabled={!["na_fila", "bloqueado", "falhou"].includes(task.status)}
                        title={
                          ["na_fila", "bloqueado", "falhou"].includes(task.status)
                            ? "Iniciar a execução real"
                            : "Só é possível executar tarefas na fila, bloqueadas ou que falharam"
                        }
                        onClick={() => void run(() => savanaApi.startRun(taskId))}
                      >
                        Executar com IA
                      </Button>
                    </div>
                  )}
                  {data.logs.length > 0 ? (
                    <details className="mt-4" open={Boolean(activeRun)}>
                      <summary className="cursor-pointer text-xs text-savana-gold">Log da execução ({data.logs.length})</summary>
                      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto font-mono text-[11px]">
                        {data.logs.map((l) => (
                          <li key={l.id} className="flex gap-3">
                            <span className="shrink-0 text-savana-ivory/40">{formatDateTime(l.createdAt)}</span>
                            <span className={l.level === "erro" ? "text-[#f0aaa1]" : l.level === "aviso" ? "text-savana-gold" : "text-savana-ivory/75"}>
                              {l.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </Panel>
              ) : null}

              <Panel title="Status">
                {pendingApproval ? (
                  <p className="mb-3 text-xs text-savana-gold">Há uma aprovação pendente: decida abaixo antes de avançar.</p>
                ) : null}
                {blocking ? (
                  <form onSubmit={submitBlock} className="space-y-2">
                    <input
                      className={fieldClass}
                      placeholder="Motivo do bloqueio"
                      value={blockedReason}
                      onChange={(e) => setBlockedReason(e.target.value)}
                      maxLength={500}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button type="submit" variant="danger" disabled={!blockedReason.trim()}>
                        Bloquear
                      </Button>
                      <Button type="button" onClick={() => setBlocking(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : activeRun ? (
                  <p className="text-sm text-savana-ivory/65">
                    Status bloqueado durante a execução. Para interromper, use &quot;Cancelar execução&quot;.
                  </p>
                ) : nextStatuses.length === 0 ? (
                  <EmptyState>Sem transições disponíveis.</EmptyState>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <Button
                        key={status}
                        variant={status === "concluido" ? "gold" : status === "falhou" || status === "cancelada" ? "danger" : "ghost"}
                        onClick={() => changeStatus(status)}
                        title={STATUS_HELP[status]}
                      >
                        → {TASK_STATUS_LABEL[status]}
                      </Button>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-savana-ivory/60">
                  Agora: <span className="text-savana-ivory/85">{STATUS_HELP[task.status]}</span>
                </p>
                <p className="mt-4 text-[11px] leading-relaxed text-savana-ivory/45">
                  Passe o mouse sobre um botão para ver o que o status significa. Mudanças feitas aqui ficam registradas como suas na linha do tempo.
                  {runtime && !runtime.canExecute ? " Com o runtime desligado, nenhum agente executa a tarefa — o status é acompanhamento manual." : ""}
                </p>
              </Panel>

              <Panel title="Aprovações">
                {data.approvals.length === 0 ? (
                  <EmptyState>Nenhuma aprovação solicitada para esta tarefa.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {data.approvals.map((approval) => (
                      <ApprovalCard key={approval.id} approval={approval} onChanged={reload} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Artefatos">
                {data.artifacts.length === 0 ? <EmptyState>Nenhum artefato ainda.</EmptyState> : null}
                <ul className="space-y-2">
                  {data.artifacts.map((a) => (
                    <li key={a.id} className="rounded-xl border border-savana-ivory/10 bg-savana-graphite/40 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{a.title}</span>
                        {a.simulated ? <SimulatedTag /> : null}
                        <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-savana-ivory/40">{a.kind}</span>
                      </div>
                      {a.kind === "link" ? (
                        <a href={a.content} target="_blank" rel="noreferrer noopener" className="mt-1 block break-all text-xs text-savana-gold hover:underline">
                          {a.content}
                        </a>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-savana-ivory/65">{a.content}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-4 space-y-2 border-t border-savana-ivory/10 pt-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await run(() => savanaApi.addArtifact(taskId, artifact))) {
                      setArtifact({ kind: artifact.kind, title: "", content: "" });
                    }
                  }}
                >
                  <select
                    className={fieldClass}
                    value={artifact.kind}
                    onChange={(e) => setArtifact({ ...artifact, kind: e.target.value as Artifact["kind"] })}
                  >
                    {ARTIFACT_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <input className={fieldClass} placeholder="Título" value={artifact.title} onChange={(e) => setArtifact({ ...artifact, title: e.target.value })} maxLength={160} />
                  <textarea
                    className={`${fieldClass} min-h-[70px]`}
                    placeholder={ARTIFACT_KINDS.find((k) => k.value === artifact.kind)?.placeholder}
                    value={artifact.content}
                    onChange={(e) => setArtifact({ ...artifact, content: e.target.value })}
                  />
                  <Button type="submit" disabled={!artifact.title.trim() || !artifact.content.trim()}>
                    Registrar artefato
                  </Button>
                </form>
              </Panel>
            </aside>
          </div>
        </>
      )}
    </SavanaShell>
  );
}
