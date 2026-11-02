# Design System BKM

> **Para o assistente que ler este arquivo:** este é o design system oficial da BKM. Use-o como fonte única para cores, tipografia, espaçamento, componentes, tom de voz e regras de marca em tudo o que gerar (telas, código, textos). Não invente cores, fontes ou estilos fora daqui. Quando a tarefa for um **aplicativo / tela de trabalho**, a seção **Aplicativos** prevalece sobre as regras de site e peças.
>
> Conteúdo: 1) Marca e tom de voz · 2) Cores · 3) Tipografia · 4) Logo, símbolos, ícones, fotografia · 5) Espaçamento e raios · 6) Aplicativos (Material 3 + BKM) · 7) Tokens em CSS · 8) Componentes (CSS + HTML) · 9) Pendências conhecidas.
>
> Os arquivos de logo e ícones (SVG/PNG) não estão neste documento; se precisar deles, peça o upload. **Nunca recrie o logo em código ou texto.**

---

## 1. Marca e tom de voz

A BKM é uma incorporadora e construtora especializada em empreendimentos Minha Casa Minha Vida, focada em quem está conquistando o primeiro imóvel. A marca une racionalidade e emoção: **decisão + conquista + vida real**. Tagline: **Genial como seu jeito de viver.**

O sistema vale para tudo o que leva a marca: site, apps (como o BKM 2.0 e o BKM Terrenos), apresentações, peças impressas e comunicação interna.

### Princípios

- **Clareza acima de impacto.** Explique antes de convencer. Menos promessas, mais evidência.
- **Construtor + Cuidador.** Construa com rigor (dados, consistência, entrega bem feita) e cuide da decisão de quem compra (proximidade, orientação, respeito pelo peso da escolha).
- **Acessível, moderna, emocional.** Próxima, mas com profundidade. Atual, sem perder o calor humano.
- **Nada é excesso, nada é acaso.** Cada elemento na tela ou na página precisa ter função clara.

### Tom de voz

A BKM não fala para vender: fala para ajudar o cliente a decidir bem. Se a marca fosse uma pessoa, seria a Sula, 38 anos: segura sem ser arrogante, clara sem ser fria, prática sem ser simplista, cuidadosa sem ser emocional demais.

| Como fala | Como não fala |
|---|---|
| Direta, clara, explicativa | Não exagera em promessas |
| Confiante, sem exagero | Não usa jargão técnico desnecessário |
| Humana, com proximidade | Não é fria nem distante |

- Frases curtas e diretas. Se uma palavra pode sair sem perder o sentido, ela sai.
- Calorosa, não efusiva. Próxima, mas sem coloquialismo em excesso.
- Trate o leitor por **você**. Fale da empresa como **a BKM** ou **a gente**.
- Sem emoji em comunicação institucional, peças ou interfaces.
- Cada área tem um verbo: o Marketing **explica**, não pressiona; o Comercial **orienta**, não empurra; o Produto **resolve**, não padroniza; o Atendimento **escuta**, acompanha e esclarece.

Frases de referência: "Ao seu lado, em cada passo da sua conquista." · "Cada decisão importa quando o sonho é ter um lugar seu." · "Genial como seu jeito de viver." · "Tudo mais perto de você." · Do site: "Um endereço para cada momento da sua vida", "Projetos para diferentes começos", "Seu sonho virou endereço".

---

## 2. Cores

### Paleta da marca

| Token | Hex | Papel | Uso |
|---|---|---|---|
| `marinho` | #1d2e5c | Primária | Fundo de capas e peças institucionais; texto e títulos sobre branco (13,1:1). |
| `cinza-escuro` | #43464b | Primária | Texto de apoio sobre branco (9,5:1); versão neutra de símbolos. |
| `preto` | #000000 | Primária | Letras do logotipo; texto sobre fundo claro. |
| `branco` | #ffffff | Primária | Fundo das páginas claras; texto sobre marinho. |
| `azul-bkm` | #0094fe | Secundária | Cor do K do logo. Grafismos, ícones, linhas, títulos ≥24px. **Nunca texto corrido sobre branco (3,15:1).** |
| `pessego` | #deafa1 | Secundária | Blocos de apoio com texto marinho (6,7:1). |
| `roxo` | #863d8f | Secundária | Blocos de destaque; texto branco por cima (6,8:1). |
| `terracota` | #c67355 | Secundária | Blocos e grafismos; texto branco só ≥24px ou negrito 19px. |
| `verde-claro` | #e8eed2 | Secundária | Fundo suave de seções e cards; texto marinho. |
| `verde-salvia` | #ccd3a7 | Secundária | Blocos de apoio; texto marinho (8,4:1). |
| `cinza-claro` | #cececc | Secundária | Divisórias em fundo claro; texto de apoio sobre marinho. Nunca texto sobre branco. |
| `gradiente-ciano` | #0ec2ff | Apoio | Ponta clara do gradiente do logo; links sobre marinho (6,4:1). |
| `gradiente-profundo` | #1459c3 | Apoio | Ponta escura do gradiente; **texto/links azuis sobre branco** (6,5:1). |
| `marinho-profundo` | #23315e | Apoio | Cards sobre fundo marinho. |
| `azul-gelo` | #e4ebf8 | Apoio | Cards e caixas sobre fundo branco. |
| `azul-site` | #5293f9 | Site | Azul dos botões de busca/navegação, links e numeração do bkm.com.br. Não está no manual. |

**Gradiente da marca:** `linear-gradient(90deg, #0ec2ff, #0094fe 55%, #1459c3)`. Reserve para o símbolo, uma linha de assinatura ou um único bloco de destaque por tela; nunca como fundo de texto corrido.

### Temas (peças e site)

- **Claro** (`superficie` = branco): conteúdo, leitura e interfaces.
- **Claro · Azul**: igual ao Claro, mas com `azul-bkm` no lugar do `marinho` nos elementos de marca (botão principal, aberturas de capítulo). Para peças leves e comerciais (site, campanhas). Texto branco sobre azul só ≥19px negrito.
- **Marinho** (`superficie` = marinho): capas, aberturas, heróis, peças institucionais.

### Regras de uso

- Títulos e texto em `texto` (marinho no claro). Apoio em `texto-suave`. Links e uma palavra azul de destaque em `texto-destaque`.
- Secundárias com parcimônia: a interface é branca e marinho, com azul nos detalhes. Secundárias entram como **formas suaves** (símbolo grande, translúcido, atrás do conteúdo; uma por tela no máximo) e como fundo calmo de seção (`verde-claro`, `pessego`).
- No site, cores fortes aparecem só em: **botões**, **palavra manuscrita** dos títulos e **sobretítulos** em terracota.
- Texto sobre secundárias: `marinho` em pêssego, verde-claro e verde-sálvia; `branco` em roxo; em terracota, só ≥24px.
- Separe com fio de 1px e espaço, **não com sombras**. O sistema não usa sombras.
- Anel de foco: `foco`, 2px, afastado 2px.

---

## 3. Tipografia

- **Aptos** (marca): títulos em Light, subtítulos em SemiBold, corpo em Regular, trechos-chave em Bold. Fonte da Microsoft, não está no Google Fonts; na web cai para Segoe UI / system-ui.
- **Nothing You Could Do** (Google Fonts): tipografia manuscrita de apoio. Escreva a **última palavra** dos títulos principais em manuscrita, ~1,5× o tamanho do título. Cor: roxo no claro, pêssego no escuro (variações azul e verde). Ex.: "Genial como seu jeito de *viver*", "Projetos para diferentes *começos.*", "Seja um *parceiro* BKM".
- Manuscrita **nunca** em parágrafos, botões, rótulos, dados, texto pequeno ou telas de trabalho (apps, tabelas, formulários).
- Rótulos e sobretítulos em CAIXA ALTA com espaçamento largo ("BRAND BOOK · IDENTIDADE VISUAL").

| Estilo | Tamanho / linha | Peso | Uso |
|---|---|---|---|
| `display` | 64/68px, -0.01em | 300 | Capa, abertura de capítulo, hero |
| `titulo-1` | 44/50px | 300 | Título de página |
| `titulo-2` | 32/40px | 300 | Título de seção (com símbolo casa à esquerda) |
| `titulo-3` | 20/26px | 600 | Título de card ou bloco |
| `corpo` | 16/24px | 400 | Texto corrido |
| `corpo-forte` | 16/24px | 700 | Palavras-chave no corpo |
| `corpo-pequeno` | 14/20px | 400 | Cards, legendas, notas |
| `rotulo` | 12/16px, 0.25em, CAIXA ALTA | 400 | Rótulos e sobretítulos |
| `manuscrito` | 32/36px | 400 | Última palavra do título |

---

## 4. Logo, símbolos, ícones e fotografia

### Logo

O logotipo é **bkm** em minúsculas, com o K formado pelo símbolo da marca. Use sempre os arquivos oficiais (de preferência SVG). **Nunca redesenhe, recrie ou digite o logo.**

| Versão | Arquivo | Quando usar |
|---|---|---|
| Original com tagline | `bkm-tagline-original-gradiente` | Versão principal, sobre fundo claro. |
| Original sem tagline | `bkm-original-gradiente` | Escalas menores e layouts compactos. |
| K azul chapado | `bkm-original-azul`, `bkm-tagline-original-azul` | Interfaces, bordado, impressão simples. |
| Negativo | `bkm-negativo-gradiente`, `bkm-tagline-negativo-gradiente`, versões `-azul` | Fundos marinho, preto ou fotos escuras. |
| Monocromático | `bkm-mono-preto`, `bkm-mono-branco` (+ tagline) | Sobre azul-bkm (branco) ou impressão em uma cor. |

- Redução mínima: com tagline 280px (55mm); sem tagline 120px (25mm); símbolo isolado 48px (10mm). Abaixo de 120px, só o símbolo.
- Área de proteção: X = largura da haste do "l".
- Proibido: alterar cores, distorcer, aplicar contorno, mudar formas, tipografia ou composição.

### Símbolos e grafismo

- **Símbolo casa (vertical):** marcador de título de seção (pequeno, azul-bkm, à esquerda do `titulo-2`) e ícone de app/favicon.
- **Grafismo D (horizontal):** marcador de abertura de capítulo e moldura recortada para fotos.
- **Seta BKM (chevron):** direção, progresso, "próximo passo".
- O grafismo reforça, não compete. Nunca por cima de texto. Em fundos marinho, o grafismo em linha (fio fino azul translúcido) pode sangrar para fora da página. Versões em linha são do grafismo, nunca do logo.

### Ícones (61, família própria)

Linha, cantos e pontas arredondados, grade 96×96, traço 3. Bicolores: traço `marinho` (#1d2e5c) e detalhe `azul-bkm` (#0094fe). Em fundo marinho, troque #1d2e5c por #ffffff. Mínimo 32px em peças/site e 24px na navegação de apps. Não misture com outras bibliotecas; se faltar, desenhe no mesmo estilo.

- Espaços e projetos: casa, condominio, planta, chave, localizacao, lazer, areas-verdes, mobilidade, construcao, entrega, manutencao, seguranca.
- Pessoas e cultura: pessoa, time, conexao, acolhimento, comunidade, bem-estar, acessibilidade, diversidade, desenvolvimento, reconhecimento, cultura, atendimento.
- Gestão e negócios: planejamento, checklist, documento, contrato, orcamento, financeiro, indicadores, crescimento, meta, ideia, parceria, tempo.
- Digital e comunicação: mensagem, e-mail, telefone, apresentacao, arquivo, nuvem, anexo, link, busca, configuracoes, aprovacao, compartilhar.
- Sistema e operação: terrenos, mapa, vendas, obra, despesas, gestao, configuracao, projetos, projetos-esquadro, admin, admin-engrenagem, empreendimentos, empreendimentos-arvore.

`configuracao` (engrenagem) = área de configurações; `configuracoes` (controles) = ajuste e filtro dentro da tela. `empreendimentos` = conjunto; `condominio` = um empreendimento.

### Fotografia

Afaste-se dos códigos visuais tradicionais do MCMV: abordagem humana, natural e contemporânea. Pessoas reais, identificação cultural brasileira (quem começa sozinho, a dois, com filhos). Personagens **não encaram a câmera**: o olhar vai para o futuro. Momentos cotidianos, bem-estar, pertencimento.

---

## 5. Espaçamento, raios e composição

Múltiplos de 4px. Seja generoso: títulos grandes pedem 64–96px em volta.

| Token | Valor | Uso |
|---|---|---|
| `espaco-1` | 4px | Ícone ↔ texto em selos |
| `espaco-2` | 8px | Itens na mesma linha |
| `espaco-3` | 12px | Padding vertical de botões |
| `espaco-4` | 16px | Cards compactos; entre parágrafos |
| `espaco-6` | 24px | Padding de cards; horizontal de botões |
| `espaco-8` | 32px | Entre blocos de uma seção |
| `espaco-12` | 48px | Entre seções (mobile) |
| `espaco-16` | 64px | Margem de página; entre seções (desktop) |
| `espaco-24` | 96px | Respiro de display e capas |

| Raio | Valor | Uso |
|---|---|---|
| `raio-sm` | 4px | Campos e checkboxes |
| `raio-md` | 8px | Caixas de frase |
| `raio-botao` | 12px | Botões (site) |
| `raio-lg` | 20px | Cards |
| `raio-xl` | 24px | Blocos de imagem, painéis de cor |
| `raio-pilula` | 999px | Selos e chips |

Materiais dinâmicos (redes, eventos): mais cor e grafismo. Institucionais (contratos, relatórios): contido, neutro, grafismo sutil.

---

## 6. Aplicativos (telas de trabalho)

Sistemas internos, painéis e apps (referência: BKM Terrenos). **Esta seção prevalece sobre o resto do documento em aplicativos.**

Base: **Google Material 3**, com a marca BKM por cima (logo oficial, ícones BKM, tom de voz da Sula). Em ferramenta de uso diário, familiaridade pesa mais: quem usa Gmail e Drive já sabe ler gaveta lateral, botão em cápsula e chip de filtro.

| Nas peças e no site | Nos aplicativos |
|---|---|
| Aptos, títulos Light | **Google Sans Flex** (Google Fonts), títulos peso 400, rótulos 500 |
| Rótulos em CAIXA ALTA espaçada | Rótulos em caixa normal |
| Palavra manuscrita no título | Não entra |
| Forma suave | Não entra |
| Botão com cantos de 12px | Botão em cápsula (raio 20, altura 40) |
| Cards azul-gelo, raio 20, sem borda | Cards contornados (raio 12), indicadores tonais (raio 16) |
| Sem cores de status | Status no padrão Material (verde, âmbar, vermelho) |

Continuam iguais: logo oficial (mín. 120px; no escuro, todo branco), ícones BKM (mín. 24px), tom de voz, função clara de cada elemento.

### Tipografia dos apps

| Estilo | Tamanho / linha | Peso | Uso |
|---|---|---|---|
| `app-titulo` | 28/36px | 400 | Título de página ("Bom dia, Moisés") |
| `app-titulo-secao` | 16/24px | 500 | Título de card, seção, coluna |
| `app-corpo` | 14/20px | 400 | Listas, tabelas, formulários |
| `app-rotulo` | 12/16px | 500 | Rótulos, cabeçalhos de tabela, chips |

### Temas

Todo app oferece **Claro** (padrão), **Escuro** e **Automático** num menu na barra superior; a escolha fica salva no aparelho.

**Claro:** fundo `app-fundo` #f8fafd; texto #1f1f1f; apoio #444746; contornos #c4c7c5. Ação `app-primaria` #0b57d0 (botão cheio, links). Item ativo de menu/seletor/filtro em `app-selecao` #c2e7ff com texto #001d35. Botão de criar ("Novo terreno") = flutuante tonal `app-primaria-suave` #d3e3fd, texto #041e49, raio 16.

**Escuro:** fundo azul-noite liso `app-escuro-fundo` #081028, sem brilho nem degradê; barras na mesma cor, separadas por fio #1a2240. Quadros, listas e cartões um tom **abaixo** do fundo (#060c20), contorno índigo a 16% — parecem afundados, não elevados. Texto #eef1ff, apoio #a7b0dd, links #8ab4ff. Indicadores com contorno neon, um por cor na ordem: #3b82f6, #6366f1, #a855f7, #ec4899 (o número segue a cor). Gráficos e linha do tempo em azul e ciano #22d3ee.

**Padrão tonal (regra do escuro):** todo botão de ação e todo seletor ativo usa véu índigo a 10% (#6370ff1a), contorno índigo a 50% (#7c8cff80) e texto #c9d6ff. Sem degradê, sem brilho, sem fundo cheio. Vale para botões principais, item ativo do menu/barra inferior, seletor segmentado e filtros. O botão flutuante do celular usa o mesmo véu, mais opaco, com `backdrop-filter: blur`.

### Status e fases

| Estado | Claro (texto / fundo) | Escuro (texto / fundo) |
|---|---|---|
| Ok | #146c2e / #c4eed0 | #6dd58c / #0f5223 |
| Atenção | #7a5900 / #ffdf99 | #ffd36e / #5c4300 |
| Crítico | #b3261e / #ffdad6 | #f2b8b5 / #8c1d18 |

Fases da negociação: proposta enviada (claro #0b57d0 / escuro #60a5fa), contraproposta (#8e4ec6 / #c084fc), negociações finais (#146c2e / #34d399). Marque a fase também por texto ou ícone, nunca só pela cor.

### Componentes do app

- **Barra superior:** logo, nome do produto, busca em cápsula larga, seletor de perfil, menu de tema.
- **Gaveta lateral:** botão de criar no topo, itens com ícone BKM 24px, item ativo em pílula; recolhível para só ícones.
- **Barra inferior (celular):** no máximo seis destinos, indicador do ativo em pílula atrás do ícone.
- **Botões:** principal cheio (claro) ou tonal (escuro); secundário contornado (#747775); texto para ações leves ("Stand by", "Editar").
- **Cards e listas:** contornados, divisão por fio; tabelas com cabeçalho em `app-superficie-baixa` #f0f4f9 no claro. Campos e busca em `app-superficie-alta` #e9eef6.
- **Indicadores:** blocos tonais no claro; contorno neon no escuro.
- **Chips e selos:** retangulares, raio 8.

Raios: chip 8 · card 12 · indicador e flutuante 16 · botão 20 · busca e pílulas de navegação 999.

Contraste: texto principal 15,8:1 (claro) e 17,3:1 (escuro); `app-primaria` 6,4:1 sobre branco; selos de status entre 5:1 e 6,6:1. Ponto de atenção: o contorno do padrão tonal dá 2,5:1 (abaixo de 3:1); se acessibilidade virar prioridade, subir a opacidade do contorno de 50% para 70%.

---

## 7. Tokens em CSS

Cole no início do CSS do projeto. O tema é trocado com `data-theme` no `<html>` ou num contêiner.

```css
@import url("https://fonts.googleapis.com/css2?family=Nothing+You+Could+Do&family=Google+Sans+Flex:wght@400;500&display=swap");

:root {
  /* Fontes */
  --font-aptos: Aptos, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --font-manuscrita: "Nothing You Could Do", "Segoe Script", cursive;
  --font-app: "Google Sans Flex", Roboto, system-ui, sans-serif;

  /* Paleta da marca */
  --marinho: #1d2e5c;
  --cinza-escuro: #43464b;
  --preto: #000000;
  --branco: #ffffff;
  --azul-bkm: #0094fe;
  --pessego: #deafa1;
  --roxo: #863d8f;
  --terracota: #c67355;
  --verde-claro: #e8eed2;
  --verde-salvia: #ccd3a7;
  --cinza-claro: #cececc;
  --gradiente-ciano: #0ec2ff;
  --gradiente-profundo: #1459c3;
  --marinho-profundo: #23315e;
  --azul-gelo: #e4ebf8;
  --azul-site: #5293f9;
  --gradiente-marca: linear-gradient(90deg, var(--gradiente-ciano), var(--azul-bkm) 55%, var(--gradiente-profundo));

  /* Semânticos — tema Claro (padrão) */
  --superficie: var(--branco);
  --superficie-elevada: var(--azul-gelo);
  --texto: var(--marinho);
  --texto-suave: var(--cinza-escuro);
  --texto-destaque: var(--gradiente-profundo);
  --texto-manuscrito: var(--roxo);
  --destaque: var(--azul-bkm);
  --linha: var(--cinza-claro);
  --borda-controle: var(--cinza-escuro);
  --foco: var(--gradiente-profundo);
  --acao: var(--marinho);
  --sobre-acao: var(--branco);
  --fundo-marca: var(--marinho);
  --sobre-fundo-marca: var(--branco);
  --manuscrito-sobre-marca: var(--pessego);

  /* Espaçamento */
  --espaco-1: 4px;  --espaco-2: 8px;  --espaco-3: 12px; --espaco-4: 16px;
  --espaco-6: 24px; --espaco-8: 32px; --espaco-12: 48px; --espaco-16: 64px; --espaco-24: 96px;

  /* Raios */
  --raio-sm: 4px; --raio-md: 8px; --raio-botao: 12px; --raio-lg: 20px; --raio-xl: 24px; --raio-pilula: 999px;

  /* Aplicativos — claro */
  --app-fundo: #f8fafd;
  --app-superficie-baixa: #f0f4f9;
  --app-superficie-alta: #e9eef6;
  --app-texto: #1f1f1f;
  --app-texto-suave: #444746;
  --app-contorno: #c4c7c5;
  --app-contorno-forte: #747775;
  --app-primaria: #0b57d0;
  --app-primaria-suave: #d3e3fd;
  --app-sobre-primaria-suave: #041e49;
  --app-selecao: #c2e7ff;
  --app-sobre-selecao: #001d35;
  --app-ok: #146c2e;        --app-ok-fundo: #c4eed0;
  --app-atencao: #7a5900;   --app-atencao-fundo: #ffdf99;
  --app-critico: #b3261e;   --app-critico-fundo: #ffdad6;
  --app-fase-enviada: #0b57d0;
  --app-fase-contra: #8e4ec6;
  --app-fase-finais: #146c2e;

  /* Aplicativos — escuro */
  --app-escuro-fundo: #081028;
  --app-escuro-fio: #1a2240;
  --app-escuro-quadro: #060c20;
  --app-escuro-contorno: #7c8cff29;
  --app-escuro-texto: #eef1ff;
  --app-escuro-texto-suave: #a7b0dd;
  --app-escuro-link: #8ab4ff;
  --app-escuro-veu: #6370ff1a;
  --app-escuro-veu-contorno: #7c8cff80;
  --app-escuro-sobre-veu: #c9d6ff;
  --app-neon-azul: #3b82f6;
  --app-neon-indigo: #6366f1;
  --app-neon-violeta: #a855f7;
  --app-neon-rosa: #ec4899;
  --app-neon-ciano: #22d3ee;
  --app-escuro-ok: #6dd58c;      --app-escuro-ok-fundo: #0f5223;
  --app-escuro-atencao: #ffd36e; --app-escuro-atencao-fundo: #5c4300;
  --app-escuro-critico: #f2b8b5; --app-escuro-critico-fundo: #8c1d18;
  --app-escuro-fase-enviada: #60a5fa;
  --app-escuro-fase-contra: #c084fc;
  --app-escuro-fase-finais: #34d399;

  /* Raios — aplicativos */
  --app-raio-chip: 8px; --app-raio-card: 12px; --app-raio-indicador: 16px; --app-raio-flutuante: 16px; --app-raio-botao: 20px;
}

/* Tema Claro · Azul: azul-bkm nos elementos de marca */
[data-theme="claro-azul"] {
  --acao: var(--azul-bkm);
  --sobre-acao: var(--branco);
  --fundo-marca: var(--azul-bkm);
  --sobre-fundo-marca: var(--marinho);
  --manuscrito-sobre-marca: var(--verde-claro);
}

/* Tema Marinho: capas, heróis, peças institucionais */
[data-theme="marinho"] {
  --superficie: var(--marinho);
  --superficie-elevada: var(--marinho-profundo);
  --texto: var(--branco);
  --texto-suave: var(--cinza-claro);
  --texto-destaque: var(--gradiente-ciano);
  --texto-manuscrito: var(--pessego);
  --linha: #0094fe80;
  --borda-controle: var(--cinza-claro);
  --foco: var(--gradiente-ciano);
  --acao: var(--branco);
  --sobre-acao: var(--marinho);
  --fundo-marca: var(--marinho-profundo);
  --sobre-fundo-marca: var(--branco);
  --manuscrito-sobre-marca: var(--pessego);
}
```

---

## 8. Componentes (site e peças)

CSS puro, sem dependências, portável para WeWeb, site ou qualquer HTML. Todos leem os tokens da seção 7. **Não use estes componentes em telas de aplicativo** (lá vale a seção 6).

### Button

Cantos de 12px, texto regular 16px, seta à direita, nas cores do site.

| Variação | Classe | Onde usar |
|---|---|---|
| Terracota | `bkm-botao--terracota` | Chamada principal do topo: "Encontre seu novo lar", "Quero fazer uma simulação". |
| Azul | `bkm-botao--azul` | Busca e navegação: "Buscar imóveis", "Simule seu financiamento". |
| Marinho / terracota / roxo | `--marinho`, `--terracota`, `--roxo` | "Conhecer o empreendimento" nos cards, alternando entre cards. |
| Verde-claro | `bkm-botao--verde` | Linha de produto sobre fundo azul ou foto ("Conhecer a linha MoreMais"). |
| Contorno | `bkm-botao--contorno` | Ação secundária ao lado da principal. Branco dentro de `bkm-sobre-escuro`. |
| Link | `bkm-botao--link` | "Saiba mais" discreto. |
| Principal | `bkm-botao--principal` | Segue o tema (`acao`). |

Faça: uma chamada terracota por topo; azul para buscar/navegar; variar cor só entre cards irmãos. Não faça: dois botões coloridos diferentes lado a lado (use colorido + contorno), texto abaixo de 16px, cores fora da lista.

```html
<a class="bkm-botao bkm-botao--terracota" href="#">Encontre seu novo lar <span class="bkm-botao__seta" aria-hidden="true"></span></a>
<a class="bkm-botao bkm-botao--azul" href="#">Buscar imóveis <span class="bkm-botao__seta" aria-hidden="true"></span></a>
<button class="bkm-botao bkm-botao--contorno">Entenda o programa</button>
```

### SectionTitle

- **Seção** (`bkm-secao`): símbolo casa pequeno + título Aptos Light 32px + fio + apoio opcional. A **última palavra** em `<span class="bkm-manuscrito">`. Uma palavra em azul, sem manuscrita, vai em `<em>`.
- **Capítulo** (`bkm-capitulo`): bloco centralizado, palavra-chave em manuscrita maior, subtítulo e grafismo D em linha saindo pela direita. Variações: `--branco`, `--verde-claro`, `--pessego`, `--marinho`.

```html
<div class="bkm-secao">
  <div class="bkm-secao__linha">
    <span class="bkm-marca" aria-hidden="true"></span>
    <h2 class="bkm-secao__titulo">Projetos para diferentes <span class="bkm-manuscrito">começos.</span></h2>
  </div>
  <hr class="bkm-secao__fio">
  <p class="bkm-secao__apoio">Cada decisão importa quando o sonho é ter um lugar seu.</p>
</div>

<section class="bkm-capitulo">
  <h2 class="bkm-capitulo__titulo">Genial como seu jeito de <span class="bkm-manuscrito">viver</span></h2>
  <p class="bkm-capitulo__sub">Brand book</p>
</section>
```

### PhaseTag

Selo em pílula com a fase: Futuro lançamento, Lançamento, Em obras, Pronto. Todas no padrão; só a fase a promover usa `--destaque`. Um selo por card, no canto superior esquerdo da foto. Não dê uma cor por fase.

```html
<span class="bkm-fase">Em obras</span>
<span class="bkm-fase bkm-fase--destaque"><span class="bkm-marca" aria-hidden="true"></span>Lançamento</span>
```

### PropertyCard

Card de empreendimento: foto 4:3, selo de fase, linha do produto, nome (complemento em peso leve), localização e um botão colorido. Card inteiro clicável, uma ação só, sem sombra, sem preço em letras miúdas.

```html
<a class="bkm-card" href="#">
  <div class="bkm-card__midia">
    <img src="foto.jpg" alt="Família na varanda do apartamento">
    <span class="bkm-fase bkm-fase--destaque"><span class="bkm-marca" aria-hidden="true"></span>Lançamento</span>
  </div>
  <div class="bkm-card__corpo">
    <p class="bkm-card__linha">Linha MoreMais</p>
    <h3 class="bkm-card__nome">Moremais <span>Vila Carrão</span></h3>
    <p class="bkm-card__local"><img src="icones/localizacao.svg" alt="">São Paulo, SP</p>
    <span class="bkm-botao bkm-botao--marinho bkm-card__acao">Conhecer o empreendimento <span class="bkm-botao__seta" aria-hidden="true"></span></span>
  </div>
</a>
```

### CheckList

Frases curtas ou benefícios, cada uma numa caixa com a seta BKM. De três a seis itens, uma linha cada. Sem marcador verde de "check".

```html
<ul class="bkm-lista">
  <li><span class="bkm-marca bkm-marca--seta" aria-hidden="true"></span>Ao seu lado, em cada passo da sua conquista.</li>
  <li><span class="bkm-marca bkm-marca--seta" aria-hidden="true"></span>Tudo mais perto de você.</li>
</ul>
```

### StatBlock

Números de destaque com traço azul acima. De dois a quatro números, dados reais e verificáveis ("menos promessas, mais evidência").

```html
<div class="bkm-numeros">
  <!-- Valores de exemplo: substitua por dados reais da BKM -->
  <div class="bkm-numero"><span class="bkm-numero__valor">00<small>mil</small></span><span class="bkm-numero__rotulo">[métrica 1]</span></div>
  <div class="bkm-numero"><span class="bkm-numero__valor">00</span><span class="bkm-numero__rotulo">[métrica 2]</span></div>
</div>
```

### Forma suave

`bkm-forma` (+ `--rosa` ou `--verde`) põe o símbolo casa em pêssego ou verde-claro, translúcido, atrás de qualquer bloco. Ajuste com `--forma-tamanho`, `--forma-x`, `--forma-y`. Uma por tela no máximo; nunca em apps.

### CSS completo dos componentes

```css
/* BKM — componentes em CSS puro. Lê as variáveis da seção 7. */
:root {
  --bkm-mask-seta-fina: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M4 12h15M13 6l6 6-6 6%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E");
  --bkm-mask-d-linha: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200.000 193.903%22%3E%3Cpath d=%22M47.038 193.903 L47.038 0.005 L26.478 0.005 C11.854 0.005 0 11.849 0 26.461 L0 167.427 C0 175.131 3.301 182.068 8.558 186.897 C8.797 187.119 9.038 187.331 9.28 187.544 C13.906 191.514 19.928 193.903 26.504 193.903 L47.038 193.903 M123.243 180.884 L159.445 141.533 L200 96.954 L123.243 13.021 C115.603 4.71 104.965 0 93.835 0 L47.038 0 L136.042 96.954 L47.038 193.903 L93.835 193.903 C104.965 193.903 115.603 189.193 123.243 180.884%22 fill=%22none%22 stroke=%22%23000%22 stroke-width=%221.5%22 vector-effect=%22non-scaling-stroke%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E");
  --bkm-mask-casa: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 185.959 200.000%22%3E%3Cpath d=%22M185.942 173.768 L185.942 163.819 L185.942 149.34 L0.01 149.34 L0.01 163.819 L0.01 173.768 C0.01 188.231 10.602 200 23.618 200 L32.572 200 L153.38 200 L162.334 200 C175.35 200 185.942 188.231 185.942 173.768%22 fill=%22%23000%22/%3E%3Cpath d=%22M92.991 62.504 L91.606 63.798 L30.864 120.559 L0.01 150.693 L0.01 105.255 L0.017 105.255 C0 94.355 2.714 85.167 12.365 75.462 L92.702 0 L125.52 30.581 L173.594 75.462 C183.244 85.167 185.959 94.355 185.942 105.255 L185.942 150.693 L155.095 120.559 L94.353 63.798 L92.968 62.504%22 fill=%22%23000%22/%3E%3C/svg%3E");
  --bkm-mask-d: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200.000 185.959%22%3E%3Cpath d=%22M26.232 185.942 L36.181 185.942 L50.66 185.942 L50.66 0.01 L36.181 0.01 L26.232 0.01 C11.769 0.01 0 10.602 0 23.618 L0 32.572 L0 153.38 L0 162.334 C0 175.35 11.769 185.942 26.232 185.942%22 fill=%22%23000%22/%3E%3Cpath d=%22M137.496 92.991 L136.202 91.606 L79.441 30.864 L49.307 0.01 L94.745 0.01 L94.745 0.017 C105.645 0 114.833 2.714 124.538 12.365 L200 92.702 L169.419 125.52 L124.538 173.594 C114.833 183.244 105.645 185.959 94.745 185.942 L49.307 185.942 L79.441 155.095 L136.202 94.353 L137.496 92.968%22 fill=%22%23000%22/%3E%3C/svg%3E");
  --bkm-mask-seta: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 157.772 200.000%22%3E%3Cpath d=%22M78.601 186.573 L115.941 145.984 L157.772 100.003 L78.601 13.43 C70.721 4.858 59.747 0 48.268 0 L0 0 L91.803 100.003 L0 200 L48.268 200 C59.747 200 70.721 195.143 78.601 186.573%22 fill=%22%23000%22/%3E%3C/svg%3E");
}

/* Base */
.bkm { font-family: var(--font-aptos); color: var(--texto); background: var(--superficie); }
.bkm-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.bkm-marca { display: inline-block; flex: none; background: var(--destaque); -webkit-mask: var(--bkm-mask-casa) center / contain no-repeat; mask: var(--bkm-mask-casa) center / contain no-repeat; }
.bkm-marca--d { -webkit-mask-image: var(--bkm-mask-d); mask-image: var(--bkm-mask-d); }
.bkm-marca--seta { -webkit-mask-image: var(--bkm-mask-seta); mask-image: var(--bkm-mask-seta); }

/* Manuscrita */
.bkm-manuscrito { font-family: var(--font-manuscrita); font-weight: 400; font-style: normal; font-size: 1.6em; line-height: 1; letter-spacing: 0; color: var(--texto-manuscrito); }
.bkm-manuscrito--azul { color: var(--azul-site); }
.bkm-manuscrito--verde { color: var(--verde-salvia); }
.bkm-manuscrito--pessego { color: var(--pessego); }
.bkm-manuscrito--roxo { color: var(--roxo); }
.bkm-sobre-escuro .bkm-manuscrito { color: var(--pessego); }

/* Button */
.bkm-botao {
  --botao-fundo: var(--acao); --botao-texto: var(--sobre-acao); --botao-borda: transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--espaco-3);
  min-height: 48px; padding: 0 var(--espaco-6);
  background: var(--botao-fundo); color: var(--botao-texto); border: 1px solid var(--botao-borda); border-radius: var(--raio-botao);
  font-family: var(--font-aptos); font-size: 16px; line-height: 20px; font-weight: 400;
  text-decoration: none; cursor: pointer; transition: filter .15s ease, background-color .15s ease, color .15s ease;
}
.bkm-botao:hover { filter: brightness(.92); }
.bkm-botao:focus-visible { outline: 2px solid var(--foco); outline-offset: 2px; }
.bkm-botao__seta { width: 18px; height: 18px; flex: none; background: currentColor; -webkit-mask: var(--bkm-mask-seta-fina) center / contain no-repeat; mask: var(--bkm-mask-seta-fina) center / contain no-repeat; }
.bkm-botao--principal { --botao-fundo: var(--acao); --botao-texto: var(--sobre-acao); }
.bkm-botao--marinho { --botao-fundo: var(--marinho); --botao-texto: var(--branco); }
.bkm-botao--azul { --botao-fundo: var(--azul-site); --botao-texto: var(--branco); }
.bkm-botao--terracota { --botao-fundo: var(--terracota); --botao-texto: var(--branco); }
.bkm-botao--roxo { --botao-fundo: var(--roxo); --botao-texto: var(--branco); }
[data-theme="marinho"] .bkm-botao--marinho, .bkm-sobre-escuro .bkm-botao--marinho { --botao-fundo: var(--branco); --botao-texto: var(--marinho); }
.bkm-botao--verde { --botao-fundo: var(--verde-claro); --botao-texto: var(--marinho); }
.bkm-botao--secundario, .bkm-botao--contorno { --botao-fundo: transparent; --botao-texto: var(--texto); --botao-borda: var(--borda-controle); }
.bkm-sobre-escuro .bkm-botao--contorno, [data-theme="marinho"] .bkm-botao--contorno { --botao-texto: var(--branco); --botao-borda: var(--branco); }
.bkm-botao--secundario:hover, .bkm-botao--contorno:hover { filter: none; background: rgba(255,255,255,.08); }
.bkm-botao--link { --botao-fundo: transparent; --botao-texto: var(--texto-destaque); padding-left: 0; padding-right: 0; min-height: 0; }
.bkm-botao--link:hover { filter: none; text-decoration: underline; text-underline-offset: 4px; }
.bkm-sobre-escuro .bkm-botao--link { --botao-texto: var(--branco); }
.bkm-botao[disabled], .bkm-botao[aria-disabled="true"] { opacity: .45; cursor: not-allowed; filter: none; }
.bkm-sobre-escuro { background: var(--marinho); color: var(--branco); }

/* SectionTitle */
.bkm-secao { display: flex; flex-direction: column; gap: var(--espaco-3); max-width: 640px; }
.bkm-secao__linha { display: flex; align-items: center; gap: var(--espaco-3); }
.bkm-secao__linha .bkm-marca { width: 18px; height: 19px; }
.bkm-secao__titulo { margin: 0; font-family: var(--font-aptos); font-size: 32px; line-height: 40px; font-weight: 300; color: var(--texto); }
.bkm-secao__titulo em { font-style: normal; color: var(--texto-destaque); }
.bkm-secao__titulo .bkm-manuscrito { font-size: 1.65em; vertical-align: -0.08em; }
.bkm-secao__subtitulo { margin: var(--espaco-2) 0 0 30px; font-family: var(--font-manuscrita); font-size: 30px; line-height: 34px; color: var(--texto-manuscrito); }
.bkm-secao__fio { height: 1px; width: 220px; background: var(--texto); border: 0; margin: 0 0 0 30px; }
.bkm-secao__apoio { margin: 0 0 0 30px; font-size: 16px; line-height: 24px; color: var(--texto-suave); }
.bkm-capitulo {
  --cap-fundo: var(--fundo-marca); --cap-titulo: var(--sobre-fundo-marca); --cap-manuscrito: var(--manuscrito-sobre-marca); --cap-linha: var(--azul-bkm);
  position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  min-height: 280px; padding: var(--espaco-16) var(--espaco-8); background: var(--cap-fundo); color: var(--cap-titulo); border-radius: var(--raio-xl);
}
.bkm-capitulo::after { content: ""; position: absolute; right: -14%; top: 50%; height: 72%; aspect-ratio: 200 / 194; transform: translateY(-50%); background: var(--cap-linha); opacity: .45; -webkit-mask: var(--bkm-mask-d-linha) center / contain no-repeat; mask: var(--bkm-mask-d-linha) center / contain no-repeat; pointer-events: none; }
[data-theme="marinho"] .bkm-capitulo { border: 1px solid var(--linha); }
.bkm-capitulo__titulo { position: relative; z-index: 1; margin: 0; font-family: var(--font-aptos); font-size: 36px; line-height: 40px; font-weight: 300; }
.bkm-capitulo__titulo .bkm-manuscrito { display: block; font-size: 2.1em; line-height: 1.05; color: var(--cap-manuscrito); }
.bkm-capitulo__sub { position: relative; z-index: 1; margin: var(--espaco-3) 0 0; font-size: 24px; line-height: 30px; font-weight: 300; }
.bkm-capitulo--branco { --cap-fundo: var(--branco); --cap-titulo: var(--marinho); --cap-manuscrito: var(--roxo); --cap-linha: var(--azul-bkm); border: 1px solid var(--cinza-claro); }
.bkm-capitulo--marinho { --cap-fundo: var(--marinho); --cap-titulo: var(--branco); --cap-manuscrito: var(--pessego); --cap-linha: var(--azul-bkm); }
.bkm-capitulo--pessego { --cap-fundo: var(--pessego); --cap-titulo: var(--marinho); --cap-manuscrito: var(--marinho); --cap-linha: var(--branco); }
.bkm-capitulo--verde-claro { --cap-fundo: var(--verde-claro); --cap-titulo: var(--marinho); --cap-manuscrito: var(--roxo); --cap-linha: var(--verde-salvia); }

/* PhaseTag */
.bkm-fase {
  display: inline-flex; align-items: center; gap: var(--espaco-1);
  padding: var(--espaco-1) var(--espaco-3); border-radius: var(--raio-pilula);
  background: var(--superficie); color: var(--texto); border: 1px solid var(--borda-controle);
  font-family: var(--font-aptos); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
}
.bkm-fase .bkm-marca { width: 8px; height: 10px; }
.bkm-fase--destaque { background: var(--acao); color: var(--sobre-acao); border-color: var(--acao); }
.bkm-fase--destaque .bkm-marca { background: var(--sobre-acao); }
[data-theme="claro-azul"] .bkm-fase--destaque { background: var(--superficie); color: var(--texto-destaque); border-color: var(--azul-bkm); }
[data-theme="claro-azul"] .bkm-fase--destaque .bkm-marca { background: var(--azul-bkm); }

/* PropertyCard */
.bkm-card {
  display: flex; flex-direction: column; width: 100%; max-width: 360px; overflow: hidden;
  background: var(--superficie-elevada); border-radius: var(--raio-lg); color: var(--texto);
  text-decoration: none;
}
.bkm-card__midia { position: relative; aspect-ratio: 4 / 3; background: var(--fundo-marca); overflow: hidden; }
.bkm-card__midia img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bkm-card__midia .bkm-fase { position: absolute; top: var(--espaco-4); left: var(--espaco-4); }
.bkm-card__corpo { display: flex; flex-direction: column; gap: var(--espaco-2); padding: var(--espaco-6); }
.bkm-card__linha { margin: 0; font-size: 12px; line-height: 16px; letter-spacing: .25em; text-transform: uppercase; color: var(--texto-suave); }
.bkm-card__nome { margin: 0; font-size: 22px; line-height: 28px; font-weight: 600; }
.bkm-card__nome span { font-weight: 300; }
.bkm-card__local { display: flex; align-items: center; gap: var(--espaco-2); margin: 0; font-size: 14px; line-height: 20px; color: var(--texto-suave); }
.bkm-card__local img { width: 20px; height: 20px; }
.bkm-card__acao { margin-top: var(--espaco-2); align-self: flex-start; }
[data-theme="marinho"] .bkm-card { border: 1px solid var(--linha); }
.bkm-card:focus-visible { outline: 2px solid var(--foco); outline-offset: 2px; }

/* CheckList */
.bkm-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--espaco-3); max-width: 520px; }
.bkm-lista li { display: flex; align-items: center; gap: var(--espaco-3); padding: var(--espaco-2) var(--espaco-4); background: var(--superficie-elevada); border-radius: var(--raio-md); font-size: 14px; line-height: 20px; color: var(--texto); }
.bkm-lista li .bkm-marca { width: 10px; height: 13px; }

/* StatBlock */
.bkm-numeros { display: flex; flex-wrap: wrap; gap: var(--espaco-8); }
.bkm-numero { --numero-cor: var(--azul-bkm); display: flex; flex-direction: column; gap: var(--espaco-1); min-width: 140px; }
.bkm-numero::before { content: ""; width: 24px; height: 2px; margin-bottom: var(--espaco-3); background: var(--numero-cor); }
.bkm-numero__valor { font-family: var(--font-aptos); font-size: 48px; line-height: 52px; font-weight: 600; color: var(--texto); }
.bkm-numero__valor small { font-size: .5em; line-height: 1; font-weight: 400; margin-left: 2px; }
.bkm-numero__rotulo { font-size: 14px; line-height: 20px; color: var(--texto); }

/* Forma suave */
.bkm-forma { position: relative; isolation: isolate; }
.bkm-forma::before { content: ""; position: absolute; z-index: -1; width: var(--forma-tamanho, 280px); aspect-ratio: 186 / 200; right: var(--forma-x, -40px); top: var(--forma-y, -40px); background: var(--forma-cor, var(--pessego)); opacity: .55; -webkit-mask: var(--bkm-mask-casa) center / contain no-repeat; mask: var(--bkm-mask-casa) center / contain no-repeat; pointer-events: none; }
.bkm-forma--verde { --forma-cor: var(--verde-claro); }
.bkm-forma--rosa { --forma-cor: var(--pessego); }
[data-theme="marinho"] .bkm-forma::before { opacity: .12; }
```

---

## 9. Pendências conhecidas

- **Contraste:** `azul-bkm` (#0094fe) sobre branco dá 3,15:1 — não serve para texto. Botões do site com texto branco sobre `azul-site` (3,04:1) e `terracota` (3,51:1) ficam abaixo de 4,5:1; mantidos porque é o que o site usa. Correção simples: texto 18px negrito nesses botões.
- **Gradiente:** os valores foram amostrados da arte do logo; o manual não publica valores oficiais.
- **Aptos** não está no Google Fonts; em web/app sem o arquivo da fonte, cai para Segoe UI / fonte do sistema.
- Duas versões de logo (K branco com letras pretas e K preto com letras brancas) não aparecem no manual; confirmar com o time de marca antes de usar.
- O manual não define componentes de interface: espaçamentos, raios e componentes são derivados do manual, do template e do site.
- Aplicativos ainda não têm classes CSS prontas; aplique os tokens `app-*` e `app-escuro-*` sobre a estrutura Material 3.
