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

## 3. Arquitetura preparada para Claude Code 🧱

Arquivos: `savana/server/runtime/types.ts` (contrato), `runtime/claudeCode.ts`, `runtime/safety.ts`, tabela `runs` em `savana/server/db.ts`.

Já existe:
- Contrato `AgentRuntime` — runtimes só reagem a eventos e escrevem pelo `SavanaService`, então máquina de estados e gate de aprovação valem para qualquer runtime.
- Verificação de requisitos (exibida em "Como ativar agentes reais").
- Plano de worktree isolada por tarefa de código: branch `savana/<agente>/<id>`, pasta dentro de `SAVANA_WORKTREE_ROOT`, caminho validado para não escapar da raiz.
- Prompt por agente montado a partir de missão, briefing e permissões (livre / exige aprovação / proibido), registrado na execução.
- Registro de execução (`runs`): prompt, worktree, branch, comando, arquivos alterados, resumo do resultado, exit code, horários.
- Com `SAVANA_RUNTIME=claude-code`, cada nova tarefa gera uma execução com status **planejado**. Nenhum processo é iniciado.

## 4. O que falta para ativar agentes Claude Code reais ⏳

1. **Executor de processos** (`runtime/claudeCode.ts`): iniciar `claude -p` por tarefa com `--output-format stream-json`, `cwd` na worktree, `--allowedTools` restrito por agente e `--disallowedTools` para git commit/push, gh, rede e comandos de `safety.ts`; ler o stream e gravar logs, arquivos alterados (`git diff --name-only`) e resultado no `runs`.
2. **Criação/limpeza de worktrees** com `git worktree add/remove` a partir do plano já gerado (somente dentro de `SAVANA_WORKTREE_ROOT`).
3. **Ponte de aprovação**: quando o agente quiser commit/push/PR/mensagem/credencial, pausar a execução, chamar `requestApproval` e só continuar após decisão humana; executar a ação aprovada pelo backend, não pelo agente.
4. **Cancelamento e timeout** por execução, com limite de custo/tempo por tarefa.
5. **Autenticação** da interface antes de qualquer uso fora de `localhost` (hoje o backend recusa hosts que não sejam loopback).
6. Configurar no computador que roda o backend: Claude Code instalado e logado, `SAVANA_REPO_ROOT`, `SAVANA_WORKTREE_ROOT` (fora do repositório) e, por último, `SAVANA_CLAUDE_CODE_ENABLED=true`.

Para os agentes não técnicos (NEXO, ATLAS, LUME, PULSO), o mesmo executor serve com uma pasta de trabalho de documentos em vez de worktree de código; integrações com CRM, redes ou mensagens exigem conectores próprios e passam sempre pelo gate de aprovação.

## 5. Limitações conhecidas

- Sem autenticação: uso apenas local (loopback).
- O status "concluído/falhou" do agente volta a "disponível" 10 minutos após a última tarefa encerrada.
- A mesa de cada agente no 3D é atribuída automaticamente pelo Claw3D; a "área" do agente é descritiva.
- O escritório 3D herda painéis do Claw3D voltados ao OpenClaw (marketplace, analytics, gym, etc.); eles continuam lá, mas não fazem parte do fluxo Savana.
- 5 testes de unidade do Claw3D já falhavam no commit original (`agentChatPanel-controls`, `agentFleetHydration`, `useGatewayConnection`); não foram alterados.
- `npm run build` (produção) não foi validado neste ambiente: o layout baixa fontes do Google no build. O modo de desenvolvimento (`npm run savana`) foi testado.

## 6. Pontos que exigem autorização do responsável

- Instalar/logar o Claude Code e fornecer credenciais (nenhuma foi pedida ou usada).
- Escolher o repositório e a pasta de worktrees que FORJA poderá usar.
- Implementar e habilitar o executor (`SAVANA_CLAUDE_CODE_ENABLED=true`).
- Qualquer integração externa (GitHub, Telegram, Slack, CRM, banco remoto) e qualquer deploy.
- Publicar esta branch em um repositório remoto.
