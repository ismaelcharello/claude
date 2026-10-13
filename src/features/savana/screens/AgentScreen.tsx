"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { AgentId } from "@/lib/savana/types";
import { savanaApi } from "../api";
import { ApprovalCard } from "../components/ApprovalCard";
import { CreateTaskDialog } from "../components/CreateTaskDialog";
import { ErrorNotice, SavanaShell } from "../components/SavanaShell";
import { TaskRow } from "../components/TaskRow";
import {
  AgentAvatar,
  AgentStatusBadge,
  Badge,
  Button,
  EmptyState,
  Panel,
  SimulatedTag,
  formatDateTime,
} from "../components/ui";
import { useLiveResource } from "../useSavanaData";

const PERMISSION_STYLE = {
  livre: { label: "Livre", tone: "ok" as const },
  aprovacao: { label: "Exige aprovação", tone: "gold" as const },
  negado: { label: "Proibido", tone: "danger" as const },
};

export function AgentScreen({ agentId }: { agentId: string }) {
  const load = useCallback(() => savanaApi.agent(agentId), [agentId]);
  const { data, error, reload, realtime } = useLiveResource(load);
  const runtime = useLiveResource(savanaApi.overview).data?.runtime ?? null;
  const [creating, setCreating] = useState(false);
  const taskTitle = useMemo(() => new Map((data?.tasks ?? []).map((t) => [t.id, t.title])), [data]);

  const agent = data?.agent;
  return (
    <SavanaShell runtime={runtime} realtime={realtime} active="agente">
      <Link href="/savana" className="text-xs text-savana-ivory/50 hover:text-savana-ivory">
        ← Central de Comando
      </Link>
      {error ? <ErrorNotice message={error} /> : null}
      {!agent ? (
        <EmptyState>Carregando agente…</EmptyState>
      ) : (
        <>
          <header className="mt-4 mb-8 flex flex-wrap items-start gap-6">
            <AgentAvatar name={agent.name} color={agent.color} status={agent.status} size={84} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-savana-gold">{agent.role}</p>
              <h1 className="mt-1 text-4xl font-light tracking-[0.18em]">{agent.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-savana-ivory/60">
                <AgentStatusBadge status={agent.status} />
                <span>{agent.statusReason}</span>
                <span>· {agent.area}</span>
              </div>
              <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-savana-ivory/85">{agent.mission}</p>
            </div>
            <Button variant="gold" onClick={() => setCreating(true)}>
              + Tarefa para {agent.name}
            </Button>
          </header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="space-y-6">
              <Panel title={`Tarefas · ${data.tasks.length}`}>
                {data.tasks.length === 0 ? (
                  <EmptyState>Nenhuma tarefa atribuída.</EmptyState>
                ) : (
                  <div className="divide-y divide-savana-ivory/5">
                    {data.tasks.map((task) => (
                      <TaskRow key={task.id} task={task} showAgent={false} />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Resultados (artefatos)">
                {data.artifacts.length === 0 ? (
                  <EmptyState>Nenhum resultado registrado ainda.</EmptyState>
                ) : (
                  <ul className="space-y-2">
                    {data.artifacts.map((artifact) => (
                      <li key={artifact.id} className="rounded-xl border border-savana-ivory/10 bg-savana-graphite/40 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{artifact.title}</span>
                          {artifact.simulated ? <SimulatedTag /> : null}
                          <span className="ml-auto text-[11px] text-savana-ivory/45">{formatDateTime(artifact.createdAt)}</span>
                        </div>
                        <Link
                          className="text-xs text-savana-gold/80 hover:underline"
                          href={`/savana/tasks/${artifact.taskId}`}
                        >
                          {taskTitle.get(artifact.taskId) ?? "Ver tarefa"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Logs">
                {data.logs.length === 0 ? (
                  <EmptyState>
                    Sem logs. Logs aparecem quando um runtime trabalha neste agente — nada é inventado quando o runtime está
                    desligado.
                  </EmptyState>
                ) : (
                  <ul className="max-h-[420px] space-y-1 overflow-y-auto font-mono text-xs">
                    {data.logs.map((log) => (
                      <li key={log.id} className="flex gap-3 rounded px-2 py-1 hover:bg-savana-mid/20">
                        <span className="shrink-0 text-savana-ivory/40">{formatDateTime(log.createdAt)}</span>
                        <span
                          className={
                            log.level === "erro"
                              ? "text-[#f0aaa1]"
                              : log.level === "aviso"
                                ? "text-savana-gold"
                                : "text-savana-ivory/80"
                          }
                        >
                          {log.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <aside className="space-y-6">
              <Panel title="Permissões">
                <ul className="space-y-2">
                  {agent.permissions.map((permission) => (
                    <li key={permission.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-savana-ivory/80">{permission.label}</span>
                      <Badge tone={PERMISSION_STYLE[permission.level].tone}>{PERMISSION_STYLE[permission.level].label}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[11px] leading-relaxed text-savana-ivory/45">
                  Regra global: escrita externa, commit, push, PR, mensagens e uso de credenciais sempre passam por aprovação
                  humana, independentemente do agente.
                </p>
              </Panel>
              <Panel title="Responsabilidades">
                <ul className="list-inside list-disc space-y-1 text-sm text-savana-ivory/80 marker:text-savana-gold">
                  {agent.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Aprovações">
                {data.approvals.length === 0 ? (
                  <EmptyState>Nenhum pedido de aprovação.</EmptyState>
                ) : (
                  <div className="space-y-3">
                    {data.approvals.map((approval) => (
                      <ApprovalCard
                        key={approval.id}
                        approval={approval}
                        taskTitle={taskTitle.get(approval.taskId)}
                        onChanged={reload}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </aside>
          </div>

          <CreateTaskDialog
            open={creating}
            defaultAgentId={agent.id as AgentId}
            projects={[...new Set(data.tasks.map((t) => t.project))]}
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              void reload();
            }}
          />
        </>
      )}
    </SavanaShell>
  );
}
