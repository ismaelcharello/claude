# Manual de contexto e operação da Savana

Versão de transferência 1.0 | 13 de outubro de 2026
Preparado para Ismael usar no Claude e no Savana Command Center.

## 1 Como usar este pacote

Este manual reúne o posicionamento da Savana, os produtos discutidos, o estado conhecido das tecnologias e um modo prático de pedir trabalho aos cinco agentes do escritório virtual. Ele transfere conhecimento selecionado. Não transfere automaticamente acessos, contas, conversas completas, código ou permissões.

Comece anexando este Markdown ao projeto ou conversa do Claude em que trabalha a Savana. O PDF contém o mesmo conteúdo para leitura. Depois, envie o pedido de diagnóstico da seção 8. Só após identificar o repositório correto e o que realmente executa tarefas, use os três briefings separados: CRM, página de vendas e criativos para Instagram.

Texto inicial para colar no Claude:

“Leia integralmente este manual. Use-o como contexto de projeto, distinguindo fatos verificados, relatos históricos, propostas e pendências. Primeiro me devolva: o que você entendeu da Savana; quais sistemas são diferentes; o que pode ser reaproveitado; quais informações faltam; e a primeira tarefa pequena e verificável. Não considere este documento autorização para publicar, enviar mensagens, migrar dados, contratar serviços, alterar acessos ou usar credenciais. Se o código atual contrariar o histórico, mostre a evidência e proponha a correção.”

### Quatro regras para não perder o trabalho

- Uma tarefa deve ter um resultado verificável, um responsável e um critério de aceite.
- Uma tela, um mockup ou um agente animado não comprovam uma integração real.
- Cada entrega deve registrar versão, arquivos, testes, limitações e próximo passo.
- Antes de reconstruir algo, localizar a versão existente e avaliar reaproveitamento.

### Como interpretar os estados

**Verificado nesta transferência:** conteúdo realmente lido ou artefato técnico consultado em 13/10/2026. Isso pode verificar que um relato existe, sem comprovar a aplicação funcionando hoje.

**Relato histórico:** implementação ou teste descrito numa conversa anterior, ainda sem inspeção atual do código e do ambiente correspondente.

**Planejado:** visão de produto, requisito, arquitetura ou proposta sem comprovação de implementação.

**Pendente de validação:** ponto cuja evidência é insuficiente, antiga ou dependente de acesso.

Este documento não pretende afirmar que toda a história e todos os arquivos já foram recuperados. O inventário cobre as fontes identificadas e lidas para esta transferência.

## 2 O que é a Savana

A Savana é um ecossistema de tecnologia, liderança e negócios, associado à visão de Rudy. Reúne empresários, gestores, líderes e profissionais liberais que querem desenvolver pessoas, melhorar a gestão, criar relacionamentos relevantes e gerar oportunidades com propósito.

A mensagem central é que relacionamentos reais criam conexões significativas e que negócios surgem da geração de valor entre as pessoas. A Savana não deve ser apresentada apenas como um evento, um aplicativo de cursos ou uma rede de contatos.

**Missão:** conectar, inspirar e treinar empreendedores para gerar riqueza, influência e avanço do Reino de Deus.

**Visão:** ser o melhor ecossistema de negócios do Brasil para empresários que unem riqueza, família e fé. É uma ambição institucional, não uma posição comprovada no mercado.

**Valores:** servir para liderar; coragem para inovar; paixão para transformar.

**Três pilares:** Tecnologia, Liderança e Negócios.

A comunicação deve conectar esses princípios às dores concretas do público: isolamento na liderança, operação consumindo o empresário, desenvolvimento do time e dificuldade de transformar contatos em relações produtivas. Evitar promessas garantidas de riqueza, crescimento ou transformação.

### Linguagem e identidade

Visual premium, humano, editorial, legível e simples. Base de verde profundo, champanhe/dourado discreto e off-white. Preservar o logotipo original e conferir os arquivos reais antes de derivar novas peças.

O nome e a simbologia de leões e leoas podem ser usados quando ajudam a mensagem. Paisagens africanas, animais e natureza não devem substituir o assunto: negócios, pessoas e liderança. No carrossel “Para quem é a Savana?”, o público precisa reconhecer seu contexto profissional, não interpretar a peça como turismo.

Usar títulos diretos, poucos elementos competindo e um objetivo por peça. Missão, visão e valores podem ser apresentados de forma explícita, sem excesso de slides introdutórios. Direção consolidada no material de marca e nas conversas recentes [F2].

### Frentes do ecossistema

Comunidade, Savana Experience, roadshows, mentorias e treinamentos, Hub in-Company, experiências com propósito e Savana App aparecem no posicionamento discutido. Tratar cada oferta como proposta ou frente em desenvolvimento até confirmar sua disponibilidade, formato e condições comerciais. Não anunciar todas como produtos já operacionais.

Savana Experience: a atualização mais recente informada pelo usuário nesta transferência aponta **6 de novembro de 2026**, substituindo a referência antiga de 20 de outubro. Horário, local, palestrantes, preço, vagas e link de inscrição devem ser reconfirmados antes de divulgar. A landing institucional atual não exibe uma data de evento.

## 3 Os sistemas e suas diferenças

### Savana Command Center e escritório 3D

É o ambiente interno de coordenação de tarefas com cinco agentes. O material fornecido relata uma adaptação do Claw3D com interface em português, Central de Comando, escritório visual, páginas de agente e tarefa, formulário e guia [F1].

O ponto mais importante: **o próprio Claude declarou que a inteligência artificial ainda não está conectada**. No modo real, os agentes ficam offline até ativação da execução; os estados podem ser movidos manualmente. O modo demonstração encena o fluxo e deve ser identificado como SIMULADO.

O escritório 3D é uma representação visual da equipe. A Central de Comando é onde se criam pedidos, acompanham bloqueios e revisam entregas. Móveis decorativos do projeto original não são ferramentas de negócio.

Endereços relatados: localhost:3000/office e localhost:3000/savana/guia. Eles apontam para o computador em que o sistema roda. Enviar esse endereço a outro serviço não compartilha o sistema nem conecta dois assistentes.

Os comandos relatados são npm run savana:demo para demonstração e npm run savana para o modo real. Devem ser conferidos no package.json do repositório correto antes de qualquer execução. Não foram executados nesta transferência.

A branch claude/sweet-carson-0xccax foi citada pelo Claude no anexo. O endereço do repositório, o SHA atual, o conteúdo remoto e o estado do computador não foram verificados. Não assumir que essa branch contém o App Savana ou a landing institucional.

### Savana App

Produto para clientes: desenvolvimento de líderes e times. Sua jornada oficial é Diagnóstico Estratégico, Plano de Ação, Execução e Roadmap & Acompanhamento. Possui histórico de definição e implementação próprio [F3-F6]. Não é o escritório 3D.

### Landing institucional Savana

Site de apresentação do ecossistema: https://savana-ecossistema.ismaelcharello.chatgpt.site . Existe uma publicação privada de revisão, descrita na seção 5. Não é automaticamente uma página de vendas do evento e não é o App Savana.

### CRM Savana e referência Stormfy

O CRM solicitado será o ambiente comercial e de relacionamento: contatos, empresas, oportunidades, encontros e próximos passos. Stormfy é um sistema separado com fluxos históricos úteis como referência. Reaproveitamento de código, infraestrutura ou dados exige análise e decisão explícita. Não renomear silenciosamente o Stormfy como Savana.

### Jarvis e Rudy AI

Jarvis é o assistente/contexto de trabalho do usuário. NEXO é o coordenador dentro do Command Center. Rudy AI é uma proposta de assistente metodológico no App Savana. Esses papéis não significam que compartilham memória ou acesso técnico.

TIME e iniciativas institucionais de ICF são contextos separados. O título de uma conversa pode mencionar TIME e conter pedidos da Savana; identificar cada projeto pelo código e pelo objetivo, não pelo título da conversa.

## 4 App Savana e inventário técnico histórico

### Jornada e conteúdo definidos

Diagnóstico Estratégico identifica prioridades. Plano de Ação transforma prioridades em próximos passos. Execução combina aprendizado e aplicação. Roadmap & Acompanhamento registra evolução e reaplicação.

As quatro formações são O Código do Comando, Domínio Tático, Construindo sua Savana e Liderando Leões e Leoas. Jornada organiza o processo; formação desenvolve competências. Não tratar esses dois conceitos como sinônimos [F3].

Módulos planejados: dashboard orientado à próxima ação; jornada; formações e aulas; ferramentas estratégicas; biblioteca de recursos; evolução; comunidade híbrida; Rudy AI; mentores; administração. Conteúdos, mentores e materiais reais precisam de fonte e aprovação. A meta de aproximadamente 100 recursos não comprova 100 arquivos existentes.

### O que foi relatado como construído

Em 14/09/2026, a conversa registrou P0 estrutural, P1 funcional e Fase 0 do motor de ferramentas no commit **d301a725309d5558d10bd029572c0c66abe63331**. Foram relatados: questionários dinâmicos, cálculo versionado, relatório comum, plano 30/60/90, reavaliação, links com token seguro, consentimento e quórum mínimo, exportação PDF, registro de ferramentas e administração [F4].

O relato também menciona aplicações de ferramentas, pesquisa anônima, Raio-X, prescrição e plano, progresso individual e empresarial, evolução, administração e controle de concorrência em rascunhos. Cita migrations 0007 e 0008, TypeScript, lint, build e 27 testes aprovados.

**Limite decisivo:** a migration 0008 teria sido validada localmente em SQLite, sem aplicação fora desse ambiente. E2E com infraestrutura real e validação visual em staging continuavam pendentes. Não é comprovação de homologação em produção.

Em 14/09, a tentativa posterior de gerar outro ZIP falhou por falta da cópia local exata. O usuário disse que já havia baixado um ZIP. Em 17/09, a conversa informou projeto atual indisponível e necessidade desse backup [F5-F6]. Portanto, o primeiro passo é localizar o repositório ou ZIP exato, conferir o commit e só então retomar. Não reconstruir silenciosamente a partir de descrições.

### Ferramentas e metodologia

O histórico fala em registro versionado de 20 ferramentas, todas EM REVISÃO. Isso não significa 20 instrumentos validados ou liberados. Pesquisa de Clima, Perfil Comunicacional e SWOT 360 foram recomendados como início. DISC, MBTI, 9-Box e outros instrumentos exigem avaliação metodológica, de direitos e de riscos antes de uso.

Preservar os requisitos de isolamento por empresa, autorização no servidor, dados agregados com corte mínimo definido, progresso individual separado do empresarial e revisão humana em decisões sobre pessoas. São requisitos de projeto; este manual não certifica conformidade jurídica nem segurança implementada.

### Inventário mínimo a produzir ao recuperar o código

- Repositório, branch, SHA, estado do trabalho e backup verificável.
- Stack e versões extraídas do código, scripts disponíveis e dependências.
- Rotas que funcionam, rotas de demonstração e recursos planejados.
- Banco real utilizado, migrations presentes e migrations efetivamente aplicadas por ambiente.
- Autenticação, permissões, isolamento por empresa e testes negativos.
- Variáveis exigidas por nome, sem copiar valores de segredos.
- Histórico de testes com data, ambiente, comando e resultado.
- Publicação atual e plano de rollback, se houver.

## 5 Landing e CRM como base de reaproveitamento

### Landing institucional atual

O checkpoint técnico consultado registra projeto appgprj_6acdcfe8f744819186cdbae8bb56aa56, versão 3 privada, publicada em 13/10/2026, e commit **950a9ad800085b17c9f266e4d9f6ffd9b85f2f66** [F7].

Implementação descrita e presente nos arquivos consultados: HTML, CSS e JavaScript estáticos; marca SVG original; hero abstrato de conexões; diagrama de ecossistema; três pilares interativos; públicos; propósito; missão e valores; FAQ; chamada de contato.

O CTA aponta para o site existente de links do Rudy: https://rudy-linktree.ismaelcharello.chatgpt.site . Não há formulário, rastreamento, checkout, data atual de evento ou promessa de lançamento dos produtos do roadmap.

Checks estáticos e 27 testes determinísticos de lógica foram relatados como aprovados. Uma captura nativa 1200 × 750 da primeira dobra confirmou a correção de sobreposição de rótulos. **Ainda faltam testes visuais e de interação completos em 360, 390, 768 e 1440 pixels.** Não apresentar a landing como totalmente homologada ou aberta ao público. O Claude pode precisar do código ou de imagens exportadas, porque o acesso é privado.

### O que aprender com o Stormfy

A conversa histórica de 01/10 registra um CRM com ata completa formatada, síntese estratégica separada, plano de ação com responsável/prazo/status/origem, detalhes da empresa recolhidos e histórico por reunião. Também relata funcionamento manual quando a IA está sem créditos [F8].

Essas são boas referências de produto para o CRM Savana: entrada simples, informação detalhada preservada e próximo passo evidente. O usuário pediu praticidade, sem repetir manualmente muitos campos.

O estado de infraestrutura informado na transferência do projeto aponta o backend Supabase do Stormfy como INACTIVE em 12/10. Esse estado não foi reconsultado para este manual. Não presumir que a aplicação esteja operacional hoje nem reativar infraestrutura como efeito colateral de um estudo.

Proposta de avaliação: comparar começar do zero, extrair componentes ou evoluir uma base autorizada. Julgar tempo, manutenção, isolamento, licença e propriedade do código. Nenhuma opção autoriza copiar contatos, atas, dados pessoais, banco ou credenciais para outro projeto.

## 6 Quem faz o quê no escritório

As funções abaixo vêm do guia fornecido [F1]. São papéis de trabalho; a capacidade real depende de integração e permissões verificadas.

**NEXO coordena.** Recebe pedidos amplos, identifica dependências, quebra entregas, distribui aos especialistas e consolida decisões. Deve ser a primeira escolha para “preciso do CRM, da página e dos criativos”. Entrega plano priorizado, responsáveis e critérios de aceite.

**ATLAS cuida de estratégia e produto.** Define público, problema, proposta de valor, jornada, escopo do MVP, critérios e prioridades. Exemplo: desenhar o fluxo de entrada e acompanhamento de um membro.

**LUME cuida de marca e comunicação.** Produz conceito criativo, arquitetura de mensagem, copy, pautas, roteiros e direção visual. Exemplo: página de inscrição e carrossel. Geração de imagens ou arquivos de design depende de ferramentas disponíveis; texto de prompt não é arte final.

**PULSO cuida de relacionamento e comercial.** Organiza funil, origem de contatos, etapas, cadência e rascunhos de follow-up. Exemplo: definir como uma pessoa interessada chega à inscrição ou à conversa comercial. Rascunhar não autoriza enviar.

**FORJA cuida de tecnologia.** Inspeciona repositórios, desenha integrações, implementa etapas autorizadas, testa e documenta. Exemplo: construir formulário persistente em staging. Não deve declarar uma funcionalidade concluída apenas porque sua tela existe.

### Exemplo de distribuição coordenada

NEXO abre o projeto CRM. ATLAS delimita o uso inicial. PULSO define os estágios e campos do funil. FORJA avalia reaproveitamento e implementa o bloco aprovado. LUME ajusta linguagem e estados da interface. NEXO reúne evidências e leva decisões pendentes ao usuário.

Não abrir cinco tarefas vagas para cada agente “fazer sua parte”. Compartilhar objetivo, contrato de entrega e dependências entre elas. Um integrador mantém a versão final coerente.

## 7 Como pedir uma tarefa bem feita

Na Central, usar + Nova tarefa, escolher o agente e preencher o briefing. No escritório, o guia relata que clicar no agente e escolher Pedir tarefa abre o formulário com ele selecionado. Na dúvida, selecionar NEXO.

### Modelo reutilizável

Título: verbo + resultado específico.

Contexto: o que já existe, para quem é e quais fontes devem ser lidas.

Objetivo: qual problema precisa ser resolvido e por que agora.

Entregável: arquivo, tela, fluxo, análise ou implementação esperada, com formato e local.

Critérios de pronto: como uma pessoa consegue conferir o resultado.

Restrições: o que preservar, o que não fazer, limites de custo e acessos autorizados.

Dependências: material, decisão, integração ou dado que falta.

Prazo e prioridade: data real, se houver; não inventar urgência.

Ponto de aprovação: exatamente qual decisão ou ação precisa ser apresentada antes de prosseguir.

### Um bom resultado precisa conter

Resumo do que foi feito; link ou arquivo; evidência de teste ou fonte; diferenças em relação ao pedido; limitações; decisões pendentes; próximo passo. Em código, incluir SHA e distinguir teste local, staging e produção.

### Como aprovar com clareza

O guia relata a área Aprovações pendentes com Aprovar ou Rejeitar e motivo. A presença desse botão não prova que o backend impede ações indevidas. FORJA precisa verificar que a execução realmente para antes de uma ação sujeita a aprovação.

Ao aprovar, delimitar ação, alvo, dados, ambiente e custo quando houver. Aprovar uma copy não autoriza publicá-la. Aprovar uma tarefa técnica não autoriza enviar mensagens, criar credenciais persistentes ou migrar dados de produção. Segredos não devem ser colados em tarefas ou documentos.

## 8 Primeira demanda para ligar a execução de verdade

### Copiar para NEXO com execução técnica de FORJA

Título: Diagnosticar a integração do Command Center com Claude Code.

Contexto: o Command Center baseado em Claw3D tem cinco agentes e modo demonstrativo. O guia informa que a IA ainda não foi ligada. Quero entender o estado real antes de ampliar o uso.

Objetivo: identificar o caminho mínimo para uma tarefa simples gerar um resultado real e rastreável, com revisão humana onde necessário.

Entregável: relatório curto com repositório/branch/SHA, scripts reais, forma de persistência das tarefas, estado de instalação e autenticação do runtime, ponto de integração ausente, opções técnicas, custos/dependências e plano de teste. Não exibir valores de credenciais.

Critérios de pronto: distinguir demo de execução real; mapear de onde vem cada mudança de status; mostrar onde resultado e histórico são salvos; identificar se aprovações bloqueiam a execução no servidor; propor teste inofensivo com um agente antes de ativar os cinco.

Restrições: esta primeira tarefa é somente diagnóstico. Não instalar dependências, autenticar contas, criar chaves, alterar permissões persistentes, publicar, enviar mensagens ou modificar produção. Se algum acesso for indispensável, informar qual e por quê. Não contornar controles de segurança.

Próxima etapa proposta, após aprovação: uma tarefa local de resumir um documento de teste, sem dados privados. Confirmar execução real, artefato produzido, registro de erro, cancelamento, retomada e ausência de duplicação. Só depois ampliar ferramentas e agentes.

### Como aproximar Jarvis e Claude

Primeiro, usar transferência deliberada de contexto por este manual e arquivos selecionados. O usuário decide o que importar. Atualizar uma versão compartilhada do documento de projeto é mais seguro do que supor que duas conversas lembram a mesma coisa.

Uma integração automática é outro projeto. Pode exigir um serviço intermediário, contrato de tarefas, autenticação, controle de acesso, logs, limites e tratamento de falhas. Sua viabilidade depende do código real e das interfaces disponíveis. Não existe conexão estabelecida apenas por adicionar o link do escritório.

O pacote não conecta Jarvis, Claude ou NEXO automaticamente e não concede acesso ao computador. Na preparação desta transferência não havia ambiente de computador conectado disponível para inspeção. Quando houver acesso autorizado ao ambiente correto, começar pelo diagnóstico acima.

## 9 Ordem recomendada e decisões pendentes

### Etapa 1 Recuperar a base confiável

Importar este contexto, localizar os repositórios corretos, recuperar o App Savana quando necessário e inventariar estados. Resultado esperado: saber o que existe, onde está e quem pode acessar. Não reconstruir antes disso.

### Etapa 2 Validar um agente real

Fazer o diagnóstico da seção 8 e, após aprovações específicas, um teste pequeno. Resultado esperado: entrada, execução, artefato e histórico verdadeiros. O escritório animado não é o critério de sucesso.

### Etapa 3 Definir as três entregas de negócio

NEXO coordena os briefings separados. CRM: começar por um fluxo comercial completo e poucos campos. Página de vendas: confirmar qual oferta será vendida. Instagram: escolher mensagem, CTA e material real de cada peça.

Página e criativos podem avançar em rascunho enquanto o CRM é estudado. Captação integrada e automações de mensagens dependem de destino, consentimento, dados e permissões previamente definidos.

### Etapa 4 Implementar por blocos

Trabalhar em ambiente separado e entregar uma parte utilizável de cada vez. Primeiro um fluxo principal, depois melhorias. Manter checkpoint e rollback. Não usar dados reais em demonstrações.

### Etapa 5 Homologar antes de publicar

Conferir segurança, persistência, permissões, erros, estados vazios, acessibilidade, responsividade e fluxo ponta a ponta. Revisar copy, datas, links e oferta. Pedir aprovação da versão e do destino exatos.

### Decisões que o usuário ainda precisa tomar

- CRM: para operação interna, membros ou empresas clientes? Quantas pessoas operam e quais papéis?
- Página: vende Experience, comunidade, programa ou App? Qual oferta, preço e ação principal?
- Evento: confirmar data atual, horário, local, palestrantes e link.
- Código: onde está o novo Command Center e onde está o ZIP ou repositório do App?
- Infraestrutura: reaproveitar alguma base ou manter projetos independentes?
- IA: qual runtime, conta, limite de gastos e conjunto mínimo de ferramentas?
- Conteúdo: quais materiais, imagens e provas sociais estão aprovados para uso?

O trabalho pode avançar com hipótese explícita em decisões reversíveis de rascunho. Publicação, gasto, dados e acessos exigem definição concreta.

## 10 Fontes e rastreabilidade

F1. Anexo do usuário “Texto colado(20261013-155613).txt”, recebido em 13/10/2026, lido integralmente em 98 linhas. Fonte dos papéis, telas, demonstração, IA não conectada e branch relatada. É conversa fornecida; não é inspeção atual do GitHub.

F2. Conversa “Carrossel sobre a Savana”, mensagem de 12/10/2026 com missão, visão e valores: https://chatgpt.com/c/6ac67310-0310-83e9-8324-aef34843a197?messageId=4e91845f-e616-4260-bff6-b5a64b342460 . Textos são materiais discutidos, sem inferência de publicação no Instagram.

F3. Definição do produto pelo usuário, 11/09/2026: https://chatgpt.com/c/6a91fb61-9850-83e9-8ee1-dea82684b031?messageId=4ad2f0bd-6ad3-45c1-a7c7-ee968da078cf . Fonte da jornada, formações, módulos e limites de escopo.

F4. Relato técnico da Fase 0, 14/09/2026: https://chatgpt.com/c/6a91fb61-9850-83e9-8ee1-dea82684b031?messageId=43920467-e250-5b3b-a54b-4dcf0cbdd3cd . Fonte do commit d301a725, motores, testes e pendências de staging. Não reverificado no repositório nesta transferência.

F5. Checkpoint não gerado por ausência da fonte, 14/09/2026: https://chatgpt.com/c/6a91fb61-9850-83e9-8ee1-dea82684b031?messageId=f34fda46-8614-5c42-aa4d-9cb33f00dd46 . O usuário informou na sequência que já havia baixado o ZIP.

F6. Confirmação de indisponibilidade do projeto, 17/09/2026: https://chatgpt.com/c/6a91fb61-9850-83e9-8ee1-dea82684b031?messageId=f3b2e6f0-af41-5926-a4bc-a3fe5d95f43d . Mockups posteriores não comprovam recuperação do backend.

F7. Checkpoint e revisão técnica da landing, atualizados em 13/10/2026 e lidos para esta transferência; versão 3 e SHA identificados na seção 5. Preview privado: https://savana-ecossistema.ismaelcharello.chatgpt.site . Arquivos de QA distinguem testes de código da revisão visual limitada à primeira dobra.

F8. Relato histórico de implementação do Stormfy, 01/10/2026: https://chatgpt.com/c/6ab3fb3c-4014-83e9-80d3-80b48bae4040?messageId=ccaa7386-0c30-5379-8208-7b8d4b1a9d56 . Referência de fluxo de CRM, sem cópia de dados de contatos.

A data atualizada do Experience, a ausência de computador conectado e a observação de backend inativo foram fornecidas no contexto atual de transferência. Devem ser reconfirmadas antes de uma ação que dependa delas. Links de conversas privadas podem não abrir no Claude; o conteúdo necessário está sintetizado neste manual.
