# Latim nos Cards (decidido em 21/10/2026)

Pedido do Gere em 21/10: um curso de latim só por trilhas de texto, sem nivelamento; cards de
gramática (sobretudo os casos); as frases dos textos viram cards; as frases de uso vêm todas de
textos reais, de uma biblioteca de apoio; o latim eclesiástico é a referência para tudo; a pronúncia
fica para depois. A contraproposta foi aceita no mesmo dia, com as decisões abaixo. Este arquivo é o
contrato do latim; o que for regra de card entra no manual quando o piloto fechar.

**As respostas do Gere (21/10)**:
- ✔ D1 = (b): «Por ora, vamos usar a vulgata antiga, por segurança». Todo texto bíblico vai na
  **Vulgata Clementina**; a Nova Vulgata fica para depois, se for o caso. Onde abaixo se lê [NV],
  leia-se Clementina.
- ✔ D2: só para quem fala português (`la-pt`).
- ✔ D3: tradução em prosa, fiel à gramática.
- ✔ D4: o card de conceito com a definição e a pergunta por exemplo real («Beleza»).
- ✔ D5: os 36 textos aprovados.
- ✔ D6: «Pode rodar o piloto». E mais: **as orações vão para a Biblioteca, na página de
  Catolicismo, com o nome «Orações» entre os autores**.

**As respostas do Gere (22/10, à noite), para a leva 2 — feitas em 22 e 23/10** (o que saiu está no fim desta lista):
- ✔ D11. Primeiras frases: trocar metade. Saem 16 religiosas: f003 Tu es Petrus, f005 Dominus meus,
  f006 Ecce homo, f008 Sitio, f018 Ecce ancilla, f020 Tu es Christus, f022 Magnificat, f024 Deo
  gratias, f026 Dominus vobiscum, f027 Et cum spiritu tuo, f029 Requiescat, f030 Beati pauperes,
  f035 Consummatum est, f038 Ora pro nobis, f039 Christus vincit, f040 Ubi caritas. Entram, em ordem
  de gramática: Errare humanum est; Tempus fugit; Ars longa, vita brevis; Dum spiro, spero; Cogito,
  ergo sum; Cave canem; Sapere aude; Iacta alea est; Festina lente; In vino veritas; Panem et
  circenses; Vae victis!; O tempora, o mores!; Audentes fortuna iuvat; Gutta cavat lapidem; Lupus
  est homo homini; Si vis pacem, para bellum; Homines, dum docent, discunt; Quis custodiet ipsos
  custodes? Cuidado: palavra que só aparece numa frase que sai perde o caminho na trilha (e as frases
  de uso que a pedem); tirar junto ou dar-lhe outro lugar. Depois, `cards_de_forma.py` e build.
- ✔ D12. Nova leva (~100 cards): Catulo 85 (Odi et amo), o começo de Fedro I,1 (o lobo e o cordeiro)
  e a Regina caeli, com palavras, trechos e frases de uso.
- ✔ D13. Frases de uso das palavras novas: metade clássica. Montar um segundo corpus com os
  clássicos em domínio público (Cícero, César, Vergílio, Ovídio, Sêneca, Fedro…) ao lado da
  Clementina (`fontes.json`), e escolher meio a meio.
- **O que saiu da leva 2** (cards PR da leva 2; biblioteca PR #22, no ar):
  - primeiras frases: 43 (24 fora da Bíblia e da liturgia), com *Ubi bene, ibi patria* no lugar de
    *Quis custodiet* (três palavras difíceis) e *Mater artium necessitas* no lugar de *O tempora, o
    mores!* (as gramáticas divergem sobre o caso da exclamação); 38 palavras novas; saíram 12
    palavras que ficaram sem frase e as 24 frases de uso delas. `fonte/latim/primeiras.py` aplica;
  - os conceitos ganharam exemplos dessas frases, intercalados;
  - textos: Catulo 85 (2 versos), Fedro I,1 (os 8 primeiros; a fábula inteira na Biblioteca) e a
    Regina caeli (4 linhas): 14 trechos (`09-trechos-2`), 45 palavras (`08-palavras-2`); na tela
    Textos, orações e clássicos intercalados (`ordem` no `textos.py`);
  - frases de uso: 89 (`10-usos-c`), meio a meio entre clássicos e Vulgata, feitas por cinco agentes
    em lotes e conferidas com o Wiktionary; 16 notas de contexto corrigidas por uma revisão contra o
    texto vizinho no corpus. 11 palavras ficaram sem frase de uso (sem candidata boa);
  - corpus clássico: o Perseus (`corpus.py baixar-classicos` e `classicos`), 197 mil frases;
  - tradução às cegas (§4.3): na 1ª rodada as frases novas passaram em 45%; na 2ª, com outro
    tradutor, as primeiras frases e os trechos em 83% e as frases de uso em 80%. As certas que não
    passavam entraram no gabarito. A meta de 9 em 10 ainda não foi alcançada na primeira rodada: o
    gabarito precisa prever mais ordens de palavras.
  - cards de forma: 192.

## 1. As decisões (como foram propostas)

★ = a recomendação.

**D1. O texto da Bíblia (salmos, Gênesis, João, Magnificat…).** A Nova Vulgata (NV) é da Libreria
Editrice Vaticana (editio typica altera, 1986, «todos os direitos reservados»), e a regra da Taioé
(17/10, na Bíblia Taioé) só admite citação curta de texto da LEV: duas ou três frases, com link.
- (a) ★ Pedir a NV à LEV no mesmo email do Catecismo (eu reescrevo `../anexos/pedido-lev.md`; se ele
  já foi enviado, escrevo um segundo, curto). Enquanto a resposta não vem (de 8 a 12 semanas, pelo
  que se lê), o curso começa pelo que é domínio público, e as frases de uso podem citar a NV, uma
  frase por card, com link, como a Bíblia Taioé já faz. Se a LEV negar ou não responder, os textos
  bíblicos vão na Vulgata Clementina.
- (b) A Vulgata Clementina (domínio público) em tudo, desde já. Os salmos ficam os do canto
  gregoriano e dos Padres («Dominus regit me», e não «Dominus pascit me»).
- (c) A NV inteira já, sem autorização. Não recomendo: contraria a regra de 17/10.

**D2. Para quem é o curso.** ★ Só `la-pt` no começo: explicações, notas e respostas em português,
como a Biblioteca. `la-es` e `la-en` depois, se valer: cada público pede as próprias aceitas, e no
latim elas são o grosso do trabalho.

**D3. A tradução dos versos e dos hinos nos cards.** O card de frase precisa de uma resposta em
português. ★ Tradução de estudo, em prosa, fiel à gramática do latim (quem estuda precisa ver ali o
caso e o tempo), **sem** o método do Versificador, que é para traduzir poema. Na Biblioteca, o texto
latino continua sem tradução nossa (só a de domínio público, se for boa, como manda a regra dela).

**D4. O card de conceito.** ★ A definição curta que você pediu, e a pergunta feita com um exemplo
real: «Em *Laudate Dominum*, em que caso está *Dominum*?» — escolher entre os casos, depois escrever o
nome. A definição aparece depois da resposta, e cada revisão traz outro exemplo. A alternativa, só a
definição («Acusativo → objeto direto…»), ensina a decorar a definição, não a ler.

**D5. Os textos.** A lista do §6 (36 textos em quatro níveis, mais a reserva): cortar, trocar ou
aprovar. Nenhum card nasce antes do sim (regra antiga dos textos).

**D6. Piloto antes da escala.** ★ Primeiro um piloto no ar: as 40 primeiras frases, os conceitos dos
casos e do presente, e quatro textos curtos (Glória ao Pai, Pai-Nosso, Ave-Maria e o epigrama de
Marcial), umas 300 fichas. Você estuda uma semana e aponta; só então as levas grandes. O curso
inteiro passa de 2.500 fichas: defeito de desenho achado depois delas custa caro, e o piloto também
mede o custo de cada card.

## 2. Os pontos cegos, e o que a proposta faz com eles

| # | ponto cego | solução | § |
|---|---|---|---|
| 1 | Direito autoral: a NV é da LEV; o latim das *Confissões* que temos no cache é a edição de O'Donnell (1992), obra editorial moderna; idem as edições modernas dos clássicos | D1; edições do séc. XIX ou do começo do XX como base (Knöll, CSEL 33, 1896, nas *Confissões*, como já fez a tradução) | 7 |
| 2 | Frase de uso real puxa palavras que a pessoa nunca vai estudar: num curso só de textos, ela ficaria presa para sempre | a frase de uso só pede palavras das primeiras frases (o «texto zero», que todos têm) ou do mesmo texto; no máximo uma a mais, com a tradução ao lado, que não trava | 3.2 |
| 3 | Palavra que só aparece uma vez (*virens*, *baculus*, *favilla*) não rende frase de uso | card de leitura, o que já existe: sem frase de uso | 3.1 |
| 4 | O lema não ensina a forma: *mihi* é de *ego*, *fui* de *sum*, *tulit* de *fero* | o card mostra o enunciado inteiro (as partes principais); pronomes e verbos irregulares ganham card de conceito, perguntado pelas formas | 3.1, 3.5 |
| 5 | Homógrafos e enclíticas: *cum* preposição × conjunção, *quod*, *est* (de *sum* e de *edo*), *-que*, *mecum* | lemas separados; a tokenização separa a enclítica (*virumque* = *virum* + *-que*) | 8 |
| 6 | Nomes próprios (Troia, Aeneas, Sabidius, Israel) | sem card; a nota diz o caso («*Troiae*: genitivo de *Troia*») | 3.1 |
| 7 | Polissemia: *res*, *ratio*, *virtus* têm dezenas de sentidos, e o manual não admite distrator que seja sentido raro | cada distrator conferido contra o Lewis & Short (1879, domínio público) | 3.1 |
| 8 | Sentido eclesiástico × clássico (*confiteor*, *saeculum*, *gratia*, *pietas*) | o card ensina o eclesiástico primeiro; o sentido do texto clássico vem na nota da frase | 3.1 |
| 9 | Muito latim é transparente para quem fala português (*rosa*, *gloria*, *terra*) | a transparência que o build já calcula tira do jogo; os falsos amigos ficam (*vir*, *cano*, *ora*, *res*, *gens*, *quare*) | 3.1 |
| 10 | Grafia: j/i, u/v, æ/ae, *coelum*/*caelum*, *michi* | tudo na grafia da NV; a resposta é em português, então ninguém digita latim | 9 |
| 11 | A resposta escrita de uma frase inteira | gabarito com alternativas, teste com traduções às cegas, «deu quase» de frase | 4 |
| 12 | Distrator de frase que se acerta só pelo vocabulário | os distratores são a mesma frase lida com a gramática errada | 3.3 |
| 13 | Sem nivelamento, o que vem primeiro? | primeiras frases em ordem de gramática, conceito na hora em que a frase precisa, nível de cada texto à vista na escolha | 5 |
| 14 | Pronúncia adiada | a quantidade das vogais fica nos dados desde já: a pronúncia não vai exigir anotar tudo de novo | 9 |
| 15 | A regra «o sistema é igual em todas as línguas» (06/10) | o latim é a exceção declarada, num modo de curso (`modo: 'trilhas'`); a regra ganha a ressalva | 10 |
| 16 | A tradução dos versos esbarra na regra do Versificador | D3 | 1 |
| 17 | «Frase latina famosa» que não está em texto nenhum | só citação exata e conferida: *Ama et fac quod vis* é, em Agostinho, *Dilige, et quod vis fac*; *Ora et labora* não está na Regra | 3.4 |

## 3. Os tipos de card

Todos só com a ida (latim → português), como o card de leitura de hoje: um acerto na múltipla
escolha e dois escrevendo (três seguidos, contando a múltipla), e o card fica dominado; as revisões
também são na ida.

### 3.1 Palavra (`la-p…`)
- Mostra o enunciado do dicionário: «dominus, -i, m.» (2ª decl.); «laudo, laudare, laudavi,
  laudatum» (1ª conj.); «bonus, -a, -um»; «omnis, -e»; «in (+ abl. / + ac.)».
- A resposta é o sentido em português, o eclesiástico primeiro («gratia» → «a graça»); os outros vão
  nas aceitas e na nota. Verbo pelo infinitivo («louvar»), aceitando a 1ª pessoa («louvo»).
- **Toda palavra do texto tem card**, também as de função (preposição, conjunção, pronome): no
  latim é nelas que o caso mora (*in* + ablativo = em; + acusativo = para dentro de). Diferença do
  §17.2 do manual, onde a palavra de função não tem card.
- Fora: nome próprio; *amen*, *alleluia*, *hosanna*. A transparente sai do jogo pela regra de hoje
  (sem ida e volta, a «parecida» conta como total, como no card de leitura).
- Card de leitura: a palavra fora da lista de frequência do latim (§7), sem frase de uso.
- Distratores: parônimos latinos (*liber*/*libet*/*libero*; *malum*/*malus*; *porta*/*portus*/*porto*), o
  falso amigo português (*cano* não é «cano»; *ora* não é «ora!»), vizinhos de sentido; nenhum que seja
  sentido do Lewis & Short.

### 3.2 Frase de uso (`la-u…`), da biblioteca de apoio
- Uma a três por palavra comum, de texto real, com a referência (obra, passagem, edição) e o link
  quando houver.
- A frase mostra a palavra **noutra forma** que a do texto: é por ela que os casos e os tempos
  aparecem (*Laudate Dominum* no salmo; *Ecce ancilla Domini* e *Dominus vobiscum* nas de uso).
- Curta (até 10 palavras), e só com palavras que a pessoa vai ter: as das primeiras frases e as do
  mesmo texto; se não houver frase assim, uma palavra a mais, com a tradução ao lado, que não trava.
  `requer` e `requerTodas` como hoje.
- A nota explica a forma e a função: «*Domini*: genitivo singular de *dominus* (2ª decl.) — de quem é
  a serva». Sai dos dados da anotação, num molde fixo, para ficar igual em todos os cards.

### 3.3 Frase do texto (`la-t…`), dentro do arquivo do texto
- O texto vai em trechos de **até 10 palavras**, cortados onde a sintaxe deixa (uma oração, ou um
  grupo inteiro: preposição + nome, nome + adjetivo). No poema, um verso ou meio verso. Trecho que
  não fecha a frase: a nota mostra a frase inteira (como o antigo card de verso, manual §16).
- Destrava quando todas as palavras dele estão dominadas, como as frases de hoje, e entra na fila
  como card. Verso repetido aponta para o mesmo card.
- Múltipla escolha: os quatro distratores são **a mesma frase lida com a gramática errada** —
  sujeito e objeto trocados, outro tempo, outra voz, outro modo, genitivo lido como dativo. Em
  *Laudate Dominum, omnes gentes*: «O Senhor louva todas as nações», «Todas as nações louvam o
  Senhor», «Louvaram o Senhor todas as nações», «Louvai o Senhor de todas as nações». É a leitura que
  o latim pede, e não se acerta pelo vocabulário.
- A nota: a tradução de estudo e, palavra por palavra, só o que ensina (a forma e a função).
- A tradução segue as escolhas da Bíblia Taioé (`../biblia/ESCOLHAS.md`): Deus por «tu», imperativo
  plural com «vós» («Louvai», com «Louvem» nas aceitas), «Dominus» = «o Senhor», nomes da liturgia do
  Brasil, salmo com a numeração hebraica e a latina entre parênteses. Nunca mesóclise.

### 3.4 Primeiras frases (`la-f…`): o «texto zero»
- Umas 40, de 2 a 6 palavras, todas de texto real, com a referência. Livres desde o primeiro card
  (`requerTodas: []`, como os primeiros passos das outras línguas). Todos as têm, e não contam entre
  os 1 a 3 textos escolhidos.
- Em ordem de gramática, cada uma trazendo uma coisa: *Deus caritas est* (1Jo 4,16) e *Ego sum lux
  mundi* (Jo 8,12) para o nominativo e o *est*; *Laudate Dominum* (Sl 117 (116),1), *Carpe diem*
  (Horácio) e *Omnia vincit Amor* (Vergílio: a ordem não diz quem é o sujeito) para o acusativo;
  *Ecce ancilla Domini* (Lc 1,38) para o genitivo; *Pax vobis* (Jo 20,19) e *Deo gratias* para o
  dativo; *Requiescat in pace* para o ablativo; *Magnus es, Domine* (*Confissões* I,1) para o
  vocativo; *Veni, vidi, vici* (Suetônio) para o perfeito; *Veritas liberabit vos* (Jo 8,32) para o
  futuro; *Tolle, lege* (*Confissões* VIII,12) para o imperativo. A lista inteira sai com o piloto.
- Escolhidas também para cobrir as ~100 palavras mais frequentes: são elas o vocabulário de base,
  que as frases de uso podem pedir de qualquer um.
- As bíblicas, enquanto a D1 não se resolve: só as que a Clementina e a NV escrevem igual.

### 3.5 Conceito (`la-g…`)
- Uns 50: os casos (e o locativo), as cinco declinações, o neutro e a concordância; as conjugações,
  as pessoas, os seis tempos do indicativo, a passiva, os depoentes, o subjuntivo, o imperativo, os
  infinitivos, os particípios, o gerúndio e o gerundivo; os pronomes pessoais, os demonstrativos e o
  relativo; *sum*, *possum*, *volo*, *eo*, *fero* e *fio*; o ablativo absoluto, a oração infinitiva,
  *ut*/*ne* e *cum* com subjuntivo, o dativo de posse, comparativo e superlativo, as preposições de
  cada caso e as enclíticas.
- Cada um: o nome, a definição em uma ou duas linhas, a tabela das terminações quando houver, e de 6
  a 10 exemplos reais, de preferência das primeiras frases, com a palavra destacada.
- A pergunta (D4): um exemplo com a palavra destacada; múltipla escolha entre os conceitos da mesma
  família (os casos entre si, os tempos entre si); depois, escrever o nome («acusativo»; «perfeito do
  indicativo», aceitando «perfeito» e «pretérito perfeito»).
- Entra logo antes da primeira frase que precisa dele (campo `conceitos` da frase, que o build tira
  da anotação). A frase não espera o conceito ficar dominado; basta ele ter estreado.
- Terminologia das gramáticas brasileiras: subjuntivo (não conjuntivo), futuro perfeito.

### 3.6 Forma (`la-x…`): o caso de cada palavra do texto (aprovado e feito em 22/10)
Pedido do Gere (22/10): perguntar o caso das palavras dos textos, «pelo menos as que vão causar mais
dificuldade»; **só por escrito** (os casos já vieram nos cards de conceito) e **uma vez só**: acertou
de primeira, nunca mais; errou, volta até acertar **3 vezes seguidas**, e então sai de vez.
- O card: o verso (ou a primeira frase) inteiro, a palavra destacada, «Em que caso está a palavra
  destacada?», campo de escrever. Sai do build, da anotação que trechos e frases já têm (`palavras[].f`);
  nenhuma ficha escrita à mão. Um card por ocorrência; a mesma forma no mesmo caso, de novo no mesmo
  texto (*nobis* dativo, duas vezes no Pai-Nosso), vira um card só. Nomes próprios ficam de fora.
- Aceita o caso com ou sem o número e as abreviações (`acus.`, `abl.`); erro de letra é «quase», e
  quem julga é a pessoa (regra do motor).
- **A nota de dificuldade**, calculada no build, por três sinais:
  1. a terminação ambígua: quantos casos a forma pode ter no índice (`formas.py`), sem contar o
     vocativo igual ao nominativo, que o contexto resolve (*rosa*, *nostrae*, *nobis*, *debita*);
  2. o caso pouco natural para quem fala português: dativo e ablativo sem preposição pesam mais,
     genitivo médio; sujeito no nominativo e objeto no acusativo, quase nada;
  3. a forma irregular: pronomes (*te*, *nobis*, *hoc*) e as declinações 3ª a 5ª.

  Protótipo no piloto (22/10): das 58 palavras declináveis dos quatro textos, no topo *Sancta*,
  *plena*, *nostrae*, *nobis*, *debitoribus*, *tua*, *fructus*; no fim *Dominus*, *Panem*,
  *tentationem*, *voluntas*. Mais tarde (★ D9) a nota passa a somar o erro real de cada tipo
  (caso × declinação × número), tirado das respostas.
- ✔ Decisões do Gere (22/10, «Sim, pode seguir»), todas como recomendadas:
  - **D7. Quais perguntar.** Do corte (`CORTE` = 2,0) para cima, sempre (`sempre`); abaixo, sorteio
    de 1 em 4 (`SORTEIO_DA_FORMA`), fixo por pessoa e card (hash do uid). O erro puxa os parecidos:
    errou um dativo, os dativos fáceis entram, até 3 acertos seguidos daquele caso
    (`ACERTOS_QUE_SOLTAM`, `Motor.formaPuxada`, pelo histórico dos cards de mesma resposta).
  - **D8. Quando.** Logo depois da primeira vez do verso (ou da primeira frase), o verso mais recente
    primeiro; no máximo duas estreias de forma seguidas (`FORMAS_SEGUIDAS` em `ordenarTrilhas`). A
    estreia de forma não conta na alternância dos outros cards nem no teto de quatro frases.
  - **D9. Verbos.** Mesma mecânica para o tempo e o modo. Vale o que o conceito aceitava: sem o
    modo, é o indicativo («perfeito»); sem o tempo, o presente («subjuntivo»); no particípio, o
    tempo é opcional. Número, pessoa, gênero e voz não pesam.
  - **D10. Conferência às cegas.** Feita em 22/10: um agente anotou às cegas os 161 cards e bateu
    com a anotação em todos.
- **Pedido do Gere (22/10): pergunta trocada.** Quando a resposta não fala de gramática nenhuma
  (`Motor.foraDaPergunta`), o app não marca erro: avisa e devolve a vez, uma vez por aparição. Se é
  o significado certo da palavra (o card do lema aceita), o aviso diz que está certo, mas a pergunta
  é o caso. Vale também no card de conceito.
- Feito (cards PR do card de forma; infra PR #16, tipo `forma` no catálogo):
  `fonte/latim/cards_de_forma.py` → `fonte/cards/la/07-formas.json` (161 cards: 78 sempre, 83 por
  sorteio; `--lista` mostra as notas). Mudou a anotação de um trecho ou de uma primeira frase:
  rodar de novo, e o build recusa o card de forma que não bate com o verso. O card estreia na
  escrita; acertado de primeira, ou 3 seguidos depois de um erro, fica `dominado` sem `voltaEm` e
  sai de todas as filas (`Motor.encerrado`, `filaDe` = `'fora'`). O «Já conheço» não aparece nele.
- Mais tarde: a nota passa a somar o erro real de cada tipo (caso × declinação × número), tirado das
  respostas.

### 3.7 Contraste (`la-k…`): a mesma frase, outro caso (aprovado e feito em 22/10)
Pedido do Gere (22/10): depois que os casos estiverem aprendidos, uma frase simples em português e,
como alternativas, as mesmas palavras latinas, na mesma ordem, mudando só os casos; e outros cards
com as mesmas alternativas e outra frase em português. **Só múltipla escolha.** E outros cards do
mesmo jeito, que mostrem as sutilezas da gramática.

- **O conjunto.** Um molde de 4 alternativas latinas, todas gramaticais e cada uma com um sentido
  diferente, e de 2 a 4 cards que o usam, cada um com a sua frase portuguesa:

  | português (a pergunta) | a certa, entre as quatro |
  |---|---|
  | O servo vê o senhor. | *Servus dominum videt.* |
  | O senhor vê o servo. | *Servum dominus videt.* |
  | O servo do senhor vê. | *Servus domini videt.* |
  | Servo, o senhor vê. | *Serve, dominus videt.* |

  As quatro alternativas são *Servus dominum videt* · *Servum dominus videt* · *Servus domini videt*
  · *Serve, dominus videt*. A ordem das palavras é a mesma em todas, e é isso que obriga a ler a
  terminação. Os cards do mesmo conjunto se espaçam na fila (nunca dois seguidos), e a ordem das
  alternativas se sorteia a cada vez.
- **As palavras** são só as que a pessoa já tem (primeiras frases e textos escolhidos), e as frases
  latinas são feitas por nós, simples, conferidas às cegas como a anotação (§8, D10).
- **Quando entra.** Quando os conceitos dos casos do conjunto estão dominados: o `requerTodas` do card
  leva os cards de conceito e os das palavras, e o motor já trata os dois como «sabidos»
  (`Motor.liberadaEm`).
- **Outros contrastes** (o mesmo card, outro assunto), do mais simples ao mais fino:
  1. nominativo × acusativo, com a ordem trocada (o exemplo acima);
  2. dativo × acusativo e genitivo × dativo nas terminações iguais (*rosae*, *domino*, *nobis*);
  3. preposição e caso: *in urbem* (para a cidade) × *in urbe* (na cidade); *cum* + ablativo;
  4. o neutro plural em -a × o feminino singular em -a (*arma* × *terra*);
  5. imperfeito × perfeito (*amabat* «amava» × *amavit* «amou»); presente × futuro na 3ª
     (*legit* × *leget*); *venit* (vem) × *vēnit* (veio), que só o contexto separa;
  6. voz ativa × passiva (*amat* «ama» × *amatur* «é amado»);
  7. reflexivo × não reflexivo (*se amat* «ama a si mesmo» × *eum amat* «ama-o»), e *suus* ×
     *eius* («a própria mãe» × «a mãe dele»);
  8. *ut* + subjuntivo (para que) × *ut* + indicativo (como); *cum* (com) × *cum* + subjuntivo
     (quando, como);
  9. o locativo (*Romae*, em Roma) × o genitivo; o ablativo de comparação × *quam*.
- **Decisões** ✔ (o Gere, 22/10: «Pode fazer o card de contraste com as recomendações de D14 a D17»):
  - **D14. Quando entra.** ★ Quando os conceitos dos casos do conjunto estão dominados. Ou: quando os
    cards de forma daqueles casos estão fechados.
  - **D15. Como se domina.** ★ Três acertos seguidos na múltipla escolha, e depois volta por data,
    como os outros cards (a revisão espaçada é o que mantém a lição). Ou: uma vez só, como o card de
    forma.
  - **D16. Quantas frases por conjunto.** ★ De 2 a 4: só as que a mesma escolha distingue sem
    ambiguidade.
  - **D17. Por onde começar.** ★ Os itens 1 a 3 (os casos e as preposições), uns 10 conjuntos e 30
    cards na primeira leva; os de verbo (5 e 6) quando o perfeito e a passiva tiverem estreado; os 7 a
    9 depois.
- **Feito** (cards PR do contraste; infra PR #17, tipo `contraste` no catálogo):
  - A leva fica em `fonte/latim/cache/levas/contrastes-1.json` (fora do git, como as outras):
    por conjunto, as 4 alternativas com o sentido e a anotação palavra por palavra, e os cards
    (a frase portuguesa e o índice da certa). `python -I fonte/latim/contrastes.py <leva>` passa a
    anotação das **quatro** pelo `conferir.py` e grava `fonte/cards/la/11-contrastes.json`.
  - Primeira leva: 10 conjuntos, 27 cards (k01–k10): nominativo × acusativo com a ordem trocada
    (lobo e cão, pai e mãe, a gota e a pedra, o cordeiro e o lobo de Fedro), *fugio* e *credo*
    (a regência que o português engana: «foge do lobo» = *lupum*, «acredita no homem» = *viro*),
    dativo × genitivo (*viro*/*viri*, *patri*/*patris*, *filio*/*filii*), o vocativo (*Lupe,
    pastor te videt*) e *in* + acusativo × ablativo (*in tenebras* / *in tenebris*). Quase tudo
    com palavras das primeiras frases; k09 e k10 pedem o Fedro e o Pai-Nosso (e o Glória).
  - Conferência às cegas (22/10, D10): um agente, só com a frase portuguesa e as quatro, acertou as 30
    da primeira versão e não achou latim errado. Pelo que ele apontou, saíram 3 cards de sentido
    estranho («o pastor do lobo», «o cão do lobo vê»), que ficam só como alternativa errada; a frase
    que começa pelo verbo ganhou o sujeito («Ele ama…», lida antes como imperativo); e «foge nas
    trevas» virou «no meio das trevas» (no Brasil, «em» com verbo de movimento soa como direção).
    Regras para as próximas: os dois sentidos do par plausíveis; nada de pergunta começando pelo
    verbo; cuidado com as formas iguais (*canis* nominativo e genitivo, vocativo igual ao
    nominativo, em que a pista é só a vírgula).
  - O card: `la` (a certa), `pt` (a pergunta), `distratoresLa` (as outras três), `conjunto`,
    `requerTodas` (as palavras do conjunto e os conceitos de todos os casos que aparecem nas
    quatro), `palavras` e `conceitos`. A nota traz a anotação da certa, a explicação e o sentido de
    cada alternativa, uma por linha. O build confere 4 alternativas diferentes, do mesmo tamanho,
    as mesmas em todo o conjunto, e de 2 a 4 cards por conjunto.
  - No motor (`ehContraste`): sempre `VOLTA` (pergunta em português, resposta em latim) e
    `multipla`, também na revisão; três acertos seguidos → `dominado`, com `voltaEm` por data.
  - No app: entra como frase presa (`recolherFrasesLiberadas`), mas não fura a fila (não é
    «fresca»: os conceitos destravam muitos de uma vez), e entra um a cada duas estreias;
    `semConjuntoSeguido` e `conjuntoAnterior` impedem dois do mesmo conjunto seguidos, na estreia
    e nas filas. Sem «Já conheço». O catálogo leva as quatro frases latinas como `alternativas`.

## 4. A resposta escrita: aceitar tudo o que está certo
1. **Um funil estrito** (feito no piloto): acento, maiúscula, pontuação, artigo e «já» não contam;
   o plural e o pronome contam. O funil largo das outras línguas juntava «nação» e «nações» e tirava
   o «nos» de «perdoa-nos», e no latim é justamente isso que o card cobra. Vale só no modo trilhas
   (`PT_DO_LATIM` no motor), e o build valida o latim nele.
2. **Gabarito com alternativas** em cada frase, no lugar da lista solta: `[Louvai ~ Louvem] o
   Senhor, [todas as nações ~ todos os povos]`; a parte opcional com a alternativa vazia (`[Eu ~]
   creio`) e colchete dentro de colchete. Chave e barra ficaram de fora: `{a|b}` é o card de gênero, e
   a barra separa dois sentidos. O motor abre o molde na hora (até 2.000 frases, com cache), e o
   pacote leva só o molde; o build recusa molde malformado ou grande demais.
3. **O teste antes de publicar**: cada frase é traduzida às cegas por cinco agentes, com instruções
   diferentes (literal, natural, outra ordem, outros sinônimos), e toda tradução certa tem de passar.
   Meta: 9 em 10 na primeira rodada. O que falhar amplia o gabarito; a tradução errada pode virar
   distrator.
4. **«Deu quase» de frase**, mais largo que o de hoje: as mesmas palavras em outra ordem, ou uma
   palavra diferente, a partir de três palavras (`parecidoDeFrase`). Quem julga continua sendo a
   pessoa (nenhuma semelhança vira acerto sozinha, regra do motor). O distrator escrito igual é erro
   seco: é a leitura errada que o card já conhece.
5. **O retorno**: os «quase» julgados como acerto e as contestações vão para a curadoria e daí para
   o gabarito, pela rotina de retorno.
6. **Teto**: trecho de até 10 palavras latinas; resposta de até 120 caracteres (o teto do manual).

## 5. A ordem do estudo
- **Entrada**: sem nivelamento. A tela de textos abre direto, com os textos por nível («bom para
  começar» nos do nível 1), o primeiro verso e quantas palavras cada um pede. A pessoa marca de 1 a 3;
  ao menos um, porque sem texto não há o que estudar. Sem tutorial: a tela se explica.
- **As vagas de card novo**, nesta ordem (feito no piloto, `ordenarTrilhas` no app):
  1. na frente, até duas frases destravadas nas últimas 24 horas (trecho ou frase de uso);
  2. duas estreias do texto zero para uma dos textos escolhidos. No texto zero, frase a frase: os
     conceitos que ela pede, ela e as palavras dela. Nos textos: as palavras na ordem de leitura, em
     rodízio entre eles, cada uma logo depois dos conceitos do primeiro trecho em que aparece. A
     palavra que os dois pedem vem pelo texto escolhido («pater» está no Glória e na 36ª frase
     inicial);
  3. as frases destravadas mais antigas, uma a cada duas estreias.

  A fila se refaz a cada card, então a alternância conta as estreias desde a última de cada tipo
  (sem isso a palavra do texto ficava sempre em terceiro e nunca chegava); a estreia de conceito não
  conta. Sem palavra avulsa e sem sorteio por nível: tudo sai dos textos e das primeiras frases. O
  trecho e a frase de uso esperam o dia seguinte ao domínio da última palavra, como nas outras línguas.
- **A tela Textos** abre direto na primeira vez; «Começar» só com um texto marcado (sem nenhum,
  ele fica apagado e um aviso pede um texto). A caixa marcada nunca se desativa: desativada, ela
  ficava cinza e parecia pular de cor a cada clique (o Gere apontou, 21/10). Texto terminado sai da escolha; sem nenhum, o app
  volta à escolha.
- **Ritmo**: o do motor de hoje (até 50 em jogo, pelo menos um novo a cada três, 6 respostas entre
  duas aparições), com a meta da ida, já que só há ida. Antes de publicar, simular o motor no modo
  novo com progresso inventado e levar os números a você (regra de agendamento).
  Feito em 21/10: sem a volta, a revisão da ida ficava com peso 10 contra ~100 do card novo, e o
  Gere viu quase só card novo. Agora a revisão ganha o peso da ida longe do alvo (`pesosDasFilas`),
  como a volta vazia dá nos outros cursos: no começo, meio a meio (simulado: 39 novos em 70
  respostas, contra uns 9 em 10 antes), caindo até o piso quando a ida chega ao alvo.
- **Texto terminado**: o app oferece outro do mesmo nível ou do nível de cima.

## 6. Os textos propostos

Nível = dificuldade estimada; a anotação vai medi-la (palavras novas, tamanho dos trechos,
conceitos). [NV] = depende da D1. Os trechos são curtos de propósito: o começo de cada obra.

| nível | texto | o que traz de mais útil |
|---|---|---|
| 1 | Glória ao Pai | dativo de três declinações (*Patri*, *Filio*, *Spiritui*); *in saecula saeculorum* |
| 1 | Pai-Nosso | vocativo, subjuntivo de pedido (*sanctificetur*, *adveniat*, *fiat*), imperativo, dativo, *ne* + subjuntivo |
| 1 | Ave-Maria | vocativo, particípio (*benedicta*), genitivo, 4ª declinação (*fructus*) |
| 1 | Regina caeli | imperativo depoente (*laetare*), relativo, perfeito |
| 1 | Anima Christi | vocativos e genitivos em série, imperativos, acusativo com infinitivo, *ut* + subjuntivo |
| 1 | Sl 117 (116) [NV] | imperativo plural, perfeito passivo |
| 1 | Marcial I,32 (*Non amo te, Sabidi*) | vocativo em -i, *possum* + infinitivo |
| 2 | Ave verum corpus | particípios (*natum*, *passum*, *immolatum*), imperativo futuro (*esto*), vocativo *Iesu* |
| 2 | Salve Regina | particípio presente (*gementes*, *flentes*), demonstrativos, 5ª declinação (*spes*) |
| 2 | Sl 150 [NV] | ablativo com *in*, em série |
| 2 | Sl 23 (22) [NV] | perfeitos, futuro perfeito (*ambulavero*), depoente (*consolata sunt*) |
| 2 | Gn 1,1–5 [NV] | perfeito e imperfeito da narrativa, passiva (*ferebatur*), 5ª declinação (*faciem*, *dies*) |
| 2 | Jo 1,1–5 [NV] | imperfeito de *sum*, preposições, perfeito passivo |
| 2 | Mt 5,3–10 [NV] | futuro ativo, passivo e depoente (*possidebunt*, *vocabuntur*, *consolabuntur*) |
| 2 | 1Cor 13,4–8 [NV] | presente da 1ª, 2ª e 3ª conjugações e de *fero*, depoente, passiva, dativo (*veritati*) |
| 2 | Catulo 85 (*Odi et amo*) | verbo defectivo, pergunta indireta, infinitivo passivo |
| 2 | *Imitação de Cristo* I,1,1 | relativo, presente; o latim medieval simples |
| 3 | Credo (niceno-constantinopolitano) | particípios, depoentes, particípio futuro (*venturus*), passiva |
| 3 | Magnificat (Lc 1,46–55) [NV] | perfeitos em série, particípio depoente com genitivo (*recordatus misericordiae*) |
| 3 | Sl 1 [NV] | perfeitos irregulares (*abiit*, *stetit*, *novit*), 4ª declinação, relativos |
| 3 | Sl 51 (50),3–6 [NV] | imperativo depoente com genitivo (*miserere mei*), *ut* + subjuntivo passivo |
| 3 | Sl 121 (120) [NV] | os dois futuros: em -bo/-bit (*levabo*, *dormitabit*) e em -am/-et (*veniet*, *custodiet*) |
| 3 | Sl 130 (129) [NV] | futuro perfeito (*observaveris*), subjuntivo, comparação (*magis quam*) |
| 3 | Tantum ergo (estrofes 5 e 6 do Pange lingua) | subjuntivo depoente (*veneremur*), 4ª declinação (*ritui*, *sensuum*) |
| 3 | Dies irae, estrofes 1 a 3 | ablativo absoluto (*teste David*), particípio futuro, 5ª declinação |
| 3 | *Confissões* I,1,1 | vocativo, dativo de posse, subjuntivo (*donec requiescat*) |
| 3 | *Confissões* X,27,38 (*Sero te amavi*) | perfeitos sincopados (*vocasti*), irreal (*si… essent*) |
| 3 | Catulo 5 (*Vivamus, mea Lesbia*) | subjuntivo exortativo, futuro perfeito, gerundivo (*dormienda*) |
| 3 | Fedro I,1 (o lobo e o cordeiro) | mais-que-perfeito (*venerant*), narrativa, discurso direto |
| 3 | O Fortuna (*Carmina Burana*) | vocativo, 4ª e 5ª declinações (*statu*, *aciem*) |
| 4 | *Eneida* I,1–11 | relativo, imperfeito do subjuntivo (*conderet*), ablativo absoluto (*numine laeso*) |
| 4 | *Metamorfoses* I,1–4 | vocativo plural, imperativo, perfeito sincopado (*mutastis*) |
| 4 | Horácio, *Odes* I,11 (*Carpe diem*) | perfeito do subjuntivo (*quaesieris*, *dederint*), infinitivo depoente |
| 4 | Horácio, *Odes* III,30 (*Exegi monumentum*) | ablativo de comparação (*aere perennius*), futuro depoente e passivo (*moriar*, *dicar*) |
| 4 | Cícero, *Catilinárias* I,1 (começo) | futuro depoente com ablativo (*abutere patientia*), perguntas retóricas |
| 4 | César, *Guerra das Gálias* I,1 (começo) | particípio predicativo (*divisa*), ablativo de respeito, gerundivo |

- **Reserva**: Te Deum (começo), Veni Creator (duas estrofes), Regra de São Bento (prólogo, 1),
  Sêneca (*Cartas* I,1), Gaudeamus igitur, Sl 42 (41),2–4, Sl 8.
- **A lista pende para o religioso** (o Gere, 22/10): no nível 1 só Marcial é clássico. Antes da
  próxima leva, propor a ele textos curtos fora da liturgia para os níveis 1 e 2 (provérbios e
  máximas, Fedro, Marcial, epitáfios e inscrições, Gaudeamus igitur, Sêneca) — texto novo só nasce
  depois do sim dele.
- **Interesse**: Ave verum e Dies irae (Mozart, Verdi), O Fortuna (Orff), Tantum ergo; *Veni, vidi,
  vici* e *Quo usque tandem*, que todo mundo já ouviu.
- **Cobertura**: a lista traz os seis casos, as cinco declinações, as quatro conjugações e os
  irregulares, os seis tempos do indicativo, três dos quatro do subjuntivo, o imperativo (presente e
  futuro), os particípios, o gerundivo, a passiva e os depoentes. O que fica ralo ou falta
  (mais-que-perfeito do indicativo, que só o Fedro traz, e o do subjuntivo; gerúndio; infinitivo
  perfeito; *cum* + subjuntivo; locativo) vem das frases de uso. A cada leva, o build imprime a matriz
  (declinação × caso × número; conjugação × tempo × modo × voz) com os buracos.

## 7. A biblioteca de apoio (corpus)
- **Interna**: fora do site e do git, em `fonte/latim/corpus/`, com `fonte/latim/fontes.json` no git
  (obra, edição, ano, endereço, licença, sha256) e um script que baixa tudo de novo. Só a frase
  escolhida vai ao site, com a referência.
- **Edições em domínio público** (séc. XIX e começo do XX) como base, conferidas com as modernas.
  O cache da Biblioteca já tem o latim de parte delas: *Imitação* (Hirsche, 1874), Regra de São Bento
  (Wölfflin, 1895; Butler, 1912), *Vida de São Martinho* (Halm, 1866), *Confissões* (a de O'Donnell,
  que se troca pela de Knöll).
- **Menos religioso (pedido do Gere, 22/10: «achei que essa primeira leva ficou excessivamente
  religiosa»)**: das próximas levas em diante, as primeiras frases novas, as frases de uso e os
  textos de cada nível vêm pelo menos metade de fora da Bíblia e da liturgia: clássicos, provérbios
  e máximas, fábulas (Fedro), cartas (Sêneca, Plínio), inscrições, ciência e vida cotidiana. O
  sentido eclesiástico continua o primeiro no card (§3.1), mas a busca da frase de uso deixa de
  preferir a fonte eclesiástica (ver abaixo), e o corpus ganha os clássicos ao lado da Clementina.
- **Fontes** (o eclesiástico pesava mais até 22/10; agora meio a meio):
  - a Vulgata Clementina inteira (uns 600 mil palavras); a NV só em citação curta, até a LEV;
  - a liturgia: Ordinário da Missa, hinos, sequências, antífonas (textos antigos, sem as edições da
    LEV);
  - Padres e autores da Igreja: Agostinho, Jerônimo, Gregório Magno, Bernardo, Tomás de Aquino, a
    *Imitação*, a Regra;
  - clássicos: Vergílio, Ovídio, Horácio, Catulo, Marcial, Fedro, César, Cícero, Sêneca, Lívio.
- **Lematização em Python puro**: um índice forma → análises tirado do Wiktionary (dados do
  kaikki.org; CC BY-SA, a licença que a Biblioteca já usa), conferido com o Collatinus (GPL, 11 mil
  lemas). Ele acha as frases de cada lema; a análise final de cada frase escolhida é anotada e
  conferida (§8).
- **Lista de frequência do latim**, contada no corpus, com o eclesiástico pesando mais: decide card
  comum × card de leitura e o vocabulário de base.
- **A busca da frase de uso**: para cada lema comum, as frases curtas que só pedem palavras do texto
  zero ou do mesmo texto; preferir a forma que o texto não tem e alternar a fonte (clássica e
  eclesiástica, meio a meio, pedido de 22/10); dois ou três
  candidatos por lema, e o agente escolhe, traduz e anota.

## 8. Anotação e qualidade
- Cada texto, frase de uso e primeira frase leva, palavra por palavra: lema, classe, forma (caso,
  número, gênero; pessoa, tempo, modo, voz), função («objeto direto de *laudate*»), sentido no
  contexto e a quantidade das vogais.
- Um agente anota, outro anota às cegas, e o principal decide onde os dois discordam. O build confere
  que a análise escolhida está entre as que o índice dá para aquela forma, e regras simples de
  concordância (preposição e caso, sujeito e verbo, adjetivo e nome).
- O texto entra na Biblioteca como os poemas na língua original (palavra clicável, glossário), com a
  forma e a função na nota; o mesmo glossário liga cada palavra ao card (`PLANO.md` §9). Uma página
  «Latim» na língua original, com orações e hinos, Bíblia, autores da Igreja e clássicos; no texto
  bíblico, um link para o capítulo na Bíblia Taioé quando ele já estiver lá.
- Valem iguais as regras do manual: distrator nunca certo, mesmo formato, nenhuma categoria só dos
  distratores, nota que ensina, conferências do §12.
- O Gere lê card a card só a leva de estreia (o piloto), como no inglês; depois, o uso e os canais de
  retorno.

## 9. Grafia e o latim eclesiástico
- A grafia da NV em todos os textos, clássicos inclusive: i e v (*Iesus*, *eius*, *virum*), sem j,
  ae e oe sem ligadura, sem mácron nem acento. Variante de grafia é questão de exibição, não de
  correção: as respostas são em português.
- O sentido eclesiástico vem primeiro em todo card (3.1).
- A quantidade das vogais fica nos dados desde já: dela sai o acento tônico dos livros litúrgicos
  (*Dóminus*) e, quando vier, a pronúncia eclesiástica.

## 10. O que muda no código
- Curso `la-pt` em `CURSOS_ATIVOS` (`inicio.js`; bandeira 🇻🇦, a da Santa Sé, que tem o latim por
  língua oficial), `AUDIENCIAS.la = ['pt']` no build, migração do curso no infra (como a do francês),
  catálogo pelo workflow Catálogo, nomes em `/admin/estatisticas/`.
- Motor, num modo de curso, `modo: 'trilhas'`, em vez de chaves soltas:
  - todo card só com a ida (o que o card de leitura já faz, levado ao curso);
  - sem nivelamento, sem avulsas, sem desafio; escolha de 1 a 3 textos na entrada; o texto zero;
  - o card de conceito (exemplo sorteado, alternativas da família, nome escrito);
  - o trecho do texto como card, destravado pelas palavras;
  - o conceito antes da frase;
  - o gabarito e o «quase» de frase.
- Build: os tipos novos, o teto de 10 palavras, a matriz de cobertura, o bloqueio do texto da NV sem
  licença, o teste das traduções às cegas.
- Testes: `fonte/testar-latim.js` (como o `testar-textos.js`) e a simulação do motor no modo novo.
- A regra «o sistema é igual em todas as línguas» do `CLAUDE.md` ganha a ressalva do latim.

**Feito no piloto (21/10)**:
- Motor (`js/motor.js`): `usarModo('trilhas')` e `soIda()`; o funil `PT_DO_LATIM`; `expandirGabarito`;
  `parecidoDeFrase`; `exemploDoConceito` (o exemplo gira pelo número de vistas); no modo trilhas a
  «parecida» conta como total, todo card fecha na ida e não há desafio.
- App: o modo vem do curso (`inicio.js`: `'la-pt': { modo: 'trilhas' }`); a tela Textos obrigatória;
  `ordenarTrilhas`; o card de conceito com a palavra destacada (`mark.destaque`) e o exemplo explicado
  na nota; a nota da frase com a fonte (📖); o painel sem a volta; sem o teste de nível nas
  configurações, e o recomeço volta à escolha dos textos.
- Dados (`fonte/cards/la/`): `01-conceitos` (16: os seis casos, presente, imperfeito, perfeito,
  futuro, imperativo, presente do subjuntivo, infinitivo, particípio perfeito, passiva, depoente),
  `02-palavras` (125), `03-texto-zero` (40), `04-trechos` (21, os quatro textos), `05-usos-a` e
  `06-usos-b` (109 frases de uso, da Clementina, uma por palavra; 15 palavras ficaram sem frase por
  falta de candidata boa): 311 cards. O texto do app sai dos trechos (`python -I fonte/latim/textos.py`
  grava `fonte/textos/la/`), e o build confere que cada linha bate com o seu trecho.
- Ferramentas (`fonte/latim/`): `latim.py` (grafia, referência, rótulos), `corpus.py` (a Clementina
  do eBible, em `cache/frases.jsonl`), `formas.py` (formas e análises do kaikki.org, com as enclíticas
  e o *tecum*), `conferir.py` (alinhamento e análise contra o Wiktionary), `buscar.py` (candidatas a
  frase de uso só com o vocabulário permitido), `montar.py` (leva → cards). O corpus e o cache ficam
  fora do git; `fontes.json` diz de onde baixar.
- Os pronomes *tu*, *nos* e *vos* não contam como transparentes (`transparencia: { pt: 'nenhuma' }`):
  o lema parece português, as formas (*te*, *tibi*, *nobis*) não.
- O `buscar.py` erra o lema em algumas candidatas (23/10): *cur* pega formas de *cor*, *quaeso*
  pega *quaero*, *laniger* pega *in*, *quo* pega *quoque*, *manus* pega *mane*, *ego* pega *eo* (de
  is); e o índice não acha *belli* (de *bellum*) nem *tibi* (de *tu*), nem *factus* (de *fio*). Quem
  escolhe a frase confere; consertar o índice antes da próxima leva.
- Falta: a matriz de cobertura no build, a simulação do motor com progresso inventado, o teste das
  traduções às cegas por cinco agentes.

## 11. Etapas

| # | etapa | situação |
|---|---|---|
| 0 | decisões D1–D6; pedido à LEV (se D1 = a) | ✔ 21/10 (D1 = b, sem pedido) |
| 1 | ferramentas: corpus, índice de formas, tokenizador, formato da anotação, molde das notas | ✔ 21/10 |
| 2 | motor, app e build no modo trilhas, com testes e a simulação | ✔ 21/10, menos a simulação |
| 3 | piloto: texto zero, conceitos dos casos e do presente, 4 textos de nível 1 com palavras e frases de uso; os 4 na Biblioteca | no ar em 21/10 (biblioteca PR #21, infra PR #15, hub PR #13); o Gere estuda e aponta |
| 3b | card de forma (§3.6) e o aviso de pergunta trocada | 22/10 (infra PR #16) |
| 3c | leva 2: primeiras frases menos religiosas, Catulo 85, Fedro I,1, Regina caeli, corpus clássico, 89 frases de uso (D11–D13) | 23/10 (biblioteca PR #22) |
| 3d | card de contraste (§3.7), 10 conjuntos e 27 cards dos itens 1 a 3 | 22/10 (infra PR #17) |
| 4 | os textos em domínio público, nível a nível, em levas de ~100 cards, com a matriz a cada leva; metade fora da Bíblia e da liturgia (§7) | — |
| 5 | os textos da NV, com a resposta da LEV (ou na Clementina) | — |
| depois | pronúncia eclesiástica; `la-es` e `la-en`; prosa com «Quero aprender o resto» | — |

Ordem de grandeza (estimativa, o piloto mede): os 36 textos dão umas 1.200 palavras com card, uns 450
trechos e umas 900 frases de uso, mais 40 primeiras frases e 50 conceitos — perto de 2.700 fichas, o
maior trabalho de conteúdo da Taioé até aqui. Pelo custo dos glossários da Biblioteca (~150 mil
tokens por poema curto), passa de dezenas de milhões de tokens, quase todos em subagentes baratos.
