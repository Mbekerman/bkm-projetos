# Entrega 0.5 — Ferramentas de desenho

## Comportamento

No visualizador PDF/imagem, escolher Ferramenta, cor e traço, tocar no botão da ferramenta e desenhar. Arrastar cria desenho livre, seta, linha de ligação, retângulo, círculo/elipse ou balão de chamada; um toque posiciona texto ou ponto. Após desenhar, Salvar anotação grava a marcação. Descartar cancela o rascunho. O balão liga uma posição na prancha a uma caixa de texto. As formas têm fundo transparente. Círculos são feitos definindo uma elipse com largura e altura iguais.

Ponto/comentário permanece disponível. Para texto e balão, informar texto de até 240 caracteres. Nas demais formas, o comentário é opcional; na ausência, a ferramenta fornece o título. A lista mantém o conteúdo completo e permite selecionar, resolver, reabrir e remover a marcação com as mesmas permissões da entrega anterior.

A navegação por arraste permanece ativa fora do modo desenho. Enquanto desenha, o toque pertence à ferramenta; concluir/cancelar devolve a navegação. Um desenho livre é limitado a 1.000 pontos; tremores mínimos são descartados. Texto tem tamanhos 14/18/24/32 px e traços 1/2/3/5/8 px. Formas são alinhadas por coordenadas normalizadas ao zoom e ao tamanho da superfície; o texto e a espessura mantêm legibilidade em pixels de tela.

Marcas antigas não mudam. Desenhos são vinculados à página/revisão, sem alterar o original. Edição de geometria já salva, redimensionamento por alças e exportação do PDF com desenhos não fazem parte desta entrega. Para refazer uma forma, remover a antiga e criar outra; o histórico é preservado. Rascunhos não salvos são descartados ao trocar de ferramenta/página ou fechar.

## Persistência e segurança

Migração additive `annotation_drawing_tools`: kind, geometry, stroke_color, stroke_width e font_size em document_annotations. O ponto antigo usa kind=pin e geometria vazia. Formas novas usam pontos normalizados em geometry.points. Um trigger privado valida formato, tipo, limites e origem, número de pontos e ausência de campos desconhecidos. Cor é hexadecimal estrita e tamanhos são limitados. As permissões de inserção foram ampliadas somente para essas colunas; geometria/autor/revisão/comentário permanecem imutáveis após salvar. RLS, vínculo a revisão pronta e auditoria continuam aplicados. O texto é inserido com textContent em SVG e escapado na lista, sem HTML arbitrário.

## Verificação

27 testes Node: inclui sete geometrias novas, tipo desconhecido, coordenadas e números inválidos, geometria incompleta, limite de pontos, filtragem de tremor e preservação de extremos; testes anteriores de uploads, perfis, marcação e ciclo de vida PDF também passaram. Build e sintaxe passaram.

`db/verify_drawing.sql` executado no BKM_autodoc com rollback. Passaram inserções dos sete novos tipos com RETURNING, bloqueio de geometrias inválidas, fora dos limites ou extensas demais, manutenção de pontos antigos e das permissões de autor/proprietário/leitor/externo, revisão pronta, projeto arquivado e auditoria. Nenhum dado de teste persistiu.

Interface verificada no preview com PDF fictício e repositório de teste simulado: os sete tipos foram criados e salvos, incluindo texto e chamada, mudança de cor para azul e traço 5 px, além de recarga preservando as sete marcações e zoom 125%/Ajustar. Corrigido redesenho indevido do formulário ao sair do comentário; adicionado alvo transparente maior para selecionar linhas com toque. Evidência: docs/screenshots/drawing-tools.jpg. O teste de interface foi separado da verificação transacional no banco real. Gesto de toque e teclado ainda precisam ser homologados no Android do usuário; nenhum arquivo real foi alterado pelos testes.
