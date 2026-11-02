# BKM Projetos

Frente de desenvolvimento independente para gestão de projetos, documentos e tarefas da BKM, inspirada nos fluxos estudados do Autodoc. Interface Material Design 3 com ativos oficiais BKM.

## Estado inicial

A demonstração local de index.html usa dados fictícios salvos no navegador. O ambiente conectado de online.html usa o Supabase dedicado, com autenticação própria e armazenamento privado; sua homologação está descrita abaixo. A integração com o Terrenos ainda não foi implementada.

- Projetos: busca, filtro por situação, detalhes, edição, código único, responsável, datas, arquivamento e restauração.
- Diretórios: árvore de pastas/subpastas, renomeação, movimentação e documentos simulados com vínculo estável à pasta.
- Tarefas: lista/quadro, criação, responsáveis, comentários e mudanças de situação.
- Temas claro, escuro e automático; layout responsivo.

## Ambiente conectado (0.3)

`online.html` adiciona autenticação por e-mail e senha e acesso ao projeto Supabase dedicado. Projetos, pastas, documentos e revisões desse ambiente usam o banco remoto e RLS. A demonstração de `index.html` continua local e tem um botão para entrar no ambiente conectado; nenhum exemplo é enviado automaticamente.

PDF, PNG e JPEG de até 20 MiB podem ser enviados, versionados, retomados após interrupção, visualizados e baixados. PDF.js renderiza as páginas com zoom dentro do aplicativo. A confirmação de recebimento no banco verifica o objeto esperado no Storage. Veja `docs/Entrega_03_Arquivos.md` para validações e limites de homologação.

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

O futuro adaptador de dados deverá substituir a persistência local e reutilizar o motor `fluxo` do Terrenos após a confirmação de sua implantação. Nenhuma migration faz parte desta entrega.

Código privado da BKM. Os ativos de marca foram fornecidos pelo titular e devem ser usados somente nos projetos autorizados da empresa.
