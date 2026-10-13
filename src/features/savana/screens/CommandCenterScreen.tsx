"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TASK_STATUS_LABEL } from "@/lib/savana/labels";
import { ACTIVE_TASK_STATUSES } from "@/lib/savana/stateMachine";
import { TASK_STATUSES, type AgentId, type TaskStatus } from "@/lib/savana/types";
import { savanaApi } from "../api";
import { ApprovalCard } from "../components/ApprovalCard";
import { CreateTaskDialog } from "../components/CreateTaskDialog";
import { ErrorNotice, SavanaShell } from "../components/SavanaShell";
import { TaskRow } from "../components/TaskRow";
import { AgentAvatar, AgentStatusBadge, Button, EmptyState, Panel, fieldClass } from "../components/ui";
import { useLiveResource } from "../useSavanaData";

type Filter = "abertas" | "todas" | TaskStatus;

export function CommandCenterScreen() {
  const { data, error, reload, realtime } = useLiveResource(savanaApi.overview);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("abertas");
  const [agentFilter, setAgentFilter] = useState<AgentId | "todos">("todos");

  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const taskTitle = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);
  const projects = useMemo(() => [...new Set(tasks.map((t) => t.project))].sort(), [tasks]);

  const visible = tasks.filter((task) => {
    if (agentFilter !== "todos" && task.agentId !== agentFilter) return false;
    if (filter === "todas") return true;
    if (filter === "abertas") return !["concluido", "cancelada"].includes(task.status);
    return task.status === filter;
  });
  const queue = visible.filter((t) => t.status === "na_fila");
  const inProgress = visible.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
  const others = visible.filter((t) => t.status !== "na_fila" && !ACTIVE_TASK_STATUSES.includes(t.status));

  const kpis = [
    { label: "Em andamento", value: tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status)).length },
    { label: "Na fila", value: tasks.filter((t) => t.status === "na_fila").length },
    { label: "Bloqueadas", value: data?.blockedTasks.length ?? 0, alert: (data?.blockedTasks.length ?? 0) > 0 },
    { label: "Aprovações pendentes", value: data?.pendingApprovals.length ?? 0, gold: (data?.pendingApprovals.length ?? 0) > 0 },
    { label: "Concluídas", value: tasks.filter((t) => t.status === "concluido").length },
  ];

  return (
    <SavanaShell runtime={data?.runtime ?? null} realtime={realtime} active="central">
      {error ? <ErrorNotice message={error} /> : null}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-savana-gold">Central de Comando</p>
          <h1 className="mt-2 text-3xl font-light tracking-tight">Operação dos agentes Savana</h1>
          <p className="mt-1 text-sm text-savana-ivory/55">
            Tarefas, fila, bloqueios e aprovações — tudo salvo localmente e atualizado em tempo real.
          </p>
        </div>
        <Button variant="gold" onClick={() => setCreating(true)} disabled={!data}>
          + Nova tarefa
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border px-4 py-3 ${
              kpi.alert
                ? "border-[#d9776b]/40 bg-[#d9776b]/10"
                : kpi.gold
                  ? "border-savana-gold/45 bg-savana-gold/10"
                  : "border-savana-ivory/10 bg-savana-mid/20"
            }`}
          >
            <div className="text-2xl font-light tabular-nums">{kpi.value}</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-savana-ivory/55">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {data && data.pendingApprovals.length > 0 ? (
            <Panel title={`Aprovações pendentes · ${data.pendingApprovals.length}`}>
              <p className="mb-3 text-xs text-savana-ivory/55">
                Nenhuma escrita externa, commit, push, PR, mensagem ou uso de credencial acontece sem a sua decisão aqui.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {data.pendingApprovals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    taskTitle={taskTitle.get(approval.taskId)}
                    onChanged={reload}
                  />
                ))}
              </div>
            </Panel>
          ) : null}

          {data && data.blockedTasks.length > 0 ? (
            <Panel title={`Bloqueios · ${data.blockedTasks.length}`}>
              <div className="divide-y divide-savana-ivory/5">
                {data.blockedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel
            title="Tarefas"
            action={
              <div className="flex gap-2">
                <select
                  aria-label="Filtrar por agente"
                  className={`${fieldClass} !w-auto !py-1 text-xs`}
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value as AgentId | "todos")}
                >
                  <option value="todos">Todos os agentes</option>
                  {data?.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar por status"
                  className={`${fieldClass} !w-auto !py-1 text-xs`}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                >
                  <option value="abertas">Abertas</option>
                  <option value="todas">Todas</option>
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {!data ? (
              <EmptyState>Carregando…</EmptyState>
            ) : visible.length === 0 ? (
              <EmptyState>
                Nenhuma tarefa aqui ainda.{" "}
                <button className="text-savana-gold underline" onClick={() => setCreating(true)}>
                  Criar a primeira
                </button>
              </EmptyState>
            ) : (
              <div className="space-y-5">
                {[
                  { title: "Em andamento", items: inProgress },
                  { title: "Fila", items: queue },
                  { title: "Encerradas", items: others },
                ]
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <div key={group.title}>
                      <h3 className="mb-1 px-3 text-[10px] uppercase tracking-[0.22em] text-savana-ivory/40">
                        {group.title} · {group.items.length}
                      </h3>
                      <div className="divide-y divide-savana-ivory/5">
                        {group.items.map((task) => (
                          <TaskRow key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Agentes">
            <ul className="space-y-2">
              {data?.agents.map((agent) => (
                <li key={agent.id}>
                  <Link
                    href={`/savana/agents/${agent.id}`}
                    className="flex items-center gap-3 rounded-xl border border-savana-ivory/5 bg-savana-graphite/40 p-3 transition-colors hover:border-savana-gold/35"
                  >
                    <AgentAvatar name={agent.name} color={agent.color} status={agent.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tracking-[0.12em]">{agent.name}</span>
                        <AgentStatusBadge status={agent.status} title={agent.statusReason} />
                      </div>
                      <div className="text-xs text-savana-ivory/55">{agent.role}</div>
                      <div className="mt-1 text-[11px] text-savana-ivory/40">
                        {agent.counts.ativas} abertas · {agent.counts.concluidas} concluídas
                        {agent.counts.aprovacoesPendentes > 0 ? (
                          <span className="text-savana-gold"> · {agent.counts.aprovacoesPendentes} aprovação(ões)</span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Escritório 3D">
            <p className="text-sm text-savana-ivory/65">
              Veja os cinco agentes no escritório imersivo. O status no 3D espelha o status real daqui.
            </p>
            <Link
              href="/office"
              className="mt-3 inline-flex rounded-lg border border-savana-gold/50 px-3.5 py-2 text-xs font-semibold text-savana-gold hover:bg-savana-gold/10"
            >
              Abrir escritório →
            </Link>
          </Panel>
        </aside>
      </div>

      <CreateTaskDialog
        open={creating}
        onClose={() => setCreating(false)}
        projects={projects}
        onCreated={() => {
          setCreating(false);
          void reload();
        }}
      />
    </SavanaShell>
  );
}
