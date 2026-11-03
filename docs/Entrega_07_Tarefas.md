# Entrega 0.7 — Tarefas por projeto, revisão e anotação

## Núcleo reaproveitado

Referência consultada: Mbekerman/bkm_terrenos-claude, `supabase/migrations/20261015000150_fluxo.sql`, `tools/prototipo/proto_quadros.js` e `proto_tkvistas.js`. Foram adaptadas as regras do núcleo fluxo: listas Backlog/Fazer/Fazendo/Aguardando retorno/Pausadas/Feito, código TAR, responsável principal, prioridade baixa/média/alta, início/prazo, atraso calculado, pausa com motivo, concluir ao entrar em Feito, reabrir ao sair, comentários e arquivar/restaurar.

É uma adaptação desse núcleo à autorização por projeto do BKM Projetos. Não é a importação integral do motor fluxo nem uma sincronização entre bancos. Não foram alterados o repositório, o ambiente ou o banco de produção do Terrenos. Aqui, project_tasks e task_comments residem somente no BKM_autodoc. Fluxo depende de app.empresas/membros do outro sistema, que não existem neste banco; copiar a migração completa criaria dependências incompatíveis. A adaptação preserva essas regras centrais e a identidade visual BKM/Material.

## Uso

- Menu Tarefas: quadro ou lista, seleção do projeto, filtros por código/título/descrição, responsável, prioridade, atraso e arquivadas.
- Nova tarefa: título, descrição, lista, prioridade, responsável, início, prazo, documento/revisão opcionais.
- Em Abrir revisões, Criar tarefa inicia o formulário vinculado àquela revisão.
- No painel de uma marcação da prancha, Criar tarefa reaproveita o comentário como título/descrição e vincula projeto, documento, revisão e anotação.
- Abrir tarefa: descrição, responsável, prazo, contexto, comentários, editar e arquivar/restaurar. Abrir revisão e anotação retorna à página marcada quando a anotação continua disponível.
- Mover por arraste no quadro ou alterar a lista no formulário (também disponível no celular). Pausar exige motivo. Feito carimba conclusão/autor; sair de Feito reabre. Pausadas, feitas e arquivadas não são classificadas como atrasadas. O calendário de atraso usa America/Sao_Paulo.

O responsável precisa ser proprietário/editor do projeto, sem concessão automática de acesso. A lista de pessoas mostra somente nomes/IDs/papéis dos participantes daquele projeto. Leitores consultam; proprietário e editores criam/editam/comentam. Projetos arquivados bloqueiam alterações. Tarefas arquivadas preservam comentários e podem ser restauradas. Comentários são registros imutáveis nesta entrega. Uma anotação removida depois mantém o vínculo histórico da tarefa, e a revisão original continua acessível.

## Integridade

Vínculos documento/projeto, revisão/documento/projeto e anotação/revisão/projeto usam chaves compostas. Autor, código, identidade e timestamps são controlados pelo banco; cliente não escreve conclusão ou autoria. Trigger valida responsável e origem, pausa e conclusão/reabertura. Auditoria registra tarefas e comentários. RLS protege projeto; diretório project_people é RPC com escopo de um projeto autorizado. Nenhum envio de e-mail, mensagem ou notificação externa foi acrescentado.

## Limites desta etapa

Ainda não foram portados checklists, etiquetas, anexos próprios de cartão, subtarefas, reações, calendários, regras de SLA, recorrência, automações e permissões individuais do motor completo. Aprovação de revisão permanece independente da conclusão da tarefa; resolver marcação não conclui tarefa automaticamente, e concluir tarefa não aprova a revisão. O quadro usa as seis listas padrão; não há editor de listas nem reordenação manual dentro da coluna. O filtro central é por projeto, sem agregação de todos os quadros nesta versão.

## Verificações

34 testes Node passaram: tarefas, datas, pausa, atraso, horário brasileiro, filtros, código e escape de conteúdo, além dos testes anteriores de documentos, perfis, anotações e aprovações. Build e sintaxe passaram.

`db/verify_tasks.sql`: teste no BKM_autodoc com rollback de registros sintéticos. Verificou INSERT RETURNING, responsável, vínculos, revisão pronta, datas, conclusão/reabertura e carimbo, pausa, arquivamento/restauração, comentários imutáveis, consulta do diretório limitada ao projeto, leitor/externo sem escrita/leitura indevida e auditoria. A sequência dos códigos pode avançar durante os testes; nenhum cartão ou comentário fictício persistiu.

Interface integrada verificada em preview com cliente simulado e PDF fictício de duas páginas: anotação na página 2 → Criar tarefa com título/descrição e vínculos preenchidos → salvar prazo/prioridade → cartão no quadro → arrastar Fazer/Fazendo → comentar → abrir revisão na página 2 e destacar a anotação → pausar com motivo → ver lista sem atraso durante pausa → arquivar/restaurar com comentários preservados. Permissões e regras do banco foram ensaiadas separadamente via SQL transacional. Não confundir a fixture com uma conexão autenticada real; homologação de tarefa real e gestos no Android permanece pendente.

Foi corrigida também a restauração indiscriminada de botões após operações, que reativava os botões de página do PDF indevidamente: operações do aplicativo agora preservam o estado anterior dos botões e deixam os controles do visualizador sob gestão do PDF.js.

Na versão final do preview, foram verificados seleção dependente de documento/revisão, criação em Feito, exibição de conclusão com autor/horário, comentário após conclusão e estado correto de navegação PDF. Evidência: docs/screenshots/linked-task.jpg.
