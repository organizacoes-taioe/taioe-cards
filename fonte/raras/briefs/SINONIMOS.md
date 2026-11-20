# Cards de sinônimos (palavras raras do português)

Curso de cards para **brasileiros adultos que já falam português** aprenderem palavras raras de
*Vidas Secas* e *Dom Casmurro*. Você escreve o card de **sinônimos**: uma frase **real**, com uma
lacuna, e de 3 a 4 palavras de sentido próximo; só uma cabe bem. Cada conjunto tem de 2 a 4 cards,
todos com as mesmas alternativas, cada card com a sua frase e a sua certa. O que se ensina é a
**nuance** entre sinônimos próximos (registro, intensidade, com o que a palavra anda, sentido
físico × figurado).

Entrada: `/home/geremias/.cache/raras-2011/dados/vivas.json` (as 101 palavras ainda vivas do curso,
com o sentido). Ferramenta para achar frases reais (originais em português, em domínio público):

```
python3 -I /home/geremias/.cache/raras-2011/cards/fonte/raras/buscar.py /home/geremias/.cache/raras-2011/dados/corpus-obras.json <forma> [<forma>…] --max 8
```

(a forma exata: «lânguido», «lânguida», «lassos»; uma linha por frase, com [autor | título | ano]).

Saída: `/home/geremias/.cache/raras-2011/sinonimos.json`, uma lista; grave a cada conjunto pronto
(reescreva o arquivo inteiro com o que já tem).

```json
[{"conjunto": "s01",
  "alternativas": ["lânguido", "lasso", "indolente"],
  "palavras_do_curso": ["lasso"],
  "cards": [
    {"resposta": "lânguido", "frase": "… com teu ___ abandono!", "autor": "castro-alves", "titulo": "Onde estás?", "ano": null},
    {"resposta": "lasso", "frase": "…", "autor": "…", "titulo": "…", "ano": 1945}
  ],
  "nota": "Os três falam de falta de força, cada um de um jeito.\nAs alternativas:\nlânguido — mole de langor, de doçura ou de desejo (olhar, voz, abandono).\nlasso — cansado, frouxo, sem tensão (membros, corda).\nindolente — sem vontade de agir, preguiçoso; diz-se da pessoa."}]
```

Regras:
1. **Uns 12 conjuntos**, cada um com **pelo menos uma palavra de `vivas.json`** (em
   `palavras_do_curso`, o `lema` exato de lá). As outras alternativas podem ser palavras comuns
   (o sinônimo corrente) ou raras, mas todas reais e vivas.
2. As alternativas são as mesmas em todos os cards do conjunto, então **uma forma só tem de servir
   a todas as frases**: escolha frases com a palavra na forma de dicionário (masculino singular,
   infinitivo) ou, se não der, todas na mesma forma (todas no plural, por exemplo), e escreva as
   alternativas nessa forma.
3. **Frase real, letra por letra**, de `buscar.py`, com a palavra trocada por `___` (três
   sublinhados). Pode cortar o começo ou o fim com «…» se passar de 25 palavras, sem mudar o resto.
   **Nunca invente frase.** Se não achar frase para uma alternativa ser a certa, ela pode ficar só
   como alternativa errada nos outros cards (mas o conjunto precisa de 2 a 4 cards).
4. Em cada frase, **só a certa cabe bem**: as outras soariam erradas, estranhas ou diriam outra
   coisa para um leitor culto. Se duas cabem, troque a frase ou o conjunto. Seja rigoroso: é aqui
   que o card falha.
5. A **nota** é a mesma para os cards do conjunto: uma frase de abertura, «As alternativas:» e uma
   linha por palavra, «palavra — o que a distingue», curta. Nunca mesóclise.
6. Nada chulo nem de duplo sentido.

No fim, responda só com quantos conjuntos e cards gravou e as dúvidas (uma linha cada).
