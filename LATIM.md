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

**Pedido do Gere (24/10): o começo da *Eneida*, e texto longo em partes pequenas**, que a pessoa
aprende uma por vez. Contraproposta aceita no mesmo dia («Pode seguir com todas as recomendações»):
- ✔ D18. O proêmio inteiro, I,1–11, em duas partes: 1–7 (a primeira frase) e 8–11 (a invocação à Musa).
- ✔ D19. As partes em sequência: só a parte da vez (a primeira ainda não lida) pode ser escolhida;
  ao fim de uma, o aviso oferece «Aprender a parte 2».
- ✔ D20. Tamanho da parte, para todo texto longo, em qualquer língua: de 4 a 10 versos (na prosa,
  de 50 a 120 palavras), sempre fechando a frase.
- ✔ D21. Na Biblioteca, só os versos que já têm cards, crescendo parte a parte.
- **O que saiu** (§12): 149 cards (42 palavras, 4 conceitos, 11 trechos, 38 frases de uso, 54 de
  forma), mais 39 cards de forma que faltavam à leva 2, o mecanismo das partes no motor e no app, e a página na Biblioteca.

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
  família (os casos entre si, os tempos entre si). Até 24/10 vinha depois escrever o nome; desde
  então é **sempre de escolher** (pedido do Gere: escrever «nominativo» toda vez cansava), também
  na revisão; 3 acertos seguidos dominam, como no contraste. As quatro erradas são as do exemplo
  da vez (`exemplos[].distratores`, gravadas por `fonte/latim/cards_de_forma.py`): as outras
  leituras da mesma forma primeiro (*Deo*: ablativo), depois os pares que mais se trocam.
- Entra logo antes da primeira frase que precisa dele (campo `conceitos` da frase, que o build tira
  da anotação). A frase não espera o conceito ficar dominado; basta ele ter estreado.
- Terminologia das gramáticas brasileiras: subjuntivo (não conjuntivo), futuro perfeito.

### 3.6 Forma (`la-x…`): o caso de cada palavra do texto (aprovado e feito em 22/10)
Pedido do Gere (22/10): perguntar o caso das palavras dos textos, «pelo menos as que vão causar mais
dificuldade»; **uma vez só**: acertou de primeira, nunca mais; errou, volta até acertar **3 vezes
seguidas**, e então sai de vez. Era **só por escrito**; desde 24/10 é **só de escolher**, como o
conceito (escrever «nominativo» toda vez cansava), com as quatro erradas que mais se confundem com a
certa: as outras leituras que a mesma forma teria fora da frase primeiro, depois os pares que mais se
trocam (`CONFUSAO` em `fonte/latim/cards_de_forma.py`, que grava o campo `distratores`).
- O card: o verso (ou a primeira frase) inteiro, a palavra destacada, «Qual o caso da palavra
  destacada?» (até 31/10, «Em que caso está…»), campo de escrever. Sai do build, da anotação que trechos e frases já têm (`palavras[].f`);
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
    Desde 23/10 (pedido do Gere) a alternativa errada pode ser frase impossível, se confunde com a
    certa (`PLANO.md` §10). Regras para as próximas: os dois sentidos do par plausíveis; nada de pergunta começando pelo
    verbo; cuidado com as formas iguais (*canis* nominativo e genitivo, vocativo igual ao
    nominativo, em que a pista é só a vírgula).
  - O card: `la` (a certa), `pt` (a pergunta), `distratoresLa` (as outras três), `conjunto`,
    `requerTodas` (as palavras do conjunto e os conceitos de todos os casos que aparecem nas
    quatro), `palavras` e `conceitos`. A nota traz a anotação da certa, a explicação e o sentido de
    cada alternativa, uma por linha. O build confere 4 alternativas diferentes, do mesmo tamanho,
    as mesmas em todo o conjunto, e de 2 a 4 cards por conjunto.
  - No motor (`ehContraste`): sempre `VOLTA` (pergunta em português, resposta em latim) e
    `multipla`, também na revisão; três acertos seguidos → `dominado`, com `voltaEm` por data.
  - No app (desde 31/10): um só em jogo, sem esperar as palavras nem os conceitos; dominado ele,
    a próxima vaga de card novo é do contraste com menos requisitos por saber (`contrasteDaVez`,
    `cards/PLANO.md` §10); não passa pelos inéditos; `semConjuntoSeguido` e `conjuntoAnterior` impedem dois do mesmo conjunto seguidos, na estreia
    e nas filas. Sem «Já conheço». O catálogo leva as quatro frases latinas como `alternativas`.

### 3.8 Flexão (`la-v…`): cada forma do texto, com o sentido (aprovado e feito em 24/10)
Pedido do Gere (24/10), depois de destravar *Odi et amo. Quare id faciam, fortasse requiris* sem
entender: «Não bastou ver as palavras.» O card da palavra mostra só o dicionário (*is, ea, id* →
«ele»), e ninguém perguntava *id*, *faciam* ou *requiris* antes do verso. «Vamos agora botar card
para tudo. Se ficar excessivo, depois a gente vai ajustando.»

- **O card.** A forma sozinha (até 31/10 vinha embaixo, pequeno, o enunciado do lema, «de is, ea,
  id»; saiu a pedido do Gere, porque era dica: o lema aparece só na nota, depois da resposta); a
  pergunta «O que quer dizer esta forma?»; a resposta é o sentido em português **com a gramática
  dentro**: *id* → «isso», *eius* → «dele, dela», *faciam* → «que eu faça», *requiris* →
  «perguntas», *Domini* → «do Senhor». Múltipla escolha e depois duas escritas, como o card de
  palavra, com revisão por data (✔ D25). As quatro erradas são outras formas do mesmo lema (em
  *id*: «ele (sujeito)», «a, ela (objeto)», «por ele, com ele», «dele, dela»), que é a confusão a
  vencer. A nota: a análise, a linha da tabela (pronomes, *sum*, *possum*) ou a terminação, e onde
  a forma aparece.
- **Nos nomes, o caso** (pedido do Gere, 26/10: «para os casos, isso fica bem confuso»; contraproposta
  aprovada como recomendada). Substantivo, adjetivo e pronome (277 cards; `familia: "caso"`)
  perguntam «Qual o caso dessa forma?» (texto dele, 31/10), e a resposta é o caso e o número, **todos os
  que a forma pode ter fora da frase**, com o número primeiro (*aquae* → «singular: genitivo ou dativo;
  plural: nominativo»; desde 31/10, para a errada do plural se ver logo; `flexao_caso.py`, `texto()`): é a
  terminação que se decora, e o caso dentro da frase é o card de forma (§3.6). Sem gênero; o
  vocativo sai quando é igual ao nominativo do mesmo número. Só de escolher, também na revisão; três
  acertos seguidos dominam, e ele volta por data (como o conceito). As quatro erradas não dividem
  nenhum caso com a certa nem com o que o índice do Wiktionary dá à forma (*vi* também é dativo):
  as outras formas do lema, os padrões reais do baralho e, para igualar o tamanho, a junção de
  dois. Depois da resposta, a nota começa pelo sentido de antes (campo `sentido`: «aquae: as águas
  (sujeito); da água; para a água»). O progresso de quem já estudou ficou (mesmo id). Os verbos, os
  particípios, o gerúndio e a preposição *a* seguem com o sentido. Ferramenta:
  `fonte/latim/flexao_caso.py` (`--lista` mostra sem gravar), chamada também pelo `flexoes.py
  gravar`: a leva de texto novo continua escrita com o sentido, e o card de nome sai convertido.
- **Quais formas** (✔ D22): toda forma de frase do curso (trecho, primeira frase, frase de uso)
  que não é a do dicionário, e as tabelas inteiras de *is*, *hic*, *ille*, *qui*, *idem*, *ego*, *tu*,
  *nos*, *vos*, *sum* e *possum* (presente, imperfeito, futuro e perfeito do indicativo, presente
  do subjuntivo, infinitivo), também as formas que ainda não apareceram. Nos pronomes de três
  gêneros e em *sum* e *possum*, cujas formas do dicionário são muito diferentes entre si, cada
  uma ganha card, também a igual ao lema (*is*, *ea*, *id*; *sum*, *esse*, *fui*), pedido do Gere
  (24/10). Em 25/10: 458 cards (146 das tabelas, 312 das frases), e mais 74 da *Eneida* (532). *iis* e *nos*, *vos* (acusativo)
  ficam na nota, sem card.
- **Quando entra** (✔ D23): depois do card do lema (o dicionário primeiro). As do texto escolhido e
  das primeiras frases vêm na ordem de leitura, cada uma logo depois do lema dela (o «requer» de
  cada verso leva as flexões, `build.js`); as outras (tabelas, frases de uso) entram uma a cada
  quatro vagas de card novo (`CADA_FLEXAO_DE_TABELA` em `ordenarTrilhas`), na ordem em que os
  lemas estrearam. **O verso e a frase presa esperam as flexões**: o `requerTodas` leva os lemas e,
  depois deles, as flexões, na ordem da frase. Frase que já destravou não volta a travar.
- **O que o português não separa** (✔ D24): o nominativo e o acusativo dão o mesmo em português; a
  alternativa leva o parêntese («o Senhor (sujeito)» × «o Senhor (objeto)», «ele (sujeito)» × «o,
  ele (objeto)»), e na escrita basta «o Senhor», «ele». Forma com mais de uma leitura (*faciam*:
  «que eu faça» e «farei»; *venit*: «veio» e «vem»): a principal (`pt`) é a do texto e é a que a
  múltipla escolha mostra; as outras (`outras`) valem na escrita e aparecem na nota.
- **A régua da escrita** (`conferirFlexao` no motor): o artigo e a preposição são resposta (*eum*
  aceita «o»; «a ele» é *ei*); só caem o acento, a maiúscula, a pontuação e o parêntese. Escrever
  uma das erradas, ou a leitura de outra flexão do mesmo lema («pergunta» em *requiris*), é erro
  seco; o resto perto da certa é «deu quase».
- **Os dados.** `fonte/latim/flexoes.py`: `lista`; `faltam --saida X.json` (as formas sem card, com
  as frases, para a leva); `gravar [leva.json …]` junta as tabelas (no próprio script) e as levas
  em `fonte/cards/la/16-flexoes.json` e refaz o `requerTodas` das frases presas. Nunca reescreve
  card já gravado: a correção feita à mão fica. As levas das frases foram escritas por agentes com
  as regras de `fonte/latim/cache/levas/flexoes-REGRAS.md` (fora do git) e conferidas card a card.
  Campos: `la`, `lema`, `analise`, `pt`, `outras`, `aceitas`, `distratores`, `nota`, `conceitos`
  (o conceito do caso ou do tempo entra antes do card).
- **Texto novo**: o build avisa «forma(s) do latim sem card de flexão»; `flexoes.py faltam` → a leva
  → `gravar` → build. Até lá o verso espera só os lemas e as flexões que já existem. A *Eneida*
  (25/10): 73 formas dos trechos e das frases de uso, e *quis*, a forma do dicionário que nenhuma
  frase usa (pela regra das formas do dicionário dos pronomes); leva `cache/levas/flexoes-eneida.json`
  (a entrada ao lado, `flexoes-eneida-entrada.json`), escrita por três agentes e revista: saíram as
  leituras raras de `outras` (vocativos, a passiva de *condere* e *volvere*), as aceitas que são
  leitura de outra forma (*magno*: «do grande»), e «tem juízo» como errada de *sapis* (no Brasil vale
  «você tem juízo»). *illa* ficou na tabela de *ille*.
- No banco: o tipo `flexao` no catálogo (infra, migração `20261024150000_latim_flexao`).

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
  Refeito em 24/10, para todos os cursos: primeiro se sorteia card novo ou revisão, com a chance
  que persegue a meta da ida (entre 5% e 50%), e só depois o card dentro do grupo (README, «De
  qual fila vem o próximo card»). Com o teto antigo de um novo a cada cinco respostas, a ida do
  latim ficava em 5 cards contra 50 e o card dominava na mesma sessão.
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
- O `fonte/varrer-motor.js` não roda no latim (quebra em `campo.certa`, já antes de 24/10): no
  latim, a conferência das frases é o `cache/levas/usos-c/conferir-lote.js` e a tradução às cegas.

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
| 3e | *Eneida* I,1–11 em duas partes, e as partes de texto longo (D18–D21, §12) | 24/10 |
| 3f | card de flexão (§3.8): cada forma das frases e as tabelas dos pronomes, de *sum* e de *possum* | 25/10 |
| 3g | as flexões da *Eneida* (74 cards, §3.8) | 25/10 |
| 3h | a flexão de nome pergunta o caso (277 cards, §3.8) | 26/10 |
| 4 | os textos em domínio público, nível a nível, em levas de ~100 cards, com a matriz a cada leva; metade fora da Bíblia e da liturgia (§7) | — |
| 5 | os textos da NV, com a resposta da LEV (ou na Clementina) | — |
| depois | pronúncia eclesiástica; `la-es` e `la-en`; prosa com «Quero aprender o resto» | — |

Ordem de grandeza (estimativa, o piloto mede): os 36 textos dão umas 1.200 palavras com card, uns 450
trechos e umas 900 frases de uso, mais 40 primeiras frases e 50 conceitos — perto de 2.700 fichas, o
maior trabalho de conteúdo da Taioé até aqui. Pelo custo dos glossários da Biblioteca (~150 mil
tokens por poema curto), passa de dezenas de milhões de tokens, quase todos em subagentes baratos.

## 12. A *Eneida* em partes (feito em 24/10)

- **Texto longo em partes** (D19, D20; `PLANO.md` §9.6): cada parte é um texto do app com `obra`
  (`vergilio/eneida`), `parte` (1, 2…) e `trecho` («I, 1–7»), em `TEXTOS` do `fonte/latim/textos.py`;
  ids `vergilio/eneida-parte-N`, título «Aeneis» (latino, como os outros), e as duas apontam para a
  mesma página da Biblioteca, `/biblioteca/vergilio/eneida/`. O `linha` de cada trecho conta dentro da
  parte (1 a 7; 1 a 4); a `fonte` diz o verso da obra (Eneida I,8).
- **A leva** (ids `la-g017`–`g020`, `la-p209`–`p250`, `la-t036`–`t046`, `la-u226`–`u263`):
  `12-conceitos-2` (imperfeito e perfeito do subjuntivo, particípio presente e o ablativo absoluto,
  este numa família nova, `construcao`: «De que construção faz parte a palavra destacada?», porque a
  pergunta pelo caso faria «ablativo» parecer erro); `13-palavras-3` (42; sem card os nomes próprios
  e *Lavinius*, *Latinus*, *Albanus*, com a definição em `SEM_CARD`; *-ne* declara `homografos` com
  *ne*); `14-trechos-3` (11, um por verso; a leva em `cache/levas/trechos-3.json`); `15-usos-d` (38,
  16 da Vulgata e 22 clássicas; sem frase boa no corpus: *memoro*, *volvo*, *insignis*, *pietas*);
  `07-formas` (54 da Eneida); `16-flexoes` (74 da Eneida, §3.8).
- **Conferência**: anotação pelo `conferir.py`; tradução às cegas por um agente (4 traduções por frase,
  e a escolha entre as 5 alternativas): 80 de 196 passaram de primeira; todas as certas entraram no
  gabarito (196/196). Pelo que ele apontou: «costas» (dorso) virou «praias», «às lavínias» virou «às de
  Lavínio», «raça romana» virou «povo romano», e saíram quatro alternativas erradas que se defendiam
  («estás de bom ânimo», «vence» gnômico, «tantos homens, quantas causas», «Lia sepulta»).
- **Ferramentas, de passagem**: o `cards_de_forma.py` lia só `02-palavras` e `01-conceitos` (as palavras
  da leva 2 ficavam sem card de forma: entraram 39 agora) e passa a ler todas as levas; o `montar.py`
  lê os conceitos de todas as levas; o `formas.separar` não separava o *-ve* (a chave troca v por u);
  o `conferir.py` aceita a enclítica colada em nome próprio sem análise (*Laviniaque*); o `buscar.py`
  deixa a frase de uso de uma parte usar as palavras das partes anteriores.
- **Biblioteca** (D21): `edicoes/lingua-original/eneida/` («Aeneis», «Liber I», 11 versos, a parte 2
  depois de uma linha em branco), autor Vergílio. O glossário sai da anotação dos trechos:
  `python -I fonte/latim/glossario_eneida.py fonte/cards/la ../biblioteca/edicoes/lingua-original/eneida/glossario.json`
  (as definições traduzidas do en.wiktionary ficam em `DEF`, no script).
- **Próxima parte**: o livro I segue pelas pausas de sentido (12–18, 19–22, 23–28, 29–33…); cada parte
  nova é um texto a mais em `TEXTOS` (parte 3…), trechos com `texto` dela, as palavras novas, as frases
  de uso, o glossário refeito e a linha nova na Biblioteca.


## 13. Mais variedade (pedido de 29/10, aprovado no mesmo dia)

Pedido do Gere (29/10): «sinto que quase todos os cards são para responder casos e formas verbais.
[…] o que a gente poderia fazer para que houvesse mais diversidade nos cards, sem prejudicar a
qualidade do aprendizado?». Contraproposta D26–D33, com o diagnóstico medido (a proposta inteira
ficou em `../anexos/latim-variedade.md`); a resposta dele: «Sim, todas (menos a D33)».

- **Antes** (simulação, nove cenários de texto e sorteio): 50% a 68% das respostas eram de gramática
  (média 57%), 31% a 39% caíam em sequências de 3 ou mais cards de gramática (até 18 seguidos), e a
  frase era só 10% em média. Três cards faziam a mesma pergunta («em que caso está…?»): o conceito,
  a forma na frase e a flexão sozinha; e havia um card por forma, quando o que se aprende é a
  terminação (*deus* trazia *dei*, *deo*, *deos*, *deum*, *di* e *dii*).
- ✔ **D26. Uma terminação, um card** (nomes e adjetivos): as flexões de caso com a mesma
  declinação, o mesmo final e a mesma resposta são um grupo, e quem o estuda é o primeiro card dele
  que a pessoa vê; a cada aparição ele mostra outra palavra do grupo cujo lema ela já viu (*rosae*,
  *aquae*, *gloriae*), com as erradas e a nota daquela palavra. Pronomes e irregulares, um por forma.
- ✔ **D27. Nos verbos regulares, só a terminação nova**: a mesma conjugação e a mesma análise; no
  perfeito e no particípio perfeito, só o radical que a conjugação prevê (*laudavi*, *timui*,
  *audivi*): *dixit*, *vicit*, *stetit* e *passus* ficam com card próprio. A forma que dorme fica no
  verso, com a nota dele. Rede de segurança (D26 e D27): errou, depois da mudança, uma frase que pede a
  forma que dorme, ela acorda e estreia, só para a pessoa.
- ✔ **D28. A forma na frase só quando a frase decide**: o card de forma só da forma que, sozinha,
  teria mais de uma leitura (`ambigua`, de `cards_de_forma.py`); acabou o sorteio de 1 em 4 das
  fáceis. O erro continua puxando as parecidas.
- ✔ **D29. A flexão espera a frase que a pede**: a de frase de uso só quando a frase está perto (os
  lemas dela sabidos), uma a cada quatro vagas; a que nenhuma frase pede (as tabelas), uma a cada
  dez (antes, quatro); a de texto não escolhido espera. A variante (*di*, *dii*, campo `rara`) não
  estreia e conta como o lema.
- ✔ **D30. Nunca mais de dois de gramática seguidos** (conceito, forma, flexão, contraste): o
  próximo é de outro tipo, se houver um pronto, nos novos e nas revisões.
- ✔ **D31. Card de leitura «quem fez o quê?»** e ✔ **D32. O latim que já está no português**:
  pilotos (§13.2). ✗ **D33. Perguntas sobre a história**: fica de fora, por ora.

### 13.1 Como ficou (D26–D30)
- `fonte/latim/terminacoes.js`: os grupos (o build grava `terminacao` no pacote do app, fora da versão
  do card). Hoje, 207 flexões em 53 terminações: 143 de nomes e adjetivos em 32 grupos, 64 de verbos em
  21; quem estuda tudo vê 53 cards no lugar de 207.
- Motor: `ativoDaTerminacao` (o primeiro visto; de quem viu vários antes de `DIA_DAS_TERMINACOES`,
  30/10/2026, o dominado há mais tempo, ou o que estreou primeiro), `adormecido` (o resto do grupo, a
  variante), `quemConta` (a que dorme conta como o ativo em `sabidaEm`, `venceuEm` e
  `situacaoDaFrase`; fora de `contarDirecoes`), `flexaoPuxada` (o histórico local da frase, com erro
  depois daquele dia), `exemploDaTerminacao` (o rodízio). O que estreou depois daquele dia é card
  próprio para sempre: é a rede de segurança, sem coluna nova no banco.
- App: a que dorme sai das filas (`fora`), não estreia (`daTrilha`) e sai dos inéditos
  (`ordenarTrilhas`); o card mostra o exemplo da vez; `doisDeGramatica` na escolha (D30); as duas
  vagas da D29 (`CADA_FLEXAO_DE_USO` = 3, `CADA_FLEXAO_DE_TABELA` = 9).
- Formas: 127 das 285 são ambíguas (116 de caso, 11 de verbo), mais que as 78 estimadas na
  proposta, porque contam também as formas iguais ao dicionário que têm duas leituras (*Tempus*,
  nominativo ou acusativo; *vita*, nominativo ou ablativo).
- Depois (simulação, `node fonte/simular-latim.js`, os mesmos nove cenários): gramática em 35% a 60%
  das respostas (média 48%; a proposta estimava 41%, com os verbos menos conservadores), frase em 7% a
  27% (média 15%), sequências de 3 ou mais em 0% a 1% (nunca mais de 3 seguidos). O primeiro verso do
  texto não chega antes (resposta 360 a 740): ele espera a vaga do texto, 1 de cada 3 cards novos.
- Transição: quem já estudou várias formas do grupo fica com a dominada há mais tempo; as outras
  dormem com o estado guardado e saem da fila. Verso já destravado não volta a travar.

### 13.2 Os pilotos das D31 e D32 (29/10)
- **Compreensão** (`compreensao`, série `la-q`, `fonte/cards/la/17-compreensao.json`): uma frase
  latina e uma pergunta pelo sentido, em `pergunta` («Quem vê?», «De quem é o pão?»); a certa e
  quatro erradas em português: os outros participantes da frase (a armadilha da ordem) e leituras
  plausíveis fora dela. 40 cards: 23 sobre as frases dos conjuntos de contraste, já conferidas às
  cegas (`conjunto` e o `requerTodas` do conjunto), e 17 sobre primeiras frases reais (`de`,
  `fonte` e o `requerTodas` das palavras e flexões da frase; `conjunto` = `q-` + o número da frase,
  para as duas perguntas da mesma frase não virem seguidas). Entra como frase presa.
- **Herança** (`heranca`, série `la-h`, `18-heranca.json`): `familia` `derivado` (20: «Que palavra
  portuguesa vem desta?», o lema com o enunciado; espera o lema dominado; as erradas parecem e não
  vêm dele: *aquecer* de *calescere*, *belo* de *bellus*, *luxo* de *luxus*) ou `expressao` (20:
  «O que quer dizer, ao pé da letra?», *per capita*, *data venia*, *habeas corpus*…; livre desde o
  começo; a nota diz a gramática de dentro). Uma a cada oito vagas de card novo (`CADA_HERANCA`).
- Os dois: só de escolher, três seguidos dominam e voltam por data (como o contraste); sem «Já
  conheço»; não contam como gramática na D30. Catálogo: tipos `compreensao` e `heranca` (infra,
  migração `20261029180000_latim_leitura`).
- Conferência às cegas (um agente, sem o gabarito): acertou os 80; pelo que apontou, saiu a
  pergunta do vocativo *pastor* (igual ao nominativo: decide a vírgula, não a terminação), e
  trocaram-se as erradas defensáveis de *ipsis litteris* (dativo e ablativo iguais), *in memoriam* e
  *persona non grata* (*gratus* também é grato), e a pista da maiúscula em «nas do Pai». A leva sai
  de `fonte/latim/cache/levas/leitura-1.js` (fora do git).
- Próximo: o Gere estuda e aponta; depois, mais compreensões nos versos dos textos (com `texto`) e
  frases novas com as palavras que a pessoa tem.

## 14. Horácio e a *Bucólica* IV (feito em 03/11)

Pedido do Gere (03/11): os textos novos da Literatura também nos Cards. Do latim, três:
- **Horácio, *Odes* I,11** (*Tu ne quaesieris*, o «carpe diem»), 8 versos, um texto só
  (`horacio/tu-ne-quaesieris`, `ordem` 10);
- **Horácio, *Odes* III,30** (*Exegi monumentum*), em duas partes pelas pausas de sentido: 1–9 (as
  duas primeiras frases) e 10–16 (*Dicar…* e o pedido à Musa) (`horacio/exegi-monumentum-parte-1` e
  `-2`, `ordem` 11 e 12, obra `horacio/exegi-monumentum`);
- **Vergílio, *Bucólica* IV, 1–14** (decisão do Gere: só o começo), em duas partes, 1–7 e 8–14, as
  duas fechando a frase (1–3 e 8–10 teriam só 3 versos) (`vergilio/bucolica-iv-parte-1` e `-2`,
  `ordem` 13 e 14). O resto da écloga fica para depois, parte a parte, pela mesma receita.

A leva: 114 palavras (`20-palavras-4`, `la-p251`–`p364`; nomes próprios e adjetivos de nome
próprio em `SEM_CARD`; *adeo* advérbio com `homografos` do verbo), 2 conceitos (`21-conceitos-3`:
`la-g030` futuro perfeito do indicativo e `la-g031` ablativo de comparação, família `construcao`),
38 trechos (`22-trechos-4`, `la-t047`–`t084`, um por verso; leva em `cache/levas/trechos-4.json`),
80 frases de uso (`23-usos-e`, `la-u264`–`u343`, 38 clássicas e 42 da Vulgata; leva
`cache/levas/usos-e.json`), 192 flexões (`la-v533`–`v724`; leva `cache/levas/flexoes-0311.json`)
e os cards de forma dos versos novos (`07-formas`; `22-trechos-4.json` entrou nas `FONTES` do
`cards_de_forma.py`).

- **Frases de uso só com o vocabulário que a pessoa vai ter** (§3.2): as primeiras frases e o mesmo
  texto (e as partes anteriores). Os agentes escolheram 9 que pediam palavras de outros textos:
  saíram; onde era uma palavra só, ela ficou sem card na frase (`palavra de outro texto: «…»`).
  Pronomes das tabelas (*is*, *hic*, *ille*, *idem*, *nos*, *possum*) ficam, como nas levas antigas.
  Sem frase: *liquo*, *reseco*, *integer*, *castus*, *adeo* (advérbio) e as 21 palavras sem candidata
  no corpus (*debilito*, *pumex*, *pyramis*, *imber*, *coma*…).
- **«ære»**: o ablativo de *aes* (o bronze) se escreve com a ligadura **na fonte** (também *æris*,
  *æri* nas notas), como na Biblioteca: a regra do hiato de `ligaduras.js` lê *aere*, *aeris* como
  *aër* (o ar), e a forma é a mesma. `formas.analisar` desfaz a ligadura antes de procurar.
  *Leuconoë* também vai com o trema na fonte (nome próprio, sem card).
- **Variantes novas** nos cards antigos, para o `conferir.py` (o Wiktionary lematiza à parte):
  *tu* `tibi`, *altus* `altior`, *magnus* `maior`, *saeculum* `saeclum`, *atque* `ac`, *nec* `neque`;
  no novo *ex*, `e`. *ac* e *neque* ganharam card de flexão, como *a* (de *ab*).
- **O `conferir.py`** fica com 3 avisos que são falta do Wiktionary: *temptaris* (forma breve de
  *temptaveris*), *perennius* (sem página) e *integro* (a página só tem o verbo *integro*); nas frases
  de uso, *violentior* sem caso, *e* como lema próprio e *incipiendum* (gerundivo).
- **Tradução às cegas** (um agente, 4 traduções por frase e a escolha entre as 5 alternativas):
  245 de 472 (52%) passaram de primeira; a escolha acertou as 118. As certas entraram no gabarito
  (454/472 depois; ficaram de fora 18 que mudavam o sentido ou não eram português natural). Pelo que
  ele apontou: as fontes «Civil War» e «Troades Furens» do corpus viraram «Guerra civil» e
  «As troianas» (os nomes vêm errados de `corpus.py`, que não foi consertado), e *Iliun* (Sêneca)
  ficou como na edição, com a nota da grafia grega.
- O primeiro *Tu* da *Bucólica* (v. 8, *Tu modo… fave*) ficou sem rótulo de caso (nominativo ou
  vocativo, as gramáticas divergem): sem card de forma.
