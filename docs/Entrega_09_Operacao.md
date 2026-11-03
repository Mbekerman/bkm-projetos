# Entrega 0.9 — Visão geral e histórico de alterações

## Uso

O cartão de projeto oferece Visão geral. O menu contém Visão geral e Histórico, ambos com seletor de projeto e Atualizar. Cada consulta usa o projeto selecionado e as permissões atuais do usuário. Não agrega projetos de outras pessoas ou do Terrenos.

O painel exibe tarefas atrasadas, minhas tarefas abertas, revisões em análise, envios pendentes, marcações abertas, tarefas abertas/pausadas e documentos. Os totais são agregados no Postgres pela RPC project_overview, sem depender do limite de linhas do REST nem das listas carregadas pelo navegador. Os prazos usam o dia civil em America/Sao_Paulo, inclusive na virada do dia UTC.

Aberta significa tarefa não arquivada e diferente de Feito; inclui pausadas. Atrasada exige prazo anterior a hoje, não arquivada e diferente de Feito/Pausada. Hoje não está atrasado. Minhas tarefas usa auth.uid(), sem parâmetro de usuário escolhido pelo cliente. Marcações contam todas as revisões, abertas e não removidas; revisões antigas não desaparecem dos indicadores. Em análise conta solicitações ainda sem parecer, por revisão. Documentos conta cadastros, mesmo que ainda não tenham arquivo recebido. Arquivar um projeto preserva os indicadores e permite consulta.

Há duas filas de até 8 tarefas: próximas tarefas do projeto (atrasos primeiro, depois prazo, prioridade e criação) e minhas tarefas abertas, incluindo pausadas. Abrir tarefa consulta novamente seu registro no projeto, mesmo se não estiver no lote inicial de dados. Os atalhos levam às telas existentes de tarefas, análises, documentos/envios e histórico. O painel não altera estados automaticamente.

O histórico mostra eventos persistidos na auditoria, autor atual da equipe, data/hora, tipo, ação, identificação resumida e mudanças nos principais campos. Filtros: tarefas, comentários, documentos, revisões/envios, análises, marcações, pastas, equipe e projeto. Paginação de 25 eventos com Mais antigas/Mais recentes e cursor bigint transmitido como string, sem conversão para Number. Atualizar ou mudar filtro/projeto reinicia a paginação. Ordenação por identificador de registro descendente, não por data de commit de transações concorrentes. Atualizar recupera eventos recém-confirmados.

Nomes de autores são resolvidos no diretório atual do projeto; quando a pessoa já não integra a equipe aparece Participante sem vínculo atual. Não é uma fotografia imutável do nome à época do evento. Sistema indica evento sem actor_id. Conteúdo de comentários, geometria, caminhos de Storage, e-mails e celulares não são exibidos. A API operacional aplica allowlist de campos, em vez de enviar os JSONs de auditoria brutos para essa tela.

## Segurança e limites

As duas novas funções são SECURITY INVOKER, com search_path vazio, acesso explícito ao projeto e RLS das tabelas. EXECUTE é concedido somente a authenticated. Leitores podem consultar; não recebem escrita adicional. Usuários externos e revogados são bloqueados; o painel não concede participação. Não há mudanças de Auth, Storage, perfis ou credenciais.

Atualização é manual ao entrar na tela ou tocar Atualizar, não sincronização em tempo real nem notificações push/e-mail. Os indicadores representam o instante mostrado no painel. Leitura e download não geram eventos na trilha atual. O histórico não oferece restauração de versões do banco, não permite apagar eventos e não pretende ser registro de acesso aos arquivos.

IFC/DWG, notificações e integração com Terrenos permanecem fora desta entrega.

## Verificação

45 testes Node passaram, incluindo apresentação, escape, autoria, paginação, fronteira de dia em São Paulo, escopo e parâmetros das RPCs.

Preview com cliente simulado (`tests/fixtures/overview-client.js`): painel, abertura de tarefa, troca para segundo projeto vazio, filtros e ida/volta na paginação verificados no navegador. O layout reposiciona o início da tela ao navegar para o painel/histórico. Evidência: `docs/screenshots/project-overview.jpg`, identificada como dados fictícios. Build de produção usa o Supabase real; o mock e o HTML de teste não entram no bundle publicado em main. A verificação visual foi feita em desktop; o comportamento no celular ainda depende da validação no dispositivo do usuário.

db/verify_overview.sql executado no BKM_autodoc, com rollback de todas as identidades e registros sintéticos. Cobriu projeto com 1.010 tarefas (mais de 1.000), contagens exatas, pausadas/concluídas/arquivadas, prazo de hoje, filas, minhas tarefas, revisão pronta/pendente, análise e marcações abertas/resolvidas/removidas. Também verificou paginação sem repetição, filtros, IDs em texto, allowlist sem dados privados, ausência de escrita nas consultas, bloqueio de externo e acesso revogado, leitura de projeto arquivado e EXECUTE anônimo negado. Nenhum membro ou documento real foi alterado.

O advisor de segurança não apontou novas ocorrências; persiste o aviso já existente de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
