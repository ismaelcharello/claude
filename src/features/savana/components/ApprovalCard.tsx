"use client";

import Link from "next/link";
import { useState } from "react";
import { getAgentDefinition } from "@/lib/savana/agents";
import { APPROVAL_STATUS_LABEL, GATED_ACTION_LABEL } from "@/lib/savana/labels";
import type { Approval } from "@/lib/savana/types";
import { savanaApi } from "../api";
import { Badge, Button, SimulatedTag, fieldClass, formatDateTime } from "./ui";

export function ApprovalCard({
  approval,
  taskTitle,
  onChanged,
}: {
  approval: Approval;
  taskTitle?: string;
  onChanged?: () => void;
}) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agent = getAgentDefinition(approval.agentId);

  const decide = async (decision: "aprovada" | "rejeitada") => {
    setBusy(true);
    setError(null);
    try {
      await savanaApi.decide(approval.id, decision, note || undefined);
      setRejecting(false);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao decidir.");
    } finally {
      setBusy(false);
    }
  };

  const tone = approval.status === "pendente" ? "gold" : approval.status === "aprovada" ? "ok" : "danger";

  return (
    <article className="rounded-xl border border-savana-gold/25 bg-savana-graphite/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{APPROVAL_STATUS_LABEL[approval.status]}</Badge>
        <span className="text-[11px] uppercase tracking-[0.16em] text-savana-gold">
          {GATED_ACTION_LABEL[approval.action]}
        </span>
        {approval.simulated ? <SimulatedTag /> : null}
        <span className="ml-auto text-[11px] text-savana-ivory/45">{formatDateTime(approval.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{approval.summary}</p>
      {approval.details ? <p className="mt-1 text-xs text-savana-ivory/60">{approval.details}</p> : null}
      <p className="mt-2 text-xs text-savana-ivory/50">
        {agent?.name ?? approval.agentId}
        {taskTitle ? (
          <>
            {" · "}
            <Link className="underline-offset-2 hover:underline" href={`/savana/tasks/${approval.taskId}`}>
              {taskTitle}
            </Link>
          </>
        ) : null}
      </p>
      {approval.status !== "pendente" ? (
        <p className="mt-2 text-xs text-savana-ivory/55">
          {approval.decidedBy} · {approval.decidedAt ? formatDateTime(approval.decidedAt) : ""}
          {approval.decisionNote ? ` — ${approval.decisionNote}` : ""}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {rejecting ? (
            <input
              className={fieldClass}
              placeholder="Motivo da rejeição (obrigatório)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          ) : null}
          <div className="flex gap-2">
            <Button variant="gold" disabled={busy} onClick={() => void decide("aprovada")}>
              Aprovar
            </Button>
            {rejecting ? (
              <Button variant="danger" disabled={busy || !note.trim()} onClick={() => void decide("rejeitada")}>
                Confirmar rejeição
              </Button>
            ) : (
              <Button variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
                Rejeitar
              </Button>
            )}
          </div>
          {error ? <p className="text-xs text-[#f0aaa1]">{error}</p> : null}
        </div>
      )}
    </article>
  );
}
