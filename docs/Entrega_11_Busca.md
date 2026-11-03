# Entrega 0.11 — Busca integrada

## Uso e alcance

Menu Buscar. Digite de 2 a 120 caracteres, selecione projeto (ou todos), tipo e opção de incluir arquivados, depois toque em Buscar conteúdo. A busca é manual por trecho literal, sem diferenciar caixa e os acentos latinos comuns do português. Percentual, sublinhado e barra invertida são caracteres de busca, não operadores. Não há expressão regular, execução SQL do usuário ou busca a cada tecla.

| Tipo | Campos pesquisados | Abertura |
|---|---|---|
| Documento | Código e título | Lista de revisões do documento |
| Revisão/arquivo | Código/título do documento, código da revisão e nome original do arquivo | Visualizador se recebido; lista de revisões se pendente |
| Tarefa | Código TAR, título e descrição | Detalhes e comentários da tarefa |
| Marcação | Texto da marcação não removida | Revisão, página e marcação selecionada |

Resultados mostram projeto, tipo, situação, identificação e trecho inicial de até 320 caracteres. O trecho não é uma janela calculada ao redor da palavra encontrada; um acerto no fim de uma descrição longa pode exigir abrir a tarefa. Marcações resolvidas são pesquisáveis, removidas não. Inclui revisões antigas e envios pendentes: cada revisão é um resultado independente. Uma palavra do título pode retornar tanto o documento quanto suas revisões. Não há deduplicação entre tipos porque possuem ações diferentes.

A opção de arquivados inclui projetos arquivados e tarefas arquivadas. Não há pesquisa no conteúdo interno de PDFs/imagens, OCR, geometria do desenho, comentários de tarefas, pareceres, perfis, e-mails, telefones, pastas ou sistemas externos. Integração com Terrenos permanece fora do escopo.

## Paginação e navegação

Totais e filtros calculados no banco, sem depender do limite de linhas REST ou do lote inicial da tela. Até 25 resultados por página, com Mais/Anteriores. Ordem estável por tipo e UUID; não é classificação por relevância. Cursor textual validado, com ordenação C. Nova consulta, Atualizar resultados e retorno à busca iniciam na primeira página. Alterações concorrentes podem mudar os totais; Atualizar refaz a consulta.

Abrir resultado consulta novamente o projeto e o registro. Tarefas usam consulta direta por projeto/ID. Documentos carregam suas revisões em lotes de 500 e os pareceres em grupos de até 100 revisões, também paginados, em vez de confiar na primeira página de dados do projeto. Revisões e marcações são buscadas novamente antes de abrir; marcação removida produz aviso de indisponibilidade. A página é preservada ao abrir a prancha.

## Segurança e desempenho

search_project_content é SECURITY INVOKER, search_path vazio, EXECUTE apenas authenticated. A seleção de projetos e todas as tabelas continuam protegidas por RLS. Informar explicitamente um projeto inacessível é rejeitado; a busca geral não inclui linhas desses projetos. A normalização privada é uma função pura de texto, sem consulta a usuários ou tabelas e sem bypass de RLS.

Nenhuma escrita é realizada pela busca. O resultado não contém caminho de Storage, dados de autorização ou dados particulares de perfis. Textos/resultados usam escape HTML na interface; parâmetros não são concatenados em SQL dinâmico.

A implementação faz consultas por trecho sobre os registros acessíveis. Não instala extensões nem índices de texto nesta entrega. O mínimo de dois caracteres e o envio manual evitam consultas por tecla, mas o custo de leitura cresce com o volume. Para bases maiores, medir e adotar índice de texto/trigramas antes de expandir o piloto; o teste desta versão valida contagem/paginação, não é benchmark de capacidade.

## Verificação

55 testes Node passaram: validação, símbolos, escape, estados inicial/vazio, ações de tipos, parâmetros da RPC e contexto com 1.001 revisões, escopo por projeto e grupos de até 100 revisões.

db/verify_search.sql passou no BKM_autodoc com dados sintéticos e rollback: acentos/caixa, percentuais/sublinhado/barra literais, nomes de arquivos, descrição de tarefas, texto de marcações, total exato de 1.005 documentos, cursor sem repetição, entradas inválidas, projeto arquivado, marcação removida, usuário externo e projeto explícito proibido, leitor autorizado e ausência de execução anônima/bypass de RLS. Nenhum projeto/documento real foi alterado.

O advisor de segurança não adicionou ocorrências. Permanece o aviso anterior de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

No preview isolado, a interface foi conferida com 31 resultados fictícios: consulta sem acentos, duas páginas, abertura de tarefa, documento/revisões, filtro de projeto sem resultados, busca por nome de arquivo e abertura direta da marcação selecionada na prancha PNG. Fixture reproduzível em tests/fixtures/search-client.js, importado somente pelo build de teste. Evidência em docs/screenshots/search.jpg. Nenhum arquivo real foi baixado nem dado real alterado nesta verificação. A verificação visual foi feita em desktop; a experiência no celular ainda requer validação no dispositivo do usuário.

Build e sintaxe passaram. O build de produção preserva o cliente Supabase real e não inclui o alias/HTML de teste.
