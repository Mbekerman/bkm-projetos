# Login Google BKM

Implementação preparada em 03/11/2026. O provedor Google ainda precisa ser ativado. Não considerar login Google homologado até concluir um login real.

## Fluxo

Entrar com Google BKM → consentimento básico → Supabase cria a conta automaticamente → nome/foto/e-mail disponíveis → primeiro acesso solicita celular → projetos autorizados.

Não há cadastro manual nem senha para o Google corporativo. O domínio exato é bkm.com.br, sem distinção de maiúsculas. E-mail deve estar verificado na identidade Google. O parâmetro hd é apenas uma sugestão para o seletor. Um trigger privado em auth.identities aplica o bloqueio no servidor na inserção/atualização, inclusive vinculação. Não usa user_metadata para autorizar. Login Google de outro domínio é recusado. O cadastro por e-mail/senha existente foi preservado.

Nome/foto são dados de exibição e nunca concedem permissões. user_profiles tem RLS: leitura própria e atualização somente do próprio celular; nenhum acesso anônimo. O número é informado pelo usuário e não é verificado por SMS. O formulário aceita celular brasileiro com DDD ou formato internacional com +. Só exibe avatar HTTPS do Google. Nenhum segredo OAuth está no cliente.

A entrada no app não concede acesso aos projetos de outros usuários. Continuam valendo proprietário e participantes de cada projeto.

## Configuração pendente

1. No Google Cloud/Google Auth Platform da BKM, selecionar ou criar um projeto dedicado. Se associado ao Workspace BKM e disponível, usar público interno.
2. Configurar nome BKM Projetos e contato de suporte. Escopos: openid, userinfo.email, userinfo.profile. Não solicitar contatos, arquivos ou People API.
3. Criar cliente OAuth do tipo aplicativo da Web.
4. Origem JavaScript: https://bkm-projetos.vercel.app
5. URI de redirecionamento autorizado: https://scsezwkyqzyhalbanrpm.supabase.co/auth/v1/callback
6. Em Supabase BKM_autodoc → Authentication → Sign In / Providers → Google: preencher Client ID e Client Secret diretamente no painel e ativar. Não enviar o segredo por chat nem versioná-lo.
7. Em URL Configuration, confirmar Site URL e redirect permitido: https://bkm-projetos.vercel.app/online.html (sem wildcard).
8. Atualizar o aplicativo. Ele consulta /auth/v1/settings e habilita o botão quando o provedor estiver ativo. Se indisponível, mantém o botão desabilitado com aviso de configuração.
9. Testar Google BKM, recusa Google externo, cancelamento/retorno, foto/nome, completar/editar celular, sair/entrar, e isolamento de projetos entre dois usuários.

Google em navegador embutido pode exigir abrir o site no Chrome/Safari. Isso precisa ser homologado no celular real.

## Evidências

16 testes Node passaram e build compilado. db/verify_google_profiles.sql executado com rollback: perfil automático, Google BKM verificado aceito, Google externo/subdomínio fraudulento/não verificado recusados, celular persistido, isolamento entre perfis e metadados protegidos. db/verify_access.sql passou após migração: proprietário/editor/leitor/externo, pastas, revisões, arquivo e auditoria. Testes não enviam e-mail nem criam dados permanentes. Login OAuth real e inspeção visual pendentes de credenciais e navegador operacional.

Fontes: https://supabase.com/docs/guides/auth/social-sign-in/auth-google e https://developers.google.com/identity/openid-connect/openid-connect
