"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { getAgentDefinition } from "@/lib/savana/agents";
import { TASK_STATUS_LABEL } from "@/lib/savana/labels";
import { TASK_TRANSITIONS } from "@/lib/savana/stateMachine";
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
                    Nenhuma execução registrada. Quando um runtime real (Claude Code) estiver ativo, cada tentativa aparece aqui
                    com prompt, worktree, arquivos alterados e resultado.
                  </EmptyState>
                ) : (
                  <ul className="space-y-3">
                    {data.runs.map((r) => (
                      <li key={r.id} className="rounded-xl border border-savana-ivory/10 bg-savana-graphite/50 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded border border-savana-gold/40 px-1.5 text-savana-gold">{r.status}</span>
                          <span className="text-savana-ivory/50">{r.runtime}</span>
                          <span className="ml-auto text-savana-ivory/40">{formatDateTime(r.createdAt)}</span>
                        </div>
                        {r.branch ? <p className="mt-2 text-xs text-savana-ivory/60">Branch {r.branch} · Worktree {r.worktreePath}</p> : null}
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
                ) : nextStatuses.length === 0 ? (
                  <EmptyState>Sem transições disponíveis.</EmptyState>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <Button
                        key={status}
                        variant={status === "concluido" ? "gold" : status === "falhou" || status === "cancelada" ? "danger" : "ghost"}
                        onClick={() => changeStatus(status)}
                      >
                        → {TASK_STATUS_LABEL[status]}
                      </Button>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-savana-ivory/45">
                  Mudanças feitas aqui ficam registradas como suas na linha do tempo.
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
