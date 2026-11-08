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

## 3. Etapas (todas feitas em 2026-11-08)

| etapa | o que | resultado |
|---|---|---|
| 1 | lista `it.tsv` (Kelly + legendas, curadoria em 7 trechos, `brutos/CURADORIA-it.md`) | 5.254 palavras |
| 2 | o italiano no código: build, motor (funil), telas, ferramentas; o curso no banco (infra PR #26, Migrar no teste e na produção) e nas estatísticas do hub | feito |
| 3 | primeiros passos e palavras (`01`–`04`) | 40 + 480 |
| 4 | frases de uso e conjugação (`05`–`09`) | ~630 + 116 |
| 5 | as palavras que as frases e os textos pediam, e as frases delas (`10`–`13`); os cards de leitura dos textos (`14`) | 183 palavras, 217 frases, 69 de leitura |
| 6 | contrastes (`50`) e conceitos de gramática (`60`) | 33 + 27 |
| 7 | os 5 textos na Biblioteca (com nota em cada palavra, do it.wiktionary) e nos Cards | fila: Pianto antico → Novembre → L'infinito; por escolha: San Martino, Pinocchio (3 partes) |
| 8 | conferências, Catálogo no teste e na produção, publicação | |

Total: **1.796 cards** (732 palavras, 1.004 frases, 33 contrastes, 27 conceitos).

## 4. Como foi feito, e o que fica para depois

- As levas foram feitas por subagentes em worktrees próprias (`~/.cache/claude-it/wt-<branch>`, uma
  branch por leva), com as regras em `~/.cache/claude-it/BRIEF-cards-it.md` e `BRIEF-frases-it.md`
  (só neste PC). A junção: merge das branches, as frases repetidas entre levas tiradas, os `+forma`
  trocados pelos ids, `~/.cache/claude-it/ligar-lista.py .` (a coluna `cards` do `it.tsv`) e os textos
  reimportados (os destinos à mão sobrevivem).
- Sem tradução em domínio público para nenhum dos 5 textos (o *Pinocchio* talvez tenha a de 1933,
  revista por Monteiro Lobato, sobre a de Mary Baxter Lee, de 1929; não digitalizada).
- Próximos: frases com *lo* e *gli* antes de s + consoante (lo studente, lo zio, gli spaghetti), para
  o conceito do artigo ganhar a regra que hoje só aparece como alternativa errada; o *ci* de lugar e o
  *si* impessoal pelo mesmo motivo; o resto do *Pinocchio* e outros textos quando o Gere pedir.
