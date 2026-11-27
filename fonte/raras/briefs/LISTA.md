# Cards do curso «Português» (palavras difíceis) — instruções do lote

Você vai escrever o conteúdo de cards de estudo (app Taioé Cards) para **brasileiros adultos que já
falam português** e querem aprender palavras difíceis do português culto (anódino, dirimir,
celeuma, de chofre, sinédoque…). Tudo em português do Brasil. As palavras foram escolhidas pelo
dono do app, que quer aprendê-las: ele as conhece mal ou não as conhece.

Entrada: `/home/geremias/.cache/portugues-2711/lotes/lote-N.json`. Saída:
`/home/geremias/.cache/portugues-2711/lotes/saida-N.jsonl`, **uma linha JSON por palavra, gravada
logo que a palavra ficar pronta** (acrescente ao arquivo a cada palavra; nunca guarde tudo para o
fim). Se o arquivo já existir com linhas, continue de onde parou. Não leia outros arquivos do
projeto: tudo o que você precisa está aqui e no lote.

Cada item do lote traz: `p` (a palavra ou expressão, na forma de dicionário; verbo pronominal com
«-se»), `s` (um sentido curto, só uma pista: confira e escreva o seu), `grupo` (adj, verbo, subst,
adv = advérbios e locuções, conc = conceitos de filosofia, retórica, política e direito) e `frases`:
frases **reais** de obras em domínio público (Biblioteca Taioé, Projeto Gutenberg, Wikisource),
cada uma com `frase`, `forma` (a forma da palavra que aparece nela), `autor`, `titulo`, `ano` (pode
faltar) e `grafia_antiga` (true quando a frase está na ortografia de antes de 1943).

## O que escrever, por palavra

```json
{"p": "dirimir", "marca": "viva", "nivel": "C1",
 "pt": "resolver de vez (dúvida, conflito, questão)",
 "distratores": ["agravar aos poucos (dúvida, conflito, questão)", "...", "...", "..."],
 "nota": "Verbo culto, comum no direito: «dirimir dúvidas», «dirimir a controvérsia».",
 "sentido": {"frase": "… a frase real com a palavra …", "forma": "dirimiu",
             "autor": "Rui Barbosa", "titulo": "Oração aos Moços", "ano": 1921, "grafia_atualizada": false},
 "escrever": {"pergunta": "resolver de vez uma dúvida ou um conflito",
              "aceitas": [], "sinonimos": ["resolver", "solucionar"],
              "distratores": ["redimir", "dimanar", "deprimir", "dilapidar"]},
 "uso": {"frase": "… outra frase real com ___ no lugar da palavra …", "resposta": "dirimir",
         "autor": "…", "titulo": "…", "ano": null, "grafia_atualizada": false,
         "distratores": ["…", "…", "…", "…"], "nota": "…"}}
```

1. **`sentido`**: escolha, entre as `frases`, a **melhor** para o card «O que quer dizer a palavra
   destacada?»: a palavra no sentido que você vai ensinar, num contexto que se entende sozinho e
   que **não entrega a resposta** (nada de frase que define a palavra, como «A metonímia é a figura
   que…»; nada de frase em que a palavra vem logo explicada por um sinônimo). Copie a frase **sem
   mudar nenhuma palavra**; `forma` é a forma exata em que a palavra aparece nela. Se passar de 30
   palavras, corte o começo ou o fim com «…», sem mudar o resto. Toda frase em ortografia de antes
   de 1943 (o campo `grafia_antiga` nem sempre a marca: admittido, affeição, ninguem, elle) vai com
   a **ortografia atualizada, e só ela** (pharmacia → farmácia, elle → ele, hontem → ontem, acção →
   ação, êle → ele), sem trocar palavra nem pontuação, e marque `"grafia_atualizada": true`; prefira
   as frases que não precisam disso. Frase em Portugal (tu, vós, «estou a fazer») pode, se se
   entende. **Nunca invente frase**: só as da lista.
   Se **nenhuma** frase serve (todas em outro sentido, todas definem a palavra, todas truncadas ou
   confusas), grave só `{"p": "…", "sem_frase": true, "motivo": "…"}` e passe à seguinte.

2. **`pt`**: a resposta certa: a definição, curta (até umas 12 palavras), no sentido da frase do
   `sentido`. Com suas palavras (sem copiar Houaiss, Aulete, Michaelis, Priberam). Sem ponto final.

3. **`distratores`**: quatro definições **erradas** para a múltipla escolha, ao lado da certa:
   - **nenhuma pode ser um sentido verdadeiro da palavra**, nem raro: pense em todos os sentidos
     dela antes;
   - nenhuma pode servir na frase do `sentido` de um jeito que confunda quem sabe a palavra;
   - **mesmo formato** da certa: mesma classe (verbo → infinitivo; adjetivo → «que…», «de…»;
     substantivo → definição de coisa ou pessoa; locução → o mesmo tipo de expressão), mesmo
     registro, **tamanho parecido** (no máximo uma palavra a mais que a maior e uma a menos que a
     menor, contando a certa), o mesmo número de «;» e parênteses só se a certa tiver;
   - **plausíveis**, e é aqui que o card ensina: o sentido de uma palavra parecida (o parônimo:
     dirimir → o sentido de «redimir» ou de «deprimir»; ratificar → «corrigir»), o sentido que o
     senso comum dá por engano (lívido → só «pálido»), vizinhos do mesmo campo (outras figuras de
     linguagem, outros vícios). Nada absurdo, nada que se descarte sem saber a palavra;
   - as quatro não podem dividir um assunto que a certa não tem; todas diferentes entre si.

4. **`nota`**: até 2 frases curtas, lidas depois da resposta: classe e registro (culto, jurídico,
   literário, antigo), a regência ou a companhia típica, o par que confunde, ou a família da
   palavra. Sem repetir a definição. Sem etimologia duvidosa. **Nunca mesóclise** (nada de
   «far-se-á», «dir-se-ia»). Não cite a fonte da frase: o programa põe sozinho.

5. **`marca`** e **`nivel`**: `"viva"`/`"C1"` se ainda se usa hoje em texto culto (quase todas
   desta lista); `"leitura"`/`"C2"` só se é antiga ou de ofício e hoje só se lê (sesmaria). Palavra
   de leitura **só tem o card do sentido**: sem `escrever` nem `uso`.

6. Só para **viva**:
   - **`escrever`**: a pessoa vê a definição e escreve a palavra. `pergunta`: a definição, precisa
     o bastante para apontar **só para essa palavra**; `aceitas`: outras formas da própria palavra
     que valem (feminino, plural; na locução, a variante de grafia, como «à socapa» sem crase não);
     `sinonimos`: palavras **comuns** que também respondem à pergunta (quem as escrever vê «certo,
     mas não é a palavra do card»); `distratores`: quatro palavras **reais** e difíceis, parecidas
     na grafia, no som ou no campo, na mesma classe e forma, que **não** respondam à pergunta.
   - **`uso`**: uma frase **diferente** da do `sentido`, da lista, em que a palavra está **no mesmo
     sentido** e que mostre o uso (a regência, a companhia típica). Copie-a do mesmo jeito (só a
     ortografia pode ser atualizada, com `grafia_atualizada`), trocando a forma da palavra por
     `___` (três sublinhados); na locução, a locução inteira vira `___`. `resposta`: a forma exata
     que estava na lacuna. `distratores`: quatro palavras ou locuções reais, na mesma forma
     (classe, gênero, número; no verbo, tempo e pessoa), **plausíveis** (parecidas na forma ou do
     mesmo campo, nunca absurdas), que **não caibam** na frase: lida a frase inteira, só a certa
     fica boa. A frase em que qualquer palavra da classe cabe («um homem ___») não serve. `nota`:
     uma frase sobre o uso. Se não houver uma segunda frase boa, `"uso": null`.

7. **Nada chulo** nem de duplo sentido sexual ou escatológico no Brasil, na frase escolhida ou nas
   alternativas. Frase de conteúdo ofensivo (racista, por exemplo) não se escolhe.

Para conferir se uma palavra que você vai usar como errada existe:
`grep -c -x "<palavra>" /home/geremias/.cache/portugues-2711/morphobr.txt` (1 = existe; o
MorphoBr não tem locuções nem alguns compostos).

## Antes de gravar cada linha, confira
- O JSON é válido e tem todos os campos.
- A frase do `sentido` e a do `uso` são da lista, palavra por palavra, e diferentes entre si.
- Nenhum distrator do sentido é sentido verdadeiro da palavra; os cinco têm formato e tamanho
  parecidos.

No fim, responda só com: quantas palavras gravou, quantas sem frase, quantas com `uso`, e as que
você achou duvidosas (uma linha cada).
