# Entrega 0.10 — Notificações no aplicativo

## Comportamento

Menu Notificações com contador de não lidos. Caixa pessoal com seleção de projeto (ou todos), filtro Não lidos/Todos, 25 avisos por página, leitura individual, retorno a não lido e leitura em lote com confirmação do projeto/alcance. O contador do menu é global para os projetos ainda acessíveis. O resumo da tela respeita o filtro de projeto. IDs/cursor bigint permanecem texto no cliente.

Eventos novos a partir da aplicação da migration:

| Evento | Destinatários |
|---|---|
| Tarefa aberta atribuída ou responsável alterado | Novo responsável; exclui concluída/arquivada |
| Comentário em tarefa | Responsável atual e criador da tarefa, sem duplicar a mesma pessoa |
| Solicitação de análise | Proprietário do projeto |
| Parecer concluído | Pessoa que solicitou a análise |

O autor da ação não recebe aviso de sua própria ação. Só recebem pessoas que ainda são proprietário/membro do projeto no instante da geração. Não há backfill do histórico. O título identifica tarefa ou documento/revisão, sem copiar corpo de comentário, e-mail, celular ou geometria.

Abrir tarefa busca o registro novamente no projeto; não marca o aviso como lido automaticamente. Ver análises abre a área de análises do projeto, com filtro Todas; não é um link direto para a revisão individual. O título do aviso é uma fotografia da identificação no momento do evento e não acompanha futuras renomeações.

Leitura em lote considera os não lidos do projeto selecionado, inclusive outras páginas. Usa o maior identificador disponível na consulta como limite; avisos com ID maior não são marcados. A lista reinicia a paginação após alterar leitura para evitar pular avisos que mudaram de filtro. Projetos arquivados permitem consultar e marcar a caixa pessoal. Se o acesso for revogado, avisos desse projeto deixam de ser acessíveis; restaurar a participação permite consultar o histórico pessoal novamente.

Atualização ao carregar o aplicativo, recarregar dados e abrir/atualizar a tela. Não há sincronização em tempo real, notificação do Android, push, e-mail ou WhatsApp. O contador não fica consultando o servidor em segundo plano.

## Segurança

project_notifications tem RLS exigindo recipient_id=auth.uid() e acesso atual ao projeto, tanto na leitura quanto na marcação. Nem o proprietário pode consultar caixas de outros membros. O cliente pode selecionar e atualizar apenas read_at. Não pode inserir, remover, editar texto, trocar destinatário ou projeto. As RPCs públicas são SECURITY INVOKER, com search_path vazio e EXECUTE exclusivo de authenticated; não recebem destinatário escolhido pelo navegador.

Dois helpers privados SECURITY DEFINER geram os avisos a partir de triggers dos fluxos reais. Não têm EXECUTE para public/anon/authenticated, usam auth.uid() do autor, destinatários fixos conforme evento e validação de participação. Nenhuma chamada externa é feita. O título do aviso pode conter informações do projeto e permanece sob a mesma restrição de acesso. A leitura de aviso não é uma mudança no documento/tarefa e não cria evento de auditoria de negócio.

## Verificações

50 testes Node passaram. A suíte SQL db/verify_notifications.sql passou no BKM_autodoc com rollback de todas as identidades e registros sintéticos: atribuição inicial e edição sem duplicação, exclusão de ações próprias, comentários para responsável/criador, solicitação e parecer reais do fluxo de revisões, leitura/não lido, privacidade entre destinatários, bloqueio de criação e edição forjadas, helper privado não exposto, paginação, precisão do cursor e leitura em lote limitada ao ID consultado, bloqueio entre projetos, consulta em arquivado, revogação e ausência de API anônima.

Preview isolado com tests/fixtures/notifications-client.js: contador, leitura individual e retorno a não lido, filtros, paginação, leitura em lote por projeto com confirmação e abertura da tarefa foram conferidos no navegador usando 37 avisos fictícios. Nenhum aviso real foi enviado por essa verificação. Evidência em docs/screenshots/notifications.jpg. O mock é restrito ao bundle do preview; o build de produção mantém o cliente Supabase real.

Sintaxe e build passaram. O advisor não mostrou novas ocorrências, mantendo o aviso anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). A verificação visual foi feita em desktop; a experiência no dispositivo do usuário ainda requer validação.
