# Supabase — fundação do BKM Projetos

## Estado implementado em 2 de novembro de 2026

Projeto dedicado BKM_autodoc, região São Paulo. Inspecionado vazio antes da alteração. Migração remota `bkm_projects_documents_foundation` aplicada com sucesso. Fonte reproduzível em `db/schema.sql`; testes transacionais em `db/verify_access.sql`.

Seis tabelas: projects, project_members, folders, documents, document_revisions e audit_events. A tabela de tarefas não foi duplicada: sua integração depende da avaliação do motor existente no Terrenos.

## Regras implementadas no servidor

- Projetos com proprietário, código único por proprietário, nome, responsável, situação, datas e arquivamento.
- Proprietário administra o projeto e os participantes; editor altera pastas/documentos; leitor consulta. Outros usuários não acessam o projeto.
- RLS em todas as tabelas da aplicação; nenhum privilégio anônimo nessas tabelas. Os participantes precisam ser usuários já existentes no Auth; o fluxo de convite ainda não foi implementado.
- Pastas com referência composta para impedir vínculos entre projetos, unicidade de nome por nível e verificação de ciclos. Identidade/projeto de registros não podem ser alterados por uma edição comum.
- Documentos com código por projeto, pasta, autor e título. Revisões com identidade própria, código por documento e metadados de arquivo. Sem UPDATE/DELETE de revisões para o papel autenticado.
- Auditoria gerada por triggers para projetos, participantes, pastas, documentos e revisões; clientes autenticados não escrevem os eventos.
- Bucket privado `bkm-documents`, limite inicial de 20 MiB, tipos PDF/PNG/JPEG. Leitura e upload dependem de vínculo ao projeto e de uma revisão correspondente ao caminho do objeto. Sem sobrescrita ou exclusão de objetos autorizada ao cliente nesta base.
- Funções de autorização em schema privado resolvem a associação sem recursão de RLS. São SECURITY DEFINER com search_path fixo, entrada restrita ao projeto e auth.uid(), execução revogada de PUBLIC/anon e sem exposição no schema público. O uso é deliberado e limitado à autorização; nenhuma chave privilegiada é necessária no navegador.

## Validação concluída

O script de teste rodou em transação e terminou com ROLLBACK. Foram simulados quatro usuários de teste sem e-mail, sem senha e sem envio de mensagens. As consultas finais confirmaram zero usuários e zero projetos/pastas/documentos/revisões persistidos.

Passaram: criação pelo proprietário, leitura por participante, bloqueio do usuário externo, bloqueio da escrita do leitor, escrita de pasta pelo editor, bloqueio de alteração dos metadados do projeto pelo editor, bloqueio em projeto arquivado, duplicata de pasta, ciclo, imutabilidade das revisões e geração de auditoria.

O advisor de segurança retornou lista vazia. O de desempenho trouxe somente avisos informativos: índices ainda sem uso em uma base vazia e configuração padrão de dez conexões do Auth. Não foi feito dimensionamento ou upgrade.

Referências dos avisos: [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) e [preparação para produção/conexões](https://supabase.com/docs/guides/deployment/going-into-prod).

## O que ainda não está conectado

A versão 0.2 publicada continua usando armazenamento local. Esta entrega prepara a infraestrutura e não migra automaticamente os dados dos navegadores. O cadastro e o login próprios do aplicativo ainda serão implementados; o login da Vercel é independente do Supabase Auth.

Também faltam: seleção/configuração dos provedores de autenticação e URLs de retorno, onboarding do primeiro usuário, adaptador remoto, upload real ponta a ponta, confirmação de recebimento do arquivo, tratamento/limpeza de reservas de revisão cujo upload falhou, interface de participantes e análise/aprovação de revisões. Registro de revisão não comprova presença do arquivo. Não há teste HTTP de upload/download ou autenticação real nesta entrega.

## Próximo lote

1. Implementar autenticação no app e verificar as URLs de retorno da Vercel no Auth.
2. Criar o adaptador remoto de projetos e pastas, preservando o modo de demonstração separadamente.
3. Permitir importação explícita dos dados locais, com prévia, validação e mapeamento de IDs; nunca enviar os exemplos automaticamente.
4. Implementar upload de PDF/imagem, leitura privada, confirmação de integridade/tamanho e recuperação de upload interrompido.
5. Validar pelo navegador com usuários reais de teste e repetir os testes de isolamento via API.

Não há configuração de chaves do Supabase na Vercel nem alteração em outros projetos Supabase nesta entrega.
