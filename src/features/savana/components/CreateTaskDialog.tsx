"use client";

import { useState, type FormEvent } from "react";
import { SAVANA_AGENTS } from "@/lib/savana/agents";
import { PRIORITY_LABEL } from "@/lib/savana/labels";
import { TASK_PRIORITIES, type AgentId, type Task, type TaskPriority } from "@/lib/savana/types";
import { validateCreateTask } from "@/lib/savana/validation";
import { savanaApi } from "../api";
import { Button, fieldClass } from "./ui";

export function CreateTaskDialog({
  open,
  onClose,
  onCreated,
  defaultAgentId = "nexo",
  projects,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (task: Task) => void;
  defaultAgentId?: AgentId;
  projects: string[];
}) {
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [project, setProject] = useState("");
  const [agentId, setAgentId] = useState<AgentId>(defaultAgentId);
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { title, briefing, priority, project, agentId, dueDate: dueDate || null };
    const checked = validateCreateTask(payload);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setSaving(true);
    try {
      const task = await savanaApi.createTask(checked.value);
      setTitle("");
      setBriefing("");
      setDueDate("");
      setErrors([]);
      onCreated(task);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Erro ao criar tarefa."]);
    } finally {
      setSaving(false);
    }
  };

  const agent = SAVANA_AGENTS.find((a) => a.id === agentId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nova-tarefa-titulo"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl border border-savana-gold/25 bg-savana-deep p-6 text-savana-ivory shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-savana-gold">Central de Comando</p>
            <h2 id="nova-tarefa-titulo" className="mt-1 text-xl font-semibold">
              Nova tarefa
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-savana-ivory/50 hover:text-savana-ivory" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-savana-ivory/70">Título</span>
            <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} autoFocus required />
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs text-savana-ivory/70">Briefing</span>
            <textarea
              className={`${fieldClass} min-h-[130px]`}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              maxLength={8000}
              placeholder="Contexto, objetivo, critérios de pronto, restrições…"
              required
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-savana-ivory/70">Agente responsável</span>
            <select className={fieldClass} value={agentId} onChange={(e) => setAgentId(e.target.value as AgentId)}>
              {SAVANA_AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-savana-ivory/70">Prioridade</span>
            <select className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-savana-ivory/70">Projeto</span>
            <input
              className={fieldClass}
              value={project}
              onChange={(e) => setProject(e.target.value)}
              list="savana-projetos"
              maxLength={80}
              placeholder="Ex.: Comunidade, Plataforma, Evento de lançamento"
              required
            />
            <datalist id="savana-projetos">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label>
            <span className="mb-1 block text-xs text-savana-ivory/70">Prazo (opcional)</span>
            <input type="date" className={fieldClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        {agent ? (
          <p className="mt-4 rounded-lg border border-savana-ivory/10 bg-savana-graphite/50 px-3 py-2 text-xs text-savana-ivory/60">
            <span className="font-semibold text-savana-ivory/80">{agent.name}:</span> {agent.mission}
          </p>
        ) : null}

        {errors.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-lg border border-[#d9776b]/50 bg-[#d9776b]/10 px-3 py-2 text-sm text-[#f0aaa1]">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="gold" disabled={saving}>
            {saving ? "Criando…" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </div>
  );
}
