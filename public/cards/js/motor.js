/* ────────────────────────────────────────────────────────────────
   motor.js — estado dos cards e gestão da fila.

   São quatro filas: inéditos, es→pt, pt→es e dominados (ver escolherProximo).
   Ao responder, o card volta para a fila da etapa dele e anota a distância
   que pediu: curta depois de um erro, longa depois de um acerto escrito.

   A única exceção é o card já dominado nas duas direções: esse ganha uma
   data de retorno, que cresce a cada revisão certa. Nunca sai do baralho —
   só espera mais (ver DIAS_DOMINADO).
   ──────────────────────────────────────────────────────────────── */
window.Motor = (function () {

  /* Um eixo só: o CEFR. Conjugação é assunto de etiqueta ('conjugação',
     'irregular', 'pretérito'), não de faixa — o nível de um card de verbo
     sai da frequência do verbo somada à dificuldade do tempo. */
  const NIVEIS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const ROTULO_NIVEL = { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2' };

  /* ── normalização de texto para comparar respostas ──
     Aqui só entra o que é a MESMA resposta escrita de outro jeito: acento,
     plural, número por extenso, contração, artigo e pronome-sujeito, que a
     língua dispensa. Nada que possa fazer uma resposta errada colar na
     certa — negação, preposição, verbo e substantivo ficam intactos.
     Sinônimo de verdade entra pela lista "aceitas" de cada card.

     O que conta como "o mesmo escrito de outro jeito" muda de língua para
     língua, então cada uma traz suas próprias tabelas e o normalizador
     escolhe pela língua da resposta (ver LINGUAS, no fim do bloco). Quem
     responde em português não escreve "the office", e quem responde em
     inglês não escreve "3" esperando casar com "três". */

  /* As tabelas são consultadas com a palavra que a pessoa escreveu, e objeto
     comum herda chaves que ninguém pôs ali: «constructor» — que é palavra
     espanhola — achava a função Object, e o funil quebrava tentando tratá-la
     como texto. Tabela sem protótipo só tem o que está escrito nela. */
  const tabela = o => Object.assign(Object.create(null), o);

  const NUMEROS_PT = tabela({
    '0': 'zero', '1': 'um', '2': 'dois', '3': 'tres', '4': 'quatro',
    '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
    '10': 'dez', '11': 'onze', '12': 'doze', '13': 'treze', '14': 'quatorze',
    '15': 'quinze', '16': 'dezesseis', '17': 'dezessete', '18': 'dezoito',
    '19': 'dezenove', '20': 'vinte', '30': 'trinta', '50': 'cinquenta', '100': 'cem'
  });

  /* O espanhol usava a tabela portuguesa, e só casava onde as duas línguas
     coincidem (tres, cinco, seis): «2 años» virava «dois año» e nunca batia
     com «dos años». O «1» fica de fora — «un», «una» e «uno» dependem do
     que vem depois. Com acento, porque o espanhol chega ao funil com ele. */
  const NUMEROS_ES = tabela({
    '0': 'cero', '2': 'dos', '3': 'tres', '4': 'cuatro', '5': 'cinco',
    '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve', '10': 'diez',
    '11': 'once', '12': 'doce', '13': 'trece', '14': 'catorce', '15': 'quince',
    '16': 'dieciséis', '17': 'diecisiete', '18': 'dieciocho', '19': 'diecinueve',
    '20': 'veinte', '30': 'treinta', '50': 'cincuenta', '100': 'cien'
  });

  const NUMEROS_EN = tabela({
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
    '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
    '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
    '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
    '80': 'eighty', '90': 'ninety', '100': 'hundred'
  });

  /* O francês, como o inglês, tem os números corridos até vinte; os
     compostos («vingt et un», «soixante-dix») ficam como estão. */
  const NUMEROS_FR = tabela({
    '0': 'zero', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre',
    '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf',
    '10': 'dix', '11': 'onze', '12': 'douze', '13': 'treize', '14': 'quatorze',
    '15': 'quinze', '16': 'seize', '17': 'dix sept', '18': 'dix huit',
    '19': 'dix neuf', '20': 'vingt', '30': 'trente', '40': 'quarante',
    '50': 'cinquante', '60': 'soixante', '100': 'cent'
  });

  /* O italiano (08/11/2026): os números corridos até vinte. O «1» fica de fora, como no
     espanhol: «un», «uno» e «una» dependem do que vem depois. */
  const NUMEROS_IT = tabela({
    '0': 'zero', '2': 'due', '3': 'tre', '4': 'quattro', '5': 'cinque',
    '6': 'sei', '7': 'sette', '8': 'otto', '9': 'nove', '10': 'dieci',
    '11': 'undici', '12': 'dodici', '13': 'tredici', '14': 'quattordici', '15': 'quindici',
    '16': 'sedici', '17': 'diciassette', '18': 'diciotto', '19': 'diciannove',
    '20': 'venti', '30': 'trenta', '40': 'quaranta', '50': 'cinquanta', '100': 'cento'
  });
  /* Contrações e grafias alternativas da mesma palavra. O valor pode trazer
     mais de uma palavra: cada uma volta para o funil e é conferida sozinha,
     então "im" vira "i am" e o "i" ainda cai como pronome-sujeito. */
  const GRAFIAS_PT = tabela({
    pra: 'para', pro: 'para', to: 'estou', ta: 'esta', tao: 'estao',
    duas: 'dois', vc: 'voce', catorze: 'quatorze',
    /* «este ano» e «esse ano» são a mesma coisa no português do Brasil, e
       nenhum card do baralho ensina a diferença entre os dois. «Aquele» fica
       de fora: esse é o demonstrativo de longe, e aí a distância importa. */
    esse: 'este', essa: 'esta', esses: 'estes', essas: 'estas', isso: 'isto',
    /* «o teu sobrenome» e «o seu sobrenome» são o mesmo tratamento no
       português do Brasil, e nenhum card ensina a diferença entre os dois.
       Só vale deste lado: em espanhol «tu» e «su» separam o tú do usted, e
       essa diferença o baralho cobra. */
    teu: 'seu', tua: 'sua', teus: 'seus', tuas: 'suas',
    /* a cidade escrita à espanhola numa resposta em português: quem acabou
       de ler «Madrid» na pergunta copia a grafia, e isso não é erro de nada */
    madrid: 'madri'
  });

  const GRAFIAS_ES = tabela({});

  /* Em inglês a contração não é desleixo, é a forma corrente: "I don't mind"
     e "I do not mind" são a mesma frase. O apóstrofo já caiu antes (ver o
     "pre" do inglês), por isso as chaves aqui vêm sem ele.

     Ficam de fora as contrações cuja forma sem apóstrofo é outra palavra do
     inglês: ill (I'll / doente), well (we'll / bem), were (we're / were),
     shed (she'd / galpão), shell, lets (let's / he lets). O baralho usa as
     duas: tem "maybe ill go" e tem "She made him feel ill". Desfazer essas
     mudaria o sentido de uma resposta legítima, que é justamente o que a
     normalização não pode fazer — quando as duas leituras existem, o jeito
     é a variante entrar na lista "aceitasEn" do card. */
  const GRAFIAS_EN = tabela({
    im: 'i am', ive: 'i have', id: 'i would',
    its: 'it is', thats: 'that is', theres: 'there is', heres: 'here is',
    hes: 'he is', shes: 'she is', whats: 'what is', whos: 'who is',
    wheres: 'where is', hows: 'how is',
    youre: 'you are', theyre: 'they are',
    weve: 'we have', youve: 'you have', theyve: 'they have',
    youll: 'you will', theyll: 'they will',
    hed: 'he would', theyd: 'they would',
    cant: 'cannot', wont: 'will not', dont: 'do not', doesnt: 'does not',
    didnt: 'did not', isnt: 'is not', arent: 'are not', wasnt: 'was not',
    werent: 'were not', havent: 'have not', hasnt: 'has not',
    hadnt: 'had not', wouldnt: 'would not', couldnt: 'could not',
    shouldnt: 'should not', mustnt: 'must not',
    gonna: 'going to', wanna: 'want to', gotta: 'got to'
  });

  /* Palavras que o português põe ou tira sem mudar nada: artigos e
     pronomes-sujeito (as duas línguas dispensam o sujeito), mais o "já"
     aspectual. Nenhuma negação e nenhuma preposição entram aqui. */
  const OMISSIVEIS_PT = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'eu', 'ele', 'ela', 'eles', 'elas', 'voce', 'voces', 'tu', 'nos',
    'ja'
  ]);

  /* O espanhol dispensa o sujeito tanto quanto o português: "no sabía" é tão
     correto quanto "yo no sabía". Quem carrega a pessoa é o verbo conjugado,
     que continua entrando inteiro na comparação. O artigo espanhol não entra
     na lista — só o da frente cai, no "pre" da língua.

     «él» e «tú» entram com acento. A lista nasceu quando o espanhol chegava
     sem acento nenhum, e «el» cobria os dois; quando o acento passou a
     contar, «Él dijo la verdad» e «él está hecho un lío» deixaram de soltar o
     sujeito, e a resposta com pronome virou erro.

     A lista também herdava a do português inteira, e cinco daquelas palavras
     são espanhol de outra coisa: «a» é a preposição, «o» é o «ou», «os» e
     «nos» são pronomes de objeto e «tu» é o possessivo. Caíam sem ninguém
     ver — «Voy darme una ducha» passava por «Voy a darme una ducha», e
     «Hermano es muy majo» por «Tu hermano es muy majo». E o «um» português
     escrito no lugar do «un» sumia da frase, que perdia uma palavra inteira
     e caía no erro seco em vez do «deu quase» (u184: «necesito um poco de
     sosiego»). Agora só o sujeito espanhol cai. */
  const OMISSIVEIS_ES = new Set([
    'yo', 'tú', 'el', 'él', 'ella', 'ellos', 'ellas',
    'nosotros', 'nosotras', 'vosotros', 'vosotras', 'usted', 'ustedes'
  ]);

  /* O inglês é o oposto do português: exige o sujeito e exige o artigo. Quem
     responde escreve "the office" e o card pode trazer só "office" — ou o
     contrário. Nenhum dos dois diz nada sobre saber a palavra espanhola, que
     é o que o card cobra. Nada além de artigo e pronome-sujeito entra aqui. */
  const OMISSIVEIS_EN = new Set([
    'the', 'a', 'an',
    'i', 'he', 'she', 'it', 'they', 'we', 'you'
  ]);

  /* O francês, diferente do espanhol e do português, não dispensa o sujeito,
     e a pessoa muitas vezes só aparece nele: «je parle» e «il parle» se
     escrevem igual. Se o pronome caísse, a pessoa errada contaria como certa.
     Então nada é omissível no meio da frase; só o artigo da frente cai (ver
     preFr), como no espanhol: quem responde «maison» sabe tanto quanto quem
     responde «la maison». */
  const OMISSIVEIS_FR = new Set();
  /* O italiano dispensa o sujeito como o espanhol («non lo so» = «io non lo so»), mas «lui»,
     «lei» e «loro» são também o pronome depois de preposição («con lei», «per loro»), e lá não
     podem cair: «vado con lui» não é «vado con lei». Então o sujeito só cai quando abre a
     resposta (ver preIt), e nada é omissível no meio da frase. */
  const OMISSIVEIS_IT = new Set();

  /* Plural = singular. Em português basta tirar o "s".

     Em inglês o "es" é ambíguo: "boxes" é "box"+es, mas "houses" é "house"+s.
     Sem saber qual é qual, não dá para escolher — então as duas formas são
     levadas ao MESMO lugar: tira-se o "s" e, depois, o "e" que sobrar atrás
     de sibilante. "boxes" → "boxe" → "box", e "box" já era "box"; "houses" →
     "house" → "hous", e "house" também vira "hous". O resultado não é
     palavra de dicionário, e não precisa ser: precisa só ser o mesmo dos
     dois lados da comparação. O "ss" fica de fora ("glass" não é plural),
     mas "glasses" chega a "glass" pelo mesmo caminho. */
  function pluralPt(p) {
    return p.replace(/^(\w{3,})s$/, '$1');
  }
  function pluralEn(p) {
    if (/^\w{3,}ies$/.test(p)) p = p.slice(0, -3) + 'y';                // babies → baby
    else if (/^\w{3,}s$/.test(p) && !/ss$/.test(p)) p = p.slice(0, -1); // cats → cat
    return p.replace(/(s|x|z|ch|sh)e$/, '$1');                          // boxe → box
  }

  /* No francês o «-s» final também é terminação de verbo, e é ela que separa
     o futuro do condicional: «je serai» e «je serais». Tirá-lo juntava os dois
     (a leva 4 achou o choque). Então o francês não iguala plural e singular:
     a forma pedida é a do card, e a variante entra em aceitasFr. */
  function pluralFr(p) {
    return p;
  }

  /* As ligaduras não se desfazem com o acento: «cœur» viraria «c ur». E o
     artigo da frente cai, também o elidido: «l'eau» = «eau». */
  const ARTIGOS_FR = /^(le|la|les|un|une|des)\s+|^l['’´`]\s*/;
  function preFr(s) {
    return s.trim().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(ARTIGOS_FR, '');
  }

  /* No italiano o «-i» e o «-e» do plural são também terminação de verbo («parli», «parle»),
     como o «-s» do francês: plural e singular não se igualam, e a variante vai em aceitasIt.
     O artigo da frente cai, também o elidido («l'acqua» = «acqua», «un'amica» = «amica»), e
     depois dele o pronome-sujeito que abre a resposta. O acento já saiu antes («è» = «e»,
     «perché» = «perche»): o teclado do celular não ensina nada, como no francês. */
  const ARTIGOS_IT = /^(il|lo|la|i|gli|le|un|uno|una)\s+|^(l|un)['’´`]\s*/;
  const SUJEITO_IT = /^(io|tu|lui|lei|noi|voi|loro|egli|ella)\s+/;
  function preIt(s) {
    return s.trim().replace(ARTIGOS_IT, '').replace(SUJEITO_IT, '');
  }
  /* O espanhol dispensa o artigo do mesmo jeito que o português: quem
     responde "oficina" acertou tanto quanto quem responde "la oficina". */
  const ARTIGOS_ES = /^(el|la|los|las|un|una|unos|unas)\s+/;

  /* No português o apóstrofo é sempre a mesma coisa: um «de» que perdeu a
     vogal antes de outra. «Um copo d'água» é «um copo de água», e a
     pontuação viraria espaço logo adiante, deixando um «d» solto. */
  function prePt(s) {
    return s.replace(/\bd['’´`]\s*/g, 'de ')
      /* «Chegamos ao meio-dia» e «chegamos meio-dia» são a mesma frase no português falado (o
         Gere, 16/11/2026, no u580: «no português coloquial, não precisa de "ao" antes de
         "meio-dia»»); vale também para «à meia-noite». O acento já saiu: «à» chega «a». */
      .replace(/\b(?:ao|a)\s+(meio[-\s]*dia|meia[-\s]*noite)\b/g, '$1');
  }

  /* Ajustes que precisam do texto ainda inteiro, antes de a pontuação virar
     espaço. É onde o inglês desfaz o apóstrofo: se ele virasse espaço,
     "I don't mind" seria "i don t mind" e nunca casaria com "i dont mind". */
  function preEn(s) {
    return s
      .replace(/['’´`]/g, '')                       // don't → dont
      .replace(/\bcan not\b/g, 'cannot')
      .replace(/\bone (hundred|thousand|million)\b/g, '$1');  // 100 = a hundred
  }

  /* ── acento: quem perdoa e quem cobra ──
     Em português a acentuação não é o que se está aprendendo: errar o til de
     «saudade» não diz nada sobre saber a palavra, e o teclado do celular
     atrapalha mais do que ajuda. Em espanhol é o contrário — o acento é parte
     da grafia que o card ensina, e «ñ» é OUTRA LETRA, não um «n» enfeitado:
     «año» e «ano» são duas palavras, e a diferença entre elas é constrangedora.

     Então o português continua chegando sem acento nenhum ao funil, e o
     espanhol chega inteiro. A consequência é que responder em espanhol passa
     a exigir a acentuação certa. Foi pedido, e é coerente com a régua que já
     era mais dura desse lado. */
  const PONTUACAO_PT = /[^a-z0-9\s]/g;
  const PONTUACAO_ES = /[^a-z0-9áéíóúüñ\s]/g;

  /* O plural continua caindo dos dois lados: ele é a mesma palavra escrita de
     outro jeito, e não tem nada a ver com acento. A classe precisa das letras
     espanholas para «años» chegar a «año». */
  function pluralEs(p) {
    return p.replace(/^([a-záéíóúüñ]{3,})s$/, '$1');
  }

  const LINGUAS = {
    pt: {
      omissiveis: OMISSIVEIS_PT, numeros: NUMEROS_PT,
      grafias: GRAFIAS_PT, plural: pluralPt, pre: prePt,
      pontuacao: PONTUACAO_PT
    },
    /* As palavras raras do português (cards/RARAS.md, 20/11/2026): a pergunta é português, e o
       funil é o do português. */
    pc: {
      omissiveis: OMISSIVEIS_PT, numeros: NUMEROS_PT,
      grafias: GRAFIAS_PT, plural: pluralPt, pre: prePt,
      pontuacao: PONTUACAO_PT
    },
    /* O espanhol não herda as grafias do português: «pra», «vc» e «isso» não
       são palavras dele, e desfazê-las aqui só abriria porta para casar coisa
       que não casa. A tabela própria está vazia porque, até agora, o espanhol
       do baralho não precisou de nenhuma. */
    es: {
      omissiveis: OMISSIVEIS_ES, numeros: NUMEROS_ES,
      grafias: GRAFIAS_ES, plural: pluralEs,
      pre: s => s.trim().replace(ARTIGOS_ES, ''),
      pontuacao: PONTUACAO_ES, guardaAcento: true
    },
    en: {
      omissiveis: OMISSIVEIS_EN, numeros: NUMEROS_EN,
      grafias: GRAFIAS_EN, plural: pluralEn, pre: preEn,
      pontuacao: PONTUACAO_PT
    },
    /* O francês chega sem acento ao funil, como o português: o acento grave
       e o circunflexo raramente separam palavras («a»/«à», «ou»/«où» são
       palavras de função), e cobrar o teclado do celular não ensina nada. O
       apóstrofo vira espaço com a pontuação. */
    fr: {
      omissiveis: OMISSIVEIS_FR, numeros: NUMEROS_FR,
      grafias: tabela({}), plural: pluralFr, pre: preFr,
      pontuacao: PONTUACAO_PT
    },
    it: {
      omissiveis: OMISSIVEIS_IT, numeros: NUMEROS_IT,
      grafias: tabela({}), plural: p => p, pre: preIt,
      pontuacao: PONTUACAO_PT
    },
    /* O latim (cards/LATIM.md) só é pergunta: quem estuda responde em português. O funil dele
       serve para comparar latim com latim (o card repetido, a resposta escrita na língua
       errada), e iguala o que as edições escrevem de jeitos diferentes: sem acento nem mácron,
       j = i, v = u, a ligadura desfeita. Nada de plural nem de palavra omissível: no latim a
       terminação é a lição. */
    la: {
      omissiveis: new Set(), numeros: tabela({}), grafias: tabela({}), plural: p => p,
      pre: s => s.trim().replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/j/g, 'i').replace(/v/g, 'u'),
      pontuacao: PONTUACAO_PT
    }
  };

  /* No latim (modo trilhas) o número e a pessoa são justamente o que se lê: a resposta em
     português não iguala plural e singular, e o pronome fica — «vos libertará» não é «nos
     libertará», «os dias» não é «o dia». Cai só o artigo (e o «já»); o resto do funil é o de
     sempre. O sujeito opcional vai no gabarito («[eu ~] creio»). */
  const PT_DO_LATIM = {
    omissiveis: new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'ja']), numeros: NUMEROS_PT,
    grafias: GRAFIAS_PT, plural: p => p, pre: prePt, pontuacao: PONTUACAO_PT
  };

  /* ── o advérbio de tempo que anda pela frase ──
     «Hoje eu não vou ao escritório» e «Não vou ao escritório hoje» são a mesma
     frase: o português põe o advérbio na frente ou atrás sem mudar nada. Foram
     duas contestações — u010 e v002 — e, sem regra, cada card teria de prever
     as duas ordens na mão, para sempre.

     Aqui o advérbio vai para o fim, venha ele de onde vier, dos dois lados da
     comparação: «hoje não vou», «não vou hoje no escritório» e «não vou no
     escritório hoje» chegam todas ao mesmo lugar. Não há risco de igualar
     coisas diferentes: duas respostas que só diferem na posição do advérbio
     são, em português, a mesma resposta.

     A lista é curta de propósito. Ficam de fora «antes» e «depois», que puxam
     complemento muito mais do que andam sozinhos — «antes de tudo» não é
     «tudo antes» —, e ficam de fora «cedo» e «tarde», que também são
     substantivo: «a tarde» é hora do dia, não é chegar atrasado. */
  const TEMPO = {
    pt: new Set(['hoje', 'ontem', 'amanha', 'agora', 'sempre', 'nunca']),
    es: new Set(['hoy', 'ayer', 'manana', 'ahora', 'siempre', 'nunca']),
    en: new Set(['today', 'yesterday', 'tomorrow', 'now', 'always', 'never']),
    fr: new Set(['hier', 'demain', 'maintenant', 'toujours']),
    la: new Set(),
    it: new Set(['oggi', 'ieri', 'domani', 'adesso', 'sempre']),
    pc: new Set(['hoje', 'ontem', 'amanha', 'agora', 'sempre', 'nunca'])
  };

  function tempoParaOFim(palavras, lingua) {
    const tabela = TEMPO[lingua] || TEMPO.pt;
    if (palavras.length < 2) return palavras;
    const resto = [], tempo = [];
    palavras.forEach(p => (tabela.has(p) ? tempo : resto).push(p));
    return resto.length ? resto.concat(tempo) : palavras;
  }

  /* Português é o padrão: quem já chamava normalizar(txt) continua igual. */
  /* «opcoes.plural = false» desliga o plural = singular. Só a conferência da
     flexão usa: para ela, o «-s» de «apeteces» é a pessoa do verbo. */
  function normalizar(txt, lingua, opcoes) {
    const L = (!lingua || lingua === 'pt') && soIda() ? PT_DO_LATIM : (LINGUAS[lingua] || LINGUAS.pt);
    const comPlural = !opcoes || opcoes.plural !== false;
    /* «opcoes.cru» deixa o sujeito na frase e o advérbio de tempo onde está.
       Só o «deu quase» usa (ver conferir). */
    const cru = !!(opcoes && opcoes.cru);

    /* o latim vai à tela com æ e œ (desde 29/10/2026); quem digita escreve «ae» */
    let texto = String(txt || '').toLowerCase().replace(/æ/g, 'ae').replace(/œ/g, 'oe');
    if (L.guardaAcento) {
      /* NFC junta o «n» e o til numa letra só, para o ñ digitado dos dois
         jeitos chegar ao mesmo lugar. */
      texto = texto.normalize('NFC');
    } else {
      texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');  // tira acentos
    }
    if (L.pre) texto = L.pre(texto);                      // contração, artigo da frente
    const bruto = texto.replace(L.pontuacao, ' ');        // tira pontuação

    const saida = [];
    for (const bruta of bruto.split(/\s+/)) {
      if (!bruta) continue;
      /* a grafia vem primeiro porque pode render mais de uma palavra, e cada
         uma tem de descer o resto do funil como se tivesse sido escrita */
      for (let p of (L.grafias[bruta] || bruta).split(' ')) {
        if (!cru && L.omissiveis.has(p)) continue;        // antes de mexer na palavra
        if (L.numeros[p]) p = L.numeros[p];               // "3 anos" = "três anos"
        if (comPlural) p = L.plural(p);                   // plural = singular
        if (!cru && L.omissiveis.has(p)) continue;        // e de novo, para "eles" → "ele"
        saida.push(p);
      }
    }
    /* resposta que é só palavra omissível («já», para o card de «ya») ficaria
       vazia: aí ela vale como está, e o funil não descarta nada */
    if (!saida.length && !cru) return normalizar(txt, lingua, Object.assign({}, opcoes, { cru: true }));
    if (cru) return saida.join(' ');
    return tempoParaOFim(saida, lingua in LINGUAS ? lingua : 'pt').join(' ');
  }

  /* ── que língua cada direção usa ──
     A direção é sempre "pergunta-resposta": 'es-pt' mostra o espanhol e cobra
     o português, 'es-en' vai cobrar o inglês, 'en-es' vai cobrar o espanhol.
     É daqui que o conferidor tira em que língua a resposta está sendo dada. */
  function linguaDaPergunta(direcao) {
    const l = String(direcao || 'es-pt').split('-')[0];
    return LINGUAS[l] ? l : 'es';
  }
  function linguaDaResposta(direcao) {
    const l = String(direcao || 'es-pt').split('-')[1];
    return LINGUAS[l] ? l : 'pt';
  }
  /* ── o baralho da vez ──
     A ida é reconhecer a língua ensinada (es→pt); a volta é produzi-la
     (pt→es). O espanhol foi o primeiro e é o padrão; o app troca de baralho
     com usarBaralho('en'), e daí a ida é en→pt e a volta pt→en. O que é
     próprio do espanhol (o ñ, a conjugação, a leitura espanhola da pergunta)
     continua preso a 'es-pt' e 'pt-es', e no inglês simplesmente não dispara. */
  let IDA = 'es-pt', VOLTA = 'pt-es';
  /* Desde 07/10/2026 a língua de quem estuda também varia (cursos para quem
     fala espanhol e inglês, inclusive o de português): usarBaralho('pt', 'es')
     faz a ida pt→es e a volta es→pt. Sem a segunda, é o português. */
  function usarBaralho(lingua, audiencia) {
    const a = LINGUAS[audiencia] ? audiencia : 'pt';
    const l = LINGUAS[lingua] && lingua !== a ? lingua : (a === 'es' ? 'en' : 'es');
    IDA = l + '-' + a;
    VOLTA = a + '-' + l;
  }
  function ehVolta(direcao) { return direcao === VOLTA; }
  function direcoes() { return { ida: IDA, volta: VOLTA }; }

  /* ── o modo do curso (cards/LATIM.md §10) ──
     «livre» é o de sempre. «trilhas» é o do latim: só se aprende pelos textos, todo card só
     tem a ida (como o card de leitura) e fica dominado ao fim dela, não há volta nem desafio,
     e a fila da ida não espera mais a volta encher. O app chama usarModo logo depois de
     usarBaralho; quem nunca chama (o build, as ferramentas) fica no «livre». */
  let MODO = 'livre';
  function usarModo(modo) { MODO = modo === 'trilhas' ? 'trilhas' : 'livre'; }
  function modo() { return MODO; }
  function soIda() { return MODO === 'trilhas'; }

  /* ── a escada do curso (decisão do Gere, 2026-11-11; PLANO.md §8, LATIM.md D47) ──
     A «família» da escada é do curso, separada do modo: 'vivas' (padrão, 6 degraus) ou
     'mortas' (latim e as próximas: 7 degraus, o nome é a espera de fato). O app chama
     usarEscada junto com usarBaralho/usarModo; quem nunca chama fica nas vivas. Nenhum
     código fora do motor escreve a quantidade de degraus: tudo sai de aqui. */
  const ESCADAS = {
    vivas: {
      dias: [3, 5, 14, 30, 90, 180],
      nominais: [3, 7, 14, 30, 90, 180],
      pesoDoDegrau: [1, 2, 1, 0.25, 0.25, 0.25],
      pesoNaVez: [2, 2, 1, 0.25, 0.25, 0.25],
      pesoNaParte: [1, 1, 1, 0.25, 0.25, 0.25],
      umPorVezAte: 0,          // sem erro na vida, sobe 2 desde o primeiro degrau
      presumido: 90            // o nivelamento só existe nas vivas
    },
    mortas: {
      dias: [3, 4, 7, 14, 30, 90, 180],
      nominais: [3, 4, 7, 14, 30, 90, 180],
      pesoDoDegrau: [1, 2, 2, 0.25, 0.25, 0.25, 0.25],
      pesoNaVez: [2, 2, 2, 0.25, 0.25, 0.25, 0.25],
      pesoNaParte: [1, 1, 1, 0.25, 0.25, 0.25, 0.25],
      umPorVezAte: 3,          // abaixo do índice 3 (2 semanas) sobe um por acerto
      presumido: null
    }
  };
  /* Os três primeiros degraus (vivas: 3 dias, «1 semana», 2 semanas; mortas: 3, 4 e 7 dias) têm a
     prioridade de sempre; os outros, um quarto dela (pedido do Gere, 27/11/2026: «os outros
     apareçam menos, e os cards na ida e na volta apareçam mais»). O vencido de 1 mês para cima
     vale ¼ na urgência (pesoDoDegrau: vem depois dos curtos), na vez (pesoNaVez) e na parte das
     revisões que os dominados levam quando se acumulam (pesoNaParte, ver parteDosDominados).
     Antes valiam 1, e no espanhol dele 112 vencidos levavam ~63% das revisões; a ida voltava a
     cada 4 ou 5 dias. */
  let ESCADA = 'vivas';
  function usarEscada(nome) { ESCADA = ESCADAS[nome] ? nome : 'vivas'; }
  function escada() { return ESCADA; }
  function degraus() { return ESCADAS[ESCADA].dias.length; }
  /* o índice do degrau da escada em uso pelo nome (3, 7, 14… dias), ou -1 */
  function degrauDoNome(nominal) { return ESCADAS[ESCADA].nominais.indexOf(nominal); }

  /* distância de Levenshtein, a conta dos erros de «parecido».
     Duas letras vizinhas trocadas de lugar contam como UM deslize, e não dois:
     «la crata» por «la carta» caía como erro seco, e foi a mão que correu na
     frente (contestação do p257, 25/10/2026). */
  function distancia(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let antes = null;
    let ant = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const atual = [i];
      for (let j = 1; j <= n; j++) {
        atual[j] = Math.min(
          ant[j] + 1,
          atual[j - 1] + 1,
          ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        if (antes && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== b[j - 1])
          atual[j] = Math.min(atual[j], antes[j - 2] + 1);
      }
      antes = ant;
      ant = atual;
    }
    return ant[n];
  }

  /* Atalhos por língua, para quem já sabe em qual está mexendo. */
  function normalizarEs(txt) { return normalizar(txt, 'es'); }
  function normalizarEn(txt) { return normalizar(txt, 'en'); }

  /* Todas as formas aceitas como resposta certa, na direção pedida.
     Quem manda é a língua da resposta, não a direção: 'en-es' e 'pt-es'
     cobram o mesmo espanhol, e cada língua tem seu par de campos no card. */
  const CAMPOS = {
    pt: { certa: 'pt', aceitas: 'aceitas',   distratores: 'distratores',   formas: 'formasPt', sinonimos: 'sinonimos',   regionais: 'regionais' },
    es: { certa: 'es', aceitas: 'aceitasEs', distratores: 'distratoresEs', formas: 'formasEs', sinonimos: 'sinonimosEs', regionais: 'regionaisEs' },
    en: { certa: 'en', aceitas: 'aceitasEn', distratores: 'distratoresEn', formas: 'formasEn', sinonimos: 'sinonimosEn', regionais: 'regionaisEn' },
    fr: { certa: 'fr', aceitas: 'aceitasFr', distratores: 'distratoresFr', formas: 'formasFr', sinonimos: 'sinonimosFr', regionais: 'regionaisFr' },
    la: { certa: 'la', aceitas: 'aceitasLa', distratores: 'distratoresLa', formas: 'formasLa', sinonimos: 'sinonimosLa', regionais: 'regionaisLa' },
    it: { certa: 'it', aceitas: 'aceitasIt', distratores: 'distratoresIt', formas: 'formasIt', sinonimos: 'sinonimosIt', regionais: 'regionaisIt' },
    pc: { certa: 'pc', aceitas: 'aceitasPc', distratores: 'distratoresPc', formas: 'formasPc', sinonimos: 'sinonimosPc', regionais: 'regionaisPc' }
  };

  /* ── a língua que o baralho ensina ──
     São três baralhos: o de espanhol responde em português e em inglês, o de
     inglês responde em português e em espanhol, o de português responde em
     espanhol e em inglês (ver PLANO.md). O card diz de qual baralho é; sem
     dizer, é espanhol, que foi o primeiro e cujos mil cards não trazem o
     campo. É essa língua que separa RECONHECER de PRODUZIR: na língua de casa
     os quatro distratores vêm escritos no card, e na língua ensinada eles saem
     das outras formas do verbo e do espanhol dos cards vizinhos. */
  function idiomaDoCard(card) {
    return (card && card.idioma) || 'es';
  }

  const Maiuscula = l => l[0].toUpperCase() + l[1];

  /* ── o gabarito (cards/LATIM.md §4) ──
     A frase latina tem muitas traduções certas, e listar todas à mão não acaba. O card traz
     um molde: as alternativas entre colchetes, separadas por «~» («[louvai ~ louvem] o
     Senhor»), a parte opcional com uma alternativa vazia («[eu ~] creio»), colchete dentro de
     colchete. Aqui ele se abre em todas as frases que descreve, e o funil faz o resto (acento,
     artigo, plural…). Chave e barra ficam de fora de propósito: { | } são do card de gênero, e
     a barra separa dois sentidos. Molde malformado ou grande demais devolve a lista vazia com
     «erro», que o build mostra. */
  const GABARITO_MAXIMO = 2000;
  const GABARITOS = new Map();
  function expandirGabarito(g) {
    g = String(g || '');
    if (GABARITOS.has(g)) return GABARITOS.get(g);
    let i = 0;
    function sequencia() {
      let saida = [''];
      while (i < g.length && g[i] !== ']' && g[i] !== '~') {
        if (g[i] === '[') {
          i++;
          const alternativas = [];
          for (;;) {
            alternativas.push(...sequencia());
            if (g[i] === '~') { i++; continue; }
            if (g[i] === ']') { i++; break; }
            throw new Error('falta o «]»');
          }
          const juntas = [];
          for (const a of saida) {
            for (const b of alternativas) {
              juntas.push(a + b);
              if (juntas.length > GABARITO_MAXIMO) throw new Error('mais de ' + GABARITO_MAXIMO + ' frases');
            }
          }
          saida = juntas;
        } else {
          let j = i;
          while (j < g.length && '[]~'.indexOf(g[j]) < 0) j++;
          const pedaco = g.slice(i, j);
          saida = saida.map(a => a + pedaco);
          i = j;
        }
      }
      return saida;
    }
    let lista;
    try {
      lista = sequencia();
      if (i < g.length) throw new Error('«' + g[i] + '» fora de colchete');
      lista = lista.map(s => s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()).filter(Boolean);
    } catch (e) {
      lista = [];
      lista.erro = e.message;
    }
    GABARITOS.set(g, lista);
    return lista;
  }

  function formasAceitas(card, direcao) {
    if (card.tipo === 'flexao') return [card.pt].concat(card.outras || [], card.aceitas || []);
    const lingua = linguaDaResposta(direcao);
    const campo = CAMPOS[lingua];
    const certa = String(card[campo.certa] || '');
    /* a variante regional vale como resposta certa (ver regionalDoCard), menos a irmã, que tem
       card próprio e aqui é o «deu quase» (ver irmaDoCard) */
    const irmas = card.irmaos || [];
    const extras = (card[campo.aceitas] || []).concat(Object.keys(card[campo.regionais] || {}).filter(f => !irmas.includes(f)));
    /* o gabarito é da língua de quem responde: na ida, nunca da língua ensinada */
    const gabarito = card.gabarito && lingua !== idiomaDoCard(card) ? expandirGabarito(card.gabarito) : [];

    /* No espanhol a barra não separa duas respostas: o card traz uma forma
       só, e as variantes vêm por aceitasEs. */
    return lingua === 'es'
      ? [certa, ...extras, ...gabarito]
      : [certa, ...certa.split('/'), ...extras, ...gabarito];
  }

  function respostasAceitas(card, direcao) {
    if (card.tipo === 'flexao') return leiturasDaFlexao(card);
    const lingua = linguaDaResposta(direcao);
    return formasAceitas(card, direcao).map(t => normalizar(t, lingua)).filter(Boolean);
  }

  /* ── o card que muda de gênero ──
     «Tu hermano es muy majo» e «Tu hermana es muy maja» são a mesma lição:
     o que muda é de quem se fala. Dois cards guardariam duas vezes o mesmo
     ensinamento — e quem tirasse o primeiro veria o masculino para sempre,
     sem nunca topar com a terminação que o espanhol muda. Então o card é um
     só e carrega as duas formas no mesmo texto, entre chaves:

       "es": "Tu herman{o|a} es muy maj{o|a}."
       "pt": "{Teu irmão|Tua irmã} é muito simpátic{o|a}."

     Antes da barra o masculino, depois dela o feminino. A cada aparição
     sorteia-se UM lado, e ele vale para o card inteiro — es, pt, en, aceitas,
     distratores, formasEs e nota. Não é capricho: com a escolha feita campo a
     campo, a pergunta sairia no feminino e a resposta certa no masculino.

     O que não está entre chaves não muda, e é isso que faz a marcação ser
     barata: as aceitas que já trazem os dois gêneros («simpatico»,
     «simpatica») continuam valendo nas duas formas. */
  const VARIANTE = /\{([^{}|]*)\|([^{}|]*)\}/g;

  function temVariante(v) {
    if (typeof v === 'string') return v.indexOf('{') >= 0;
    if (Array.isArray(v)) return v.some(temVariante);
    if (v && typeof v === 'object') {
      return Object.keys(v).some(k => temVariante(k) || temVariante(v[k]));
    }
    return false;
  }

  function generoDoTexto(txt, i) {
    return String(txt).replace(VARIANTE, (_, masculino, feminino) => (i ? feminino : masculino));
  }

  /* As formasEs guardam o texto na CHAVE do objeto, e o rótulo no valor:
     «Ayer lo sabía» também pode trazer gênero, então a chave é resolvida
     como qualquer outro texto. */
  function generoDoValor(v, i) {
    if (typeof v === 'string') return generoDoTexto(v, i);
    if (Array.isArray(v)) return v.map(x => generoDoValor(x, i));
    if (v && typeof v === 'object') {
      const saida = {};
      Object.keys(v).forEach(k => { saida[generoDoTexto(k, i)] = generoDoValor(v[k], i); });
      return saida;
    }
    return v;
  }

  /* O card numa das duas formas: 0 é o masculino, 1 o feminino. Card sem
     chave nenhuma volta como está — são quase todos, e nenhum deles precisa
     de uma cópia. */
  function formaDoCard(card, i) {
    if (!card || !temVariante(card)) return card;
    const saida = {};
    Object.keys(card).forEach(k => { saida[k] = generoDoValor(card[k], i); });
    return saida;
  }

  /* As duas formas, para quem precisa conferir as duas: é assim que o build
     valida um card de gênero, passando cada forma pelas mesmas checagens. */
  function formasDoCard(card) {
    return temVariante(card) ? [formaDoCard(card, 0), formaDoCard(card, 1)] : [card];
  }

  function sortearForma(card) {
    return formaDoCard(card, Math.random() < 0.5 ? 1 : 0);
  }

  /* ── teto de cada campo de texto ──
     Num app de uma pessoa só, campo sem limite nunca incomodou. Com mais
     gente usando, cada caractere digitado vai parar no progresso.json e
     sobe para o repositório a cada três respostas — e é o navegador de
     quem responde que decide o tamanho. Os números saem do baralho, com
     folga: a maior resposta tem 54 caracteres, a maior nota tem 559. */
  const LIMITES = {
    resposta: 120,      // o campo de responder
    comentario: 500,    // comentário livre sobre um card
    campoCurto: 200,    // resposta, distrator e variante nas telas de revisão
    nota: 900           // a nota, nas telas de revisão
  };

  function cortar(txt, limite) {
    return String(txt == null ? '' : txt).slice(0, limite);
  }

  /* ── o gênero do artigo ──
     Omitir o artigo é permitido: quem responde «vaso» sabe tanto quanto
     quem responde «el vaso», e é por isso que o artigo cai na normalização.
     Escrever o artigo errado é outra coisa — não é omitir, é afirmar o
     gênero errado, e o gênero é metade do que o card de substantivo ensina.
     «el luna» tem de ser erro.

     Só o artigo da frente entra na conta. Policiar os do meio da frase
     esbarraria em contração («a la», «del») e daria falso negativo sem
     ensinar nada — e é na frente que o gênero do substantivo se declara. */
  const ARTIGOS_GENERO = {
    es: tabela({ el:'m', los:'m', un:'m', unos:'m', la:'f', las:'f', una:'f', unas:'f' }),
    pt: tabela({ o:'m', os:'m', um:'m', uns:'m', a:'f', as:'f', uma:'f', umas:'f' }),
    en: tabela({}),
    fr: tabela({ le:'m', un:'m', la:'f', une:'f' }),
    it: tabela({ il:'m', lo:'m', un:'m', uno:'m', i:'m', gli:'m', la:'f', una:'f', le:'f' }),
    pc: tabela({ o:'m', os:'m', um:'m', uns:'m', a:'f', as:'f', uma:'f', umas:'f' })
  };

  function generoDaFrente(txt, lingua) {
    const primeira = String(txt || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/)[0];
    return (ARTIGOS_GENERO[lingua] || {})[primeira] || null;
  }

  /* ── respondeu certo, na língua errada ──
     Nos falsos amigos acontece de ler o espanhol como se fosse português e
     responder o espanhol da OUTRA palavra: «la sobremesa» pede «a conversa
     depois da refeição», e sai «el postre» — que é a resposta certa da
     pergunta espelhada. Estar atento às bandeiras não resolve; a palavra é
     que engana.

     A nota do card já carrega esses pares, um por linha, no formato
     «🇪🇸 x → 🇧🇷 y»: são 156 pares em 73 cards, e é de lá que sai a lista de
     espanhóis que valem como aviso, sem adivinhação nenhuma. Junto com eles
     entra a própria palavra da pergunta.

     Vale só em es→pt, que é o lado onde a resposta devia estar em português.
     Na volta, responder em espanhol é o que se pede.

     Quem chama isto é o app, e só depois de a resposta ter sido dada como
     errada — então nunca há risco de barrar uma tradução boa. */
  /* Desde 07/10/2026 vale em todo curso: a língua da pergunta é a ensinada,
     os pares vêm da nota do público («nota», «notaEs», «notaEn»), no formato
     «bandeira da ensinada x → bandeira do público y» — «🇺🇸 gun → 🇧🇷 a
     arma» no inglês, «🇧🇷 esquisito → 🇪🇸 raro» no português. */
  const BANDEIRA_DA_LINGUA = { es: '🇪🇸', pt: '🇧🇷', en: '🇺🇸', fr: '🇫🇷', la: '🇻🇦', it: '🇮🇹', pc: '📖' };
  const notaDoPublico = (card, a) => String((card && card[a === 'pt' ? 'nota' : 'nota' + a[0].toUpperCase() + a[1]]) || '');
  function espanhoisDoCard(card, direcao) {
    const l = linguaDaPergunta(direcao || IDA), a = linguaDaResposta(direcao || IDA);
    const saida = [String((card && card[CAMPOS[l].certa]) || '')].concat(Object.keys((card && card[CAMPOS[l].regionais]) || {}));
    const par = new RegExp(BANDEIRA_DA_LINGUA[l] + '\\s*([^→\\n]+?)\\s*→\\s*' + BANDEIRA_DA_LINGUA[a], 'g');
    let m;
    while ((m = par.exec(notaDoPublico(card, a)))) {
      m[1].split(',').forEach(t => saida.push(t.trim()));
    }
    return saida.filter(Boolean);
  }

  /* Aqui a régua é a frouxa, de propósito. Reconhecer que a resposta saiu em
     espanhol é outra pergunta que corrigir espanhol: quem escreve «el raton»
     sem o acento em es→pt não está errando o espanhol — está respondendo na
     língua errada, e é disso que ele precisa ser avisado. */
  function semAcento(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /* ── o acento e o «ñ» não são a mesma coisa ──
     O acento espanhol muda a sílaba tônica, e errá-lo é um deslize de escrita
     — vale corrigir, não vale reprovar. Já o «ñ» é OUTRA LETRA: «año» e «ano»
     são duas palavras, e confundi-las é constrangedor. Então:

       só faltou acento   →  a resposta conta como certa, com um aviso
       o «ñ» virou «n»    →  erro seco, como o do gênero e o da conjugação

     Esta função acha a forma certa quando o que ele escreveu bate com ela a
     menos de acento e/ou «ñ», e diz de qual dos dois casos se trata. Quando
     há as duas diferenças ao mesmo tempo, manda o «ñ»: é o que pesa.

     Devolve o texto ORIGINAL do card, e não o normalizado: quem vai aparecer
     na tela é «apañárselas», não «apañársela», que é o que sobra do funil. */
  function semAcentoMantendoEne(t) {
    return String(t || '').normalize('NFC').toLowerCase()
      .replace(/ñ/g, '\u0001')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0001/g, 'ñ');
  }

  /* «Él dijo la verdad» escrito «el dijo la verdad»: os dois soltam o
     sujeito e chegam iguais, e a resposta conta como certa — mas o acento é
     o que separa o pronome do artigo, e vale o aviso. Só quando ele escreveu
     o «el» na frente e o card começa por «Él». */
  function pronomeSemAcento(card, texto, direcao) {
    if (!/^[\s¡¿"«]*el\s/i.test(String(texto || '').normalize('NFC'))) return null;
    const dado = normalizarEs(texto);
    const alvo = formasAceitas(card, direcao).find(f =>
      /^[\s¡¿"«]*él\s/i.test(String(f).normalize('NFC')) && normalizar(f, 'es') === dado);
    return alvo ? String(alvo).trim() : null;
  }

  function difDeGrafiaEs(card, texto, direcao) {
    if (linguaDaResposta(direcao) !== 'es') return null;
    const dado = normalizarEs(texto);
    if (!dado) return null;
    if (respostasAceitas(card, direcao).includes(dado)) {    // acertou, acento e tudo
      const forma = pronomeSemAcento(card, texto, direcao);   // — menos o do «él»
      return forma ? { forma: forma, classe: 'acento' } : null;
    }
    const comEne = semAcentoMantendoEne(dado);
    const semNada = semAcento(dado);
    /* O acento que separa duas palavras («tú» e «tu», «él» e «el») muda o que o funil tira:
       «Yo que tú, no lo haría» solta o «tú», sujeito, e «yo que tu…» guarda o «tu». Por isso a
       comparação também se faz tirando o acento ANTES do funil, dos dois lados (v096, 13/11). */
    const cru = normalizarEs(semAcentoMantendoEne(texto));
    let doEne = null;
    for (const alvo of formasAceitas(card, direcao)) {
      const n = normalizar(alvo, 'es');
      if (semAcentoMantendoEne(n) === comEne || (cru && normalizarEs(semAcentoMantendoEne(alvo)) === cru)) {
        return { forma: String(alvo).trim(), classe: 'acento' };
      }
      if (!doEne && semAcento(n) === semNada) doEne = String(alvo).trim();
    }
    return doEne ? { forma: doEne, classe: 'ene' } : null;
  }

  /* O «ñ» errado: erro seco. */
  function erroDeEne(card, texto, direcao) {
    const d = difDeGrafiaEs(card, texto, direcao);
    return d && d.classe === 'ene' ? d.forma : null;
  }

  /* Só o acento: conta como acerto, e o app chama atenção. */
  function acentoRelevado(card, texto, direcao) {
    const d = difDeGrafiaEs(card, texto, direcao);
    return d && d.classe === 'acento' ? d.forma : null;
  }

  /* ── onde exatamente o acento caiu ──
     «No creo que sea fácil» tem cinco palavras e só uma com acento. Mostrar a
     frase inteira no aviso obriga a procurar; mostrar «fácil» vai direto. E
     na resposta certa, embaixo, a letra que faltou ganha cor.

     Vale para os dois lados do erro: o acento que faltou («facil») e o que
     sobrou («me dá corte», «água», «dió»). No segundo, a palavra certa não
     tem acento nenhum, e o que se pinta é a letra onde ele o pôs.

     Devolve as palavras certas em que o acento saiu errado, e a resposta
     certa fatiada em pedaços — cada letra errada vem marcada, para o app
     pintar. Uma palavra que ele escreveu certa não é marcada, mesmo que
     outra da frase tenha saído errada. */
  const LETRA = /[a-z0-9áéíóúüñ]/i;
  const PALAVRA = /[a-z0-9áéíóúüñ]+/gi;

  function acentoFaltando(card, texto, direcao) {
    const certo = acentoRelevado(card, texto, direcao);
    if (!certo) return null;
    const escritas = String(texto || '').normalize('NFC').toLowerCase().match(PALAVRA) || [];
    const palavras = [];
    const pedacos = [];
    String(certo).normalize('NFC').split(/([^a-z0-9áéíóúüñ]+)/i).forEach(p => {
      if (!p) return;
      const minus = p.toLowerCase();
      if (!LETRA.test(p) || escritas.includes(minus)) {
        pedacos.push({ texto: p, destaque: false });
        return;
      }
      /* A mesma palavra, escrita com o acento em outro lugar ou a mais. */
      const base = semAcentoMantendoEne(minus);
      const par = escritas.find(w => w.length === minus.length && semAcentoMantendoEne(w) === base);
      if (!par && !/[áéíóúü]/i.test(p)) { pedacos.push({ texto: p, destaque: false }); return; }
      palavras.push(p);
      p.split('').forEach((ch, i) => pedacos.push({
        texto: ch,
        destaque: par ? ch.toLowerCase() !== par[i] : /[áéíóúü]/i.test(ch)
      }));
    });
    return palavras.length ? { palavras: palavras, pedacos: pedacos } : null;
  }

  /* ── a pergunta em português, lida como espanhol ──
     O mesmo tropeço, na volta. A pergunta é «a cola», em português, e pede
     «el pegamento». Mas «cola» também é palavra espanhola — é a fila —, e o
     olho que já está no espanhol lê a pergunta como espanhol e responde «a
     fila», a tradução dela. É certo, na língua errada, e merece o mesmo aviso.

     Para saber o que a pergunta quer dizer em espanhol, não há lista à
     parte: o próprio baralho sabe. Cada card diz o que o seu espanhol
     significa em português (o «pt» e as «aceitas»), e as notas trazem mais
     pares «🇪🇸 x → 🇧🇷 y». Juntos, viram um índice: o espanhol, chaveado sem
     artigo e sem acento, aponta para as traduções dele. Se a pergunta lida
     como espanhol cai numa chave, e a resposta é uma daquelas traduções, foi
     a leitura trocada.

     O índice se monta uma vez, no app, a partir de todos os cards. O
     espanhol de um card não conta contra a pergunta dele mesmo — «acatar»
     pergunta «acatar» —, mas as notas dele contam: é na nota de «a tela»
     que mora «🇪🇸 la tela → 🇧🇷 o tecido», justamente para esta pergunta. E
     a tradução igual à própria pergunta não vale como tropeço: aí não há
     leitura trocada nenhuma, só cognato. */
  function chaveDeLeitura(t) {
    /* «a oficina (mecânica)»: o parêntese explica a pergunta, não faz parte
       do que o olho lê como espanhol */
    return semAcento(normalizarEs(String(t || '').replace(/\([^)]*\)/g, ' ')));
  }

  function indiceEspanhol(cards) {
    const indice = new Map();
    const guardar = (es, pts, id) => {
      const chave = chaveDeLeitura(es);
      if (!chave) return;
      const lista = indice.get(chave) || [];
      lista.push({ id: id, es: String(es).trim(),
                   pts: pts.map(p => String(p).trim()).filter(Boolean) });
      indice.set(chave, lista);
    };
    /* O card de gênero entra com as duas formas: quem responde no feminino
       a uma pergunta que saiu no masculino merece o mesmo aviso. */
    (cards || []).forEach(bruto => formasDoCard(bruto).forEach(c => {
      guardar(c.es, String(c.pt || '').split('/').concat(c.aceitas || []), c.id);
      const par = /🇪🇸\s*([^→\n]+?)\s*→\s*🇧🇷\s*([^\n]+)/g;
      let m;
      while ((m = par.exec(String(c.nota || '')))) {
        const pts = m[2].split(',');
        m[1].split(',').forEach(es => guardar(es, pts, c.id));
      }
    }));
    return indice;
  }

  function leituraEspanhola(card, texto, direcao, indice) {
    if (direcao !== 'pt-es' || !indice) return null;
    const dado = normalizar(texto, 'pt');
    if (!dado) return null;
    for (const pergunta of String(card.pt || '').split('/')) {
      const propriaPergunta = normalizar(pergunta.replace(/\([^)]*\)/g, ' '), 'pt');
      if (dado === propriaPergunta) continue;
      /* O artigo da pergunta é português («a cola», «o rato»), e o normalizar do espanhol não
         o conhece: com ele, a chave ficava «a cola» e nunca achava «cola» no índice (achado na
         revisão dos comentários, 24/10/2026). Sai aqui, e não no chaveDeLeitura, que também
         monta o índice. O ARTIGO_PT é o dos distratores, mais abaixo. */
      for (const ent of (indice.get(chaveDeLeitura(pergunta.trim().replace(ARTIGO_PT, ''))) || [])) {
        if (chaveDeLeitura(ent.es) === chaveDeLeitura(card.es)) continue;   // o espanhol do próprio card
        if (ent.pts.some(p => normalizar(p, 'pt') === dado)) {
          return { pergunta: pergunta.trim(), espanhol: ent.es, resposta: String(texto).trim() };
        }
      }
    }
    return null;
  }

  function linguaTrocada(card, texto, direcao) {
    if (direcao !== IDA) return null;
    const l = linguaDaPergunta(direcao);
    const dado = semAcento(normalizar(texto, l));
    if (!dado) return null;
    const espanhois = espanhoisDoCard(card, direcao);
    for (let i = 0; i < espanhois.length; i++) {
      if (semAcento(normalizar(espanhois[i], l)) === dado) {
        return { palavra: espanhois[i], propria: i === 0 };
      }
    }
    return null;
  }

  /* ── a palavra de outro lugar ──
     O baralho é da Espanha, mas o espanhol não é só dela: «la computadora»
     é o computador de toda a América Latina, e «el cardenal» é o roxo da
     pancada na Espanha, onde o card traz «el moretón». Até 26/09 a variante
     de outro lugar ou ficava de fora ou dava só uma segunda chance; agora ela
     vale como resposta certa, e o app diz de onde ela é (pedido do Gere).

     Cada card guarda as suas em «regionaisEs»: a variante, e onde se usa —
     escrito com a preposição, para caber na frase do aviso: «na América
     Latina», «no México», «na Argentina e no Uruguai», «na Espanha».
     formasAceitas já as conta como certas; esta função só diz, depois do
     acerto, se a resposta foi uma delas. */
  function regionalDoCard(card, texto, direcao) {
    const lingua = linguaDaResposta(direcao);
    const mapa = (card && card[CAMPOS[lingua].regionais]) || {};
    const dado = semAcento(normalizar(texto, lingua));
    if (!dado) return null;
    const certa = String(card[CAMPOS[lingua].certa] || '').trim();
    const daCerta = semAcento(normalizar(certa, lingua));
    for (const forma of Object.keys(mapa)) {
      const chave = semAcento(normalizar(forma, lingua));
      if (chave !== dado) continue;
      /* «el sartén» da América Latina e «la sartén» da Espanha só diferem no
         artigo, que o funil tira: aí quem decide é o artigo escrito, e sem
         artigo não há o que avisar */
      if (chave === daCerta) {
        const g = generoDaFrente(texto, lingua);
        if (!g || g !== generoDaFrente(forma, lingua)) continue;
      }
      return { forma: forma, onde: mapa[forma], certa: certa };
    }
    return null;
  }

  /* ── a irmã de outro lugar ──
     Desde 26/11/2026 a forma de cada lugar pode ter card próprio, com o mapa dos países
     onde se usa («paises», manual §5.4): «el móvil» na Espanha e «el celular» na América
     Latina. A volta pergunta «o celular» com o mapa pintado, e escrever a forma do outro
     lugar não é a resposta pedida. O build grava as irmãs em «irmaos» (as formas de
     «regionaisEs» que são o texto de outro card com países). A régua é a do funil, e o
     erro de digitação na irmã também conta: «el celuar» no card da Espanha. */
  function irmaDoCard(card, texto, direcao) {
    const irmas = (card && card.irmaos) || [];
    if (!irmas.length) return null;
    const lingua = linguaDaResposta(direcao);
    if (lingua !== idiomaDoCard(card)) return null;
    const dado = semAcento(normalizar(texto, lingua));
    if (!dado) return null;
    const mapa = card[CAMPOS[lingua].regionais] || {};
    const achou = forma => ({ forma: forma, onde: mapa[forma] || '', certa: String(card[CAMPOS[lingua].certa] || '').trim(), aqui: card.ondeRegiao || '' });
    const exata = irmas.find(f => semAcento(normalizar(f, lingua)) === dado);
    if (exata) return achou(exata);
    /* o erro de digitação na irmã, se não for também perto da forma pedida */
    const minhas = respostasAceitas(card, direcao).map(semAcento);
    if (minhas.some(a => parecido(dado, a, lingua))) return null;
    const perto = irmas.find(f => parecido(dado, semAcento(normalizar(f, lingua)), lingua));
    return perto ? achou(perto) : null;
  }

  /* ── certo, mas não é a palavra do card ──
     «currar» é trabalhar, na gíria da Espanha. Na volta, a pergunta é
     «trabalhar», e quem escreve «trabajar» acertou o espanhol — só não o
     espanhol que o card ensina. Contar erro seria punir quem sabe; contar
     acerto seria deixar a gíria para sempre sem aprender. Então o app faz o
     que faria um professor: diz que está certo, que não é essa, e dá a
     primeira letra da que é (pedido do p042).

     As outras palavras vêm do próprio card, em «sinonimosEs» (e
     «sinonimosEn», «sinonimos», para os outros baralhos): o espanhol
     corrente que diz a mesma coisa. Não há como adivinhá-las pelo baralho —
     o índice das traduções confunde homônimo com sinônimo («a colher» é
     «la cuchara» e é «coger»; «a cadeira» é «la silla» e é «la asignatura»),
     e o aviso sairia para quem escreveu outra coisa.

     A régua é a frouxa, como a da língua trocada: aqui não se corrige
     grafia, só se reconhece a palavra. Quem chama é o app, e só depois de a
     resposta ter sido dada como errada. */
  function sinonimoDoCard(card, texto, direcao) {
    const lingua = linguaDaResposta(direcao);
    const lista = (card && card[CAMPOS[lingua].sinonimos]) || [];
    const dado = semAcento(normalizar(texto, lingua));
    if (!dado || !lista.length) return null;
    const palavra = lista.find(s => semAcento(normalizar(s, lingua)) === dado);
    if (!palavra) return null;
    const certa = card[CAMPOS[lingua].certa];
    /* Na frase («Esa película mola mucho» contra «… es muy buena»), a primeira letra da frase
       não ajuda: a dica é a da primeira palavra do card que a pessoa não escreveu (desde 29/10). */
    if (card.tipo === 'frase') {
      const escritas = new Set(dado.split(' '));
      const falta = (String(certa || '').normalize('NFC').match(PALAVRA) || [])
        .find(p => !escritas.has(semAcento(normalizar(p, lingua))));
      return { palavra: String(palavra).trim(), dica: falta ? primeiraLetra(falta) : '', frase: true };
    }
    return { palavra: String(palavra).trim(), dica: primeiraLetra(certa) };
  }

  /* A primeira letra do que se pede, sem o artigo e sem o «¿» da frente:
     «el ordenador» começa com «o», «¿Te apetece?» com «t». */
  function primeiraLetra(txt) {
    const t = String(txt || '').normalize('NFC').toLowerCase().trim()
      .replace(/^[¿¡"«(\s]+/, '')
      .replace(/^(el|la|los|las|un|una|unos|unas|o|a|os|as|um|uma|the|an|le|les|une|des)\s+/, '')
      .replace(/^l['’]/, '');
    const m = t.match(/[a-záéíóúüñ]/);
    return m ? m[0] : '';
  }

  /* ── o gênero que muda a palavra inteira ──
     «la servilleta» escrita «el servilleto»: o artigo e a terminação foram
     juntos para o masculino. O funil tira o artigo, e sobrava «servilleto»
     contra «servilleta» — uma letra, que caía no «deu quase» como se fosse a
     mão escorregando. Não foi: foi o gênero, que é o que o card ensina.

     Conta como troca de gênero quando as duas frases têm as mesmas palavras
     e as que diferem só trocam -o por -a (ou -os por -as) no fim. O radical
     precisa de duas letras: «lo» e «la» são pronomes, e trocar um pelo
     outro é outro erro. Vale só no espanhol, e só nos cards de palavra: numa
     frase, «hablo» e «habla» também trocam -o por -a, e ali o erro é de
     pessoa, não de gênero. */
  function terminacaoTrocada(a, b) {
    const pa = a.split(' '), pb = b.split(' ');
    if (pa.length !== pb.length) return false;
    let trocas = 0;
    for (let i = 0; i < pa.length; i++) {
      if (pa[i] === pb[i]) continue;
      const x = pa[i].match(/^(.{2,}?)([oa])(s?)$/);
      const y = pb[i].match(/^(.{2,}?)([oa])(s?)$/);
      if (!x || !y || x[1] !== y[1] || x[3] !== y[3] || x[2] === y[2]) return false;
      trocas++;
    }
    return trocas > 0;
  }

  /* Devolve o artigo que era esperado quando o que ele escreveu bate no
     resto mas erra o gênero — e null quando não há erro de gênero nenhum. */
  function erroDeGenero(card, texto, direcao) {
    const lingua = linguaDaResposta(direcao);
    if (lingua === 'es' && card && card.tipo === 'palavra') {
      const dado = normalizar(texto, lingua);
      if (dado && !respostasAceitas(card, direcao).includes(dado)) {
        const alvo = formasAceitas(card, direcao)
          .find(f => terminacaoTrocada(semAcento(normalizar(f, lingua)), semAcento(dado)));
        if (alvo) return String(alvo).trim();
      }
    }
    const dadoGenero = generoDaFrente(texto, lingua);
    if (!dadoGenero) return null;              // não escreveu artigo: pode omitir

    const dado = normalizar(texto, lingua);
    /* Entre as formas aceitas, só interessam as que casam com o que ele
       escreveu e trazem artigo. Um card pode aceitar sinônimo de outro
       gênero («o quadril» e «a bacia»), e comparar com a forma canônica
       reprovaria o sinônimo legítimo. */
    const candidatas = formasAceitas(card, direcao)
      .filter(f => normalizar(f, lingua) === dado && generoDaFrente(f, lingua));
    if (!candidatas.length) return null;       // nenhuma forma aceita traz artigo
    if (candidatas.some(f => generoDaFrente(f, lingua) === dadoGenero)) return null;
    return candidatas[0];
  }

  /* Confere a resposta escrita. Devolve 'certo' | 'quase' | 'errado'.

     'certo' é só o que consta da lista do card depois de normalizado —
     nenhuma semelhança de texto vira acerto sozinha.

     'quase' não decide nada: marca que a resposta chegou perto o bastante
     para valer a pergunta, e quem julga é a pessoa. Perto o bastante é a
     régua de «parecido», a mesma em toda língua e em todo card.

     Desde 12/11/2026 (pedido do Gere) não há mais erro seco por tipo de erro:
     o gênero trocado, a outra pessoa do verbo, o «n» por «ñ» e a resposta
     igual a uma alternativa errada passam pela mesma régua. Muitas vezes são
     a mão, e quem sabe é quem escreveu. O nome do erro (gênero, ñ, forma) o
     app só mostra quando a resposta fica fora da régua.

     Número em algarismos vale pelo número por extenso (o Gere, 15/11: «Posso responder com
     numerais, mas quero que o card na língua sendo estudada coloque o número por extenso»):
     «2010» é «dos mil diez», «2 horas» é «duas horas». Ver porExtenso. */
  function conferir(card, texto, direcao) {
    const r = conferirTexto(card, texto, direcao);
    if (r === 'certo' || !/\d/.test(String(texto || ''))) return r;
    let melhor = r;
    for (const v of porExtenso(texto, linguaDaResposta(direcao))) {
      const x = conferirTexto(card, v, direcao);
      if (x === 'certo') return x;
      if (x === 'quase') melhor = x;
    }
    return melhor;
  }

  /* ── o número por extenso ──
     Todas as leituras de cada número do texto (0 a 9999), na língua da resposta: os dois gêneros
     (um/uma, dois/duas, duzentos/duzentas; uno/un/una; un/une) e, no inglês e no francês, o
     ano dito em duas partes («nineteen twenty», «dix-neuf cent vingt»). Devolve os textos com os
     algarismos trocados, no máximo 24. */
  const POR_EXTENSO = {
    pt: n => {
      const u = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
        'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
      const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
      const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
        'setecentos', 'oitocentos', 'novecentos'];
      const ate999 = x => {
        if (x < 20) return u[x];
        if (x < 100) return d[Math.floor(x / 10)] + (x % 10 ? ' e ' + u[x % 10] : '');
        if (x === 100) return 'cem';
        return c[Math.floor(x / 100)] + (x % 100 ? ' e ' + ate999(x % 100) : '');
      };
      const m = Math.floor(n / 1000), r = n % 1000;
      const masc = m ? (m === 1 ? 'mil' : ate999(m) + ' mil') +
        (r ? ((r < 100 || r % 100 === 0) ? ' e ' : ' ') + ate999(r) : '') : ate999(n);
      const fem = masc.replace(/\bum\b/g, 'uma').replace(/\bdois\b/g, 'duas').replace(/entos\b/g, 'entas');
      return [masc, fem, masc.replace(/catorze/g, 'quatorze')];
    },
    es: n => {
      const u = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
        'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
        'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
        'veintisiete', 'veintiocho', 'veintinueve'];
      const d = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
      const c = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
        'setecientos', 'ochocientos', 'novecientos'];
      const ate999 = x => {
        if (x < 30) return u[x];
        if (x < 100) return d[Math.floor(x / 10)] + (x % 10 ? ' y ' + u[x % 10] : '');
        if (x === 100) return 'cien';
        return c[Math.floor(x / 100)] + (x % 100 ? ' ' + ate999(x % 100) : '');
      };
      const m = Math.floor(n / 1000), r = n % 1000;
      const masc = m ? (m === 1 ? 'mil' : ate999(m) + ' mil') + (r ? ' ' + ate999(r) : '') : ate999(n);
      return [masc,
        masc.replace(/veintiuno$/, 'veintiún').replace(/\buno$/, 'un'),          // antes do nome
        masc.replace(/uno$/, 'una').replace(/ientos\b/g, 'ientas')];
    },
    en: n => {
      const u = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
      const d = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
      const ate99 = x => x < 20 ? u[x] : d[Math.floor(x / 10)] + (x % 10 ? '-' + u[x % 10] : '');
      const ate999 = (x, e) => x < 100 ? ate99(x)
        : u[Math.floor(x / 100)] + ' hundred' + (x % 100 ? (e ? ' and ' : ' ') + ate99(x % 100) : '');
      const cheio = e => {
        const m = Math.floor(n / 1000), r = n % 1000;
        return m ? ate999(m, e) + ' thousand' + (r ? (r < 100 && e ? ' and ' : ' ') + ate999(r, e) : '') : ate999(n, e);
      };
      const saida = [cheio(true), cheio(false)];
      if (n >= 1100 && n <= 2099 && n % 1000 >= 10 || (n >= 1100 && n < 2000)) {      // o ano
        const a = Math.floor(n / 100), b = n % 100;
        saida.push(ate99(a) + ' ' + (b === 0 ? 'hundred' : b < 10 ? 'oh ' + u[b] : ate99(b)));
        if (b === 0) saida.push(ate99(a) + ' hundred');
      }
      return saida;
    },
    fr: n => {
      const u = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
        'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
      const d = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
      const ate99 = x => {
        if (x < 20) return u[x];
        const t = Math.floor(x / 10), r = x % 10;
        if (t < 7) return d[t] + (r === 1 ? ' et un' : r ? '-' + u[r] : '');
        if (t === 7) return 'soixante' + (r === 1 ? ' et onze' : '-' + u[10 + r]);
        if (t === 8) return 'quatre-vingt' + (r ? '-' + u[r] : 's');
        return 'quatre-vingt-' + u[10 + r];
      };
      const ate999 = x => {
        if (x < 100) return ate99(x);
        const c = Math.floor(x / 100), r = x % 100;
        return (c === 1 ? 'cent' : u[c] + ' cent' + (r ? '' : 's')) + (r ? ' ' + ate99(r) : '');
      };
      const m = Math.floor(n / 1000), r = n % 1000;
      const masc = m ? (m === 1 ? 'mille' : ate999(m).replace(/cents$/, 'cent') + ' mille') + (r ? ' ' + ate999(r) : '') : ate999(n);
      const saida = [masc, masc.replace(/\bun$/, 'une')];
      if (n >= 1100 && n < 2000) saida.push(ate99(Math.floor(n / 100)) + ' cent' + (n % 100 ? ' ' + ate99(n % 100) : ''));
      return saida;
    },
    it: n => {
      const u = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
        'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
      const d = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
      const ate99 = x => {
        if (x < 20) return u[x];
        const t = d[Math.floor(x / 10)], r = x % 10;
        if (!r) return t;
        return (r === 1 || r === 8 ? t.slice(0, -1) : t) + (r === 3 ? 'tré' : u[r]);
      };
      const ate999 = x => x < 100 ? ate99(x)
        : (x < 200 ? 'cento' : u[Math.floor(x / 100)] + 'cento') + (x % 100 ? ate99(x % 100) : '');
      const m = Math.floor(n / 1000), r = n % 1000;
      const junto = m ? (m === 1 ? 'mille' : ate999(m) + 'mila') + (r ? ate999(r) : '') : ate999(n);
      const saida = [junto, junto.replace(/uno$/, 'una'), junto.replace(/uno$/, 'un'), junto.replace(/centoo/g, 'cento')];
      if (m) saida.push((m === 1 ? 'mille' : ate999(m) + 'mila') + (r ? ' ' + ate999(r) : ''));
      return saida;
    }
  };

  function porExtenso(texto, lingua) {
    const ler = POR_EXTENSO[lingua];
    const t = String(texto || '');
    if (!ler || !/\d/.test(t)) return [];
    let saida = [''];
    for (const p of t.split(/(\d+)/)) {
      if (/^\d+$/.test(p) && +p <= 9999 && !(p.length > 1 && p[0] === '0')) {
        const leituras = Array.from(new Set(ler(+p)));
        const novo = [];
        saida.forEach(s => leituras.forEach(l => novo.push(s + l)));
        saida = novo.slice(0, 24);
      } else {
        saida = saida.map(s => s + p);
      }
    }
    return saida.filter(s => s !== t);
  }

  function conferirTexto(card, texto, direcao) {
    /* o card de flexão tem a régua dele, em que o artigo é resposta (ver conferirFlexao) */
    if (card.tipo === 'flexao') return conferirFlexao(card, texto);
    const lingua = linguaDaResposta(direcao);
    const dado = normalizar(texto, lingua);
    if (!dado) return 'errado';
    if (card.tipo === 'forma') return conferirForma(card, texto);

    const aceitas = respostasAceitas(card, direcao);

    /* O funil tira o artigo, e «el mano» chegaria igual a «la mano»: não é
       acerto, é uma palavra trocada, e vale a pergunta. */
    if (aceitas.includes(dado) && erroDeGenero(card, texto, direcao)) return 'quase';

    /* O funil também lê plural como singular, e «apeteces» chegaria igual a
       «apetece». Aqui a régua é aplicada sem essa folga. */
    if (erroDeFlexao(card, texto, direcao)) {
      const semFolga = t => normalizar(t, lingua, { plural: false });
      return formasAceitas(card, direcao).some(f => parecido(semFolga(texto), semFolga(f), lingua))
        ? 'quase' : 'errado';
    }

    if (aceitas.includes(dado)) return 'certo';

    /* A forma irmã, de outro lugar, que tem card próprio: «el celular» no card que pede a da
       Espanha. Não é erro, mas também não é a forma pedida: quem julga é a pessoa, com o aviso
       de onde ela se usa (pedido do Gere, 26/11/2026). */
    if (irmaDoCard(card, texto, direcao)) return 'quase';

    /* Faltou só o acento: conta como certo. Quem avisa é o app. */
    if (acentoRelevado(card, texto, direcao)) return 'certo';

    if (aceitas.some(alvo => parecido(dado, alvo, lingua))) return 'quase';

    /* O erro de digitação que cai justo numa palavra que o funil trata.
       «elles estudiarán» por «ellos estudiarán»: o sujeito certo sairia da
       frase, o errado fica, e a conta via uma palavra a mais. «No hoy sitio»
       por «no hay sitio»: o «hoy» é advérbio de tempo, vai para o fim, e a
       frase vira outra (v045, u053). Então, antes de desistir, compara-se
       também sem tirar o sujeito e sem mexer no advérbio. */
    const cru = normalizar(texto, lingua, { cru: true });
    if (formasAceitas(card, direcao).some(f => parecido(cru, normalizar(f, lingua, { cru: true }), lingua))) {
      return 'quase';
    }
    /* E o erro que cai no artigo da frente ou numa letra que a língua não tem: «lsa tijeras»
       deixava de ser artigo e sobrava inteiro contra «tijera»; «aõ» por «año» perdia o «õ»
       como se fosse pontuação (contestações do p832 e do u167, 12/11/2026). Compara-se
       também letra por letra, sem funil nenhum. */
    const nu = t => {
      const x = String(t || '').toLowerCase().replace(/æ/g, 'ae').replace(/œ/g, 'oe').normalize('NFC');
      return (LINGUAS[lingua] && LINGUAS[lingua].guardaAcento ? semAcentoMantendoEne(x)
        : x.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    };
    const escrito = nu(texto);
    if (escrito && formasAceitas(card, direcao).some(f => parecido(escrito, nu(f), lingua))) return 'quase';
    if (soIda() && card.tipo === 'frase' && aceitas.some(alvo => parecidoDeFrase(dado, alvo))) return 'quase';
    return 'errado';
  }

  /* Quando a resposta coincide com outra forma verbal do card, devolve qual
     é, para o feedback poder dizer o que ele escreveu de fato. */
  function formaReconhecida(card, texto, direcao) {
    const lingua = linguaDaResposta(direcao);
    const campo = CAMPOS[lingua].formas;
    if (!card[campo]) return null;

    /* as formas são sempre as mesmas; o rótulo é que sai na língua de quem
       está lendo a pergunta — formasEsEn quando o card foi perguntado em inglês */
    const rotulos = card[campo + Maiuscula(linguaDaPergunta(direcao))] || card[campo];

    const dado = normalizar(texto, lingua);
    for (const forma of Object.keys(card[campo])) {
      if (normalizar(forma, lingua) === dado) return { forma, rotulo: rotulos[forma] };
    }
    return null;
  }

  /* ── a terminação de outra pessoa ──
     «Suelo levantarme temprano» escrito «suele levantarme temprano». Uma
     letra, e caía no «deu quase», como se a mão tivesse escorregado. Não
     escorregou: «suele» é outra pessoa do mesmo verbo, e a conjugação é o que
     o espanhol cobra. O mesmo com «¿te apeteces un café?» por «¿te apetece?».

     O formasEs já pegava isso, mas só nos cards de conjugação, que listam as
     formas uma a uma. Aqui a regra vale para qualquer frase: as duas
     respostas têm as mesmas palavras menos uma, e essa uma tem o mesmo
     radical (três letras ou mais) com duas desinências verbais diferentes —
     «suel-o» e «suel-e», «apetec-e» e «apetec-es».

     Pega também «cansado» por «cansada», que é concordância e não
     conjugação; o nome no aviso é «forma», que serve às duas. O que não pega
     é erro de digitação no meio da palavra — «pesdumbre», «quinto pito» —,
     que continua indo para o «deu quase».

     E há o «-s» sozinho. O funil lê plural como singular, e por isso
     «apeteces» chegava igual a «apetece» e contava como CERTO. Aqui a
     comparação é feita sem essa folga, e nas frases uma palavra que só
     ganhou ou perdeu o «-s» é tratada como flexão. Plural de verdade quase
     nunca vem sozinho numa frase — «la sábana» vira «las sábanas», e são duas
     palavras diferentes —, então ele continua passando pelo caminho de
     sempre. Nos cards de palavra o «-s» segue sendo plural.

     Uma exceção, para não punir a mão: quando a diferença é UMA vogal final
     trocada por outra — «suele» por «suelo», «harte» por «harto» —, fica
     para o «deu quase». No teclado Dvorak, a, o, e, u e i são vizinhas na
     mesma fileira, e daqui não dá para saber se foi a pessoa do verbo ou o
     dedo. Quem sabe é quem escreveu. Desinência que ganha ou perde letra —
     «apeteces», «juega» por «juegan», «hablamos» por «hablan» — não tem
     esse álibi. */
  const DESINENCIAS = new Set((
    'o as a amos ais an es e emos eis en imos is i iste io isteis ieron ' +
    'aste aron asteis aba abas abamos abais aban ia ias iamos iais ian ' +
    'are aras ara aremos areis aran ere eras era eremos ereis eran ' +
    'ire iras ira iremos ireis iran aria arias ariamos ariais arian ' +
    'eria erias eriamos eriais erian iria irias iriamos iriais irian ' +
    'ase ases asemos aseis asen iese ieses iesemos ieseis iesen ' +
    'iera ieras ieramos ierais ieran ado ada ido ida ando iendo ar er ir'
  ).split(' '));

  function flexaoTrocada(a, b) {
    const n = Math.min(a.length, b.length);
    for (let k = 3; k <= n; k++) {
      if (a[k - 1] !== b[k - 1]) break;
      const sa = a.slice(k), sb = b.slice(k);
      if (sa !== sb && DESINENCIAS.has(sa) && DESINENCIAS.has(sb)) return true;
    }
    return false;
  }

  /* Devolve a palavra certa, escrita como no card — ou null. */
  function erroDeFlexao(card, texto, direcao) {
    if (linguaDaResposta(direcao) !== 'es') return null;
    const cru = t => semAcento(normalizar(t, 'es', { plural: false }));
    const dado = cru(texto);
    if (!dado) return null;
    const alvos = formasAceitas(card, direcao);
    if (alvos.some(a => cru(a) === dado)) return null;      // escreveu uma forma aceita
    const escritas = dado.split(' ');
    const frase = card.tipo === 'frase';
    for (const alvo of alvos) {
      const certas = cru(alvo).split(' ');
      if (certas.length !== escritas.length) continue;
      const difs = certas.map((p, i) => i).filter(i => certas[i] !== escritas[i]);
      if (difs.length !== 1) continue;
      const certa = certas[difs[0]], escrita = escritas[difs[0]];
      const umaVogal = escrita.length === certa.length &&
        escrita.slice(0, -1) === certa.slice(0, -1) && /[aeiou]$/.test(escrita) && /[aeiou]$/.test(certa);
      if (umaVogal) continue;
      const soOS = frase && (escrita === certa + 's' || certa === escrita + 's');
      if (!soOS && !flexaoTrocada(escrita, certa)) continue;
      const original = (String(alvo).normalize('NFC').match(PALAVRA) || [])
        .find(p => semAcento(p) === certa);
      return original || certa;
    }
    return null;
  }

  /* Perto o bastante para perguntar — não perto o bastante para valer ponto.

     Duas regras, as mesmas em toda língua e em todo card (pedido do Gere,
     12/11/2026; antes havia sete limiares, por língua e por tamanho):

     1. um erro só: pergunta. Um erro é uma letra trocada, a mais ou a menos,
        duas letras vizinhas invertidas ou duas palavras vizinhas invertidas;
     2. mais de um: pergunta se os erros não passam de 20% das letras da
        resposta certa (2 erros a partir de 10 letras, 3 a partir de 15).

     Não há piso de tamanho: também se erra a tecla em palavra pequena.
     «a» é o que foi escrito, «b» a resposta certa, os dois já normalizados.

     A regra 2 aperta para 10% quando tudo o que foi escrito são palavras de
     verdade (pedido do Gere, 12/11/2026): a tecla errada quase nunca dá uma
     palavra que existe («borbolwta»), e quem escreveu «eu era o bom pastor»
     por «eu sou o bom pastor» não escorregou, trocou a palavra. «Palavra de
     verdade» é a que aparece em algum card do baralho, na língua da resposta
     (respostas, aceitas e alternativas erradas): não há dicionário no app. A
     que não está em card nenhum fica com os 20%, o lado generoso. A regra 1
     não muda: «sal» por «sol» é palavra de verdade e ainda pode ser a mão. */
  const PARTE_DE_ERROS = 0.20;
  const PARTE_COM_PALAVRAS_REAIS = 0.10;

  /* o vocabulário do baralho, por língua, montado na primeira vez em que é preciso */
  let CARDS_DO_VOCABULARIO = [];
  let VOCABULARIO = Object.create(null);
  const semSinais = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function usarVocabulario(cards) {
    CARDS_DO_VOCABULARIO = cards || [];
    VOCABULARIO = Object.create(null);
  }
  function vocabulario(lingua) {
    if (VOCABULARIO[lingua]) return VOCABULARIO[lingua];
    const v = VOCABULARIO[lingua] = new Set();
    const campo = CAMPOS[lingua];
    if (!campo) return v;
    const junta = t => semSinais(t).split(/[^a-z0-9]+/).forEach(w => { if (w) v.add(w); });
    CARDS_DO_VOCABULARIO.forEach(c => {
      if (!c) return;
      let textos = [c[campo.certa]].concat(c[campo.aceitas] || [], c[campo.distratores] || [],
        Object.keys(c[campo.formas] || {}), Object.keys(c[campo.regionais] || {}));
      if (lingua === 'pt') textos = textos.concat(c.outras || []);
      textos.forEach(t => {
        if (typeof t !== 'string' || !t) return;
        /* como está escrita e como o funil a entrega (sem plural, com e sem o sujeito) */
        junta(t);
        junta(normalizar(t, lingua));
        junta(normalizar(t, lingua, { cru: true }));
        junta(normalizar(t, lingua, { plural: false }));
        if (lingua === 'pt') junta(normalizarFlexao(t));
      });
    });
    return v;
  }
  /* tudo o que foi escrito e não está na resposta certa é palavra do baralho? */
  function soPalavrasReais(a, b, lingua) {
    const v = vocabulario(lingua);
    if (!v.size) return false;
    const certas = new Set(semSinais(b).split(' '));
    return semSinais(a).split(' ').every(w => !w || certas.has(w) || v.has(w));
  }

  function errosEntre(a, b) {
    let d = distancia(a, b);
    if (d < 2) return d;
    /* duas palavras vizinhas invertidas valem um erro, somado aos das letras */
    const p = a.split(' ');
    for (let i = 0; i + 1 < p.length && d > 1; i++) {
      if (p[i] === p[i + 1]) continue;
      const q = p.slice();
      q[i] = p[i + 1];
      q[i + 1] = p[i];
      d = Math.min(d, 1 + distancia(q.join(' '), b));
    }
    return d;
  }

  function parecido(a, b, lingua) {
    /* No espanhol o acento é conferido antes, com régua própria; aqui ele não
       soma («yo etuve alli» contra «yo estuve allí» é uma letra). O «ñ» fica:
       «ano» por «año» é um erro. */
    const semAcentos = t => (LINGUAS[lingua] && LINGUAS[lingua].guardaAcento ? semAcentoMantendoEne(t) : t);
    const certa = semAcentos(b);
    const d = errosEntre(semAcentos(a), certa);
    if (d <= 1) return true;
    const letras = certa.replace(/ /g, '').length;
    if (d > PARTE_DE_ERROS * letras) return false;
    return d <= PARTE_COM_PALAVRAS_REAIS * letras || !soPalavrasReais(a, b, lingua);
  }

  /* ── o «deu quase» da frase traduzida (cards/LATIM.md §4) ──
     Traduzindo uma frase latina, quem acerta o sentido erra fácil na ordem («o Senhor
     louvai»). Com as mesmas palavras em outra ordem, a pergunta vale. Só no modo trilhas.
     A palavra trocada por outra («cantai o Senhor») deixou de valer em 12/11/2026: para
     ampliar o gabarito já existe o «acho que essa resposta deveria ser aceita». */
  function parecidoDeFrase(a, b) {
    const x = String(a || '').split(' ').filter(Boolean), y = String(b || '').split(' ').filter(Boolean);
    return x.length > 1 && x.length === y.length && x.slice().sort().join(' ') === y.slice().sort().join(' ');
  }

  /* ── onde foi que deu quase ──
     O «deu quase» mostra o que foi escrito e a resposta certa, e pergunta se
     valeu. Só que a diferença é, por definição, pequena — uma letra numa
     frase de quarenta —, e achar essa letra a olho custa mais do que devia.
     Aqui ela é achada: a forma aceita mais próxima do que foi escrito, e as
     duas alinhadas letra a letra. Sai pintado, de cada lado, só o que não
     casa: a letra trocada nos dois, a que faltou na certa, a que sobrou na
     escrita.

     A comparação segue a régua da língua: no português e no inglês o acento
     não conta (o conferidor já o ignora), no espanhol conta. Pontuação,
     maiúscula e o que vem entre parênteses nunca são diferença. */
  const COMPARAVEL = /[\p{L}\p{N}]/u;

  function letrasComparaveis(texto, lingua) {
    const letras = [];
    let parentese = 0, ultimoFoiEspaco = true;
    Array.from(String(texto || '').normalize('NFC')).forEach(ch => {
      if (ch === '(') parentese++;
      const dentro = parentese > 0;
      if (ch === ')' && parentese) parentese--;
      let chave = null;
      if (!dentro && /\s/.test(ch)) {
        if (!ultimoFoiEspaco) chave = ' ';
        ultimoFoiEspaco = true;
      } else if (!dentro && COMPARAVEL.test(ch)) {
        chave = ch.toLowerCase();
        if (lingua !== 'es') chave = chave.normalize('NFD').replace(/[̀-ͯ]/g, '');
        ultimoFoiEspaco = false;
      }
      letras.push({ texto: ch, chave: chave, destaque: false });
    });
    /* espaço sobrando no fim não é letra que faltou */
    for (let i = letras.length - 1; i >= 0 && letras[i].chave === ' '; i--) letras[i].chave = null;
    return letras;
  }

  function alinharLetras(dada, certa) {
    const a = dada.filter(l => l.chave !== null), b = certa.filter(l => l.chave !== null);
    const m = a.length, n = b.length;
    const d = [];
    for (let i = 0; i <= m; i++) {
      d.push(new Array(n + 1).fill(0));
      d[i][0] = i;
    }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1].chave === b[j - 1].chave ? 0 : 1));
      }
    }
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1].chave === b[j - 1].chave && d[i][j] === d[i - 1][j - 1]) { i--; j--; }
      else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { a[i - 1].destaque = b[j - 1].destaque = true; i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { a[i - 1].destaque = a[i - 1].so = true; i--; }
      else { b[j - 1].destaque = b[j - 1].so = true; j--; }
    }
    encostarNaPalavra(a);
    encostarNaPalavra(b);
    return d[m][n];
  }

  /* A palavra que sobrou (ou faltou) pode ser pintada em mais de um lugar
     com a mesma conta: em «unta la mantequilla», tanto faz tirar «la » como
     «a l» — e o alinhamento escolhia o segundo, que não é palavra nenhuma
     (u131). Aqui o trecho pintado desliza, sem mudar de tamanho, até começar
     no começo de uma palavra. Só vale para o que sobrou ou faltou inteiro;
     letra trocada fica onde está. */
  function encostarNaPalavra(l) {
    const livre = k => k >= 0 && k < l.length && !l[k].destaque;
    const comecaPalavra = k => l[k].chave !== ' ' && (k === 0 || l[k - 1].chave === ' ');
    let k = 0;
    while (k < l.length) {
      if (!(l[k].destaque && l[k].so)) { k++; continue; }
      let ini = k, fim = k;
      while (fim < l.length && l[fim].destaque && l[fim].so) fim++;
      const tem = (fim < l.length && l[fim].destaque) || (ini > 0 && l[ini - 1].destaque);
      k = fim;
      if (tem || comecaPalavra(ini)) continue;       // colado numa troca, ou já está no lugar
      const tam = fim - ini;
      /* para a direita: a letra que entra tem de ser igual à que sai */
      let a = ini;
      while (livre(a + tam) && l[a].chave === l[a + tam].chave) { a++; if (comecaPalavra(a)) break; }
      if (a === ini || !comecaPalavra(a)) {
        /* e para a esquerda */
        a = ini;
        while (livre(a - 1) && l[a - 1].chave === l[a + tam - 1].chave) { a--; if (comecaPalavra(a)) break; }
        if (!comecaPalavra(a)) continue;
      }
      for (let x = ini; x < fim; x++) l[x].destaque = l[x].so = false;
      for (let x = a; x < a + tam; x++) l[x].destaque = l[x].so = true;
      k = Math.max(fim, a + tam);
    }
  }

  function juntarPedacos(letras) {
    const pedacos = [];
    letras.forEach(l => {
      const ultimo = pedacos[pedacos.length - 1];
      if (ultimo && ultimo.destaque === l.destaque) ultimo.texto += l.texto;
      else pedacos.push({ texto: l.texto, destaque: l.destaque });
    });
    return pedacos;
  }

  function diferencaDoQuase(card, texto, direcao) {
    const lingua = linguaDaResposta(direcao);
    const dado = normalizar(texto, lingua);
    if (!dado) return null;
    /* «o galho / o ramo» inteiro não é resposta de ninguém: valem as partes */
    let formas = formasAceitas(card, direcao).map(f => String(f || '').trim())
      .filter(f => f && (lingua === 'es' || !f.includes('/')));
    const perto = formas.filter(f => parecido(dado, normalizar(f, lingua), lingua));
    if (perto.length) formas = perto;

    const chaves = ls => ls.filter(l => l.chave !== null).map(l => l.chave).join('');
    const escrita = chaves(letrasComparaveis(texto, lingua));
    let melhor = null;
    formas.forEach(f => {
      const dist = distancia(escrita, chaves(letrasComparaveis(f, lingua)));
      if (!melhor || dist < melhor.dist) melhor = { forma: f, dist: dist };
    });
    if (!melhor || !melhor.dist) return null;

    const dada = letrasComparaveis(String(texto).trim(), lingua);
    const certa = letrasComparaveis(melhor.forma, lingua);
    alinharLetras(dada, certa);
    return { forma: melhor.forma, dada: juntarPedacos(dada), certa: juntarPedacos(certa) };
  }

  /* Acima disto ninguém está mais olhando o card: largou o celular, foi
     fazer outra coisa e voltou. O relógio continuou correndo, mas o número
     não mede nada — nem pensar demorado, nem dificuldade. Três minutos é
     folgado até para a frase mais longa escrita com calma. */
  const MS_ABANDONO = 180000;

  function tempoConfiavel(ms, saiuDaAba) {
    return !saiuDaAba && ms < MS_ABANDONO;
  }

  /* ── o relógio saiu do motor ──
     O tempo de resposta classificava cada acerto em rápido, médio ou lento, e
     disso saíam a distância da volta e um atalho para o domínio. Saiu em
     outubro de 2026, por três motivos. Decidia pouco: de 82% a 92% das
     respostas eram «rápido» e quase nenhuma «lento», então a distância era
     quase sempre a mesma. Media mal: teclado do celular, frase longa, cinco
     alternativas para ler, uma distração. E os limiares eram de uma pessoa
     só — quatro segundos para escolher uma palavra, oito para escrevê-la —;
     com mais gente usando, quem digita devagar passaria por quem sabe menos.

     O tempo continua sendo medido, em silêncio, e vai só para o log da
     sessão («ms» e «pausado»), onde serve à calibragem das levas. Nada no
     agendamento nem na tela depende dele. */

  /* ── estado por card ── */
  function estadoInicial(id) {
    return {
      id,
      etapa: 'multipla',   // ver FASES: duas direções, cada uma com dois modos
      vistas: 0,
      acertos: 0,
      erros: 0,
      seguidas: 0,         // acertos consecutivos
      errosSeguidos: 0,    // erros consecutivos
      ultima: null,        // ISO da última vez que apareceu
      revisoes: 0,         // revisões certas já feitas depois de dominado
      voltaEm: null,       // ISO: só o card dominado espera uma data
      porModo: contadoresPorModo(),
      historico: []        // últimas 12 respostas
    };
  }

  /* O histórico guarda só as últimas 12 respostas — bom para mostrar o
     percurso recente, ruim para somar. Estes contadores não truncam, e é
     deles que o painel tira "escolher x escrever". */
  function contadoresPorModo() {
    return { multipla: { n: 0, certas: 0 }, escrita: { n: 0, certas: 0 } };
  }

  /* ── de qual grupo vem o próximo card: novo ou revisão ──
     Card novo e card em revisão nunca disputam a mesma fila — se disputassem,
     o novo perderia sempre. São quatro filas:

       inéditos   o que nunca apareceu
       es→pt      você reconhece o espanhol (multipla, escrita): a ida
       pt→es      você produz o espanhol (inversa-multipla, inversa-escrita): a volta
       dominados  vencido nas duas direções, esperando a data

     A escolha tem dois passos (pedido do Gere, 24/10/2026):

     1. NOVO OU REVISÃO. Sorteio com a chance de card novo, que persegue a meta
        de cards na ida: com a ida na meta, CHANCE_NA_META; cada card que falta
        soma CHANCE_POR_CARD, e cada card que sobra tira o mesmo, sempre entre
        CHANCE_MINIMA e CHANCE_MAXIMA, para não vir só card novo nem só revisão.
        Card novo é a única torneira da ida, e a ida esvazia sozinha, à medida
        que os cards fecham a primeira fase — então a chance sobe quando ela
        esvazia e desce quando ela enche, e a ida fica rondando a meta.
     2. QUAL CARD, DENTRO DO GRUPO SORTEADO. O novo, pela ordem dos inéditos
        (ver ordenarIneditos no app). A revisão: primeiro o dominado que chegou
        na data (com espaço entre eles, ver vezDoDominado), depois o card que
        esperou demais (atrasadoQueFura), e por fim o sorteio entre a ida e a
        volta, que persegue as duas do mesmo tamanho (ver chanceDaIda); dentro
        da fila, o mais urgente (escolherNaFila).

     Grupo sem card para dar não entra no sorteio: sem revisão pronta vem card
     novo, e sem inédito vem revisão. A chance que o painel mostra é esta mesma
     conta, e por isso é a de verdade.

     A regra anterior (de 26/09 a 24/10/2026) era um sorteio só, entre as três
     filas, com pesos que perseguiam um alvo na ida e outro na volta, e por cima
     dele um teto (no máximo um novo a cada cinco respostas), um piso (um a cada
     vinte) e um começo de um a cada três. O painel mostrava o peso dos
     inéditos no sorteio, e não a chance: o teto, os dominados e os atrasados
     passavam na frente e não entravam na conta. Na simulação, o latim ficava
     com a ida em 5 cards contra uma meta de 50, e o painel dizia 48% quando o
     real era 20%.

     A META DA IDA ACOMPANHA O ACERTO. Quem acerta muito aguenta mais cards em
     circulação; quem está errando precisa de menos, voltando mais cedo. Vai de
     ALVO_IDA_MIN, com 65% de acerto ou menos, a ALVO_IDA_MAX, com 85% ou mais,
     em linha reta entre os dois. O acerto é o das últimas trezentas respostas,
     e não o geral, que depois de milhares de respostas já não se mexe (ver
     alvoDaFila). Até 20/10/2026 a meta era de 40 a 60; nesse dia o Gere pediu
     30 a 50. A volta tinha meta própria, de 40 a 60, até 24/10.

     No modo trilhas (o latim) a meta é metade maior, de 45 a 75: sem a volta,
     o card sai da ida direto para os dominados, e com a mesma meta das línguas
     vivas ficavam menos cards em jogo (pedido do Gere, 07/11/2026). */
  const ALVO_IDA_MIN = 30;     // cards em es→pt, para quem acerta pouco
  const ALVO_IDA_MAX = 50;     // e para quem acerta muito
  const ALVO_IDA_TRILHAS = 1.5;   // o fator da meta no modo trilhas
  const ACERTO_DO_MIN = 0.65, ACERTO_DO_MAX = 0.85;
  const JANELA_DO_ACERTO = 300;   // respostas recentes que contam
  const CHANCE_NA_META = 0.15;    // a chance de card novo com a ida exatamente na meta
  const CHANCE_POR_CARD = 0.02;   // o que cada card de falta (ou de sobra) na ida soma (ou tira)
  const CHANCE_MINIMA = 0.05;     // nunca menos de um novo a cada vinte, na média
  const CHANCE_MAXIMA = 0.5;      // nem mais de um a cada dois
  const IDA_NA_REVISAO_MIN = 0.2; // entre as revisões, a ida nunca tem menos de 20%
  const IDA_NA_REVISAO_MAX = 0.8; // nem mais de 80%

  /* Em que fila mora cada etapa. */
  function filaDe(est) {
    const e = (est && est.etapa) || 'multipla';
    /* o card de forma acertado não volta: não mora em fila nenhuma */
    if (e === 'dominado' && est && (ehForma(est.id) || umaVezSo(est.id))) return 'fora';
    if (e === 'dominado') return 'dominados';
    return (e === 'multipla' || e === 'escrita') ? 'esPt' : 'ptEs';
  }

  /* Quantos cards em cada direção, sem contar os dominados: esses já saíram
     do circuito de aprendizado e só voltam pela data. Nem os arquivados
     («Já conheço essa palavra»): o estado deles fica, parado na etapa em que
     saíram, mas eles estão fora das filas. Até 21/10/2026 contavam, e cada
     «Já conheço» deixava um card fantasma na ida — a fila parecia cheia, e o
     card novo quase não vinha (na simulação, com um quinto das estreias
     arquivadas, o painel mostrava 53 na ida e havia 3). */
  function contarDirecoes(estados, arquivados) {
    let esPt = 0, ptEs = 0;
    for (const id in estados) {
      const e = estados[id];
      if (!e || !e.vistas || e.etapa === 'dominado') continue;
      if (arquivados && arquivado(id, arquivados)) continue;
      /* nem a flexão que adormeceu (LATIM.md §13): o estado fica, fora das filas */
      if (TERMINACAO[id] && adormecido(id, estados)) continue;
      if (e.etapa === 'multipla' || e.etapa === 'escrita') esPt++;
      else ptEs++;
    }
    return { esPt: esPt, ptEs: ptEs };
  }

  /* O acerto das últimas respostas, tirado do diário: os dias mais recentes,
     de trás para a frente, até juntar a janela. O dia entra inteiro — a
     janela é uma ordem de grandeza, não uma conta de centavos. */
  function acertoRecente(diario) {
    let n = 0, ok = 0;
    for (const d of Object.keys(diario || {}).sort().reverse()) {
      const g = diario[d];
      if (!g || !g.n) continue;
      n += g.n; ok += g.ok || 0;
      if (n >= JANELA_DO_ACERTO) break;
    }
    return { n: n, taxa: n ? ok / n : 0 };
  }

  /* A meta da ida, para este acerto. Com menos de cinquenta respostas a taxa
     ainda não diz nada, e vale a meta menor: quem está começando não precisa
     de cinquenta cards abertos. Devolve { esPt }. */
  function alvoDaFila(diario) {
    const a = acertoRecente(diario);
    const t = a.n < 50 ? 0
      : Math.min(1, Math.max(0, (a.taxa - ACERTO_DO_MIN) / (ACERTO_DO_MAX - ACERTO_DO_MIN)));
    const f = soIda() ? ALVO_IDA_TRILHAS : 1;
    return { esPt: Math.round(f * (ALVO_IDA_MIN + t * (ALVO_IDA_MAX - ALVO_IDA_MIN))) };
  }

  const entre = (v, min, max) => Math.min(max, Math.max(min, v));

  /* A chance de card novo pela meta da ida, com os dois grupos disponíveis. */
  function chanceDoNovo(estados, alvo, arquivados) {
    const ida = contarDirecoes(estados, arquivados).esPt;
    const meta = (alvo && alvo.esPt) || Math.round((soIda() ? ALVO_IDA_TRILHAS : 1) * ALVO_IDA_MIN);
    return entre(CHANCE_NA_META + CHANCE_POR_CARD * (meta - ida), CHANCE_MINIMA, CHANCE_MAXIMA);
  }

  /* Já decidido que vem revisão de card não dominado, a chance de ser da ida.
     A meta é ida e volta do mesmo tamanho: a ida maior puxa revisão da ida,
     que é por onde ela escoa para a volta; a volta maior puxa revisão da
     volta, que é por onde ela escoa para os dominados. No modo trilhas não há
     volta. */
  function chanceDaIda(estados, arquivados) {
    if (soIda()) return 1;
    const c = contarDirecoes(estados, arquivados);
    return entre(0.5 + CHANCE_POR_CARD * (c.esPt - c.ptEs), IDA_NA_REVISAO_MIN, IDA_NA_REVISAO_MAX);
  }

  /* O que há para dar em cada grupo, tirado do contexto da escolha (ver
     escolherProximo): a revisão pronta é o card de ida ou de volta que já
     esperou o intervalo mínimo, ou o dominado vencido que já tem o espaço. */
  function gruposProntos(c) {
    const outros = ((c.livres && c.livres.esPt) || []).length + ((c.livres && c.livres.ptEs) || []).length;
    const dominado = (c.vencidos || 0) > 0 && (c.desdeDominado === undefined || c.desdeDominado >= ESPACO_DOMINADO ||
      parteDosDominados(acumuloDe(c)) !== null);
    return { novo: !!c.temIneditos, outros: outros, dominado: dominado, revisao: outros > 0 || dominado };
  }

  /* A chance de o próximo card ser novo: a do painel e a do sorteio. */
  function chanceDoProximoNovo(c) {
    const g = gruposProntos(c);
    if (!g.novo) return 0;
    if (!g.revisao) return 1;
    return chanceDoNovo(c.estados, c.alvo, c.arquivados);
  }

  /* As chances de cada fila, sem olhar o que está pronto: o app as usa para
     converter posição antiga em distância (anotarEntradaNaFila). */
  function chancesDasFilas(estados, alvo, arquivados) {
    const novo = chanceDoNovo(estados, alvo, arquivados);
    const ida = chanceDaIda(estados, arquivados);
    return { ineditos: novo, esPt: (1 - novo) * ida, ptEs: (1 - novo) * (1 - ida) };
  }

  /* ── os textos ──
     Desde 20/10/2026 (PLANO.md, seção 9; decisões do Gere) o texto vem da
     Biblioteca e não espera mais 400 dominados: todo mundo começa com um poema
     automático, a pessoa pode escolher até MAX_TEXTOS (ou nenhum), e as
     palavras dos textos escolhidos ocupam 1 de cada TEXTO_A_CADA vagas de card
     novo, na ordem de leitura, em rodízio entre os textos. O verso aparece na
     hora em que a última palavra dele fica reconhecida (não é card: não espera
     a meia-noite). A escolha mora em textos.emVista.escolha = { textos: [ids],
     em: ISO, propria: bool }.

     Até 24/10/2026 eram 1 de cada 3 vagas, e o verso esperava as palavras
     dominadas nas duas direções, uns sete dias depois da estreia da última
     (na simulação; às vezes onze). O Gere achou que o texto não andava e
     pediu 1 de cada 2,5 (duas em cada cinco); e o verso passou a esperar só a
     ida fechada, uns três dias e meio: ler é reconhecer, e a volta segue
     depois, como a de qualquer card (ver idaFechada). */
  const MAX_TEXTOS = 3;
  const TEXTO_A_CADA = 2.5;

  /* Quantas estreias de outros cards vêm antes da próxima palavra de texto.
     «estreias» são as estreias, da mais recente para a mais antiga, e
     «doTexto» diz quais eram palavra de texto. Com TEXTO_A_CADA fracionário
     (2,5: um vão de 1,5), os vãos se alternam entre 1 e 2, para a média dar
     certo: o vão de agora compensa o anterior. Devolve { vez, cada }: quantas
     outras estreias ainda faltam, e o vão comum, para intercalar o resto. */
  function vezDoTexto(estreias, doTexto) {
    const vao = TEXTO_A_CADA - 1;
    let desde = 0;
    while (desde < estreias.length && !doTexto(estreias[desde])) desde++;
    let anterior = null;
    if (desde < estreias.length) {
      let k = desde + 1;
      while (k < estreias.length && !doTexto(estreias[k])) k++;
      if (k < estreias.length) anterior = k - desde - 1;
    }
    const alvo = anterior === null ? Math.floor(vao)
      : Math.min(Math.ceil(vao), Math.max(Math.floor(vao), Math.round(2 * vao - anterior)));
    return { vez: Math.max(0, alvo - desde), cada: Math.round(vao) };
  }
  /* o poema automático que a pessoa já lê pela metade (o nivelamento deu as
     palavras dele) é pulado: começar por ele não ensinaria nada */
  const QUASE_LIDO = 0.5;

  /* Conta também a palavra transparente total do curso e a presumida pelo
     nivelamento que ainda não foi respondida (PLANO.md, 7.1 e 7.2): as duas
     são dominadas para o motor. Fica para o painel. */
  function dominadosNoTotal(estados) {
    let n = 0;
    for (const id in estados) if (estados[id] && estados[id].etapa === 'dominado') n++;
    for (const id in TRANSP) {
      if (transparenteTotal(id) && !(estados && estados[id] && estados[id].etapa === 'dominado')) n++;
    }
    for (const id in PRESUMIDOS) if (presumidoEm(id, estados)) n++;
    return n;
  }

  function versosDoTexto(texto) {
    return ((texto && texto.blocos) || []).reduce((a, b) => a.concat(b || []), []);
  }

  /* A palavra que a pessoa já reconhece lendo: sabida (dominada, arquivada,
     transparente ou presumida) ou com a ida fechada — o card já passou para a
     volta, e o erro na volta não o devolve à ida. É o que o verso espera. */
  /* A flexão que dorme conta pelo card da terminação dela, e a variante pelo lema (LATIM.md §13):
     basta a ida fechada DELE. Antes só o domínio dele contava, e o verso esperava o card da
     terminação ser dominado (relato do Gere, 23/11/2026: o «Deum» da Regina caeli, que dorme em
     «amicum» ou «puerum», demorava a liberar «Ora pro nobis Deum»). A forma que acordou conta pela
     própria ida ou pela do card da terminação. */
  function idaFechada(id, estados, arquivados) {
    if (sabidaEm(id, estados, arquivados) !== Infinity) return true;
    if (TERMINACAO[id] || RARA[id]) {
      const quem = quemConta(id, estados);
      if (quem !== id) return idaFechada(quem, estados, arquivados);
    }
    const e = estados && estados[id];
    if (e && e.vistas && ['inversa-multipla', 'inversa-escrita', 'consolidado'].indexOf(e.etapa) >= 0) return true;
    const ativo = acordada(id, estados);
    return !!(ativo && idaFechada(ativo, estados, arquivados));
  }

  /* Quantos versos, a contar do primeiro, já podem ser lidos: todas as
     palavras deles reconhecidas (ver idaFechada). O verso sem palavra de card
     (só artigo, preposição, nome) vem junto com o seguinte, e não sozinho. */
  /* «vistos» (opcional): os versos já lidos contam como prontos. Palavra de verso já lido que
     volta a faltar (o teste do presumido errado, a forma do latim que acordou) segue em estudo,
     mas não trava os versos seguintes (relato do Gere, 22/11/2026: «falta só uma palavra, e a
     próxima frase não sai»). */
  function versosProntos(texto, estados, arquivados, vistos) {
    const vs = versosDoTexto(texto);
    const de = Math.max(0, Math.min(vs.length, vistos || 0));
    let k = de;
    for (const l of vs.slice(de)) {
      const req = (l && l.requer) || [];
      if (req.some(id => String(id)[0] === '+' || !idaFechada(id, estados || {}, arquivados))) break;
      k++;
    }
    while (k > de && k < vs.length && !((vs[k - 1] && vs[k - 1].requer) || []).length) k--;
    return k;
  }

  /* A palavra que segura o próximo verso, quando é a única que falta nele (ou null): o card dela
     passa à frente das revisões (pedido do Gere, 27/11/2026: os versos paravam dias numa palavra
     que voltava a cada 4 ou 5 dias). Devolve o id que está na fila: o da própria palavra, ou o
     card que conta por ela (a flexão que dorme, a variante). */
  function palavraQueSeguraVerso(texto, estados, arquivados, vistos) {
    const vs = versosDoTexto(texto);
    for (const l of vs.slice(Math.max(0, vistos || 0))) {
      const req = (l && l.requer) || [];
      const faltam = req.filter(id => String(id)[0] === '+' || !idaFechada(id, estados || {}, arquivados));
      if (!faltam.length) continue;
      if (faltam.length > 1 || String(faltam[0])[0] === '+') return null;
      return quemConta(faltam[0], estados || {});
    }
    return null;
  }

  /* As palavras que ainda faltam reconhecer nos versos não lidos (a partir de «vistos»), sem
     repetir, na ordem do texto. */
  function faltamNoTexto(texto, estados, arquivados, vistos) {
    const vs = versosDoTexto(texto).slice(Math.max(0, vistos || 0));
    const vistas = new Set(), faltam = [];
    for (const l of vs) {
      for (const id of (l && l.requer) || []) {
        if (vistas.has(id)) continue;
        vistas.add(id);
        if (String(id)[0] === '+' || !idaFechada(id, estados || {}, arquivados)) faltam.push(id);
      }
    }
    return faltam;
  }

  /* Quantos versos a pessoa já viu (textos.lidos guarda «<id>#<k>» por verso,
     e «<id>» quando o texto fechou). */
  function versosVistos(texto, lidos) {
    if (!texto) return 0;
    const total = versosDoTexto(texto).length;
    if (lidos && lidos[texto.id]) return total;
    let k = 0;
    const pre = texto.id + '#';
    for (const chave in (lidos || {})) {
      if (chave.indexOf(pre) === 0) k = Math.max(k, Number(chave.slice(pre.length)) || 0);
    }
    return Math.min(k, total);
  }

  function textoTerminado(texto, lidos) {
    return !!(texto && lidos && lidos[texto.id]);
  }

  /* ── as partes de um texto longo ──
     Pedido do Gere (24/10/2026, PLANO.md §9.6): texto longo se divide em partes pequenas, e a
     pessoa aprende uma por vez, em sequência. Cada parte é um texto do baralho, com «obra» (o id
     da obra, igual em todas as partes) e «parte» (1, 2…); ela ocupa uma das MAX_TEXTOS vagas.
     Só a parte da vez — a primeira da obra que ainda não terminou — pode ser escolhida. */
  function partesDaObra(obra, textos) {
    return (textos || []).filter(t => t && t.obra && t.obra === obra).sort((a, b) => a.parte - b.parte);
  }

  function parteDaVez(obra, textos, lidos) {
    return partesDaObra(obra, textos).find(t => !textoTerminado(t, lidos)) || null;
  }

  /* A parte que vem depois desta (ou null: a última, ou texto que não é parte). */
  function parteSeguinte(texto, textos) {
    if (!texto || !texto.obra) return null;
    return partesDaObra(texto.obra, textos).find(t => t.parte > texto.parte) || null;
  }

  /* O texto pode ser escolhido agora? Não terminou e, se é parte, é a da vez. */
  function textoEscolhivel(texto, textos, lidos) {
    if (!texto || textoTerminado(texto, lidos)) return false;
    return !texto.obra || parteDaVez(texto.obra, textos, lidos) === texto;
  }

  /* Palavras reconhecidas sobre o total, e os versos prontos sobre o total. */
  /* Com «vistos», contam só as palavras dos versos ainda não lidos, e «quais» diz quais são. */
  function andamentoDoTexto(texto, estados, arquivados, vistos) {
    const req = requeridas(texto);
    const quais = vistos === undefined
      ? req.filter(id => String(id)[0] === '+' || !idaFechada(id, estados || {}, arquivados))
      : faltamNoTexto(texto, estados, arquivados, vistos);
    const faltam = quais.length;
    const versos = versosDoTexto(texto).length;
    const prontos = versosProntos(texto, estados, arquivados, vistos);
    return { palavras: req.length, sabidas: req.length - faltam, faltam: faltam, quais: quais, versos: versos, prontos: prontos };
  }

  /* A fila dos poemas automáticos do curso (o campo «fila», do mais fácil ao
     mais difícil). */
  function textosAutomaticos(textos) {
    return (textos || []).filter(t => t && typeof t.fila === 'number').sort((a, b) => a.fila - b.fila);
  }

  /* A escolha em vigor. A da pessoa («propria») manda como está, só sem os
     textos que saíram do baralho. Sem escolha própria vale o automático: o que
     já estava, enquanto não termina; terminado (ou na primeira vez), o
     próximo da fila que a pessoa ainda não lê pela metade. Devolve o MESMO
     objeto quando nada muda, para o app saber que não há o que gravar. */
  function escolhaDosTextos(escolha, textos, estados, arquivados, lidos, agora) {
    const porId = {};
    (textos || []).forEach(t => { porId[t.id] = t; });
    if (escolha && escolha.propria) {
      const ids = (Array.isArray(escolha.textos) ? escolha.textos : []).filter(id => porId[id]).slice(0, MAX_TEXTOS);
      if (ids.length === (escolha.textos || []).length) return escolha;
      return { textos: ids, em: escolha.em, propria: true };
    }
    const atual = escolha && Array.isArray(escolha.textos) ? escolha.textos[0] : null;
    if (atual && porId[atual] && !textoTerminado(porId[atual], lidos)) return escolha;
    const fila = textosAutomaticos(textos).filter(t => textoEscolhivel(t, textos, lidos));
    const novo = fila.find(t => {
      const a = andamentoDoTexto(t, estados, arquivados);
      return !a.versos || a.prontos / a.versos < QUASE_LIDO;
    }) || fila[0] || null;
    const ids = novo ? [novo.id] : [];
    if (escolha && !escolha.propria && Array.isArray(escolha.textos) &&
        escolha.textos.length === ids.length && escolha.textos.every((x, i) => x === ids[i])) return escolha;
    return { textos: ids, em: new Date(agora || Date.now()).toISOString(), propria: false };
  }

  /* Os textos que estão soltando palavras: os da escolha que ainda não
     terminaram. */
  function textosAtivos(escolha, textos, lidos) {
    const porId = {};
    (textos || []).forEach(t => { porId[t.id] = t; });
    return ((escolha && escolha.textos) || []).map(id => porId[id]).filter(t => t && !textoTerminado(t, lidos));
  }

  /* Os textos que soltam palavras: os ativos e, quando todas as palavras de um
     deles já estrearam, o que vem depois dele — a parte seguinte da obra ou,
     no automático, o próximo da fila —, até SEGUINTES_NO_MAXIMO adiante.
     Pedido do Gere (29/10/2026): sem isso, as palavras novas paravam entre um
     texto e o outro, à espera de a pessoa dominar o último verso. O verso e
     o trecho continuam a esperar o texto ficar ativo (textosAtivos). */
  const SEGUINTES_NO_MAXIMO = 2;

  function textoSeguinte(texto, escolha, textos, estados, arquivados, lidos) {
    if (texto.obra) {
      const s = parteSeguinte(texto, textos);
      return s && !textoTerminado(s, lidos) ? s : null;
    }
    if (escolha && escolha.propria) return null;
    const e = escolhaDosTextos({ textos: [texto.id], propria: false }, textos, estados, arquivados, lidos);
    const id = e && e.textos && e.textos[0];
    return (id && id !== texto.id && (textos || []).find(t => t.id === id)) || null;
  }

  function textosQueSoltamPalavras(escolha, textos, estados, arquivados, lidos) {
    const ativos = textosAtivos(escolha, textos, lidos);
    const saida = ativos.slice(), ja = new Set(ativos.map(t => t.id));
    for (const t of ativos) {
      /* o texto adiante se procura como se o de agora já tivesse terminado */
      const ate = Object.assign({}, lidos);
      let atual = t;
      for (let n = 0; n < SEGUINTES_NO_MAXIMO; n++) {
        if (situacaoDaFrase(atual, estados || {}, arquivados).naoVistas.length) break;
        ate[atual.id] = ate[atual.id] || 'adiante';
        const seg = textoSeguinte(atual, escolha, textos, estados, arquivados, ate);
        if (!seg || ja.has(seg.id)) break;
        ja.add(seg.id);
        saida.push(seg);
        atual = seg;
      }
    }
    return saida;
  }

  /* As palavras que os textos ativos ainda não mostraram, cada texto na ordem
     de leitura, em rodízio entre eles. */
  function palavrasDosTextos(ativos, estados, arquivados) {
    const listas = (ativos || []).map(t => situacaoDaFrase(t, estados || {}, arquivados).naoVistas);
    const saida = [], ja = new Set();
    const n = Math.max(0, ...listas.map(l => l.length));
    for (let k = 0; k < n; k++) {
      for (const l of listas) if (k < l.length && !ja.has(l[k])) { ja.add(l[k]); saida.push(l[k]); }
    }
    return saida;
  }

  /* ── quem sai da fila: a urgência ──
     Até aqui o card voltava para uma POSIÇÃO: a distância em respostas vezes
     a chance da fila. Parecia justo e prendia cards para sempre. A fila tem
     cem cards e fica do mesmo tamanho; a cada card que sai do começo, outro
     entra — quase sempre na frente de quem está lá atrás, porque o erro volta
     na posição três e o acerto na trinta. Quem estava na posição 78 dava um
     passo à frente e levava um empurrão para trás, a cada vez. O histórico
     achou cards parados assim havia 1.600 respostas.

     Não dá para devolver cada card na distância pedida: com cem cards numa
     fila que leva um terço das respostas, a espera média é de trezentas
     respostas, qualquer que seja a ordem. Alguém espera mais do que pediu. A
     pergunta é quem, e a resposta antiga era «sempre os mesmos».

     Agora o card não guarda posição: guarda quando entrou e a distância que
     pediu. Na hora de tirar da fila, sai o mais urgente:

       urgência = espera ÷ distância²

     Espera ÷ distância é quantas vezes ele já esperou o que pediu; dividir
     de novo pela distância dá prioridade a quem pediu pouco. O erro (7
     respostas) que já esperou 14 tem urgência 0,29; o acerto escrito (110)
     que já esperou 220, 0,018. O erro passa na frente, como deve — mas a
     espera do outro cresce sem parar, e uma hora ele passa também. Ninguém
     fica para sempre.

     E ninguém sai antes da hora: se há card que já cumpriu a distância, só
     esses concorrem. Voltar cedo demais é justamente a muleta que as
     distâncias da volta (pt→es) existem para evitar.

     Na simulação com o seu baralho, contra a regra da posição: o erro volta
     em 23 respostas em vez de 27, e a maior espera de um card na fila cai de
     quase mil respostas para menos de quatrocentas. */
  /* ── e quem ficou para trás fura a fila ──
     «Uma hora ele passa também» era verdade, e a hora era longe demais. O
     progresso de 19 de setembro tinha 37 cards que pediram 100 respostas e
     esperavam havia mais de mil: enquanto houver card de distância curta
     acabando de vencer, o de distância longa perde para ele, e sempre há.

     A fila não tem como devolver todo mundo na hora: cem cards, uma resposta
     em cada três, a espera média é de trezentas, com qualquer regra. O que a
     regra escolhe é quem paga. Então, passada a espera pedida, o ATRASO — em
     respostas, não em proporção — soma urgência por conta própria, e ao
     cubo: quase nada nas primeiras cem respostas de atraso, o bastante para
     passar à frente de um acerto recém-vencido por volta das duzentas, e de
     um erro recém-vencido perto das quatrocentas.

     Na simulação (fila de cem, a mesma mistura de distâncias), a maior
     espera cai de 1.155 respostas para 555, e a do acerto escrito longo, de
     6,7 vezes o pedido para 4,3. O erro continua voltando logo: 1,3 vez o
     pedido, contra 1,1. Quem paga é o acerto de múltipla escolha, que
     esperava o dobro do que pediu e passa a esperar umas 160 respostas. */
  const ATRASO_QUE_FURA = 400;   // respostas de atraso que valem um erro recém-vencido
  const PESO_DO_ATRASO = 0.15;   // ≈ 1/7: a urgência de um erro no instante em que vence

  function urgencia(est, respostas) {
    const f = est && est.naFila;
    if (!f) return 0;
    const dist = Math.max(1, f.distancia || 1);
    const espera = respostas - f.desde;
    const atraso = Math.max(0, espera - dist);
    return espera / (dist * dist) + PESO_DO_ATRASO * Math.pow(atraso / ATRASO_QUE_FURA, 3);
  }

  /* ── quem esperou demais fura a fila ──
     A urgência acima escolhe QUEM sai de uma fila; quantas vezes a fila é
     chamada, quem decide são os pesos. E fila no alvo tem peso de piso: em
     setembro a es→pt recebia uma resposta em cada seis, e o card dela esperava
     oito dias sem que urgência nenhuma pudesse ajudar.

     Então há uma saída por cima do sorteio (ideia do Gere): passadas
     ESPERA_QUE_FURA respostas na fila — uns dois dias e meio —, o card mais
     antigo das duas direções ganha chance de sair antes do sorteio entre ida
     e volta, e a chance cresce até virar certeza em ESPERA_QUE_FURA_SEMPRE.
     Desde 24/10/2026 isso vale dentro do grupo das revisões: o card novo é
     sorteado antes, e o atrasado não passa na frente dele (ver escolherProximo).

     A conta é em respostas de espera, e não em vezes a distância pedida: com
     quarenta a sessenta cards por fila quase todo card passa várias vezes do
     que pediu, e medida assim a regra dispararia a cada resposta e tomaria o
     lugar do sorteio (na simulação, setenta vezes por dia). Em respostas, ela
     só pega a cauda: a maior espera cai de 5,5 para 3,5 dias. */
  const ESPERA_QUE_FURA = 300;
  const ESPERA_QUE_FURA_SEMPRE = 450;

  /* Devolve { fila: 'esPt' | 'ptEs', indice } do card que fura agora, ou null. */
  function atrasadoQueFura(filas, estados, respostas) {
    let pior = null;
    for (const nome of ['esPt', 'ptEs']) {
      (filas[nome] || []).forEach((id, i) => {
        const f = estados[id] && estados[id].naFila;
        if (!f) return;
        const espera = respostas - f.desde;
        if (!pior || espera > pior.espera) pior = { fila: nome, indice: i, espera: espera };
      });
    }
    if (!pior || pior.espera <= ESPERA_QUE_FURA) return null;
    const chance = (pior.espera - ESPERA_QUE_FURA) / (ESPERA_QUE_FURA_SEMPRE - ESPERA_QUE_FURA);
    return Math.random() < Math.min(1, chance) ? pior : null;
  }

  /* ── o intervalo mínimo ──
     Nenhum card volta antes de INTERVALO_MINIMO outras respostas (pedido do
     Gere, 06/10/2026). No começo, com um card só na fila e o card novo
     vetado pelo teto, o mesmo card se repetia cinco vezes seguidas; agora,
     sem card na fila que já tenha esperado o intervalo, vem um card novo —
     e as primeiras respostas de quem começa são todas de cards novos.
     Era 10; em 07/10/2026 o Gere baixou para 6, porque com o novo a cada
     três do começo o card já não se repete em sequência. */
  const INTERVALO_MINIMO = 6;

  function podeVoltar(est, respostas) {
    const f = est && est.naFila;
    return !f || respostas - f.desde > INTERVALO_MINIMO;
  }

  function cumpriu(est, respostas) {
    const f = est && est.naFila;
    return !f || respostas - f.desde >= (f.distancia || 0);
  }

  /* O índice, dentro da fila, do card que sai agora. */
  function escolherNaFila(fila, estados, respostas) {
    if (!fila.length) return -1;
    const devidos = fila.some(id => cumpriu(estados[id], respostas));
    let melhor = -1, maior = -Infinity;
    fila.forEach((id, i) => {
      if (devidos && !cumpriu(estados[id], respostas)) return;
      const u = urgencia(estados[id], respostas);
      if (u > maior) { maior = u; melhor = i; }
    });
    return melhor;
  }

  /* ── os dominados que venceram ──
     O dominado fura a fila quando chega a data. Um só, tudo bem; mas eles
     vencem em lote — 43 no mesmo dia, pelos cards dominados juntos três dias
     antes —, e o histórico mostrou 22 dominados seguidos numa sessão.

     Então há espaço entre eles: depois de um dominado, vêm pelo menos
     ESPACO_DOMINADO cards de outra fila. Passado o espaço, a vez do dominado
     é sorteada, com chance que cresce com o acúmulo: um vencido sozinho tem
     10% por card, e dez ou mais vão sempre que o espaço deixa. Desde
     01/11/2026 o vencido dos degraus curtos (3 dias e «1 semana») conta por
     dois (PESO_NA_VEZ): 20% sozinho, e cinco já enchem a vez.

     O espaço começou em dois, passou por sete e ficou em três: no máximo um
     dominado em cada quatro cards, uns 30 num dia de 125 respostas — acima
     dos 17 a 31 que vencem por dia nesta fase. Nos dias em que vencem mais,
     os vencidos esperam; como a espera seguinte conta a partir da revisão, e
     não da data marcada, o atraso se acomoda em vez de crescer. */
  const ESPACO_DOMINADO = 3;
  const VENCIDOS_CHEIO = 10;

  function vezDoDominado(vencidos, desdeUltimo) {
    if (!vencidos) return false;
    if (desdeUltimo < ESPACO_DOMINADO) return false;
    return Math.random() < Math.min(1, vencidos / VENCIDOS_CHEIO);
  }

  /* ── quando os vencidos se acumulam (pedido do Gere, 01/11/2026) ──
     O espaço acima segura no máximo um dominado em cada quatro cards, uns 25
     a 30 por dia; na simulação, a partir de uns 40 dias de estudo vence mais
     do que isso, e a fila de vencidos cresce sem parar (159 em 90 dias; 501
     no aluno forte). Então, passados ACUMULO.folga vencidos, o espaço cai, e
     a parte dos dominados dentro das revisões sobe aos poucos, de
     ACUMULO.base até ACUMULO.teto em ACUMULO.aperto vencidos, e fica lá.
     Na descida vale a mesma curva: a parte baixa junto com a fila. O card
     novo continua sorteado antes (nada fura esse sorteio): 80% das revisões
     são uns 72% dos cards. Conta simples, sem os pesos da vez.
     Simulado (90 dias): a fila fica em 40 (aluno forte, 50); depois de 7
     dias sem estudar, desafoga em uns 4 dias. Custo: no aluno forte, de 13,8
     para 12,0 cards novos por dia nos dias 61 a 90. */
  const ACUMULO = { folga: 30, aperto: 150, base: 0.25, teto: 0.8 };

  /* A parte dos dominados nas revisões, ou null abaixo da folga (vale o espaço). Desde 27/11/2026
     o acúmulo é a soma dos pesos de pesoNaParte (o vencido de 1 mês para cima conta ¼): o app o
     manda em «acumulo»; sem ele, vale a conta simples. */
  function parteDosDominados(vencidos) {
    const a = ACUMULO;
    if (!(vencidos > a.folga)) return null;
    return a.base + (a.teto - a.base) * Math.min(1, (vencidos - a.folga) / (a.aperto - a.folga));
  }

  /* ── qual dominado vencido vem primeiro (pedido do Gere, 01/11/2026) ──
     Até aqui vinha o de data mais antiga, em dias: um card de meio ano
     vencido há cinco dias passava na frente de um de uma semana vencido há
     um, que está muito mais perto de ser esquecido. Agora a urgência é o
     atraso em relação à espera do degrau (atraso ÷ espera), e o degrau de
     «1 semana», o mais crítico, vale o dobro (PESO_DO_DEGRAU): no mesmo
     atraso em dias, ele passa até na frente do de 3 dias.
       3 dias, 1 dia de atraso: 0,33 · «1 semana» (5 dias), 1 dia: 0,40 ·
       meio ano, 20 dias: 0,11.
     O presumido do nivelamento conta no degrau de três meses, onde nasce.
     Sem «agora» (nada vencido), vem o de data mais próxima, como antes. */
  
  function degrauDoDominado(est) {
    if (est.presumido) return degrauDoPresumido();
    return Math.min(est.revisoes || 0, degraus() - 1);
  }

  function urgenciaDoDominado(est, agora) {
    const i = degrauDoDominado(est);
    const atraso = est.voltaEm ? (Date.parse(agora) - Date.parse(est.voltaEm)) / 864e5 : 0;
    const E = ESCADAS[ESCADA];
    return atraso / E.dias[i] * E.pesoDoDegrau[i];
  }

  /* O índice, em ids, do dominado que sai agora, ou null. estadoDe(id) dá o
     estado (o app passa o do presumido também); serve(id), quando vem, filtra. */
  function dominadoDaVez(ids, estadoDe, agora, serve) {
    let melhor = -1, chave = null;
    ids.forEach((id, i) => {
      const e = estadoDe(id);
      if (!e) return;
      if (serve && !serve(id)) return;
      if (agora && esperando(e, agora)) return;
      const k = agora ? -urgenciaDoDominado(e, agora) : 0;
      const data = String(e.voltaEm);
      if (melhor < 0 || k < chave[0] || (k === chave[0] && data < chave[1])) { melhor = i; chave = [k, data]; }
    });
    return melhor >= 0 ? melhor : null;
  }

  function acumuloDe(c) {
    return c.acumulo === undefined ? c.vencidos : c.acumulo;
  }

  /* O acúmulo da parte (parteDosDominados): cada vencido pelo peso do degrau dele. */
  function acumuloDosVencidos(ids, estadoDe, agora) {
    let soma = 0;
    ids.forEach(id => {
      const e = estadoDe(id);
      if (e && !esperando(e, agora)) soma += ESCADAS[ESCADA].pesoNaParte[degrauDoDominado(e)];
    });
    return soma;
  }

  /* O acúmulo que chama a vez do dominado, com os curtos contando por dois. */
  function pesoDosVencidos(ids, estadoDe, agora) {
    let soma = 0;
    ids.forEach(id => {
      const e = estadoDe(id);
      if (e && !esperando(e, agora)) soma += ESCADAS[ESCADA].pesoNaVez[degrauDoDominado(e)];
    });
    return soma;
  }

  /* ── a escolha, nos dois passos ──
     «c» é o contexto que o app monta a cada card:
       estados, arquivados, alvo (alvoDaFila), respostas (o relógio de respostas);
       temIneditos;
       livres = { esPt: [ids], ptEs: [ids] }, os que já podem voltar (podeVoltar);
       vencidos, quantos dominados passaram da data; acumulo, a mesma conta pelos pesos de
       pesoNaParte (acumuloDosVencidos); pesoDosVencidos, pelos de pesoNaVez;
       acúmulo com os curtos contando por dois; e desdeDominado, quantos
       cards vieram desde o último dominado.
     Devolve { grupo: 'novo' }, { grupo: 'revisao', fila: 'dominados' } (o app
     tira o vencido mais urgente, dominadoDaVez), { grupo: 'revisao', fila: 'esPt' | 'ptEs', id },
     ou null quando nenhum grupo tem card pronto. */
  function escolherProximo(c) {
    const g = gruposProntos(c);
    if (Math.random() < chanceDoProximoNovo(c)) return { grupo: 'novo' };
    if (!g.revisao) return null;
    const acumulo = c.pesoDosVencidos === undefined ? c.vencidos : c.pesoDosVencidos;
    const parte = parteDosDominados(acumuloDe(c));
    const vez = parte === null ? vezDoDominado(acumulo, c.desdeDominado) : Math.random() < parte;
    if (g.dominado && (!g.outros || vez)) {
      return { grupo: 'revisao', fila: 'dominados' };
    }
    const fura = atrasadoQueFura(c.livres, c.estados, c.respostas);
    if (fura) return { grupo: 'revisao', fila: fura.fila, id: c.livres[fura.fila][fura.indice] };
    let fila = Math.random() < chanceDaIda(c.estados, c.arquivados) ? 'esPt' : 'ptEs';
    if (!c.livres[fila].length) fila = fila === 'esPt' ? 'ptEs' : 'esPt';
    const i = escolherNaFila(c.livres[fila], c.estados, c.respostas);
    return { grupo: 'revisao', fila: fila, id: c.livres[fila][i] };
  }

  /* ── a frase presa à palavra ──
     Um card de frase pode trazer «requer: id-da-palavra». Ele fica fora do
     baralho até a palavra estar dominada, e só então entra — na frente,
     enquanto a conquista ainda está fresca. A frase mostra a palavra em uso
     corrente, que é o que a definição sozinha não ensina: dominar «estrenar»
     não é saber que é estrear, é saber dizer «estreno zapatos hoy». */
  /* ── mas só no dia seguinte ──
     A frase entrava logo depois do domínio, com a palavra ainda na tela da
     memória: ler «estreno zapatos» minutos depois de escrever «estrenar» é
     reconhecer, não lembrar. Agora ela espera virar o dia — entra à
     meia-noite seguinte ao domínio, no fuso do aparelho —, e o encontro vira
     também uma primeira revisão da palavra.

     A data do domínio fica em «dominadoEm», que o registrar anota. Palavra
     dominada antes de a data existir não tem o campo, e conta como vencida
     há muito tempo: a frase dela já estava liberada, e continua. */
  /* ── a frase presa a TODAS as palavras dela ──
     Desde outubro de 2026 a frase não espera só a palavra que ela mostra em
     uso: espera todas as palavras que exige, listadas em «requerTodas» (ver
     o manual). Frase que ensinava palavra nova no meio deixava de ser lição
     de uso e virava lição de vocabulário escondida. Agora, quem começa do
     zero só vê palavras até a primeira frase destravar.

     A lista traz ids de card de palavra. Uma entrada que começa com «+»
     ainda não tem card — é a palavra que a próxima leva vai criar —, e
     enquanto houver uma assim a frase fica presa.

     Palavra ARQUIVADA conta como dominada, desde o momento do arquivamento:
     é o «não quero aprender este card», usado para o que a pessoa já sabe.

     Card sem «requerTodas» cai no «requer» antigo, de uma palavra só. */
  function requeridas(card) {
    if (!card) return [];
    if (Array.isArray(card.requerTodas)) return card.requerTodas;
    return card.requer ? [card.requer] : [];
  }

  function arquivado(id, arquivados) {
    const a = arquivados && arquivados[id];
    return !!(a && a.ativo);
  }

  /* Quando a palavra passou a contar como sabida: o domínio, ou o
     arquivamento. Infinity quando ainda não conta. Sem data (dominada antes
     de «dominadoEm» existir) vale zero, como vencida há muito tempo. */
  /* Desde 09/10/2026 (PLANO.md, 7.1 e 7.2): a transparente total do curso
     conta como sabida desde sempre (zero), e a presumida pelo nivelamento,
     enquanto não tiver estado, desde o dia do nivelamento. */
  function sabidaEm(id, estados, arquivados) {
    if (arquivado(id, arquivados)) return Date.parse(arquivados[id].em) || 0;
    if (transparenteTotal(id)) return 0;
    /* a flexão que dorme conta como o card da terminação dela; a variante, como o lema (LATIM.md §13) */
    if (TERMINACAO[id] || RARA[id]) {
      const quem = quemConta(id, estados);
      if (quem !== id) return sabidaEm(quem, estados, arquivados);
    }
    const e = estados && estados[id];
    const propria = (!e || e.etapa !== 'dominado') ? (presumidoEm(id, estados) ? PRESUMIDOS_EM : Infinity)
      : (e.dominadoEm ? Date.parse(e.dominadoEm) || 0 : 0);
    /* A forma que acordou (flexaoPuxada) volta a ser estudada, mas para destravar frases e
       versos continua contando também pelo card da terminação dela: sem isso, o erro num trecho
       já liberado fazia a palavra «voltar a faltar» e travava o texto (relato do Gere, 22/11/2026). */
    const ativo = acordada(id, estados);
    if (ativo) return Math.min(propria, sabidaEm(ativo, estados, arquivados));
    return propria;
  }

  /* O card da terminação, se esta forma acordou depois de dormir nele (ou null). */
  function acordada(id, estados) {
    if (!TERMINACAO[id] || RARA[id]) return null;
    const ativo = ativoDaTerminacao(TERMINACAO[id], estados);
    if (!ativo || ativo === id || !flexaoPuxada(id, estados)) return null;
    return ativo;
  }

  function liberadaEm(card, estados, arquivados) {
    const req = requeridas(card);
    if (!req.length) return 0;
    let ultima = 0;
    for (const id of req) {
      if (String(id)[0] === '+') return Infinity;   // palavra que ainda não tem card
      const t = sabidaEm(id, estados, arquivados);
      if (t === Infinity) return Infinity;
      if (t > ultima) ultima = t;
    }
    if (!ultima) return 0;
    const d = new Date(ultima);
    d.setHours(24, 0, 0, 0);                     // a meia-noite seguinte
    return d.getTime();
  }

  function liberado(card, estados, agora, arquivados) {
    return liberadaEm(card, estados, arquivados) <= (agora || Date.now());
  }

  /* Quando esta frase foi liberada — ordena as recém-liberadas: primeiro a
     de palavra dominada há menos tempo.

     Sem a data do domínio valia o «ultima» da palavra, e isso dava um efeito
     torto: a revisão da palavra dominada renova o «ultima», a frase dela
     passava por recém-liberada e furava a fila dos inéditos — aparecia logo
     depois de a palavra ser revista, inclusive quando a revisão era um erro.
     Palavra sem a data foi dominada antes de o campo existir: conta como
     liberada há muito tempo, igual ao que o liberadaEm já diz dela. */
  function venceuEm(card, estados, arquivados) {
    const req = requeridas(card);
    if (!req.length) return 0;
    /* palavra sem data de domínio: a frase conta como liberada há muito tempo; a flexão que dorme
       vale pelo card da terminação dela (LATIM.md §13) */
    if (req.map(id => quemConta(id, estados)).some(id => !arquivado(id, arquivados) && !(estados[id] && estados[id].dominadoEm))) return 0;
    const t = liberadaEm(card, estados, arquivados);
    return t === Infinity ? 0 : t;
  }

  /* ── as frases em vista ──
     O app escolhe algumas frases que ainda não destravaram e vai trazendo as
     palavras delas como cards novos, para que destravem (pedido do Gere,
     outubro de 2026). São FRASES_EM_VISTA de cada vez: 60% as mais perto de
     destravar — menos palavras faltando dominar —, para a recompensa chegar
     logo; 40% sorteadas pelo nível certo para quem estuda (pesosDeNivel),
     para a escolha não ficar presa nas frases fáceis.

     A frase sai da lista quando já não tem palavra para trazer: todas as
     dela já entraram no jogo (ou foram arquivadas), e ela só espera serem
     dominadas — aí entra outra no lugar, e o fluxo de palavras não para.
     Sai também quando é vista, arquivada, ou quando ainda depende de palavra
     sem card («+»), que nenhuma estreia resolve. */
  const FRASES_EM_VISTA = 10;
  const PARTE_PERTO = 0.6;

  function situacaoDaFrase(card, estados, arquivados) {
    const req = requeridas(card);
    const buraco = req.some(id => String(id)[0] === '+');
    /* a transparente e a presumida não estreiam como card novo: não há o que
       trazer para elas, e contá-las aqui prenderia a frase na lista de vista */
    /* nem a flexão que dorme (LATIM.md §13): ela não estreia */
    const naoVistas = req.filter(id => String(id)[0] !== '+' &&
      !(estados[id] && estados[id].vistas) && !arquivado(id, arquivados) && !conhecidaSemEstado(id, estados) &&
      !adormecido(id, estados));
    const faltamDominar = req.filter(id => sabidaEm(id, estados, arquivados) === Infinity).length;
    return { buraco: buraco, naoVistas: naoVistas, faltamDominar: faltamDominar };
  }

  function atualizarEmVista(lista, cards, porId, estados, arquivados, pesos) {
    const util = id => {
      const c = porId[id];
      if (!c || c.tipo !== 'frase' || !Array.isArray(c.requerTodas)) return null;
      if ((estados[id] && estados[id].vistas) || arquivado(id, arquivados)) return null;
      const s = situacaoDaFrase(c, estados, arquivados);
      return !s.buraco && s.naoVistas.length ? s : null;
    };
    const fica = (lista || []).filter(x => x && util(x.id));
    const ja = new Set(fica.map(x => x.id));
    const candidatas = [];
    for (const c of cards) {
      if (ja.has(c.id)) continue;
      const s = util(c.id);
      if (s) candidatas.push({ c: c, s: s });
    }
    const metaPerto = Math.round(FRASES_EM_VISTA * PARTE_PERTO);
    while (fica.length < FRASES_EM_VISTA && candidatas.length) {
      const perto = fica.filter(x => x.origem === 'perto').length;
      let i;
      if (perto < metaPerto) {
        let melhor = Infinity;
        candidatas.forEach((x, k) => {
          const nota = x.s.faltamDominar - 0.5 * ((pesos && pesos[x.c.nivel]) || 0) + Math.random() * 0.3;
          if (nota < melhor) { melhor = nota; i = k; }
        });
        fica.push({ id: candidatas[i].c.id, origem: 'perto' });
      } else {
        let total = 0;
        const w = candidatas.map(x => { const v = (pesos && pesos[x.c.nivel]) || 0.15; total += v; return v; });
        let u = Math.random() * total;
        for (i = 0; i < w.length - 1 && u > w[i]; i++) u -= w[i];
        fica.push({ id: candidatas[i].c.id, origem: 'sorteio' });
      }
      candidatas.splice(i, 1);
    }
    return fica;
  }

  /* As palavras que as frases em vista ainda pedem, na ordem em que devem
     estrear: primeiro a que serve a mais frases da lista, depois a da frase
     mais perto de destravar. */
  function palavrasEmVista(lista, porId, estados, arquivados) {
    const conta = new Map(), perto = new Map();
    (lista || []).forEach(x => {
      const c = porId[x.id];
      if (!c) return;
      const s = situacaoDaFrase(c, estados, arquivados);
      s.naoVistas.forEach(id => {
        conta.set(id, (conta.get(id) || 0) + 1);
        perto.set(id, Math.min(perto.has(id) ? perto.get(id) : Infinity, s.faltamDominar));
      });
    });
    return [...conta.keys()].sort((a, b) => (conta.get(b) - conta.get(a)) || (perto.get(a) - perto.get(b)));
  }

  /* ── o intervalo do card maduro ──
     Dominado não quer dizer aposentado. Acertar três vezes seguidas com o
     card voltando de dois em dois dias não prova memória de longo prazo —
     prova que ele ainda estava fresco. Então o card continua no baralho para
     sempre, e o que cresce é a espera: 3 dias, 1 semana, 2, 1 mês, 3 meses,
     meio ano. Errar desce um degrau (ver registrar).

     O degrau de «1 semana» espera de fato 5 dias (pedido do Gere, 01/11/2026,
     olhando o acerto pela espera em /admin/estatisticas/): é o degrau dos
     cards que já foram errados alguma vez — quem nunca errou pula de 3 para
     14 —, e o acerto caía cedo nele. O nome continua «1 semana», na tela e no
     banco (cards.retornos.nominal_dias = 7): DIAS_NOMINAIS é o que se mostra,
     DIAS_DOMINADO é o que se espera.

     É a única parte do app que olha o calendário, e só para os maduros. A
     fila tem 361 cards e todo card respondido volta para ela, então sem data
     o intervalo máximo seria uma passada pelo baralho — perto demais. */
  /* Desde 11/11/2026 as listas moram em ESCADAS (acima), uma por família de curso;
     DIAS_DOMINADO e DIAS_NOMINAIS, exportados, são as da escada em uso. */

  /* ── a espera sorteada (pedido do Gere, 17/10/2026) ──
     Para escolher os intervalos com dado, e não com palpite, cada volta é
     sorteada em torno do degrau: de metade ao dobro, por igual na escala
     dos fatores (log-uniforme). O meio do sorteio é o próprio degrau, e
     metade das voltas vem antes dele — um card de duas semanas volta entre
     7 e 28 dias. O banco anota quanto cada card de fato esperou e se a
     resposta saiu certa (cards.retornos, no taioe-infra), e o gráfico de
     /admin/estatisticas/ cruza as duas coisas.

     O degrau, a escada e o rótulo «volta em 2 semanas» continuam os
     mesmos: o que varia é só a data. Por que de metade ao dobro: as
     revisões de 09/09 a 16/10 acertaram de 92% a 99% em todos os degraus,
     perto do teto — a espera pode estar curta, e o lado de lá do degrau é
     o que mais ensina; o lado de cá mostra onde a curva começa a cair. */
  const VARIACAO_DA_VOLTA = [0.5, 2];

  function fatorDaVolta() {
    const [menor, maior] = VARIACAO_DA_VOLTA;
    return menor * Math.pow(maior / menor, Math.random());
  }

  function proximaVolta(revisoes, agora, fator) {
    const dias = ESCADAS[ESCADA].dias[Math.min(revisoes || 0, degraus() - 1)];
    const d = agora ? new Date(agora) : new Date();
    d.setTime(d.getTime() + dias * (fator === undefined ? fatorDaVolta() : fator) * 864e5);
    return d.toISOString();
  }

  /* ── a data que passou do degrau (17/11/2026) ──
     A escada das línguas mortas (12/11) manteve o índice e a data de cada card,
     e o índice passou a valer uma espera mais curta: o card do índice 4 era
     «3 meses» (volta de 45 a 180 dias) e virou «1 mês», com a mesma data. Toda
     data além do dobro do degrau em uso, contado da última resposta, é sorteada
     de novo pelo degrau de agora. O sorteio sai de um hash do card e da última
     resposta, para dar a mesma data em todo aparelho. Devolve true se mudou. */
  function ajustarVoltaAoDegrau(id, est) {
    if (!est || est.etapa !== 'dominado' || !est.voltaEm || !est.ultima || est.presumido) return false;
    const dias = ESCADAS[ESCADA].dias[Math.min(est.revisoes || 0, degraus() - 1)];
    const [menor, maior] = VARIACAO_DA_VOLTA;
    const limite = Date.parse(est.ultima) + dias * maior * 864e5 + 6e4;
    if (!(Date.parse(est.voltaEm) > limite)) return false;
    const u = hashDeTexto(id + '|' + est.ultima) / 4294967296;
    est.voltaEm = proximaVolta(est.revisoes, est.ultima, menor * Math.pow(maior / menor, u));
    return true;
  }

  /* O card ainda está de molho? Só o dominado tem voltaEm. */
  function esperando(est, agora) {
    if (!est || !est.voltaEm) return false;
    return est.voltaEm > (agora || new Date().toISOString());
  }

  /* Quantas respostas à frente o card volta para a fila.
     Errou → volta logo. Acertou escrevendo → some lá no fim. O tempo que a
     resposta levou não entra na conta (ver «o relógio saiu do motor»): as
     distâncias são as que valiam para a resposta rápida, que eram nove em
     cada dez. */
  function distanciaNaFila(est, r) {
    let base;

    if (!r.acertou) {
      // Volta relativamente cedo, mas cada erro seguido no mesmo card
      // afasta mais: insistir de imediato num card travado só cansa.
      base = r.quase ? 10 : 7;
      /* Errar em pt→es é outra história: a grafia espanhola certa acabou de
         aparecer na tela, e o card cai na múltipla escolha da mesma direção.
         Voltar em dez posições seria pedir que se reconheça o que se acabou
         de ler — a mesma muleta que o piso do acerto nessa direção evita.
         Aqui o piso é menor do que aquele: errou, então precisa voltar. */
      if (ehVolta(r.direcao)) base = r.quase ? 26 : 20;
      base *= (1 + 0.5 * Math.min(est.errosSeguidos || 0, 4));
    } else if (r.modo === 'multipla') {
      // acertar na múltipla escolha vale pouco: pode ter sido chute
      base = 32;

      /* Na volta, acertar entre cinco e ir escrever logo depois não prova
         nada: a grafia espanhola acabou de passar na frente dos olhos, e o
         que se recupera é a memória da tela, não a da palavra. O card só
         reaparece bem mais adiante, quando a imagem já não sirva de muleta. */
      if (r.acertou && ehVolta(r.direcao)) base = Math.max(base, 90);
    } else {
      /* Escrever pedia 110, mais de três vezes o que pede a escolha (32).
         Agora é o dobro. */
      base = 64;
      if (est.seguidas >= 3) base *= 2;   // acabou de fechar a direção
    }

    const ruido = 0.85 + Math.random() * 0.3;
    return Math.max(3, Math.round(base * ruido));
  }

  /* ── quantos passos até o domínio ──
     Do zero ao dominado são SEIS respostas certas: escolher entre cinco e
     escrever duas vezes de cada lado. O contador «seguidas» não separa
     escolher de escrever, então o acerto na múltipla já conta para o portão
     — o caminho é multipla, escrita, escrita | multipla, escrita, escrita.

     Card que nunca foi errado não precisa das seis: fecha com CINCO. O passo
     que sai é o último — a segunda escrita em pt→es —, e o caminho fica
     multipla, escrita, escrita | multipla, escrita. O desconto é gasto no
     portão da volta, e não no da ida, porque é o que a evidência permite: no
     portão da ida o card tem três respostas e ainda pode tropeçar depois; no
     da volta o histórico está quase completo.

     Havia um segundo passo de desconto, para o card «sempre rápido», que
     fechava com quatro. Saiu junto com o relógio: 41 dos 317 dominados tinham
     passado por ali.

     Um erro apaga o desconto: «erros» deixa de ser zero e o portão volta a
     pedir três. Quem já é dominado não passa por aqui. */
  const ACERTOS_PARA_VIRAR = 3;

  function descontoDePassos(est) {
    return est && !est.erros ? 1 : 0;
  }

  function acertosParaVirar(est, inversa) {
    /* o desconto só vale no portão da volta */
    return ACERTOS_PARA_VIRAR - (inversa ? descontoDePassos(est) : 0);
  }

  /* ── o diário ──
     Uma linha por dia, no fuso do aparelho, com o que os gráficos do painel
     precisam e nada além: quantas respostas, quantas certas e quantas em
     cada hora. (Guardava também o tempo dos acertos, contado em faixas, para
     o gráfico de velocidade; os dois saíram.) */
  function diaLocal(quando) {
    const t = new Date(quando);
    const dd = n => (n < 10 ? '0' : '') + n;
    return t.getFullYear() + '-' + dd(t.getMonth() + 1) + '-' + dd(t.getDate());
  }

  function anotarDiario(diario, r, quando) {
    const t = new Date(quando);
    const d = diaLocal(t);
    const g = diario[d] || (diario[d] = { n: 0, ok: 0, h: new Array(24).fill(0) });
    g.n++;
    if (r.acertou) g.ok++;
    g.h[t.getHours()]++;
  }

  /* Registra uma resposta no estado do card. */
  function registrar(est, r) {
    /* o dia da estreia, para o painel contar os cards novos de cada dia */
    if (!est.vistas && !est.estreia) est.estreia = diaLocal(new Date());
    /* a primeira resposta, para a estimativa viva (evidenciasDaDivisa, 15/11/2026) */
    if (!est.vistas && est.primeira === undefined) est.primeira = !!r.acertou;
    est.vistas++;
    est.ultima = new Date().toISOString();

    /* Progresso gravado antes destes contadores existirem não os tem. Semeia
       com o que o histórico ainda guarda — é menos do que houve, mas é o que
       sobrou, e daqui para a frente a conta passa a ser exata. */
    if (!est.porModo) {
      est.porModo = contadoresPorModo();
      (est.historico || []).forEach(h => {
        const x = est.porModo[h.modo];
        if (x) { x.n++; if (h.acertou) x.certas++; }
      });
    }
    const noModo = est.porModo[r.modo];
    if (noModo) { noModo.n++; if (r.acertou) noModo.certas++; }

    if (r.acertou) {
      est.acertos++;
      est.seguidas++;
      est.errosSeguidos = 0;
    } else {
      est.erros++;
      est.seguidas = 0;
      est.errosSeguidos = (est.errosSeguidos || 0) + 1;
    }

    /* Avanço e recuo. Cada direção percorre o mesmo caminho: escolher entre
       cinco, depois escrever, e três acertos seguidos escrevendo fecham a
       direção. Errar devolve para a múltipla escolha da direção em que está
       — quem já provou o espanhol→português não volta à estaca zero. */
    const inversa = ehVolta(r.direcao) && !ehContraste(est.id);
    const jaDominado = est.etapa === 'dominado';
    if (umaVezSo(est.id)) {
      /* o card de herança (§13) é curiosidade, não fica no jogo (pedido do Gere, 03/11/2026):
         o acerto de primeira, ou dois seguidos depois de um erro, fecham de vez, como na forma;
         e os de análise (§15: o verbo, a concordância, a regência), pela mesma regra (o Gere,
         04/11/2026: «aparecer uma vez só, se errar, até acertar duas»), e a pergunta sobre o trecho (§16, D41) */
      if (r.acertou && (est.vistas === 1 || est.seguidas >= ACERTOS_PARA_FECHAR_HERANCA)) {
        est.etapa = 'dominado';
        if (!est.dominadoEm) est.dominadoEm = new Date().toISOString();
        if (est.ateDominar === undefined) est.ateDominar = est.vistas;
        est.seguidas = 0;
      } else if (!jaDominado) {
        est.etapa = 'multipla';
      }
    } else if ((ehContraste(est.id) || ehConceito(est.id) || ehFlexaoDeCaso(est.id) || deEscolherSempre(est.id)) && r.acertou && !jaDominado) {
      /* o card de contraste (§3.7), desde 24/10/2026 o de conceito (§3.5), desde 26/10/2026 a
         flexão de nome (§3.8) e desde 29/10/2026 os de compreensão e de herança (§13): só
         múltipla escolha; três acertos seguidos o dominam, e daí em diante ele volta por data,
         como os outros */
      if (est.seguidas >= ACERTOS_PARA_VIRAR) {
        est.etapa = 'dominado';
        if (!est.dominadoEm) est.dominadoEm = new Date().toISOString();
        if (est.ateDominar === undefined) est.ateDominar = est.vistas;
        est.seguidas = 0;
      } else {
        est.etapa = 'multipla';
      }
    } else if (ehForma(est.id)) {
      /* o card de forma (§3.6): só múltipla escolha (até 24/10/2026, só escrita); o acerto de
         primeira, ou três seguidos depois de um erro, fecham de vez */
      if (r.acertou && (est.vistas === 1 || est.seguidas >= ACERTOS_PARA_VIRAR)) {
        est.etapa = 'dominado';
        if (!est.dominadoEm) est.dominadoEm = new Date().toISOString();
        if (est.ateDominar === undefined) est.ateDominar = est.vistas;
        est.seguidas = 0;
      } else if (!jaDominado) {
        est.etapa = 'multipla';
      }
    } else if (r.acertou) {
      if (jaDominado) {
        /* Card maduro que voltou depois da espera e foi acertado: continua
           dominado, e a próxima espera fica mais longa. Antes ele caía para
           'inversa-escrita' e precisava reconquistar as três seguidas — o
           contador de dominados encolhia justamente quando se acertava. */
        /* Quem nunca errou — nem antes de dominar, nem nas revisões — sobe
           de dois em dois: 3 dias, 2 semanas, 3 meses, 6 meses. Um erro em
           qualquer momento da vida do card devolve o passo de um. */
        /* Nas línguas mortas, abaixo da «2 semanas» sobe um degrau por acerto, erro ou não. */
        const atual = est.revisoes || 0;
        const passo = (est.erros || atual < ESCADAS[ESCADA].umPorVezAte) ? 1 : 2;
        est.revisoes = Math.min(degraus() - 1, atual + passo);
      } else if (r.modo === 'multipla') {
        if (inversa) est.etapa = 'inversa-escrita';
        else est.etapa = 'escrita';
      } else if (est.seguidas >= acertosParaVirar(est, inversa)) {
        /* o card de leitura não tem volta: a ida fechada já é o domínio; no modo trilhas,
           nenhum card tem */
        const fecha = inversa || soIda() || ehLeitura(est.id);
        est.etapa = fecha ? 'dominado' : 'inversa-multipla';
        /* a primeira vez só: é dela que a frase de uso conta o dia seguinte */
        if (fecha && !est.dominadoEm) est.dominadoEm = new Date().toISOString();
        /* e quantas respostas custou chegar lá, para o painel */
        if (fecha && est.ateDominar === undefined) est.ateDominar = est.vistas;
        est.seguidas = 0;   // a direção nova começa do zero
        /* «revisoes» não zera aqui. Quem chega pela primeira vez já vem com
           zero, e quem está voltando de um tropeço tem de reencontrar o
           degrau de onde caiu — senão o recuo de um degrau viraria recuo
           até o chão no momento da reconquista. */
      } else {
        est.etapa = inversa ? 'inversa-escrita' : 'escrita';
      }
    } else {
      /* ── errar derruba um degrau, não a escada inteira ──
         O card maduro CONTINUA dominado: o que recua é só a espera, uma
         casa — um card de 90 dias volta em 30, não em 3. Ele segue sendo
         cobrado por escrito em espanhol, que é o que ele já provava saber.

         Duas versões atrás, um só deslize apagava meses de maturidade e
         punha o card maduro no mesmo lugar de um recém-aprendido. Depois
         ele passou a cair para «inversa-escrita», o que ainda o obrigava a
         reconquistar três acertos seguidos para voltar à escada. Agora não
         sai: quem já atravessou as duas direções não precisa provar de novo
         que atravessou — precisa só de mais um encontro, e mais cedo.

         Errando sempre, ele se estabiliza no degrau de baixo, três dias, e
         fica ali sendo escrito a cada três dias até voltar a acertar. É o
         laço mais apertado que a escada tem, e é onde um card esquecido
         deve mesmo ficar.

         Para quem nunca foi dominado nada muda: «revisoes» já era zero, e o
         decremento não o leva abaixo disso. */
      if (!jaDominado) est.etapa = inversa ? 'inversa-multipla' : 'multipla';
      est.revisoes = Math.max(0, (est.revisoes || 0) - 1);
    }

    /* Só o maduro espera por data; qualquer outro volta pela fila e mais nada. */
    est.voltaEm = est.etapa === 'dominado' && !ehForma(est.id) && !umaVezSo(est.id) ? proximaVolta(est.revisoes, est.ultima) : null;

    // a estreia é a única medida limpa do que já se sabia antes do app
    if (est.vistas === 1) est.primeiraCerta = !!r.acertou;

    /* O tempo da resposta não entra aqui: vai só para o log da sessão.
       «quase» só é gravado quando verdadeiro. Quase sempre é falso, e campo
       falso escrito nas doze respostas de cada card era um terço do
       progresso.json — que sobe inteiro a cada três respostas. Quem lê o
       histórico já trata o campo ausente como falso. */
    const entrada = {
      em: est.ultima,
      modo: r.modo,
      acertou: r.acertou,
      resposta: r.resposta || null
    };
    if (r.quase) entrada.quase = true;
    est.historico.push(entrada);
    if (est.historico.length > 12) est.historico = est.historico.slice(-12);

    return est;
  }

  /* ── as duas direções ──
     Todo card começa em espanhol→português: você lê o espanhol e diz o que
     é. Depois de dominado nessa direção, ele vira: aparece o português e
     você tem que produzir o espanhol, que é bem mais difícil. Cada direção
     repete o mesmo caminho — primeiro escolher entre cinco, depois escrever. */
  const FASES = {
    'multipla':         { volta: false, modo: 'multipla' },
    'escrita':          { volta: false, modo: 'escrita' },
    'consolidado':      { volta: true,  modo: 'multipla' },  // valor antigo
    'inversa-multipla': { volta: true,  modo: 'multipla' },
    'inversa-escrita':  { volta: true,  modo: 'escrita' },
    'dominado':         { volta: true,  modo: 'escrita' }
  };

  function faseDe(est) {
    /* o card de contraste (§3.7) é sempre a múltipla escolha: a frase em português, a resposta
       em latim, entre quatro que só mudam nos casos */
    if (est && ehContraste(est.id)) return { direcao: VOLTA, modo: 'multipla' };
    /* os cards de conceito e de forma, sempre de escolher (pedido do Gere, 24/10/2026:
       escrever «nominativo» toda vez cansava), também na revisão por data */
    if (est && (ehConceito(est.id) || ehForma(est.id))) return { direcao: IDA, modo: 'multipla' };
    /* e a flexão de nome, que pergunta o caso (pedido do Gere, 26/10/2026) */
    if (est && ehFlexaoDeCaso(est.id)) return { direcao: IDA, modo: 'multipla' };
    /* e os de compreensão e de herança (LATIM.md §13, D31 e D32) e os de análise (§15) */
    if (est && deEscolherSempre(est.id)) return { direcao: IDA, modo: 'multipla' };
    /* o card de leitura só conhece a ida, também quando dominado; no modo trilhas, todos */
    if (est && (soIda() || ehLeitura(est.id))) {
      if (est.etapa === 'dominado' || est.etapa === 'escrita') return { direcao: IDA, modo: 'escrita' };
      return { direcao: IDA, modo: 'multipla' };
    }
    const f = FASES[(est && est.etapa)] || FASES['multipla'];
    return { direcao: f.volta ? VOLTA : IDA, modo: f.modo };
  }

  function modoDe(est) { return faseDe(est).modo; }
  function direcaoDe(est) { return faseDe(est).direcao; }

  /* O que o card pergunta e o que ele espera, conforme a direção. */
  function pergunta(card, direcao) {
    return card[linguaDaPergunta(direcao)];
  }
  function resposta(card, direcao) {
    return card[linguaDaResposta(direcao)];
  }

  /* ── o card de conceito (cards/LATIM.md §3.5) ──
     Pergunta-se com um exemplo real e uma palavra em destaque («Em que caso está Dominum?»),
     e cada vez é outro exemplo, para ninguém decorar a frase em vez de ler a forma. A vez
     é a das respostas já dadas ao card: o mesmo exemplo em qualquer aparelho. Desde
     24/10/2026 é sempre de escolher, com as alternativas do exemplo da vez (as leituras que a
     mesma forma teria fora da frase vêm primeiro; ver fonte/latim/cards_de_forma.py). */
  function exemploDoConceito(card, est, estados) {
    let ex = (card && card.exemplos) || [];
    if (!ex.length) return null;
    /* nas declinações e conjugações do latim e na gramática do espanhol (03/11/2026), os
       exemplos são palavras («lema») ou frases («de») do curso: vêm os que a pessoa já viu,
       quando há ao menos dois */
    if (estados && ex.some(e => e.lema || e.de)) {
      const vistas = ex.filter(e => (e.lema || e.de) && estados[e.lema || e.de] && estados[e.lema || e.de].vistas);
      if (vistas.length >= 2) ex = vistas;
    }
    const n = (est && est.vistas) || 0;
    return ex[n % ex.length];
  }

  /* ── o card de forma (cards/LATIM.md §3.6, pedido do Gere, 22/10/2026) ──
     «Em que caso está a palavra destacada?», com o verso do texto. Só de escolher, entre as
     leituras que mais se confundem com a certa (até 24/10/2026 era só por escrito, e escrever
     «nominativo» toda vez cansava o Gere), e uma vez só: acertou de primeira, sai de vez;
     errou, volta até acertar três vezes seguidas, e então sai de vez. Nunca volta por data.
     Nem todo card de forma é perguntado: desde 29/10/2026 (LATIM.md §13, D28), só o da forma
     que, sozinha, teria mais de uma leitura («ambigua», de cards_de_forma.py: *dei*, *rosae*,
     *nobis*; *venit*, vem ou veio), em que a frase é que decide; a de leitura única, a flexão e
     as erradas do card da frase já cobrem. Até então o difícil vinha sempre e o fácil para uma
     pessoa em quatro. E o erro puxa os parecidos: quem errou um dativo passa a ver também os
     dativos de leitura única, até acertar três seguidos daquele caso. */
  const ACERTOS_QUE_SOLTAM = 3;
  const ACERTOS_PARA_FECHAR_HERANCA = 2;
  let RESPOSTA_DA_FORMA = Object.create(null);   // id do card de forma → resposta («dativo»)

  function ehForma(id) { return TIPO[id] === 'forma'; }

  /* ── o card de contraste (cards/LATIM.md §3.7, pedido do Gere, 22/10/2026; nas línguas vivas,
     cards/PLANO.md §10, 23/10) ──
     Uma frase simples em português e, como alternativas, as mesmas palavras latinas na mesma
     ordem, mudando só os casos: Lupus canem videt · Lupum canis videt · Lupi canis videt ·
     Lupe, canis videt. Os cards do mesmo «conjunto» têm as mesmas quatro alternativas, cada
     um com a sua frase portuguesa. Só múltipla escolha; entra quando as palavras e os
     conceitos dos casos estão dominados («requerTodas»). */
  function ehContraste(id) { return TIPO[id] === 'contraste'; }
  function ehConceito(id) { return TIPO[id] === 'conceito'; }

  /* ── os cards de compreensão e de herança (LATIM.md §13, D31 e D32, pedido do Gere, 29/10/2026) ──
     A compreensão mostra uma frase latina e pergunta, em português, pelo sentido: «Quem vence?»
     em *Omnia vincit Amor*. Só acerta quem lê a terminação, sem nome de caso nenhum. A herança
     mostra o que o latim deixou no português: a palavra que vem do lema, ou a expressão latina
     ao pé da letra (*per capita*, «por cabeças»). Os dois trazem a pergunta no card
     («pergunta»), só se escolhem, e três acertos seguidos os dominam, como o contraste. */
  function ehCompreensao(id) { return TIPO[id] === 'compreensao'; }
  function ehHeranca(id) { return TIPO[id] === 'heranca'; }
  /* e, nas palavras raras (cards/RARAS.md §3, 20/11/2026), o card do sentido e o do uso, que
     levam «escolher»: escrever uma definição não se confere */
  function deEscolherSempre(id) { return ehCompreensao(id) || ehHeranca(id) || ehAnalise(id) || !!ESCOLHER[id]; }

  /* ── os cards de análise (LATIM.md §15, D39, D40 e D42; aula 1 do Falcon, 04/11/2026) ──
     O método de ler pelo verbo, treinado em três perguntas: «Qual é o verbo desta frase?» (a
     frase inteira, as alternativas são palavras dela), «Com que palavra concorda?» (a frase com
     o adjetivo destacado, as alternativas são os nomes dela) e «O que este verbo pede?» (a
     regência, depois do card do verbo). Só de escolher, uma vez só, como a herança. */
  function ehAnalise(id) { return TIPO[id] === 'analise'; }

  /* A pergunta de compreensão sobre um trecho de texto (LATIM.md §16, D41, 04/11/2026: «Quem é
     enviado do alto céu?») é da mesma família: depois do trecho, uma vez só. */
  function ehCompreensaoDoVerso(id) { return !!DO_VERSO[id]; }
  /* e, desde 07/11/2026, toda compreensão, também a das frases (o Gere, no la-q026: «tratado que
     nem os cards de herança»; até então ela fechava com três acertos e voltava por data) */
  function umaVezSo(id) { return ehHeranca(id) || ehAnalise(id) || ehCompreensao(id) || ehCompreensaoDoVerso(id); }

  /* O card de forma acertado já disse o que tinha a dizer: fora de todas as filas. */
  function encerrado(id, est) {
    return (ehForma(id) || umaVezSo(id)) && !!est && est.etapa === 'dominado';
  }

  /* A resposta tem sido errada nos cards de forma de mesmo gabarito: o último erro ainda não
     teve ACERTOS_QUE_SOLTAM acertos seguidos depois dele. */
  function formaPuxada(resposta, estados) {
    const vezes = [];
    for (const id in RESPOSTA_DA_FORMA) {
      if (RESPOSTA_DA_FORMA[id] !== resposta) continue;
      const e = estados && estados[id];
      ((e && e.historico) || []).forEach(h => vezes.push(h));
    }
    vezes.sort((a, b) => String(a.em).localeCompare(String(b.em)));
    let ultimoErro = -1;
    vezes.forEach((h, i) => { if (!h.acertou) ultimoErro = i; });
    return ultimoErro >= 0 && vezes.length - 1 - ultimoErro < ACERTOS_QUE_SOLTAM;
  }

  /* A pergunta da vez no card de forma (pedido do Gere, 03/11/2026): o caso (ou o tempo e o
     modo), a função na frase, a pessoa do verbo ou a forma de dicionário, conforme o que o card
     tem. A primeira pergunta varia de card para card (pelo id), e a volta depois de um erro faz
     a seguinte. Devolve { tipo, pt, distratores, aceitas }. */
  function perguntaDaForma(card, est) {
    if (!card || card.tipo !== 'forma') return null;
    const tipos = [{ tipo: card.familia === 'verbo' ? 'tempo' : 'caso', pt: card.pt, distratores: card.distratores || [], aceitas: card.aceitas || [] }];
    if (card.funcao && (card.distratoresFuncao || []).length >= 4) tipos.push({ tipo: 'funcao', pt: card.funcao, distratores: card.distratoresFuncao, aceitas: [] });
    if (card.pessoa && (card.distratoresPessoa || []).length >= 4) tipos.push({ tipo: 'pessoa', pt: card.pessoa, distratores: card.distratoresPessoa, aceitas: [] });
    if (card.dicionario && (card.distratoresDicionario || []).length >= 4) tipos.push({ tipo: 'dicionario', pt: card.dicionario, distratores: card.distratoresDicionario, aceitas: [] });
    let h = 0;
    for (const ch of String(card.id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return tipos[(h + ((est && est.vistas) || 0)) % tipos.length];
  }

  function formaEscolhida(card, estados) {
    return !!card.ambigua || formaPuxada(card.pt, estados);
  }

  /* Pode estrear: o verso (ou a primeira frase) de onde a palavra vem já apareceu, ou foi
     dado como sabido, e a pessoa está entre as que recebem este card. */
  function formaPronta(card, estados, arquivados) {
    const e = estados && estados[card.de];
    if (!(e && e.vistas) && !arquivado(card.de, arquivados)) return false;
    return formaEscolhida(card, estados);
  }

  /* ── a resposta do card de forma ──
     O que conta é o caso, ou o tempo e o modo; número, pessoa, gênero e voz não pesam
     («ablativo singular», «abl.»). Para o verbo vale o que o card de conceito já aceitava:
     sem o modo, é o indicativo («perfeito»); sem o tempo, o presente («subjuntivo»); no
     particípio, o tempo é opcional. */
  const TERMOS_DE_CASO = {
    nominativo: 'nominativo', nom: 'nominativo', vocativo: 'vocativo', voc: 'vocativo',
    acusativo: 'acusativo', acus: 'acusativo', ac: 'acusativo', acc: 'acusativo',
    genitivo: 'genitivo', gen: 'genitivo', dativo: 'dativo', dat: 'dativo',
    ablativo: 'ablativo', abl: 'ablativo'
  };
  const TERMOS_DE_MODO = {
    indicativo: 'indicativo', ind: 'indicativo', subjuntivo: 'subjuntivo', subj: 'subjuntivo',
    conjuntivo: 'subjuntivo', imperativo: 'imperativo', imp: 'imperativo', infinitivo: 'infinitivo',
    inf: 'infinitivo', participio: 'participio', part: 'participio'
  };
  const TERMOS_DE_TEMPO = {
    presente: 'presente', pres: 'presente', imperfeito: 'imperfeito', perfeito: 'perfeito',
    maisqueperfeito: 'maisqueperfeito', futuro: 'futuro', futuroperfeito: 'futuroperfeito',
    passado: 'perfeito'
  };

  function termosDaGramatica(texto) {
    const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/mais[\s-]+que[\s-]+perfeito/g, 'maisqueperfeito')
      .replace(/futuro\s+(perfeito|anterior)/g, 'futuroperfeito')
      .replace(/futuro\s+do\s+presente/g, 'futuro')
      .replace(/[^a-z]+/g, ' ').trim();
    const palavras = t ? t.split(' ') : [];
    const achados = { casos: new Set(), modos: new Set(), tempos: new Set(), palavras: palavras };
    palavras.forEach(p => {
      if (TERMOS_DE_CASO[p]) achados.casos.add(TERMOS_DE_CASO[p]);
      if (TERMOS_DE_MODO[p]) achados.modos.add(TERMOS_DE_MODO[p]);
      if (TERMOS_DE_TEMPO[p]) achados.tempos.add(TERMOS_DE_TEMPO[p]);
    });
    return achados;
  }

  function verboEsperado(card) {
    const a = termosDaGramatica(card.pt);
    return { modo: [...a.modos][0] || 'indicativo', tempo: [...a.tempos][0] || null };
  }

  /* 'certo', 'quase' (nenhum termo reconhecido, mas um escrito quase igual ao certo) ou 'errado' */
  function conferirForma(card, texto) {
    const a = termosDaGramatica(texto);
    const nomes = card.familia === 'caso' ? [card.pt] : String(card.pt).split(' ').filter(p => p !== 'do');
    if (card.familia === 'caso') {
      if (a.casos.size === 1 && a.casos.has(card.pt)) return 'certo';
      if (a.casos.size) return 'errado';
    } else {
      const quer = verboEsperado(card);
      if (a.modos.size > 1 || a.tempos.size > 1) return 'errado';
      if (a.modos.size || a.tempos.size) {
        const modo = [...a.modos][0] || 'indicativo';
        const tempo = [...a.tempos][0] || null;
        const tempoOk = quer.modo === 'participio' || quer.modo === 'imperativo' || quer.modo === 'infinitivo'
          ? !tempo || !quer.tempo || tempo === quer.tempo || (!quer.tempo && tempo === 'presente')
          : (tempo || 'presente') === (quer.tempo || 'presente');
        return modo === quer.modo && tempoOk ? 'certo' : 'errado';
      }
    }
    const alvos = nomes.map(n => n.normalize('NFD').replace(/[̀-ͯ]/g, ''));
    return a.palavras.some(p => alvos.some(x => parecido(p, x, 'pt'))) ? 'quase' : 'errado';
  }

  /* A resposta não fala de gramática nenhuma: é quase certo que a pessoa respondeu outra
     pergunta (o significado, no automático). O app avisa e devolve a vez, sem contar erro. */
  function foraDaPergunta(card, texto) {
    if (!card || (card.tipo !== 'forma' && card.tipo !== 'conceito')) return false;
    const a = termosDaGramatica(texto);
    if (!a.palavras.length || a.casos.size || a.modos.size || a.tempos.size) return false;
    const todos = Object.keys(TERMOS_DE_CASO).concat(Object.keys(TERMOS_DE_MODO), Object.keys(TERMOS_DE_TEMPO),
      ['voz', 'ativa', 'passiva', 'depoente', 'absoluto']).filter(x => x.length >= 4);
    return !a.palavras.some(p => todos.some(x => p === x || parecido(p, x, 'pt')));
  }
  /* ── o card de flexão (cards/LATIM.md §3.8, pedido do Gere, 24/10/2026) ──
     A forma do texto (id, faciam, Domini) e o sentido dela em português, com a gramática dentro
     («isso», «que eu faça», «do Senhor»). A régua é outra que a das palavras: o artigo e a
     preposição são resposta («o» é eum, «a ele» é ei), então só caem o acento, a maiúscula, a
     pontuação e o parêntese que separa o sujeito do objeto («ele (sujeito)» × «o, ele
     (objeto)»), que ninguém escreve. A leitura principal («pt») é a que a múltipla escolha
     mostra; as outras («outras»: faciam também é «farei») e as «aceitas» valem igual. A crase
     e o «ó» ficam («à água», dativo, e «ó água», vocativo, não são «a água»).
     A leitura de outra forma do mesmo lema passa pela régua de «parecido», como tudo. */

  function normalizarFlexao(texto) {
    /* a crase e o «ó» ficam: «à água» é o dativo, «ó água», o vocativo, e «a água», o nominativo */
    return String(texto || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/à/g, 'aa')
      .replace(/(^|\s)ó(?=\s|$)/g, '$1oo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function leiturasDaFlexao(card) {
    /* a flexão de nome pergunta o caso, e a resposta é só ele («genitivo ou dativo singular;
       nominativo plural»); o sentido fica no campo «sentido», que o app mostra depois */
    if (card.familia === 'caso') return [normalizarFlexao(card.pt)];
    return [card.pt].concat(card.outras || [], card.aceitas || []).map(normalizarFlexao).filter(Boolean);
  }

  function conferirFlexao(card, texto) {
    const dado = normalizarFlexao(texto);
    if (!dado) return 'errado';
    const certas = leiturasDaFlexao(card);
    if (certas.includes(dado)) return 'certo';
    return certas.some(alvo => parecido(dado, alvo, 'pt')) ? 'quase' : 'errado';
  }

  function ehFlexao(id) { return TIPO[id] === 'flexao'; }
  /* a flexão de nome (substantivo, adjetivo, pronome), que pergunta o caso: LATIM.md §3.8 */
  function ehFlexaoDeCaso(id) { return !!FLEXAO_DE_CASO[id]; }

  /* ── uma terminação, um card (LATIM.md §13, D26 e D27, pedido do Gere, 29/10/2026) ──
     A flexão regular que repete uma terminação já estudada não estreia. As flexões da mesma
     «terminacao» (o build a calcula: nos nomes e adjetivos, a declinação, o final e a resposta,
     como «-ae, 1ª» → «genitivo ou dativo singular; nominativo plural»; nos verbos regulares, a
     conjugação e a análise) formam um grupo, e quem o estuda é o primeiro card dele que a
     pessoa viu: o ativo. Os outros adormecem: não estreiam, e nas frases que os pedem contam
     como o ativo. Nos nomes, o ativo mostra a cada vez uma palavra do grupo (D26,
     exemploDaTerminacao); nos verbos, a forma que dorme fica no verso, e a nota dele a explica
     (D27). De quem já tinha visto várias do grupo antes de DIA_DAS_TERMINACOES, o ativo é a
     dominada há mais tempo (sem dominada, a que estreou primeiro), e as outras adormecem com o
     estado guardado. Rede de segurança: errou depois disso uma frase que pede a forma que
     dorme, ela acorda e estreia (flexaoPuxada); e o que estreou depois disso é card próprio, de
     vez. A variante de uma forma que já tem card (*di* e *dii*, de *dei*; campo «rara», D29) não
     estreia nunca e conta como o lema. */
  const DIA_DAS_TERMINACOES = '2026-10-30';
  let TERMINACAO = Object.create(null);       // id → a chave do grupo
  let MEMBROS = Object.create(null);          // chave → ids, na ordem do baralho
  let RARA = Object.create(null);             // id → id do lema
  let FRASES_DA_FLEXAO = Object.create(null); // id → ids das frases que pedem a flexão
  let CARD_DA_FLEXAO = Object.create(null);   // id → card (o exemplo do card da terminação)

  function depoisDasTerminacoes(e) {
    return !!(e && e.estreia && String(e.estreia) >= DIA_DAS_TERMINACOES);
  }

  /* O card que estuda a terminação, ou null se nenhum do grupo apareceu ainda. */
  function ativoDaTerminacao(chave, estados) {
    const vistos = (MEMBROS[chave] || []).filter(id => estados && estados[id] && estados[id].vistas);
    if (!vistos.length) return null;
    const antigos = vistos.filter(id => !depoisDasTerminacoes(estados[id]));
    const grupo = antigos.length ? antigos : vistos;
    let melhor = null, menor = null;
    for (const id of grupo) {
      const e = estados[id];
      const k = antigos.length && e.dominadoEm ? '0' + e.dominadoEm : '1' + (e.estreia || '');
      if (menor === null || k < menor) { melhor = id; menor = k; }
    }
    return melhor;
  }

  /* Uma frase que pede a flexão foi errada depois da mudança: a forma acorda. */
  function flexaoPuxada(id, estados) {
    for (const f of FRASES_DA_FLEXAO[id] || []) {
      const e = estados && estados[f];
      if (((e && e.historico) || []).some(h => !h.acertou && String(h.em || '') >= DIA_DAS_TERMINACOES)) return true;
    }
    return false;
  }

  function adormecido(id, estados) {
    if (RARA[id]) return true;
    const chave = TERMINACAO[id];
    if (!chave) return false;
    const e = estados && estados[id];
    if (e && e.vistas) return !depoisDasTerminacoes(e) && ativoDaTerminacao(chave, estados) !== id;
    return !!ativoDaTerminacao(chave, estados) && !flexaoPuxada(id, estados);
  }

  /* Quem conta pela flexão nas frases que a pedem: ela mesma, o ativo do grupo (se ela dorme) ou,
     na variante, o lema. */
  function quemConta(id, estados) {
    if (RARA[id]) return RARA[id];
    if (!TERMINACAO[id] || !adormecido(id, estados)) return id;
    return ativoDaTerminacao(TERMINACAO[id], estados) || id;
  }

  /* O exemplo da vez no card ativo de uma terminação de nome (D26): na estreia, ele mesmo; depois,
     em rodízio, as outras formas do grupo cujo lema a pessoa já viu. O card de verbo, o que
     acordou e o que estreou como card próprio mostram só a si mesmos. */
  function exemploDaTerminacao(card, est, estados, arquivados) {
    const chave = card && TERMINACAO[card.id];
    if (!chave || !FLEXAO_DE_CASO[card.id] || ativoDaTerminacao(chave, estados) !== card.id) return card;
    const outros = (MEMBROS[chave] || []).filter(id => {
      if (id === card.id || RARA[id] || !CARD_DA_FLEXAO[id]) return false;
      const e = estados && estados[id];
      if (e && e.vistas && !adormecido(id, estados)) return false;
      const lema = CARD_DA_FLEXAO[id].lema;
      return !!(estados && estados[lema] && estados[lema].vistas) || arquivado(lema, arquivados) || transparenteTotal(lema);
    });
    const todos = [card.id].concat(outros);
    return CARD_DA_FLEXAO[todos[((est && est.vistas) || 0) % todos.length]] || card;
  }

  /* ── montagem da fila inicial ──
     Intercala os níveis e alterna palavra/frase, para medir logo de cara
     onde está o seu teto. */
  function montarFila(cards) {
    const baldes = {};
    for (const n of NIVEIS) baldes[n] = { palavra: [], frase: [] };
    /* o card de conceito do latim vai com as frases; nível fora da escala, no primeiro */
    for (const c of cards) (baldes[c.nivel] || baldes[NIVEIS[0]])[c.tipo === 'palavra' ? 'palavra' : 'frase'].push(c.id);
    for (const n of NIVEIS) {
      embaralhar(baldes[n].palavra);
      embaralhar(baldes[n].frase);
    }

    const fila = [];
    let tipo = 'palavra';
    let restam = true;
    while (restam) {
      restam = false;
      for (const n of NIVEIS) {
        const b = baldes[n];
        const preferido = b[tipo].length ? tipo : (tipo === 'palavra' ? 'frase' : 'palavra');
        if (b[preferido].length) {
          fila.push(b[preferido].shift());
          tipo = preferido === 'palavra' ? 'frase' : 'palavra';
        }
        if (b.palavra.length || b.frase.length) restam = true;
      }
    }
    return fila;
  }

  function embaralhar(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── qual nível puxar a seguir ──
     Nota de domínio por nível, de 0 a 1. A estreia do card pesa como
     evidência do que já se sabia: acerto conhecendo vale 1; acerto dizendo
     não conhecer vale 0,4, porque provavelmente foi dedução ou chute. As
     respostas seguintes valem 1 quando certas — elas não dizem o que já se
     sabia, mas dizem em que nível está custando fixar. Tudo é puxado para
     0,5 enquanto há pouca evidência, para um acerto solto não decidir nada. */
  /* Desde 09/10/2026 (PLANO.md, 7.1 a 7.4):
     — «prior», opcional, é a taxa de cada nível medida no nivelamento
       (extras.nivelamento.porNivel), e toma o lugar do 0,5 fixo naquele
       nível: o sorteio dos inéditos já começa na altura certa. Sem ele, ou
       no nível que ele não traz, vale o 0,5 de sempre;
     — a transparente total não é evidência de nada e fica fora (a presumida
       sem resposta já fica, porque não tem estado);
     — a estreia do card desafio (est.desafio) não conta: é um gostinho de
       dois níveis acima, e o erro dela não pode puxar o nível para baixo. */
  function dominioPorNivel(cards, estados, prior) {
    const g = {};
    for (const n of NIVEIS) g[n] = { pontos: 0, respostas: 0 };

    for (const c of cards) {
      const e = estados[c.id];
      if (!e || !e.vistas || !g[c.nivel]) continue;
      if (transparenteTotal(c.id) || c.leitura) continue;
      const x = g[c.nivel];

      if (e.primeiraCerta !== undefined && !e.desafio) {
        x.respostas++;
        if (e.primeiraCerta) x.pontos += (e.conhecia === 'nao' ? 0.4 : 1);
      }
      const depois = Math.max(0, e.vistas - 1);
      const certasDepois = Math.max(0, e.acertos - (e.primeiraCerta ? 1 : 0));
      x.respostas += depois;
      x.pontos += Math.min(certasDepois, depois);
    }

    const K = 4, PRIOR = 0.5;
    const saida = {};
    for (const n of NIVEIS) {
      const p = prior && typeof prior[n] === 'number' && isFinite(prior[n]) ? prior[n] : PRIOR;
      saida[n] = (g[n].pontos + K * p) / (g[n].respostas + K);
    }
    return saida;
  }

  /* Peso de cada nível na hora de sortear o próximo card inédito.
     A curva tem pico no domínio intermediário: o nível que você ainda não
     domina, mas no qual já se vira. Nível que você gabarita entedia; nível
     em que você erra quase tudo desanima. O piso garante que todos
     continuem aparecendo. */
  const ALVO = 0.62, LARGURA = 0.22, PISO = 0.15;
  function pesosDeNivel(dominio) {
    const p = {};
    for (const n of NIVEIS) {
      const d = dominio[n];
      p[n] = PISO + Math.exp(-Math.pow(d - ALVO, 2) / (2 * LARGURA * LARGURA));
    }
    return p;
  }

  /* Sorteia a ordem dos cards inéditos conforme o peso do nível,
     alternando palavra e frase quando dá.

     No baralho que tem a lista de frequência (7.9; o card de palavra traz
     «pos»), as palavras vêm na ordem da lista — a mais básica que falta
     primeiro, e depois do nivelamento isso é a partir da divisa —, e os
     outros cards (frases livres, conjugações) entram pelo sorteio de sempre,
     um a cada duas palavras. */
  function ordenarNovos(ids, pesos, porId) {
    const naLista = ids.filter(id => porId[id] && porId[id].pos > 0);
    if (naLista.length) {
      naLista.sort((a, b) => porId[a].pos - porId[b].pos);
      const dentro = new Set(naLista);
      const outros = ordenarPorPeso(ids.filter(id => !dentro.has(id)), pesos, porId);
      const ordem = [];
      let i = 0, j = 0;
      while (i < naLista.length || j < outros.length) {
        for (let k = 0; k < 2 && i < naLista.length; k++) ordem.push(naLista[i++]);
        if (j < outros.length) ordem.push(outros[j++]);
      }
      return ordem;
    }
    return ordenarPorPeso(ids, pesos, porId);
  }

  function ordenarPorPeso(ids, pesos, porId) {
    const restantes = ids.slice();
    const ordem = [];
    let tipoAnterior = null;

    while (restantes.length) {
      let total = 0;
      const peso = restantes.map(id => {
        const c = porId[id];
        let w = pesos[c.nivel] || PISO;
        if (c.tipo === tipoAnterior) w *= 0.6;
        total += w;
        return w;
      });

      let sorteio = Math.random() * total;
      let i = 0;
      while (i < restantes.length - 1 && sorteio > peso[i]) { sorteio -= peso[i]; i++; }

      const escolhido = restantes.splice(i, 1)[0];
      ordem.push(escolhido);
      tipoAnterior = porId[escolhido].tipo;
    }
    return ordem;
  }

  /* Alternativas que têm ordem natural vão nela, e não sorteadas (pedido do Gere, 09/11,
     la-g023 e la-af019-v): os números («1ª declinação», «2ª…»), com o que não tem número
     no fim, e, na análise, as palavras da frase na ordem em que aparecem nela. */
  function emOrdem(lista, card) {
    const num = x => { const m = /^(\d+)/.exec(String(x)); return m ? +m[1] : Infinity; };
    if (lista.filter(x => num(x) < Infinity).length >= 2) {
      return lista.slice().sort((x, y) => num(x) - num(y));
    }
    if (card.tipo === 'analise' && card.frase) {
      const palavras = normalizar(card.frase).split(/[^a-z0-9]+/);
      const lugar = x => palavras.indexOf(normalizar(x));
      if (lista.every(x => lugar(x) >= 0)) return lista.slice().sort((x, y) => lugar(x) - lugar(y));
    }
    return lista;
  }

  /* Alternativas da múltipla escolha: a certa mais os 4 distratores.
     «estados» é o progresso de quem responde: com ele, a frase de uso pode
     trocar distrator pronto por palavra que a pessoa já viu (ver abaixo). */
  function alternativas(card, direcao, todos, estados) {
    /* no contraste, as do conjunto, sempre as mesmas, em ordem sorteada; estão no campo da
       língua do baralho («la» e «distratoresLa», «es» e «distratoresEs»…) */
    if (card.tipo === 'contraste') {
      const c = CAMPOS[linguaDaResposta(direcao)];
      return embaralhar([card[c.certa], ...(card[c.distratores] || [])]);
    }
    /* no conceito e na forma (LATIM.md §3.5 e §3.6), as que mais se confundem com a certa: as do
       exemplo da vez, no conceito, e as do card, na forma (ver fonte/latim/cards_de_forma.py) */
    if (card.tipo === 'conceito' || card.tipo === 'forma') {
      const ex = card.tipo === 'conceito' ? exemploDoConceito(card, estados && estados[card.id], estados) : null;
      return emOrdem(embaralhar([card.pt, ...((ex && ex.distratores) || card.distratores || []).slice(0, 4)]), card);
    }
    /* na flexão, as outras formas do mesmo lema, escritas no card (LATIM.md §3.8) */
    if (card.tipo === 'flexao') return embaralhar([card.pt, ...(card.distratores || []).slice(0, 4)]);
    /* na compreensão e na herança (§13), as quatro escritas no card */
    if (card.tipo === 'compreensao' || card.tipo === 'heranca' || card.tipo === 'analise') return emOrdem(embaralhar([card.pt, ...(card.distratores || []).slice(0, 4)]), card);
    const lingua = linguaDaResposta(direcao);
    const certa = card[CAMPOS[lingua].certa];
    /* Responder na língua que o baralho ensina é produzir, e aí não há quatro
       prontos: as alternativas saem das outras formas do verbo e de cards
       vizinhos. */
    if (lingua === idiomaDoCard(card)) {
      return embaralhar([certa, ...distratoresDaLingua(card, todos || [], lingua)]);
    }
    /* Na língua de casa os quatro vêm escritos no card. Até 03/11/2026, no português, dois
       deles podiam ser trocados por palavras que a pessoa já viu (distratoresDinamicos, do
       comentário do u095); a troca não sabia se a frase continuava fazendo sentido («Preciso
       te dizer uma casa», u599), e o Gere pediu que toda alternativa tenha sentido. */
    return embaralhar([certa, ...(card[CAMPOS[lingua].distratores] || []).slice(0, 4)]);
  }

  /* ── o distrator que sai do que a pessoa já viu ──
     Na frase de uso, os quatro distratores costumam ser a mesma frase com a
     palavra principal trocada: «O estudo tem um viés evidente» contra «um
     erro», «um custo», «um objetivo», «um autor». São bons, mas são os mesmos
     para todo mundo, e nenhum deles é palavra do baralho. O Gere pediu (no
     comentário do u095) que entrassem ali, de preferência, palavras que a
     pessoa já encontrou e que possam confundi-la: quem hesita entre «el hito»
     e «el sitio» tem de achar «um lugar» ao lado de «um marco».

     Vale só quando dá para fazer sem estragar a frase:

       — o card é frase presa a uma palavra («requer»);
       — os quatro distratores trocam o MESMO trecho da resposta certa, e esse
         trecho é a tradução da palavra, sem o artigo;
       — a palavra que entra tem a mesma classe da que sai: substantivo do
         mesmo gênero e número (o artigo fica na frase, fora do trecho),
         adjetivo com a mesma terminação, verbo no infinitivo.

     E só entra quem tem por que confundir: a grafia espanhola parecida com a
     da palavra certa — «hito» e «sitio», «ladrillo» e «tornillo». O mesmo assunto
     afrouxa um pouco a régua, mas não a dispensa: a primeira versão aceitava
     o assunto sozinho, e «comida» punha «guardanapo assado» ao lado de
     «frango assado». Distrator que se descarta sem saber espanhol facilita a
     pergunta em vez de dificultar. Pelo mesmo motivo só entra palavra de um
     termo só, e o adjetivo só é tratado como adjetivo quando os distratores
     prontos confirmam a vaga: «Chegaremos logo» acaba em «-o», e os prontos
     dele («tarde», «juntos», «amanhã») mostram que ali não cabe «prolixo».

     Trocam-se no máximo DOIS dos quatro. Os prontos foram escolhidos a dedo
     para a frase, e dois deles garantem que a pergunta continue boa mesmo
     quando os dinâmicos saem fracos. Sem progresso, ou sem candidato, ficam
     os quatro prontos. */
  const ARTIGO_PT = /^(o|a|os|as|um|uma|uns|umas)\s+/i;
  const TAGS_GERAIS = new Set(['falso-amigo', 'verbo', 'substantivo', 'adjetivo',
    'gíria', 'expressão', 'Espanha', 'cotidiano']);
  const DINAMICOS_NO_MAXIMO = 2;
  const PARECIDA_MINIMA = 0.6;        // 1 − distância ÷ tamanho, no espanhol sem artigo
  const PARECIDA_NO_ASSUNTO = 0.34;   // com o mesmo assunto, um pouco menos basta

  function formasPt(card) {
    return String(card.pt || '').split('/').concat(card.aceitas || [])
      .map(t => t.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)
      .map(t => {
        const m = t.match(ARTIGO_PT);
        return { artigo: m ? m[1].toLowerCase() : '', nucleo: t.replace(ARTIGO_PT, '').trim() };
      });
  }

  function classePt(forma, card) {
    if (forma.artigo) {
      return 'n' + (/^(o|os|um|uns)$/.test(forma.artigo) ? 'm' : 'f') + (/s$/.test(forma.artigo) ? 'p' : 's');
    }
    /* «vulgar» e «familiar» também acabam em -ar: verbo é só o que o card diz
       que é, e o que parece infinitivo sem ser dito verbo fica de fora */
    if (/(ar|er|ir|ôr)(-se)?$/.test(forma.nucleo.split(' ')[0])) {
      return (card.tags || []).includes('verbo') ? 'v' : null;
    }
    /* Sem artigo pode ser advérbio ou locução: «luego → logo» acaba em «-o» e
       não é adjetivo. Como no verbo, vale o que a etiqueta do card diz. */
    if (!(card.tags || []).includes('adjetivo')) return null;
    const fim = forma.nucleo.slice(-1);
    return fim === 'o' || fim === 'a' ? 'adj' + fim : null;
  }

  /* O trecho que muda entre a resposta certa e um distrator: quantas
     palavras iguais na frente, quantas atrás, e o miolo de cada lado. */
  function trechoTrocado(certa, outra) {
    const x = certa.split(/\s+/), y = outra.split(/\s+/);
    let i = 0;
    while (i < x.length && i < y.length && x[i] === y[i]) i++;
    let j = 0;
    while (j < x.length - i && j < y.length - i && x[x.length - 1 - j] === y[y.length - 1 - j]) j++;
    return { pre: i, suf: j, daCerta: x.slice(i, x.length - j).join(' '), daOutra: y.slice(i, y.length - j).join(' ') };
  }

  const PONTO_FINAL = /[.,!?;:…]+$/;

  function distratoresDinamicos(card, todos, estados) {
    const prontos = (card.distratores || []).slice();
    if (!estados || !card.requer || prontos.length !== 4) return prontos;
    const palavra = todos.find(c => c.id === card.requer);
    if (!palavra) return prontos;

    const trechos = prontos.map(d => trechoTrocado(card.pt, d));
    if (new Set(trechos.map(t => t.pre + '|' + t.suf)).size !== 1) return prontos;
    const miolo = trechos[0].daCerta;
    const cauda = (miolo.match(PONTO_FINAL) || [''])[0];
    const semCauda = t => t.replace(PONTO_FINAL, '');
    const alvo = formasPt(palavra).find(f => f.nucleo.toLowerCase() === semCauda(miolo).toLowerCase());
    if (!alvo) return prontos;

    const classe = classePt(alvo, palavra);
    if (!classe) return prontos;
    /* a vaga de adjetivo tem de ser confirmada pelos prontos: três dos quatro
       acabam na mesma letra que a resposta certa */
    if (classe.slice(0, 3) === 'adj') {
      const fim = classe.slice(3);
      if (trechos.filter(t => semCauda(t.daOutra).slice(-1) === fim).length < 3) return prontos;
    }
    const ensinada = idiomaDoCard(palavra);
    const artigoDela = ensinada === 'es' ? ARTIGOS_ES : (ARTIGO_DA_LINGUA[ensinada] || ARTIGOS_ES);
    const semArtigoEs = t => semAcento(String(t || '').trim().toLowerCase().replace(artigoDela, ''));
    const alvoEs = semArtigoEs(palavra[ensinada]);
    const assuntos = (palavra.tags || []).filter(t => !TAGS_GERAIS.has(t));
    const traducoes = c => formasPt(c).map(f => normalizar(f.nucleo, 'pt')).filter(Boolean);
    const daPalavra = new Set(traducoes(palavra));
    const jaNaTela = new Set(trechos.map(t => normalizar(semCauda(t.daOutra), 'pt')));
    const certas = new Set(respostasAceitas(card, IDA));
    const maiuscula = /^[A-ZÀ-Ý]/.test(miolo);
    const montar = nucleo => {
      const x = card.pt.split(/\s+/);
      const texto = maiuscula ? nucleo[0].toUpperCase() + nucleo.slice(1) : nucleo;
      return x.slice(0, trechos[0].pre).concat(texto + cauda, x.slice(x.length - trechos[0].suf)).join(' ');
    };

    const candidatos = [];
    todos.forEach(c => {
      const e = estados[c.id];
      if (c.tipo !== 'palavra' || c.id === palavra.id || !e || !e.vistas) return;
      const forma = formasPt(c)[0];
      if (!forma || forma.nucleo.includes(' ') || classePt(forma, c) !== classe) return;
      const chave = normalizar(forma.nucleo, 'pt');
      if (!chave || jaNaTela.has(chave) || traducoes(c).some(t => daPalavra.has(t))) return;

      const es = semArtigoEs(c[ensinada]);
      const parecida = 1 - distancia(es, alvoEs) / Math.max(es.length, alvoEs.length, 1);
      const mesmoAssunto = (c.tags || []).some(t => assuntos.includes(t));
      if (parecida < (mesmoAssunto ? PARECIDA_NO_ASSUNTO : PARECIDA_MINIMA)) return;

      const nota = 3 * parecida + (es[0] === alvoEs[0] ? 0.5 : 0) + (mesmoAssunto ? 1 : 0) +
        (e.erros ? 0.5 : 0) + (c.nivel === palavra.nivel ? 0.3 : 0) + Math.random() * 0.6;
      const frase = montar(forma.nucleo);
      if (certas.has(normalizar(frase, 'pt'))) return;
      candidatos.push({ frase: frase, chave: chave, nota: nota });
    });
    if (!candidatos.length) return prontos;

    candidatos.sort((a, b) => b.nota - a.nota);
    const entram = [];
    for (const c of candidatos.slice(0, 6)) {          // sorteio entre os melhores, para variar
      if (entram.length < DINAMICOS_NO_MAXIMO && !entram.some(x => x.chave === c.chave) &&
          (entram.length === 0 || Math.random() < 0.7)) entram.push(c);
    }
    const saem = embaralhar([0, 1, 2, 3]).slice(0, entram.length);
    entram.forEach((c, i) => { prontos[saem[i]] = c.frase; });
    return prontos;
  }

  /* ── produzir, e não reconhecer ──
     Quando a resposta é na língua que o baralho ensina, ele não traz quatro
     distratores prontos: eles saem de outros cards. Não é sorteio cego —
     prefere os que têm chance de confundir de verdade: mesmo tema, mesmo
     nível, tamanho e começo parecidos, que é o que faz a alternativa doer.

     O card de conjugação é exceção: ele já lista em «formasEs» (ou «formasEn»,
     conforme o baralho) a mesma frase nos outros tempos — «Ayer lo sabía»,
     «Ayer lo sabré» —, que é o espelho dos distratores prontos do português.
     Sem elas, «Ayer lo supe» aparecia entre «Yo puse la mesa» e «No lo hagas»,
     sozinha no assunto, e a pergunta se respondia sem saber o verbo. As formas
     entram primeiro; o sorteio só completa o que faltar (há cards com três). */
  const AUDIENCIA_PRINCIPAL = { es: 'pt', en: 'pt', pt: 'es', fr: 'pt', la: 'pt', it: 'pt', pc: 'pt' };

  /* As palavras de uma frase, já no funil, para medir o que duas frases têm
     em comum. */
  const cachePalavras = new Map();
  function palavrasDe(txt, lingua) {
    const chave = lingua + '|' + txt;
    let conj = cachePalavras.get(chave);
    if (!conj) {
      conj = new Set(normalizar(txt, lingua).split(' ').filter(Boolean));
      cachePalavras.set(chave, conj);
    }
    return conj;
  }

  /* ── a mesma frase, com outra palavra ──
     Na volta, as alternativas erradas de uma frase eram outras frases do
     baralho, e frase inteira diferente se descarta de longe: «¿Cuánto se
     tarda en llegar?» ao lado de «Deja la propina en la mesa» não pergunta
     nada (comentário do f167: «os distratores têm que ser mais sutis»).

     A frase de uso tem como ser sutil sem ninguém escrever nada: ela existe
     por causa de UMA palavra, e essa palavra está nela. Trocada por outra
     palavra do baralho, da mesma classe e do mesmo gênero, a frase fica
     igual em tudo menos no que o card cobra — «No hay sitio para aparcar»
     contra «No hay atasco para aparcar» e «No hay billete para aparcar».

     Só entra a palavra que cabe: substantivo com o mesmo artigo (o artigo
     fica na frase), adjetivo por adjetivo com a mesma terminação, verbo por
     verbo quando a frase traz o infinitivo. E nunca a que também estaria
     certa — o sinônimo, a variante de outro lugar, a que divide uma tradução
     com a palavra do card. Quando a palavra não aparece na frase tal como
     está no card (verbo conjugado, plural), não há troca, e valem as frases
     vizinhas, como antes. */
  const ARTIGO_DA_LINGUA = { es: /^(el|la|los|las)\s+/i, en: /^(the)\s+/i, pt: /^(o|a|os|as)\s+/i, fr: /^(le\s+|la\s+|les\s+|l['’])/i,
    it: /^(il\s+|lo\s+|la\s+|i\s+|gli\s+|le\s+|l['’])/i, pc: /^(o|a|os|as)\s+/i };
  const cacheTraducoes = new Map();
  const LETRA_U = '\\p{L}';
  function trocasDePalavra(card, todos, lingua, certas) {
    if (!card.requer || card.tipo !== 'frase') return [];
    const campo = CAMPOS[lingua];
    const palavra = todos.find(c => c.id === card.requer);
    if (!palavra) return [];
    const artigoRe = ARTIGO_DA_LINGUA[lingua] || /^$/;
    const partes = t => { const m = String(t).match(artigoRe); return { artigo: m ? m[1].trim().toLowerCase() : '', nucleo: String(t).replace(artigoRe, '').trim() }; };
    const minha = partes(palavra[campo.certa] || '');
    if (!minha.nucleo) return [];
    const frase = String(card[campo.certa] || '');
    const escapado = minha.nucleo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const onde = new RegExp('(^|[^' + LETRA_U + '])(' + escapado + ')(?![' + LETRA_U + '])', 'iu').exec(frase);
    if (!onde) return [];
    const ini = onde.index + onde[1].length, fim = ini + onde[2].length;
    const maiuscula = /^\p{Lu}/u.test(onde[2]);

    const classe = c => ((c.tags || []).includes('verbo') ? 'verbo' : (c.tags || []).includes('adjetivo') ? 'adjetivo' : '');
    const casa = CAMPOS[AUDIENCIA_PRINCIPAL[lingua] || 'pt'];
    /* as traduções de cada palavra, guardadas: refazê-las a cada sorteio
       custava 70 ms por pergunta */
    const traducoes = c => {
      const chave = lingua + '|' + c.id;
      let t = cacheTraducoes.get(chave);
      if (!t) {
        t = String(c[casa.certa] || '').split('/').concat(c[casa.aceitas] || [])
          .map(x => normalizar(x, AUDIENCIA_PRINCIPAL[lingua] || 'pt')).filter(Boolean);
        cacheTraducoes.set(chave, t);
      }
      return t;
    };
    const minhas = new Set(traducoes(palavra));
    const proibidas = new Set([palavra[campo.certa]].concat(palavra[campo.aceitas] || [],
      palavra[campo.sinonimos] || [], Object.keys(palavra[campo.regionais] || {})).map(t => normalizar(t, lingua)));
    const tags = new Set((palavra.tags || []).filter(t => !TAGS_GERAIS.has(t)));
    const final = t => t.slice(-1).toLowerCase();

    const saida = [];
    const vistos = new Set();
    const candidatas = todos
      .filter(c => c.tipo === 'palavra' && c.id !== palavra.id && c[campo.certa])
      .map(c => ({ c, p: partes(c[campo.certa]) }))
      .filter(x => x.p.nucleo && x.p.artigo === minha.artigo &&
        (minha.artigo ? true : classe(x.c) === classe(palavra) && classe(palavra) &&
          (classe(palavra) !== 'adjetivo' || final(x.p.nucleo) === final(minha.nucleo))) &&
        !x.p.nucleo.includes(' ') === !minha.nucleo.includes(' ') &&
        !proibidas.has(normalizar(x.c[campo.certa], lingua)) &&
        !traducoes(x.c).some(t => minhas.has(t)))
      .map(x => {
        let nota = Math.random() * 2;
        if (x.c.nivel === palavra.nivel) nota += 1;
        if ((x.c.tags || []).some(t => tags.has(t))) nota += 2;
        const maior = Math.max(x.p.nucleo.length, minha.nucleo.length);
        nota += 2 * (1 - distancia(semAcento(x.p.nucleo), semAcento(minha.nucleo)) / maior);
        return { x, nota };
      })
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 12);
    for (const { x } of embaralhar(candidatas)) {
      const nucleo = maiuscula ? x.p.nucleo[0].toUpperCase() + x.p.nucleo.slice(1) : x.p.nucleo;
      const nova = frase.slice(0, ini) + nucleo + frase.slice(fim);
      const n = normalizar(nova, lingua);
      if (certas.has(n) || vistos.has(n)) continue;
      vistos.add(n);
      saida.push(nova);
      if (saida.length === 4) break;
    }
    return saida;
  }

  function distratoresDaLingua(card, todos, lingua) {
    const campo = CAMPOS[lingua];
    const prontos = card[campo.distratores];
    if (Array.isArray(prontos) && prontos.length >= 4) {
      return embaralhar(prontos.slice()).slice(0, 4);
    }

    const tags = new Set(card.tags || []);
    const formas = formasComoFrase(card, lingua);
    if (formas.length >= 4) return embaralhar(formas).slice(0, 4);

    /* A direção não importa aqui, só a língua da resposta. */
    const direcao = (lingua === 'pt' ? 'es' : 'pt') + '-' + lingua;

    /* Alternativa errada não pode ser resposta certa. Fica de fora o texto que
       o card aceita (o «es» e as aceitasEs) e o card que divide uma tradução
       com este: «quisquilloso» e «remilgado» são os dois «melindroso», e
       «Échame una mano» e «¿Me puedes echar una mano?» são os dois «me dá uma
       mão» — um não serve de pegadinha para o outro. A comparação é feita na
       língua de casa do baralho. */
    const casa = CAMPOS[AUDIENCIA_PRINCIPAL[lingua] || 'pt'];
    /* o sinônimo que o card não ensina também é espanhol certo: «trabajar»
       não pode ser a alternativa errada de «currar» */
    const certas = new Set(respostasAceitas(card, direcao)
      .concat((card[campo.sinonimos] || []).map(s => normalizar(s, lingua))));
    /* guardadas por card: é uma conta sobre o baralho inteiro a cada pergunta.
       O card da vez fica fora da guarda — ele pode vir numa das duas formas
       de gênero, e a guarda é pelo id. */
    const traducoes = c => {
      const chave = 'f|' + lingua + '|' + c.id;
      let t = c === card ? null : cacheTraducoes.get(chave);
      if (!t) {
        t = [String(c[casa.certa] || '')]
          .concat(String(c[casa.certa] || '').split('/'), c[casa.aceitas] || [])
          .map(x => normalizar(x, AUDIENCIA_PRINCIPAL[lingua] || 'pt')).filter(Boolean);
        if (c !== card) cacheTraducoes.set(chave, t);
      }
      return t;
    };
    const minhas = new Set(traducoes(card));
    /* nem repetir forma que já entrou: «Ojalá viniera mañana» é forma do v034
       e é também a frase de outro card */
    const jaNaTela = new Set(formas.map(f => normalizar(f, lingua)));
    const texto = c => String(c[campo.certa] || '');

    const candidatos = todos
      .filter(c => c.id !== card.id && c.tipo === card.tipo && texto(c) &&
        !certas.has(normalizar(texto(c), lingua)) && !jaNaTela.has(normalizar(texto(c), lingua)) &&
        !traducoes(c).some(t => minhas.has(t)))
      .map(c => {
        let nota = Math.random();
        if (c.nivel === card.nivel) nota += 2;
        if ((c.tags || []).some(t => tags.has(t))) nota += 2.5;
        nota += 1.5 * Math.min(texto(c).length, texto(card).length) /
          Math.max(texto(c).length, texto(card).length);
        if (texto(c)[0].toLowerCase() === texto(card)[0].toLowerCase()) nota += 1;
        /* Numa frase, o que pesa mais é parecer com a certa: as mesmas
           palavras, a mesma armação. Sorteada só por nível e tema, a
           alternativa saía tão diferente que bastava bater o olho (f167). */
        if (card.tipo === 'frase') {
          const minhasPalavras = palavrasDe(texto(card), lingua);
          const comuns = [...palavrasDe(texto(c), lingua)].filter(p => minhasPalavras.has(p)).length;
          nota += 3 * Math.min(3, comuns);
        }
        return { c, nota };
      })
      .sort((a, b) => b.nota - a.nota)
      .slice(0, card.tipo === 'frase' ? 7 : 10);

    /* Na frase de uso, antes das frases vizinhas vinham as trocas de palavra
       (trocasDePalavra). Desligadas em 03/11/2026, como os distratores dinâmicos: a troca
       fazia frase sem sentido, e toda alternativa tem de ter um (pedido do Gere). */
    const trocas = [];
    const faltam = 4 - formas.length - trocas.length;
    return formas.concat(trocas,
      embaralhar(candidatos).slice(0, Math.max(0, faltam)).map(x => texto(x.c)));
  }

  /* As formas vêm sem pontuação («Viene aquí»), e a resposta certa vem com
     («¡Ven aquí!»): nua, a alternativa errada se denunciaria pela cara. Cada
     forma ganha a abertura e o fecho da resposta certa. */
  function formasComoFrase(card, lingua) {
    const campo = CAMPOS[lingua || 'es'];
    const texto = String(card[campo.certa] || '');
    const abre = (texto.match(/^[¿¡]+/) || [''])[0];
    const fecha = (texto.match(/[.!?…]+$/) || [''])[0];
    const direcao = (lingua === 'pt' ? 'es' : 'pt') + '-' + (lingua || 'es');
    const certas = new Set(respostasAceitas(card, direcao));
    const vistas = new Set();
    return Object.keys(card[campo.formas] || {})
      .filter(f => {
        const chave = normalizar(f, lingua || 'es');
        if (!chave || certas.has(chave) || vistas.has(chave)) return false;
        vistas.add(chave);
        return true;
      })
      .map(f => (/^[¿¡]/.test(f) ? '' : abre) + f + (/[.!?…]$/.test(f) ? '' : fecha));
  }

  /* ════════════════ o começo do app sem tédio ════════════════
     PLANO.md, seção 7 (decidido em 09/10/2026), e o manual, seção 19. Quatro
     peças, aqui como funções puras ou de estado pequeno e serializável, para
     as telas só chamarem:

       7.1 a palavra transparente  — o build calcula, curso a curso, «transp»
           ('total' | 'parecida') e põe no card do pacote; o motor só lê;
       7.2 o dominado provisório   — o que o nivelamento presume fica em
           extras.nivelamento.presumidos { id: voltaEmISO }, sem estado;
       7.3 o nivelamento           — a escada de blocos e a dedução
           (Motor.nivelamento);
       7.4 o card desafio          — quem, quando e de que nível.

     ── como o app entrega o que é de cada um ──
     O motor já guarda o baralho da vez (usarBaralho). Do mesmo jeito, e sem
     mexer na assinatura de nenhuma função que já existia, ele guarda:

       usarTransparencias(cards)  o «transp» de cada card do curso — uma vez,
                                  na abertura do curso;
       usarExtras({ nivelamento, reativados })
                                  o que é da pessoa e muda o jogo: os
                                  presumidos (e o dia do nivelamento) e os
                                  reativados («estudar mesmo assim», id → ISO).
                                  O app chama de novo sempre que os extras
                                  mudam (é a primeira coisa do conciliarFila).

     Foi a opção menos invasiva: sabidaEm, liberadaEm, dominadosNoTotal,
     situacaoDaFrase e dominioPorNivel são chamadas em dezenas de lugares com
     (id, estados, arquivados), e um argumento a mais em cada uma espalharia
     a mudança pelo app inteiro. Sem as duas chamadas tudo funciona como
     antes — é o caso do build, do varrer-motor e das ferramentas. */

  /* ── o tema ──
     A primeira etiqueta que não é de classe nem de comportamento. É por ele
     que o nivelamento acha os pontos cegos (um bloco = uma carta de cada
     tema), e é ele que o build cobra de toda palavra. A lista é uma só para
     o build e para o app: o build a lê daqui (Motor.TAGS_DE_CLASSE).

     Os verbos que dão nome às etiquetas da conjugação («hacer», «be»… — em
     fonte/tags.json, os que mapeiam para si mesmos nas duas línguas) também
     não são tema. O build avisa quando aparece um novo fora desta lista. */
  const TAGS_DE_CLASSE = new Set([
    'substantivo', 'verbo', 'adjetivo', 'advérbio', 'gramática', 'pronomes', 'preposição',
    'falso-amigo', 'gíria', 'expressão', 'provérbio', 'Espanha', 'formal', 'primeiros passos',
    'conjugação', 'regular', 'irregular', 'phrasal verb', 'present perfect',
    'presente', 'pretérito', 'pretérito perfeito', 'mais-que-perfeito', 'imperfeito', 'futuro',
    'condicional', 'condicional composto', 'subjuntivo', 'imperativo', 'gerúndio'
  ].concat((
    'abrir agradecer andar caber caer comer conducir conocer contar dar decir doler dormir elegir ' +
    'empezar encantar escribir estar gustar haber hablar hacer huir ir jugar leer llamar llover ' +
    'morir oler oír pedir perder poder poner querer reír romper saber salir seguir sentarse sentir ' +
    'ser tener traer venir ver vestirse vivir volver ' +
    'arise ask awake be become begin bend bite bleed blow break breed bring build burn buy call ' +
    'catch choose cling come creep cut deal dig do draw dream drink drive eat fall feed feel fight ' +
    'find flee fly forbid forget forgive freeze get give go grind grow hang have hear hide hold ' +
    'interview keep kneel know lay lead lean leap learn leave lend lie light like live lose make ' +
    'mean meet mislead mistake misunderstand outgrow overcome oversee oversleep overtake paint pay ' +
    'put rain read rewrite ride ring rise run say see seek sell send sew shake shine shoot shrink ' +
    'sing sink sit sleep slide smell speak speed spell spend spin spit stand start steal stick ' +
    'sting stink strike swear sweep swell swim swing take teach tear tell think throw travel ' +
    'undergo understand undertake wait wake walk watch wear weave weep win wind withdraw ' +
    'withstand work worry write').split(' ')));

  /* O tema do card, ou null — a palavra sem tema cai no «geral» do plano, e
     some da conta: não entra no banco do teste nem na dedução. */
  function temaDe(card) {
    const t = ((card && card.tags) || []).find(x => !TAGS_DE_CLASSE.has(x));
    return t || null;
  }

  /* As etiquetas que tiram o card da dedução do nivelamento (falso amigo
     presumido como sabido seria o pior erro possível), e as que escolhem o
     card desafio. */
  const TAGS_FORA_DA_DEDUCAO = ['falso-amigo', 'expressão', 'gíria', 'provérbio', 'conjugação'];
  const TAGS_DO_DESAFIO = ['falso-amigo', 'expressão', 'gíria', 'provérbio'];
  const TAG_PRIMEIROS_PASSOS = 'primeiros passos';
  const temTag = (card, lista) => ((card && card.tags) || []).some(t => lista.indexOf(t) >= 0);

  /* ── o que o app entregou ── */
  let TRANSP = Object.create(null);       // id → 'total' | 'parecida', do pacote do curso
  let PRESUMIDOS = Object.create(null);   // id → voltaEm ISO (extras.nivelamento.presumidos)
  let PRESUMIDOS_EM = 0;                  // o dia do nivelamento, em ms (0 se não se sabe)
  let REATIVADOS = Object.create(null);   // id → ISO: «estudar mesmo assim»
  /* o nivelamento pela lista (7.9) */
  let POS = Object.create(null);          // id → posição na lista de frequência (card.pos, do pacote)
  let TIPO = Object.create(null);         // id → tipo do card
  let DO_VERSO = Object.create(null);     // id da compreensão sobre um trecho de texto → true
  let FLEXAO_DE_CASO = Object.create(null); // id → true: a flexão de nome, que pergunta o caso
  let FALSO_AMIGO = Object.create(null);  // id → true
  /* a forma de um lugar com irmã de outro (manual §5.4): saber uma não diz que se sabe a outra, e
     por isso nenhuma das duas nasce presumida pela divisa da lista */
  let COM_IRMA = Object.create(null);     // id → true
  let DIVISA = 0;                         // nivelamento.divisa (0: sem nivelamento pela lista)
  let FORA_DA_DIVISA = Object.create(null); // nivelamento.fora: antes da divisa, mas não presumidos
  let UID = '';                           // para a data do presumido pela divisa
  let LEITURA = Object.create(null);      // id → true: card de leitura (PLANO.md, 9.2)
  let ESCOLHER = Object.create(null);     // id → true: card que só se escolhe («escolher», RARAS.md §3)

  function usarTransparencias(cards) {
    usarVocabulario(cards);
    TRANSP = Object.create(null);
    POS = Object.create(null);
    TIPO = Object.create(null);
    DO_VERSO = Object.create(null);
    FLEXAO_DE_CASO = Object.create(null);
    FALSO_AMIGO = Object.create(null);
    COM_IRMA = Object.create(null);
    LEITURA = Object.create(null);
    ESCOLHER = Object.create(null);
    RESPOSTA_DA_FORMA = Object.create(null);
    TERMINACAO = Object.create(null);
    MEMBROS = Object.create(null);
    RARA = Object.create(null);
    FRASES_DA_FLEXAO = Object.create(null);
    CARD_DA_FLEXAO = Object.create(null);
    (cards || []).forEach(c => {
      if (!c) return;
      if (c.leitura) LEITURA[c.id] = true;
      if (c.escolher) ESCOLHER[c.id] = true;
      if (c.tipo === 'forma') RESPOSTA_DA_FORMA[c.id] = c.pt;
      /* uma terminação, um card (LATIM.md §13): os grupos, a variante e as frases de cada flexão */
      if (c.tipo === 'flexao') {
        CARD_DA_FLEXAO[c.id] = c;
        if (c.rara) RARA[c.id] = c.lema;
        else if (c.terminacao) {
          TERMINACAO[c.id] = c.terminacao;
          (MEMBROS[c.terminacao] || (MEMBROS[c.terminacao] = [])).push(c.id);
        }
      }
      if (c.tipo === 'frase') requeridas(c).forEach(r => (FRASES_DA_FLEXAO[r] || (FRASES_DA_FLEXAO[r] = [])).push(c.id));
      if (c.tipo === 'flexao' && c.familia === 'caso') FLEXAO_DE_CASO[c.id] = true;
      /* no card de leitura, a «parecida» conta como total: ler é de graça, e
         ele não tem a volta, que é onde a parecida estrearia */
      if (c.transp === 'total' || c.transp === 'parecida') TRANSP[c.id] = (c.leitura || soIda()) ? 'total' : c.transp;
      if (c.pos > 0) POS[c.id] = c.pos;
      TIPO[c.id] = c.tipo;
      if (c.tipo === 'compreensao' && /^la-t/.test(c.de || '')) DO_VERSO[c.id] = true;
      if (temTag(c, ['falso-amigo'])) FALSO_AMIGO[c.id] = true;
      if (Array.isArray(c.irmaos) && c.irmaos.length) COM_IRMA[c.id] = true;
    });
  }

  /* Aceita os extras como o app os guarda ({ nivelamento, reativados }) ou
     os presumidos soltos ({ presumidos, reativados }). Sem nada, zera. */
  function usarExtras(x) {
    x = x || {};
    const niv = (x.nivelamento && typeof x.nivelamento === 'object') ? x.nivelamento : {};
    PRESUMIDOS = Object.assign(Object.create(null), x.presumidos || niv.presumidos || {});
    PRESUMIDOS_EM = Date.parse(niv.feitoEm) || 0;
    REATIVADOS = Object.assign(Object.create(null), x.reativados || {});
    DIVISA = niv.versao === 2 && niv.divisa > 0 ? niv.divisa : 0;
    FORA_DA_DIVISA = Object.create(null);
    (Array.isArray(niv.fora) ? niv.fora : []).forEach(id => { FORA_DA_DIVISA[id] = true; });
    UID = x.uid || '';
  }

  function reativado(id) { return !!REATIVADOS[id]; }

  /* O card de leitura (PLANO.md, 9.2): a palavra rara que só entra para quem
     escolheu um texto que a pede. Só tem a primeira fase — a palavra na língua
     ensinada, a resposta na língua de quem estuda —, fica dominado ao fim dela
     e é revisto nessa mesma direção. */
  function ehLeitura(id) { return !!LEITURA[id]; }

  /* O grau do card NESTE curso, já com o «estudar mesmo assim»: o card
     reativado volta a ser card comum. Aceita o card (lê o «transp» dele) ou
     o id (lê o que o app entregou em usarTransparencias). */
  function transparencia(cardOuId) {
    const card = cardOuId && typeof cardOuId === 'object' ? cardOuId : null;
    const id = card ? card.id : cardOuId;
    if (reativado(id)) return null;
    let g = (card && card.transp) || TRANSP[id];
    if (g === 'parecida' && (soIda() || (card && card.leitura) || LEITURA[id])) g = 'total';
    return g === 'total' || g === 'parecida' ? g : null;
  }

  function transparenteTotal(id) { return !reativado(id) && TRANSP[id] === 'total'; }

  /* A data de volta do card presumido que ainda não foi respondido, ou null.
     Respondido (tem estado de verdade), ele é card como os outros; e a
     transparente total não precisa de confirmação nenhuma. */
  function presumidoEm(id, estados) {
    const v = PRESUMIDOS[id] || (pelaDivisa(id) ? dataDoPresumido(UID, id, PRESUMIDOS_EM) : null);
    if (!v || transparenteTotal(id)) return null;
    const e = estados && estados[id];
    if (e && e.vistas) return null;
    return String(v);
  }

  /* Conta como sabida sem nunca ter sido respondida: não estreia como card
     novo, e a frase que precisa dela não espera por ela. */
  function conhecidaSemEstado(id, estados) {
    return transparenteTotal(id) || !!presumidoEm(id, estados);
  }

  /* ── a estreia do card ──
     estadoInicial(id) continua como sempre; este é o que o app usa quando
     tem o card na mão. A transparente «parecida» pula a ida: reconhecer é de
     graça, escrever é a lição, e ela estreia direto na volta
     (inversa-multipla). */
  function estadoInicialDo(card) {
    const est = estadoInicial(card && card.id);
    /* o card de forma é só por escrito (LATIM.md §3.6) */
    if (card && card.tipo === 'forma') est.etapa = 'escrita';
    if (transparencia(card) === 'parecida') est.etapa = 'inversa-multipla';
    /* 7.9: a frase cujas palavras o nivelamento pela lista já deu como
       conhecidas estreia na volta; a de primeiros passos, quando a divisa
       passou da posição PRIMEIROS_PASSOS_NA_VOLTA */
    if (DIVISA && card && card.tipo === 'frase') {
      const req = requeridas(card);
      if (req.length ? req.every(conhecidaPeloNivelamento)
                     : temTag(card, [TAG_PRIMEIROS_PASSOS]) && DIVISA > PRIMEIROS_PASSOS_NA_VOLTA) {
        est.etapa = 'inversa-multipla';
      }
    }
    return est;
  }

  /* ── o dominado provisório ──
     Para a fila, o presumido sem estado é um dominado com data de volta: o
     app o põe na fila dos dominados e o serve como revisão de dominado
     (volta, escrita), com o espaçamento que os dominados já têm. Este é o
     estado que ele mostra à fila — calculado, NUNCA gravado: o estado só
     nasce de resposta de verdade (responderPresumido). */
  const DEGRAU_DO_PRESUMIDO = ESCADAS.vivas.dias.indexOf(90);   // 4: o degrau de três meses (só nas vivas)
  function degrauDoPresumido() {
    const p = ESCADAS[ESCADA].presumido;
    return p == null ? DEGRAU_DO_PRESUMIDO : ESCADAS[ESCADA].dias.indexOf(p);
  }

  function estadoDoPresumido(id, estados) {
    const volta = presumidoEm(id, estados);
    if (!volta) return null;
    return Object.assign(estadoInicial(id), { etapa: 'dominado', voltaEm: volta, presumido: true });
  }

  /* A resposta à revisão do presumido. Acertou: nasce o estado «dominado»
     no degrau de três meses — revisoes = 4, então a próxima volta é em 90
     dias (proximaVolta) e um erro lá na frente desce para um mês, como em
     qualquer dominado. Errou: nasce o estado comum, do zero (multipla), com
     esta resposta registrada como um erro normal, e o card segue o caminho
     de todos. Devolve o estado novo, para o app guardar em progresso.cards. */
  function responderPresumido(id, r) {
    const est = estadoInicial(id);
    est.confirmacao = true;     // a resposta de quem já era presumido: evidência forte (evidenciasDaDivisa)
    if (r && r.acertou) {
      est.etapa = 'dominado';
      registrar(est, r);
      est.revisoes = degrauDoPresumido();
      est.voltaEm = proximaVolta(est.revisoes, est.ultima);
      est.dominadoEm = est.ultima;
    } else {
      registrar(est, Object.assign({}, r, { acertou: false }));
      est.etapa = 'multipla';
      est.revisoes = 0;
      est.voltaEm = null;
    }
    return est;
  }

  /* A data da primeira volta do presumido: entre 7 e 60 dias depois do
     nivelamento, espalhada por um hash de usuário + card — estável em
     qualquer aparelho, para os presumidos não vencerem em lote. */
  const PRESUMIDO_DIAS_MIN = 7, PRESUMIDO_DIAS_MAX = 60;

  function hashDeTexto(s) {                 // FNV-1a de 32 bits
    let h = 0x811c9dc5;
    s = String(s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function dataDoPresumido(uid, id, feitoEm) {
    const base = feitoEm instanceof Date ? feitoEm.getTime()
      : typeof feitoEm === 'number' ? feitoEm : Date.parse(feitoEm);
    const t0 = isFinite(base) ? base : Date.now();
    const dias = PRESUMIDO_DIAS_MIN +
      hashDeTexto(String(uid) + '|' + String(id)) % (PRESUMIDO_DIAS_MAX - PRESUMIDO_DIAS_MIN + 1);
    return new Date(t0 + dias * 864e5).toISOString();
  }

  /* ── o nivelamento (7.3) ──
     O teste é um objeto simples e serializável — dá para guardar no meio e
     retomar —, e o acaso dele também: um gerador com a semente dentro do
     próprio objeto (opcoes.semente fixa o sorteio, para os testes).

       const t = Motor.nivelamento.novo(cards, { comeco: 'pouco' });
       let c;
       while ((c = Motor.nivelamento.proximaCarta(t))) {
         if (c.conferir) Motor.nivelamento.conferir(t, c.id, acertouAMultipla);
         else Motor.nivelamento.responder(t, c.id, jaConheco);
       }
       const r = Motor.nivelamento.deduzir(t, cards, { uid, agora });

     A escada: começa em A1 («um pouco») ou A2 («bastante»), pulando o nível
     que o banco não tem. Bloco = 6 palavras do nível, cada uma de um tema
     (rodízio pelos temas). 5 ou 6 conhecidas sobem; 2 ou menos param; 3 ou 4
     pedem mais um bloco no mesmo nível, que sobe se as 12 somarem 9 ou mais.
     Teto de 40 cartas. A conferência: 1 em cada 4 «Já conheço» vira na hora
     uma múltipla escolha, e pelo menos uma por bloco — se o bloco acabar sem
     nenhuma, uma das «Já conheço» dele é conferida antes de o bloco contar. */
  const BLOCO_DO_TESTE = 6, TETO_DO_TESTE = 40, CONFERE_UM_EM = 4;
  const FORCA_DO_NIVEL = 4, LIMIAR_PRESUMIR = 0.9;

  /* O banco do teste: palavras com tema, sem transparente total e sem as
     etiquetas que a dedução deixa de fora (falso amigo, expressão, gíria…;
     até 10/11/2026 só o falso amigo, e o «Já conheço» de «la liebre» se
     perdia), por nível e por tema: { A1: { casa: [ids], … }, … }. */
  function bancoDoTeste(cards) {
    const banco = {};
    (cards || []).forEach(c => {
      if (!c || c.tipo !== 'palavra' || NIVEIS.indexOf(c.nivel) < 0) return;
      if (transparencia(c) === 'total' || temTag(c, TAGS_FORA_DA_DEDUCAO)) return;
      const tema = temaDe(c);
      if (!tema) return;
      const n = banco[c.nivel] || (banco[c.nivel] = {});
      (n[tema] || (n[tema] = [])).push(c.id);
    });
    return banco;
  }

  /* mulberry32, com o estado no próprio teste */
  function sortearNoTeste(teste) {
    let t = (teste.semente = (teste.semente + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function novoTeste(cards, opcoes) {
    const o = opcoes || {};
    const comeco = ['nunca', 'pouco', 'bastante'].indexOf(o.comeco) >= 0 ? o.comeco : 'pouco';
    const banco = bancoDoTeste(cards);
    const niveis = NIVEIS.filter(n => banco[n]);
    const desde = NIVEIS.indexOf(comeco === 'bastante' ? 'A2' : 'A1');
    const nivel = niveis.find(n => NIVEIS.indexOf(n) >= desde) || null;
    return {
      versao: 1, comeco: comeco, pulou: comeco === 'nunca',
      semente: typeof o.semente === 'number' ? o.semente >>> 0 : Math.floor(Math.random() * 4294967296),
      banco: banco, niveis: niveis, nivel: nivel,
      bloco: null,                        // { nivel, ids, temas: { id: tema } }
      noNivel: { blocos: 0, cartas: 0, conhecidas: 0 },
      rodizio: {},                        // nivel → { temas: [...], i }
      cartas: [],                         // { id, nivel, tema, resposta, conferida?, acertou? }
      pendente: null,                     // id da carta que espera a conferência
      fim: comeco === 'nunca' || !nivel
    };
  }

  /* A carta conta como conhecida: «Já conheço», e não reprovada na
     conferência. */
  function cartaConhecida(c) {
    return c.resposta === 'conheco' && !(c.conferida && c.acertou === false);
  }

  function montarBloco(teste) {
    const n = teste.nivel;
    const doNivel = (teste.banco && teste.banco[n]) || {};
    let r = teste.rodizio[n];
    if (!r) {
      const temas = Object.keys(doNivel).sort();
      for (let i = temas.length - 1; i > 0; i--) {
        const j = Math.floor(sortearNoTeste(teste) * (i + 1));
        const x = temas[i]; temas[i] = temas[j]; temas[j] = x;
      }
      r = teste.rodizio[n] = { temas: temas, i: 0 };
    }
    const usados = new Set(teste.cartas.map(c => c.id));
    const tamanho = Math.min(BLOCO_DO_TESTE, TETO_DO_TESTE - teste.cartas.length);
    const ids = [], temas = {};
    /* uma volta pelo rodízio dá uma palavra de cada tema; só repete tema se
       o nível tiver menos temas do que cartas no bloco */
    while (ids.length < tamanho && r.temas.length) {
      let achou = false;
      for (let k = 0; k < r.temas.length && ids.length < tamanho; k++) {
        const tema = r.temas[r.i];
        r.i = (r.i + 1) % r.temas.length;
        const livres = doNivel[tema].filter(id => !usados.has(id) && ids.indexOf(id) < 0);
        if (!livres.length) continue;
        const id = livres[Math.floor(sortearNoTeste(teste) * livres.length)];
        ids.push(id);
        temas[id] = tema;
        achou = true;
      }
      if (!achou) break;
    }
    if (!ids.length) return null;
    teste.bloco = { nivel: n, ids: ids, temas: temas };
    return teste.bloco;
  }

  /* Fecha o bloco quando ele está todo respondido e conferido, e decide a
     escada: sobe, outro bloco, ou para. */
  function avancarTeste(teste) {
    const b = teste.bloco;
    if (teste.pendente || !b) return;
    const doBloco = teste.cartas.filter(c => b.ids.indexOf(c.id) >= 0);
    if (doBloco.length < b.ids.length) return;
    const k = doBloco.filter(cartaConhecida).length, m = doBloco.length;
    const x = teste.noNivel;
    x.blocos++; x.cartas += m; x.conhecidas += k;
    teste.bloco = null;
    /* as contas valem para o bloco de 6; o último bloco, cortado pelo teto,
       usa as mesmas proporções (e o teto o encerra de todo jeito) */
    let decisao;
    if (x.blocos === 1) {
      decisao = k >= Math.ceil(m * 5 / 6) ? 'sobe' : k <= Math.floor(m * 2 / 6) ? 'para' : 'outro';
    } else {
      decisao = x.conhecidas >= x.cartas * 9 / 12 ? 'sobe' : 'para';
    }
    if (teste.cartas.length >= TETO_DO_TESTE) decisao = 'para';
    if (decisao === 'sobe') {
      const i = teste.niveis.indexOf(teste.nivel);
      if (i + 1 < teste.niveis.length) {
        teste.nivel = teste.niveis[i + 1];
        teste.noNivel = { blocos: 0, cartas: 0, conhecidas: 0 };
      } else teste.fim = true;
    } else if (decisao === 'para') teste.fim = true;
  }

  /* A próxima carta, ou null no fim. { id, nivel, tema, conferir, feitas,
     teto }: com «conferir», a tela mostra a múltipla escolha da palavra (os
     distratores do card, na língua de quem estuda) e chama conferir(); sem,
     os dois botões, e responder(). */
  function proximaCarta(teste) {
    if (!teste || teste.fim) return null;
    if (teste.pendente) {
      const c = teste.cartas.find(x => x.id === teste.pendente);
      return { id: c.id, nivel: c.nivel, tema: c.tema, conferir: true,
        feitas: teste.cartas.length, teto: TETO_DO_TESTE };
    }
    if (!teste.bloco && !montarBloco(teste)) { teste.fim = true; return null; }
    const b = teste.bloco;
    const feitas = new Set(teste.cartas.map(c => c.id));
    const id = b.ids.find(x => !feitas.has(x));
    return { id: id, nivel: b.nivel, tema: b.temas[id], conferir: false,
      feitas: teste.cartas.length, teto: TETO_DO_TESTE };
  }

  /* «Já conheço» (conhece = true) ou «Quero aprender». Devolve
     { conferir, id }: se é hora de conferir, e qual carta — quase sempre a
     que acabou de ser respondida; no fim de um bloco sem conferência, outra
     «Já conheço» dele. Carta fora da vez é ignorada. */
  function responderNoTeste(teste, id, conhece) {
    const vez = proximaCarta(teste);
    if (!vez || vez.conferir || vez.id !== id) return { conferir: false, id: null, ignorada: true };
    const carta = { id: id, nivel: vez.nivel, tema: vez.tema, resposta: conhece ? 'conheco' : 'aprender' };
    teste.cartas.push(carta);
    const b = teste.bloco;
    const doBloco = teste.cartas.filter(c => b.ids.indexOf(c.id) >= 0);
    const ultima = doBloco.length === b.ids.length;
    const semConferencia = !doBloco.some(c => c.conferida);
    if (conhece && (sortearNoTeste(teste) < 1 / CONFERE_UM_EM || (ultima && semConferencia))) {
      teste.pendente = id;
    } else if (ultima && semConferencia) {
      const ja = doBloco.filter(c => c.resposta === 'conheco');
      if (ja.length) teste.pendente = ja[Math.floor(sortearNoTeste(teste) * ja.length)].id;
    }
    if (teste.pendente) teste.cartas.find(c => c.id === teste.pendente).conferida = true;
    avancarTeste(teste);
    return { conferir: !!teste.pendente, id: teste.pendente || null };
  }

  /* O resultado da múltipla escolha da conferência. Errou: a palavra conta
     como não conhecida. */
  function conferirNoTeste(teste, id, acertou) {
    if (!teste || teste.pendente !== id) return false;
    const c = teste.cartas.find(x => x.id === id);
    c.conferida = true;
    c.acertou = !!acertou;
    teste.pendente = null;
    avancarTeste(teste);
    return true;
  }

  /* ── a dedução, conservadora ──
     Para cada nível testado, a taxa r = conhecidas ÷ cartas; para cada
     célula nível × tema, p = (k + 4r) / (m + 4), com k conhecidas de m
     cartas da célula; p × confiança ≥ 0,9 → presume as palavras da célula.
     confiança = (acertos + 3) / (conferências + 3): otimista de propósito.
     Com a régua (acertos + 1) / (conferências + 2) da primeira versão, a
     célula só passava depois de umas oito conferências certas, e a dedução
     não deduzia nada; agora a confiança é 1 enquanto ninguém erra, e uma
     conferência errada em duas já a derruba para 0,8 — abaixo do limiar,
     tudo volta a depender só do que a pessoa respondeu. Só nos níveis até o mais
     alto testado; nunca falso-amigo, expressão, gíria, provérbio, conjugação
     nem frase. A palavra respondida «Já conheço» e não reprovada é
     presumida; a «Quero aprender» (e a reprovada) nunca é, mesmo numa célula
     que passou. Se o teste passou do A2, as frases de primeiros passos
     também são presumidas — todas, menos falso amigo: a etiqueta
     «expressão» de «¡Buen provecho!» não a tira do kit de quem chega.

     As taxas por nível (porNivel) são o prior de dominioPorNivel. Nível
     abaixo do primeiro testado (o A1 de quem começou no A2) leva a taxa do
     testado logo acima — é o que a dedução usa para ele também; nível acima
     do mais alto testado leva a metade do nível de baixo, a cada degrau,
     para o sorteio dos inéditos não pular para onde ninguém mediu nada.

     opcoes: { uid, agora, estados, arquivados } — «agora» é o feitoEm, de
     onde saem as datas; card que já tem estado ou está arquivado não é
     presumido (é o caso do «refazer»). Devolve
     { porNivel, confianca, presumidos: { id: voltaEmISO }, testados,
       cartas: [{ id, resposta, conferida, acertou }] } — o que vai para
     extras.nivelamento, junto com feitoEm, pulou e comeco, que são da tela. */
  function deduzir(teste, cards, opcoes) {
    const o = opcoes || {};
    const agora = o.agora || new Date().toISOString();
    const estados = o.estados || {}, arquivados = o.arquivados || {};
    const cartas = (teste && teste.cartas) || [];
    const conferidas = cartas.filter(c => c.conferida && typeof c.acertou === 'boolean');
    const confianca = (conferidas.filter(c => c.acertou).length + 3) / (conferidas.length + 3);
    const resumo = cartas.map(c => {
      const x = { id: c.id, resposta: c.resposta };
      if (c.conferida && typeof c.acertou === 'boolean') { x.conferida = true; x.acertou = c.acertou; }
      return x;
    });

    const medida = {}, testados = [];
    NIVEIS.forEach(n => {
      const m = cartas.filter(c => c.nivel === n);
      if (!m.length) return;
      testados.push(n);
      medida[n] = m.filter(cartaConhecida).length / m.length;
    });
    const presumidos = {};
    if (!testados.length) {
      return { porNivel: {}, confianca: confianca, presumidos: presumidos, testados: testados, cartas: resumo };
    }
    const iAlto = NIVEIS.indexOf(testados[testados.length - 1]);
    const porNivel = {};
    let acima = medida[testados[testados.length - 1]];
    for (let i = iAlto; i >= 0; i--) {
      if (medida[NIVEIS[i]] !== undefined) acima = medida[NIVEIS[i]];
      porNivel[NIVEIS[i]] = acima;
    }
    for (let i = iAlto + 1; i < NIVEIS.length; i++) porNivel[NIVEIS[i]] = porNivel[NIVEIS[i - 1]] / 2;

    const celulas = {};
    cartas.forEach(c => {
      const x = celulas[c.nivel + '|' + c.tema] || (celulas[c.nivel + '|' + c.tema] = { k: 0, m: 0 });
      x.m++;
      if (cartaConhecida(c)) x.k++;
    });
    const conhecidas = new Set(cartas.filter(cartaConhecida).map(c => c.id));
    const recusadas = new Set(cartas.filter(c => !cartaConhecida(c)).map(c => c.id));
    const livre = c => !(estados[c.id] && estados[c.id].vistas) && !arquivado(c.id, arquivados);

    (cards || []).forEach(c => {
      if (!c || c.tipo !== 'palavra') return;
      const i = NIVEIS.indexOf(c.nivel);
      if (i < 0 || i > iAlto) return;
      if (temTag(c, TAGS_FORA_DA_DEDUCAO) || transparencia(c) === 'total') return;
      if (!livre(c) || recusadas.has(c.id)) return;
      const tema = temaDe(c);
      if (!tema) return;
      const x = celulas[c.nivel + '|' + tema] || { k: 0, m: 0 };
      const p = (x.k + FORCA_DO_NIVEL * porNivel[c.nivel]) / (x.m + FORCA_DO_NIVEL);
      /* o épsilon é da aritmética, não da régua: 0,9 tem de passar */
      if (conhecidas.has(c.id) || p * confianca >= LIMIAR_PRESUMIR - 1e-9) {
        presumidos[c.id] = dataDoPresumido(o.uid, c.id, agora);
      }
    });
    if (iAlto > NIVEIS.indexOf('A2')) {
      (cards || []).forEach(c => {
        /* as de primeiros passos são o kit de quem chega (manual, 17.4.1):
           entram inteiras, mesmo a que leva «expressão» («¡Buen provecho!»);
           só o falso amigo continua fora */
        if (c && c.tipo === 'frase' && temTag(c, [TAG_PRIMEIROS_PASSOS]) && !temTag(c, ['falso-amigo']) && livre(c)) {
          presumidos[c.id] = dataDoPresumido(o.uid, c.id, agora);
        }
      });
    }
    return { porNivel: porNivel, confianca: confianca, presumidos: presumidos, testados: testados, cartas: resumo };
  }

  /* O N da tela de resultado: «Você já conhece cerca de N palavras deste
     baralho» — as transparentes totais mais as palavras presumidas. Sem
     «presumidos», os que o app entregou em usarExtras. */
  function palavrasConhecidas(cards, presumidos) {
    const pres = presumidos || PRESUMIDOS;
    let n = 0;
    (cards || []).forEach(c => {
      if (c && c.tipo === 'palavra' && (transparencia(c) === 'total' || pres[c.id])) n++;
    });
    return n;
  }

  /* ── o nivelamento pela lista (7.9) ──
     Para o curso cujo baralho tem a lista de frequência (todos, desde
     17/10/2026: fonte/frequencia/<língua>.tsv). A lista vem no pacote do curso
     já com a tradução de quem estuda; a tela a entrega aqui como itens
     { pos, fr (a forma, em qualquer língua), classe, nivel, trad, cards: [ids] }, em ordem de posição
     (itensDaLista converte o formato compacto do pacote).

       const L = Motor.nivelamentoLista;
       const itens = L.itens(window.TAIOE_LISTA);
       const t = L.novo(itens, { comeco: 'pouco' });
       let c;
       while ((c = L.proximaCarta(t, itens))) {
         if (c.conferir) L.conferir(t, itens, c.pos, acertouAMultipla);
         else L.responder(t, itens, c.pos, jaConheco);
       }
       const r = L.deduzir(t, itens, cards, { uid, agora, estados, arquivados });

     A busca anda pelas palavras PERGUNTÁVEIS (com tradução, sem falso amigo e
     sem transparente total). Começa na posição de partida da resposta de
     entrada, com o salto dela; conhece, sobe um salto; não conhece, desce;
     depois da primeira inversão de direção, o salto cai pela metade a cada
     inversão, até o salto mínimo (10 posições, ou 3% da posição). Aí a
     JANELA: cinco perguntáveis seguidas a partir de duas antes de onde a
     busca parou. Duas «não conheço» na janela, a divisa é o começo dela; uma
     ou nenhuma, a busca volta logo acima dela. Até a primeira inversão o salto
     dobra. Teto de 30 palavras (as conferências não contam). A
     conferência: todo «Já conheço» dos três primeiros saltos, depois um em
     cada quatro, e pelo menos uma por janela; reprovada, conta como «não
     conheço». O teste é JSON puro, sorteio incluído, como o da 7.3. */
  const PARTIDA_DA_LISTA = { nunca: 1, pouco: 400, bastante: 1500 };   // posição na lista
  const SALTO_DA_LISTA = { nunca: 100, pouco: 250, bastante: 500 };
  const SALTO_MINIMO = 10, JANELA_DA_LISTA = 5, NAO_NA_JANELA = 2, TETO_DA_LISTA = 30;
  const CONFERE_NOS_PRIMEIROS = 2;
  const SALTO_RELATIVO = 0.03;            // o salto mínimo cresce com a posição: 3% dela
  const PRIMEIROS_PASSOS_NA_VOLTA = 300;   // posição da divisa a partir da qual eles estreiam na volta

  /* O pacote traz { versao, itens: [[pos, fr, classe, nivel, trad, ids?], …] }. */
  function itensDaLista(bruto) {
    const linhas = (bruto && Array.isArray(bruto.itens)) ? bruto.itens : Array.isArray(bruto) ? bruto : [];
    return linhas.map(l => Array.isArray(l)
      ? { pos: l[0], fr: l[1], classe: l[2], nivel: l[3], trad: l[4], cards: l[5] ? String(l[5]).split(',') : [] }
      : l).filter(x => x && x.pos > 0).sort((a, b) => a.pos - b.pos);
  }

  function perguntavel(item) {
    if (!item || !item.trad) return false;
    if (igualATraducao(item)) return false;
    return !(item.cards || []).some(id => FALSO_AMIGO[id] || transparenteTotal(id));
  }
  /* A palavra escrita igual à tradução, a menos de artigo, acento, parêntese e do
     «to» do inglês («pensar» → «pensar», «la casa» → «a casa»), é transparente
     total mesmo sem card: não se pergunta (7.9, regra 6). Pesa no espanhol e no
     português, que dividem centenas de palavras; o «ñ» continua letra. */
  const ARTIGO_NA_LISTA = /^(?:l'|(?:el|la|los|las|lo|o|a|os|as|le|les|the|to)\s+)/;
  function formaNua(t) {
    return String(t || '').toLowerCase().replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s*\(.*?\)\s*/g, ' ').trim().replace(ARTIGO_NA_LISTA, '').trim();
  }
  const IGUAL_A_TRADUCAO = new WeakMap();   // a busca pergunta a cada passo: a conta é uma vez por item
  function igualATraducao(item) {
    if (IGUAL_A_TRADUCAO.has(item)) return IGUAL_A_TRADUCAO.get(item);
    const forma = formaNua(item.fr);
    const igual = !!forma && String(item.trad).split('/').some(t => formaNua(t) === forma);
    IGUAL_A_TRADUCAO.set(item, igual);
    return igual;
  }
  const perguntaveisDa = itens => (itens || []).filter(perguntavel);

  function novoTesteDaLista(itens, opcoes) {
    const o = opcoes || {};
    const comeco = ['nunca', 'pouco', 'bastante'].indexOf(o.comeco) >= 0 ? o.comeco : 'pouco';
    const q = perguntaveisDa(itens);
    let k = q.findIndex(x => x.pos >= PARTIDA_DA_LISTA[comeco]);
    if (k < 0) k = Math.max(0, q.length - 1);
    return {
      versao: 2, comeco: comeco,
      semente: typeof o.semente === 'number' ? o.semente >>> 0 : Math.floor(Math.random() * 4294967296),
      k: k, salto: SALTO_DA_LISTA[comeco], direcao: 0, inversoes: 0, saltos: 0,
      fase: 'busca', janela: null,
      cartas: [],                          // { pos, resposta, fase, conferida?, acertou? }
      pendente: null,                      // pos da carta que espera a conferência
      divisa: null, fim: !q.length
    };
  }

  function cartaDaPos(teste, pos) { return teste.cartas.find(c => c.pos === pos); }

  function proximaCartaDaLista(teste, itens) {
    if (!teste || teste.fim) return null;
    const q = perguntaveisDa(itens);
    const carta = (item, conferir) => ({ pos: item.pos, item: item, nivel: item.nivel, conferir: conferir,
      feitas: teste.cartas.length, teto: TETO_DA_LISTA });
    if (teste.pendente) {
      const item = q.find(x => x.pos === teste.pendente) || itens.find(x => x.pos === teste.pendente);
      return item ? carta(item, true) : null;
    }
    if (teste.fase === 'busca') return q[teste.k] ? carta(q[teste.k], false) : null;
    for (let i = teste.janela; i < Math.min(q.length, teste.janela + JANELA_DA_LISTA); i++) {
      if (!cartaDaPos(teste, q[i].pos)) return carta(q[i], false);
    }
    return null;
  }

  function responderNaLista(teste, itens, pos, conhece) {
    const vez = proximaCartaDaLista(teste, itens);
    if (!vez || vez.conferir || vez.pos !== pos) return { conferir: false, pos: null, ignorada: true };
    const c = { pos: pos, resposta: conhece ? 'conheco' : 'aprender', fase: teste.fase };
    teste.cartas.push(c);
    if (teste.fase === 'busca') teste.saltos++;
    if (conhece && ((teste.fase === 'busca' && teste.saltos <= CONFERE_NOS_PRIMEIROS) ||
                    sortearNoTeste(teste) < 1 / CONFERE_UM_EM)) {
      teste.pendente = pos;
      c.conferida = true;
    }
    if (!teste.pendente) avancarNaLista(teste, itens);
    return { conferir: !!teste.pendente, pos: teste.pendente };
  }

  function conferirNaLista(teste, itens, pos, acertou) {
    if (!teste || teste.pendente !== pos) return false;
    const c = cartaDaPos(teste, pos);
    c.conferida = true;
    c.acertou = !!acertou;
    teste.pendente = null;
    avancarNaLista(teste, itens);
    return true;
  }

  function fecharNaLista(teste, divisa) {
    teste.divisa = divisa;
    teste.fim = true;
    teste.pendente = null;
  }

  function abrirJanela(teste, q, desde) {
    teste.fase = 'janela';
    teste.janela = Math.max(0, Math.min(desde, q.length - JANELA_DA_LISTA));
  }

  function avancarNaLista(teste, itens) {
    const q = perguntaveisDa(itens);
    const ultima = teste.cartas[teste.cartas.length - 1];
    if (!ultima || !q.length) { fecharNaLista(teste, 1); return; }
    if (teste.fase === 'busca') {
      const conhece = cartaConhecida(ultima);
      const dir = conhece ? 1 : -1;
      /* até a primeira inversão o salto dobra (a pessoa pode estar muito
         longe do ponto de partida); depois, cai pela metade a cada inversão */
      if (teste.direcao && dir !== teste.direcao) {
        teste.inversoes = (teste.inversoes || 0) + 1;
        teste.salto = Math.max(saltoMinimo(q, teste.k), Math.floor(teste.salto / 2));
      } else if (teste.direcao && !teste.inversoes) teste.salto *= 2;
      teste.direcao = dir;
      if (teste.salto <= saltoMinimo(q, teste.k) && teste.saltos > 1) abrirJanela(teste, q, teste.k - 2);
      else {
        let alvo = Math.max(0, Math.min(q.length - 1, teste.k + dir * teste.salto));
        while (alvo !== teste.k && cartaDaPos(teste, q[alvo].pos)) alvo -= dir;
        if (alvo === teste.k) abrirJanela(teste, q, conhece ? q.length - JANELA_DA_LISTA : 0);
        else teste.k = alvo;
      }
    }
    if (teste.cartas.length >= TETO_DA_LISTA) {
      fecharNaLista(teste, teste.fase === 'janela' ? q[teste.janela].pos : estimarDivisa(teste, q));
      return;
    }
    if (teste.fase !== 'janela') return;
    /* a janela: duas «não» fecham na hora; completa com uma ou nenhuma, anda */
    while (true) {
      const fim = Math.min(q.length, teste.janela + JANELA_DA_LISTA);
      const nela = q.slice(teste.janela, fim).map(x => cartaDaPos(teste, x.pos));
      const nao = nela.filter(c => c && teste.pendente !== c.pos && !cartaConhecida(c)).length;
      if (nao >= NAO_NA_JANELA) { fecharNaLista(teste, q[teste.janela].pos); return; }
      if (nela.some(c => !c)) return;                     // ainda falta perguntar
      /* completa: pelo menos uma conferência nela, se houver «Já conheço» */
      const sim = nela.filter(c => c.resposta === 'conheco');
      if (sim.length && !nela.some(c => c.conferida)) {
        const c = sim[Math.floor(sortearNoTeste(teste) * sim.length)];
        c.conferida = true;
        teste.pendente = c.pos;
        return;
      }
      if (fim >= q.length) { fecharNaLista(teste, q[q.length - 1].pos + 1); return; }
      /* passou: a divisa está mais acima, e a busca volta, com o salto
         dobrando de novo (um «não» falso no começo não prende o teste lá) */
      teste.fase = 'busca';
      teste.janela = null;
      teste.direcao = 1;
      teste.inversoes = (teste.janelasQuePassaram = (teste.janelasQuePassaram || 0) + 1) > 1 ? 1 : 0;
      teste.salto = 2 * saltoMinimo(q, fim);
      teste.k = fim;
      return;
    }
  }

  function saltoMinimo(q, k) {
    const item = q[Math.max(0, Math.min(q.length - 1, k))];
    return Math.max(SALTO_MINIMO, Math.round((item ? item.pos : 0) * SALTO_RELATIVO));
  }

  /* No «Pular» ou no teto, no meio da busca: a divisa é o corte que mais
     concorda com as respostas — o máximo de «conheço» abaixo dele e de «não
     conheço» acima. Um «não» falso lá no começo não derruba a estimativa. */
  function estimarDivisa(teste, q) {
    const cartas = teste.cartas.filter(c => teste.pendente !== c.pos)
      .map(c => ({ pos: c.pos, sim: cartaConhecida(c) })).sort((a, b) => a.pos - b.pos);
    if (!cartas.length) return 1;
    const totalNao = cartas.filter(c => !c.sim).length;
    let melhor = totalNao, corte = cartas[0].pos;          // corte antes de todas: só os «não» concordam
    let simAbaixo = 0, naoAbaixo = 0;
    cartas.forEach((c, i) => {
      if (c.sim) simAbaixo++; else naoAbaixo++;
      const placar = simAbaixo + (totalNao - naoAbaixo);
      if (placar > melhor) {
        melhor = placar;
        const seguinte = cartas[i + 1];
        const j = q.findIndex(x => x.pos > c.pos);
        corte = seguinte ? (j >= 0 ? Math.min(q[j].pos, seguinte.pos) : seguinte.pos) : (j >= 0 ? q[j].pos : c.pos + 1);
      }
    });
    return corte;
  }

  /* O resultado (7.9): toda palavra antes da divisa é presumida, mais as
     «Já conheço» acima dela, menos as «Quero aprender», as reprovadas, o
     falso amigo, a transparente total (já conta), o card com estado e o
     arquivado. As não presumidas antes da divisa vão para «fora», para a
     regra da divisa não as presumir depois (presumidoEm). O porNivel é a
     parte de cada nível da lista que ficou antes da divisa. */
  function deduzirDaLista(teste, itens, cards, opcoes) {
    const o = opcoes || {};
    const agora = o.agora || new Date().toISOString();
    const estados = o.estados || {}, arquivados = o.arquivados || {};
    const q = perguntaveisDa(itens);
    const divisa = teste && teste.divisa != null ? teste.divisa : estimarDivisa(teste || { cartas: [] }, q);
    const cartas = (teste && teste.cartas) || [];
    const porPos = new Map(itens.map(x => [x.pos, x]));
    const sim = new Set(), nao = new Set();
    cartas.forEach(c => {
      const item = porPos.get(c.pos);
      ((item && item.cards) || []).forEach(id => (cartaConhecida(c) && !(teste.pendente === c.pos) ? sim : nao).add(id));
    });
    const presumidos = {}, fora = [];
    (cards || []).forEach(c => {
      if (!c || c.tipo !== 'palavra' || !POS[c.id]) return;
      const antes = POS[c.id] < divisa;
      if (!antes && !sim.has(c.id)) return;
      const pode = !FALSO_AMIGO[c.id] && !COM_IRMA[c.id] && transparencia(c) !== 'total' &&
        !(estados[c.id] && estados[c.id].vistas) && !arquivado(c.id, arquivados) && !nao.has(c.id);
      if (pode) presumidos[c.id] = dataDoPresumido(o.uid, c.id, agora);
      else if (antes) fora.push(c.id);
    });
    const porNivel = {};
    NIVEIS.forEach(n => {
      const doNivel = itens.filter(x => x.nivel === n);
      if (doNivel.length) porNivel[n] = doNivel.filter(x => x.pos < divisa).length / doNivel.length;
    });
    const resumo = cartas.map(c => {
      const x = { pos: c.pos, resposta: c.resposta };
      if (c.conferida && typeof c.acertou === 'boolean') { x.conferida = true; x.acertou = c.acertou; }
      return x;
    });
    return { versao: 2, divisa: divisa, porNivel: porNivel, presumidos: presumidos, fora: fora,
             cartas: resumo, perguntas: resumo.length };
  }

  /* ── a estimativa viva (o Gere, 15/11/2026) ──
     «Sempre atualizar a previsão de quais palavras a pessoa já conhece. Tem um teste inicial
     mas, depois, é possível ir atualizando essas estimativas com base em quais palavras a pessoa
     acertou de primeira.» A divisa da lista (7.9) deixa de ser só a do teste: a cada primeira
     resposta de um card de palavra da lista, a cada teste de presumido e a cada «Já conheço»,
     ela é refeita como o ponto da lista que melhor explica tudo o que a pessoa respondeu até ali.

     Cada resposta pesa pela chance de sair assim de quem sabe e de quem não sabe a palavra
     (CHANCE_DE_ACERTO, [sabe, não sabe]): na estreia, que é de escolher, o chute acerta muito; no
     teste, que é escrito, quase nunca. A divisa é a posição D que maximiza a soma dos logaritmos,
     com tudo antes de D «sabe» e o resto «não sabe». Só muda quando a nova explica a evidência
     com folga (FOLGA_DA_DIVISA, em logaritmo natural), para não oscilar a cada resposta. */
  const CHANCE_DE_ACERTO = { estreia: [0.95, 0.35], teste: [0.9, 0.05], lista: [0.9, 0.1] };
  const FOLGA_DA_DIVISA = 2;

  /* As evidências: [{ pos, certo, tipo }]. As cartas do teste, as primeiras respostas dos cards de
     palavra da lista (est.primeira; para os estados de antes de 15/11, o histórico quando ainda
     tem a primeira, ou «nunca errou») e os «Já conheço». */
  function evidenciasDaDivisa(cards, estados, arquivados, niv) {
    const saida = [];
    ((niv && niv.cartas) || []).forEach(c => {
      if (c && c.pos > 0) saida.push({ pos: c.pos, certo: cartaConhecida(c), tipo: 'lista' });
    });
    estados = estados || {};
    (cards || []).forEach(c => {
      if (!c || c.tipo !== 'palavra' || !POS[c.id]) return;
      const e = estados[c.id];
      if (arquivado(c.id, arquivados)) {
        saida.push({ pos: POS[c.id], certo: true, tipo: 'teste' });
        return;
      }
      if (!e || !e.vistas) return;
      let certo = e.primeira;
      if (certo === undefined) {
        const h = e.historico || [];
        if (h.length && h.length === e.vistas) certo = !!h[0].acertou;
        else if (!e.erros) certo = true;
        else return;
      }
      saida.push({ pos: POS[c.id], certo: !!certo, tipo: e.testado || e.confirmacao ? 'teste' : 'estreia' });
    });
    return saida;
  }

  /* A divisa que melhor explica as evidências, e o quanto ela explica melhor que a atual:
     { divisa, ganho }. */
  function divisaPelaEvidencia(evid, atual) {
    const lista = (evid || []).slice().sort((a, b) => a.pos - b.pos);
    const ll = (x, sabe) => {
      const p = CHANCE_DE_ACERTO[x.tipo] || CHANCE_DE_ACERTO.estreia;
      const q = sabe ? p[0] : p[1];
      return Math.log(x.certo ? q : 1 - q);
    };
    /* com D = 1, ninguém sabe nada: a soma toda do «não sabe»; cada evidência que passa para antes
       de D troca o seu «não sabe» pelo «sabe» */
    let base = 0;
    lista.forEach(x => { base += ll(x, false); });
    const em = d => {       // a soma para uma divisa qualquer
      let s = base;
      for (const x of lista) { if (x.pos >= d) break; s += ll(x, true) - ll(x, false); }
      return s;
    };
    atual = Math.max(1, atual || 1);
    const doAtual = em(atual);
    let melhor = atual, valor = doAtual, s = base, i = 0;
    const candidatos = [1].concat(lista.map(x => x.pos + 1));
    for (const d of candidatos) {
      while (i < lista.length && lista[i].pos < d) { s += ll(lista[i], true) - ll(lista[i], false); i++; }
      if (s > valor + 1e-9 || (Math.abs(s - valor) <= 1e-9 && Math.abs(d - atual) < Math.abs(melhor - atual))) {
        melhor = d; valor = s;
      }
    }
    return { divisa: melhor, ganho: valor - doAtual };
  }

  /* O nivelamento refeito pela evidência, ou null quando a divisa fica. Os presumidos que já
     existiam guardam a data de volta; os novos ganham a sua (dataDoPresumido, a partir de agora);
     os que ficaram depois da nova divisa deixam de ser presumidos e voltam a ser cards novos, menos
     os «Já conheço» do teste. Sem nivelamento pela lista, começa de uma divisa zero. */
  function reverDivisa(niv, itens, cards, opcoes) {
    const o = opcoes || {};
    if (niv && niv.versao !== 2) return null;           // o nivelamento antigo, por blocos (7.3)
    const base = niv || { versao: 2, divisa: 0, presumidos: {}, fora: [], cartas: [], perguntas: 0 };
    const evid = evidenciasDaDivisa(cards, o.estados, o.arquivados, base);
    if (!evid.length) return null;
    const r = divisaPelaEvidencia(evid, base.divisa || 1);
    if (r.ganho < FOLGA_DA_DIVISA || r.divisa === (base.divisa || 1)) return null;
    const agora = o.agora || new Date().toISOString();
    const d = deduzirDaLista({ divisa: r.divisa, cartas: base.cartas || [] }, itens || [], cards, o);
    const antigos = base.presumidos || {};
    const presumidos = {};
    Object.keys(d.presumidos).forEach(id => { presumidos[id] = antigos[id] || d.presumidos[id]; });
    return Object.assign({}, base, {
      divisa: r.divisa, porNivel: d.porNivel, presumidos: presumidos, fora: d.fora,
      divisaDoTeste: base.divisaDoTeste !== undefined ? base.divisaDoTeste : (base.divisa || 0),
      revistoEm: agora, revisoes: (base.revisoes || 0) + 1, feitoEm: base.feitoEm || agora
    });
  }

  /* ── o teste do presumido (o Gere, 15/11/2026) ──
     «De vez em quando, na hora de um card novo, escolha algum desses presumidamente conhecidos e
     mostre para a pessoa, avisando que está fazendo esse teste. Se a pessoa acertar, o card é
     marcado como conhecido de vez; se ela errar, o card entra no jogo normalmente na hora, já
     levando em conta essa primeira resposta errada.» Uma vaga de card novo em cada
     TESTE_A_CADA é de um presumido ainda sem resposta, de preferência dos mais perto da divisa
     (os 30% de cima), que são os mais incertos e os que mais ensinam à estimativa. A vez conta
     pelas estreias desde o último teste (est.estreouNa, est.testadoNa), e por isso vale em
     qualquer aparelho. */
  const TESTE_A_CADA = 10, FAIXA_DO_TESTE = 0.3;

  function horaDoTeste(estados) {
    let ultimo = -1;
    const est = estados || {};
    for (const id in est) { const e = est[id]; if (e && e.testadoNa !== undefined && e.testadoNa > ultimo) ultimo = e.testadoNa; }
    let n = 0;
    for (const id in est) { const e = est[id]; if (e && e.estreouNa !== undefined && e.estreouNa > ultimo && !e.testado) n++; }
    return n >= TESTE_A_CADA - 1;
  }

  function presumidoParaTestar(cards, estados, arquivados, sorte) {
    if (soIda() || !(DIVISA || Object.keys(PRESUMIDOS).length)) return null;
    const todos = (cards || []).filter(c => c && c.tipo === 'palavra' && !arquivado(c.id, arquivados) &&
      presumidoEm(c.id, estados));
    if (!todos.length) return null;
    const corte = (DIVISA || 0) * (1 - FAIXA_DO_TESTE);
    const perto = todos.filter(c => POS[c.id] && POS[c.id] >= corte);
    const grupo = perto.length ? perto : todos;
    const s = typeof sorte === 'function' ? sorte : Math.random;
    return grupo[Math.min(grupo.length - 1, Math.floor(s() * grupo.length))].id;
  }

  /* As alternativas da conferência da palavra sem card: a tradução certa e
     as de quatro vizinhas da lista, da mesma classe e de tradução diferente,
     escolhidas pelo sorteio do teste. Com card, a tela usa as do card. */
  function alternativasDaLista(teste, itens, pos) {
    const item = itens.find(x => x.pos === pos);
    if (!item) return { certa: null, opcoes: [] };
    const i = itens.indexOf(item);
    const vistas = new Set([normalizar(item.trad)]);
    const candidatas = [];
    for (let d = 1; d < 80 && candidatas.length < 12; d++) {
      [itens[i - d], itens[i + d]].forEach(x => {
        if (!x || !x.trad || x.classe !== item.classe) return;
        const n = normalizar(x.trad);
        if (vistas.has(n)) return;
        vistas.add(n);
        candidatas.push(x.trad);
      });
    }
    const escolhidas = [];
    while (escolhidas.length < 4 && candidatas.length) {
      escolhidas.push(candidatas.splice(Math.floor(sortearNoTeste(teste) * candidatas.length), 1)[0]);
    }
    const opcoes = [item.trad].concat(escolhidas);
    for (let k = opcoes.length - 1; k > 0; k--) {
      const j = Math.floor(sortearNoTeste(teste) * (k + 1));
      const x = opcoes[k]; opcoes[k] = opcoes[j]; opcoes[j] = x;
    }
    return { certa: item.trad, opcoes: opcoes };
  }

  /* Conta como conhecida pelo nivelamento — presumida (respondida ou não) ou
     transparente total. É o que decide a frase que estreia na volta. */
  function conhecidaPeloNivelamento(id) {
    return transparenteTotal(id) || !!PRESUMIDOS[id] || pelaDivisa(id);
  }

  /* A regra da divisa (7.9): o card de palavra que veio depois do teste,
     antes da divisa, nasce presumido sozinho — menos o falso amigo e o que
     o teste deixou de fora. */
  function pelaDivisa(id) {
    return !!(DIVISA && POS[id] && POS[id] < DIVISA && !FORA_DA_DIVISA[id] && !FALSO_AMIGO[id] && !COM_IRMA[id] && TIPO[id] === 'palavra');
  }

  const nivelamentoLista = {
    itens: itensDaLista, perguntavel: perguntavel, novo: novoTesteDaLista,
    proximaCarta: proximaCartaDaLista, responder: responderNaLista, conferir: conferirNaLista,
    deduzir: deduzirDaLista, alternativas: alternativasDaLista, conhecida: cartaConhecida,
    PARTIDA: PARTIDA_DA_LISTA, SALTO: SALTO_DA_LISTA, SALTO_MINIMO: SALTO_MINIMO,
    JANELA: JANELA_DA_LISTA, NAO_NA_JANELA: NAO_NA_JANELA, TETO: TETO_DA_LISTA,
    CONFERE_NOS_PRIMEIROS: CONFERE_NOS_PRIMEIROS, PRIMEIROS_PASSOS_NA_VOLTA: PRIMEIROS_PASSOS_NA_VOLTA
  };

  /* ── o card desafio (7.4) ──
     Um gostinho do que vem pela frente, sem desanimar: um card inédito com
     falso-amigo, expressão, gíria ou provérbio, DOIS níveis acima do nível
     atual (o mais alto com domínio ≥ o alvo de pesosDeNivel, já com o prior
     do nivelamento; ou contexto.nivel; ou A1), no máximo C1. Sem card nesse
     nível, o mais perto abaixo dele, até um acima do atual.

     O ritmo é do app, que guarda os contadores e os passa aqui:
       contexto = { agora, respostas (no curso), desafios (quantos já),
                    ultimoDesafio (ISO), inicio (ISO: o começo do curso),
                    mostrados (ids já oferecidos), arquivados, prior, nivel,
                    aleatorio (função, para os testes) }
     O primeiro depois de 15 respostas; no máximo um por dia (no fuso do
     aparelho); só nas duas primeiras semanas do curso; no máximo 10.

     Devolve null ou { card, previa, nivel }. «previa» é a frase ainda presa:
     aparece uma vez em múltipla escolha; acertou, entra no jogo; errou,
     continua presa. A estreia de um desafio leva est.desafio = true
     (marcarDesafio), e dominioPorNivel a ignora. */
  const DESAFIO_DEPOIS_DE = 15, DESAFIOS_NO_MAXIMO = 10, DIAS_DE_DESAFIO = 14, DESAFIO_ACIMA = 2;

  function nivelAtual(cards, estados, contexto) {
    const c = contexto || {};
    const dom = dominioPorNivel(cards || [], estados || {}, c.prior);
    let i = -1;
    NIVEIS.forEach((n, k) => { if (dom[n] >= ALVO) i = k; });
    if (i < 0 && c.nivel) i = NIVEIS.indexOf(c.nivel);
    return NIVEIS[Math.max(0, i)];
  }

  function escolherDesafio(cards, estados, contexto) {
    if (soIda()) return null;   // no modo trilhas tudo sai dos textos (cards/LATIM.md §5)
    const c = contexto || {};
    estados = estados || {};
    const agora = c.agora !== undefined ? new Date(c.agora).getTime() : Date.now();
    if ((c.respostas || 0) < DESAFIO_DEPOIS_DE) return null;
    if ((c.desafios || 0) >= DESAFIOS_NO_MAXIMO) return null;
    if (c.ultimoDesafio && diaLocal(c.ultimoDesafio) === diaLocal(agora)) return null;
    const inicio = Date.parse(c.inicio);
    if (isFinite(inicio) && agora - inicio > DIAS_DE_DESAFIO * 864e5) return null;

    const arquivados = c.arquivados || {};
    const mostrados = new Set(Array.isArray(c.mostrados) ? c.mostrados : Object.keys(c.mostrados || {}));
    const atual = NIVEIS.indexOf(nivelAtual(cards, estados, c));
    const alvo = Math.min(NIVEIS.indexOf('C1'), atual + DESAFIO_ACIMA);
    const grupo = (cards || []).filter(x => x && temTag(x, TAGS_DO_DESAFIO) &&
      !(estados[x.id] && estados[x.id].vistas) && !arquivado(x.id, arquivados) &&
      !conhecidaSemEstado(x.id, estados) && transparencia(x) !== 'total' && !mostrados.has(x.id));
    let doNivel = [];
    for (let i = alvo; i > atual && !doNivel.length; i--) doNivel = grupo.filter(x => x.nivel === NIVEIS[i]);
    if (!doNivel.length) return null;
    const sorte = typeof c.aleatorio === 'function' ? c.aleatorio : Math.random;
    const card = doNivel[Math.min(doNivel.length - 1, Math.floor(sorte() * doNivel.length))];
    const previa = card.tipo === 'frase' && !liberado(card, estados, agora, arquivados);
    return { card: card, previa: previa, nivel: card.nivel };
  }

  /* A estreia foi um desafio: o app chama logo depois de criar o estado. */
  function marcarDesafio(est) {
    if (est) est.desafio = true;
    return est;
  }

  const nivelamento = {
    banco: bancoDoTeste, novo: novoTeste, proximaCarta: proximaCarta,
    responder: responderNoTeste, conferir: conferirNoTeste, deduzir: deduzir,
    conhecida: cartaConhecida,
    BLOCO: BLOCO_DO_TESTE, TETO: TETO_DO_TESTE, CONFERE_UM_EM: CONFERE_UM_EM,
    FORCA_DO_NIVEL: FORCA_DO_NIVEL, LIMIAR: LIMIAR_PRESUMIR
  };

  return {
    NIVEIS, ROTULO_NIVEL,
    normalizar, conferir,
    estadoInicial, registrar, modoDe, direcaoDe, faseDe, anotarDiario, diaLocal,
    pergunta, resposta, normalizarEs, normalizarEn, formaReconhecida,
    usarBaralho, ehVolta, direcoes, CAMPOS,
    /* o latim (cards/LATIM.md) */
    usarModo, modo, soIda, expandirGabarito, GABARITO_MAXIMO, parecido, parecidoDeFrase, usarVocabulario, exemploDoConceito,
    perguntaDaForma, ehForma, ehContraste, ehConceito, ehCompreensao, ehCompreensaoDoVerso, ehHeranca, ehAnalise, umaVezSo, ehFlexao, ehFlexaoDeCaso, conferirFlexao, normalizarFlexao, leiturasDaFlexao, encerrado, formaPuxada, formaEscolhida, formaPronta, conferirForma, foraDaPergunta,
    ACERTOS_QUE_SOLTAM,
    DIA_DAS_TERMINACOES, ativoDaTerminacao, flexaoPuxada, adormecido, quemConta, exemploDaTerminacao,
    erroDeGenero, formasAceitas, LIMITES, cortar,
    porExtenso, linguaTrocada, sinonimoDoCard, regionalDoCard, irmaDoCard, espanhoisDoCard, erroDeEne, acentoRelevado, acentoFaltando, diferencaDoQuase,
    indiceEspanhol, leituraEspanhola, erroDeFlexao,
    descontoDePassos, acertosParaVirar, ACERTOS_PARA_VIRAR,
    linguaDaPergunta, linguaDaResposta,
    temVariante, formaDoCard, formasDoCard, sortearForma, idiomaDoCard,
    distanciaNaFila, esperando, proximaVolta, ajustarVoltaAoDegrau, VARIACAO_DA_VOLTA,
    urgenciaDoDominado, dominadoDaVez, pesoDosVencidos, acumuloDosVencidos, ACUMULO, parteDosDominados,
    /* a escada da família do curso (usarEscada); os getters devolvem a lista da escada em uso */
    usarEscada, escada, degraus, degrauDoNome, ESCADAS,
    get DIAS_DOMINADO() { return ESCADAS[ESCADA].dias; },
    get DIAS_NOMINAIS() { return ESCADAS[ESCADA].nominais; },
    get PESO_DO_DEGRAU() { return ESCADAS[ESCADA].pesoDoDegrau; },
    get PESO_NA_VEZ() { return ESCADAS[ESCADA].pesoNaVez; },
    get PESO_NA_PARTE() { return ESCADAS[ESCADA].pesoNaParte; },
    get UM_POR_VEZ_ATE() { return ESCADAS[ESCADA].umPorVezAte; },
    tempoConfiavel, MS_ABANDONO,
    contarDirecoes,
    filaDe, chancesDasFilas, chanceDoNovo, chanceDaIda, chanceDoProximoNovo, escolherProximo,
    CHANCE_NA_META, CHANCE_POR_CARD, CHANCE_MINIMA, CHANCE_MAXIMA,
    urgencia, cumpriu, escolherNaFila, podeVoltar, INTERVALO_MINIMO, vezDoDominado, ESPACO_DOMINADO,
    ALVO_IDA_MIN, ALVO_IDA_MAX, alvoDaFila, acertoRecente, atrasadoQueFura,
    MAX_TEXTOS, TEXTO_A_CADA, vezDoTexto, idaFechada, dominadosNoTotal, versosDoTexto, versosProntos, faltamNoTexto, versosVistos, textoTerminado,
    andamentoDoTexto, palavraQueSeguraVerso, acordada, textosAutomaticos, escolhaDosTextos, textosAtivos, textosQueSoltamPalavras, palavrasDosTextos, ehLeitura,
    partesDaObra, parteDaVez, parteSeguinte, textoEscolhivel,
    liberado, liberadaEm, venceuEm, requeridas, arquivado, sabidaEm,
    situacaoDaFrase, atualizarEmVista, palavrasEmVista, FRASES_EM_VISTA,
    montarFila, alternativas, distratoresDinamicos, distratoresDaLingua, embaralhar,
    dominioPorNivel, pesosDeNivel, ordenarNovos,
    respostasAceitas,
    /* o começo do app (PLANO.md, seção 7) */
    TAGS_DE_CLASSE, temaDe, usarTransparencias, usarExtras, transparencia, transparenteTotal,
    evidenciasDaDivisa, divisaPelaEvidencia, reverDivisa, horaDoTeste, presumidoParaTestar, TESTE_A_CADA, CHANCE_DE_ACERTO,
    presumidoEm, conhecidaSemEstado, estadoInicialDo, estadoDoPresumido, responderPresumido,
    dataDoPresumido, DEGRAU_DO_PRESUMIDO, nivelamento, palavrasConhecidas,
    escolherDesafio, marcarDesafio, nivelAtual,
    /* o nivelamento pela lista (7.9) */
    nivelamentoLista, conhecidaPeloNivelamento
  };
})();
