"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AGENT_STATUS_LABEL,
  AGENT_STATUS_TONE,
  PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  type StatusTone,
} from "@/lib/savana/labels";
import type { AgentStatus, TaskPriority, TaskStatus } from "@/lib/savana/types";

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-[#8a958e]/40 bg-[#8a958e]/10 text-[#c9cfca]",
  ok: "border-[#7fbf95]/45 bg-[#7fbf95]/10 text-[#a9dbb9]",
  active: "border-[#5fb38a]/55 bg-[#5fb38a]/15 text-[#9fe0bd]",
  warn: "border-[#9fb4d6]/45 bg-[#9fb4d6]/10 text-[#c3d2ea]",
  danger: "border-[#d9776b]/55 bg-[#d9776b]/12 text-[#f0aaa1]",
  gold: "border-savana-gold/60 bg-savana-gold/15 text-[#e6cf9f]",
};

const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-[#8a958e]",
  ok: "bg-[#7fbf95]",
  active: "bg-[#5fb38a] animate-pulse",
  warn: "bg-[#9fb4d6]",
  danger: "bg-[#d9776b]",
  gold: "bg-savana-gold animate-pulse",
};

export function Badge({ tone, children, title }: { tone: StatusTone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${TONE_CLASS[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {children}
    </span>
  );
}

export const AgentStatusBadge = ({ status, title }: { status: AgentStatus; title?: string }) => (
  <Badge tone={AGENT_STATUS_TONE[status]} title={title}>
    {AGENT_STATUS_LABEL[status]}
  </Badge>
);

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge tone={TASK_STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Badge>
);

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  baixa: "text-[#9aa59e]",
  media: "text-savana-ivory/80",
  alta: "text-savana-gold",
  critica: "text-[#f0aaa1] font-semibold",
};

export const PriorityLabel = ({ priority }: { priority: TaskPriority }) => (
  <span className={`text-[11px] uppercase tracking-[0.14em] ${PRIORITY_CLASS[priority]}`}>
    {PRIORITY_LABEL[priority]}
  </span>
);

export const SimulatedTag = () => (
  <span
    title="Gerado pelo modo demonstração. Não é resultado real."
    className="rounded border border-dashed border-savana-gold/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.18em] text-savana-gold"
  >
    Simulado
  </span>
);

export function AgentAvatar({
  name,
  color,
  status,
  size = 44,
}: {
  name: string;
  color: string;
  status?: AgentStatus;
  size?: number;
}) {
  const tone = status ? AGENT_STATUS_TONE[status] : null;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`g-${name}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1e4a35" />
            <stop offset="1" stopColor="#10281d" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22.5" fill={`url(#g-${name})`} stroke={color} strokeWidth="1.5" />
        <path d="M9 31 Q24 22 39 31" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
        <text
          x="24"
          y="29"
          textAnchor="middle"
          fontSize="17"
          fontWeight="600"
          letterSpacing="0.5"
          fill="#f4f0e7"
          fontFamily="var(--font-sans), sans-serif"
        >
          {name.slice(0, 1)}
        </text>
      </svg>
      {tone ? (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-savana-graphite ${TONE_DOT[tone]}`}
        />
      ) : null}
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-savana-gold/15 bg-[linear-gradient(180deg,rgba(30,74,53,0.35),rgba(16,40,29,0.55))] p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] ${className}`}
    >
      {title ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-savana-gold">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export const Button = ({
  children,
  variant = "ghost",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "danger" }) => {
  const styles = {
    gold: "bg-savana-gold text-savana-graphite hover:bg-[#d6b77d] border-savana-gold",
    ghost: "border-savana-ivory/20 text-savana-ivory/85 hover:border-savana-gold/60 hover:text-savana-ivory",
    danger: "border-[#d9776b]/50 text-[#f0aaa1] hover:bg-[#d9776b]/10",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
};

export const fieldClass =
  "w-full rounded-lg border border-savana-ivory/15 bg-savana-graphite/60 px-3 py-2 text-sm text-savana-ivory placeholder:text-savana-ivory/30 focus:border-savana-gold/70 focus:outline-none";

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function SavanaMark({ size = 30 }: { size?: number }) {
  // Abstract horizon: a rising arc over three strata lines.
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#10281d" stroke="#c8a66a" strokeOpacity="0.55" />
      <path d="M10 23 A10 10 0 0 1 30 23" fill="none" stroke="#c8a66a" strokeWidth="2" />
      <path d="M8 26 H32" stroke="#f4f0e7" strokeOpacity="0.85" strokeWidth="1.6" />
      <path d="M12 29.5 H28" stroke="#f4f0e7" strokeOpacity="0.5" strokeWidth="1.4" />
      <path d="M16 33 H24" stroke="#f4f0e7" strokeOpacity="0.3" strokeWidth="1.2" />
    </svg>
  );
}

export const NavLink = ({ href, children, active }: { href: string; children: ReactNode; active?: boolean }) => (
  <Link
    href={href}
    className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
      active ? "bg-savana-gold/15 text-savana-gold" : "text-savana-ivory/70 hover:text-savana-ivory"
    }`}
  >
    {children}
  </Link>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-savana-ivory/10 px-4 py-6 text-center text-sm text-savana-ivory/45">
    {children}
  </p>
);
