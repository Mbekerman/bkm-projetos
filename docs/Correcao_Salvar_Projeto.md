# Correção do salvamento de projetos

## Causa e reprodução

O cliente usa INSERT com representação retornada (`insert(...).select().single()`). A política SELECT de projects consultava a própria tabela por uma função STABLE de associação. Durante INSERT RETURNING, o snapshot dessa função não inclui a nova linha; a verificação de leitura impedia o retorno e fazia a transação falhar com 42501.

O erro foi reproduzido antes da correção em uma transação com usuário sintético e INSERT RETURNING. Os testes iniciais executavam INSERT sem RETURNING e por isso não cobriam o caminho usado pelo aplicativo.

## Alteração

A política permite a leitura direta quando owner_id corresponde a auth.uid(), mantendo a função de associação para os demais participantes. A política INSERT continua exigindo que o usuário seja o proprietário. RLS e os controles por projeto permanecem ativos.

A mensagem de processamento também perdia sua classe estável, deixando o tratamento de erro sem referência ao mesmo elemento. O formulário agora reutiliza esse elemento, substituindo a mensagem em vez de acumular avisos.

## Validação

- Migração remota fix_project_insert_returning aplicada.
- Teste SQL ampliado: INSERT RETURNING permitido para proprietário; tentativa de forjar outro proprietário negada; acesso de externo/leitor/editor continua validado.
- Testes SQL feitos em transação com ROLLBACK, sem criar registros de teste persistentes.
- Sintaxe, build e 13 testes locais passaram.
- Advisor: nenhuma nova falha RLS; permanece o aviso independente de proteção contra senhas vazadas desativada. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

O fluxo autenticado no navegador do usuário ainda precisa ser repetido para confirmar o cadastro real. Esta correção não cria o projeto em nome do usuário nem altera seus dados de formulário.
