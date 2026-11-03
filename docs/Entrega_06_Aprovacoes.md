# Entrega 0.6 — Análise e parecer por revisão

## Fluxo

Diretórios → Abrir revisões → Enviar para análise. Proprietários e editores solicitam a análise de uma revisão com upload concluído. O proprietário emite o parecer: Aprovada, Aprovada com ressalvas ou Ajustes solicitados. Ressalvas e ajustes exigem texto; aprovação simples permite observação opcional. A tela Análises reúne os registros do projeto e permite filtrar a situação, visualizar a revisão e acessar seu histórico.

Cada solicitação cria uma rodada numerada. Uma revisão pode ter somente uma análise em aberto. O parecer encerra a rodada e permanece imutável; nova análise cria uma rodada nova, preservando as anteriores. Uma nova revisão não herda o parecer de uma versão anterior. A lista de documentos apresenta a situação da revisão pronta mais recente; o histórico discrimina versão e rodada.

Nesta primeira versão, o proprietário é o aprovador e pode analisar arquivos que ele próprio enviou. Leitores consultam histórico/pareceres. Editores solicitam análises e consultam, sem decidir. Projetos arquivados permitem consulta, bloqueando solicitações e decisões. Escolha de aprovadores delegados, múltiplas etapas, prazos, notificações e cancelamento de solicitação ficam para evolução posterior. A solicitação não envia e-mail ou mensagem externa.

A aprovação é um registro operacional no sistema. Não altera o arquivo original nem resolve automaticamente anotações. O proprietário deve examinar o documento e os comentários antes do parecer.

## Implementação

revision_reviews possui revisão/projeto com chave composta, rodada, situação, solicitante/data/mensagem e autor/data/mensagem do parecer. A tabela concede apenas SELECT ao cliente, com RLS por projeto. Não há INSERT/UPDATE/DELETE direto para usuários. Duas RPCs com wrappers SECURITY INVOKER chamam funções privadas SECURITY DEFINER que verificam auth.uid(), acesso ao projeto, papel, arquivo pronto, projeto ativo e transição de situação. As funções fixam search_path e não recebem autoria, situação inicial ou número de rodada do cliente.

Solicitação trava projeto e revisão; decisão trava projeto e rodada. Uma restrição única parcial impede mais de uma análise em aberto por revisão. A auditoria existente registra inserção e decisão. Parecer encerrado não pode ser sobrescrito pela RPC. Nomes são snapshots de exibição, sem papel na autorização.

## Verificação

30 testes Node passaram. Os novos testes verificam situação por revisão/rodada, independência entre versões, exigência de comentário e escape de nomes/arquivos/comentários. Build e sintaxe passaram.

`db/verify_reviews.sql` passou no BKM_autodoc em transação revertida: editor solicita, proprietário decide nos três resultados, leitor/externo não escrevem, externo não lê, arquivo pendente bloqueado, solicitação duplicada bloqueada, parecer antigo não sobrescrito, histórico e autoria corretos, nova revisão sem aprovação herdada, projeto arquivado bloqueado, ausência de acesso RPC anônimo e auditoria. Nenhum dado de teste persistiu.

O fluxo integrado do aplicativo foi testado em preview com cliente simulado e PDF fictício: navegação projetos/diretórios/revisões, solicitar análise, fila de pendências, emitir aprovação com ressalvas e filtro de situação. Também foi corrigida uma atualização tardia da disponibilidade do login Google que recriava telas/formulários ativos; agora somente o botão e o aviso do Google são atualizados. A fixture é exclusiva da branch de teste e não é publicada no domínio principal. Estes ensaios de interface não substituem a homologação com conta e documentos reais, ainda pendente para esta entrega; permissões e transições foram testadas separadamente no banco real com rollback.

Na versão final do preview, também passou a aprovação simples sem observação obrigatória e a consulta do histórico expandido com solicitante/autor/horários. Evidência: docs/screenshots/revision-approval.jpg.
