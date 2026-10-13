# Savana Command Center — status da implementação

Branch: `savana-command-center` · Base: Claw3D `0565b78` (MIT, LukeTheDev)

Legenda: ✅ pronto e funcionando de verdade · 🎭 modo demonstração (simulado) · 🧱 arquitetura preparada, não ativa · ⏳ não implementado

## 1. Pronto de verdade ✅

| Área | O que funciona |
| --- | --- |
| Backend | Node + TypeScript (`savana/server`, executado com `tsx`), API REST em `127.0.0.1:3100`, só aceita host de loopback. |
| Persistência | SQLite local (`data/savana.db`) com migrações versionadas: tarefas, subtarefas, linha do tempo, aprovações, artefatos, logs de agente e execuções (`runs`). |
| Tarefas | Criação com título, briefing, prioridade, projeto, agente responsável e prazo opcional; validação no frontend e no backend. |
| Status | Máquina de estados com transições permitidas (`src/lib/savana/stateMachine.ts`); transições inválidas são recusadas; bloqueio exige motivo. |
| Linha do tempo | Cada criação, mudança de status, nota, subtarefa, aprovação e artefato é registrada com autor (você, sistema, agente, demonstração). |
| Aprovações | Gate obrigatório para escrita externa, commit, push, PR, mensagem e uso de credencial. Tarefa fica em "aguardando aprovação" até decisão; rejeição exige motivo e bloqueia a tarefa. |
| Estados de agente | offline, disponível, preparando, trabalhando, bloqueado, aguardando aprovação, em revisão, concluído, falhou — derivados das tarefas reais e do runtime. Sem runtime, todos ficam offline. |
| Central de Comando 2D | `/savana`: indicadores, aprovações pendentes, bloqueios, fila/andamento/encerradas com filtros, agentes, criação de tarefa. |
| Página de agente | `/savana/agents/[id]`: missão, área, responsabilidades, permissões (livre / exige aprovação / proibido), tarefas, logs, resultados e aprovações. |
| Página de tarefa | `/savana/tasks/[id]`: briefing, subtarefas, linha do tempo, notas, transições de status, aprovações, artefatos e execuções do runtime. |
| Tempo real | WebSocket `/api/savana/ws` (proxy do Studio → backend). Central, páginas e escritório se atualizam sozinhos. |
| Escritório 3D | Base Claw3D adaptada: título Savana, paleta (verde profundo, verde médio, dourado champanhe, off-white, grafite), estandarte Savana, cinco agentes com avatar executivo próprio, mesas, nome e função; clique no agente abre cartão com status real e link para a página. |
| Português e ajuda | Interface Savana em português; no escritório 3D os textos visíveis foram traduzidos e os painéis do Claw3D fora do fluxo Savana ficam ocultos (Kanban próprio, Marketplace, Analytics, HQ, console de eventos, edição de layout, configurações de voz, chat sem modelo, assistente de conexão). Guia completo em `/savana/guia`; formulário de tarefa com ajuda em cada campo, modelo de briefing e exemplo por agente; "Pedir tarefa" direto do cartão do agente no 3D. |
| Modo honesto | Banner de runtime em todas as telas e no 3D; chat do escritório responde com mensagem automática dizendo que não há modelo conectado. |
| Segurança | Validação de entrada, limite de corpo (64 KB), exigência de `application/json` nas escritas, checagem de Origin no WebSocket, validação de caminhos relativos (sem `..`, absolutos, `~`, `.git`), links só http(s), mascaramento de segredos em logs/linha do tempo, lista de comandos proibidos para o futuro executor. Nenhum segredo no frontend. |
| Testes | `npm run test:savana` — 17 testes: criação de tarefa, mudança de status, aprovação, runtime não configurado, Claude Code planejado, demonstração e segurança. |

### Correções feitas no Claw3D original para o modo demo rodar localmente
- Servidor não subia em máquinas sem IPv6 (`::1`): agora ignora a família indisponível.
- HMR do Next 16 ficava pendurado no servidor customizado e bloqueava o WebSocket do gateway no Chromium.
- Iluminação do 3D baixava um HDR de CDN pública e derrubava a cena offline → iluminação local.
- Rótulos 3D baixavam dados de fonte de CDN e congelavam a cena offline → fonte local (Carlito, OFL).
- Dois loops de renderização ("Maximum update depth exceeded") na tela do escritório.
- No modo demo, um agente provisório "Main" impedia o carregamento dos agentes reais do gateway.

## 2. Modo demonstração 🎭

Ativado só com `npm run savana:demo` (ou `SAVANA_RUNTIME=demo`).

- Um roteiro fixo leva cada nova tarefa por: na fila → preparando (cria subtarefas "(simulado)") → trabalhando → em revisão → concluída, com um artefato "Resultado simulado".
- FORJA pede aprovação de **commit** e PULSO pede aprovação de **envio de mensagem** — para demonstrar o gate. Aprovar só avança o roteiro; nada é commitado ou enviado.
- Todo registro gerado leva `simulated = 1`, aparece com a etiqueta **SIMULADO** e texto `[DEMONSTRAÇÃO]`.
- Usa um banco separado (`data/savana-demo.db`) e configurações de Studio separadas (`data/studio-demo`), então nunca se mistura com dados reais.
- O chat do escritório nesse modo devolve respostas pré-programadas, identificadas como tal.

## 3. Execução real com Claude Code ✅ (NEXO, ATLAS, LUME, PULSO)

Iniciar com `npm run savana:ia` (equivale a `SAVANA_RUNTIME=claude-code` + `SAVANA_CLAUDE_CODE_ENABLED=true`).

- **Só por clique humano**: nenhuma tarefa roda sozinha; o botão "Executar com IA" fica na página da tarefa.
- **Pasta isolada por tarefa** (`data/workspaces/<id>`), com o briefing em `BRIEFING.md` e a entrega em `resultado.md`.
- **Ferramentas**: só `Read, Write, Edit, Glob, Grep`. Proibidas: `Bash, WebFetch, WebSearch, Task, NotebookEdit`. Sem terminal e sem internet, publicar, enviar mensagens, fazer commit/push ou usar credenciais é **impossível por construção**; o agente lista essas ações em "Ações que precisam de aprovação".
- **Ambiente do processo filtrado**: só PATH/HOME/idioma/proxy e `ANTHROPIC_API_KEY` (se existir). Nenhum outro segredo do servidor chega ao agente (coberto por teste).
- **Registro**: prompt, comando, pasta, arquivos produzidos, custo informado, código de saída, log ao vivo (texto e ferramentas usadas) e linha do tempo.
- **Ciclo de status**: na fila → preparando → trabalhando → em revisão (sucesso) | falhou (erro, limite de turnos, sem `resultado.md`, tempo-limite) | bloqueado (cancelado por você). Quem conclui é sempre o humano.
- **Controles**: cancelar a qualquer momento; tempo-limite (`SAVANA_RUN_TIMEOUT_MS`, padrão 10 min); limite de turnos (`SAVANA_MAX_TURNS`, padrão 25); uma execução por tarefa; execuções interrompidas por reinício do servidor são marcadas como falha.
- **Testes**: executor coberto com um binário `claude` falso (sucesso, falha, sem resultado, cancelamento, tempo-limite, duplicidade, FORJA bloqueado, segredo não vazado). Nenhum teste chamou o modelo real.

## 4. O que ainda falta ⏳

1. **Primeiro teste com o Claude Code real no Mac do Ismael** (instalação + login + `npm run savana:ia` + tarefa inofensiva). O executor só foi testado com o binário falso neste ambiente.
2. **FORJA (código)**: criar/remover worktree Git isolada a partir do plano já existente (`planWorktree`), liberar `Bash` restrito a comandos de teste, e transformar commit/push em ações executadas **pelo backend** somente após aprovação.
3. **Ponte de aprovação durante a execução** (pausar o agente e retomar após decisão). Hoje as ações sensíveis simplesmente não estão disponíveis ao agente.
4. **Anexos**: permitir colocar documentos de entrada na pasta da tarefa pela interface (hoje o insumo é o briefing).
5. **Autenticação** da interface antes de qualquer uso fora de `localhost`.

## 5. Limitações conhecidas

- Sem autenticação: uso apenas local (loopback).
- O status "concluído/falhou" do agente volta a "disponível" 10 minutos após a última tarefa encerrada.
- A mesa de cada agente no 3D é atribuída automaticamente pelo Claw3D; a "área" do agente é descritiva.
- Os móveis interativos do escritório 3D (máquinas, telas, jukebox, academia) vêm do Claw3D, continuam em inglês e não fazem parte do fluxo Savana.
- 5 testes de unidade do Claw3D já falhavam no commit original (`agentChatPanel-controls`, `agentFleetHydration`, `useGatewayConnection`); não foram alterados.
- `npm run build` (produção) não foi validado neste ambiente: o layout baixa fontes do Google no build. O modo de desenvolvimento (`npm run savana`) foi testado.

## 6. Pontos que exigem autorização do responsável

- Instalar/logar o Claude Code e fornecer credenciais (nenhuma foi pedida ou usada).
- Escolher o repositório e a pasta de worktrees que FORJA poderá usar.
- Implementar e habilitar o executor (`SAVANA_CLAUDE_CODE_ENABLED=true`).
- Qualquer integração externa (GitHub, Telegram, Slack, CRM, banco remoto) e qualquer deploy.
- Publicar esta branch em um repositório remoto.
