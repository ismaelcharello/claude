"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { RuntimeInfo } from "@/lib/savana/types";
import type { RealtimeState } from "../useSavanaData";
import { NavLink, SavanaMark } from "./ui";

const REALTIME_LABEL: Record<RealtimeState, { text: string; dot: string }> = {
  conectando: { text: "Conectando", dot: "bg-savana-ivory/40" },
  ao_vivo: { text: "Ao vivo", dot: "bg-[#5fb38a] animate-pulse" },
  reconectando: { text: "Reconectando", dot: "bg-[#d9776b]" },
};

export function RuntimeBanner({ runtime }: { runtime: RuntimeInfo }) {
  const [open, setOpen] = useState(false);
  const demo = runtime.mode === "demonstracao";
  return (
    <div
      className={`border-b px-6 py-2.5 text-sm ${
        demo
          ? "border-savana-gold/40 bg-[repeating-linear-gradient(135deg,rgba(200,166,106,0.16)_0_12px,rgba(200,166,106,0.06)_12px_24px)] text-[#ecd9b1]"
          : "border-savana-ivory/10 bg-savana-graphite/80 text-savana-ivory/80"
      }`}
      role="status"
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
            demo ? "bg-savana-gold text-savana-graphite" : "border border-savana-gold/50 text-savana-gold"
          }`}
        >
          {demo ? "Modo demonstração" : runtime.label}
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-snug">{runtime.summary}</span>
        {runtime.requirements.length > 0 || runtime.nextSteps.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-savana-gold underline-offset-4 hover:underline"
          >
            {open ? "Ocultar orientações" : "Como ativar agentes reais"}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mx-auto mt-3 grid max-w-[1400px] gap-4 pb-2 md:grid-cols-2">
          {runtime.requirements.length > 0 ? (
            <div>
              <h3 className="mb-2 text-[11px] uppercase tracking-[0.2em] text-savana-gold">Requisitos do Claude Code</h3>
              <ul className="space-y-1.5">
                {runtime.requirements.map((req) => (
                  <li key={req.id} className="flex gap-2 text-[13px]">
                    <span className={req.ok ? "text-[#7fbf95]" : "text-[#d9776b]"}>{req.ok ? "✓" : "✗"}</span>
                    <span>
                      {req.label}
                      {!req.ok ? <span className="block text-xs text-savana-ivory/50">{req.hint}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {runtime.nextSteps.length > 0 ? (
            <div>
              <h3 className="mb-2 text-[11px] uppercase tracking-[0.2em] text-savana-gold">Próximos passos</h3>
              <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
                {runtime.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SavanaShell({
  children,
  runtime,
  realtime,
  active,
}: {
  children: ReactNode;
  runtime: RuntimeInfo | null;
  realtime: RealtimeState;
  active: "central" | "agente" | "tarefa";
}) {
  const live = REALTIME_LABEL[realtime];
  return (
    <div className="savana-scope h-full overflow-y-auto bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(30,74,53,0.55),transparent),linear-gradient(180deg,#10281d_0%,#131714_70%)] text-savana-ivory">
      <header className="sticky top-0 z-30 border-b border-savana-gold/15 bg-savana-deep/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
          <Link href="/savana" className="flex items-center gap-3">
            <SavanaMark />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-[0.32em]">SAVANA</span>
              <span className="block text-[10px] uppercase tracking-[0.28em] text-savana-gold">Command Center</span>
            </span>
          </Link>
          <nav className="ml-6 flex items-center gap-1">
            <NavLink href="/savana" active={active === "central"}>
              Central de Comando
            </NavLink>
            <Link
              href="/office"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide text-savana-ivory/70 hover:text-savana-ivory"
            >
              Escritório 3D
            </Link>
          </nav>
          <span className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-savana-ivory/60">
            <span className={`h-2 w-2 rounded-full ${live.dot}`} />
            {live.text}
          </span>
        </div>
        {runtime ? <RuntimeBanner runtime={runtime} /> : null}
      </header>
      <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
      <footer className="mx-auto max-w-[1400px] px-6 pb-10 text-[11px] text-savana-ivory/35">
        Savana Command Center · construído sobre o{" "}
        <a className="underline" href="https://github.com/iamlukethedev/Claw3D" target="_blank" rel="noreferrer">
          Claw3D
        </a>{" "}
        de LukeTheDev (licença MIT).
      </footer>
    </div>
  );
}

export const ErrorNotice = ({ message }: { message: string }) => (
  <div className="mb-6 rounded-xl border border-[#d9776b]/50 bg-[#d9776b]/10 px-4 py-3 text-sm text-[#f0aaa1]">
    {message}
  </div>
);
