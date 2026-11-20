# Revisão dos cards de palavras raras

Você revisa, e corrige, o conteúdo de cards escritos por outro agente seguindo
`/home/geremias/.cache/raras-2011/BRIEF.md` (leia-o primeiro: as regras são as de lá). O público:
brasileiros adultos que já falam português e querem aprender as palavras raras de *Vidas Secas* e
*Dom Casmurro*.

Seus arquivos (só estes; não leia nem mexa em outros):
- entrada: `lotes/saida-N.jsonl` e `lotes/lote-N.json` (o lote original, com as frases de outras
  obras), para cada N que o pedido lhe der, na pasta `/home/geremias/.cache/raras-2011/`;
- problemas que um script já achou: `dados/problemas.json` (chaves «saida-N.jsonl obra|lema»);
- saída: `lotes/revisada-N.jsonl` — **todas** as linhas do `saida-N.jsonl`, na mesma ordem, já
  corrigidas (a linha sem defeito vai igual) — e `lotes/mudancas-N.txt`, uma linha por mudança
  («lema: o que mudou e por quê»). Grave o `revisada-N.jsonl` ao fim de cada N, não só no fim.

Para cada palavra, confira e corrija:
1. **Os problemas do script** daquela palavra. «não está no MorphoBr» quer dizer que a palavra pode
   não existir: troque por uma palavra real que você tenha certeza de que existe (com acento
   certo); se ela existe mesmo (composto, como «papa-capim»), pode ficar. «certa longa/curta»:
   reescreva as erradas (ou encurte a certa, sem mudar o sentido) até ficarem no máximo uma
   palavra além da maior e uma aquém da menor.
2. **As erradas do sentido** (`distratores`): nenhuma pode ser sentido verdadeiro da palavra **que
   sirva na frase do livro** (`frase_do_livro` no lote). O sentido moderno, que é errado na frase do
   livro, é bom distrator e fica (quarto = «cômodo da casa onde se dorme», quando a frase fala do
   quadril). Nenhuma absurda; nenhuma que se descarte sem saber a palavra; as quatro não dividem um
   assunto que a certa não tem.
3. **A certa** (`pt`) diz o sentido do livro, curta, sem «no livro».
4. **A marca** viva/leitura (regras do brief). Se trocar de leitura para viva, escreva `escrever`
   e `uso` (uso só com frase da lista do lote, letra por letra); de viva para leitura, apague os
   dois.
5. **`escrever`** (só viva): a pergunta tem de levar a **essa** palavra. Acrescente o campo
   **`"sinonimos"`**: a lista das palavras comuns que também respondem à pergunta (lombo →
   «dorso», «costas»; xadrez → «cadeia», «prisão», «cana»; cangote → «nuca»). Quem escrever uma
   delas vai ver «certo, mas não é a palavra do card», com a primeira letra da certa. Tire dessas
   listas das `aceitas` (as `aceitas` são só as formas da própria palavra: feminino, plural). As
   quatro erradas da múltipla escolha: palavras reais, da mesma classe e forma, que **não**
   respondam à pergunta (nem sejam sinônimos dela).
6. **`uso`**: a frase está no **mesmo sentido** do card? É, letra por letra, uma das do lote, com
   `___`? As quatro erradas não cabem na frase, e só a certa cabe bem? Se a frase não serve,
   `"uso": null`.
7. **A nota**: correta, curta, sem mesóclise, sem etimologia duvidosa.
8. **Nada chulo**: se a palavra ou o card tem duplo sentido sexual ou escatológico no Brasil, ponha
   `"excluir": true` na linha (o card sai do curso) e diga por quê nas mudanças. (Já se sabe:
   «boceta», em *Dom Casmurro* a caixinha de rapé, sai.)

No fim, responda só com: quantas linhas mudou em cada N, quantas trocou de marca, e as dúvidas que
ficaram (uma linha cada).
