# BKM Projetos

Frente de desenvolvimento independente para gestão de projetos, documentos e tarefas da BKM, inspirada nos fluxos estudados do Autodoc. Interface Material Design 3 com ativos oficiais BKM.

## Estado inicial

Protótipo funcional com dados fictícios. Não possui autenticação real, backend, conexão ao Supabase ou integração com o Terrenos. Alterações ficam no navegador e podem ser restauradas. Não utilizar como repositório de documentos reais nesta fase.

- Projetos: busca, filtro por situação e cadastro local.
- Diretórios: pastas por disciplina, documentos simulados e histórico de revisão.
- Tarefas: lista/quadro, criação, responsáveis, comentários e mudanças de situação.
- Temas claro, escuro e automático; layout responsivo.

## Rodar

Requer Node.js 22 ou posterior. Sem instalação de dependências:

```sh
npm start
```

Abra http://localhost:8080. `npm run check` verifica a sintaxe dos scripts. Os arquivos estáticos ficam em `public/`.

## Railway

O repositório inclui Dockerfile, Caddyfile e railway.json. Criar um serviço dedicado, sem variáveis ou credenciais do Supabase. O servidor usa a porta definida por `PORT` e oferece `/health`. A configuração de implantação não modifica Terrenos nem bancos existentes.

## Organização

`public/app.js`: comportamento e dados simulados; `public/styles.css`: tokens e componentes BKM; `public/assets`: SVGs oficiais; `docs`: identidade visual e plano de integração.

O futuro adaptador de dados deverá substituir a persistência local e reutilizar o motor `fluxo` do Terrenos após a confirmação de sua implantação. Nenhuma migration faz parte desta entrega.

Código privado da BKM. Os ativos de marca foram fornecidos pelo titular e devem ser usados somente nos projetos autorizados da empresa.
