# BKM Projetos

Frente de desenvolvimento independente para gestão de projetos, documentos e tarefas da BKM, inspirada nos fluxos estudados do Autodoc. Interface Material Design 3 com ativos oficiais BKM.

## Estado atual (0.9)

A demonstração local de index.html usa dados fictícios salvos no navegador. O ambiente conectado de online.html usa o Supabase dedicado, com autenticação própria e armazenamento privado; sua homologação está descrita abaixo. A integração com o Terrenos ainda não foi implementada.

- Projetos: busca, filtro por situação, detalhes, edição, código único, responsável, datas, arquivamento e restauração.
- Diretórios: árvore de pastas/subpastas, renomeação, movimentação e documentos simulados com vínculo estável à pasta.
- Tarefas: lista/quadro, criação, responsáveis, comentários e mudanças de situação.
- Temas claro, escuro e automático; layout responsivo.

## Ambiente conectado

`online.html` usa o Supabase dedicado BKM_autodoc. Login Google @bkm.com.br dispensa cadastro e senha; o acesso por senha legado continua disponível. RLS limita cada projeto a seu proprietário e participantes. Documentos e revisões ficam em Storage privado, com confirmação e retomada de upload.

- Arquivos PDF, PNG e JPEG de até 20 MiB; visualização interna com zoom e páginas.
- Marcações por revisão: desenho livre, formas, linhas, setas, texto e comentários.
- Solicitação de análise e parecer do proprietário, com histórico por revisão.
- Tarefas vinculadas a documentos/revisões/marcações, com responsáveis, prazos, prioridades, pausa e comentários.
- Equipe por projeto: autorizações BKM, editor/leitor, primeiro acesso Google, troca de papel e revogação.
- Visão geral: totais calculados no banco, atrasos, minhas tarefas e pendências; histórico de alterações com autor, filtros e paginação.

Veja `docs/Entrega_03_Arquivos.md` até `docs/Entrega_09_Operacao.md` para regras e verificações. IFC/DWG, notificações e integração com Terrenos ainda não foram implementados. O aplicativo permanece em homologação/piloto.

## Rodar

Requer Node.js 24 ou posterior:

```sh
npm ci
npm run build
npm start
```

Abra http://localhost:8080. `npm run check` verifica a sintaxe dos scripts. `npm test` executa os testes de regras de negócio e persistência. Os arquivos estáticos ficam em `public/`.

## Railway

O repositório inclui Dockerfile com compilação, Caddyfile e railway.json. O servidor usa a porta definida por `PORT` e oferece `/health`. `vercel.json` configura instalação e compilação na Vercel. A configuração pública do cliente está em `public/cloud-config.js`; nenhuma chave privilegiada deve entrar nesse arquivo. O ambiente dedicado não altera o Terrenos.

## Organização

`public/app.js`: comportamento e dados simulados; `public/styles.css`: tokens e componentes BKM; `public/assets`: SVGs oficiais; `docs`: identidade visual.

O ambiente conectado usa `src/online.js` e `public/cloud-store.js`. As definições SQL e verificações estão em `db/`. O núcleo de tarefas foi adaptado do motor `fluxo`, com dados e permissões próprios deste aplicativo. A demonstração local continua separada.

Código privado da BKM. Os ativos de marca foram fornecidos pelo titular e devem ser usados somente nos projetos autorizados da empresa.
