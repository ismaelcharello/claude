"use client";

import Link from "next/link";
import { useState } from "react";
import { isAgentId } from "@/lib/savana/agents";
import { savanaApi } from "../api";
import { useLiveResource } from "../useSavanaData";
import { AgentAvatar, AgentStatusBadge, SavanaMark } from "./ui";

/**
 * Savana layer on top of the Claw3D office: shows the runtime mode (so the
 * office never looks like agents are working when they are not), quick
 * counters, and a detail card for the agent clicked in the 3D scene.
 */
export function SavanaOfficeOverlay({
  selectedAgentId,
  selectionNonce,
}: {
  selectedAgentId: string | null;
  /** Increments on every agent click, so re-clicking reopens a dismissed card. */
  selectionNonce: number;
}) {
  const { data, error } = useLiveResource(savanaApi.overview);
  const [dismissedNonce, setDismissedNonce] = useState<number | null>(null);

  const agent =
    selectedAgentId && isAgentId(selectedAgentId) && dismissedNonce !== selectionNonce
      ? (data?.agents.find((a) => a.id === selectedAgentId) ?? null)
      : null;
  const runtime = data?.runtime;
  const demo = runtime?.mode === "demonstracao";

  return (
    <div className="pointer-events-none absolute right-14 top-16 z-30 flex w-[300px] flex-col gap-3 font-sans">
      <div className="pointer-events-auto rounded-2xl border border-savana-gold/30 bg-savana-deep/92 p-3 text-savana-ivory shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2.5">
          <SavanaMark size={26} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[12px] font-semibold tracking-[0.3em]">SAVANA</div>
            <div className="whitespace-nowrap text-[9px] uppercase tracking-[0.2em] text-savana-gold">Command Center</div>
          </div>
          <Link
            href="/savana"
            className="rounded-lg border border-savana-gold/50 px-2.5 py-1.5 text-[11px] font-semibold text-savana-gold hover:bg-savana-gold/10"
          >
            Central →
          </Link>
          <Link
            href="/savana/guia"
            title="Como usar o Savana Command Center"
            className="rounded-lg border border-savana-ivory/20 px-2 py-1.5 text-[11px] font-semibold text-savana-ivory/75 hover:text-savana-ivory"
          >
            ?
          </Link>
        </div>
        {error ? (
          <p className="mt-2 text-[11px] text-[#f0aaa1]">{error}</p>
        ) : runtime ? (
          <div
            className={`mt-3 rounded-lg px-2.5 py-2 text-[11px] leading-snug ${
              demo
                ? "border border-savana-gold/50 bg-savana-gold/15 text-[#ecd9b1]"
                : "border border-savana-ivory/10 bg-savana-graphite/70 text-savana-ivory/75"
            }`}
          >
            <span className="font-bold uppercase tracking-[0.16em] text-savana-gold">
              {demo ? "Modo demonstração" : runtime.label}
            </span>
            <span className="block">
              {demo
                ? "Movimento dos agentes é simulado. Nada é executado de verdade."
                : runtime.canExecute
                  ? "Agentes conectados a um runtime real."
                  : "Agentes offline: nenhum runtime executa tarefas."}
            </span>
          </div>
        ) : null}
        {data ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Abertas", value: data.tasks.filter((t) => !["concluido", "cancelada"].includes(t.status)).length },
              { label: "Bloqueios", value: data.blockedTasks.length },
              { label: "Aprovações", value: data.pendingApprovals.length },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-savana-mid/30 px-1 py-1.5">
                <div className="text-base font-light tabular-nums">{kpi.value}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-savana-ivory/50">{kpi.label}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!agent && data ? (
        <p className="pointer-events-auto rounded-xl border border-savana-ivory/10 bg-savana-deep/85 px-3 py-2 text-[11px] leading-snug text-savana-ivory/65 backdrop-blur">
          Clique em um agente (no escritório ou nas bolinhas do topo) para ver o status e pedir uma tarefa.
        </p>
      ) : null}
      {agent ? (
        <div className="pointer-events-auto rounded-2xl border border-savana-gold/30 bg-savana-deep/95 p-4 text-savana-ivory shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <AgentAvatar name={agent.name} color={agent.color} status={agent.status} size={46} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold tracking-[0.18em]">{agent.name}</div>
              <div className="text-[11px] text-savana-ivory/60">{agent.role}</div>
              <div className="mt-1.5">
                <AgentStatusBadge status={agent.status} title={agent.statusReason} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedNonce(selectionNonce)}
              className="text-savana-ivory/40 hover:text-savana-ivory"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-savana-ivory/75">{agent.mission}</p>
          <p className="mt-2 text-[11px] text-savana-ivory/45">
            {agent.area} · {agent.counts.ativas} abertas · {agent.counts.concluidas} concluídas
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/savana?nova=${agent.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-savana-gold px-3 py-2 text-xs font-semibold text-savana-graphite hover:bg-[#d6b77d]"
            >
              Pedir tarefa
            </Link>
            <Link
              href={`/savana/agents/${agent.id}`}
              className="inline-flex items-center justify-center rounded-lg border border-savana-gold/50 px-3 py-2 text-xs font-semibold text-savana-gold hover:bg-savana-gold/10"
            >
              Ver detalhes
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
