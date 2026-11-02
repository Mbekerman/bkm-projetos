# Entrega 0.3 — ambiente conectado e visualização de arquivos

## Comportamento

A demonstração local continua em index.html. O botão Entrar no ambiente conectado leva a online.html, com autenticação própria por e-mail e senha. Não há migração automática dos exemplos locais.

No ambiente conectado: criar/editar/arquivar/restaurar projetos, criar/renomear/mover pastas, enviar PDF/PNG/JPEG até 20 MiB, cadastrar novas revisões, retomar envio pendente, visualizar e baixar o original. O visualizador PDF usa PDF.js com páginas e zoom. Imagens são abertas no próprio aplicativo. As revisões anteriores continuam disponíveis.

Participantes existentes no banco recebem acesso conforme RLS. A interface de convites/gestão de participantes ainda não foi construída. Apenas o proprietário edita os metadados do projeto; editor gerencia pastas/documentos; leitor consulta. Tarefas continuam na demonstração local, pendentes da integração com o Terrenos.

## Recebimento de arquivos

1. Validar extensão, assinatura inicial e tamanho no cliente.
2. Reservar documento e revisão no banco, ainda como pending.
3. Enviar o objeto privado sem sobrescrever uma revisão existente.
4. Confirmar upload_state=ready. A política no banco exige objeto no caminho esperado, com tamanho e MIME correspondentes.
5. Falha/interrupção mantém a reserva para retomada. Se a resposta do upload se perder, verificar o objeto existente antes de confirmar, sem reenviá-lo por cima.

Registros pending não são apresentados como arquivos disponíveis. A interface exige novamente nome, tamanho e tipo do arquivo ao retomar. O hash criptográfico e a limpeza automática de reservas sem arquivo são evoluções futuras; a validação atual não equivale a antivírus ou checagem completa de integridade do conteúdo.

## Configuração e dependências

Somente a URL e a chave publicável estão em public/cloud-config.js. Não há service_role ou chave secreta no cliente. As permissões são verificadas no banco e no Storage.

Dependências fixadas e lockfile: @supabase/supabase-js 2.118.0, pdfjs-dist 6.5.438 e esbuild 0.28.2. npm run build produz o bundle, o worker e os recursos PDF no mesmo domínio, preservando os avisos de licença. Vercel e Docker executam a compilação.

Migração adicional: confirm_document_upload; fonte em db/upload_confirmation.sql. Amplia somente a atualização da coluna upload_state, com política específica. Demais dados da revisão permanecem sem permissão de alteração para o cliente.

## Verificações

- npm run check: sintaxe dos módulos.
- npm run build: bundle e recursos do visualizador.
- npm test: 13 testes de domínio, persistência e fluxo de upload com cliente simulado.
- db/verify_access.sql: teste transacional real de proprietário/editor/leitor/externo, auditoria, pastas e revisão imutável; ampliado para rejeitar ready sem objeto no armazenamento.
- Consulta HTTP pública às configurações do Auth confirmou e-mail habilitado, Google desabilitado, signup permitido e confirmação de e-mail exigida.
- Requisição HTTP anônima à tabela projects retornou 401/42501, conforme esperado.

Pendências de homologação real: cadastro/confirmacão do primeiro usuário, login/logout, gravação de projeto via API autenticada e upload/visualização no navegador com arquivo real. Não declarar esses fluxos como testados apenas pelos mocks ou pelo teste SQL. O endereço de retorno do Auth deve ser verificado antes do primeiro cadastro. Visualização de IFC/DWG, anotações e recuperação de senha ainda não fazem parte desta entrega.

## Configuração de retorno e liberação para piloto

O painel confirmou a gravação de Site URL como https://bkm-projetos.vercel.app/online.html. O salvamento da URL adicional na allowlist não pôde ser confirmado porque o navegador ficou sem resposta. A aplicação pede o mesmo endereço configurado como Site URL, que é o destino padrão de retorno. Não foram cadastrados curingas de redirecionamento.

O preview carregou as telas Entrar e Criar acesso. A versão conectada está identificada como teste e será disponibilizada para cadastrar o primeiro usuário e realizar a homologação de arquivos. A demonstração local permanece disponível. A liberação técnica não representa a conclusão dos testes reais de login/upload, ainda pendentes.
