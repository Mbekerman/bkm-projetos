# Correção: abertura após fechar PDF

Erro reportado: `r.destroy is not a function` ao clicar em Visualizar.

A versão fixada PDF.js 6.5.438 não expõe destroy() no PDFDocumentProxy. O descarte anterior chamava esse método e interrompia clearViewer(), impedindo a abertura seguinte. A versão correta usa PDFDocumentLoadingTask.destroy().

A limpeza agora remove o estado ativo antes de descartar recursos, cancela a renderização, remove o listener e libera o loading task uma única vez. A próxima abertura aguarda a limpeza anterior. Eventos de fechamento de diálogo sem recursos pendentes não invalidam a próxima abertura. Erros de limpeza não substituem erros de renderização.

23 testes passaram, incluindo descarte sem método no proxy, descarte idempotente, sequência de três documentos e tolerância a erro na liberação. Build compilado. Nenhum registro ou arquivo do usuário foi alterado.
