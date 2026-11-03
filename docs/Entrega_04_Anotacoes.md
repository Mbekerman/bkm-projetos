# Entrega 0.4 — Anotações por revisão

## Uso

Projetos → Abrir diretórios → Abrir revisões → Visualizar → Marcar na prancha → tocar no ponto do PDF/imagem → escrever comentário → Salvar anotação.

As marcações aparecem como pontos numerados na página e em uma lista de comentários. Resolver e Reabrir alteram o estado; Remover oculta a marcação preservando o registro e o histórico de auditoria. Autor com permissão de edição e proprietário gerenciam suas marcações; o proprietário também gerencia as demais. Leitores consultam. Projetos arquivados permitem somente consulta.

O comentário inicial, página, coordenadas, revisão, autor e data de criação são imutáveis para o cliente. A remoção não equivale a apagamento definitivo. Anotações são independentes para cada revisão e não são copiadas automaticamente para revisões posteriores. O PDF original continua intacto: baixar original não inclui as marcações.

## Implementação

`document_annotations`: revisão/projeto com chave estrangeira composta; página; coordenadas normalizadas x/y em [0,1]; comentário até 2.000 caracteres; autor, nome de exibição e timestamps; estado open/resolved e deleted_at. RLS aplica participação e permissão por projeto. Inserção aceita somente revisões com upload pronto; imagens aceitam apenas página 1. O banco carimba nome do autor e horários; nenhum metadado de perfil concede acesso. A auditoria existente registra inserções e atualizações. Não há novas chaves, serviços externos ou dependências.

PDF.js informa página e superfície ao painel, que posiciona as marcações sobre o canvas. A posição acompanha o zoom porque usa proporções da superfície, sem alterar as coordenadas do arquivo. Imagens usam a mesma camada. No celular, o painel aparece abaixo da prancha. Não é desenho livre, medição, aprovação formal, exportação anotada ou conversa com respostas; esses recursos seguem como evolução. Rascunho não salvo é descartado ao trocar de página/fechar o visualizador.

## Verificações

20 testes Node passaram. Incluem coordenadas com zoom/deslocamento, filtragem por página, permissão de gerenciamento e validação do comentário. Build e verificação de sintaxe passaram.

`db/verify_annotations.sql` executado no BKM_autodoc com rollback: inserir/ler/retornar anotação, resolver/reabrir, autor e texto protegidos, leitor e externo sem escrita, revisão pendente bloqueada, limite de coordenadas, imagem sem página 2, remoção lógica pelo proprietário, projeto arquivado e auditoria.

Interface verificada em preview protegido com PDF fictício de duas páginas e repositório simulado: marcação de ponto, gravação de texto, resolver/reabrir, mudança de página sem misturar marcações, zoom 125% e recarga preservando comentário no armazenamento da fixture. Corrigido conflito entre o estilo do aside de navegação e o painel de revisão. Evidência em docs/screenshots/annotation-review.jpg.

A fixture existe apenas na branch de teste e não integra a publicação principal. O teste do navegador usou dados simulados, enquanto permissões/persistência foram verificadas separadamente no banco real em transação revertida. Ainda falta homologar o fluxo completo de anotação sobre um arquivo real com a conta do usuário, incluindo toque/teclado no Android e visualização PNG/JPEG. Não confundir os testes separados com esse ensaio completo.

Fontes técnicas: https://supabase.com/docs/guides/database/postgres/row-level-security e https://mozilla.github.io/pdf.js/examples/
