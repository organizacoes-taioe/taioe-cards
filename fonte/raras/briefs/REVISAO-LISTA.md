# Revisão dos cards do «Português» (palavras difíceis)

Você revisa, e corrige, cards escritos por outro agente seguindo
`/home/geremias/.cache/portugues-2711/BRIEF.md` (leia-o primeiro: as regras são as de lá). Público:
brasileiros adultos que já falam português.

Seus arquivos (só estes; não leia nem mexa em outros), na pasta `/home/geremias/.cache/portugues-2711/`:
- entrada: `lotes/saida-N.jsonl` e `lotes/lote-N.json` (o lote, com as frases reais), para cada N
  que o pedido lhe der; `problemas.json` (o que um script já achou; chaves «N|palavra»);
- saída: `lotes/revisada-N.jsonl` — **todas** as linhas do `saida-N.jsonl`, na mesma ordem, já
  corrigidas (a sem defeito vai igual) — e `lotes/mudancas-N.txt`, uma linha por mudança
  («palavra: o que mudou e por quê»). Grave o `revisada-N.jsonl` ao fim de cada N.

Para cada palavra, confira e corrija:

1. **Ortografia de hoje em toda frase** (a do `sentido` e a do `uso`). As frases do Gutenberg vêm
   quase sempre na ortografia antiga, e o agente nem sempre a atualizou: escandalisado →
   escandalizado, auctores → autores, legua → légua, ruido → ruído, azas → asas, dôr → dor,
   solemnes → solenes, n'uma → numa, á (crase) → à, elle → ele, Balthazar → Baltasar. Atualize
   **só a ortografia** (acentos, letras dobradas, ph, th, y, z/s), pela norma brasileira de hoje,
   sem trocar palavra, ordem nem pontuação, e marque `"grafia_atualizada": true`. A resposta do
   `uso` e o `forma` do `sentido` seguem a grafia nova.
2. **Título e autor**: o `titulo` sem volume, sem «(of 2)», sem subtítulo depois de «:», na
   ortografia de hoje («O Guarani», «Uma Família Inglesa», «Nervosos, Linfáticos e Sanguíneos»);
   o `autor` como está (o programa troca os ids da Biblioteca, como «machado-de-assis», pelo nome).
3. **Tradução**: frase de livro traduzido de outra língua (Antonio de Trueba, Júlio Verne, Dickens,
   a Bíblia…) só fica se não houver, no lote, frase boa de autor de língua portuguesa no mesmo
   sentido. Se houver, troque (copiando-a como manda o brief).
4. **O card de uso decide**: lida a frase inteira, só a certa pode caber. Se qualquer palavra da
   classe cabe («nota de ___», «um ar ___», «afronta e ___»), troque a frase por outra da lista em
   que o contexto decida, ou troque as erradas por palavras que o contexto exclui de verdade (o
   sentido contrário claro, outro campo), sem serem absurdas; se nada resolver, `"uso": null`.
5. **As erradas** (sentido, escrever, uso): plausíveis, nenhuma absurda nem óbvia demais
   («estrangeiro», «domingo»), nenhuma que seja sentido ou resposta verdadeira. No `escrever`,
   prefira palavras difíceis e parecidas na forma (lato → lauto, laxo, lasso). As do sentido: mesmo
   formato e tamanho da certa (os problemas «certa longa/curta» do script).
6. **Os problemas do script** da palavra. «não está no MorphoBr»: troque por palavra que você tenha
   certeza de que existe, ou deixe se for locução ou composto real (meio-dia, porquanto). «frase
   não é do lote»: confira letra por letra e corrija.
7. **A certa (`pt`) e a nota**: corretas, curtas; o `pt` no sentido da frase do `sentido`; nota sem
   mesóclise e sem citar a fonte.
8. **Nada chulo** nem de duplo sentido; nada ofensivo na frase.

Para conferir se uma palavra existe:
`grep -c -x "<palavra>" /home/geremias/.cache/portugues-2711/morphobr.txt` (1 = existe).

No fim, responda só com: quantas linhas mudou em cada N, quantos usos trocou ou apagou, e as
dúvidas que ficaram (uma linha cada).
