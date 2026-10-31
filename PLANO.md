# Plano dos baralhos

Este arquivo é o contrato do trabalho grande: levar o app de um baralho de
espanhol a **três baralhos**, que cobrem as seis direções entre português,
espanhol e inglês. Ele guarda as decisões tomadas, o formato dos dados e onde
cada etapa parou — para que uma conversa nova (ou uma janela de contexto nova)
comece lendo isto e o `git log`, e não do zero.

O **como se escreve um card** continua em [`fonte/MANUAL-DOS-CARDS.md`](fonte/MANUAL-DOS-CARDS.md).
Aqui está o **que** se escreve, em que ordem, e com que formato.

---

## 1. Seis direções, três baralhos

Um card já é estudado nos dois sentidos — o app vira a direção quando você
domina a primeira — e já carrega as três línguas. Então cada baralho serve a
duas direções:

| baralho | língua ensinada | serve a quem fala | cards |
|---|---|---|---|
| espanhol | `es` | português, inglês | **1000, prontos** |
| inglês | `en` | português, espanhol | a fazer |
| português | `pt` | espanhol, inglês | a fazer |

São 2000 cards novos para fechar mil em cada uma das seis direções.

## 2. As decisões (21/09/2026)

1. **Três baralhos, não seis.** Cada card carrega os três lados e serve aos
   dois públicos do seu baralho. Os falsos amigos de quem fala português e de
   quem fala espanhol coincidem quase sempre («exquisito», «pretender»,
   «actualmente»), e onde não coincidem quem resolve é a nota.
2. **Todo card vale para os dois públicos**, e a **nota de cada língua ensina o
   que aquele público precisa** — a regra que o manual já tem para a `notaEn`.
   Não há campo de público nem fila filtrada: quem já sabe aperta «já conhecia».
3. **Inglês americano**, com o britânico em `aceitasEn` e na nota, como hoje o
   espanhol da América Latina entra na nota do baralho da Espanha. O lado
   inglês dos mil cards de espanhol foi escrito com a mão britânica e fica como
   está — lá o inglês é resposta, não é o que se ensina.
4. **Português do Brasil**, com a forma de Portugal na nota e, quando corrente,
   nas aceitas.
5. **O baralho de inglês começa do zero (A1 a C2).** No espanhol, «la silla»
   não merece card porque o português entrega; no inglês, «shelf», «spoon» e
   «sink» não se adivinham, e por isso a faixa A1-A2 rende muito mais card ali
   do que aqui.
6. **Inglês primeiro**, português depois.
7. **A leva de estreia teve 30 cards**, lidos um a um pelo Gere e aprovados sem
   mudança. Dali em diante a leva é de **cerca de cem cards**, e a revisão
   profunda passa a ser a do uso: o Gere e os outros usuários acham o defeito
   estudando, pelos três canais de retorno. A leitura no `revisar.js` continua
   obrigatória antes de cada commit — foi ela que pegou os catorze defeitos da
   leva 2, que o build não via.
8. **As telas do app não são minhas.** Eu entrego o formato dos dados, o build
   e esta documentação; a tela de escolha do curso («que língua você fala, que
   língua quer aprender») fica com o Gere.
   *Consequência anotada:* enquanto o app não souber escolher curso, os cards
   novos não recebem comentário, contestação nem «deu quase» — os três canais
   que consertaram o baralho espanhol leva após leva.

## 3. O formato

### As pastas

```
fonte/cards/es/NN-*.json     o baralho de espanhol (os treze arquivos de hoje)
fonte/cards/en/NN-*.json     o baralho de inglês
fonte/cards/pt/NN-*.json     o baralho de português
fonte/tags.json              um dicionário de temas só, para os três
```

A regra de sempre vale dentro de cada baralho: **o arquivo é a data, a
etiqueta é o índice**.

### Os ids

Os mil cards de espanhol mantêm o id nu (`p001`, `f003`, `v016`, `u023`): o
progresso de estudo é chaveado por id, e renomear jogaria fora o histórico.
Os baralhos novos levam o prefixo da língua, e assim nenhum id se repete quando
alguém estudar dois cursos no mesmo aparelho:

```
en-p001  en-f001  en-v001  en-u001
pt-p001  pt-f001  pt-v001  pt-u001
```

As séries continuam as mesmas: **p** palavra, **f** frase ou expressão, **v**
forma verbal, **u** frase de uso presa a uma palavra.

### Os campos

O card não muda de forma: cada língua tem o seu quarteto, e a língua ensinada
é a do baralho. Nada aqui é novo — é o formato de hoje, lido de maneira
simétrica.

| língua | resposta | outras aceitas | distratores | nota |
|---|---|---|---|---|
| português | `pt` | `aceitas` | `distratores` | `nota` |
| inglês | `en` | `aceitasEn` | `distratoresEn` | `notaEn` |
| espanhol | `es` | `aceitasEs` | `distratoresEs` | `notaEs` |

- No baralho de **espanhol**, `es` é o que se cobra; `pt` e `en` são as
  respostas dos dois públicos.
- No baralho de **inglês**, `en` é o que se cobra; `pt` e `es` são as respostas
  — e é aí que entram `distratoresEs` e `notaEs`, que o baralho espanhol nunca
  precisou.
- No baralho de **português**, `pt` é o que se cobra; `es` e `en` respondem.

As formas verbais seguem o mesmo desenho: `formasEn` são as outras formas da
frase inglesa, com o rótulo em português, e `formasEnPt`/`formasEnEs` trazem os
mesmos textos com o rótulo na língua de quem pergunta — exatamente como
`formasEs` e `formasEsEn` funcionam hoje.

A marcação de gênero `{masculino|feminino}` (seção 4.1 do manual) vale nos três
baralhos.

### A saída

```
data/cards.js          espanhol sem o lado inglês — o que o app de hoje carrega
data/cards-revisao.js  espanhol completo — o que as telas de revisão carregam
data/cards.json        espanhol, indentado, para ler com o olho
data/cards-en.js       o baralho de inglês, completo
data/cards-pt.js       o baralho de português, completo
```

Cada arquivo põe o seu baralho em `window.BARALHOS[idioma]`. Os dois nomes
antigos do espanhol continuam pondo também em `window.CARDS_RAW`, que é de
onde o app lê hoje — e o `cards-revisao.js`, por ser o espanhol completo,
responde pelos dois. Quando a tela de escolha do curso existir, ela lê o
`BARALHOS`; aí o `cards-revisao.js` vira `cards-es.js` e o `CARDS_RAW` sai de
cena.

## 4. O que rende card em cada língua

O critério do manual — **o que a língua de quem estuda não entrega** — dá
baralhos de feitios bem diferentes.

### Inglês (para quem fala português ou espanhol)

- **Falso amigo**, a espinha, como no espanhol: `pretend`, `actually`,
  `eventually`, `realize`, `sensible`, `library`, `parents`, `fabric`,
  `assist`, `attend`, `college`, `exit`, `notice`, `push`, `record`, `resume`,
  `support`, `terrific`. Quase todos enganam os dois públicos.
- **Phrasal verb** — o que mais falta às duas línguas: `give up`,
  `put up with`, `look forward to`, `run out of`, `come across`, `turn down`,
  `figure out`, `show up`, `get along`, `look after`.
- **Preposição e colocação**: `depend on`, `married to`, `listen to`,
  `arrive at/in`, `good at`, `interested in`, `wait for`, `on the weekend`.
- **Verbo irregular**, no lugar que a conjugação ocupa no espanhol: as três
  formas (`bring/brought/brought`), com as outras formas em `formasEn`.
- **Vocabulário opaco**, que no espanhol não renderia card: `shelf`, `spoon`,
  `sink`, `towel`, `bill`, `tap`/`faucet`, `aisle`, `blanket`.
- **Gramática sem equivalente**: present perfect contra o passado simples,
  `used to`, `there is/are`, contáveis e incontáveis (`an advice` não existe),
  `do/does` na pergunta, `get` como verbo de mudança.

### Português (para quem fala espanhol ou inglês)

- Para quem fala **espanhol**, os 175 falsos amigos de hoje se invertem quase
  de graça, agora ensinando a palavra portuguesa: `a borracha`, `o copo`,
  `a oficina`, `o sobremesa`… A nota em espanhol traz o par ao contrário.
- Para quem fala **inglês**, o que pesa é outra coisa: gênero dos
  substantivos, `ser`/`estar`, o pretérito perfeito composto, a colocação do
  pronome, `por`/`para`, os diminutivos, e o vocabulário sem cognato.
- Em comum: as expressões do dia a dia, a conjugação irregular e o português
  falado que a gramática não explica («né», «a gente», «pois é»).

## 5. As etapas

| # | etapa | estado |
|---|---|---|
| 0 | Formato: pastas por baralho, ids com prefixo, build e revisar.js lendo os três, manual generalizado | **feito** (21/09) |
| 1 | Inglês, leva de estreia: 30 cards variados, lidos um a um | **feito** (21/09) — aprovados sem mudança |
| 2 | Inglês, leva 2: 100 cards (22 palavras com frase de uso, 36 frases, 20 formas verbais) | **feito** (21/09) — o baralho está em 130 |
| 3 | Inglês, leva 3: 100 cards (22 palavras com frase de uso, 36 frases, 20 formas verbais) | **feito** (21/09) — o baralho está em 230 |
| 4 | Inglês, leva 4: 100 cards puxando para B2, C1 e as primeiras C2 | **feito** (21/09) — o baralho está em 330 |
| 5 | Inglês, leva 5: 100 cards, a segunda leva avançada | **feito** (21/09) — o baralho está em 430 |
| 6 | Inglês, leva 6: 100 cards, o A1 e o A2 que faltavam, mais um bloco de C2 | **feito** (21/09) — o baralho está em 530 |
| 7 | Inglês, leva 7: 100 cards de base e de conversa | **feito** (21/09) — o baralho está em 630 |
| 8 | Inglês, leva 8: 100 cards de corpo, de base e de conversa | **feito** (22/09) — o baralho está em 730 |
| 9 | Inglês, leva 9: 100 cards, e os pares entre o inglês americano e o britânico | **feito** (01/10) — o baralho está em 830 |
| 10 | Inglês, leva 10: 100 cards de base — cozinha, roupa, feira, tempo, loja — e trinta de conversa | **feito** (01/10) — o baralho está em 930 |
| 11 | Inglês, leva 11: 70 cards para fechar os mil | **feito** (01/10) — o baralho está em **1000** |
| 12 | Textos: a trilha, o formato e o primeiro poema (Machado) | **feito** (01/10) — falta o lado do app |
| 13 | Dez textos candidatos e a tela de aprovar (`escolher-textos.html`) | **feito** (02/10) — espera a sua leitura |
| n | Português, leva de estreia e depois o resto | — |
| — | Telas do app (escolha do curso) | do Gere |

Depois da leva 1 ficam dois acertos pendentes no motor, que só pesam quando o
app for estudar inglês: o aviso de **resposta certa na língua errada** lê só os
pares `🇪🇸 → 🇧🇷` da nota (o baralho de inglês escreve `🇺🇸 → 🇧🇷` e `🇺🇸 → 🇪🇸`),
e as réguas de acento, de «ñ» e de flexão são do espanhol — em inglês elas
simplesmente não disparam, o que não estraga nada, mas também não ajuda.

A leva 4 encontrou um terceiro limite, e este é de desenho, não de conserto:
**a marcação de gênero `{o|a}` não serve ao baralho de inglês quando o que
muda é a concordância do adjetivo.** O texto perguntado é o inglês, que não
concorda — «I feel completely overwhelmed» sai idêntico nos dois sorteios, e o
build lê como card repetido. Ela continua valendo onde o próprio inglês muda
(`my brother`/`my sister`, `his`/`her`); no adjetivo, o card fica no masculino
com o feminino em `aceitas`, que é o que o manual já manda para a palavra.

A curva de níveis do inglês vem sendo corrigida de propósito, leva a leva. As
levas 2 e 3 ficaram todas entre A2 e B2 porque foram atrás do que é mais
frequente; as levas 4 e 5 abriram a faixa alta; e a leva 6 voltou à base, que
estava pior do que eu tinha notado — o A1 tinha **oito** cards contra um alvo
de setenta e cinco, e eu vinha relatando só a falta de C2. Em 530 cards o
inglês está em **A1:20 A2:120 B1:155 B2:130 C1:80 C2:25**, contra o alvo do
espanhol, que é A1:75 A2:285 B1:307 B2:177 C1:100 C2:56.

**O baralho de inglês está fechado em mil**, e a curva de níveis saiu
idêntica à do espanhol: **A1:75 A2:285 B1:307 B2:177 C1:100 C2:56** nos dois.
Não foi coincidência — a leva 11 foi calculada para isso, com A1 +7, A2 +24,
B1 +22, B2 +6, C1 +5 e C2 +6, que era exatamente o que faltava. São 211
palavras com a frase de uso ao lado, 194 formas verbais e 395 frases.

A próxima etapa é o **baralho de português**, do zero, para quem fala espanhol
e para quem fala inglês. O que o inglês ensinou sobre ordem de trabalho vale
inteiro ali, e uma coisa a mais: o baralho de português é o primeiro em que as
duas línguas de casa são línguas que eu não falo de nascença, então a régua de
«isto soa natural?» passa a depender mais da leitura card a card e menos do
ouvido.

A leva 9 também mudou a série dos verbos de ofício, e por necessidade: depois
de cento e trinta verbos irregulares, o poço secou. A série `v` continua sendo
o que o nome diz — **forma verbal** —, e passa a cobrir modal, condicional,
passiva e aspecto composto, que é justamente o B1 que falta. Dos vinte cards
de verbo da leva 9, dezenove são de forma e um só é de verbo irregular novo.

Cada leva termina fechada: `node fonte/build.js`, leitura no `revisar.js`,
varredura do motor, e mais uma conferência que a leva 5 mostrou ser
necessária — **nenhuma resposta certa pode se repetir entre dois cards do
mesmo baralho, em nenhuma das três línguas**. «Tough» e «harsh» tinham os dois
«duro» do lado espanhol; a leva 6 trouxe mais dois, «Você que sabe» e «Perdi
minhas chaves», os dois do lado português. É defeito que o build não vê e que
a leitura não pega, porque os cards ficam longe um do outro — só a conferência
automática acha. O baralho de espanhol já passou por ela e está limpo.

A leva 8 acrescentou uma segunda conferência de uma linha só, e ela também
pagou na estreia: **nenhum campo espanhol pode ter «ç», «ã» ou «õ»**, que são
letras que o espanhol não tem. Um distrator de `en-f251` estava
escrito «cabeça», com a cedilha portuguesa, e nem o build nem a leitura viram.
A leva 9 encontrou um terceiro campo que o baralho de inglês não usava: os
dois que a outra conversa criou para o espanhol em 26/09, `sinonimosEs` e
`regionaisEs`, têm nome genérico no build e no motor, e por isso
`regionaisEn` já funcionava sem precisar de código. **A decisão 3 — inglês
americano, com o britânico em `aceitasEn` e na nota — fica melhor servida
por ele**: o britânico continua valendo e agora o app diz de onde é. Treze
cards antigos passaram para lá e a leva 9 nasceu com onze pares novos.

A varredura do motor virou ferramenta do projeto na leva 9, e por um susto:
ela vivia num arquivo de rascunho, numa pasta temporária, e a limpeza o apagou
no meio da leva. Agora é `fonte/varrer-motor.js`, ao lado do build, e a seção
12 do manual a põe na lista. Quatro sorteios por direção bastam: o distrator
escrito no card sai sempre, e o que muda a cada vez é o que o app escolhe do
baralho. Lição além do script: **nada que a leva precisa pode morar fora do
repositório.**

A leva 11 confirmou, com número, a lição que a leva 10 cobrou caro: a
conferência dos **candidatos** antes de escrever. Das 36 frases que eu ia
escrever, **onze já estavam no baralho** — e o script que as compara pelo funil
nas três línguas as achou em um segundo, antes de qualquer card existir. Mais
duas foram pegas depois porque eu as acrescentei sem passar pela conferência,
o que é o mesmo erro em escala menor. O script virou parte do fechamento de
leva, ao lado do build e da varredura.

A leva 10 cobrou o preço de uma conferência que eu fazia na ordem errada.
Onze das cem frases **já estavam no baralho**: eu tinha conferido a lista de
palavras antes de escrever, e as frases não. O build pegou dez pela letra, e a
décima primeira só a varredura viu — «It is not for me to say.» contra o
`en-f157` «It's not for me to say.», que o funil iguala porque derruba o
sujeito. Três lições, nessa ordem de importância:

- **a conferência de repetido vale para os candidatos, não para o resultado**:
  antes de escrever cem cards, passar a lista de frases pelo funil do motor
  nas três línguas custa um comando e poupa onze reescritas;
- **o build ganhou a guarda que faltava**: além do texto igual, ele agora barra
  dois cards que o funil não distingue. Os 1930 cards passam limpos, então a
  guarda nasceu sem dívida;
- **dividir a resposta já é repetir o card**. Quatro pares tinham o inglês
  diferente e a resposta igual nas duas línguas de casa — «Quanto custa?» em
  dois cards, «Isso não vem ao caso» em dois, «Vale a tentativa» em dois. Pior
  que isso, `en-p185` «the kitchen» chegou pedindo «la cocina», que já era a
  resposta do `en-p153` «the stove»: **card novo pode quebrar card velho**. O
  fogão passou a «el fogón», com «la cocina» ainda aceita e o aviso de que a
  palavra espanhola serve ao aparelho e à sala.

Depois disso, commit e push. É o commit que serve de memória, não a conversa.

### O baralho de francês (08/10/2026)

Pedido do Gere: um curso de francês para quem fala português, com mil cards
pelo menos. Decisões tomadas com ele antes de começar:

1. **Os três públicos de uma vez.** O card de francês carrega português,
   espanhol e inglês inteiros, e o baralho rende três cursos: `fr-pt`, `fr-es`
   e `fr-en`. O build passou a ter a lista explícita de públicos por baralho
   (`AUDIENCIAS`), e o pacote de cada curso tira os campos de todas as línguas
   que não são a ensinada nem a do público.
2. **O francês da França**, com o Quebec, a Bélgica e a Suíça como variantes.
3. **Os três cursos entram na escolha do curso** (`inicio.js`), com a bandeira
   e os nomes nas três línguas da interface.
4. **Língua do zero, pelo ciclo do manual (seção 18).** A leva de estreia teve
   as 40 frases de primeiros passos e 50 palavras (18 verbos, 17 substantivos,
   7 adjetivos, 8 advérbios). A próxima é a das frases de uso dessas palavras,
   com as conjugações; depois, as palavras que as frases pedirem.

O catálogo dos três cursos (`fonte/sql/catalogo-fr-*.sql`) precisa ser
aplicado pelo workflow Catálogo do taioe-infra antes de a leva ir para a main,
como o de todo curso.

| leva | o que | estado |
|---|---|---|
| fr 1 | 40 primeiros passos + 50 palavras | **feito** (08/10) — 90 cards |
| fr 2 | 67 frases de uso (uma ou mais por palavra) + 24 de conjugação (presente dos irregulares, passé composé com «avoir» e «être», imperfeito, futuro próximo, futuro, condicional) | **feito** (08/10) — 181 cards; 53 palavras pedidas pelas frases ficam para a leva 3 |
| fr 3 | 52 palavras que as frases pediam («le français» e «français» viraram um card só) + 12 avulsas; «très» e «beaucoup», «l'an» e «l'année» separados por parêntese no português | **feito** (08/10) — 245 cards; falta frase para as 12 avulsas, para «la cuisine» e para «le sport» |
| fr 4 | 74 frases de uso (todas as palavras com frase, e os usos mais comuns das que já tinham) + 30 de conjugação (presente de -ir e -re, passé composé com particípios irregulares, imperfeito, futuro dos irregulares, condicional, pronominais, negação no passado); o funil do francês deixou de igualar plural e singular, porque o «-s» separava «je serai» de «je serais» | **feito** (08/10) — 349 cards; 70 palavras pedidas pelas frases |
| fr 5 | 70 palavras que as frases pediam + 20 avulsas; parêntese para separar «le soir»/«la nuit», «la journée»/«le jour», «le matin»/«demain» (espanhol), «connaître»/«savoir» (inglês), «la gare» (estação de trem), «la douche»/«le bain» | **feito** (08/10) — 439 cards; falta frase para as 20 avulsas |
| fr 6 | 111 frases de uso (as 20 avulsas, os usos das palavras da leva 5 e frases de situação: loja, café, transporte, direção, hora, saúde) + 27 de conjugação (concordância do particípio com «être», imperfeito de «être» e «avoir», pronominais, verbos da leva 5) | **feito** (08/10) — 577 cards; 69 palavras pedidas pelas frases |
| fr 7 | 69 palavras que as frases pediam + 27 avulsas (corpo, roupa, comida, estações…); primeiros `sinonimosFr` e `regionaisFr` (cellulaire no Quebec, GSM na Bélgica, natel na Suíça) | **feito** (08/10) — 673 cards; falta frase para as 27 avulsas |
| fr 8 | 126 frases de uso (as 27 avulsas, um por sentido nas de dois; os usos das palavras da leva 7; situações de hotel, médico, telefone, direção) + 25 de conjugação (os primeiros mais-que-perfeitos, imperfeito, futuro, passé composé) | **feito** (08/10) — 824 cards; 37 palavras pedidas pelas frases |
| fr 9 | 37 palavras que as frases pediam + 47 avulsas (dias, estações, cores, comida, casa, roupa, corpo, profissões, verbos e advérbios comuns); parêntese em «mieux», «la fois», «l'étage», «perdre», «le menu», «proche», «sympa», «d'abord» | **feito** (08/10) — 908 cards; falta frase para as 47 avulsas |
| fr 10 | 95 frases de uso (as 47 avulsas, um por sentido nas de dois; os usos das palavras da leva 9) + 20 de conjugação, só com palavras que já têm card | **feito** (09/10) — **1023 cards**: 40 de primeiros passos, 384 palavras, 473 frases de uso, 126 de conjugação; nenhuma frase presa, nenhuma palavra sem frase |
| fr 11 | 125 palavras de A1 a C2, escolhidas na lista de frequência (7.9) e espaçadas por igual em cada faixa, para haver card logo acima de qualquer divisa | **feito** (16/10) — 1.148 cards |
| fr 12 | 198 frases de uso das palavras da leva 11 | **feito** (16/10) — 1.346 cards; 24 palavras pedidas pelas frases |
| fr 13 | as 24 palavras que as frases pediam (dernier, changer, recevoir, garder, le roi, la photo…) | **feito** (17/10) — **1.370 cards**; com card na lista: A1 276, A2 124, B1 62, B2 33, C1 23, C2 15 |

**O baralho de francês passou de mil em 09/10/2026.** A curva de níveis ficou
quase toda em A1 (939 A1, 84 A2): é a base de quem começa do zero, e o ciclo
vai subindo de nível sozinho conforme as palavras novas saem das frases. O que
falta para ir à main: aplicar os três catálogos (`fonte/sql/catalogo-fr-*.sql`)
pelo workflow Catálogo do taioe-infra e conferir que o banco aceita os cursos
`fr-pt`, `fr-es` e `fr-en`; depois, o estudo de verdade — os três canais de
retorno (manual, seção 1) é que vão consertar o baralho dali em diante.

---

## 6. Os textos (trilhas)

> **Substituído em outubro de 2026.** A trilha de cards de verso saiu: o texto
> agora é recompensa, sem card, e o desenho está no manual, seção 17.4. O que
> segue fica como registro de como foi pensado.

Decidido com o Gere em 01/10. **Um texto não é um card: é uma trilha.** O aluno
liga a trilha de um texto, e ela vai soltando cards na fila até o texto estar
inteiro na cabeça. No fim o app anuncia e mostra o texto completo.

As regras, todas do Gere:

- **só textos em domínio público, reconhecidos pela qualidade** — poemas,
  principalmente, e também excertos curtos de prosa de ficção e de não-ficção.
  Cada texto é aprovado por ele antes de qualquer card existir, e o arquivo
  guarda em `dominio` a conta que põe o texto em domínio público;
- **as palavras do texto ganham card**, as que ainda não tiverem — e só as que
  mereceriam card pela seção 2 do manual. «De», «la», «y» e «camino» ficam de
  fora: não ensinam nada a quem fala português, e card de acerto fácil mexe no
  agendamento de todos os outros;
- **a cada verso, ou a cada frase completa na prosa, um card** — do primeiro em
  diante;
- **o card do verso só é liberado quando todas as palavras dele estiverem
  dominadas.** Palavra sem card não entra na conta: ela não tem como ser
  dominada, e quem fala português já a entende;
- **nada disso começa antes de 500 cards dominados.** Daí em diante, **a cada
  três cards novos, um é do texto da vez**;
- quando o último verso for dominado, o app avisa e mostra o texto inteiro.

### O formato

O texto mora em `fonte/textos/<idioma>/`, fora de `fonte/cards/`, e **leva
os cards dos versos dentro de si**. Não é organização: é proteção. Card de verso
em `fonte/cards/` cairia na fila normal no primeiro build, antes de a
trilha existir — apareceria no estudo do Gere no dia seguinte, solto, fora de
ordem e sem as palavras dele vistas.

O arquivo tem `id`, `titulo`, `autor`, `obra`, `ano`,
`dominio`, `nota`/`notaEn`, a lista `versos` e a lista
`cards`. Cada verso é `{n, card}`, e **o mesmo id de card pode
aparecer duas vezes**: «caminante, no hay camino» é o verso 3 e o verso 9 do
Machado, e dois cards com o mesmo espanhol o build barra — então a lista aponta
para ids. Cada card de verso leva `texto` (o id da trilha) e, quando precisa,
`requerTodas` com os ids das palavras que têm de estar dominadas.

O build junta os cards de verso ao baralho **só para validá-los** — passam pelas
mesmas checagens de todo card — e depois os separa: o baralho sai em
`data/cards-<idioma>.js` e as trilhas em `data/textos-<idioma>.js`, que
põe tudo em `window.TEXTOS[idioma]`. A varredura do motor também corre por
eles, porque vão ser respondidos como qualquer card.

### O primeiro texto, e o que ele ensinou

«Caminante, no hay camino», de Antonio Machado (1912), dez versos. Rendeu **três
palavras novas** — «la huella», «sino» e «la estela» — com as três frases de uso,
e **nove cards de verso** para dez linhas. Três coisas que só apareceram ao
fazer:

- **o verso repetido**, que obrigou a lista de versos a apontar para ids;
- **a régua do manual quase não tranca nada.** Das nove linhas, só duas têm
  palavra com card: a 1 («huellas») e a 10 («sino», «estelas»). As outras sete
  abrem na hora. Quem manda no ritmo, então, é a ordem dos versos, e não o
  domínio das palavras. Se o Gere quiser que a trava morda, o critério das
  palavras tem de ser mais largo que o do manual — e aí entram «camino»,
  «andar», «senda», que o português entrega;
- **o baralho de espanhol saiu dos mil**: está em 1006, porque as três palavras
  e as três frases são cards de verdade e estudam-se na fila normal. Os nove
  versos estão fora da conta.

### Escolher o próximo texto

Aprovar texto é decisão do Gere, e decisão que precisa de leitura: o original ao
lado da tradução, o que o texto ensina, o que pesa contra, e quanto ele custa em
cards. Daí a página **`escolher-textos.html`**, que serve dez candidatos um a
um — seis poemas e quatro trechos de prosa, todos em domínio público conferido
pela data de morte do autor. Três botões (entra, não entra, fico em dúvida) e um
campo de recado, que é onde mora a parte útil: «entra, mas só as duas primeiras
estrofes» vale mais que o botão.

As decisões vão para o repositório de **dados**, em
`textos-escolhidos.json`, ao lado do progresso — e não para o de revisão,
que é dos revisores de fora. Para isso o ferramental de revisão
(`js/revisao.js`) passou a aceitar o repositório como opção, em vez de ter o
de revisão escrito dentro.

**O custo em cards é estimativa, e dita como tal na tela**: são as palavras do
texto que não aparecem no espanhol de card nenhum, contadas sem juntar as formas
de um mesmo verbo — «volverán» não encontra «volver». O número sai alto de
propósito, como teto. Ele vai de 14 («Hombres necios») a 45 («En paz»).

E uma ressalva que a tela repete em todo texto: **escrevi os dez de cabeça**.
Antes de qualquer um virar card, o texto tem de ser batido com uma edição
impressa — a pontuação, sobretudo, varia de edição para edição.

Aprovar não cria nada. O texto aprovado vira depois um arquivo em
`fonte/textos/`, escrito à mão, com os cards de cada verso: a aprovação é o
começo do trabalho, e não o fim dele.

### O lado do app, feito em 01/10

**O card da trilha conta como card novo** — decisão do Gere. Ele ocupa um dos
lugares de estreia que já existiam e passa pelo piso e pelo teto como qualquer
outro; a trilha não abre uma torneira nova. Com isso o motor ganhou cinco
funções (`trilhaLiberada`, `vezDaTrilha`,
`proximoDaTrilha`, `andamentoDaTrilha`, `dominadosNoTotal`),
o app ganhou a tela **Textos**, e o resto é consequência:

- os cards de verso entram no `PORID`, para serem perguntados e corrigidos
  como qualquer card, e **nunca no `CARDS`**, que é de onde sai a fila de
  inéditos. Depois de respondidos eles entram nas filas de revisão normalmente:
  a trilha manda na estreia do card, não na vida dele depois;
- a vaga de card novo passou a ter dois donos. A cada três estreias, uma é da
  trilha — e quando o baralho não tem mais inédito, a trilha fica com todas;
- o verso que espera palavra **não trava a trilha**: ela passa ao próximo verso
  que tenha o que dar. Travar pararia a injeção, e a pessoa ficaria com a trilha
  ligada e nada vindo dela;
- a tela mostra em que pé está cada verso (dominado, em andamento, esperando tal
  palavra, pode vir) e, quando o último verso é dominado, troca a lista pelo
  **texto inteiro com a tradução ao lado**.

Conferido no navegador com 500 dominados semeados: duas estreias do baralho, a
terceira «la huella» — e o contador voltou a zero. Com «la huella» vista e não
dominada, a trilha pula o verso 1 e dá o verso 2; com ela dominada, dá o verso
1; com tudo dominado, dá `null` e a tela anuncia o texto fechado.

---

## 7. O começo do app sem tédio (decidido em 09/10/2026)

Pedido do Gere: que o início de um curso não seja tedioso. Quatro ideias dele,
com a contraproposta aceita inteira. Tudo aqui é **especificação para
implementar**; o que já foi feito vai sendo marcado na tabela do fim da seção.

A ordem da primeira entrada num curso fica:

1. mensagem «Para começar, vamos avaliar o seu nível atual.»;
2. o **nivelamento** (7.3), que pode ser pulado;
3. a tela de **resultado** («Você já conhece cerca de N palavras deste baralho»);
4. **uma** tela de «como funciona» (escolher → escrever → o card se inverte);
5. o jogo, com as **dicas no momento certo** (7.5).

### 7.1 Palavras transparentes

**Transparente** é a palavra que quem estuda já entende sem estudar, porque é
a mesma na língua dele. Medido em 09/10: no espanhol para quem fala português,
26% das palavras são idênticas sem acento e 15% quase idênticas; no português
para quem fala espanhol, 38% e 15%; nos cursos com inglês e francês, de 1% a 8%.
O problema do tédio por cognato é quase todo espanhol ↔ português.

- **É propriedade do curso (língua ensinada × público), não do card.** «La
  idea» é transparente para quem fala português e para quem fala inglês; «la
  pared» só para quem fala português. O build calcula e põe no pacote de cada
  curso; nada se grava por usuário.
- **Dois graus**, só em cards de `tipo: palavra`:
  - **total** — a forma sem acento e sem o artigo da frente é **igual** nas
    duas línguas («la madrugada» / «a madrugada», «acatar»). Não entra em
    jogo e conta como dominada **para sempre**;
  - **parecida** — diferença de 1 letra (palavras de 5+ letras) ou de 2 (8+
    letras), na mesma comparação («la hormiga» / «a formiga», «la pared» / «a
    parede»). Reconhecer é de graça, escrever é a lição: o card **pula a ida**
    e estreia direto na volta (`inversa-multipla`).
- **Ficam de fora das duas**: gênero diferente quando as duas línguas têm
  artigo («la leche» / «o leite» — o gênero é a lição); etiqueta
  `falso-amigo`; resposta com «/» (dois sentidos) ou com parêntese;
  conjugação. O público inglês não tem gênero, e aí só a grafia conta.
- **A regra erra, e a curadoria corrige.** Campo opcional no card,
  `transparencia: { "<público>": "nenhuma" | "parecida" | "total" }`, que manda
  sobre a regra. O relatório `node fonte/transparentes.js <curso>` lista os
  dois grupos para o Gere ler uma vez por curso e depois de cada leva; falso
  amigo sem etiqueta é o erro típico.
- **No jogo**: a transparente total conta como dominada em `sabidaEm` (frases
  e textos destravam), conta para os 400 dominados que liberam os textos e
  para o número de palavras conhecidas; **não** entra em `dominioPorNivel`
  (não é evidência de nada). A lista ganha o filtro «transparentes», com
  «estudar mesmo assim» por card, que a devolve ao jogo como card comum
  (`extras.reativados`).

### 7.2 Dominado provisório

O que o nivelamento declara ou deduz como conhecido **não é arquivado**: vira
**dominado provisório**. Arquivar continua sendo só gesto da pessoa.

- Fica em `extras.nivelamento.presumidos`: `{ id: voltaEmISO }`. Não cria
  estado de card (o estado só nasce de resposta de verdade, e o protocolo do
  banco é de respostas).
- Para o motor, o card presumido e sem estado é **dominado**, com data de
  volta. Conta para `sabidaEm`, para os 400 dos textos e para o número de
  conhecidas; fica fora de `dominioPorNivel`.
- A data é espalhada **entre 7 e 60 dias** depois do nivelamento, por um hash
  de usuário + card (estável em qualquer aparelho), para os presumidos não
  vencerem em lote.
- Na data, ele aparece como **revisão de dominado** (volta, escrita), com o
  espaçamento que os dominados já têm. **Acertou**: nasce o estado
  `dominado` no degrau de 3 meses. **Errou**: nasce o estado comum, do zero
  (`multipla`), e o card segue o caminho normal.
- O painel mostra os presumidos à parte: «a confirmar».

### 7.3 O nivelamento

Na primeira entrada num curso (sem `extras.nivelamento` e sem nenhum estado).

1. **Pergunta de entrada**: «Você já estudou {língua}?» — *Nunca* / *Um
   pouco* / *Bastante*. *Nunca* pula o teste (`nivelamento.pulou = true`):
   iniciante respondendo «quero aprender» trinta vezes é o pior começo.
2. **Cartas**: uma palavra por vez, na língua ensinada, com dois botões —
   «Já conheço» e «Quero aprender» —, barra de progresso e «pular».
3. **Escada por blocos**: começa em A1 (*Um pouco*) ou A2 (*Bastante*). Bloco
   = 6 palavras do nível, **cada uma de um tema** (rodízio pelos temas, para
   achar os pontos cegos). 5 ou 6 conhecidas → sobe de nível; 2 ou menos →
   para; 3 ou 4 → mais um bloco no mesmo nível, e sobe se as 12 somarem 9 ou
   mais, senão para. Teto de 40 cartas. Fica entre 15 e 35, uns 2 minutos.
4. **Banco do teste**: cards de palavra, sem transparente total, sem
   `falso-amigo`, com um tema. **Tema** = a primeira etiqueta que não é de
   classe nem de comportamento (verbo, adjetivo, substantivo, gramática,
   falso-amigo, gíria, expressão, Espanha, conjugação, regular, irregular,
   formal…); sem tema, «geral».
5. **Conferência embutida**: em 1 de cada 4 «Já conheço» (e pelo menos uma por
   bloco), a carta vira na hora uma múltipla escolha com os distratores do
   card na língua de quem estuda. Errou: a palavra conta como não conhecida.
   `confianca = (acertos + 3) / (conferências + 3)` — otimista: é 1 enquanto ninguém erra, e uma conferência errada em duas já a põe abaixo do limiar (a primeira versão, `(acertos + 1) / (conferências + 2)`, exigia umas oito conferências certas e não deduzia nada).
6. **Dedução, conservadora**: para cada nível testado, a taxa do nível
   `r` = conhecidas ÷ cartas; para cada célula nível × tema,
   `p = (k + 4r) / (m + 4)` (k conhecidas de m cartas da célula); `p × confianca`
   ≥ **0,9** → presumir as palavras daquela célula. Só em níveis **até o mais
   alto testado**. Nunca: `falso-amigo`, `expressão`, `gíria`, conjugação,
   frases. Palavra respondida «Já conheço» e não reprovada na conferência é
   presumida; «Quero aprender» não muda nada. Se o teste passou do A2, as 40
   frases de primeiros passos também são presumidas.
7. **O nível inicial**: as taxas por nível entram como o *prior* de
   `dominioPorNivel` (no lugar do 0,5 fixo), e o sorteio dos inéditos já começa
   na altura certa, sem o tateio dos primeiros cards.
8. **Resultado**: «Você já conhece cerca de N palavras deste baralho» (N =
   transparentes totais + presumidas), com a nota de que elas vão aparecer de
   vez em quando para confirmar.
9. **Refazer** nas configurações: apaga os presumidos ainda não respondidos e
   roda de novo.
10. **Depois, com dados**: as respostas do teste de todo mundo ficam no log; com
    usuários suficientes, a dedução troca nível × tema por padrões reais
    («quem conhece X conhece Y»). Não agora.

`extras.nivelamento = { feitoEm, pulou, comeco: 'nunca'|'pouco'|'bastante',
porNivel: { A1: taxa, … }, confianca, cartas: [{ id, resposta, conferida,
acertou }], presumidos: { id: voltaEm } }`.

### 7.4 O card desafio e a vitrine dos textos

**Desafio** — um gostinho do que vem pela frente, sem desanimar.

- **Grupo**: cards com `falso-amigo`, `expressão`, `gíria` ou `provérbio`,
  inéditos, **dois níveis acima** do nível atual (o mais alto com domínio ≥ o
  alvo, ou o do nivelamento), no máximo C1.
- **Ritmo**: o primeiro depois de 15 respostas no curso; depois no máximo 1
  por dia; só nas duas primeiras semanas do curso; no máximo 10 no total.
- **Na tela**: a marca «Desafio», para o erro não pesar. A estreia dele **não
  entra** em `dominioPorNivel` (`est.desafio = true`).
- **Frase ainda presa**: aparece uma vez como prévia, em múltipla escolha.
  Acertou: entra no jogo. Errou: «essa volta quando você tiver as palavras
  dela», e continua presa.

**Vitrine** — desde o primeiro dia, o painel mostra o próximo texto (o poema
primeiro): título, autor, o primeiro verso com a tradução e «faltam N
palavras». O limite de 400 dominados continua valendo para o texto entrar na
espera, mas transparentes e presumidas contam.

### 7.5 As dicas no momento certo

> **Retiradas em 19/10/2026**, a pedido do Gere: «já vi que as pessoas
> simplesmente pulam isso. Precisamos deixar tudo mais intuitivo». Saíram a
> tela «como funciona» (o resultado do nivelamento leva direto ao primeiro
> card), os balões abaixo e o botão «Rever dicas». O «Já conheço essa
> palavra» agora só aparece na estreia do card, em vermelho, logo acima dos
> botões da vez (do «Responder» ou do «Não sei»; depois da resposta, do
> «Próximo»). O campo `dicasVistas` continua nos extras e na mescla, sem uso.
> O texto abaixo fica como registro do que existiu.

Uma tela de «como funciona» depois do nivelamento; o resto aparece **na
primeira vez em que a situação acontece**, uma vez só:

| dica | quando |
|---|---|
| `arquivar` | primeiro card novo: o botão «não quero aprender» (já em destaque na estreia) |
| `quase` | primeiro «deu quase»: «aqui quem decide é você» |
| `comentar` | primeiro erro, ou a 10ª resposta: o comentário como pedido de ajuda para melhorar os cards |
| `frase` | primeira frase destravada: por que as frases esperam as palavras |
| `dominado` | primeiro card dominado: a escada |
| `transparente` | primeira vez no filtro «transparentes» |
| `desafio` | primeiro desafio |

As vistas ficam em `extras.dicasVistas` (com `localStorage` de reserva).
«Rever dicas» nas configurações zera a lista. Todo texto nas três línguas da
interface.

### 7.6 O que muda para quem cria cards e línguas

Está também no manual (seção 19), que é onde quem escreve leva lê:

- **Toda palavra precisa de um tema** além da classe: é por ele que o
  nivelamento acha os pontos cegos. O build avisa a palavra sem tema.
- **`falso-amigo`, `expressão`, `gíria` e `provérbio` têm de ser verdade**:
  tiram o card da transparência e da dedução, e alimentam o desafio.
- **Não deixar de criar a palavra transparente**: as frases precisam dela no
  `requerTodas`. O build a tira do jogo sozinho, no curso em que ela é óbvia.
- **Depois de cada leva**, rodar `node fonte/transparentes.js <curso>` para
  cada curso do baralho e corrigir com o campo `transparencia` o que a regra
  errar.
- **Língua nova**: artigos e gêneros na tabela da transparência (build); um
  banco de teste com **pelo menos 6 temas e 3 palavras por tema** em cada
  nível de A1 a B2 (o build avisa); textos para a vitrine; os textos novos
  da interface nas três línguas.

### 7.7 Onde cada parte mora, e quem faz

| parte | onde | quem |
|---|---|---|
| transparência (regra, campo, relatório, pacote) | `fonte/build.js`, `fonte/transparentes.js` | nuvem |
| transparência e presumidos no jogo; prior do nível; desafio | `js/motor.js` | nuvem |
| nivelamento, resultado, «como funciona», dicas, filtro, vitrine | `public/cards/js/app.js`, `inicio.js`, `index.html`, `style.css`, i18n | nuvem |
| guardar `nivelamento`, `dicasVistas` e `reativados` nos extras | RPC `gravar_extras` e `carregar_curso` (taioe-infra) e a mescla de `sincronia.js` | **local** (o banco) + nuvem (a mescla do aparelho) |
| testar no navegador com login, aplicar catálogos, publicar | — | **local** |

| etapa | estado |
|---|---|
| especificação (esta seção) | **feito** (09/10) |
| transparência | **feito** (09/10) |
| presumidos, prior, desafio no motor | **feito** (09/10) |
| telas e dicas | **feito** (09/10) |
| banco (extras novos) e teste no navegador | **feito** (16/10) — migrações `20261009120000_comeco_e_frances` e `20261016120000_em_vista_objetos` do taioe-infra no teste e na produção, catálogos do francês nos dois; teste com login no localhost (Supabase local, 390 px). Achados no caminho: a troca de língua nas configurações travava (`inicio.js`) e o banco descartava as frases em vista `{id, origem}`; os dois consertados. A dica `frase` só foi conferida no código |

### 7.8 Como ficou o código

Feito em 09/10 o que não é tela: a regra no build, a lógica no motor, e o
mínimo de app para o jogo já obedecer. É o contrato das telas.

**Build.** A regra da 7.1 mora em `fonte/transparencia.js` (artigos e gêneros
de `es`, `pt` e `fr`; o «ñ» conta como letra; o campo `transparencia` manda
sobre a regra e é validado: públicos do baralho, três graus, só em palavra).
O `fonte/build.js` põe `transp: 'total' | 'parecida'` no card do pacote de
cada curso — só quando há grau, depois do `v`, que não vê o campo
`transparencia` (o catálogo não muda) —, imprime as contagens por curso e
avisa, uma linha por baralho ou curso, a palavra sem tema, o banco do
nivelamento curto (menos de 6 temas com 3 palavras em algum nível de A1 a
B2 que o baralho tem) e a etiqueta de verbo que ficou fora da lista de
classe. `node fonte/transparentes.js <curso>` é o relatório card a card.
Contagens de 09/10: es-pt 278 total (26%) e 122 parecidas (11%) de 1.070
palavras; pt-es 71 (37%) e 19 (10%) de 193; fr-pt 13 (3%) e 23 (6%) de 384.

**Motor** (`js/motor.js`, bloco «o começo do app sem tédio»). Nenhuma
assinatura antiga mudou; o que é do curso e da pessoa entra como estado do
módulo, igual ao `usarBaralho`:

- `Motor.usarTransparencias(cards)` — uma vez, na abertura do curso;
- `Motor.usarExtras({ nivelamento, reativados })` — a cada mudança dos
  extras (o app chama no começo do `conciliarFila`);
- `Motor.TAGS_DE_CLASSE`, `Motor.temaDe(card)` — o tema (null = «geral»);
- `Motor.transparencia(card|id)`, `transparenteTotal(id)`,
  `presumidoEm(id, estados)`, `conhecidaSemEstado(id, estados)`;
- `Motor.estadoInicialDo(card)` — a estreia (a parecida nasce em
  `inversa-multipla`); `estadoInicial(id)` continua igual;
- `Motor.estadoDoPresumido(id, estados)` — o dominado calculado que a fila
  enxerga (nunca gravado); `Motor.responderPresumido(id, r)` — o estado que
  nasce da resposta: acertou, `dominado` com `revisoes = 4` (volta em 90
  dias, `dominadoEm`); errou, `multipla` com o erro registrado;
- `Motor.dataDoPresumido(uid, id, feitoEm)` — de 7 a 60 dias, por hash;
- `Motor.dominioPorNivel(cards, estados, prior)` — `prior` =
  `nivelamento.porNivel`; ignora a transparente total e a estreia com
  `est.desafio`;
- `sabidaEm`, `liberadaEm`, `situacaoDaFrase` e `dominadosNoTotal` já contam
  a transparente total (sabida desde sempre) e o presumido sem estado
  (sabido desde o `feitoEm`);
- `Motor.nivelamento` — `novo(cards, { comeco, semente })`,
  `proximaCarta(teste)` → `{ id, nivel, tema, conferir, feitas, teto }` ou
  null, `responder(teste, id, conhece)`, `conferir(teste, id, acertou)` (a
  carta com `conferir: true` é a múltipla escolha da conferência),
  `deduzir(teste, cards, { uid, agora, estados, arquivados })` →
  `{ porNivel, confianca, presumidos, testados, cartas }`, e `banco(cards)`.
  O teste é JSON puro, sorteio incluído. A tela junta `feitoEm`, `pulou` e
  `comeco` e grava em `progresso.nivelamento`;
- `Motor.palavrasConhecidas(cards, presumidos?)` — o N do resultado;
- `Motor.escolherDesafio(cards, estados, { agora, respostas, desafios,
  ultimoDesafio, inicio, mostrados, arquivados, prior })` → null ou
  `{ card, previa, nivel }`; `Motor.marcarDesafio(est)` na estreia. Os
  contadores (`desafios`, `ultimoDesafio`, `mostrados`, `inicio`) são da
  tela guardar.

**App.** Já obedece, sem tela nova: a transparente total sai das filas e
dos inéditos (como a arquivada, e volta se reativada); a parecida estreia na
volta; o presumido sem estado mora na fila dos dominados e é servido como
revisão de dominado — a resposta vai ao servidor com `etapa_antes`
`dominado` e `degrau` nulo, fora da retenção; o `porNivel` do nivelamento
já é o prior da ordem dos inéditos. `progresso.nivelamento`,
`progresso.reativados` (id → ISO) e `progresso.dicasVistas` (chave → ISO)
viajam nos extras **só quando existem**, e a ausência deles na resposta do
servidor não apaga o que o aparelho tem. A mescla (`mesclarExtras`):
nivelamento inteiro pelo `feitoEm` mais recente; reativados e dicas chave a
chave, **o gesto mais recente vence** (ver «As telas», abaixo: a união da
primeira versão não deixava desfazer). Falta o banco guardá-los
(`gravar_extras`, `carregar_curso`; local).

**Decidido no caminho.** A frase de primeiros passos com «expressão»
(«¡Buen provecho!») entra no presumido quando o teste passa do A2; só o
falso amigo fica fora. «Quero aprender» e a reprovada na conferência nunca
são presumidas, mesmo em célula que passou. Nível não testado abaixo do
mais baixo leva a taxa dele; acima do mais alto, a metade do de baixo a
cada degrau (prior). Com a régua de 0,9 sobre `p × confiança`, a célula só
passa com umas 8 conferências certas e nenhuma errada — num teste de 30
cartas é raro, e o grosso dos presumidos é o que a pessoa disse conhecer.

Conferido por `node fonte/testar-comeco.js` (no CI, workflow Cópias).

**As telas** (09/10, `public/cards/js/app.js`, `index.html`, `style.css`,
textos nas três línguas em `textos-i18n.js`). Tudo do lado do aparelho; a
rede só entra no fim do teste, quando o nivelamento sobe nos extras.

- **O começo** mora na `tela-comeco` (um `comeco-conteudo` que o app
  redesenha a cada passo: entrada, teste, resultado, «como funciona»), no
  bloco «o começo» do app. Abre sozinho na abertura do curso quando não há
  `progresso.nivelamento` nem card respondido; num aparelho novo, se a
  primeira carga trouxer estados ou nivelamento, a avaliação que ainda não
  acabou some (`conferirComeco`, no `aoMudar` da sincronia). Os botões do
  topo somem enquanto ela dura. O teste (`Motor.nivelamento`) fica em
  `localStorage` `cards:comeco:<uid>:<curso>` a cada resposta, com a fase
  — recarregar retoma o teste, o resultado ou o «como funciona». A
  conferência usa `Motor.alternativas` na ida. O fim (ou o «Pular», que
  deduz com o que já foi respondido) grava `progresso.nivelamento` =
  `deduzir()` + `{ feitoEm, pulou, comeco }` (`testados` vai junto), chama
  o `conciliarFila` (que faz o `usarExtras` e refaz filas e inéditos com o
  prior novo) e agenda a sincronia. «Nunca» grava `{ feitoEm, pulou: true,
  comeco: 'nunca' }`. O resultado separa as transparentes das presumidas;
  com N = 0 vai direto ao «como funciona».
- **Refazer avaliação** (configurações, grupo «Avaliação e dicas») abre o
  mesmo caminho; o nivelamento inteiro é trocado no fim, com `feitoEm` novo
  (é ele que decide a mescla), e o `deduzir` não presume card com estado —
  então os presumidos ainda não respondidos saem, e os respondidos já
  tinham virado card comum. Quem refaz não vê o «como funciona» de novo.
- **As dicas** (`DICAS`, `abrirDica`, `dicaDoCard`): um balão no fluxo da
  página, embaixo ou em cima do que explica, nunca sobre as respostas; uma
  por card; vista ao aparecer. Gravadas em `progresso.dicasVistas` e na
  reserva `cards:dicas:<uid>:<curso>`. «Rever dicas» grava em cada chave o
  **gesto de desfazer**, a data com «-» na frente (`-2026-10-09T…`).
- **Reativadas**: a lista ganhou os filtros «transparentes» (todas as
  `transp: 'total'` do curso, reativadas ou não) e «a confirmar» (os
  presumidos sem estado); as situações «transparente — conta como
  dominada» e «a confirmar»; «Estudar mesmo assim» grava
  `reativados[id] = ISO`, e «Voltar a contar como conhecida» grava
  `-ISO`. O motor só recebe as datas sem «-» (`reativadosAtivos`).
- **A mescla mudou** (`sincronia.js`, `mesclarExtras`): em `reativados` e
  `dicasVistas`, chave a chave, fica o valor de **data mais recente**,
  ignorando o «-» na comparação; no empate, o do servidor. **A RPC
  `gravar_extras` tem de fazer o mesmo** (é o que falta do lado local): a
  união com a data mais antiga desfaria o «Rever dicas» e manteria o
  «-ISO» velho por cima de uma dica vista de novo. `TaioeSincronia.gestoAtivo`
  e `dataDoGesto` são as duas regras; o `testar-comeco.js` confere.
- **O painel**: a métrica «a confirmar» na grade e uma linha embaixo da
  escada dos dominados (quantos e quando volta o próximo); a **vitrine**
  logo depois da grade — o poema da vez (senão a prosa) por
  `atualizarTextosEmVista`, calculado e não gravado, com título, autor, o
  primeiro verso e a tradução, «faltam N palavras» (`andamentoDoTexto`) e,
  antes dos 400 dominados, quantos faltam para as palavras dele começarem a
  chegar. Curso sem textos (francês, português) não tem vitrine.
- **O desafio**: `proximoNovo` pergunta ao `Motor.escolherDesafio` a cada
  vaga de card novo. Os contadores vêm do que já viaja — `est.desafio` (o
  `marcarDesafio` da estreia) e `est.desafioEm` (a data), no estado do
  card; o começo do curso é o primeiro dia do diário, o `feitoEm` ou a
  primeira estreia — mais a anotação deste aparelho
  `cards:desafios:<uid>:<curso>` (id → `{ em, previa, acertou }`), que é a
  única memória da **prévia errada**: ela não cria estado nem resposta no
  servidor, e por isso outro aparelho pode mostrá-la uma vez mais. A
  prévia certa estreia como qualquer card (com a marca de desafio) e entra
  no jogo, mesmo presa. Na tela, a etiqueta «Desafio»; na prévia, sem o
  «já conheço», e com a linha «essa volta quando você tiver as palavras
  dela» (ou «entra no seu jogo»).

Conferido num arnês sem servidor (Chromium a 390 px, com a CSP do
`_headers`): o caminho «Um pouco» com recarga no meio do teste, «Nunca»,
«Bastante» no refazer, as dicas de arquivar, comentar, quase, dominado,
desafio e transparente, a prévia errada, a palavra desafio, reativar e
desfazer na lista, o painel com a vitrine e «a confirmar», «Rever dicas»,
e a avaliação que some quando a carga traz estados. Falta o teste com
login de verdade (local).

### 7.9 O nivelamento pela lista (decidido em 16/10/2026)

O Gere testou o francês e não gostou do teste por temas da 7.3. Proposta dele, com a
contraproposta aceita inteira. Nasceu no francês; desde 17/10, a pedido do Gere («acrescente
o teste de vocabulário das outras línguas, seguindo os moldes do que foi feito para
francês»), vale para os nove cursos, com uma lista por baralho (`fonte/frequencia/es.tsv`,
`en.tsv`, `pt.tsv`; ver «As listas do espanhol, do inglês e do português», no fim da seção).
A 7.3 fica só para curso que não tenha lista.

**A lista.** `fonte/frequencia/fr.tsv`: umas 5.000 palavras do francês, da mais básica à
mais rara, com **todas** as palavras que já têm card e as que ainda não têm (é também o
roteiro dos cards que vierem). Cada linha: posição, lema (o substantivo com o artigo),
classe, gênero, nível, tradução curta em português, espanhol e inglês, e o id do card
quando houver. A ordem: primeiro o nível em que a palavra aparece nos livros didáticos de
francês para estrangeiros (FLELex, UCLouvain), depois, dentro do nível, a frequência nas
legendas (Lexique 4, com a prevalência para as raras), e o ajuste à mão nas primeiras
centenas (palavras de sala de aula e do dia a dia, que a frequência põe baixo demais).
Licenças: FLELex CC BY-NC-SA 4.0, Lexique 4 de uso não comercial; a lista derivada sai sob
CC BY-NC-SA 4.0, com o crédito em `fonte/frequencia/README.md` (ponto para o advogado). Os
arquivos originais ficam fora do git, em `fonte/frequencia/brutos/`.

**O teste.**

1. **O aviso**: o objetivo do teste é a pessoa não perder tempo vendo um monte de palavras
   que já conhece.
2. **A pergunta de entrada** (Nunca / Um pouco / Bastante) só define o ponto de partida e o
   primeiro salto. «Nunca» começa na primeira palavra e termina em dois ou três toques.
3. **A busca**: uma palavra por vez, «Já conheço» ou «Quero aprender». Conhece, a próxima é
   mais difícil; não conhece, mais fácil. O primeiro salto é de 100 («Nunca», da posição 1),
   250 («Um pouco», da 400) ou 500 («Bastante», da 1.500) posições; enquanto a direção não
   muda o salto **dobra** (a pessoa pode estar muito longe do ponto de partida), e depois da
   primeira inversão ele cai pela metade a cada inversão, até o mínimo (10 posições, ou 3%
   da posição — no fim da lista, ±10 não serve para nada).
4. **A conferência**: nos dois primeiros saltos todo «Já conheço» vira múltipla escolha (um
   sim falso ali joga a busca longe demais); depois, um em cada quatro, e pelo menos uma por
   janela. Os distratores são os do card ou, na palavra sem card, as traduções de vizinhas da
   lista da mesma classe. Errou, conta como «não conheço».
5. **A janela e a divisa**: com o salto no mínimo, cinco vizinhas seguidas, a partir de duas
   antes de onde a busca parou. Duas «não conheço» entre as cinco: a **divisa** é o começo
   dessa janela. Uma ou nenhuma: a busca volta logo acima da janela (com o salto dobrando de
   novo só da primeira vez: um «não» falso no começo não prende o teste lá). Teto de 30
   palavras, sem contar as conferências; no teto, ou no «Pular», a divisa é o corte que mais
   concorda com as respostas (mais «conheço» abaixo, mais «não» acima).

   Simulado com pessoas que conhecem 93% do que está antes do seu ponto e 7% do depois
   (fonte/testar-comeco.js, e um arnês de 60 pessoas por ponto): a divisa mediana fica a
   poucas posições do ponto real, em 11 a 29 telas na mediana, conferências incluídas; o
   caso ruim que sobra é quem diz «Nunca» e sabe milhares de palavras.
6. **Não se pergunta** falso amigo (nem é presumido: quem diz conhecer *attendre* talvez
   ache que é «atender») nem transparente total (já conta como sabida).

**O que o teste marca.** Toda palavra antes da divisa, mais as «Já conheço» acima dela, é
**presumida** (7.2: dominado provisório, volta entre 7 e 60 dias para confirmar), menos as
respondidas «Quero aprender» e as reprovadas na conferência. A divisa fica guardada
(`nivelamento.divisa`), e o card de palavra que for feito depois, antes da divisa, nasce
presumido sozinho. As **frases** nunca são presumidas: a frase cujas palavras são todas
presumidas ou transparentes **estreia na volta** (`inversa-multipla`), como a palavra
parecida; as de primeiros passos, quando a divisa passou da posição 300. Depois do teste,
os **cards novos de palavra chegam na ordem da lista**, a partir da divisa (as frases em
vista continuam pedindo as palavras delas primeiro).

`extras.nivelamento` ganha `versao: 2`, `divisa`, `lista` (a versão da lista) e as cartas
com a posição; `presumidos` e `porNivel` continuam (o `porNivel` vira a parte de cada nível
da lista que ficou antes da divisa).

**Recomeçar o curso.** Nas configurações, «Recomeçar este curso», com confirmação: apaga no
servidor o estado, os extras, o diário, os contadores e as respostas daquele curso, e a
cópia do aparelho. Os outros aparelhos percebem na carga (`recomecado_em`) e apagam a cópia
deles. Comentários e contestações ficam (são retorno para quem faz os cards). Serve aos
testes do Gere e a qualquer pessoa.

**Depois.** Cards de palavra do francês em todos os níveis, de A1 a C2, e as frases delas,
pelo ciclo do manual (seção 18), seguindo a lista, para quem já sabe francês aproveitar o
app (pedido do Gere, 16/10).

| etapa | estado |
|---|---|
| «Como funciona»: «Primeiro, uma questão de múltipla escolha;» e sem a nota do relógio | **feito** (16/10) |
| especificação (esta seção) | **feito** (16/10) |
| a lista do francês (`fonte/frequencia/fr.tsv`) | **feito** (16/10) — 5.356 palavras, as 384 com card ligadas; 244 saíram na curadoria (chulas, fragmentos, formas flexionadas, estrangeiras, siglas, duplicatas) e 109 palavras básicas de curso subiram para o A1 |
| build: a posição no card e a lista no pacote do curso | **feito** (16/10) — `data/lista-fr-*.js`; o `inicio.js` só pede os textos e a lista que existem |
| motor: o teste novo, as frases na volta, os inéditos pela lista | **feito** (16/10) — `Motor.nivelamentoLista`; 39 conferências novas no `testar-comeco.js` |
| telas do teste novo, nas três línguas | **feito** (16/10) |
| recomeçar o curso (taioe-infra e app) | **feito** (16/10) — migração `20261016170000_recomecar_curso`, no teste e na produção |
| teste com login no localhost e produção | **feito** (16/10) — os três começos, a conferência da palavra sem card, o banco, o recomeço e o outro aparelho com cópia velha |
| cards de francês em todos os níveis | **feito** (17/10) — levas fr 11 a 13 (§ do francês), 347 cards; PR #19 |
| as listas do espanhol, do inglês e do português, e o teste nos outros seis cursos | **feito** (17/10) — ver abaixo |

**As listas do espanhol, do inglês e do português (17/10/2026).** Mesmo método do francês
(`fonte/frequencia/README.md`): `ordenar.js <língua>` cruza a lista dos livros didáticos
(ELELex e EFLLex, da mesma família CEFRLex do FLELex) com a frequência nas legendas
(OpenSubtitles 2018, somada por lema); o português não tem lista de livros didáticos e vai
só pelas legendas. A curadoria seguiu `fonte/frequencia/brutos/CURADORIA.md`, em trechos, e
`juntar.js <língua>` montou as listas: **es 5.091** palavras (os 1.070 cards de palavra
ligados), **en 5.101** (1.064) e **pt 5.067** (193). As legendas trazem muito nome próprio
e forma flexionada, e por isso a cauda foi curada até a lista passar de 5.000 (as linhas
`5600.0001…` de `candidatos-<língua>-extra.tsv`). Saiu também, por cautela, todo termo
sexual ou de crime sexual, mesmo neutro.

- Os cards de palavra que a frequência pôs no fim (as palavras raras e as expressões sem
  frequência) foram para a faixa do nível do card; os básicos de curso (números, dias,
  comida, família, corpo, casa) para o A1.
- **Regra 6 estendida**: a palavra escrita igual à tradução, a menos de artigo e acento
  («pensar», «la casa» → «a casa»), é transparente total mesmo sem card e não se pergunta
  (`igualATraducao` no motor). Pesa no es-pt (739 palavras) e no pt-es (731); o «ñ» conta.
- Como no francês, os cards novos de palavra passam a vir na ordem da lista em todos os
  cursos, também para quem já estudava (a ordem dos inéditos; as filas de revisão não mudam).
- O catálogo do banco não muda (a posição vai só no pacote do app), e não houve Catálogo.

## 8. O tempo de retorno dos dominados (decidido em 17/10/2026)

**O pedido.** Estudar quanto tempo o card dominado deve esperar para voltar: anotar, em cada
revisão, quanto ele de fato esperou e se a resposta saiu certa (o histórico também), mostrar
isso num gráfico em `/admin/estatisticas/` e, mantendo o tempo nominal, variar a espera por
card para juntar dado dos dois lados do degrau.

**O que a pesquisa diz, e o que se tirou dela.**
- A curva do esquecimento (Ebbinghaus, 1885) cai rápido e depois devagar; cada revisão certa
  a achata. Os sistemas de hoje modelam isso como a «estabilidade» do card: o tempo até a
  chance de lembrar cair a um alvo (SuperMemo, de Wozniak; FSRS, de Ye e outros, 2022–2023,
  hoje no Anki; a «meia-vida» do Duolingo, Settles e Meeder, 2016).
- O alvo mais usado é **90% de acerto na revisão** (o índice de esquecimento de 10% do
  SuperMemo; a retenção padrão do FSRS). Abaixo de ~80% o custo dos erros come o ganho;
  acima de ~95% revisa-se cedo demais, e cada revisão fortalece pouco.
- Recordar com algum esforço fortalece mais que recordar o que ainda está fresco
  («dificuldades desejáveis», Bjork). Daí a espera crescer a cada acerto.
- O intervalo bom cresce com o prazo que se quer lembrar (Cepeda e outros, 2006 e 2008), e
  a expansão em si (3 → 7 → 14…) não é mágica: comparada a intervalos iguais, o que pesa é o
  primeiro intervalo e a espera total (Karpicke e Roediger, 2007; Kang e outros, 2014).
- Conclusão para cá: escolher cada degrau pelo tempo em que o acerto cai a uns 90%, medido
  nos cards do próprio app. As revisões de 09/09 a 16/10 acertaram de 92% a 99% em todos os
  degraus — a escada pode estar curta, e por isso o sorteio vai também para depois do degrau.

**O que foi feito (infra PR #13, cards PR #22, hub PR #9; no ar em 17/10).**
- `Motor.proximaVolta` sorteia a espera entre **metade e o dobro** do degrau, por igual na
  escala dos fatores (log-uniforme; mediana no degrau, metade antes). O degrau, a escada
  (3, 7, 14, 30, 90, 180 dias), a subida de um ou dois degraus e o rótulo «volta em 2
  semanas» não mudam. Constante: `VARIACAO_DA_VOLTA`. Custo: uns **8% a mais** de revisões
  de dominado; os cards que já tinham data não mudam, então não há transição.
- Banco: `cards.retornos` (cada revisão: a resposta anterior, a volta marcada, o degrau, se
  acertou; dura 4 meses, como as respostas) e `cards.retornos_resumo` (contagens por degrau ×
  dias previstos × dias passados, para sempre). O gatilho em `cards.respostas` preenche os
  dois; o histórico entrou pela migração. Nas respostas importadas do app antigo (até 06/10)
  não há degrau: ele foi deduzido do tempo passado (`inferido`).
- `/admin/estatisticas/`, bloco «Cards: o retorno dos dominados»: acerto por faixa de dias
  esperados, com a margem de 95% e a linha dos 90%; um painel por degrau com a espera ÷ o
  degrau (½×, 1×, 2×); a tabela antes / depois do degrau; a sua conta ou todos.

**Próximo passo.** Com umas 4 a 8 semanas de sorteio, ajustar em cada degrau a curva do
acerto pela espera e pôr o degrau onde ela cruza ~90% (o Gere escolhe o alvo). Degrau novo
vai ao Gere com os números e o custo, como manda a regra de agendamento. Os degraus de 1, 3 e
6 meses só terão dado bastante daqui a meses.

---

## 9. Os textos da Biblioteca (decidido em 20/10/2026)

Substitui a seção 6 e o manual 17.4 (textos de recompensa com tradução, depois de 400
dominados). Pedido e contraproposta aceita na conversa de 20/10; as decisões do Gere estão
marcadas com ✔.

### 9.1 As regras

- ✔ **O texto mora na Biblioteca**: os poemas na língua original
  (`edicoes/lingua-original/<pasta>/poema.txt` + `glossario.json`) e, no curso de português,
  os poemas portugueses dela. O id do texto nos Cards é o caminho dele na Biblioteca
  (`victor-hugo/demain-des-l-aube`), que dá também o link.
- ✔ **Cada palavra se liga ao lema**: «partirai» cai no card de «partir». Nada de card por
  conjugação. O glossário da Biblioteca já diz o lema de cada ocorrência.
- **Toda palavra tem destino**, e o build recusa o texto que deixar alguma sem: card comum;
  card de leitura (9.2); transparente para o público; gramatical (artigo, preposição,
  conjunção, pronome: aprende-se nas frases e não trava o verso); nome próprio.
- ✔ **Card de leitura** = a palavra fora da lista de frequência do curso (regra fixa; se
  ficar rara demais coisa simples, aumenta-se a lista). Ver 9.2.
- ✔ **Todo mundo começa com um poema**, e os 400 dominados acabam de vez. Cada curso tem uma
  fila de poemas automáticos, do mais fácil ao mais difícil; depois do nivelamento, o app
  pula o que a pessoa já lê quase inteiro. O automático só sai quando a pessoa escolhe por
  conta própria. Fim de um automático: entra o próximo da fila. Fim de um escolhido: oferece
  escolher outro. Tudo desmarcado: fica sem texto.
- ✔ **Até 3 textos** escolhidos, ou nenhum.
- ✔ **Ritmo**: com texto, as palavras dos textos ocupam **1 de cada 3** vagas de card novo,
  na ordem de leitura, em rodízio entre os textos escolhidos. Sem texto, tudo como antes.
  Desde 24/10, **1 de cada 2,5** (duas em cada cinco; pedido do Gere, que achou que o texto não
  andava): os vãos entre duas palavras de texto se alternam entre 1 e 2 (`Motor.vezDoTexto`).
- ✔ **O verso aparece na hora**: logo depois da resposta que domina a última palavra que
  faltava. Desde 24/10 basta a palavra **fechar a ida** (já reconhecida lendo; `Motor.idaFechada`),
  uns 3,5 dias depois da estreia em vez de uns 7: ler é reconhecer, e a volta segue depois, como a
  de qualquer card. O andamento («faltam N palavras») conta pela mesma régua (não é card, não espera a meia-noite). Domínio por outro caminho (nivelamento,
  «Já conheço», outro aparelho): na próxima troca de card. Vários versos juntos vêm juntos
  («versos 3 a 5 de 12»); verso só de palavras sem card vem com o seguinte.
- ✔ **Sem tradução**, com as palavras clicáveis: o clique mostra o lema, a classe/forma e a
  tradução do próprio card no público de quem estuda; a palavra sem card mostra a definição
  do glossário (pt) ou uma nota curta em es/en para os outros públicos.
- ✔ **Primeiro aviso**, três botões: «Continuar com este poema», «Escolher outro poema» e
  «Prefiro só cards soltos» (desmarca todos).
- ✔ No fim do poema: ele inteiro, com o link para a Biblioteca.
- ✔ **A vitrine do painel fica** (não precisa ser surpresa).
- ✔ **Botão na Biblioteca**: «Aprender as palavras deste poema» («deste texto» na prosa), só
  no texto todo coberto. Sem login → entra e volta; primeira vez no curso → nivelamento; com
  3 escolhidos → pergunta qual trocar. Nos poemas portugueses, só para quem está logado com
  outra língua no perfil.
- ✔ **Português entra já** (poemas da Biblioteca, para quem fala es ou en).
- ✔ **Prosa** (próximo passo, a escolher com o Gere): a obra inteira na Biblioteca, cards só
  para o começo (~300 palavras, terminando num parágrafo que feche o sentido), revelado
  parágrafo a parágrafo; no fim, «Quero aprender o resto deste texto» registra o interesse.
  Os trechos antigos (Quixote, Quiroga, Martí, Twain, Lincoln) ficam guardados como
  candidatos. Até lá, a tela Textos só tem poemas.

### 9.2 O card de leitura

- Campo `leitura: true` no card (palavra fora da lista de frequência). Só estreia para quem
  tem escolhido um texto que a pede; nunca no sorteio geral, nas frases em vista, no
  nivelamento, no desafio nem em `dominioPorNivel`.
- Só a primeira fase (a palavra no original → resposta na língua de quem estuda): fica
  **dominado ao fim dela**, e as revisões de dominado também são nessa direção.
- Etiqueta na tela: «palavra rara · só para leitura». Não ganha frases de uso.
- Transparente «parecida» num card de leitura conta como total (ler é de graça).

### 9.3 Os dados

- `fonte/textos/<l>/<autor>--<poema>.json`, gerado por `fonte/importar-texto.js` a partir da
  Biblioteca e completado à mão: título, autor, ano, `biblioteca` (o caminho), e as linhas,
  cada uma com as palavras `{w, k}` (k = a chave do glossário) e o mapa `destinos`
  (chave → id do card | `gramatical` | `nome` | `transparente` | `+lema` por fazer), com `lema`,
  `classe`, `forma` e `def` (pt) do glossário, e `defEs`/`defEn` só nas palavras sem card.
  O build monta o `requer` de cada linha e o `requerTodas`, e só publica texto sem `+`.
- `public/cards/data/textos-<l>.js` (o app) e `public/cards/data/textos.json` (a lista dos
  prontos, que a Biblioteca lê para mostrar o botão).
- Progresso: `textos.emVista` ganha `escolha = { textos: [ids], em: ISO, propria: bool }`;
  a mescla (aparelho e `gravar_extras`) fica com a de `em` mais recente. `textos.lidos`
  continua com `<id>#<k>` para cada verso visto. Migração nova no `taioe-infra`.

### 9.4 Poemas automáticos (primeiros da fila)

| curso | 1º | depois |
|---|---|---|
| espanhol | Bécquer, Rima XXI | Machado, Proverbios y cantares XXIX; Martí, «Cultivo una rosa blanca» |
| francês | Verlaine, «Il pleure dans mon cœur» | Hugo, «Demain dès l'aube» |
| inglês | Dickinson, «I'm nobody! Who are you?» | Stevenson, «Requiem» |
| português | Gonçalves Dias, «Canção do exílio» | — |

Teasdale ficou de fora, e a Rossetti não está no Wikisource. Martí entrou em 24/10/2026, em 3º
(pedido do Gere: mais um poema e o começo do *Quixote* no espanhol); o *Quixote* (I, 1, até «de la
verdad», em três partes de prosa) é só por escolha.

### 9.5 Etapas

| # | etapa | situação |
|---|---|---|
| 1 | plano (esta seção) | feito (20/10) |
| 2 | formato novo, `importar-texto.py`, `destino-texto.py` e as checagens do build | feito (20/10) |
| 3 | motor: card de leitura, escolha, fatia de 1 em 3, fila automática, verso na hora; fim dos 400 | feito (20/10), `testar-textos.js` |
| 4 | app: aviso do verso (palavras clicáveis, três botões), tela Textos, vitrine | feito (20–21/10), testado no local |
| 5 | infra: `escolha` em `gravar_extras` (migração) | infra PR #14; testes do banco no local passaram |
| 6 | Biblioteca: os poemas automáticos na língua original, com glossário; o lema dos poemas pt | feito (biblioteca branch `textos-nos-cards`) |
| 7 | cards das palavras dos poemas automáticos (levas) | es, en, pt feitos (21/10); fr em andamento |
| 8 | Biblioteca: o botão e a entrada pelo texto (`/cards/?texto=<id>`) | feito (21/10), testado no local |
| 9 | teste, produção, manual 17.4 reescrito | manual feito; falta publicar |

### 9.6 Texto longo em partes (decidido em 24/10/2026)

Pedido do Gere, com a *Eneida*: «Para textos longos, vamos dividi-los em partes pequenas, para que o
usuário vá escolhendo aprender uma parte por vez.» Vale para todas as línguas (`LATIM.md`, D18–D21).

- ✔ **A parte** é uma unidade de sentido que fecha a frase: de 4 a 10 versos, ou de 50 a 120 palavras
  na prosa. Cada parte é um texto do app, com `obra` (o mesmo id em todas), `parte` (1, 2…) e `trecho`
  (o rótulo: «I, 1–7»); título, autor e página da Biblioteca são os da obra (o build confere, e
  confere que as partes vão de 1 a n).
- ✔ **Em sequência**: só a parte da vez, a primeira ainda não lida, pode ser escolhida
  (`Motor.textoEscolhivel`, `parteDaVez`, `parteSeguinte`); ela ocupa uma das `MAX_TEXTOS` vagas. Na
  tela Textos a obra aparece uma vez, «Aeneis · Vergílio · parte 1 (I, 1–7)», com «depois, a parte 2
  (I, 8–11)»; em «Os que você já leu», as partes lidas ficam juntas, sob a obra.
- ✔ **Fim de uma parte**: o aviso mostra a parte inteira e oferece «Aprender a parte 2» (que entra na
  vaga dela) ou «Escolher outro texto». No automático, a fila (`fila`) já leva à parte seguinte.
- ✔ **Sem gargalo entre as partes** (Gere, 29/10): quando todas as palavras da parte ativa já
  estrearam, as palavras da parte seguinte começam a entrar (até duas partes adiante), na mesma vaga
  dos textos; no automático, as do próximo texto da fila (`Motor.textosQueSoltamPalavras`). O verso
  da parte seguinte só aparece quando ela fica ativa. Dentro de um texto isso já era assim: as
  palavras vêm na ordem de leitura, sem esperar o verso de antes.
- O pedido da Biblioteca (`/cards/?texto=<id de uma parte>`) vale pela parte da vez da obra.
- Nada muda no banco: a escolha guarda ids de texto, e cada parte tem o seu.
- Na prosa (9.1, «Quero aprender o resto»), o resto vira as partes seguintes.
- ✔ **A prosa** (25/10/2026, com o começo do *Quixote*): na Biblioteca, um trecho por linha (de
  vírgula a vírgula, de 5 a 15 palavras, fechando a frase no fim da parte), e a página junta os
  trechos do parágrafo; nos Cards, `tipo: "prosa"`, e cada trecho entra no parágrafo assim que as
  palavras dele fecham a ida (a carta mostra o parágrafo crescendo, sem itálico; os avisos dizem
  «trecho» onde o poema diz «verso»). As partes se fazem com `fonte/importar-texto.py --parte N
  --linhas A-B --trecho "rótulo"` (o rótulo da prosa é o começo da parte: «Tenía en su casa…»).

## 10. O card de contraste nas línguas vivas (decidido em 23/10/2026)

O card de contraste nasceu no latim (`LATIM.md` §3.7). Em 23/10 o Gere pediu o mesmo nas línguas
vivas, «fazendo os ajustes necessários para ensinar as coisas mais relevantes».

- **O card.** A frase na língua de quem estuda e, como alternativas, de 4 a 5 frases da língua
  ensinada que confundem com a certa. É só múltipla escolha, também na revisão. **Sempre
  exatamente um em jogo** (Gere, 29/10, refeito em 31/10: até então nenhum tinha aparecido para
  ele, porque esperavam as palavras dominadas): visto e por dominar há um só; sem nenhum, a
  próxima vaga de card novo é de um contraste, mas só quando o sorteio dá card novo (nada fura o
  sorteio entre novo e revisão). Não espera as palavras: vem o que tem menos requisitos
  (`requerTodas`) por saber; no empate, o mais fácil (A1, A2, B1) e a ordem do arquivo
  (`contrasteDaVez` no `app.js`). Não entra pelos inéditos. No latim vale o mesmo, e os conceitos
  de gramática seguem com «pelo menos um em jogo» (`semNenhumEmJogo`). Três acertos seguidos o
  dominam, e depois
  ele volta por data. Dois do mesmo conjunto nunca vêm seguidos. Os cards de um conjunto (de 2 a 4)
  têm as mesmas alternativas. A nota traz a regra, o sentido de cada alternativa certa e o porquê
  de cada errada (✗).
- **As alternativas erradas podem ser frases impossíveis** (Gere, 23/10: «nada indica para o
  usuário que todas as frases dos distratores são possíveis. Quero que entre ali todas as frases
  que podem confundir com a certa, sejam possíveis ou não»): o erro típico de quem fala a língua
  de casa (*cuando llegar*, *yo gusto del libro*, *voy de autobús*). Nenhuma alternativa pode estar
  certa para nenhuma pergunta do conjunto, nem em outra região nem no sentido raro (manual §6.1).
- **Só contraste.** Sem o card de forma (nomear o tempo não ajuda a falar) e sem o de conceito: a
  regra vai na nota. O card de lacuna fica para depois do piloto.
- **A ordem.** Piloto no espanhol para brasileiros (`es-pt`, `"publicos": ["pt"]`); depois inglês
  e francês para brasileiros; os outros públicos por último. Só contrastes que valem em todo o
  mundo da língua (fora o *vosotros*, o *leísmo* e o perfeito × indefinido).
- **A conferência.** O Wiktionary, pelo kaikki, como no latim: `fonte/contrastes/formas.py`
  baixa a página de cada palavra (o acento conta), e `fonte/contrastes/contrastes.py <leva>` confere
  cada forma anotada (tempo, modo, pessoa), a existência de toda palavra das alternativas certas
  e o card de cada lema, e grava `fonte/cards/<língua>/NN-contrastes.json`. A leva fica em
  `fonte/contrastes/cache/levas/` (fora do git). Depois, a conferência às cegas por um agente.
  O Wiktionary não julga sintaxe: a frase errada de propósito não se confere.
- **Mais tarde:** a mesma conferência pode passar pelos 500 cards de conjugação (o rótulo de cada
  `formasEs`, `formasEn`, `formasFr`), se o Gere quiser.

| # | etapa | situação |
|---|---|---|
| 1 | motor, app, build e varredura para o contraste em qualquer baralho; `publicos` | feito (23/10, branch `contraste-linguas-vivas`) |
| 2 | piloto `es-pt`: 15 conjuntos, 32 cards (12 pontos, A1–B1), Wiktionary e às cegas | feito; aprovado pelo Gere em 23/10 |
| 3 | Catálogo `es-pt` no teste e na produção, merge | 23/10 (cards PR #42) |
| 4 | inglês para brasileiros: 18 conjuntos, 40 cards (17 pontos, A1–B1), Wiktionary e às cegas | aprovado e no ar em 23/10 (cards PR #43, Catálogo `en-pt`) |
| 5 | francês para brasileiros: 17 conjuntos, 38 cards (A1–B1), Wiktionary e às cegas | aprovado e no ar em 23/10 (cards PR #44, Catálogo `fr-pt`) |
| 6 | os outros públicos (es e en) | depois |
