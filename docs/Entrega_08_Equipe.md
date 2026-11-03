# Entrega 0.8 — Equipe e acesso por projeto

## Uso

Menu Equipe ou botão Equipe no cartão de projeto. O proprietário adiciona um e-mail Google @bkm.com.br, escolhendo Leitor (padrão) ou Editor. Uma conta já verificada recebe a participação imediatamente; uma pessoa ainda sem primeiro acesso fica com autorização pendente. Ao entrar no aplicativo com Google BKM, o backend usa sua própria identidade verificada para aplicar as autorizações pendentes. O botão Atualizar acessos na lista de projetos também faz essa verificação.

Editor cria/altera pastas, documentos, revisões, marcações e tarefas; leitor consulta. Só o proprietário administra acessos e emite pareceres. Outros projetos permanecem independentes. O proprietário é implícito e não pode ser removido, rebaixado ou transferido por esse fluxo. Contas pessoais legadas que já possuem projetos continuam funcionando; as novas autorizações desta interface são para e-mails BKM.

O proprietário pode alterar o papel de participantes/autorizados pendentes e revogar, com confirmação identificando pessoa, projeto e alcance. Projetos arquivados bloqueiam novas liberações/alterações de papel, mas continuam permitindo revogar. Autorizações pendentes para um projeto arquivado só são aplicadas depois de restaurá-lo.

Revogação remove a participação e invalida as autorizações correspondentes; logar novamente não recria o vínculo revogado. Uma chamada repetida para revogar uma autorização antiga já encerrada não remove uma autorização nova. Documentos, tarefas, comentários e auditoria são preservados. Responsável anterior em uma tarefa é mantido como referência histórica, sem ganhar acesso por isso; editar a tarefa não troca esse responsável silenciosamente.

Não há envio de e-mail, criação administrativa de usuário, notificações ou sincronização de Google Workspace. A pessoa usa o mesmo endereço do aplicativo e o login Google já existente. O proprietário precisa comunicar a equipe por seus canais. Arquivos já baixados e conteúdo previamente visto não são apagados dos dispositivos pela revogação; as novas operações são protegidas pelas permissões atuais do banco/Storage.

## Segurança e privacidade

project_access_invites armazena autorização, papel, criador/data, aceitação e revogação. RLS permite apenas ao proprietário ler os e-mails/autorizações. Não há gravação direta pelo cliente. As RPCs públicas SECURITY INVOKER chamam funções privadas SECURITY DEFINER com auth.uid(), verificação de proprietário, projeto e papel; nomes/role de perfil não autorizam nada. O estado Google verificado vem de auth.identities e email_confirmed_at em auth.users, nunca de user_metadata. Domínio deve ser exatamente bkm.com.br; subdomínios/sufixos não são aceitos.

A aceitação não recebe usuário/e-mail como parâmetro: usa a própria identidade autenticada. É idempotente e não eleva um papel manual mais restrito preexistente. O login sem identidade Google correspondente não utiliza a autorização, mesmo com metadados falsos. O aplicativo faz a aceitação numa requisição e, depois, consulta os projetos em nova requisição.

Operações serializam projeto antes da autorização. Há unicidade de autorização ativa por projeto/e-mail. Auditoria de autorizações remove o campo email, pois o feed de auditoria do projeto é consultável pelos demais participantes. Equipe e diretório de responsáveis mostram nomes/papéis; celular e perfil particular continuam privados. Participações diretas existentes continuam exclusivas do proprietário e também bloqueiam criação/alteração em projetos arquivados.

## Verificação

39 testes Node passaram: domínio/papel, estados, privacidade de e-mails/controles, escape, responsável histórico e todos os testes anteriores. Build e sintaxe passaram.

Interface validada no preview isolado com cliente Supabase simulado e identidades fictícias: adicionar membro, rebaixar para leitor, criar autorização pendente, alterar seu papel, cancelar a pendência e revogar o membro. A lista e o histórico refletiram as operações. Evidência em `docs/screenshots/project-team.jpg`. A simulação valida os controles da interface; os testes SQL abaixo validam as permissões reais. Nenhum acesso real foi concedido por essa verificação.

`db/verify_project_access.sql` executado no BKM_autodoc com rollback de registros sintéticos: liberação de identidade Google verificada, pendência/primeiro login, papel da pendência, bloqueio de metadados falsos/domínio/papel inválido, duplicidade, leitor sem escalada, exclusividade do proprietário, proprietário protegido, revogação com o mesmo identificador de usuário, login sem reativação, nova autorização preservada diante de revogação antiga, papel manual sem elevação automática, projeto arquivado/restaurado, revogação em arquivado, diretório privado, e-mails fora do feed de auditoria e RPCs sem acesso anônimo. Nenhum participante real foi adicionado, removido ou alterado pelos testes.
