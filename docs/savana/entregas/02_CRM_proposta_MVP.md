# CRM Savana — Descoberta e proposta de MVP (Bloco 1, rascunho)

**Status:** PROPOSTA para aprovação de escopo. Nada foi implementado, publicado, migrado ou reativado.
**Base:** `docs/savana/contexto/Briefing_CRM_Savana.md` e `SAVANA_CONTEXTO_PARA_CLAUDE.md`.
**Limite desta análise:** não tive acesso ao código nem à base do **Stormfy**. As referências a ele vêm só do manual (relato histórico de 01/10/2026). As estimativas de esforço valem para a opção "construir do zero" e precisam ser revistas depois de inspecionar qualquer base autorizada.

---

## 1. Recomendação

**Construir um CRM interno, enxuto e próprio da Savana**, reaproveitando do Stormfy apenas **conceitos de produto**: ata preservada, síntese curta e ações com origem "combinado" ou "sugestão". Código e dados não.

**Por quê:**
- O backend do Stormfy estava **INACTIVE** (relato de 12/10). Reativá-lo para estudo foi explicitamente vetado, e reaproveitar o código exigiria auditoria de licença, de propriedade e de isolamento antes de qualquer ganho.
- O MVP pedido é pequeno (6 entidades, 1 fluxo). Começar limpo custa pouco e evita herdar dados pessoais de outro produto.
- O **Command Center já tem**, em TypeScript e SQLite, o padrão de tarefa, status, histórico e aprovação. Ele serve de referência técnica interna para o "plano de ação".

**Hipótese de trabalho (a validar):** CRM de **operação interna da equipe Savana**, com 1 a 5 pessoas operando.

---

## 2. Usuários e fluxo principal

**Usuários (hipótese):**
- **Responsável comercial ou relacionamento:** cadastra, conduz reuniões, registra próximos passos.
- **Liderança (Rudy / Ismael):** acompanha o funil e decide oportunidades estratégicas.
- **Leitura eventual:** quem precisa consultar o histórico antes de uma conversa.

**Fluxo principal (do interesse à decisão):**

```
Interesse chega (evento, indicação, Instagram, contato direto)
        │
        ▼
[1] Cadastro rápido: contato + empresa + origem + interesse + responsável
        │      (o sistema avisa se já existe alguém com o mesmo e-mail ou telefone)
        ▼
[2] Oportunidade aberta na etapa "Novo interesse", com próxima ação e data
        │
        ▼
[3] Reunião registrada: ata completa preservada + síntese curta
        │
        ├─► Ações "combinado" (compromissos reais, com responsável e prazo)
        └─► Ações "sugestão" (ideias; viram compromisso só se alguém confirmar)
        │
        ▼
[4] Etapas avançam até a "Decisão": ganho, perdido (com motivo) ou pausado
        │
        ▼
[5] Histórico completo localizável pela busca (empresa, pessoa, período)
```

**A tela principal responde:** com quem falar agora, por quê, e qual é o próximo passo (lista de próximas ações por data, atrasadas no topo).

---

## 3. Comparativo de caminhos

| Critério | Construir do zero | Reaproveitar componentes do Stormfy | Evoluir a base do Stormfy |
| --- | --- | --- | --- |
| Tempo até o 1º fluxo útil | Médio (blocos abaixo) | Médio, mais o tempo de auditoria | Incerto (base inativa e não inspecionada) |
| Risco de dados de terceiros | Nenhum | Baixo, se só código | **Alto** (banco, contatos, atas) |
| Manutenção | Simples, código conhecido | Mista | Depende do estado atual |
| Isolamento e propriedade | Totalmente Savana | Exige verificar licença e autoria | Exige decisão societária e técnica |
| Pré-requisito | Nenhum | Acesso autorizado ao código | Acesso, reativação e auditoria |
| **Recomendação** | **✔ Agora** | Avaliar depois, peça por peça | Não recomendado neste momento |

---

## 4. Modelo mínimo de entidades

| Entidade | Campos mínimos | Observações |
| --- | --- | --- |
| **Empresa** | nome, setor (opcional), cidade (opcional), observações | Única por nome normalizado (aviso de duplicado) |
| **Contato** | nome, cargo, e-mail, telefone, empresa (opcional), origem, consentimento de contato (sim/não + data) | Aviso de duplicado por e-mail e telefone; profissional liberal pode não ter empresa |
| **Oportunidade** | título, contato/empresa, interesse (oferta), etapa, responsável, próxima ação + data, valor estimado (opcional), motivo de perda | Uma oportunidade por interesse; um contato pode ter várias |
| **Atividade** | tipo (ligação, mensagem, e-mail, nota), data, resumo, autor | Registro manual do que aconteceu; **não envia** nada |
| **Reunião** | data, participantes, **ata completa**, **síntese curta**, oportunidade relacionada | A ata nunca é sobrescrita pela síntese |
| **Ação (plano de ação)** | descrição, responsável, prazo, status (aberta, concluída, cancelada), **origem: combinado ou sugestão**, reunião de origem | Sugestão não vira compromisso sem confirmação humana |

**Dados que NÃO entram no MVP:** documentos pessoais, dados financeiros de terceiros, notas sensíveis sobre pessoas. Tudo além do mínimo precisa de justificativa.

---

## 5. Funil sugerido (hipótese para validar com PULSO)

| Etapa | Entra quando… | Sai quando… |
| --- | --- | --- |
| **1. Novo interesse** | Há contato identificado e uma origem registrada | Primeira conversa marcada ou realizada |
| **2. Conversa inicial** | A primeira conversa aconteceu | O interesse está qualificado (perfil e oferta fazem sentido) ou foi descartado |
| **3. Proposta / convite** | Uma oferta específica foi apresentada (Experience, comunidade, formação ou App) | Há resposta: aceita, negocia ou recusa |
| **4. Negociação** | A pessoa quer, mas há condições a ajustar | Condições fechadas ou desistência |
| **5. Decisão** | — | **Ganho** (o que define conversão: ver decisões), **Perdido** (com motivo obrigatório) ou **Pausado** (com data de retorno) |

**Cadência sugerida:** toda oportunidade aberta precisa ter próxima ação com data. Sem data, ela aparece em "Sem próximo passo".

---

## 6. Wireframes das telas essenciais (descrição)

**A. Hoje (tela inicial)**
```
┌──────────────────────────────────────────────────────────┐
│ CRM Savana     [Buscar empresa, pessoa…]      + Cadastro │
├──────────────────────────────────────────────────────────┤
│ ATRASADAS (2)                                            │
│  • Ligar para Ana (Empresa X) · venceu ontem · Ismael    │
│ HOJE (3)                                                 │
│  • Enviar proposta formação · João (Y) · Rudy            │
│ SEM PRÓXIMO PASSO (1)                                    │
│  • Oportunidade "Hub in-Company · Empresa Z"             │
└──────────────────────────────────────────────────────────┘
```
**B. Funil:** colunas por etapa, cartões com nome, oferta e próxima ação; arrastar só muda a etapa (com registro no histórico).
**C. Ficha do contato ou oportunidade:** dados principais no topo, próxima ação em destaque, linha do tempo (atividades, reuniões, mudanças de etapa) e ações abertas.
**D. Registrar reunião:** campos para data e participantes, **ata completa** (texto livre), **síntese** (manual; no futuro sugerida por IA, sempre editável) e lista de ações com origem combinado ou sugestão.
**E. Cadastro rápido:** nome, contato, empresa, origem, interesse e responsável. Aviso de duplicado antes de salvar.

**Estados obrigatórios em todas as telas:** vazio ("Nenhum contato ainda — cadastre o primeiro"), carregando, erro (com ação de tentar de novo) e sem permissão.
**Larguras a validar:** 390 px e 1440 px, navegação por teclado.

---

## 7. Dependências

- Decidir o público do CRM (interno, membros ou empresas clientes), quem acessa e qual oferta é prioridade.
- Definir **o que é conversão** (inscrição paga? membro ativo? contrato?).
- Decidir onde o sistema vai rodar (local, como o Command Center, ou servidor com login). **Com mais de uma pessoa usando, é obrigatório servidor com autenticação.**
- Política mínima de dados pessoais (consentimento, retenção, exclusão a pedido).
- IA para síntese de ata: **opcional e posterior**; o cadastro manual funciona sem ela.

---

## 8. Plano em três blocos implementáveis

| Bloco | Entrega | Testes | Esforço estimado (do zero) |
| --- | --- | --- | --- |
| **B1 — Núcleo** | Empresas, contatos, oportunidades, funil, próxima ação, busca e aviso de duplicados. Persistência real, login, 1 papel (equipe). | Criar, editar e buscar; duplicados; validações; leitura sem login recusada | 4 a 6 dias de desenvolvimento |
| **B2 — Reuniões e plano de ação** | Reunião com ata e síntese manual; ações combinado e sugestão; tela "Hoje"; histórico por contato | Ata preservada após editar a síntese; sugestão não vira compromisso sozinha; ações atrasadas | 3 a 5 dias |
| **B3 — Qualidade e IA opcional** | Estados de erro, vazio e carregamento completos; responsividade em 390 e 1440 px; exportação CSV; síntese de ata sugerida por IA (opcional, com revisão) | E2E do fluxo completo; acessibilidade; teste de que a IA nunca cria compromisso | 3 a 5 dias |

**Protótipo × persistência real:** os wireframes acima são protótipo. O **B1 já nasce com persistência real e login**. Só depois de B1 e B2, com persistência e autorização verificadas, o CRM pode ser chamado de funcional.

---

## 9. Simulação do critério de pronto (com dados fictícios)

1. Cadastrar "Empresa Exemplo Ltda." e "Maria Teste (Diretora)", origem "Evento".
2. Abrir oportunidade "Formação de líderes" na etapa Novo interesse, com próxima ação "Ligar" para amanhã.
3. Registrar reunião: ata completa, síntese de 3 linhas, 1 ação "combinado" (enviar proposta, Ismael, 3 dias) e 1 "sugestão" (convidar para o Experience).
4. Concluir a ação "enviar proposta" e mover para a etapa Proposta.
5. Buscar "Maria" e ver todo o histórico na ficha.

---

## 10. Riscos

- **Dados pessoais:** contatos são dados pessoais (LGPD). É preciso definir consentimento e retenção **antes** de cadastrar pessoas reais.
- **Escopo crescer cedo:** dashboards e automações de mensagem ficam fora do MVP.
- **IA virar compromisso:** a regra "sugestão ≠ combinado" precisa estar no servidor, não só na tela.
- **Confusão de sistemas:** o CRM não é o App Savana nem o Command Center (manual, seção 3).

---

## 11. Decisões necessárias (para aprovar o escopo)

1. É CRM **interno**, de **membros** ou de **empresas clientes**?
2. Quantas pessoas operam e com quais papéis?
3. Qual oferta é prioridade no funil?
4. O que define **conversão**?
5. Existe base autorizada para reaproveitar (Stormfy)? Se sim, quem autoriza a inspeção do código (sem dados)?
6. Rodar local ou em servidor com login?

## 12. Menor primeira implementação útil

**B1 restrito:** cadastro de empresa e contato com aviso de duplicado, oportunidade com etapa e próxima ação, e a tela "Hoje". Com isso a equipe já responde *"com quem falar agora e qual o próximo passo"*. Reuniões e plano de ação entram no B2.
