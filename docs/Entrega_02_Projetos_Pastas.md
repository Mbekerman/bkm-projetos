# Entrega 0.2 — Projetos e pastas

## Resultado

Projetos agora têm código único, descrição, responsável, situação e datas previstas, com tela de detalhes e edição. Arquivamento preserva os registros e pode ser revertido pela lista Arquivados.

Diretórios têm pastas hierárquicas por projeto, criação de pastas/subpastas, renomeação e movimentação. Documentos referenciam IDs estáveis das pastas. O formato local anterior é migrado em memória; a próxima gravação bem-sucedida persiste a versão 2.

## Organização

- `public/model.js`: migração, validação de projetos, operações de pastas e proteção contra ciclos.
- `public/repository.js`: leitura e gravação local; falha de gravação preserva o estado anterior.
- `public/project-ui.js`: formulários e telas de projetos/pastas.
- `public/app.js`: navegação, tarefas e coordenação de eventos.
- `tests/domain.test.mjs`: cenários de negócio e persistência.

## Roteiro de homologação

1. Criar projeto com código, nome, município, responsável e datas.
2. Editar descrição e situação; recarregar e conferir os valores.
3. Abrir diretórios, criar pasta na raiz e duas subpastas em níveis diferentes.
4. Tentar nome duplicado no mesmo nível; conferir mensagem e preservação do formulário.
5. Adicionar registro de documento na pasta; renomeá-la e movê-la; conferir o vínculo.
6. Recarregar a página; conferir projeto e pasta selecionados.
7. Arquivar, consultar os dados preservados e restaurar.
8. Conferir lista/quadro de tarefas e temas, incluindo navegação por largura móvel.

## Verificação automatizada

`npm run check` verifica os módulos. `npm test` cobre migração idempotente, associação dos documentos, duplicatas de código e pasta, datas, ciclos, isolamento entre árvores, arquivamento, falha de armazenamento e recarga dos dados.

## Limites

Dados ficam neste navegador. Não há autenticação própria, banco remoto ou upload real. A seleção de pasta mostra documentos diretamente nela; Todos os documentos mostra o conjunto do projeto. As tarefas permanecem demonstrativas e não integram ainda o motor do Terrenos. Nenhum ambiente Supabase foi alterado. A validação visual de larguras móveis e a integração automática Git–Vercel devem ter seu resultado registrado na homologação.
