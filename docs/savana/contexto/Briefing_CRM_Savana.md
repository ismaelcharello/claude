# Briefing para criar o CRM Savana

Cole este pedido em uma tarefa do NEXO. Primeiro bloco: descoberta e proposta de MVP, sem alteração de produção.

## Contexto

A Savana é um ecossistema de tecnologia, liderança e negócios. Precisamos organizar relacionamento e operação comercial, preservando informações de cada contato e transformando reuniões em próximos passos. Leia o manual SAVANA_CONTEXTO_PARA_CLAUDE.md antes de começar.

Há um sistema separado chamado Stormfy, com histórico de atas formatadas, síntese estratégica, oportunidades e plano de ação. Avalie o reaproveitamento de conceitos e, se houver acesso autorizado, da base técnica. Não copie banco, contatos, documentos, credenciais ou infraestrutura para a Savana sem aprovação específica.

O Savana App de desenvolvimento de líderes e o Command Center de agentes são outros produtos. Não os confunda com o CRM.

## Objetivo

Propor um MVP simples para acompanhar um relacionamento desde o primeiro interesse até uma decisão comercial e seus próximos passos. Como hipótese de rascunho, considere operação interna da equipe Savana; valide essa hipótese antes de fechar arquitetura e permissões.

## Entregáveis deste primeiro bloco

1. Mapa do fluxo principal e dos usuários que o operam.
2. Comparativo curto: construir do zero, reaproveitar componentes ou evoluir base autorizada.
3. Modelo mínimo de entidades: empresa, contato, oportunidade, atividade, reunião e plano de ação.
4. Funil sugerido, com critérios claros de entrada e saída de cada etapa.
5. Wireframes das telas essenciais e lista de dependências.
6. Plano em três blocos implementáveis, com testes e esforço estimado após inspecionar a base.

## Direção para o MVP

Uma ficha simples deve reunir origem, empresa/contato, interesse, responsável, etapa e próxima ação. Uma reunião deve preservar a ata detalhada, mostrar uma síntese curta e gerar ações com responsável, prazo, status e origem “combinado” ou “sugestão”. Uma sugestão de IA não deve virar compromisso firmado automaticamente.

A visão principal precisa responder: com quem falar agora, por quê e qual é o próximo passo. Busca, histórico e prevenção de duplicados são mais importantes do que dashboards decorativos. Cadastro manual deve funcionar mesmo sem IA disponível.

## Distribuição

NEXO coordena e consolida. ATLAS define o problema e o MVP. PULSO desenha funil, cadência e campos. FORJA inspeciona base e propõe arquitetura, persistência e testes. LUME melhora a linguagem da interface.

## Critérios de pronto

Uma pessoa consegue simular com dados fictícios: cadastrar uma empresa e contato, abrir uma oportunidade, registrar uma reunião, criar uma ação, concluir a ação e localizar o histórico. Diferenciar o que será protótipo do que terá persistência real.

Na futura implementação, exigir isolamento e controle de acesso no servidor, validações, estados de erro/vazio/carregamento, proteção de dados e testes de leitura indevida. Validar 390 e 1440 pixels, teclado e fluxo completo. Só chamar de funcional depois da persistência e autorização verificadas.

## Restrições e aprovações

Neste bloco não implementar, publicar, reativar infraestrutura, migrar dados, criar chaves ou enviar mensagens. Não inventar clientes, receitas ou conversões. Entregar proposta para aprovação do escopo antes do primeiro bloco de implementação.

## Perguntas que precisam de resposta

É CRM interno, de membros ou de empresas clientes? Quem terá acesso? Qual oferta é prioridade? Existe base autorizada para reaproveitamento? O que define conversão? Quais dados são realmente necessários?

## Forma de devolver

Recomendação, justificativa, fluxo, entregáveis, lacunas, riscos, decisões necessárias e a menor primeira implementação útil. Não devolver apenas uma lista genérica de funcionalidades.
