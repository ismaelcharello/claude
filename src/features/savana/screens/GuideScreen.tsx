"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SAVANA_AGENTS } from "@/lib/savana/agents";
import { AGENT_GUIDE, BRIEFING_TEMPLATE, FIELD_HELP, STATUS_HELP } from "@/lib/savana/guide";
import { AGENT_STATUS_LABEL, PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/savana/labels";
import { AGENT_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/savana/types";
import { savanaApi } from "../api";
import { SavanaShell } from "../components/SavanaShell";
import { AgentAvatar, AgentStatusBadge, Panel, TaskStatusBadge } from "../components/ui";
import { useLiveResource } from "../useSavanaData";

const SECTIONS = [
  { id: "visao-geral", title: "1. O que é cada tela" },
  { id: "pedir", title: "2. Como pedir algo a um agente" },
  { id: "preencher", title: "3. Como preencher a tarefa" },
  { id: "agentes", title: "4. Qual agente escolher" },
  { id: "acompanhar", title: "5. Como acompanhar uma tarefa" },
  { id: "aprovacoes", title: "6. Aprovações" },
  { id: "estados", title: "7. O que significa cada status" },
  { id: "escritorio", title: "8. Usando o escritório 3D" },
  { id: "modos", title: "9. Os três modos" },
  { id: "ligar-ia", title: "10. Ligar a IA (passo a passo)" },
  { id: "rotina", title: "11. Rotina sugerida" },
  { id: "duvidas", title: "12. Dúvidas frequentes" },
];

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-40">
    <Panel title={title}>
      <div className="space-y-3 text-[15px] leading-relaxed text-savana-ivory/85">{children}</div>
    </Panel>
  </section>
);

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-3">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-savana-gold text-xs font-bold text-savana-graphite">
      {n}
    </span>
    <span>{children}</span>
  </li>
);

const B = ({ children }: { children: ReactNode }) => <strong className="text-savana-ivory">{children}</strong>;

export function GuideScreen() {
  const { data, realtime } = useLiveResource(savanaApi.overview);
  return (
    <SavanaShell runtime={data?.runtime ?? null} realtime={realtime} active="guia">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-savana-gold">Guia de uso</p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Como usar o Savana Command Center</h1>
        <p className="mt-1 max-w-3xl text-sm text-savana-ivory/60">
          Tudo o que você precisa para pedir trabalho aos agentes, acompanhar o andamento e tomar decisões. Leva uns 5
          minutos para ler.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="hidden xl:block">
          <ul className="sticky top-40 space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-savana-ivory/60 hover:bg-savana-mid/30 hover:text-savana-ivory">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <Section id="visao-geral" title="1. O que é cada tela">
            <ul className="space-y-3">
              <li>
                <B>Central de Comando</B> (<Link className="text-savana-gold underline" href="/savana">/savana</Link>) — onde
                você trabalha no dia a dia: cria tarefas, vê a fila, os bloqueios e as aprovações pendentes. É a tela mais
                prática.
              </li>
              <li>
                <B>Escritório 3D</B> (<Link className="text-savana-gold underline" href="/office">/office</Link>) — a visão
                imersiva da equipe. Mostra onde cada agente está e se está em atividade. Clicar num agente abre um cartão com
                status e o botão <B>Pedir tarefa</B>.
              </li>
              <li>
                <B>Página do agente</B> — missão, permissões (o que ele pode fazer sozinho, o que precisa da sua aprovação e o
                que é proibido), tarefas, logs e resultados.
              </li>
              <li>
                <B>Página da tarefa</B> — briefing, subtarefas, linha do tempo, aprovações e artefatos (resultados). É onde
                você muda o status e registra notas no histórico.
              </li>
            </ul>
          </Section>

          <Section id="pedir" title="2. Como pedir algo a um agente">
            <p>Todo pedido vira uma <B>tarefa</B>. Não existe pedido &quot;solto&quot; por chat: assim tudo fica registrado.</p>
            <ol className="space-y-3">
              <Step n={1}>
                Abra a <Link className="text-savana-gold underline" href="/savana">Central de Comando</Link> e clique em{" "}
                <B>+ Nova tarefa</B>. (Ou, no escritório 3D, clique no agente e em <B>Pedir tarefa</B>.)
              </Step>
              <Step n={2}>
                Escolha o <B>agente responsável</B>. Na dúvida, escolha o <B>NEXO</B>.
              </Step>
              <Step n={3}>
                Clique em <B>Preencher com exemplo</B> para ver um pedido bem escrito daquele agente, ou em{" "}
                <B>Usar modelo</B> para receber a estrutura em branco.
              </Step>
              <Step n={4}>
                Ajuste título, briefing, prioridade, projeto e (se houver) prazo. Clique em <B>Criar tarefa</B>.
              </Step>
              <Step n={5}>A tarefa aparece na fila da Central e no histórico do agente.</Step>
            </ol>
          </Section>

          <Section id="preencher" title="3. Como preencher a tarefa">
            <dl className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ["Título", FIELD_HELP.title],
                  ["Briefing", FIELD_HELP.briefing],
                  ["Agente responsável", FIELD_HELP.agent],
                  ["Prioridade", FIELD_HELP.priority],
                  ["Projeto", FIELD_HELP.project],
                  ["Prazo", FIELD_HELP.dueDate],
                ] as const
              ).map(([label, help]) => (
                <div key={label} className="rounded-xl border border-savana-ivory/10 bg-savana-graphite/40 p-3">
                  <dt className="text-sm font-semibold text-savana-gold">{label}</dt>
                  <dd className="mt-1 text-sm text-savana-ivory/75">{help}</dd>
                </div>
              ))}
            </dl>
            <p>
              <B>Prioridades:</B>{" "}
              {TASK_PRIORITIES.map((p) => PRIORITY_LABEL[p]).join(" · ")}.
            </p>
            <p>Modelo de briefing (o botão &quot;Usar modelo&quot; cola exatamente isto):</p>
            <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-mono text-[13px] text-savana-ivory/75">{BRIEFING_TEMPLATE}</pre>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[#d9776b]/40 bg-[#d9776b]/10 p-3 text-sm">
                <p className="font-semibold text-[#f0aaa1]">Pedido fraco</p>
                <p className="mt-1 text-savana-ivory/75">&quot;Faz um post sobre o evento.&quot;</p>
                <p className="mt-1 text-xs text-savana-ivory/50">Sem contexto, sem objetivo, sem saber quando está pronto.</p>
              </div>
              <div className="rounded-xl border border-[#7fbf95]/40 bg-[#7fbf95]/10 p-3 text-sm">
                <p className="font-semibold text-[#a9dbb9]">Pedido bom</p>
                <p className="mt-1 text-savana-ivory/75">
                  &quot;Post de LinkedIn convidando executivos para o encontro de 20/11. Objetivo: 30 inscrições. Entregar 2
                  versões de até 900 caracteres, tom sofisticado, com chamada para o link de inscrição.&quot;
                </p>
              </div>
            </div>
          </Section>

          <Section id="agentes" title="4. Qual agente escolher">
            <div className="space-y-3">
              {SAVANA_AGENTS.map((agent) => (
                <div key={agent.id} className="flex gap-4 rounded-xl border border-savana-ivory/10 bg-savana-graphite/40 p-4">
                  <AgentAvatar name={agent.name} color={agent.color} size={44} />
                  <div className="min-w-0">
                    <p className="font-semibold tracking-[0.12em]">
                      {agent.name} <span className="font-normal tracking-normal text-savana-ivory/55">· {agent.role}</span>
                    </p>
                    <p className="mt-1 text-sm text-savana-ivory/75">{AGENT_GUIDE[agent.id].whenToUse}</p>
                    <p className="mt-1 text-sm text-savana-ivory/55">
                      Exemplo de pedido: <em>{AGENT_GUIDE[agent.id].examples[0].title}</em>
                    </p>
                    <Link href={`/savana?nova=${agent.id}`} className="mt-2 inline-block text-xs font-semibold text-savana-gold hover:underline">
                      Pedir tarefa para {agent.name} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="acompanhar" title="5. Como acompanhar uma tarefa">
            <p>Clique no nome da tarefa (na Central ou na página do agente). Na página da tarefa você pode:</p>
            <ul className="list-inside list-disc space-y-1 marker:text-savana-gold">
              <li>
                <B>Mudar o status</B> no painel &quot;Status&quot; (só aparecem os próximos passos permitidos). Para{" "}
                <B>bloquear</B>, o sistema pede o motivo.
              </li>
              <li>
                <B>Subtarefas</B>: quebre o trabalho em passos e marque como feitos.
              </li>
              <li>
                <B>Notas</B>: registre decisões ou comentários na linha do tempo.
              </li>
              <li>
                <B>Artefatos</B>: guarde o resultado (texto, link, caminho de arquivo ou relatório).
              </li>
              <li>
                <B>Linha do tempo</B>: tudo o que aconteceu, com quem fez (Você, Sistema, Agente ou Demonstração).
              </li>
            </ul>
            <p>A tela se atualiza sozinha (indicador &quot;Ao vivo&quot; no topo).</p>
          </Section>

          <Section id="aprovacoes" title="6. Aprovações">
            <p>
              Nenhum agente pode, sem a sua decisão: <B>escrever fora do sistema, fazer commit, push ou pull request, enviar
              mensagens ou usar credenciais</B>.
            </p>
            <ol className="space-y-3">
              <Step n={1}>
                Quando um agente precisa disso, a tarefa vai para <TaskStatusBadge status="aguardando_aprovacao" /> e o pedido
                aparece no topo da Central, em <B>Aprovações pendentes</B>.
              </Step>
              <Step n={2}>Leia o resumo e os detalhes do que será feito.</Step>
              <Step n={3}>
                Clique em <B>Aprovar</B> para liberar, ou em <B>Rejeitar</B> e escreva o motivo (obrigatório). Rejeitar deixa a
                tarefa <TaskStatusBadge status="bloqueado" /> com o seu motivo.
              </Step>
            </ol>
          </Section>

          <Section id="estados" title="7. O que significa cada status">
            <p className="text-sm text-savana-ivory/60">Status da tarefa:</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {TASK_STATUSES.map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm">
                  <span className="w-44 shrink-0">
                    <TaskStatusBadge status={s} />
                  </span>
                  <span className="text-savana-ivory/75">{STATUS_HELP[s]}</span>
                </li>
              ))}
            </ul>
            <p className="pt-2 text-sm text-savana-ivory/60">
              Status do agente (calculado automaticamente a partir das tarefas dele):{" "}
            </p>
            <div className="flex flex-wrap gap-2">
              {AGENT_STATUSES.map((s) => (
                <AgentStatusBadge key={s} status={s} />
              ))}
            </div>
            <p className="text-sm text-savana-ivory/65">
              <B>Offline</B> significa que nenhum runtime de IA está conectado: o agente não executa nada sozinho. É o
              estado normal enquanto o Claude Code não for ativado.
            </p>
            <p className="text-xs text-savana-ivory/45">
              Nomes técnicos: {TASK_STATUSES.map((s) => TASK_STATUS_LABEL[s]).join(", ")} /{" "}
              {AGENT_STATUSES.map((s) => AGENT_STATUS_LABEL[s]).join(", ")}.
            </p>
          </Section>

          <Section id="escritorio" title="8. Usando o escritório 3D">
            <ul className="list-inside list-disc space-y-1 marker:text-savana-gold">
              <li>
                <B>Arrastar</B> gira a câmera, <B>rolar</B> dá zoom, <B>espaço + arrastar</B> move a vista,{" "}
                <B>duplo clique</B> foca num ponto.
              </li>
              <li>Os três botões no canto superior esquerdo levam a câmera para visão geral, recepção e lounge.</li>
              <li>
                As <B>bolinhas coloridas no topo</B> são os agentes; o pontinho mostra o estado: verde = em atividade, amarelo
                = sem atividade, vermelho = com problema (bloqueio ou falha).
              </li>
              <li>
                Clique em um agente para abrir o cartão com status, missão e os botões <B>Pedir tarefa</B> e{" "}
                <B>Ver detalhes</B>.
              </li>
              <li>
                O painel Savana (canto superior direito) mostra o modo do runtime e os contadores de tarefas abertas,
                bloqueios e aprovações.
              </li>
              <li>
                Os móveis interativos (máquinas, telas, jukebox) vêm do projeto original Claw3D e são decorativos; o trabalho
                de verdade acontece pela Central.
              </li>
            </ul>
          </Section>

          <Section id="modos" title="9. Os três modos">
            <ul className="space-y-3">
              <li>
                <B>Modo real</B> (<code className="text-savana-gold">npm run savana</code>): tarefas, aprovações e histórico são
                reais e ficam salvos. Os agentes ficam <B>offline</B>, porque ainda não há IA conectada: você usa o sistema
                como uma central de gestão e atualiza o status manualmente.
              </li>
              <li>
                <B>Modo demonstração</B> (<code className="text-savana-gold">npm run savana:demo</code>): os agentes
                &quot;trabalham&quot; sozinhos seguindo um roteiro, para você ver o fluxo completo, inclusive aprovações. Tudo
                aparece marcado como <B>SIMULADO</B> e fica num banco separado — nada vai para o modo real.
              </li>
              <li>
                <B>Modo com IA</B> (<code className="text-savana-gold">npm run savana:ia</code>): igual ao modo real, mas
                NEXO, ATLAS, LUME e PULSO podem executar tarefas de verdade com o Claude Code, sempre que você clicar em{" "}
                <B>Executar com IA</B> na página da tarefa. Usa o mesmo banco do modo real.
              </li>
              <li>
                O banner no topo de todas as telas sempre mostra em qual modo você está.
              </li>
            </ul>
          </Section>

          <Section id="ligar-ia" title="10. Ligar a IA (passo a passo)">
            <p>Faça isto uma vez no seu Mac. Você vai usar o Terminal só para estes comandos.</p>
            <ol className="space-y-3">
              <Step n={1}>
                Instale o Claude Code. No Terminal, cole:{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5 text-savana-gold">npm install -g @anthropic-ai/claude-code</code>
              </Step>
              <Step n={2}>
                Faça login: digite <code className="rounded bg-black/30 px-1.5 py-0.5 text-savana-gold">claude</code>, aperte
                Enter e siga as instruções para entrar com a sua conta do Claude. Depois feche com <B>Ctrl + C</B>.
              </Step>
              <Step n={3}>
                Na pasta da Savana, inicie o sistema com IA:{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5 text-savana-gold">npm run savana:ia</code>
              </Step>
              <Step n={4}>
                O banner deve mostrar <B>Claude Code conectado</B>. Se não mostrar, clique em &quot;Como ativar agentes
                reais&quot; para ver o que falta.
              </Step>
              <Step n={5}>
                Faça um <B>teste inofensivo</B>: crie uma tarefa para o ATLAS como &quot;Resumir este texto em 3
                tópicos&quot; e cole um texto qualquer (sem dados privados) no briefing. Abra a tarefa e clique em{" "}
                <B>Executar com IA</B>.
              </Step>
              <Step n={6}>
                Acompanhe o log ao vivo. Em alguns minutos a tarefa vai para <TaskStatusBadge status="em_revisao" /> e o
                resultado aparece em <B>Artefatos</B>. Confira e clique em <B>→ Concluída</B> se estiver bom.
              </Step>
            </ol>
            <p className="text-sm text-savana-ivory/65">
              <B>Segurança:</B> cada tarefa roda numa pasta própria (<code>data/workspaces/</code>), com permissão só para
              ler e escrever arquivos ali. O agente não tem terminal nem internet e não consegue publicar, enviar mensagens,
              fazer commit ou usar senhas; se achar que algo precisa disso, ele lista em &quot;Ações que precisam de
              aprovação&quot; no resultado. Você pode <B>cancelar</B> a qualquer momento, e há um tempo-limite de 10 minutos.
            </p>
            <p className="text-sm text-savana-ivory/65">
              <B>Custo:</B> cada execução usa a sua conta do Claude (assinatura ou créditos). O custo informado aparece no
              resumo da execução quando disponível.
            </p>
            <p className="text-sm text-savana-ivory/65">
              <B>Ainda não:</B> o FORJA (código) só vai executar quando tivermos a pasta Git isolada e a aprovação de
              commit/push funcionando.
            </p>
          </Section>

          <Section id="rotina" title="11. Rotina sugerida">
            <ol className="space-y-3">
              <Step n={1}>De manhã, abra a Central e resolva primeiro as <B>Aprovações pendentes</B> e os <B>Bloqueios</B>.</Step>
              <Step n={2}>Crie as tarefas do dia. Coisas grandes ou confusas: mande para o NEXO organizar.</Step>
              <Step n={3}>Ao longo do dia, confira o que está <B>Em revisão</B> e conclua ou devolva com uma nota.</Step>
              <Step n={4}>No fim do dia, veja a página de cada agente para entender o que foi entregue.</Step>
            </ol>
          </Section>

          <Section id="duvidas" title="12. Dúvidas frequentes">
            <dl className="space-y-4">
              <div>
                <dt className="font-semibold text-savana-gold">Criei uma tarefa e nada aconteceu. Está quebrado?</dt>
                <dd className="text-savana-ivory/75">
                  Não. Nenhuma tarefa roda sozinha. No modo real sem IA ela fica na fila e você a move manualmente. No modo
                  com IA (<code>npm run savana:ia</code>), abra a tarefa e clique em <B>Executar com IA</B>.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-savana-gold">Posso conversar com os agentes pelo chat?</dt>
                <dd className="text-savana-ivory/75">
                  Ainda não: sem um modelo de IA conectado, o chat não teria respostas reais. Por isso todo pedido é feito por
                  tarefa.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-savana-gold">Errei um status. Como volto?</dt>
                <dd className="text-savana-ivory/75">
                  Use os botões do painel Status; por exemplo, uma tarefa bloqueada pode voltar para a fila. Tudo fica
                  registrado na linha do tempo.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-savana-gold">Meus dados ficam onde?</dt>
                <dd className="text-savana-ivory/75">
                  No seu computador, na pasta <code>data/</code> do projeto. Nada é enviado para fora.
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </SavanaShell>
  );
}
