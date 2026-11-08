# O curso de italiano (`it-pt`)

Pedido do Gere em 2026-11-08: cards de italiano **só para quem fala português**, com a lista do teste
de vocabulário, alguns textos simples (poesia e prosa) e, desde o mesmo dia, os conceitos de
gramática no modelo do piloto do espanhol (manual §21). A contraproposta foi aprovada como estava
(«Aprovo, faça tudo»).

## 1. Decisões

| | decisão |
|---|---|
| I1 | Um baralho `fonte/cards/it`, ids `it-…`, um público só (`pt`): o card traz `it`, o quarteto português (`pt`/`aceitas`/`distratores`/`nota`) e, quando houver, `aceitasIt`, `sinonimosIt`, `regionaisIt`, `formasIt` (rótulo em português). Nada de `es`/`en`. |
| I2 | O italiano padrão, sem formas regionais no card (a variante corrente do Norte ou do Sul vai na nota, ou em `regionaisIt` com o lugar: «no Norte da Itália», «na Toscana», «na Suíça»). O tratamento normal é *tu*; o *Lei* nas frases formais (loja, hotel, médico). |
| I3 | O modo de sempre (`livre`): ida e volta, nivelamento pela lista, transparentes, presumidos, desafio, contraste, gramática. O sistema é igual em todas as línguas. |
| I4 | O funil do italiano (`js/motor.js`): o acento cai, como no francês («è» = «e», «perché» = «perche»); o artigo da frente cai, também o elidido (`l'`, `un'`); o pronome-sujeito cai só quando abre a resposta («io non lo so» = «non lo so»), porque «lui», «lei» e «loro» também vêm depois de preposição; plural e singular **não** se igualam (o «-i» e o «-e» são também terminação de verbo). |
| I5 | Lista do teste: `fonte/frequencia/it.tsv`, pela lista **Kelly** do italiano (níveis do QECR, CC BY-NC-SA 2.0) cruzada com as legendas (OpenSubtitles 2018) e curada por trechos (`brutos/CURADORIA-it.md`). |
| I6 | Uns 1.300 cards na primeira versão, pelo ciclo do manual §18: 40 primeiros passos, ~450 palavras (o A1 inteiro do começo da lista e palavras espaçadas de A2 a C1, para o nivelamento), as frases de uso de cada palavra, ~100 de conjugação, as palavras que as frases pedirem, os textos. |
| I7 | Falsos amigos com cuidado redobrado: o italiano é quase todo transparente para o brasileiro, e falso amigo sem a etiqueta vira palavra «já sabida» sem a pessoa saber (`burro`, `salire`, `guardare`, `caldo`, `cena`, `palestra`, `tirare`, `stanza`, `fermare`, `squisito`…). |
| I8 | Conjugação: presente, *passato prossimo* (com *essere* e *avere*), *imperfetto*, futuro, condicional, imperativo, *congiuntivo* presente e imperfeito, e o *passato remoto*, que os textos usam desde a primeira linha. |
| I9 | Contrastes para brasileiros (~30 cards, `publicos: ["pt"]`, manual §20). |
| I10 | Conceitos de gramática (~25, manual §21), com as famílias `tempo`, `ausiliare` (*essere* × *avere*), `pronome`, `di-da` e `articolo` (*lo* × *il*, *l'*). Um em jogo por vez, como no espanhol. |
| I11 | Textos, todos em domínio público e na Biblioteca com nota em cada palavra (do it.wiktionary): na fila automática Carducci, *Pianto antico* → Pascoli, *Novembre* → Leopardi, *L'infinito*; por escolha Carducci, *San Martino*, e o começo do *Pinocchio* (cap. I, em três partes, até «Non mi picchiar tanto forte!»). |

## 2. Os ids

`it-b` primeiros passos · `it-p` palavra · `it-u` frase de uso · `it-v` conjugação · `it-k` contraste ·
`it-g` conceito de gramática.

## 3. Etapas

| etapa | o que | estado |
|---|---|---|
| 1 | lista `it.tsv` (Kelly + legendas, curadoria em 7 trechos) | em andamento |
| 2 | o italiano no código: build, motor (funil), telas, ferramentas; o curso no banco (infra PR #26) e nas estatísticas do hub | feito (08/11) |
| 3 | primeiros passos e palavras | |
| 4 | frases de uso e conjugação | |
| 5 | as palavras que as frases pedem, e as frases delas | |
| 6 | contrastes e conceitos de gramática | |
| 7 | os 5 textos na Biblioteca e nos Cards | |
| 8 | conferências, Catálogo no teste e na produção, publicação | |
