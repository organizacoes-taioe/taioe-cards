# Português: as palavras difíceis, para quem fala português (`pc-pt`)

Até 27/11/2026 o curso se chamava «Palavras raras» e só tinha as palavras dos livros (§1–§5, o
piloto). Desde então: §6.

Pedido do Gere (20/11/2026): cards para aprender as palavras incomuns do português, para quem já
fala português, «como no latim», focados no significado e no modo de uso, com um card que compare
sinônimos. Contraproposta aprovada no mesmo dia com todas as recomendações, mais duas regras dele:
- «não precisamos dos textos inteiros para leitura, bastam os parágrafos com palavras a serem
  aprendidas»;
- «para as palavras cultas que não estão nos livros, sempre busque casos de uso reais».

## 1. As decisões

- D1. Por obra, como o latim: a pessoa escolhe de 1 a 3 obras da Biblioteca, e cada obra traz as
  suas palavras raras (o vocabulário já definido em `biblioteca/edicoes/vocabulario/`).
- D2. Palavras cultas de hoje fora dos livros: uma trilha própria, **depois do piloto**, sempre
  com frases reais de uso (regra dele).
- D3. Card de sinônimos: «qual cabe nesta frase?».
- D4. A escada das línguas vivas.
- D5. Piloto: *Vidas Secas* e *Dom Casmurro*. Ele estuda uma semana e aponta; depois, as outras
  obras.

## 2. O curso

- Baralho `pc` (o português culto), curso `pc-pt`, modo `trilhas` (só pelas obras, só a ida, sem
  nivelamento), escada `vivas`. Ids `pc-…`. O campo da pergunta é `pc`; a resposta, `pt`.
- Cada obra é dividida em partes (um capítulo, ou alguns, com 10 a 25 palavras), aprendidas em
  sequência, como a *Eneida*. A parte é só **os parágrafos em que as palavras dela aparecem pela
  primeira vez**, na ordem do livro (regra dele). O parágrafo aparece quando as palavras raras
  dele ficam reconhecidas; o toque na palavra abre a definição.
- Na Biblioteca, no fim de cada capítulo da obra: «Aprender as palavras raras deste livro».

## 3. Os cards

Toda palavra tem a marca **viva** (ainda se usa: lânguido, sobranceiro, azáfama) ou **de leitura**
(antiga, regional ou de ofício: aió, sege, alpercata). As de leitura só têm o card 1.

1. **Sentido** (`pc-p…`, tipo `palavra`, `escolher: true`): a frase do livro com a palavra
   destacada; «O que quer dizer a palavra destacada?»; cinco definições. Só de escolher; três
   acertos seguidos a dominam. As erradas: a leitura enganosa de hoje (quarto = cômodo), o sentido
   de um parônimo, vizinhos de campo; nenhuma pode ser sentido verdadeiro da palavra.
2. **Escrever** (`pc-e…`, tipo `frase`, só as vivas, `requer` a palavra): a definição →
   escrever a palavra. Primeiro escolher entre cinco palavras raras parecidas, depois escrever.
3. **Uso** (`pc-u…`, tipo `frase`, só as vivas, `requer` a palavra, `escolher: true`): uma frase
   **real** de outra obra em domínio público (o corpus é a Biblioteca, só os originais em
   português; nunca tradução nossa), com a palavra trocada por «___», e a fonte; escolher a
   palavra que cabe. A nota ensina a regência, a colocação e o registro.
4. **Sinônimos** (`pc-k…`, tipo `contraste`): um conjunto de 3 a 5 sinônimos próximos, cada card
   com uma frase real em que só um deles cabe bem; a nota diz a nuance de cada um. Sempre um em
   jogo, como os contrastes das outras línguas.

## 4. Como se faz

Tudo em `fonte/raras/` (no repositório), um script por passo:
1. `extrair.mjs`: lê o vocabulário e o texto da obra na Biblioteca e grava, por palavra, as formas,
   a definição, a frase da primeira ocorrência e o parágrafo; e as partes.
2. `corpus.py`: as frases dos originais em português da Biblioteca, com cada forma das palavras,
   para o card de uso e os sinônimos (só obras que não são tradução nossa).
3. Agentes de modelo leve, em lotes, escrevem a marca viva/de leitura, as erradas, a nota e
   escolhem a frase real; o principal lê card a card.
4. `montar.py`: grava os cards (`fonte/cards/pc/`) e os textos (`fonte/textos/pc/`).

## 5. Estado

- 2026-11-20: **piloto pronto** (branch `raras`): *Vidas Secas* (9 partes) e *Dom Casmurro* (6
  partes); 341 palavras (95 vivas com escrever, 70 com uso; 246 de leitura), 11 conjuntos de
  sinônimos com 30 cards. Fora do curso, por duplo sentido ou ofensa (manual §2): boceta, quenga,
  molestar, cocó, sarro, bicha. Sem frase de uso, porque a frase não decide: nascente, baio,
  alazão, cambaio, preá.
- Como foi feito (refazer para uma obra nova): `obra.mjs` (a obra e o corpus) → `palavras.py` →
  `corpus.py` → lotes de ~45 palavras para agentes Sonnet (`BRIEF.md`) → revisão por outros
  agentes (`REVISAO.md`, que gravam `revisada-N.jsonl`) → `verificar.py` → sinônimos (um agente,
  `SINONIMOS.md`, `buscar.py`) → `montar.py` → build. Os briefs estão em `fonte/raras/briefs/`, e os dados revisados (de onde o `montar.py` refaz os cards) em `fonte/raras/trabalho/`; o resto (lotes brutos, corpus), em
  `~/.cache/raras-2011/` (só no notebook). Lições: o agente põe erradas absurdas no card de uso
  («gasoso», «domingo»): pedir parônimos reais que não caibam; e frase de uso em que qualquer
  palavra da classe cabe («cavalo ___») não serve.
- Próximo: o Gere estuda uma semana e aponta. Depois, as outras obras em português da
  Biblioteca (128 arquivos de vocabulário) e a trilha das palavras cultas de hoje (D2), sempre
  com frases reais.

## 6. O «Português» (27/11/2026)

Pedido do Gere: «não estou gostando de ver apenas palavras muito raras. Tem muitas palavras
difíceis do português que eu não conheço ou não domino, que seriam mais importantes»; «O usuario
não vai precisar selecionar nenhum texto»; «Nos comentarios do card, sempre diga de qual texto
veio a frase de referência». Contraproposta aprovada com as recomendações.

- **Nome**: «Português» (o baralho segue `pc`).
- **Sem textos**: só a ida (modo `trilhas`), mas sem escolher obra; toda palavra pode estrear, na
  ordem do baralho (`app.js`: `RARAS`, `COM_TEXTOS`, `ORDEM_NO_BARALHO`); as frases de escrever e de
  uso vêm depois da palavra, como antes. As partes dos livros não vão mais ao app.
- **A fonte**: todo card com frase tem o campo `fonte`, que o app mostra no fim da nota
  («📖 Frase de …»).
- **A lista dele**: 946 palavras difíceis em 8 grupos (`../anexos/portugues-lista/`, fora do git),
  num link particular em que ele marcou as que quer aprender. Leva 1 = as 195 marcadas + o fim das
  listas de adjetivos, verbos e substantivos, onde ele parou «quando já estava clicando em tudo»
  (347). Expressões latinas, parônimos e sentidos esquecidos ficaram para outra rodada.
  Calibragem: ele conhece a faixa comum (kafkiano, lacônico, tergiversar, idôneo); as próximas
  levas podem trazer as que ele pulou, mas a 1ª foca nas que ele conhece pior.
- **Ordem da fila**: as marcadas antes, com os grupos em rodízio; depois o resto da leva; depois
  as dos livros.
- **Frases reais**: `lista.py` (Biblioteca, originais em português; depois o Gutenberg em
  português, `/mnt/arquivos/gutenberg/_Portuguese`, só no desktop) e `wikisource.py` (pt.wikisource,
  leis incluídas) para as que têm menos de 3. Ortografia antiga vai atualizada (só a ortografia),
  com «grafia atualizada» na fonte. Tradução só quando não há outra frase. Palavra sem frase real
  fica de fora (38 na leva 1: os termos de retórica, como zeugma e hipálage, quase todos).
- **Como se faz**: `lista.py` → `wikisource.py` → lotes de ~40 → agentes Sonnet
  (`briefs/LISTA.md`) → `verificar_lista.py` → revisão por outros agentes (`briefs/REVISAO-LISTA.md`,
  que gravam `revisada-N.jsonl`) → `montar.py`. Dados em `trabalho/lista/` (`leva-N.json`, os
  lotes e as revisadas, `ids.json` com os números fixos de cada palavra). Correção de card: na
  linha da palavra em `trabalho/lista/lotes/revisada-N.jsonl`, e montar de novo.
- **Leva 1** (27/11): 309 palavras, 304 cards de escrever e 269 de uso (`pc-p342` em diante),
  em `fonte/cards/pc/00-lista-*.json`.
