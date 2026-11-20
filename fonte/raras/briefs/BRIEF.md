# Cards de palavras raras do português — instruções do lote

Você vai escrever o conteúdo de cards de estudo (app Taioé Cards) para **brasileiros adultos que já
falam português** aprenderem palavras raras que aparecem em dois romances: *Vidas Secas* (Graciliano
Ramos, 1938) e *Dom Casmurro* (Machado de Assis, 1899). Tudo em português do Brasil.

Entrada: `~/.cache/raras-2011/lotes/lote-N.json` (lista de palavras). Saída:
`~/.cache/raras-2011/lotes/saida-N.jsonl`, **uma linha JSON por palavra, gravada logo que a palavra
ficar pronta** (acrescente ao arquivo a cada palavra, com Bash `>>` ou reescrevendo o arquivo
inteiro com a Write; nunca guarde tudo para o fim). Se o arquivo já existir com linhas, continue de
onde parou. Não leia outros arquivos do projeto: tudo o que você precisa está aqui e no lote.

Cada palavra do lote traz: `obra`, `lema`, `formas` (como aparecem no livro), `classe`, `def` (a
definição da Biblioteca, no sentido em que a palavra aparece no livro, já revisada),
`frase_do_livro` (a frase da 1ª ocorrência), `forma_no_livro` e `frases_de_outras_obras` (frases
REAIS de outras obras em domínio público, com autor e título; podem estar em outro sentido).

## O que escrever, por palavra

```json
{"obra": "vidas-secas", "lema": "cambaio", "marca": "viva",
 "pt": "de pernas tortas, que anda torto e desajeitado",
 "distratores": ["de olhos tortos, que enxerga mal e de lado", "...", "...", "..."],
 "nota": "Adjetivo. Diz-se de quem tem as pernas arqueadas e anda gingando. Corrente no Nordeste.",
 "escrever": {"pergunta": "de pernas tortas, que anda torto e desajeitado",
              "aceitas": ["cambaia", "cambaios", "cambaias"],
              "distratores": ["zambro", "trôpego", "corcunda", "manco"]},
 "uso": {"frase": "Longe, um negro ___ e beiçudo curtia fome, dormia no chão.",
         "resposta": "cambaio", "autor": "graciliano-ramos", "titulo": "Angústia", "ano": 1936,
         "distratores": ["calvo", "risonho", "faminto", "franzino"],
         "nota": "..."}}
```

1. **`marca`**: `"viva"` se um brasileiro culto de hoje ainda usa a palavra, **nesse sentido**, ao
   falar ou escrever (lânguido, sobranceiro, azáfama, seixo, cangote, alcova, caixeiro); `"leitura"`
   se ela é antiga, de ofício que acabou, regional restrita, ou é palavra comum num sentido antigo
   que hoje se lê errado (aió, sege, alpercata, pederneira; quarto = quadril; amo = patrão). Na
   dúvida, `"leitura"`. Palavra de leitura **só tem o card do sentido**: sem `escrever` nem `uso`.

2. **`pt`**: a resposta certa do card do sentido: a definição, curta (até umas 14 palavras), no
   sentido do livro. Parta da `def` da Biblioteca; tire o que for comentário («no livro, …») e
   encurte se precisar, sem mudar o sentido. Sem ponto final. Sem copiar Houaiss, Aulete, Michaelis
   ou Priberam (escreva com suas palavras).

3. **`distratores`**: quatro definições **erradas**, que vão aparecer ao lado da certa na múltipla
   escolha («O que quer dizer a palavra destacada?», com a frase do livro). Regras (são as que mais
   dão defeito):
   - **nenhuma pode ser um sentido verdadeiro da palavra**, nem raro, nem regional, nem antigo:
     pense em todos os sentidos que a palavra tem no dicionário antes de escrever;
   - **nenhuma pode servir na frase do livro** de um jeito que confunda quem sabe a palavra;
   - **mesmo formato** da certa: mesma classe (substantivo → «a/o …» ou definição de coisa; verbo →
     infinitivo; adjetivo → «que…», «de…»), mesmo registro, e **tamanho parecido: no máximo uma
     palavra a mais que a maior e uma a menos que a menor** (contando a certa); o mesmo número de
     «;» e de «/», e parêntese só se a certa tiver;
   - **plausíveis**: as armadilhas boas são o sentido de uma palavra parecida (parônimo: «cambito»
     → o sentido de «cambota»), o sentido moderno enganoso (quarto → «cômodo da casa onde se dorme»,
     quando a certa é «quadril»), e vizinhos do mesmo campo (outras peças de arreio, outras
     doenças). Nada absurdo, nada que se descarte sem saber a palavra;
   - as quatro não podem dividir um assunto que a certa não tem (tampando a palavra, ninguém pode
     apontar a diferente);
   - cada uma diferente das outras, em português correto.

4. **`nota`**: o que se lê depois de responder, até 2 frases curtas: a classe e o registro
   (regionalismo do sertão nordestino, antigo, de ofício, literário), e o que ajuda a lembrar
   (o par que confunde, a família da palavra). Para a de leitura, onde e quando se usava. Sem
   repetir a definição. Sem etimologia duvidosa. Nunca mesóclise (nada de «far-se-á», «dir-se-ia»).

5. **`nivel`**: `"C1"` para viva, `"C2"` para leitura.

6. Só para **viva**:
   - **`escrever`**: o card em que a pessoa vê a definição e escreve a palavra. `pergunta`: a
     definição (pode ser igual ao `pt`), que precisa apontar **só para essa palavra** (se um
     sinônimo comum também cabe, deixe a definição mais precisa); `aceitas`: as outras formas que
     valem como resposta (feminino, plural; no verbo, nada além do infinitivo); `distratores`:
     quatro palavras raras **reais** e parecidas (na grafia, no som ou no campo), na mesma forma
     (classe, gênero, número) do lema, que **não** correspondam à definição (vão na múltipla
     escolha antes de a pessoa escrever).
   - **`uso`**: escolha, entre `frases_de_outras_obras`, **uma** frase em que a palavra está **no
     mesmo sentido** e que mostre bem o uso (a regência, a companhia típica). Copie a frase **sem
     mudar nenhuma letra**, só trocando a forma da palavra por `___` (três sublinhados); se a frase
     for longa (mais de 25 palavras), corte o começo ou o fim com «…» sem mudar o resto.
     `resposta`: a forma exata que estava na lacuna; `autor`, `titulo`, `ano`: copie da frase
     escolhida; `distratores`: quatro palavras da mesma classe e forma da resposta (gênero, número,
     tempo e pessoa do verbo) que **não caibam** na frase (com o sentido da frase, só a certa fica
     boa); `nota`: uma frase sobre o uso (a preposição que pede, com que palavras costuma andar, o
     registro). Se **nenhuma** frase serve (outro sentido, ou nenhuma frase), ponha `"uso": null`.
     **Nunca invente frase**: só frases da lista.

## Antes de gravar cada linha, confira
- O JSON é válido e tem todos os campos.
- Nenhum distrator é sentido verdadeiro da palavra; os cinco têm formato e tamanho parecidos.
- Na de uso, a frase é a da lista, letra por letra, com `___` no lugar da forma.

No fim, responda só com: quantas palavras gravou, quantas viva e quantas leitura, quantas com `uso`,
e as que você achou duvidosas (uma linha cada).
