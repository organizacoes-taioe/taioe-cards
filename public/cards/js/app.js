/* ────────────────────────────────────────────────────────────────
   app.js — telas e fluxo de estudo. Quem chama é o inicio.js, com o
   curso, a sessão e o progresso guardado neste aparelho (ctx). A
   sincronização com a conta mora em sincronia.js (anexo do banco, §2).
   ──────────────────────────────────────────────────────────────── */
window.TaioeCardsApp = function (ctx) {

  /* ── o curso ──
     O baralho ensina uma língua (L) e é respondido em português. A ida é
     reconhecer a língua (L → pt), a volta é produzi-la (pt → L). O que é
     só do espanhol — o ñ, a conjugação, as regiões, os textos — continua
     no motor e simplesmente não dispara no inglês. */
  const L = ctx.lingua;
  /* A língua de quem estuda: o português, e desde 07/10/2026 também o
     espanhol e o inglês (os cursos para quem fala essas línguas, inclusive o
     de português). Os campos da resposta, das aceitas, dos distratores e da
     nota saem dela (Motor.CAMPOS); a nota do português é «nota», as outras
     levam o sufixo («notaEs», «notaEn»). */
  const A = ctx.audiencia || 'pt';
  const CA = Motor.CAMPOS[A];
  const notaDe = c => (c && c[A === 'pt' ? 'nota' : 'nota' + A[0].toUpperCase() + A[1]]) || '';
  /* A interface fala a língua de quem estuda (A): no curso en-es, tudo em
     espanhol. Os textos moram em textos-i18n.js; «t» traduz sempre em A,
     mesmo que a página esteja mostrando outra língua por um instante (a
     escolha de curso, depois de trocar a língua nas configurações). */
  const I18N = window.TaioeI18n;
  const t = (k, v) => I18N.tEm(A, k, v);
  /* singular e plural: «chave.1» e «chave.n», com {n} */
  const tn = (k, n, v) => t(k + (n === 1 ? '.1' : '.n'), Object.assign({ n: n }, v));
  const LOCAL = I18N.local(A);
  const aspas = x => t('aspas', { x: x });
  const NOME_L = t('lingua.' + L);
  const NOME_A = t('lingua.' + A);
  /* Os temas são guardados em português; a tradução vem de fonte/tags.json,
     que o build põe em data/tags.js. */
  const TAGS = window.TAGS_RAW || {};
  const nomeTag = tag => (A === 'pt' ? tag : ((TAGS[tag] || {})[A] || tag));
  /* o lugar da forma regional, escrito em português no card */
  const lugar = onde => I18N.lugar(onde, A);
  const BANDEIRA_L = ctx.bandeira || '🏳️';
  const BANDEIRA_A = ctx.bandeiraAudiencia || { pt: '🇧🇷', es: '🇪🇸', en: '🇺🇸' }[A];
  const CHAVE = ctx.uid + ':' + ctx.curso;
  Motor.usarBaralho(L, A);
  /* O modo do curso (cards/LATIM.md §10). No latim é «trilhas»: só se aprende pelos textos,
     todo card só tem a ida, não há teste de nível nem desafio, e a pessoa escolhe de 1 a 3
     textos antes de começar. Vem antes de usarTransparencias, que depende dele. */
  const TRILHAS = ctx.modo === 'trilhas';
  Motor.usarModo(TRILHAS ? 'trilhas' : 'livre');
  const IDA = Motor.direcoes().ida;
  const ROTULO_IDA = L + ' → ' + A, ROTULO_VOLTA = A + ' → ' + L;
  let Sinc = null;   // a sincronização, criada no arranque

  /* ── o baralho, e o baralho como ele aparece ──
     O card de gênero guarda as duas formas num texto só («Tu herman{o|a} es
     muy maj{o|a}»). Quem estuda vê uma delas, sorteada na hora de perguntar;
     todo o resto do app — a lista, o painel, o relatório, os distratores
     tirados de outros cards — trabalha com a forma masculina, que é a
     canônica. Daí os dois baralhos: FONTE é o que o build gerou, CARDS é o
     que se mostra. */
  const FONTE = (window.BARALHOS && window.BARALHOS[L] && window.BARALHOS[L].cards) || [];
  const PORID_FONTE = {};
  FONTE.forEach(c => { PORID_FONTE[c.id] = c; });

  const CARDS = FONTE.map(c => Motor.formaDoCard(c, 0));
  const PORID = {};
  CARDS.forEach(c => { PORID[c.id] = c; });
  /* As palavras transparentes deste curso (PLANO.md, 7.1): o build pôs
     «transp» nos cards do pacote, e o motor passa a saber que a «total» conta
     como dominada e não entra em jogo, e que a «parecida» estreia na volta. */
  Motor.usarTransparencias(CARDS);
  /* A lista de frequência do curso (PLANO.md, 7.9): só no curso que a tem
     (todos, desde 17/10/2026). Com ela, o começo usa o nivelamento pela lista. */
  const LISTA = (window.TAIOE_LISTA && window.TAIOE_LISTA.curso === ctx.curso)
    ? Motor.nivelamentoLista.itens(window.TAIOE_LISTA) : null;
  const NL = Motor.nivelamentoLista;

  /* ── os textos ──
     Desde 20/10/2026 (PLANO.md, seção 9) os poemas vêm da Biblioteca, em
     data/textos-<língua>.js: os versos com as palavras, o destino de cada
     palavra (o card do lema, «gramatical» ou «nome») e a fila dos automáticos. */
  const TEXTOS = (window.TEXTOS && window.TEXTOS[L] && window.TEXTOS[L].textos) || [];
  const TEXTO_POR_ID = {};
  TEXTOS.forEach(txt => { TEXTO_POR_ID[txt.id] = txt; });

  /* As primeiras frases do latim (o «texto zero», cards/LATIM.md §3.4): livres desde o
     primeiro card, na ordem do arquivo, com as palavras delas, que todos estudam; e os trechos
     dos textos (o card de cada linha), com os conceitos que cada um pede. */
  const TZ_FRASES = TRILHAS ? CARDS.filter(c => c.tipo === 'frase' && Array.isArray(c.requerTodas) && !c.requerTodas.length) : [];
  const TZ_PALAVRAS = new Set(TZ_FRASES.flatMap(c => (c.palavras || []).map(x => x.c).filter(Boolean)));
  const TRECHOS = TRILHAS ? CARDS.filter(c => c.tipo === 'frase' && c.texto).sort((a, b) => (a.linha || 0) - (b.linha || 0)) : [];
  /* O card de flexão (cards/LATIM.md §3.8) de cada forma de uma frase, pela forma e pelo lema
     («id» de is, ea, id): a primeira frase o traz logo depois do lema, e o texto, pelo
     «requerTodas» de cada verso, na ordem de leitura. */
  const chaveLatina = w => String(w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/j/g, 'i').replace(/v/g, 'u');
  const FLEXAO = new Map(CARDS.filter(c => c.tipo === 'flexao').map(c => [chaveLatina(c.la) + '|' + c.lema, c.id]));
  const flexaoDe = x => (x && x.c ? FLEXAO.get(chaveLatina(x.w) + '|' + x.c) : undefined);
  /* as que vêm na ordem de leitura (do texto e das primeiras frases); as outras (as tabelas dos
     pronomes, de sum e de possum, e as formas das frases de uso) entram uma a cada quatro vagas */
  const FLEXAO_DE_LEITURA = new Set(CARDS.filter(c => c.tipo === 'frase' && (c.texto || (Array.isArray(c.requerTodas) && !c.requerTodas.length)))
    .flatMap(c => (c.palavras || []).map(flexaoDe).filter(Boolean)));
  /* a pergunta do card de conceito, pela família */
  const ENUNCIADO_DO_CONCEITO = {
    caso: 'card.enunciado.conceito.caso', verbo: 'card.enunciado.conceito.verbo', voz: 'card.enunciado.conceito.voz',
    construcao: 'card.enunciado.conceito.construcao'
  };

  /* emVista.escolha: os textos que a pessoa estuda ({ textos, em, propria });
     poema e prosa ficaram do formato de antes; lidos: «<id>#<k>» por verso
     visto e «<id>» pelo texto inteiro */
  function textosVazio() {
    return { emVista: { poema: null, prosa: null, escolha: null }, lidos: {} };
  }


  const $ = s => document.querySelector(s);
  const el = {};
  [
    'placar', 'btn-menu', 'menu-topo', 'btn-inicio', 'btn-cards', 'btn-painel', 'btn-config', 'resumo-inicio', 'btn-comecar',
    'tela-inicio', 'tela-card', 'tela-painel', 'tela-config', 'tela-cards',
    'busca-cards', 'filtro-tipo', 'filtro-nivel', 'filtro-tag', 'filtro-estado',
    'contagem-cards', 'lista-cards',
    'meta-tipo', 'meta-modo', 'aba-nivel', 'enunciado', 'termo',
    'bandeira-pergunta', 'bandeira-resposta', 'rotulo-resposta-txt', 'bandeira-feedback',
    'area-multipla', 'area-escrita', 'entrada', 'captura', 'btn-responder', 'btn-nao-sei',
    'area-nao-sei-multipla', 'btn-nao-sei-multipla',
    'aviso-lingua', 'aviso-acento', 'aviso-regiao',
    'meta-origem',
    'area-feedback', 'veredito', 'conquista', 'resposta-certa', 'caixa-resposta', 'nota', 'medidas',
    'area-julgamento', 'resposta-dada', 'texto-dado',
    'area-contestar', 'btn-contestar', 'aviso-contestado', 'btn-comentar-card', 'btn-arquivar',
    'comentario-fundo', 'comentario-alvo', 'comentario-texto', 'comentario-restam',
    'btn-comentario-enviar', 'btn-comentario-fechar',
    'btn-proximo', 'painel-conteudo', 'dica',
    'btn-texto', 'tela-texto', 'texto-conteudo',
    'cfg-conta', 'cfg-curso', 'btn-conta', 'btn-sair', 'cfg-outros-cursos', 'cfg-lingua',
    'estado-sync', 'btn-exportar', 'btn-zerar', 'rodape-sync', 'cfg-comentarios',
    /* o começo do app (PLANO.md, seção 7) */
    'tela-comeco', 'comeco-conteudo', 'meta-desafio', 'aviso-previa', 'btn-refazer',
    'btn-recomecar', 'recomecar-fundo', 'recomecar-titulo', 'recomecar-vistos', 'recomecar-pede',
    'recomecar-frase', 'btn-recomecar-sim', 'btn-recomecar-nao'
  ].forEach(id => { el[id] = document.getElementById(id); });

  /* ═══════════════ estado ═══════════════ */

  let progresso = carregarProgresso();
  let sessao = novaSessao();
  let cardAtual = null;
  let generoAtual = 0;      // 0 masculino, 1 feminino — só no card que muda de gênero
  let outraForma = null;    // o mesmo card no outro gênero, para a nota
  let modoAtual = null;
  let direcaoAtual = IDA;
  let alvoAtual = null;
  let inicioResposta = 0;
  let pausou = false;
  let respostaPendente = null;
  let ultimoRegistro = null;
  let chanceUsada = false;   // o aviso de língua trocada só devolve a vez uma vez
  let exemploAtual = null;   // o exemplo do card de conceito na tela (Motor.exemploDoConceito)
  let dinamicosAtuais = [];  // alternativas que não vêm do card: vão na resposta, para a calibragem

  /* ── o que fica só neste aparelho ──
     O teste do nivelamento em andamento (sobrevive a recarregar a página e
     não toca a rede até acabar), e os desafios já mostrados. Tudo por conta + curso. */
  function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esquecerLocal(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* Os reativados que valem: os de data sem o «-» na frente. */
  function reativadosAtivos(x) {
    const saida = {};
    Object.keys(x || {}).forEach(id => { if (TaioeSincronia.gestoAtivo(x[id])) saida[id] = x[id]; });
    return saida;
  }

  function progressoVazio() {
    return {
      versao: 1,
      atualizado_em: new Date().toISOString(),
      /* Quatro filas. Primeiro se sorteia card novo ou revisão, e depois a
         revisão sai dos dominados vencidos, da ida ou da volta (ver
         Motor.escolherProximo). */
      ineditos: Motor.montarFila(CARDS),       // nunca apareceu
      filaEsPt: [],                            // você reconhece a língua (ida)
      filaPtEs: [],                            // você produz a língua (volta)
      dominados: [],                           // vencido nas duas, esperando data
      serie: [],                               // [respostas, es→pt, pt→es, 6 degraus]
      cards: {},
      contestacoes: [],
      comentarios: [],
      totais: { respostas: 0, acertos: 0, sessoes: 0 },
      textos: textosVazio(),
      arquivados: {},                          // id → { em, ativo }: «não quero aprender»
      emVista: []                              // as frases cujas palavras estão chegando
    };
  }

  /* O progresso vem do IndexedDB deste aparelho (TaioeArmazem), lido pelo
     inicio.js antes de o app nascer; o que a conta tiver chega depois, pela
     sincronia (puxar), e é mesclado por cima. */
  function carregarProgresso() {
    let p = ctx.progressoSalvo;
    if (!p || !p.cards) p = progressoVazio();
    return conciliarFila(p);
  }

  /* Mantém as quatro filas coerentes com o estado dos cards. Cada card
     respondido mora na fila da sua etapa, e é daqui que sai a arrumação
     quando a etapa muda por sincronização de outro aparelho — ou quando o
     progresso vem no formato antigo, de uma fila só. */
  function conciliarFila(p) {
    p.cards = p.cards || {};
    /* a trilha de 01/10 saiu; ninguém chegou a ligá-la */
    delete p.trilha;
    p.textos = Object.assign(textosVazio(), p.textos || {});
    p.textos.emVista = Object.assign({ poema: null, prosa: null, escolha: null }, p.textos.emVista || {});
    p.textos.lidos = p.textos.lidos || {};

    /* Card apagado do baralho deixa para trás o estado dele. Sem varrer, ele
       continuaria contando em "cards já vistos" e nas tabelas do painel, e
       viajaria para sempre no progresso.json. A guarda do CARDS.length evita
       o desastre de apagar tudo se o data/cards.js não tiver carregado. */
    if (CARDS.length) {
      Object.keys(p.cards).forEach(id => { if (!PORID[id]) delete p.cards[id]; });
    }

    /* Progresso gravado antes de «primeiraCerta» existir não sabe se a
       estreia foi certa, e a tabela por nível somava esses cards só de um
       lado da conta: nenhuma estreia, mas todos os acertos em «depois».
       Dava 110% no A1. O histórico ainda alcança a estreia quando guarda
       tantas respostas quantas o card teve — aí a resposta [0] é ela. */
    Object.keys(p.cards).forEach(id => {
      const e = p.cards[id];
      if (!e || e.primeiraCerta !== undefined || !e.vistas) return;
      const h = e.historico || [];
      if (h.length >= e.vistas && h[0]) e.primeiraCerta = !!h[0].acertou;
    });

    /* O histórico antigo gravava em toda resposta três campos que quase
       sempre dizem «não» — quase, pausado e o «conhecia» da pergunta que já
       saiu do app. Tirá-los quando não dizem nada enxuga o arquivo em um
       terço, e ninguém os lê de outro jeito que não «é verdadeiro?». */
    Object.keys(p.cards).forEach(id => {
      ((p.cards[id] && p.cards[id].historico) || []).forEach(h => {
        if (!h) return;
        if (!h.quase) delete h.quase;
        if (!h.pausado) delete h.pausado;
        if (h.conhecia == null) delete h.conhecia;
      });
    });

    /* ── a data do domínio, para quem dominou antes dela existir ──
       «dominadoEm» só nasceu quando a frase de uso passou a esperar o dia
       seguinte (ver Motor.liberadaEm). Card dominado antes disso ficou sem a
       data — e sem data, Motor.liberadaEm trata a palavra como vencida há
       muito tempo, e a frase presa a ela sai liberada na hora, mesmo que a
       revisão que acabou de acontecer tenha sido um erro. Foi o que o Gere
       viu em u126: a frase de «la servilleta» apareceu minutos depois de ele
       errar a palavra, porque «la servilleta» tinha virado dominada muito
       antes de o campo existir. Sem semear a data aqui, o mesmo ia esperar
       por toda palavra dominada de outros tempos — quase duzentas, neste
       progresso — assim que a frase de cada uma fosse escrita. A última
       resposta é a melhor pista que sobrou; não é o dia exato do domínio,
       mas basta para a frase voltar a esperar a meia-noite seguinte, em vez
       de pular na cara na primeira revisão. */
    Object.keys(p.cards).forEach(id => {
      const e = p.cards[id];
      if (e && e.etapa === 'dominado' && !e.dominadoEm) {
        e.dominadoEm = e.ultima || new Date().toISOString();
      }
    });

    const visto = id => !!p.cards[id] && !!p.cards[id].vistas;
    /* A frase presa a uma palavra ainda não dominada não entra em fila
       nenhuma. Não guardo lista de presos: a condição se recalcula aqui a
       cada carregamento, então dominar a palavra num aparelho destrava a
       frase em todos, sem nada de novo trafegar no progresso.json. */
    p.arquivados = (p.arquivados && typeof p.arquivados === 'object') ? p.arquivados : {};
    p.emVista = Array.isArray(p.emVista) ? p.emVista : [];
    /* ── o começo do app (PLANO.md, seção 7) ──
       Três extras novos, que viajam com os outros (ver extras(), no fim):
       «nivelamento» (o resultado do teste, com os presumidos), «reativados»
       (id → ISO: a transparente que a pessoa quis estudar mesmo assim) e
       «dicasVistas» (chave → ISO). O motor precisa dos dois primeiros, e é
       aqui que ele os recebe — toda mudança de extras passa por aqui. */
    const objeto = x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {};
    p.reativados = objeto(p.reativados);
    p.dicasVistas = objeto(p.dicasVistas);
    if (!p.nivelamento || typeof p.nivelamento !== 'object') delete p.nivelamento;
    /* «-ISO» é o gesto de desfazer (o «voltar a contar como conhecida», ver
       sincronia.js): o motor só recebe os reativados de verdade */
    Motor.usarExtras({ nivelamento: p.nivelamento, reativados: reativadosAtivos(p.reativados), uid: ctx.uid });
    const solto = id => Motor.liberado(PORID[id], p.cards, null, p.arquivados);
    /* card arquivado sai de todas as filas — e volta a elas se for desarquivado.
       A transparente total também: conta como dominada e nunca é servida
       (volta se for reativada). */
    const fora = id => Motor.arquivado(id, p.arquivados) || Motor.transparenteTotal(id) ||
      Motor.encerrado(id, p.cards[id]);

    /* A ordem que já existia é a dica de quem vem primeiro. «p.fila» é o
       formato antigo, de fila única: quem vinha de lá se distribui pelas
       etapas sem perder o lugar relativo. */
    const ordem = []
      .concat(p.filaEsPt || [], p.filaPtEs || [], p.dominados || [], p.fila || []);
    const posicao = {};
    ordem.forEach((id, i) => { if (posicao[id] === undefined) posicao[id] = i; });
    const lugar = id => (posicao[id] === undefined ? 1e9 : posicao[id]);

    const filas = { esPt: [], ptEs: [], dominados: [] };
    CARDS.forEach(c => {
      if (fora(c.id)) return;
      if (visto(c.id)) filas[Motor.filaDe(p.cards[c.id])].push(c.id);
      /* o presumido pelo nivelamento, ainda sem estado, mora com os
         dominados e volta na data dele (PLANO.md, 7.2) */
      else if (Motor.presumidoEm(c.id, p.cards)) filas.dominados.push(c.id);
    });
    for (const k in filas) filas[k].sort((a, b) => lugar(a) - lugar(b));
    p.filaEsPt = filas.esPt;
    p.filaPtEs = filas.ptEs;
    p.dominados = filas.dominados;
    anotarEntradaNaFila(p);

    const antes = Array.isArray(p.ineditos) ? p.ineditos : [];
    const conhecidos = new Set(antes);
    /* nem a transparente total nem o presumido estreiam como card novo */
    /* o card de leitura (PLANO.md, 9.2) só estreia para quem estuda um texto que o pede */
    const deTexto = palavrasDosAtivos(p);
    const ativosIds = new Set(TRILHAS ? textosAtivosDe(p).map(x => x.id) : []);
    const novo = id => !visto(id) && !fora(id) && !Motor.conhecidaSemEstado(id, p.cards) && solto(id) &&
      (TRILHAS ? daTrilha(id, deTexto, ativosIds, p) : (!Motor.ehLeitura(id) || deTexto.has(id)));
    p.ineditos = antes.filter(id => PORID[id] && novo(id))
      .concat(CARDS.filter(c => !conhecidos.has(c.id) && novo(c.id)).map(c => c.id));

    delete p.fila;          // formato antigo, de fila única
    delete p.desdeInedito;  // a contagem regressiva deu lugar ao sorteio

    /* ── a série das etapas ──
       Ninguém anotava isso, e refazer o caminho pelo histórico dos cards dava
       só uma estimativa: o histórico guarda doze respostas por card, e as
       regras mudaram várias vezes no percurso. Mas o repositório de dados
       guarda o progresso.json inteiro a cada sincronização — 442 fotografias
       do baralho, com a etapa de cada card. Dali sai a série EXATA, e é ela
       que o data/historico.js traz pronta.

       Semeia uma vez, e daí em diante o app mesmo vai anotando ponto a ponto.
       A semente só entra se este progresso for mesmo a continuação daquele
       histórico: num navegador de outra pessoa, com dez respostas dadas, a
       curva de mil e quinhentas não é dela. */
    if (!Array.isArray(p.serie)) p.serie = [];
    /* A versão anterior anotava quatro números, com os dominados num bolo só,
       e bolo não se divide por degrau depois. Série nesse formato sai inteira,
       e a semente nova — que já vem dividida, e cobre até a última
       sincronização — entra no lugar. */
    if (p.serie.some(pt => !Array.isArray(pt) || pt.length !== 9)) p.serie = [];
    const semente = (window.HISTORICO_RAW && window.HISTORICO_RAW.serie) || [];
    if (!p.serie.length && semente.length) {
      const fim = semente[semente.length - 1][0];
      if ((p.totais && p.totais.respostas || 0) >= fim - 50) p.serie = semente.slice();
    }

    /* ── o diário, a retenção e o custo do domínio ──
       Mesma semente, mesma guarda. O diário tira do repositório de dados cada
       resposta dada desde o primeiro dia; o que veio depois da última
       fotografia sai do histórico dos próprios cards, que ainda o guarda.
       Para quem não é a continuação daquele histórico, o diário começa só do
       histórico dos cards — é pouco, mas é dele. */
    const raw = window.HISTORICO_RAW || {};
    const continua = semente.length &&
      (p.totais && p.totais.respostas || 0) >= semente[semente.length - 1][0] - 50;
    if (!p.diario || typeof p.diario !== 'object') {
      p.diario = continua && raw.diario ? JSON.parse(JSON.stringify(raw.diario)) : {};
      const desde = continua ? (raw.ate || '') : '';
      Object.keys(p.cards).forEach(id => (p.cards[id].historico || []).forEach(h => {
        if (h && h.em && h.em > desde) Motor.anotarDiario(p.diario, h, h.em);
      }));
    }
    if (!Array.isArray(p.retencao) || p.retencao.length !== Motor.DIAS_DOMINADO.length) {
      p.retencao = continua && raw.retencao ? raw.retencao.map(g => g.slice())
        : Motor.DIAS_DOMINADO.map(() => [0, 0]);
    }
    /* ── a estreia de cada card ──
       O dia em que ele apareceu pela primeira vez, para o gráfico de cards
       novos por dia. O card só guarda as últimas doze respostas, e nos mais
       rodados a primeira já se foi: aí quem sabe é a semente, que leu todas
       as fotografias. Sem semente, vale a resposta mais antiga que sobrou —
       exata enquanto o histórico ainda está inteiro. */
    Object.keys(p.cards).forEach(id => {
      const e = p.cards[id];
      if (!e || e.estreia || !e.vistas) return;
      const daSemente = continua && raw.estreias && raw.estreias[id];
      const h = (e.historico || []).map(x => x && x.em).filter(Boolean).sort()[0];
      const doCard = h ? Motor.diaLocal(h) : '';
      e.estreia = daSemente && (!doCard || daSemente < doCard) ? daSemente : doCard || daSemente || undefined;
      if (!e.estreia) delete e.estreia;
    });
    if (continua && raw.ateDominar) {
      Object.keys(raw.ateDominar).forEach(id => {
        const e = p.cards[id];
        if (e && e.ateDominar === undefined) e.ateDominar = raw.ateDominar[id];
      });
    }


    /* O relógio saiu do motor (out/2026), e com ele o que o progresso guardava
       por causa dele: a conta de velocidades de cada card, o tempo e a
       classificação em cada resposta do histórico, e as faixas de tempo do
       diário. Eram 18% do progresso.json, que sobe e desce inteiro a cada
       três respostas. O tempo de cada resposta continua no log da
       sessão, que é onde a calibragem o procura. */
    Object.keys(p.cards).forEach(id => {
      const e = p.cards[id];
      delete e.velocidades;
      (e.historico || []).forEach(h => { delete h.ms; delete h.velocidade; delete h.pausado; });
    });
    if (p.diario && typeof p.diario === 'object') {
      Object.keys(p.diario).forEach(d => { if (p.diario[d]) { delete p.diario[d].m; delete p.diario[d].e; } });
    }

    ordenarIneditos(p);
    return p;
  }

  /* ── a passagem da posição para a urgência ──
     Card que já estava na fila antes da urgência não sabe quando entrou nem
     que distância pediu. Sai das duas coisas que o progresso ainda tem:

       espera     quantos cards foram respondidos depois da última vez dele —
                  pelo «ultima» de cada um. Conta cards, não respostas, então
                  é um piso; mas separa bem o card de ontem do parado há dias.
       distância  a posição que ele ocupava, dividida pela chance da fila —
                  a mesma conta da regra antiga, ao contrário —, entre 7 e
                  100. O teto é baixo de propósito: lá no fundo da fila, a
                  posição já não dizia o que o card pediu, dizia quantos
                  empurrões ele levou.

     Os presos saem com espera grande e entram logo na roda; o card que tinha
     acabado de voltar para a posição três continua logo ali.

     Card que está em fila e perdeu o «naFila» por outro caminho (uma
     sincronização com aparelho de versão antiga) passa pela mesma conta. */
  function anotarEntradaNaFila(p) {
    const respostas = (p.totais && p.totais.respostas) || 0;
    const faltam = [['esPt', p.filaEsPt], ['ptEs', p.filaPtEs]]
      .some(([, f]) => f.some(id => !p.cards[id].naFila));
    if (!faltam) return;
    const quando = Object.keys(p.cards)
      .map(id => Date.parse(p.cards[id].ultima) || 0).sort((a, b) => a - b);
    const depoisDe = t => {                  // quantos têm «ultima» maior que t
      let lo = 0, hi = quando.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (quando[m] <= t) lo = m + 1; else hi = m; }
      return quando.length - lo;
    };
    const chances = Motor.chancesDasFilas(p.cards, Motor.alvoDaFila(p.diario), p.arquivados);
    [['esPt', p.filaEsPt], ['ptEs', p.filaPtEs]].forEach(([k, fila]) => {
      fila.forEach((id, i) => {
        const e = p.cards[id];
        if (e.naFila) return;
        const distancia = Math.max(7, Math.min(100, Math.round((i + 1) / (chances[k] || 1))));
        e.naFila = { desde: respostas - depoisDe(Date.parse(e.ultima) || 0), distancia: distancia };
      });
    });
  }

  /* A escolha dos textos em vigor (o automático, sem escolha da pessoa) e as
     palavras de todos os textos ativos. O automático só é escolhido depois do
     nivelamento (ou da primeira resposta), para pular o poema que a pessoa já
     lê pela metade. */
  function textosAtivosDe(p) {
    if (!TEXTOS.length) return [];
    const tx = p.textos;
    if (p.nivelamento || Object.keys(p.cards || {}).length) {
      const e = Motor.escolhaDosTextos(tx.emVista.escolha, TEXTOS, p.cards, p.arquivados || {}, tx.lidos, Date.now());
      if (e !== tx.emVista.escolha) tx.emVista.escolha = e;
    }
    return Motor.textosAtivos(tx.emVista.escolha, TEXTOS, tx.lidos);
  }
  function palavrasDosAtivos(p) {
    return new Set(textosAtivosDe(p).flatMap(x => Motor.requeridas(x)));
  }

  /* No modo trilhas, o que pode estrear: a palavra do texto zero ou de um texto escolhido; o
     conceito (a ordem decide quando, ver ordenarTrilhas); a primeira frase; o trecho de um
     texto escolhido; e a frase de uso, que só chega aqui com as palavras dela dominadas. */
  function daTrilha(id, deTexto, ativosIds, p) {
    const c = PORID[id];
    if (!c) return false;
    if (c.tipo === 'palavra') return TZ_PALAVRAS.has(id) || deTexto.has(id);
    if (c.tipo === 'conceito') return true;
    if (c.tipo === 'forma') return formaDaTrilha(c, ativosIds, p);
    /* a flexão espera o card do lema: o dicionário primeiro, depois cada forma */
    if (c.tipo === 'flexao') return !!(p.cards[c.lema] && p.cards[c.lema].vistas) || Motor.arquivado(c.lema, p.arquivados || {});
    if (c.texto) return ativosIds.has(c.texto);
    return true;
  }

  /* O card de forma (LATIM.md §3.6) estreia depois do verso de onde vem, se o texto do verso
     ainda está escolhido e se a pessoa está entre as que o recebem (Motor.formaPronta). */
  function formaDaTrilha(c, ativosIds, p) {
    const de = PORID[c.de] || {};
    if (de.texto && !ativosIds.has(de.texto)) return false;
    return Motor.formaPronta(c, p.cards, p.arquivados || {});
  }

  /* O baralho de inéditos é ordenado pelo desempenho: sai primeiro o nível
     que você ainda não domina mas já consegue acompanhar. Como agora ele é
     uma lista à parte, basta reordená-la — não há posição alheia a respeitar. */
  function ordenarIneditos(p) {
    /* uma palavra avulsa a cada seis estreias de palavra (pedido do Gere) */
    const PALAVRAS_PEDIDAS_POR_AVULSA = 5;
    if (!p.ineditos || p.ineditos.length < 2) return;
    if (TRILHAS) { ordenarTrilhas(p); return; }
    /* A frase que a palavra acabou de destravar fura a fila. Estar aqui já
       quer dizer que ela foi liberada — presa nenhuma chega a este ponto —,
       e a promessa é que ela seja o próximo card novo. Entre duas, primeiro
       a da palavra vencida mais recentemente. Isso vive na ordenação, e não
       só no momento de dominar, para sobreviver a recarregar e sincronizar.

       Mas só as frescas. Quando a leva 10 deu uma frase a cada palavra, 73
       delas nasceram destravadas de uma vez — as palavras já estavam
       dominadas —, e furando a fila todas juntas elas seriam os próximos 73
       cards novos, sem uma expressão, um verbo ou uma palavra no meio. Então
       furam a fila no máximo FRESCAS_NA_FRENTE, liberadas nas últimas 24
       horas; as outras entram intercaladas, uma a cada DOIS cards de outro
       tipo. Para palavra dominada antes de existir «dominadoEm», a data que
       sobra é o «ultima», que a revisão do dominado também renova — por isso
       o teto, e não só a janela. */
    /* Desde outubro de 2026: toda frase que está aqui já destravou (todas as
       palavras dela estão dominadas ou arquivadas), e as palavras são de dois
       tipos — as que as frases em vista pedem, que estreiam primeiro, e as
       avulsas, que entram uma a cada seis palavras (ver Motor.atualizarEmVista). */
    const presas = [], resto = [];
    p.ineditos.forEach(id => {
      const c = PORID[id] || {};
      ((c.tipo === 'frase' || c.tipo === 'contraste') && Motor.requeridas(c).length ? presas : resto).push(id);
    });
    const quando = id => Motor.venceuEm(PORID[id], p.cards, p.arquivados);
    presas.sort((a, b) => quando(b) - quando(a));

    const FRESCAS_NA_FRENTE = 2;
    const agora = Date.now();
    /* o contraste (PLANO.md §10) não fura a fila: as palavras dele destravam vários de uma vez, e
       eles entram intercalados, como as frases antigas */
    const frescas = presas.filter(id => (PORID[id] || {}).tipo !== 'contraste' && agora - quando(id) < 864e5)
      .slice(0, FRESCAS_NA_FRENTE);
    const antigas = presas.filter(id => frescas.indexOf(id) < 0);

    /* as taxas do nivelamento, quando houver, são o ponto de partida de cada
       nível (o prior de Motor.dominioPorNivel) */
    const pesos = Motor.pesosDeNivel(Motor.dominioPorNivel(CARDS, p.cards,
      p.nivelamento && p.nivelamento.porNivel));
    p.emVista = Motor.atualizarEmVista(p.emVista, CARDS, PORID, p.cards, p.arquivados || {}, pesos);
    const naFila = new Set(resto);
    /* As palavras dos textos ativos (PLANO.md, 9.1) ficam com 1 de cada
       TEXTO_A_CADA vagas de card novo (2,5 desde 24/10/2026: duas em cada
       cinco), na ordem de leitura e em rodízio entre os textos; saem das
       outras listas para não estrear por dois caminhos. */
    const ativos = textosAtivosDe(p);
    const doTexto = Motor.palavrasDosTextos(ativos, p.cards, p.arquivados || {}).filter(id => naFila.has(id));
    const doTextoSet = new Set(doTexto);
    const pedidas = Motor.palavrasEmVista(p.emVista, PORID, p.cards, p.arquivados || {})
      .filter(id => naFila.has(id) && !doTextoSet.has(id));
    const pedidasSet = new Set(pedidas.concat(doTexto));
    /* As frases de primeiros passos («requerTodas»: [], pedido do Gere,
       07/10/2026) não esperam palavra nenhuma: quem começa do zero já vê
       frases desde o primeiro dia, uma a cada duas palavras novas. */
    const livre = id => { const c = PORID[id] || {}; return c.tipo === 'frase' && Array.isArray(c.requerTodas) && !c.requerTodas.length; };
    /* na ordem do arquivo: «Olá» antes de «A conta, por favor» */
    const livres = resto.filter(id => !pedidasSet.has(id) && livre(id))
      .sort((x, y) => CARDS.indexOf(PORID[x]) - CARDS.indexOf(PORID[y]));
    const avulsas = Motor.ordenarNovos(resto.filter(id => !pedidasSet.has(id) && !livre(id)), pesos, PORID);
    /* A fila se refaz a cada estreia, então a frase livre não pode ter um
       lugar fixo nela (ficaria sempre em terceiro e nunca chegaria à
       frente): conta-se quantas estreias houve desde a última frase livre,
       e a próxima entra quando chega a vez dela — uma a cada três novos. */
    const semLivres = intercalar(pedidas, avulsas, PALAVRAS_PEDIDAS_POR_AVULSA);
    let ordemDoResto = semLivres;
    if (livres.length) {
      const estreias = Object.keys(p.cards).filter(id => p.cards[id].estreouNa !== undefined)
        .sort((x, y) => p.cards[y].estreouNa - p.cards[x].estreouNa);
      let desde = 0;
      while (desde < estreias.length && !livre(estreias[desde])) desde++;
      const vez = Math.max(0, 2 - desde);
      ordemDoResto = semLivres.slice(0, vez).concat([livres[0]], intercalar(semLivres.slice(vez), livres.slice(1), 2));
    }
    let fila = frescas.concat(intercalar(ordemDoResto, antigas, 2));
    /* A fila se refaz a cada estreia, então a palavra do texto também não tem
       lugar fixo: conta-se quantas estreias houve desde a última palavra de
       texto, e a próxima entra quando chega a vez dela. Entra por último,
       depois das frases, para nada empurrar o lugar dela. */
    if (doTexto.length) {
      const dosTextos = new Set(ativos.flatMap(x => Motor.requeridas(x)));
      const estreias = Object.keys(p.cards).filter(id => p.cards[id].estreouNa !== undefined)
        .sort((x, y) => p.cards[y].estreouNa - p.cards[x].estreouNa);
      const { vez, cada } = Motor.vezDoTexto(estreias, id => dosTextos.has(id));
      fila = fila.slice(0, vez).concat([doTexto[0]], intercalar(fila.slice(vez), doTexto.slice(1), cada));
    }
    p.ineditos = semConjuntoSeguido(fila);
  }

  /* ── a ordem do modo trilhas (cards/LATIM.md §5) ──
     Na frente, até duas frases recém-destravadas (trecho de texto ou frase de uso). Depois,
     duas estreias do texto zero para uma dos textos escolhidos: no texto zero, frase a frase,
     ela (é livre) e as palavras dela; nos textos, as palavras na ordem de leitura, em rodízio.
     A palavra que os dois pedem vem pelo texto escolhido («pater» está no Glória e na 36ª frase
     inicial). As outras frases destravadas entram uma a cada duas estreias. Nada de avulsa nem
     de sorteio por nível: tudo sai dos textos.
     A fila se refaz a cada estreia, então nada que entra «um a cada dois» tem lugar fixo nela
     (ficaria sempre em terceiro e nunca chegaria à frente): conta-se quantas estreias houve
     desde a última daquele tipo, e a próxima entra quando chega a vez dela.
     O conceito entra por último, já com a ordem feita: logo antes do primeiro card que o pede
     (a frase, pelos «conceitos» dela; a palavra do texto, pelos do primeiro trecho em que ela
     aparece). A estreia de um conceito não conta na alternância. */
  function ordenarTrilhas(p) {
    const CADA = 2, FORMAS_SEGUIDAS = 2, CADA_FLEXAO_DE_TABELA = 3;
    const ehConceito = id => (PORID[id] || {}).tipo === 'conceito';
    const ehForma = id => (PORID[id] || {}).tipo === 'forma';
    const ehFlexao = id => (PORID[id] || {}).tipo === 'flexao';
    /* o card de forma que só o erro puxou sai quando o erro foi vencido (Motor.formaPronta) */
    const ativosAgora = new Set(textosAtivosDe(p).map(x => x.id));
    p.ineditos = p.ineditos.filter(id => !ehForma(id) || formaDaTrilha(PORID[id], ativosAgora, p));
    const pendentes = new Set(p.ineditos), postos = new Set();
    const pega = id => (pendentes.has(id) && !postos.has(id) ? (postos.add(id), [id]) : []);
    const ehPresa = id => { const c = PORID[id] || {}; return (c.tipo === 'frase' || c.tipo === 'contraste') && Motor.requeridas(c).length > 0; };
    const presas = p.ineditos.filter(ehPresa);
    const quando = id => Motor.venceuEm(PORID[id], p.cards, p.arquivados);
    presas.sort((a, b) => quando(b) - quando(a));
    const agora = Date.now();
    /* o contraste não fura a fila: os conceitos dos casos destravam muitos de uma vez, e eles
       entram intercalados, um a cada CADA estreias */
    const frescas = presas.filter(id => (PORID[id] || {}).tipo !== 'contraste' && agora - quando(id) < 864e5).slice(0, 2);
    const antigas = presas.filter(id => frescas.indexOf(id) < 0).map(id => [id]);
    presas.forEach(id => postos.add(id));
    const ativos = textosAtivosDe(p);
    const ativosIds = new Set(ativos.map(x => x.id));
    const conceitosDaPalavra = id => {
      const tr = TRECHOS.find(c => ativosIds.has(c.texto) && (c.requerTodas || []).indexOf(id) >= 0);
      return (tr && tr.conceitos) || [];
    };
    const dosTextos = [];
    for (const id of Motor.palavrasDosTextos(ativos, p.cards, p.arquivados || {})) {
      const bloco = pega(id);
      if (bloco.length) dosTextos.push(bloco);
    }
    const zero = [];
    for (const f of TZ_FRASES) {
      zero.push(...pega(f.id));
      (f.palavras || []).forEach(x => { if (x.c) zero.push(...pega(x.c)); });
      (f.palavras || []).forEach(x => { const fx = flexaoDe(x); if (fx) zero.push(...pega(fx)); });
    }
    /* as flexões que nenhuma leitura pede ainda (a tabela, a frase de uso), na ordem em que os
       lemas estrearam; ficam fora do resto e entram uma a cada quatro vagas */
    const estreiaDoLema = id => (p.cards[PORID[id].lema] || {}).estreouNa || 0;
    const deTabela = p.ineditos.filter(id => ehFlexao(id) && !postos.has(id))
      .sort((a, b) => estreiaDoLema(a) - estreiaDoLema(b) || CARDS.indexOf(PORID[a]) - CARDS.indexOf(PORID[b]));
    deTabela.forEach(id => postos.add(id));
    const resto = p.ineditos.filter(id => !postos.has(id) && !ehConceito(id) && !ehForma(id));
    const todasAsEstreias = Object.keys(p.cards).filter(id => p.cards[id].estreouNa !== undefined && !ehConceito(id))
      .sort((x, y) => p.cards[y].estreouNa - p.cards[x].estreouNa);
    const estreias = todasAsEstreias.filter(id => !ehForma(id));
    const desde = teste => { let n = 0; while (n < estreias.length && !teste(estreias[n])) n++; return n; };
    const palavrasDosTextos = new Set(ativos.flatMap(x => Motor.requeridas(x)));
    let fila = zero.concat(resto);
    if (dosTextos.length) fila = naVez(fila, dosTextos, desde(id => palavrasDosTextos.has(id)), CADA);
    if (antigas.length) fila = naVez(fila, antigas, desde(ehPresa), CADA);
    if (deTabela.length) {
      fila = naVez(fila, deTabela.map(id => [id]), desde(id => ehFlexao(id) && !FLEXAO_DE_LEITURA.has(id)), CADA_FLEXAO_DE_TABELA);
    }
    fila = frescas.concat(fila);
    /* Os cards de forma (LATIM.md §3.6) vêm logo depois do verso que os destravou, o verso mais
       recente primeiro e, nele, na ordem de leitura; no máximo FORMAS_SEGUIDAS de uma vez, e o
       resto nas vagas seguintes. A estreia de forma não conta na alternância de cima. */
    const formas = p.ineditos.filter(ehForma).sort((a, b) => {
      const ea = (p.cards[PORID[a].de] || {}).estreouNa || 0, eb = (p.cards[PORID[b].de] || {}).estreouNa || 0;
      return eb - ea || CARDS.indexOf(PORID[a]) - CARDS.indexOf(PORID[b]);
    });
    if (formas.length) {
      let seguidas = 0;
      while (seguidas < todasAsEstreias.length && ehForma(todasAsEstreias[seguidas])) seguidas++;
      const saidaComFormas = [];
      let f = 0, i = 0, vez = Math.max(0, FORMAS_SEGUIDAS - seguidas);
      while (f < formas.length) {
        for (let k = 0; k < vez && f < formas.length; k++) saidaComFormas.push(formas[f++]);
        if (f < formas.length && i < fila.length) saidaComFormas.push(fila[i++]);
        vez = FORMAS_SEGUIDAS;
      }
      fila = saidaComFormas.concat(fila.slice(i));
      formas.forEach(id => postos.add(id));
    }
    /* os conceitos, cada um antes do primeiro card que o pede; o que nenhum pede vai no fim */
    const pede = id => {
      const c = PORID[id] || {};
      return c.tipo === 'palavra' ? (palavrasDosTextos.has(id) ? conceitosDaPalavra(id) : []) : (c.conceitos || []);
    };
    const saida = [];
    for (const id of fila) {
      pede(id).forEach(g => saida.push(...pega(g)));
      saida.push(id);
    }
    p.ineditos = semConjuntoSeguido(saida.concat(p.ineditos.filter(id => ehConceito(id) && !postos.has(id))));
  }

  /* Dois cards de contraste do mesmo conjunto (LATIM.md §3.7) nunca seguidos: têm as mesmas
     alternativas, e o segundo logo depois do primeiro se resolve por eliminação. O que
     encostaria no irmão dá a vez ao próximo card de outro conjunto. */
  function conjuntoDe(id) { return (PORID[id] || {}).conjunto || null; }
  function semConjuntoSeguido(lista) {
    const saida = [], resto = lista.slice();
    while (resto.length) {
      const antes = saida.length ? conjuntoDe(saida[saida.length - 1]) : null;
      let i = antes ? resto.findIndex(id => conjuntoDe(id) !== antes) : 0;
      if (i < 0) i = 0;
      saida.push(resto.splice(i, 1)[0]);
    }
    return saida;
  }

  /* Os blocos de «poucos» entram um a cada «cada» cards de «muitos», e o primeiro já depois
     de «cada» menos «desde» (as estreias que houve desde o último daquele tipo). */
  function naVez(muitos, poucos, desde, cada) {
    const vez = Math.max(0, cada - desde);
    return muitos.slice(0, vez).concat(poucos[0], intercalar(muitos.slice(vez), poucos.slice(1), cada).flat());
  }

  /* «cada» cards de «muitos», depois um de «poucos», até acabarem os dois. */
  function intercalar(muitos, poucos, cada) {
    const saida = [];
    let i = 0, j = 0;
    while (i < muitos.length || j < poucos.length) {
      for (let k = 0; k < cada && i < muitos.length; k++) saida.push(muitos[i++]);
      if (j < poucos.length) saida.push(poucos[j++]);
    }
    return saida;
  }

  /* Grava no IndexedDB, um instante depois: uma resposta mexe no progresso
     em três lugares seguidos, e uma gravação só basta. «agora» é para
     quando a aba vai sumir. */
  let esperaSalvar = null, apagando = false;
  function salvarProgresso(agora) {
    if (apagando) return;
    progresso.atualizado_em = new Date().toISOString();
    clearTimeout(esperaSalvar);
    if (agora) { TaioeArmazem.gravar('progresso', CHAVE, progresso); return; }
    esperaSalvar = setTimeout(() => TaioeArmazem.gravar('progresso', CHAVE, progresso), 400);
  }

  /* A sessão é só desta abertura, para o «Nesta sessão» da tela inicial: as
     respostas sobem pela fila da sincronia. */
  function novaSessao() {
    return { inicio: new Date().toISOString(), eventos: [] };
  }

  function estadoDe(id) {
    return progresso.cards[id] || null;
  }

  /* O estado que a fila enxerga: o de verdade, ou — para o presumido pelo
     nivelamento que ainda não foi respondido — o dominado calculado pelo
     motor, com a data de volta dele. Nunca é gravado (PLANO.md, 7.2). */
  function estadoParaFila(id) {
    return progresso.cards[id] || Motor.estadoDoPresumido(id, progresso.cards) || null;
  }

  /* ═══════════════ telas ═══════════════ */

  /* ── o menu do topo ──
     Os cinco destinos ficam num painel que desce do botão do canto (ideia do
     Gere, 21/10/2026): com ícone e nome, ninguém precisa adivinhar o que é
     cada um. Escolher um item, tocar fora, o Esc ou trocar de tela fecham. */
  function menuAberto() { return !el['menu-topo'].hidden; }
  function abrirMenu() {
    el['menu-topo'].hidden = false;
    el['btn-menu'].setAttribute('aria-expanded', 'true');
  }
  function fecharMenu(devolverFocoAoBotao) {
    if (!menuAberto()) return;
    el['menu-topo'].hidden = true;
    el['btn-menu'].setAttribute('aria-expanded', 'false');
    if (devolverFocoAoBotao) el['btn-menu'].focus({ preventScroll: true });
  }
  el['btn-menu'].addEventListener('click', () => (menuAberto() ? fecharMenu() : abrirMenu()));
  el['menu-topo'].addEventListener('click', e => { if (e.target.closest('.item-menu')) fecharMenu(); });
  document.addEventListener('pointerdown', e => {
    if (menuAberto() && !e.target.closest('.acoes-topo')) fecharMenu();
  });
  /* Com o menu aberto, as teclas são dele: o Esc fecha, e o Enter num item
     não pode também avançar o card que está atrás. */
  document.addEventListener('keydown', e => {
    if (!menuAberto()) return;
    if (e.key === 'Escape') { e.preventDefault(); fecharMenu(true); }
    e.stopPropagation();
  }, true);

  /* ── as línguas em estudo, no topo (pedido do Gere, 24/10/2026) ──
     Com dois ou mais cursos começados (com resposta na conta), um botão para
     cada um, à esquerda do menu, na ordem de sempre; o atual fica cheio.
     Valem os cursos da mesma língua de interface (ctx.cursosDaLingua), os que
     se trocam sem mudar a língua do app. A lista fica guardada neste aparelho,
     para aparecer já na abertura, e a conta a confirma logo depois. */
  const caixaDosCursos = document.getElementById('cursos-topo');
  const CHAVE_CURSOS = 'cards:cursos:' + ctx.uid;
  function montarCursosDoTopo(comecados) {
    const ja = new Set((comecados || []).concat([ctx.curso]));
    const cursos = (ctx.cursosDaLingua || [ctx.curso]).filter(k => ja.has(k));
    caixaDosCursos.textContent = '';
    caixaDosCursos.hidden = cursos.length < 2 || document.querySelector('.acoes-topo').hidden;
    cursos.forEach(k => {
      const b = document.createElement('button');
      b.className = 'curso-topo';
      b.dataset.curso = k;
      b.setAttribute('aria-label', ctx.nomeDoCurso(k));
      if (k === ctx.curso) b.setAttribute('aria-current', 'true');
      const nome = document.createElement('span');
      nome.className = 'nome';
      nome.textContent = ctx.nomeDoCurso(k);
      const sigla = document.createElement('span');
      sigla.className = 'sigla';
      sigla.textContent = String(ctx.linguaDoCurso(k) || k).toUpperCase();
      b.append(nome, sigla);
      caixaDosCursos.appendChild(b);
    });
    ajustarCursosDoTopo();
  }
  /* os nomes, se couberem na linha do topo; senão, as siglas */
  function ajustarCursosDoTopo() {
    if (caixaDosCursos.hidden) return;
    const topo = caixaDosCursos.parentNode;
    caixaDosCursos.classList.remove('curtos');
    if (topo.scrollWidth > topo.clientWidth + 1) caixaDosCursos.classList.add('curtos');
  }
  async function carregarCursosDoTopo() {
    const guardados = lerLocal(CHAVE_CURSOS);
    montarCursosDoTopo(Array.isArray(guardados) ? guardados : []);
    /* o revisor geral lê os contadores de todo mundo: o filtro pela conta é obrigatório */
    const r = await ctx.sb.schema('cards').from('contadores').select('curso')
      .eq('usuario_id', ctx.uid).gt('respostas', 0).then(x => x, () => ({ error: true }));
    if (!r || r.error || !Array.isArray(r.data)) return;
    const lista = r.data.map(x => x.curso);
    guardarLocal(CHAVE_CURSOS, lista);
    montarCursosDoTopo(lista);
  }
  caixaDosCursos.addEventListener('click', e => {
    const b = e.target.closest('.curso-topo');
    if (!b || b.getAttribute('aria-current') === 'true' || b.disabled) return;
    caixaDosCursos.querySelectorAll('.curso-topo').forEach(x => { x.disabled = true; });
    irParaCurso(b.dataset.curso);
  });
  window.addEventListener('resize', ajustarCursosDoTopo);

  /* Qual botão do topo corresponde a cada tela. A de card não tem botão:
     ela é para onde o «começar» leva, não um destino do menu. */
  const BOTAO_DA_TELA = {
    'tela-inicio': 'btn-inicio', 'tela-cards': 'btn-cards',
    'tela-painel': 'btn-painel', 'tela-config': 'btn-config',
    'tela-texto': 'btn-texto'
  };

  function mostrar(tela) {
    fecharMenu();
    ['tela-inicio', 'tela-comeco', 'tela-card', 'tela-painel', 'tela-config', 'tela-cards', 'tela-texto']
      .forEach(t => el[t].classList.toggle('oculto', t !== tela));
    el.dica.hidden = true;
    const aceso = BOTAO_DA_TELA[tela];
    Object.values(BOTAO_DA_TELA).forEach(b => el[b].classList.toggle('aqui', b === aceso));
    /* A avaliação do começo é a página principal enquanto dura: sem os
       botões do topo, que levariam para telas ainda vazias no meio do teste. */
    const nav = document.querySelector('.acoes-topo');
    if (nav) nav.hidden = tela === 'tela-comeco';
    acertarMarca(tela === 'tela-inicio' || tela === 'tela-comeco');
    if (caixaDosCursos.children.length > 1) caixaDosCursos.hidden = tela === 'tela-comeco';
    ajustarCursosDoTopo();
    /* Tela nova abre no topo. Sem isto o painel herdava a rolagem de onde
       se estava — no meio do feedback de um card, em geral — e abria já nos
       gráficos. O card fica de fora: ele tem a sua subida (voltarAoTopo). */
    if (tela !== 'tela-card') {
      if (rolagemAtual) rolagemAtual.parar();
      window.scrollTo(0, 0);
    }
  }

  /* A marca do topo (pedido do Gere, 07/10/2026): na página inicial dos
     Cards é só «Taioé» e leva ao início da Taioé; em qualquer outra tela é
     «Taioé Cards» e leva à página inicial dos Cards, como na Biblioteca. */
  const marca = document.querySelector('.topo .marca');
  function acertarMarca(naInicial) {
    if (!marca) return;
    const chave = naInicial ? 'topo.marca' : 'topo.marcaCards';
    marca.innerHTML = naInicial ? 'Taioé' : 'Taioé <span>Cards</span>';
    marca.setAttribute('href', naInicial ? '/' : '/cards/');
    marca.setAttribute('data-i18n-attr', 'title:' + chave);
    marca.title = t(chave);
    marca.classList.toggle('fora-do-inicio', !naInicial);
  }
  if (marca) marca.addEventListener('click', e => {
    if (!marca.classList.contains('fora-do-inicio')) return;
    e.preventDefault();
    irParaInicio();
  });

  function atualizarPlacar() {
    const tt = progresso.totais;
    const vistos = Object.keys(progresso.cards).length;
    const taxa = tt.respostas ? Math.round(100 * tt.acertos / tt.respostas) : 0;
    /* Sem o total do baralho (pedido do Gere, 07/10/2026): quem começa não
       precisa ver quantos milhares faltam, só o que já andou. */
    el.placar.innerHTML = tn('placar.cards', vistos) + ' · ' +
      t('placar.resto', { respostas: tt.respostas, taxa: taxa });

    const naSessao = sessao.eventos.length;
    const acertosSessao = sessao.eventos.filter(e => e.acertou).length;
    el['resumo-inicio'].innerHTML = (naSessao
      ? t('inicio.sessao', { n: naSessao, certas: acertosSessao }) : '') +
      (vistos ? tn('inicio.vistos', vistos) : t('inicio.nenhum'));
  }

  /* ═══════════════ fluxo do card ═══════════════ */

  /* ── de qual fila vem o próximo card ──
     Dois passos (pedido do Gere, 24/10/2026; ver Motor.escolherProximo):
     primeiro o sorteio entre card novo e revisão, com a chance que persegue a
     meta da ida; depois a escolha dentro do grupo sorteado — o novo pela ordem
     dos inéditos, a revisão pelo dominado vencido, pelo atrasado e pelo
     sorteio entre ida e volta.

     Se não sobrou nada pronto em lugar nenhum, entra o dominado de data mais
     próxima: ficar sem card seria pior do que adiantar um. */
  /* Quantos cards vieram desde o último dominado. Começa alto: abrir o app
     não precisa esperar espaço nenhum. */
  let desdeDominado = 99;
  /* o conjunto do card de contraste que acabou de sair: o irmão dele espera um card */
  let conjuntoAnterior = null;

  function tirarProximoId() {
    const id = escolherProximoId();
    const e = id && estadoParaFila(id);
    desdeDominado = e && e.etapa === 'dominado' ? 0 : desdeDominado + 1;
    conjuntoAnterior = id ? conjuntoDe(id) : null;
    return id;
  }

  /* O que a escolha precisa saber agora; o painel usa o mesmo, para mostrar a
     chance de verdade. Só concorrem os cards que já esperaram o intervalo
     mínimo (ver Motor.podeVoltar). */
  function contextoDaEscolha() {
    const agora = new Date().toISOString();
    const respostas = progresso.totais.respostas;
    const livre = id => Motor.podeVoltar(progresso.cards[id], respostas) &&
      !(conjuntoAnterior && conjuntoDe(id) === conjuntoAnterior);
    return {
      agora: agora,
      estados: progresso.cards,
      arquivados: progresso.arquivados,
      alvo: Motor.alvoDaFila(progresso.diario),
      respostas: respostas,
      temIneditos: progresso.ineditos.length > 0,
      livres: { esPt: progresso.filaEsPt.filter(livre), ptEs: progresso.filaPtEs.filter(livre) },
      vencidos: progresso.dominados.filter(id =>
        estadoParaFila(id) && !Motor.esperando(estadoParaFila(id), agora)).length,
      desdeDominado: desdeDominado
    };
  }

  function escolherProximoId() {
    const c = contextoDaEscolha();
    const filaDe = k => (k === 'esPt' ? progresso.filaEsPt : progresso.filaPtEs);
    const tirar = (k, id) => filaDe(k).splice(filaDe(k).indexOf(id), 1)[0];
    const e = Motor.escolherProximo(c);
    if (e && e.grupo === 'novo') return proximoNovo();
    if (e && e.fila === 'dominados') return progresso.dominados.splice(dominadoMaisProximo(c.agora), 1)[0];
    if (e) return tirar(e.fila, e.id);

    /* Nada pronto: o vencido que ainda esperava espaço, ou o dominado de data
       mais próxima. */
    const vencido = dominadoMaisProximo(c.agora);
    if (vencido !== null) return progresso.dominados.splice(vencido, 1)[0];
    const proximo = dominadoMaisProximo(null);
    if (proximo !== null) return progresso.dominados.splice(proximo, 1)[0];
    /* Nada novo, nada vencido e ninguém fora do intervalo: antes repetir um
       card cedo do que ficar sem card. Vem o que espera há mais tempo. */
    let melhor = null;
    ['esPt', 'ptEs'].forEach(k => filaDe(k).forEach(id => {
      const d = (progresso.cards[id].naFila || {}).desde;
      if (melhor === null || d < melhor.desde) melhor = { k, id, desde: d };
    }));
    return melhor ? tirar(melhor.k, melhor.id) : null;
  }

  function proximoNovo() {
    /* A vaga de card novo pode ser de um desafio (PLANO.md, 7.4): o motor
       diz se é a hora e qual; a frase ainda presa vem como prévia. */
    const desafio = Motor.escolherDesafio(CARDS, progresso.cards, contextoDoDesafio());
    if (desafio && PORID_FONTE[desafio.card.id]) {
      const i = progresso.ineditos.indexOf(desafio.card.id);
      if (i >= 0) progresso.ineditos.splice(i, 1);
      desafioAtual = { id: desafio.card.id, previa: !!desafio.previa };
      return desafio.card.id;
    }
    /* Em cada cinco cards novos, pelo menos um é de vocabulário (pedido do
       Gere, 03/10): se as quatro últimas estreias foram frase, a próxima é
       a primeira palavra da fila de inéditos. É
       só um teto para as frases; palavra seguida pode vir à vontade. */
    if (quatroFrasesSeguidas()) {
      ordenarIneditos(progresso);
      const i = progresso.ineditos.findIndex(id => (PORID[id] || {}).tipo === 'palavra');
      if (i >= 0) return progresso.ineditos.splice(i, 1)[0];
    }
    ordenarIneditos(progresso);
    /* o contraste do mesmo conjunto do card anterior espera um card (LATIM.md §3.7) */
    const i = conjuntoAnterior ? progresso.ineditos.findIndex(id => conjuntoDe(id) !== conjuntoAnterior) : 0;
    return progresso.ineditos.splice(Math.max(0, i), 1)[0];
  }

  /* As quatro estreias mais recentes, pela resposta em que cada card estreou
     («estreouNa»). Card que estreou antes do campo existir não entra. */
  function quatroFrasesSeguidas() {
    /* o card de forma do latim não conta: ele vem colado ao verso, e é rápido */
    const recentes = Object.keys(progresso.cards)
      .filter(id => progresso.cards[id].estreouNa !== undefined && (PORID[id] || {}).tipo !== 'forma')
      .sort((a, b) => progresso.cards[b].estreouNa - progresso.cards[a].estreouNa)
      .slice(0, 4);
    return recentes.length === 4 && recentes.every(id => (PORID[id] || {}).tipo !== 'palavra');
  }

  /* O índice do dominado que já venceu a data — ou, com «agora» nulo, o de
     data mais próxima, vencido ou não. */
  function dominadoMaisProximo(agora) {
    let melhor = -1;
    progresso.dominados.forEach((id, i) => {
      const e = estadoParaFila(id);
      if (!e) return;
      if (agora && Motor.esperando(e, agora)) return;
      const atual = melhor >= 0 ? estadoParaFila(progresso.dominados[melhor]) : null;
      if (!atual || String(e.voltaEm) < String(atual.voltaEm)) melhor = i;
    });
    return melhor >= 0 ? melhor : null;
  }

  /* Devolve o card para a fila da etapa em que ele ficou. Ele não ganha
     posição: anota quando entrou e a distância, em respostas, que pediu — e
     é pela urgência que sai (ver Motor.escolherNaFila). A ordem do array
     deixou de significar alguma coisa. O dominado não entra nessa conta —
     ele espera data. */
  function guardarNaFila(id, est, r) {
    /* Uma sincronização no meio do card refaz as filas pela etapa de cada um
       (ver conciliarFila) e devolve o card que está na tela à fila dele — ou
       aos inéditos, se era a estreia. Sem tirar antes, ele ficava duas vezes
       na fila, e o inédito já respondido podia sair de novo como «novo». */
    retirarDasFilas(id);
    const novo = progresso.ineditos.indexOf(id);
    if (novo >= 0) progresso.ineditos.splice(novo, 1);

    const alvo = Motor.filaDe(est);
    /* o card de forma acertado sai de vez (LATIM.md §3.6) */
    if (alvo === 'fora') {
      delete est.naFila;
      return { fila: alvo, distancia: null };
    }
    if (alvo === 'dominados') {
      delete est.naFila;
      if (progresso.dominados.indexOf(id) < 0) progresso.dominados.push(id);
      return { fila: alvo, distancia: null };
    }
    const fila = alvo === 'esPt' ? progresso.filaEsPt : progresso.filaPtEs;
    const distancia = Motor.distanciaNaFila(est, r);
    est.naFila = { desde: progresso.totais.respostas, distancia: distancia };
    fila.push(id);
    return { fila: alvo, distancia: distancia };
  }

  /* Tira o card de onde quer que ele esteja — a resposta sobre conhecimento
     prévio chega depois do registro e pode mudar a distância. */
  /* ── «já conheço essa palavra» (antes, «não quero aprender este card») ──
     O card sai do jogo; se for de vocabulário, a palavra passa a contar como
     dominada para destravar frases e textos (ver Motor.liberadaEm). É para o
     óbvio, que custaria cinco respostas sem ensinar nada. Volta pela lista
     de cards, no filtro «arquivados», se foi engano. */
  function arquivarCardAtual() {
    if (!cardAtual) return;
    const c = PORID[cardAtual.id] || cardAtual;
    const pergunta = t(c.tipo === 'palavra' || c.tipo === 'flexao' ? 'arquivar.perguntaPalavra'
      : c.tipo === 'conceito' ? 'arquivar.perguntaConceito' : 'arquivar.perguntaFrase', { x: c[L] });
    if (!window.confirm(pergunta)) return;
    marcarArquivo(c.id, true);
    statusSync(t('arquivar.feito', { x: c[L] }), 'ok');
    respostaPendente = null;
    proximoCard();
  }

  /* Onde o «já conheço» fica: logo acima do «Próximo», para não passar
     despercebido. Só aparece depois da resposta, e só se ela saiu certa de
     primeira — sem «deu quase» e sem a segunda chance dos avisos (pedido do
     Gere, 20/10/2026: antes ele ficava à mostra desde a pergunta). */
  let jaConhecoNoCard = false;
  function posicionarJaConheco(respondido) {
    const linha = el['btn-arquivar'].parentElement;
    linha.classList.toggle('oculto', !(jaConhecoNoCard && respondido));
    const antes = respondido ? el['btn-proximo']
      : modoAtual === 'multipla' ? el['area-nao-sei-multipla']
      : el['btn-responder'].parentElement;
    if (linha.nextElementSibling !== antes) antes.parentElement.insertBefore(linha, antes);
  }

  function marcarArquivo(id, ativo) {
    progresso.arquivados = progresso.arquivados || {};
    progresso.arquivados[id] = { em: new Date().toISOString(), ativo: ativo };
    retirarDasFilas(id);
    const i = progresso.ineditos.indexOf(id);
    if (i >= 0) progresso.ineditos.splice(i, 1);
    conciliarFila(progresso);
    salvarProgresso();
    atualizarPlacar();
    if (Sinc) Sinc.agendar(3000);   // o arquivo é extra do curso: sobe com gravar_extras
  }

  function retirarDasFilas(id) {
    [progresso.filaEsPt, progresso.filaPtEs, progresso.dominados].forEach(f => {
      const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1);
    });
  }

  function proximoCard() {
    /* no modo trilhas, sem texto escolhido não há o que estudar: a escolha vem antes */
    if (TRILHAS && !textosAtivosAgora().length) { abrirTexto(); return; }
    recolherFrasesLiberadas();
    const lido = textoParaLer();
    if (lido) { mostrarRecompensa(lido); return; }
    if (window.scrollY >= 2) el['tela-card'].style.minHeight = el['tela-card'].offsetHeight + 'px';
    /* o desafio, se vier, é marcado por proximoNovo durante a escolha */
    desafioAtual = null;
    const id = tirarProximoId();
    if (!id) { irParaInicio(); return; }
    const bruto = PORID_FONTE[id];
    if (!bruto) return proximoCard();
    /* O gênero é sorteado a cada aparição, e vale para o card inteiro: a
       pergunta, a resposta certa, as aceitas e os distratores saem todos do
       mesmo lado. O outro lado fica guardado para a nota. */
    generoAtual = Motor.temVariante(bruto) && Math.random() < 0.5 ? 1 : 0;
    cardAtual = Motor.formaDoCard(bruto, generoAtual);
    outraForma = Motor.temVariante(bruto) ? Motor.formaDoCard(bruto, 1 - generoAtual) : null;

    /* Sem estado, a fase é a da estreia: a «parecida» estreia na volta
       (Motor.estadoInicialDo); o presumido aparece como dominado. */
    const est = estadoParaFila(id) || Motor.estadoInicialDo(PORID[id] || { id: id });
    const fase = Motor.faseDe(est);
    modoAtual = fase.modo;
    direcaoAtual = fase.direcao;
    alvoAtual = Motor.resposta(cardAtual, direcaoAtual);
    respostaPendente = null;
    ultimoRegistro = null;
    chanceUsada = false;
    pausou = false;

    el['meta-tipo'].textContent = nomeTipo(cardAtual.tipo) + (bruto.leitura ? ' · ' + t('card.leitura') : '');
    el['meta-modo'].textContent = t(modoAtual === 'multipla' ? 'modo.multipla' : 'modo.escrita');

    /* A frase destravada diz de que palavra veio — ela está aqui porque
       você venceu aquela palavra, e ver as duas juntas é metade da lição.
       Mas só depois de responder: na volta, «de la ducha» em cima de «Vou
       tomar um banho» entrega metade da resposta; e na ida diz qual palavra
       da frase é a que conta. Quem mostra é o concluir. */
    const palavra = cardAtual.requer && PORID[cardAtual.requer];
    el['meta-origem'].textContent = palavra ? t('card.origem', { x: palavra[L] }) : '';
    el['meta-origem'].classList.add('oculto');
    /* O «já conheço» só existe na primeira vez que o card aparece, que é a
       hora em que a pessoa sabe se a palavra já é dela (pedido do Gere,
       19/10/2026). O texto diz o que ela está afirmando (07/10). */
    const estreando = !estadoDe(id) || !estadoDe(id).vistas;
    el['btn-arquivar'].textContent = t(cardAtual.tipo === 'palavra' || cardAtual.tipo === 'flexao' ? 'card.jaConhecoPalavra'
      : cardAtual.tipo === 'conceito' ? 'card.jaConhecoConceito' : 'card.jaConhecoFrase');
    /* o desafio leva a marca; a prévia (frase ainda presa) é uma pergunta
       só, e arquivar uma frase que nem entrou no jogo não faz sentido */
    const previa = !!(desafioAtual && desafioAtual.previa);
    el['meta-desafio'].classList.toggle('oculto', !desafioAtual);
    /* o card de forma acertado de primeira já sai sozinho: o «já conheço» não teria o que fazer */
    /* nem no de contraste, que é só treino de leitura das terminações */
    jaConhecoNoCard = estreando && !previa && cardAtual.tipo !== 'forma' && cardAtual.tipo !== 'contraste';
    posicionarJaConheco(false);
    el['aviso-previa'].classList.add('oculto');
    /* O nível vive na aba do fichário e fica à mostra o tempo todo: saber que
       o card é A1 ou C2 não entrega resposta nenhuma, e ajuda a calibrar o
       esforço antes de ler. */
    el['aba-nivel'].textContent = Motor.ROTULO_NIVEL[cardAtual.nivel] || cardAtual.nivel;

    const inversa = Motor.ehVolta(direcaoAtual);
    /* no card de conceito a pergunta vai em destaque, logo acima das alternativas (pedido do
       Gere, 21/10), e não na linha pequena do topo */
    /* o card de forma (LATIM.md §3.6) pergunta como o de conceito */
    const conceito = cardAtual.tipo === 'conceito' || cardAtual.tipo === 'forma';
    el.enunciado.textContent = conceito ? ''
      : inversa
      ? t(cardAtual.tipo === 'palavra' ? 'card.enunciado.voltaPalavra' : 'card.enunciado.voltaFrase', { L: NOME_L })
      : t(cardAtual.tipo === 'palavra' ? 'card.enunciado.idaPalavra'
        : cardAtual.tipo === 'flexao' ? 'card.enunciado.idaFlexao' : 'card.enunciado.idaFrase');

    el['bandeira-pergunta'].textContent = inversa ? BANDEIRA_A : BANDEIRA_L;
    el['bandeira-resposta'].textContent = inversa ? BANDEIRA_L : BANDEIRA_A;
    el['bandeira-feedback'].textContent = inversa ? BANDEIRA_L : BANDEIRA_A;
    /* na múltipla escolha a bandeira já diz tudo; o texto só ajuda quando
       é você quem tem que produzir a resposta */
    el['rotulo-resposta-txt'].textContent = conceito
      ? t(ENUNCIADO_DO_CONCEITO[cardAtual.familia] || ENUNCIADO_DO_CONCEITO.caso)
      : modoAtual === 'multipla' ? ''
      : t('card.respondaEm', { x: inversa ? NOME_L : NOME_A });
    el['rotulo-resposta-txt'].parentNode.classList.toggle('pergunta', conceito);
    el.enunciado.classList.toggle('oculto', conceito);
    el.entrada.placeholder = inversa ? t('card.escrevaEm', { x: NOME_L })
      : t(conceito ? 'card.escrevaConceito' : 'card.escrevaSignificado');

    /* O card de conceito pergunta com um exemplo real e a palavra em destaque; a palavra do
       latim aparece pelo enunciado do dicionário («dominus, domini, m.»). */
    exemploAtual = cardAtual.tipo === 'conceito' ? Motor.exemploDoConceito(cardAtual, est) : null;
    if (exemploAtual) el.termo.innerHTML = comDestaque(exemploAtual.la, exemploAtual.w);
    else if (cardAtual.tipo === 'forma') el.termo.innerHTML = comDestaque(cardAtual.frase, cardAtual.la, cardAtual.ocorrencia);
    else if (cardAtual.tipo === 'flexao') {
      /* a forma, e embaixo, pequeno, o enunciado do dicionário: «de is, ea, id» */
      el.termo.textContent = cardAtual.la;
      const lema = PORID[cardAtual.lema];
      if (lema) {
        const de = document.createElement('span');
        de.className = 'termo-lema';
        de.textContent = t('card.flexaoDe', { x: String(lema.enunciado || lema[L]).replace(/\s*\([^)]*\)\s*$/, '') });
        el.termo.appendChild(de);
      }
    }
    else el.termo.textContent = !inversa && cardAtual.enunciado ? cardAtual.enunciado : Motor.pergunta(cardAtual, direcaoAtual);
    el.termo.classList.toggle('frase', ['frase', 'forma', 'contraste'].includes(cardAtual.tipo) || !!exemploAtual);

    el['aviso-lingua'].classList.add('oculto');
    el['aviso-acento'].classList.add('oculto');
    el['aviso-regiao'].classList.add('oculto');
    el['area-feedback'].classList.add('oculto');
    /* o chão criado para o botão subir era daquele card; some com ele */
    el['area-feedback'].style.paddingBottom = '';
    el.conquista.classList.add('oculto');
    el['area-julgamento'].classList.add('oculto');
    el['resposta-dada'].classList.add('oculto');
    el['resposta-dada'].classList.remove('conjugacao');
    el['area-contestar'].classList.add('oculto');
    el['aviso-contestado'].classList.add('oculto');
    el['btn-contestar'].disabled = false;
    el['btn-proximo'].classList.remove('oculto');

    if (modoAtual === 'multipla') {
      montarAlternativas();
      el['area-multipla'].classList.remove('oculto');
      el['area-nao-sei-multipla'].classList.remove('oculto');
      el['btn-nao-sei-multipla'].disabled = false;
      el['area-escrita'].classList.add('oculto');
    } else {
      el['area-multipla'].classList.add('oculto');
      el['area-nao-sei-multipla'].classList.add('oculto');
      el['area-escrita'].classList.remove('oculto');
      el.entrada.value = '';
      ajustarEntrada();
      el.entrada.disabled = false;
      el['btn-responder'].disabled = false;
      el['btn-nao-sei'].disabled = false;
    }

    mostrar('tela-card');
    /* O foco no campo espera a subida acabar: focar antes faz o navegador
       rolar até o campo por conta própria, e as duas rolagens brigam. A
       subida interrompida (um toque, a roda do mouse) também foca: antes o
       foco só vinha no fim dela, e o card abria sem foco nenhum — o Gere
       digitava à toa (21/10/2026). Durante a subida, o que se digita fica
       guardado e vai para a caixa no fim (ver segurarTeclas). */
    if (window.scrollY >= 2 && esperandoEscrita()) segurarTeclas();
    voltarAoTopo(soltarTeclas);

    inicioResposta = performance.now();
  }

  function montarAlternativas() {
    /* com o progresso, a frase de uso pode trocar distrator pronto por
       palavra já vista (ver Motor.distratoresDinamicos) */
    const opcoes = Motor.alternativas(cardAtual, direcaoAtual, CARDS, progresso.cards);
    /* quais alternativas não são do card: vão com a resposta, para a
       calibragem saber quando o erro foi num distrator que não está no card.
       Na volta, as quatro erradas saem de outros cards. */
    const certa = Motor.resposta(cardAtual, direcaoAtual);
    dinamicosAtuais = cardAtual.tipo === 'contraste' ? []
      : Motor.ehVolta(direcaoAtual)
      ? opcoes.filter(o => o !== certa)
      : opcoes.filter(o => o !== cardAtual[A] && (cardAtual[CA.distratores] || []).indexOf(o) < 0);
    el['area-multipla'].innerHTML = '';
    opcoes.forEach((texto, i) => {
      const b = document.createElement('button');
      b.className = 'alternativa';
      b.innerHTML = '<span class="num">' + (i + 1) + '</span><span>' + escapar(texto) + '</span>';
      b.addEventListener('click', () => responderMultipla(texto, b));
      el['area-multipla'].appendChild(b);
    });
  }

  /* «palavra», «frase» e (no latim) «conceito», «forma», «contraste» e «flexão», na língua da interface */
  function nomeTipo(tipo) {
    return ['palavra', 'frase', 'conceito', 'forma', 'contraste', 'flexao'].includes(tipo) ? t('tipo.' + tipo) : tipo;
  }

  /* A frase do exemplo com a palavra em destaque (só ela: em «virumque», o «virum»); «vez» diz
     qual ocorrência, quando ela se repete na frase. */
  function comDestaque(frase, palavra, vez) {
    const chave = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const alvo = chave(palavra);
    const re = /[A-Za-zÀ-ÿĀ-ſ]+/g;
    let m, achadas = 0;
    while ((m = re.exec(frase))) {
      const k = chave(m[0]);
      if ((k === alvo || ['que', 'ne', 've', 'cum'].some(s => k === alvo + s)) && ++achadas >= (vez || 1)) {
        const fim = m.index + palavra.length;
        return escapar(frase.slice(0, m.index)) + '<mark class="destaque">' + escapar(frase.slice(m.index, fim)) +
          '</mark>' + escapar(frase.slice(fim));
      }
    }
    return escapar(frase);
  }

  function escapar(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function tempoGasto() {
    return Math.max(0, Math.round(performance.now() - inicioResposta));
  }

  /* «botao» nulo é o «Não sei»: nenhuma alternativa escolhida, a certa
     aparece, e conta como erro — o mesmo do «Não sei» da escrita. */
  function responderMultipla(texto, botao) {
    if (respostaPendente) return;
    const ms = tempoGasto();
    const desistiu = !botao;
    const acertou = !desistiu && texto === alvoAtual;
    el['btn-nao-sei-multipla'].disabled = true;

    [...el['area-multipla'].children].forEach(b => {
      b.disabled = true;
      const rotulo = b.lastChild.textContent;
      if (rotulo === alvoAtual) b.classList.add('certa');
      else if (b === botao && !acertou) b.classList.add('errada');
    });

    concluir({ modo: 'multipla', direcao: direcaoAtual, acertou, quase: false, ms,
      resposta: desistiu ? '' : texto, desistiu: desistiu });
  }

  function responderEscrita(desistiu) {
    if (respostaPendente) return;
    const ms = tempoGasto();
    /* o maxlength do campo cobre a digitação; o corte cobre o resto, e é o
       que garante que nada maior que o teto entre no progresso.json */
    const texto = desistiu ? '' : Motor.cortar(el.entrada.value, Motor.LIMITES.resposta);
    if (!desistiu && !texto.trim()) { el.entrada.focus(); return; }

    /* ── respondeu certo, na língua errada ──
       Falso amigo é assim: você lê «la sobremesa», reconhece a palavra
       portuguesa e responde o espanhol dela. Não é desconhecimento, é a
       palavra enganando — então o app avisa e devolve a vez, sem contar
       erro nem gravar nada. Uma vez por aparição do card: com duas viraria
       tentativa livre. */
    const conferencia = desistiu ? 'errado' : Motor.conferir(cardAtual, texto, direcaoAtual);
    if (conferencia === 'errado' && !desistiu && !chanceUsada) {
      /* no card de gramática, respondeu o significado (pedido do Gere, 22/10/2026: «é fácil
         responder no automático»): avisa e devolve a vez */
      if (Motor.foraDaPergunta(cardAtual, texto)) { avisarForaDaPergunta(); return; }
      const troca = Motor.linguaTrocada(cardAtual, texto, direcaoAtual);
      if (troca) { avisarLinguaTrocada(troca); return; }
      /* o espanhol certo, mas não o do card: «trabajar» para «currar» */
      const sinonimo = Motor.sinonimoDoCard(cardAtual, texto, direcaoAtual);
      if (sinonimo) { avisarSinonimo(sinonimo); return; }
      /* e o espelho, na volta: a pergunta portuguesa lida como espanhol */
      const leitura = Motor.leituraEspanhola(cardAtual, texto, direcaoAtual, indiceEspanhol());
      if (leitura) { avisarLeituraEspanhola(leitura); return; }
    }
    el['aviso-lingua'].classList.add('oculto');
    el.entrada.disabled = true;
    el['btn-responder'].disabled = true;
    el['btn-nao-sei'].disabled = true;

    concluir({
      modo: 'escrita',
      direcao: direcaoAtual,
      acertou: conferencia === 'certo',
      quase: conferencia === 'quase',
      ms, resposta: texto, desistiu: !!desistiu
    });
  }

  /* O índice do espanhol do baralho, montado na primeira vez que alguém
     precisa dele (ver Motor.leituraEspanhola). */
  let INDICE_ES = null;
  function indiceEspanhol() {
    if (!INDICE_ES) INDICE_ES = Motor.indiceEspanhol(FONTE);
    return INDICE_ES;
  }

  function avisarLeituraEspanhola(l) {
    chanceUsada = true;
    el['aviso-lingua'].innerHTML = t('aviso.leitura', {
      resposta: escapar(l.resposta), original: escapar(l.espanhol), pergunta: escapar(l.pergunta),
      L: NOME_L, bL: BANDEIRA_L, A: NOME_A, bA: BANDEIRA_A });
    el['aviso-lingua'].classList.remove('oculto');
    el.entrada.value = '';
      ajustarEntrada();
    el.entrada.focus({ preventScroll: true });
  }

  /* Mesma regra da língua trocada: uma vez por aparição, sem contar erro.
     A dica é a primeira letra — o bastante para
     puxar a palavra da memória, pouco para entregá-la. */
  function avisarSinonimo(s) {
    chanceUsada = true;
    el['aviso-lingua'].innerHTML = t('aviso.sinonimo', { x: escapar(s.palavra) }) +
      (s.dica ? t('aviso.sinonimoDica', { d: escapar(s.dica) }) : t('aviso.sinonimoSemDica'));
    el['aviso-lingua'].classList.remove('oculto');
    el.entrada.value = '';
      ajustarEntrada();
    el.entrada.focus({ preventScroll: true });
  }

  /* O card de forma ou de conceito pede o caso (ou a forma verbal), e veio outra coisa — quase
     sempre o significado. O aviso é curto (pedido do Gere, 22/10/2026): «A pergunta é o caso.» */
  function avisarForaDaPergunta() {
    chanceUsada = true;
    const familia = ['verbo', 'voz', 'construcao'].includes(cardAtual.familia) ? cardAtual.familia : 'caso';
    el['aviso-lingua'].innerHTML = t('aviso.foraDaPergunta.' + familia);
    el['aviso-lingua'].classList.remove('oculto');
    el.entrada.value = '';
    ajustarEntrada();
    el.entrada.focus({ preventScroll: true });
  }

  function avisarLinguaTrocada(troca) {
    chanceUsada = true;
    el['aviso-lingua'].innerHTML = t(troca.propria ? 'aviso.propria' : 'aviso.trocada', {
      x: escapar(troca.palavra), L: NOME_L, bL: BANDEIRA_L, A: NOME_A, bA: BANDEIRA_A });
    el['aviso-lingua'].classList.remove('oculto');
    el.entrada.value = '';
      ajustarEntrada();
    el.entrada.focus({ preventScroll: true });
  }

  /* Mostra o feedback. Grava na hora, salvo quando a resposta caiu na
     tolerância — aí quem decide é você, e só então grava. */
  function concluir(r) {
    /* O tempo não decide mais nada e não aparece na tela (ver «o relógio
       saiu do motor», no motor.js): segue só para o log da sessão, com a
       marca de quando ele não é confiável. "pausado" quer dizer isso, e há
       duas maneiras de chegar lá: sair da aba, ou demorar tanto que é
       evidente que o card ficou sozinho na tela. */
    r.pausado = pausou || r.ms >= Motor.MS_ABANDONO;
    respostaPendente = r;

    el['resposta-certa'].textContent = alvoAtual;
    /* Neutra por padrão: quem pinta de verde é o veredito, e no caso do
       "deu quase" ele só chega depois que você julgar. */
    el['caixa-resposta'].classList.remove('certa');
    /* A palavra de onde a frase veio, escondida enquanto se respondia. */
    el['meta-origem'].classList.toggle('oculto', !el['meta-origem'].textContent);
    /* O card saiu num dos dois gêneros, e o outro entra no fim da nota só
       quando o português é o mesmo para os dois: «A criança não quer comer»
       serve a «El niño» e a «La niña», e ver as duas respostas certas da
       mesma pergunta é lição. Quando o português muda junto («o médico», «a
       médica»), a outra forma é só a mesma frase no feminino, e ocupa a nota
       sem ensinar nada. */
    /* no card de conceito, primeiro o exemplo explicado, depois a definição; na frase latina,
       no fim, a passagem de onde ela vem */
    const nota = [exemploAtual ? exemploAtual.exp + (exemploAtual.fonte ? ' (' + exemploAtual.fonte + ')' : '') : '',
      notaDe(cardAtual),
      outraForma && outraForma[A] === cardAtual[A]
        ? t('nota.outraForma', { g: t(generoAtual ? 'nota.masculino' : 'nota.feminino'), x: outraForma[L], y: outraForma[A] }) : '',
      cardAtual.fonte ? t('nota.fonte', { x: cardAtual.fonte }) : ''
    ].filter(Boolean).join('\n');
    el.nota.textContent = nota;
    el.nota.classList.toggle('oculto', !nota);

    /* Só as etiquetas: o nível já está na aba do fichário, e o tempo da
       resposta saiu daqui junto com o relógio. */
    el.medidas.innerHTML =
      (cardAtual.tags || []).map(g => '<span class="medida">' + escapar(nomeTag(g)) + '</span>').join('');

    /* Escreveu outra conjugação: mostra qual foi, para o erro ensinar algo. */
    const escrevendo = r.modo === 'escrita' && !r.desistiu;
    const forma = escrevendo
      ? Motor.formaReconhecida(cardAtual, r.resposta, r.direcao) : null;
    /* Só o artigo saiu errado. Dizer isso ensina mais do que "não foi dessa
       vez": o que faltou tem nome, e é o gênero. */
    const genero = escrevendo && !forma
      ? Motor.erroDeGenero(cardAtual, r.resposta, r.direcao) : null;
    /* E o «ñ», que é letra e não «n» com enfeite. */
    const acento = escrevendo && !forma && !genero
      ? Motor.erroDeEne(cardAtual, r.resposta, r.direcao) : null;
    /* A terminação de outra pessoa ou outro tempo: «suele» por «suelo». */
    const flexao = escrevendo && !forma && !genero && !acento
      ? Motor.erroDeFlexao(cardAtual, r.resposta, r.direcao) : null;

    /* Acertou, mas sem o acento. Não custa ponto — custa uma linha, que diz
       só a palavra, e a letra pintada na resposta certa, logo abaixo. */
    const soAcento = escrevendo && r.acertou
      ? Motor.acentoFaltando(cardAtual, r.resposta, r.direcao) : null;
    el['aviso-acento'].classList.toggle('oculto', !soAcento);
    if (soAcento) {
      el['aviso-acento'].innerHTML = t('aviso.acento', { x: soAcento.palavras.map(escapar).join(', ') });
      el['resposta-certa'].innerHTML = soAcento.pedacos.map(p => p.destaque
        ? '<mark class="acento">' + escapar(p.texto) + '</mark>'
        : escapar(p.texto)).join('');
    }

    /* Acertou com a palavra de outro lugar: vale, e a linha diz onde ela se
       usa e qual é a do card (ver Motor.regionalDoCard). */
    const regiao = escrevendo && r.acertou
      ? Motor.regionalDoCard(cardAtual, r.resposta, r.direcao) : null;
    el['aviso-regiao'].classList.toggle('oculto', !regiao);
    if (regiao) {
      /* entre aspas e sem o ponto final: numa frase, o ponto dela encostava
         no da linha — «…en coche..» */
      const citar = x => aspas('<b>' + escapar(String(x).replace(/\.$/, '')) + '</b>');
      el['aviso-regiao'].innerHTML = t('aviso.regiao', {
        forma: citar(regiao.forma), onde: escapar(lugar(regiao.onde)), certa: citar(regiao.certa) });
    }

    if (forma || genero || acento || flexao) {
      el['texto-dado'].innerHTML = forma
        ? escapar(forma.forma) + ' <span class="forma-rotulo">' + escapar(forma.rotulo) + '</span>'
        : genero
        ? escapar(r.resposta) +
          ' <span class="forma-rotulo">' + t('feedback.genero', { x: aspas(escapar(genero)) }) + '</span>'
        : acento
        ? escapar(r.resposta) +
          ' <span class="forma-rotulo">' + t('feedback.ene') + '</span>'
        : escapar(r.resposta) +
          ' <span class="forma-rotulo">' + t('feedback.flexao', { x: aspas(escapar(flexao)) }) + '</span>';
      el['resposta-dada'].classList.remove('oculto');
      el['resposta-dada'].classList.add('conjugacao');
    } else {
      el['resposta-dada'].classList.remove('conjugacao');
    }

    if (r.quase) {
      // chegou perto: mostra o que você escreveu e devolve a decisão
      el.veredito.className = 'veredito quase';
      el.veredito.textContent = t('feedback.quase');
      el['texto-dado'].textContent = r.resposta;
      /* a diferença pintada dos dois lados, como no acento: achar uma letra
         numa frase inteira, a olho, custa mais do que devia */
      const dif = Motor.diferencaDoQuase(cardAtual, r.resposta, r.direcao);
      if (dif) pintarDiferenca(dif);
      el['resposta-dada'].classList.remove('oculto');
      el['area-julgamento'].classList.remove('oculto');
      el['btn-proximo'].classList.add('oculto');
    } else {
      /* Errou escrevendo, e o erro não tem nome (gênero, ñ, conjugação). A
         resposta certa sozinha obrigava a comparar de cabeça com o que foi
         escrito, que já tinha sumido da tela: «necesito um poco de sosiego»
         dava «não foi dessa vez», e ficava por achar que o erro era o «um»
         (u184). Agora o que foi escrito fica à mostra, e, quando chegou
         perto, com a diferença pintada como no «deu quase». */
      const semNome = !forma && !genero && !acento && !flexao;
      if (escrevendo && !r.acertou && semNome) {
        el['texto-dado'].textContent = r.resposta;
        const dif = Motor.diferencaDoQuase(cardAtual, r.resposta, r.direcao);
        if (dif && poucoPintado(dif)) pintarDiferenca(dif);
        el['resposta-dada'].classList.remove('oculto');
        el['resposta-dada'].classList.add('conjugacao');
      } else if (semNome) {
        el['resposta-dada'].classList.add('oculto');
      }
      el['area-julgamento'].classList.add('oculto');
      el['btn-proximo'].classList.remove('oculto');
      mostrarVeredito(r);
      /* A prévia do desafio errada não vira estado: a frase continua presa,
         e volta quando as palavras dela chegarem (PLANO.md, 7.4). Certa,
         ela estreia como qualquer card e entra no jogo. */
      const previa = desafioAtual && desafioAtual.id === cardAtual.id && desafioAtual.previa;
      if (previa && !r.acertou) guardarPreviaErrada(r);
      else registrar(r);
      if (desafioAtual && desafioAtual.id === cardAtual.id) anotarDesafio(r);
      if (previa) {
        el['aviso-previa'].textContent = t(r.acertou ? 'card.previaEntra' : 'card.previaVolta');
        el['aviso-previa'].classList.remove('oculto');
      }
      mostrarContestar(r);
    }

    el['area-feedback'].classList.remove('oculto');
    if (!r.acertou || r.quase || chanceUsada) jaConhecoNoCard = false;
    posicionarJaConheco(true);
    el['btn-proximo'].focus({ preventScroll: true });
    trazerBotaoParaAVista();
  }

  function pintarPedacos(ps) {
    return ps.map(p => p.destaque
      ? '<mark class="acento">' + escapar(p.texto) + '</mark>' : escapar(p.texto)).join('');
  }

  /* O que foi escrito e a forma aceita mais próxima, com o que não casa
     pintado dos dois lados (ver Motor.diferencaDoQuase). */
  function pintarDiferenca(dif) {
    el['texto-dado'].innerHTML = pintarPedacos(dif.dada);
    /* a forma mais próxima pode ser uma variante, e não a que está na
       caixa: se ela estiver lá dentro («o galho / o ramo»), pinta no
       lugar; se não, aparece ao lado do que foi escrito */
    const onde = alvoAtual.indexOf(dif.forma);
    if (onde >= 0) {
      el['resposta-certa'].innerHTML = escapar(alvoAtual.slice(0, onde)) + pintarPedacos(dif.certa) +
        escapar(alvoAtual.slice(onde + dif.forma.length));
    } else {
      el['texto-dado'].innerHTML += ' <span class="forma-rotulo variante">' +
        t('feedback.tambemVale', { x: aspas(pintarPedacos(dif.certa)) }) + '</span>';
    }
  }

  /* No erro, a pintura só ajuda quando a diferença é um pedaço da frase.
     Resposta que não tem nada a ver sairia pintada de ponta a ponta, e
     tinta em tudo não aponta nada. */
  function poucoPintado(dif) {
    const conta = ps => ps.reduce((s, p) => s + (p.destaque ? p.texto.replace(/\s/g, '').length : 0), 0);
    const tamanho = dif.forma.replace(/\s/g, '').length;
    return conta(dif.certa) + conta(dif.dada) <= Math.max(3, 0.3 * tamanho);
  }

  /* ── a rolagem ──
     Depois de responder, o feedback empurra o botão de seguir adiante para
     baixo da dobra. A tela sobe o bastante para ele aparecer, e nada além
     disso, para o espanhol não sair de vista. Quando a resposta ficou por
     julgar, o alvo são os dois botões de julgamento.

     A versão anterior disparava três rolagens — suave, suave de novo 300 ms
     depois, e uma seca aos 700 ms para o caso de a suave ter morrido — e
     refazia o «chão» debaixo do botão a cada uma. Funcionava, mas se via: a
     seca dava tranco, a segunda suave recomeçava no meio da primeira, e
     zerar o chão para medir de novo encolhia a página por um instante, e o
     navegador puxava a tela de volta antes de ela descer outra vez.

     Agora é uma animação só, feita à mão, quadro a quadro. A cada quadro ela
     mede quanto ainda falta para o alvo caber na parte visível — contra o
     visualViewport, que é quem sabe o que o teclado cobre. Se o teclado fecha
     no meio, o alvo muda e a animação segue o novo sem recomeçar. Termina
     quando fica parada no lugar por alguns quadros, depois de um mínimo que
     dá tempo ao teclado.

     O movimento era uma mola com amortecimento crítico, e a mola sai do
     repouso com a força toda: num trecho de 400 px ela passava de 1.000 px/s
     em 15 ms. Na resposta escrita o teclado fechando disfarçava; na múltipla
     escolha não há teclado, e o tranco aparecia — «brusco», duas vezes (f167,
     p250). Agora é um deslizamento com hora para acabar: sai devagar, ganha
     velocidade no meio e freia no fim, e leva mais tempo quanto maior o
     trecho (de 0,45 a 0,9 s). Se o alvo ainda se mexer depois disso — o
     teclado que fechou tarde —, uma perna curta termina o caminho.

     O chão só cresce durante a animação, e no fim sai apenas a sobra que
     está abaixo da tela: tirar o que ninguém está vendo não move nada.
     Um toque ou a roda do mouse no meio do caminho interrompem: a mão de
     quem usa manda mais do que a animação. */
  const FOLGA_BOTAO = 24;

  /* Quanto ainda falta rolar para o alvo caber na parte de fato visível.
     Positivo: falta descer. Negativo: há folga sobrando abaixo do alvo. */
  function faltaRolar(alvo) {
    const r = alvo.getBoundingClientRect();
    if (!r.height) return 0;
    const vv = window.visualViewport;
    const topo = vv ? vv.offsetTop : 0;
    const altura = vv ? vv.height : window.innerHeight;
    return (r.bottom + FOLGA_BOTAO) - (topo + altura);
  }

  /* O teclado do celular encolhe o visualViewport e deixa o innerHeight como
     estava (no Chrome antigo encolhia os dois, e aí isto não vê nada — quem
     cobre esse caso é a volta, em trazerBotaoParaAVista). */
  function tecladoAberto() {
    const vv = window.visualViewport;
    return !!vv && vv.height < window.innerHeight - 120;
  }

  let rolagemAtual = null;

  /* Anima a rolagem até «falta()» chegar a zero. «falta» devolve pixels,
     positivos para descer e negativos para subir. «opcoes.subida» é a volta
     ao topo do card novo: essa pode ser mais ligeira, porque é o card que
     troca, e ninguém está lendo no meio do caminho. */
  function rolarSuave(falta, aoTerminar, opcoes) {
    if (rolagemAtual) rolagemAtual.parar();
    const esperarTeclado = !!(opcoes && opcoes.esperarTeclado);
    const subida = !!(opcoes && opcoes.subida);
    /* «aoTerminar» roda também quando a rolagem é interrompida */
    const sempre = !!(opcoes && opcoes.sempre);
    const ESPERA_TECLADO = 500;   // ms: se ele não fechar nisso, desce assim mesmo
    const raiz = document.documentElement;
    const chao = el['area-feedback'];
    const instantaneo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const MINIMO = 450;       // ms: tempo para o teclado terminar de fechar
    const MAXIMO = 2200;      // ms: nunca fica rolando para sempre
    const inicio = performance.now();
    let perna = null, pernas = 0, parado = 0, quadro = 0, vivo = true;

    /* Quanto dura cada perna: cresce com o trecho, dentro de uma faixa. A
       primeira descida leva de 0,45 a 0,9 s; a perna que só termina o
       caminho, e a subida para o card novo, são mais curtas. */
    function duracao(d) {
      const a = Math.abs(d);
      if (subida) return Math.min(550, Math.max(300, 250 + 0.4 * a));
      if (pernas) return Math.min(450, Math.max(250, 200 + 0.8 * a));
      return Math.min(900, Math.max(450, 300 + 0.9 * a));
    }
    /* Sai parada, ganha velocidade no meio e freia no fim. A senoide é das
       curvas assim a de pico mais baixo: 1,6 vez a velocidade média, contra
       3 vezes da cúbica — que partia macia mas passava zunindo no meio. */
    const suave = p => (1 - Math.cos(Math.PI * p)) / 2;

    const interromper = () => parar();
    window.addEventListener('touchstart', interromper, { passive: true, once: true });
    window.addEventListener('wheel', interromper, { passive: true, once: true });

    function parar(concluiu) {
      if (!vivo) return;
      vivo = false;
      cancelAnimationFrame(quadro);
      window.removeEventListener('touchstart', interromper);
      window.removeEventListener('wheel', interromper);
      /* a sobra do chão que ficou abaixo da tela sai sem mexer em nada */
      const pad = parseFloat(chao.style.paddingBottom) || 0;
      if (pad) {
        const sobra = raiz.scrollHeight - (window.scrollY + window.innerHeight);
        const tirar = Math.min(pad, Math.max(0, Math.floor(sobra)));
        chao.style.paddingBottom = (pad - tirar) ? (pad - tirar) + 'px' : '';
      }
      if (rolagemAtual === controle) rolagemAtual = null;
      if ((concluiu || sempre) && aoTerminar) aoTerminar();
    }

    /* Leva a tela até «y». Descer além do fim da página precisa de chão:
       ele cresce o quanto faltar, e no fim sai o que sobrou (ver parar). */
    function irPara(y) {
      const andar = y - window.scrollY;
      if (andar > 0) {
        const podeRolar = raiz.scrollHeight - window.scrollY - window.innerHeight;
        if (andar > podeRolar) {
          const pad = parseFloat(chao.style.paddingBottom) || 0;
          chao.style.paddingBottom = Math.ceil(pad + andar - podeRolar) + 'px';
        }
      }
      window.scrollTo(0, y);
    }

    function passo(agora) {
      if (!vivo) return;
      /* Responder por escrito fecha o teclado, e ele leva uns 300 ms para
         sair. Descer nesse intervalo é medir a tela pela metade: a animação
         chegava ao alvo com o teclado ainda aberto, o teclado saía, e a
         página ficava descida demais. Espera ele sair, e só então mede. */
      if (esperarTeclado && agora - inicio < ESPERA_TECLADO && tecladoAberto()) {
        quadro = requestAnimationFrame(passo);
        return;
      }
      /* O alvo é medido de novo a cada quadro: se ele se mexe no meio da
         perna, a perna o acompanha sem recomeçar. */
      const d = falta();
      const alvo = window.scrollY + d;
      if (!perna) {
        if (Math.abs(d) < 0.5) {
          parado++;
          if (parado >= 6 && agora - inicio >= MINIMO) return parar(true);
        } else {
          parado = 0;
          perna = { de: window.scrollY, t0: agora, dur: instantaneo ? 0 : duracao(d) };
          pernas++;
        }
      }
      if (perna) {
        const p = perna.dur ? Math.min(1, (agora - perna.t0) / perna.dur) : 1;
        irPara(perna.de + (alvo - perna.de) * suave(p));
        if (p >= 1) perna = null;
      }
      if (agora - inicio >= MAXIMO) return parar(true);
      quadro = requestAnimationFrame(passo);
    }

    const controle = { parar: () => parar(false) };
    rolagemAtual = controle;
    quadro = requestAnimationFrame(passo);
    return controle;
  }

  function trazerBotaoParaAVista() {
    const alvo = el['btn-proximo'].classList.contains('oculto')
      ? el['area-julgamento'] : el['btn-proximo'];
    if (!alvo) return;
    /* O alvo tem dois lados. Se a tela cresce no meio do caminho — o teclado
       que fecha tarde, a barra do navegador que some —, o que já se desceu
       passa do ponto, e antes a conta parava em zero e deixava assim. Agora
       ela devolve o excesso, mas só o que ESTA animação desceu: nunca sobe
       além de onde a tela estava quando a resposta foi dada. */
    const partida = window.scrollY;
    rolarSuave(() => {
      const d = faltaRolar(alvo);
      return d >= 0 ? d : Math.max(d, Math.min(0, partida - window.scrollY));
    }, null, { esperarTeclado: true });
  }

  /* Card novo começa do topo, subindo com a mesma suavidade. A página do
     card anterior era mais alta (tinha feedback), e trocar o conteúdo com a
     tela lá embaixo faria o navegador saltar para cima de uma vez; segurar a
     altura até a subida acabar evita o salto. */
  function voltarAoTopo(aoTerminar) {
    if (window.scrollY < 2) {
      el['tela-card'].style.minHeight = '';
      if (aoTerminar) aoTerminar();
      return;
    }
    el['tela-card'].style.minHeight = el['tela-card'].offsetHeight + 'px';
    rolarSuave(() => -window.scrollY, () => {
      el['tela-card'].style.minHeight = '';
      if (aoTerminar) aoTerminar();
    }, { subida: true, sempre: true });
  }

  function mostrarVeredito(r) {
    el.veredito.className = 'veredito ' + (r.acertou ? 'ok' : 'erro');
    /* Acertou: a caixa da resposta fica verde. Desistir não é acerto. */
    el['caixa-resposta'].classList.toggle('certa', r.acertou && !r.desistiu);
    el.veredito.textContent = t(r.desistiu ? 'feedback.desistiu'
      : r.julgadoPorVoce ? (r.acertou ? 'feedback.julgadoCerto' : 'feedback.julgadoErro')
      : r.acertou ? 'feedback.certo'
      : 'feedback.errado');
  }

  /* Você decide se o quase-certo valeu. Só depois disso a resposta é gravada. */
  function julgar(valor) {
    if (!respostaPendente || ultimoRegistro) return;
    const r = respostaPendente;
    r.acertou = valor === 'certo';
    r.julgadoPorVoce = true;

    el['area-julgamento'].classList.add('oculto');
    el['btn-proximo'].classList.remove('oculto');
    mostrarVeredito(r);
    registrar(r);
    mostrarContestar(r);
    el['btn-proximo'].focus({ preventScroll: true });
    /* A tela desliza até o «Próximo» aparecer (pedido do Gere, 21/10/2026).
       Em 03/10 ele tinha pedido o contrário — sem rolar, para não tirar os
       olhos da resposta —, mas aí o botão ficava abaixo da dobra no
       celular. A rolagem é a mesma da resposta: só o bastante para o botão
       caber, e a resposta não sai de vista. */
    trazerBotaoParaAVista();
  }
  /* Frases cuja palavra foi dominada até ontem e que ainda não estão nos
     inéditos. Antes elas entravam na hora do domínio; agora esperam o dia
     virar (ver Motor.liberado), e quem as recolhe é esta função, chamada a
     cada card — o app pode ficar aberto de um dia para o outro. */
  function recolherFrasesLiberadas() {
    const agora = Date.now();
    const jaEsta = new Set(progresso.ineditos);
    /* no modo trilhas, o trecho só entra se o texto dele estiver escolhido */
    const ativosIds = TRILHAS ? new Set(textosAtivosAgora().map(x => x.id)) : null;
    /* e o card de contraste (LATIM.md §3.7), que espera as palavras e os conceitos dele */
    const novas = CARDS.filter(c => (c.tipo === 'frase' || c.tipo === 'contraste') && Motor.requeridas(c).length &&
      !progresso.cards[c.id] && !jaEsta.has(c.id) && !Motor.arquivado(c.id, progresso.arquivados) &&
      (!ativosIds || !c.texto || ativosIds.has(c.texto)) &&
      Motor.liberado(c, progresso.cards, agora, progresso.arquivados));
    /* e o card de forma do verso que acabou de aparecer, ou o que o erro num caso puxou
       (LATIM.md §3.6) */
    if (TRILHAS) {
      CARDS.forEach(c => {
        if (c.tipo === 'forma' && !progresso.cards[c.id] && !jaEsta.has(c.id) &&
            !Motor.arquivado(c.id, progresso.arquivados) && formaDaTrilha(c, ativosIds, progresso)) novas.push(c);
      });
    }
    if (!novas.length) return;
    novas.forEach(c => progresso.ineditos.push(c.id));
    ordenarIneditos(progresso);
  }

  /* Vencer as duas direções é a única conquista do app que não se vê na
     hora: o card apenas some da fila por semanas. Uma etiqueta basta para
     o terceiro acerto seguido em espanhol ter o tamanho que tem. */
  function mostrarConquista(virou, diasDeVolta) {
    /* O dominado acertado de novo não muda de etapa, e o que ele ganhou só
       se via no painel: uma espera mais longa. Dizer quanto é o que dá peso
       à revisão certa. */
    const texto = virou ? t('feedback.dominado')
      : diasDeVolta ? t('feedback.voltaEm', { x: rotuloEspera(diasDeVolta) }) : '';
    el.conquista.textContent = texto;
    el.conquista.classList.toggle('oculto', !texto);
  }

  /* Grava a resposta e devolve o card para a fila. */
  /* Identidade de cada resposta: gerada aqui, na hora, e guardada na fila;
     o reenvio bate na mesma chave e não duplica (anexo do banco, §2.1). */
  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  /* O tempo não decide nada no app (ver «o relógio saiu do motor»), mas a
     calibragem conta as respostas lentas. A régua é larga de propósito:
     escrever leva mais que escolher. */
  function velocidadeDe(r) {
    const [rapido, medio] = r.modo === 'multipla' ? [4000, 10000] : [8000, 20000];
    return r.ms < rapido ? 'rapido' : r.ms < medio ? 'medio' : 'lento';
  }

  function registrar(r) {
    const id = cardAtual.id;
    /* o relógio das filas antes desta resposta: é o mesmo valor que vira
       naFila.desde e estreouNa, e o que a resposta leva para o servidor */
    const relogioAntes = progresso.totais.respostas;
    /* O presumido pelo nivelamento não tem estado: a resposta dele é a
       revisão de um dominado, e é ela que faz o estado nascer — dominado no
       degrau de três meses, se acertou; do zero, se errou
       (Motor.responderPresumido; PLANO.md, 7.2). O card novo nasce pelo
       Motor.estadoInicialDo, que faz a transparente «parecida» estrear na
       volta. */
    const presumido = !progresso.cards[id] && !!Motor.presumidoEm(id, progresso.cards);
    let est = progresso.cards[id] || (presumido ? Motor.estadoDoPresumido(id, progresso.cards)
      : (progresso.cards[id] = Motor.estadoInicialDo(PORID[id] || { id: id })));
    const etapaAntes = est.etapa;
    const degrauAntes = Math.min(est.revisoes || 0, 5);
    /* a resposta em que o card estreou: é dela que sai a ordem das estreias
       (a vez do texto, das frases livres; ver ordenarIneditos). O presumido
       não é card novo, e não conta. */
    if (!est.vistas && !presumido) {
      est.estreouNa = relogioAntes;
      /* A estreia do desafio não conta no domínio por nível
         (Motor.marcarDesafio); «desafioEm» é a data dela, para o ritmo de um
         por dia (ver contextoDoDesafio). Os dois viajam com o estado. */
      if (desafioAtual && desafioAtual.id === id) {
        Motor.marcarDesafio(est);
        est.desafioEm = new Date().toISOString();
      }
    }
    if (presumido) est = progresso.cards[id] = Motor.responderPresumido(id, r);
    else Motor.registrar(est, r);
    /* Para o painel: o dia, a hora e o tempo desta resposta, e — se era a
       revisão de um dominado — se a memória aguentou a espera daquele degrau.
       A confirmação do presumido fica fora da retenção: ela não mede espera
       nenhuma de quem já tinha estudado o card. */
    Motor.anotarDiario(progresso.diario, r, est.ultima);
    if (etapaAntes === 'dominado' && !presumido) {
      progresso.retencao[degrauAntes][0]++;
      if (r.acertou) progresso.retencao[degrauAntes][1]++;
    }
    const virouDominado = est.etapa === 'dominado' && etapaAntes !== 'dominado';
    mostrarConquista(virouDominado,
      etapaAntes === 'dominado' && r.acertou ? Motor.DIAS_DOMINADO[est.revisoes] : null);

    const guardado = guardarNaFila(id, est, r);

    progresso.totais.respostas++;
    if (r.acertou) progresso.totais.acertos++;

    /* Um ponto por resposta, para o gráfico do painel: as duas direções e os
       dominados divididos pelos seis degraus. Nove números; mil respostas
       somam uns 25 KB no progresso.json, que já tem 500. */
    const d = Motor.contarDirecoes(progresso.cards, progresso.arquivados);
    const degraus = [0, 0, 0, 0, 0, 0];
    progresso.dominados.forEach(id => {
      const e = progresso.cards[id];
      if (e) degraus[Math.min(e.revisoes || 0, 5)]++;
    });
    progresso.serie.push([progresso.totais.respostas, d.esPt, d.ptEs].concat(degraus));

    /* A resposta, no formato que a RPC registrar_respostas lê (anexo do
       banco, §2.1). O texto do acerto limpo o servidor descarta. */
    const evento = {
      id: novoId(),
      em: est.ultima,
      fuso: -new Date().getTimezoneOffset(),
      card: id,
      versao: (PORID_FONTE[id] && PORID_FONTE[id].v) || '00000000',
      etapa_antes: etapaAntes,
      etapa_depois: est.etapa,
      acertou: !!r.acertou,
      quase: !!r.quase,
      julgado: !!r.julgadoPorVoce,
      desistiu: !!r.desistiu,
      pausado: !!r.pausado,
      ms: Math.max(0, Math.round(r.ms || 0)),
      velocidade: velocidadeDe(r),
      relogio: relogioAntes,
      vista: est.vistas,
      distancia: guardado.distancia,
      /* a confirmação do presumido vai como etapa_antes «dominado» e degrau
         nulo: é por aí que a calibragem a separa da revisão de verdade */
      degrau: etapaAntes === 'dominado' && !presumido ? degrauAntes : null,
      resposta: r.resposta ? Motor.cortar(r.resposta, 120) : null,
      dinamicos: r.modo === 'multipla' && dinamicosAtuais.length ? dinamicosAtuais.slice(0, 4) : null
    };
    sessao.eventos.push({ acertou: evento.acertou });
    if (Sinc) Sinc.anotar(evento, id);

    ultimoRegistro = { id, est, evento, r };

    reordenarNovos();
    salvarProgresso();
    atualizarPlacar();
  }

  /* Reordena só a parte inédita da fila, mantendo as mesmas posições — o
     ritmo de entrada de cards novos continua igual, muda apenas de que
     nível é o próximo, conforme o seu desempenho. */
  function reordenarNovos() {
    ordenarIneditos(progresso);
  }

  /* Escreveu, foi contado como erro, mas acha que a resposta valia. O card
     pode estar incompleto, não ele — e quem sabe disso é quem respondeu.
     Fica registrado para revisarmos card a card na próxima atualização. */
  function mostrarContestar(r) {
    const cabe = r.modo === 'escrita' && !r.acertou && !r.desistiu
      && String(r.resposta || '').trim();
    el['area-contestar'].classList.toggle('oculto', !cabe);
  }

  function contestar() {
    if (!ultimoRegistro) return;
    const { id, evento, r } = ultimoRegistro;

    progresso.contestacoes = progresso.contestacoes || [];
    const repetida = progresso.contestacoes.some(c =>
      c.card === id && Motor.normalizar(c.resposta) === Motor.normalizar(r.resposta));

    if (!repetida) {
      const agora = new Date().toISOString();
      const esperado = Motor.resposta(cardAtual, r.direcao);
      progresso.contestacoes.push({
        em: agora, card: id, pergunta: Motor.pergunta(cardAtual, r.direcao), pt: cardAtual[A],
        nivel: cardAtual.nivel, direcao: r.direcao, esperado: esperado, resposta: r.resposta
      });
      salvarProgresso();
      if (Sinc) Sinc.retorno('contestacoes', {
        id: novoId(), usuario_id: ctx.uid, curso: ctx.curso, card_id: id, versao: evento.versao,
        etapa: evento.etapa_antes === 'consolidado' ? 'inversa-multipla' : evento.etapa_antes,
        resposta: Motor.cortar(r.resposta, 120), esperado: Motor.cortar(esperado, 300),
        resposta_id: evento.id, feito_em: agora
      });
    }

    el['btn-contestar'].disabled = true;
    el['aviso-contestado'].classList.remove('oculto');
  }

  /* ── comentário livre sobre um card ──
     A contestação só cabe quando você escreveu e foi contado como erro. Mas
     o reparo mais útil costuma vir de outro lugar: distrator que também
     serve, nota que confunde, frase que ninguém diz. Isso vale para
     qualquer card, tendo acertado ou não, e vem do card ou da lista. */
  let comentandoId = null;

  function abrirComentario(id) {
    const c = PORID[id]; if (!c) return;
    comentandoId = id;
    el['comentario-alvo'].textContent = c[L] + ' → ' + c[A];
    el['comentario-texto'].value = '';
    contarComentario();
    el['comentario-fundo'].classList.remove('oculto');
    el['comentario-texto'].focus();
  }

  function fecharComentario() {
    comentandoId = null;
    el['comentario-fundo'].classList.add('oculto');
  }

  function contarComentario() {
    const limite = Motor.LIMITES.comentario;
    const ta = el['comentario-texto'];
    /* O maxlength segura a digitação, mas não o que entra por script nem
       toda colagem de teclado virtual — e aí o contador ia a número
       negativo. Cortar aqui faz o campo nunca passar do teto. */
    if (ta.value.length > limite) ta.value = Motor.cortar(ta.value, limite);
    const restam = limite - ta.value.length;
    el['comentario-restam'].textContent = restam;
    el['comentario-restam'].parentElement.classList.toggle('no-fim', restam <= 40);
  }

  function enviarComentario() {
    if (!comentandoId) return;
    const texto = Motor.cortar(el['comentario-texto'].value, Motor.LIMITES.comentario).trim();
    if (!texto) { fecharComentario(); return; }

    const c = PORID[comentandoId];
    const agora = new Date().toISOString();
    progresso.comentarios = progresso.comentarios || [];
    /* o mesmo reparo anotado duas vezes é um só (card + texto normalizado) */
    const repetido = progresso.comentarios.some(x =>
      x.card === comentandoId && Motor.normalizar(x.texto) === Motor.normalizar(texto));
    if (!repetido) {
      progresso.comentarios.push({ em: agora, card: comentandoId, pergunta: c[L], pt: c[A], nivel: c.nivel, texto: texto });
      salvarProgresso();
      if (Sinc) Sinc.retorno('comentarios', {
        id: novoId(), usuario_id: ctx.uid, curso: ctx.curso, card_id: comentandoId,
        versao: (PORID_FONTE[comentandoId] && PORID_FONTE[comentandoId].v) || '00000000',
        texto: texto, feito_em: agora
      });
    }
    fecharComentario();
    statusSync(t('comentario.anotado'), 'ok');
  }

  function avancar() {
    // com o julgamento pendente, avançar deixaria a resposta sem registro
    if (respostaPendente && !ultimoRegistro) return;
    proximoCard();
  }

  /* ═══════════════ painel ═══════════════ */

  function abrirPainel() {
    const ids = Object.keys(progresso.cards);
    const tt = progresso.totais;
    const taxa = tt.respostas ? Math.round(100 * tt.acertos / tt.respostas) : 0;

    /* Estreias: a primeira vez de cada card é a única medida limpa do que
       você já sabia antes de o app te mostrar a resposta. */
    const estreados = ids.filter(id => progresso.cards[id].primeiraCerta !== undefined);
    const dePrimeira = estreados.filter(id => progresso.cards[id].primeiraCerta);

    const etapaDe = id => progresso.cards[id].etapa;
    const dominados = ids.filter(id => etapaDe(id) === 'dominado').length;
    const dir = Motor.contarDirecoes(progresso.cards, progresso.arquivados);
    const presos = CARDS.filter(c => !progresso.cards[c.id] &&
                                     !Motor.liberado(c, progresso.cards, null, progresso.arquivados)).length;
    /* A chance de o próximo card ser novo: a mesma conta do sorteio (ver
       Motor.escolherProximo), com o que está pronto agora. */
    const temIneditos = (progresso.ineditos || []).length > 0;
    const alvo = Motor.alvoDaFila(progresso.diario);
    const recente = Motor.acertoRecente(progresso.diario);
    const chanceNovo = Motor.chanceDoProximoNovo(contextoDaEscolha());
    const aConfirmar = presumidosAConfirmar();

    let html = '<div class="grade">' +
      /* a ordem faz pares na tela de duas colunas: o que já saiu e a chance
         de sair mais; as duas taxas de acerto; as filas e onde elas acabam */
      metrica(ids.length + '/' + CARDS.length, t('painel.vistos')) +
      metrica(!temIneditos ? '—' : Math.round(100 * chanceNovo) + '%',
              t(!temIneditos
                ? (presos ? 'painel.presos' : 'painel.todosApareceram')
                : 'painel.chanceNovo')) +
      metrica(pctDe(dePrimeira.length, estreados.length), t('painel.dePrimeira')) +
      metrica(taxa + '%', t('painel.geral', { n: milhar(tt.respostas) })) +
      /* É a meta que a chance de card novo persegue — vê-la explica por que
         o card novo às vezes vem depressa e às vezes rareia. No modo trilhas
         só há a ida. */
      (TRILHAS ? metrica(dir.esPt, t('painel.ida', { alvoIda: alvo.esPt, taxa: Math.round(100 * recente.taxa) }))
        : metrica(dir.esPt + ' · ' + dir.ptEs,
              t('painel.direcoes', { ida: ROTULO_IDA, volta: ROTULO_VOLTA, alvoIda: alvo.esPt, taxa: Math.round(100 * recente.taxa) }))) +
      metrica(dominados, t(TRILHAS ? 'painel.dominadosIda' : 'painel.dominados')) +
      /* os presumidos do nivelamento ainda sem resposta (PLANO.md, 7.2) */
      (aConfirmar.n ? metrica(milhar(aConfirmar.n), t('painel.aConfirmar')) : '') +
      '</div>';

    /* A vitrine (PLANO.md, 7.4): desde o primeiro dia, o próximo texto. */
    html += vitrine();

    /* O caminho vem primeiro: é a figura do estudo inteiro, etapa por etapa,
       e a tabela de acerto por nível lê melhor depois dela. «Em que pé está
       cada nível» e «Velocidade a cada semana» saíram a pedido (26/09). */
    html += graficoEtapas();
    html += tabelaNivel();
    html += tabelaDominados();
    html += tabelaMemoria();
    html += calendarioEstudo();
    html += graficoRespostasDia();

    esconderDica();
    el['painel-conteudo'].innerHTML = html;
    aplicarEstilos(el['painel-conteudo']);
    ligarGrafico();
    const verTextos = document.getElementById('btn-vitrine');
    if (verTextos) verTextos.addEventListener('click', abrirTexto);
    mostrar('tela-painel');
  }

  /* Os presumidos que ainda esperam confirmação — sem estado, fora do
     arquivo — e a data do mais próximo. */
  function presumidosAConfirmar() {
    const pres = (progresso.nivelamento && progresso.nivelamento.presumidos) || {};
    let n = 0, proxima = null;
    Object.keys(pres).forEach(id => {
      if (!PORID[id] || Motor.arquivado(id, progresso.arquivados || {})) return;
      const volta = Motor.presumidoEm(id, progresso.cards);
      if (!volta) return;
      n++;
      if (!proxima || volta < proxima) proxima = volta;
    });
    return { n: n, proxima: proxima };
  }

  /* ── a vitrine ──
     O texto que a pessoa estuda agora (o primeiro dos ativos): título, autor,
     o primeiro verso, quantos versos já leu e quantas palavras faltam. Curso
     sem texto não tem vitrine. */
  function vitrine() {
    if (!TEXTOS.length) return '';
    const txt = textosAtivosAgora()[0];
    if (!txt) return '';
    const verso = Motor.versosDoTexto(txt)[0] || {};
    const a = Motor.andamentoDoTexto(txt, progresso.cards, progresso.arquivados || {});
    const vistos = Motor.versosVistos(txt, progresso.textos.lidos);
    return '<div class="vitrine"><h3>' + t('painel.vitrine') + '</h3>' +
      '<p class="vitrine-titulo"><b lang="' + L + '">' + escapar(txt.titulo) + '</b> · ' + escapar(txt.autor) +
      (txt.parte ? ' · ' + rotuloDaParte(txt) : '') + '</p>' +
      (verso.t ? '<p class="vitrine-verso" lang="' + L + '">' + escapar(verso.t) + '</p>' : '') +
      '<p class="vitrine-conta">' + t('texto.andamento', { k: vistos, n: a.versos }) + ' · ' +
      (a.faltam ? tn('painel.vitrineFaltam', a.faltam, { n: milhar(a.faltam) }) : t('painel.vitrinePronto')) + '</p>' +
      '<button class="link-comentar" id="btn-vitrine">' + t('painel.vitrineVer') + '</button></div>';
  }

  /* A CSP da Taioé não aceita atributo style vindo de HTML montado em texto;
     cor, largura e teto entram depois, pelo CSSOM, que ela permite. */
  function aplicarEstilos(raiz) {
    raiz.querySelectorAll('[data-cor]').forEach(e => { e.style.background = e.dataset.cor; });
    raiz.querySelectorAll('[data-largura]').forEach(e => { e.style.width = e.dataset.largura + '%'; });
    raiz.querySelectorAll('[data-max]').forEach(e => { e.style.maxWidth = e.dataset.max + 'px'; });
  }

  function pctDe(parte, total) {
    return total ? Math.round(100 * parte / total) + '%' : '—';
  }

  function metrica(valor, rotulo) {
    return '<div class="metrica"><div class="valor">' + valor +
      '</div><div class="rotulo">' + rotulo + '</div></div>';
  }

  /* Por nível, separando a estreia das respostas seguintes: a estreia diz
     o que você já trazia, o resto diz o quanto está fixando.

     Os números saem dos contadores do card (vistas, acertos, primeiraCerta),
     e não do histórico: o histórico guarda só as últimas 12 respostas, então
     em card muito praticado o historico[0] já não é a estreia — e era isso
     que fazia a coluna "de primeira" mentir justamente onde havia mais dado. */
  /* ── o caminho até aqui ──
     Quantos cards em cada etapa, a cada resposta. A série é anotada pelo app
     a cada resposta e vem semeada com o histórico exato do repositório de
     dados (ver conciliarFila) — não é reconstrução nem estimativa: cada ponto
     é uma contagem que existiu.

     Os pontos semeados são um por sincronização, a cada três respostas; os
     anotados daqui em diante são um por resposta. A curva fica mais rala
     atrás e mais fina à frente, o que não incomoda numa figura de 600px. */

  /* Oito bandas, de baixo para cima, e cada uma é uma etapa: as duas
     direções, e os seis degraus do dominado, cada um com a sua cor (ver
     --escada-* no style.css). Eram uma rampa de verde, que lia a ordem mas
     juntava os degraus num bloco só; o pedido foi tratá-los como etapas
     separadas, com o último — seis meses, o card que ficou — em branco. A
     claridade sobe a cada degrau, então a ordem continua visível. */
  const SERIES = [
    { chave: 0, nome: ROTULO_IDA,   cor: 'var(--serie-espt)' },
    /* a volta, que o modo trilhas não tem */
    ...(TRILHAS ? [] : [{ chave: 1, nome: ROTULO_VOLTA, cor: 'var(--serie-ptes)' }]),
    { chave: 2, nome: rotuloEspera(3),   cor: 'var(--escada-0)', degrau: true },
    { chave: 3, nome: rotuloEspera(7),   cor: 'var(--escada-1)', degrau: true },
    { chave: 4, nome: rotuloEspera(14),  cor: 'var(--escada-2)', degrau: true },
    { chave: 5, nome: rotuloEspera(30),  cor: 'var(--escada-3)', degrau: true },
    { chave: 6, nome: rotuloEspera(90),  cor: 'var(--escada-4)', degrau: true },
    { chave: 7, nome: rotuloEspera(180), cor: 'var(--escada-5)', degrau: true }
  ];

  function graficoEtapas() {
    const bruta = (progresso.serie || []).filter(p => Array.isArray(p) && p.length === 9);
    if (bruta.length < 20) return '';           // curva de nada não se desenha
    /* [respostas, esPt, ptEs, d0..d5] → o desenho precisa das oito contagens,
       e a resposta vira o rótulo do eixo. */
    const serie = bruta.map(p => p.slice(1));
    const eixoX = bruta.map(p => p[0]);
    const soma = p => p.reduce((a, b) => a + b, 0);

    /* Alto o dobro do que era: no celular a figura ficava espremida e as
       três bandas se confundiam perto do fim, onde elas mais importam. */
    const L = 34, R = 634, T = 10, B = 330, ALT = 352;
    const n = serie.length;
    const topo = Math.max(...serie.map(soma));
    const passo = topo > 400 ? 100 : topo > 200 ? 50 : 25;
    const ymax = Math.ceil(topo / passo) * passo || passo;
    /* O eixo anda em RESPOSTAS, e não em índice de ponto. Os pontos semeados
       são um por sincronização e as sincronizações não foram parelhas: espaçar
       por índice esticaria os dias de muita sincronização e comprimiria os
       outros, contando uma história torta. */
    const xIni = eixoX[0], xFim = eixoX[n - 1];
    const vao = Math.max(1, xFim - xIni);
    const x = i => L + ((eixoX[i] - xIni) / vao) * (R - L);
    const y = v => B - (v / ymax) * (B - T);

    /* Amostra: mil e quinhentos pontos num SVG de 600px de largura são quatro
       por pixel, e o arquivo fica enorme sem que nada disso apareça. */
    const passoAmostra = Math.max(1, Math.ceil(n / 300));
    const idx = [];
    for (let i = 0; i < n; i += passoAmostra) idx.push(i);
    if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);

    let svg = '';
    for (let v = 0; v <= ymax; v += passo) {
      svg += '<line x1="' + L + '" y1="' + y(v).toFixed(1) + '" x2="' + R +
        '" y2="' + y(v).toFixed(1) + '" class="malha"/>' +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 3.5).toFixed(1) + '" class="eixo" text-anchor="end">' + v + '</text>';
    }

    /* Bandas empilhadas, de baixo para cima, com dois pixels de fundo entre
       elas — é a separação que faz duas cores vizinhas se lerem. */
    let base = new Array(n).fill(0);
    SERIES.forEach(s => {
      const topoBanda = base.map((b, i) => b + serie[i][s.chave]);
      const cima = idx.map(i => x(i).toFixed(1) + ' ' + y(topoBanda[i]).toFixed(1));
      const baixo = idx.slice().reverse().map(i => x(i).toFixed(1) + ' ' + y(base[i]).toFixed(1));
      svg += '<path d="M' + cima.concat(baixo).join('L') + 'Z" fill="' + s.cor + '"/>';
      base = topoBanda;
    });
    /* Uma fresta de um pixel entre cada etapa e a seguinte, a mesma em
       todas (pedido do Gere, 06/10/2026): a de dois pixels nas direções
       parecia linha mais grossa, e nos degraus apagaria o degrau fino. */
    let sep = new Array(n).fill(0);
    for (let k = 0; k < SERIES.length - 1; k++) {
      sep = sep.map((b, i) => b + serie[i][SERIES[k].chave]);
      svg += '<path d="M' + idx.map(i => x(i).toFixed(1) + ' ' + y(sep[i]).toFixed(1)).join('L') +
        '" fill="none" class="fresta"/>';
    }

    /* Rótulos em números redondos de resposta, e não no valor do ponto que
       calhou de cair ali. */
    const passoX = vao > 2000 ? 500 : vao > 800 ? 250 : vao > 300 ? 100 : 50;
    for (let v = Math.ceil(xIni / passoX) * passoX; v <= xFim; v += passoX) {
      const px = L + ((v - xIni) / vao) * (R - L);
      svg += '<text x="' + px.toFixed(1) + '" y="' + (B + 15) + '" class="eixo" ' +
        'text-anchor="middle">' + v + '</text>';
    }
    svg += '<line id="g-cursor" y1="' + T + '" y2="' + B + '" class="cursor" display="none"/>';
    svg += '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) +
      '" fill="transparent" id="g-toque"/>';

    /* A legenda segue a pilha, de baixo para cima: as oito etapas lado a
       lado, com o mesmo peso — o degrau não é mais um apêndice do dominado. */
    const ult = serie[n - 1];
    const chaves = SERIES.map(s =>
      '<span class="chave"><i data-cor="' + s.cor + '"></i>' + s.nome +
      ' <b data-serie="' + s.chave + '">' + ult[s.chave] + '</b></span>').join('');

    return '<h3>' + t('painel.caminho') + '</h3>' +
      '<p class="legenda">' + t('painel.caminhoLegenda', { n: milhar(eixoX[n - 1]) }) + '</p>' +
      '<div class="chaves" id="g-chaves">' + chaves + '</div>' +
      '<svg class="grafico-etapas" viewBox="0 0 640 ' + ALT + '" role="img" ' +
      'aria-label="' + escapar(t('painel.caminhoAria')) + '">' + svg + '</svg>' +
      '<script type="application/json" id="g-dados">' +
      JSON.stringify(idx.map(i => [i].concat(serie[i], [eixoX[i]]))) +
      '</' + 'script>';
  }

  /* O gráfico é remontado a cada abertura do painel, então o ouvinte se
     amarra depois de o HTML entrar.

     Só o toque parado escolhe um ponto. O dedo que arrasta está rolando a
     página, e o pointerdown disparava antes de dar para saber — cada rolagem
     que começava em cima do gráfico mudava o ponto lido. Agora vale o click,
     que o celular já não dispara depois de uma rolagem, e para o mouse, que
     dispara, a conta da distância entre apertar e soltar resolve. */
  function ligarGrafico() {
    const svg = el['painel-conteudo'].querySelector('.grafico-etapas');
    const dados = el['painel-conteudo'].querySelector('#g-dados');
    if (!svg || !dados) return;
    const pontos = JSON.parse(dados.textContent);
    const cursor = svg.querySelector('#g-cursor');
    const valores = [...el['painel-conteudo'].querySelectorAll('[data-serie]')];

    const toque = svg.querySelector('#g-toque');
    let inicio = null;
    toque.addEventListener('pointerdown', ev => { inicio = [ev.clientX, ev.clientY]; });
    toque.addEventListener('click', ev => {
      if (inicio && Math.hypot(ev.clientX - inicio[0], ev.clientY - inicio[1]) > 8) return;
      const r = svg.getBoundingClientRect();
      const alvo = (ev.clientX - r.left) / r.width * 640;
      /* Mesma escala do desenho: o eixo anda em respostas, que é o último
         número de cada ponto. */
      const R_ = p => p[p.length - 1];
      const ini = R_(pontos[0]), fim = R_(pontos[pontos.length - 1]);
      const largo = Math.max(1, fim - ini);
      const emX = p => 34 + ((R_(p) - ini) / largo) * 600;
      let melhor = 0;
      pontos.forEach((p, k) => {
        if (Math.abs(emX(p) - alvo) < Math.abs(emX(pontos[melhor]) - alvo)) melhor = k;
      });
      const p = pontos[melhor];
      const px = emX(p);
      cursor.setAttribute('x1', px);
      cursor.setAttribute('x2', px);
      cursor.removeAttribute('display');
      valores.forEach(b => { b.textContent = p[1 + Number(b.dataset.serie)]; });
    });
  }

  /* ── a escada dos dominados ──
     O dominado não volta pela fila: volta por data, e a espera cresce a cada
     revisão certa — 3 dias, 1 semana, 2, 1 mês, 3 meses, meio ano. Esta
     tabela diz onde cada um está parado: quantos em cada degrau, quantos já
     venceram a data e estão esperando a vez de furar a fila, e quando o
     próximo dos que ainda esperam vai aparecer.

     Errar recua um degrau e não tira ninguém daqui: um card de 90 dias passa
     a voltar em 30, e continua dominado. */
  function rotuloEspera(dias) {
    if (dias === 7) return t('espera.semana1');
    if (dias === 30) return t('espera.mes1');
    if (dias < 7) return t('espera.dias', { n: dias });
    if (dias < 30 && dias % 7 === 0) return t('espera.semanas', { n: dias / 7 });
    if (dias % 30 === 0) return t('espera.meses', { n: dias / 30 });
    return t('espera.dias', { n: dias });
  }

  /* Perto da hora, dias não dizem nada: «amanhã» pode ser daqui a uma hora ou
     a vinte e três. Abaixo de dois dias a conta vira hora, e abaixo de cem
     minutos vira minuto. */
  function quandoVolta(iso) {
    const min = Math.round((Date.parse(iso) - Date.now()) / 60000);
    if (min <= 0) return t('volta.agora');
    if (min < 100) return t('volta.min', { n: min });
    const horas = Math.round(min / 60);
    if (horas < 48) return t('volta.h', { n: horas });
    const dias = Math.round(horas / 24);
    if (dias < 60) return t('volta.dias', { n: dias });
    return t('volta.meses', { n: Math.round(dias / 30) });
  }

  function tabelaDominados() {
    const agora = new Date().toISOString();
    const degraus = Motor.DIAS_DOMINADO.map(dias => (
      { dias: dias, n: 0, vencidos: 0, proxima: null }));
    (progresso.dominados || []).forEach(id => {
      const e = progresso.cards[id];
      if (!e) return;
      const d = degraus[Math.min(e.revisoes || 0, degraus.length - 1)];
      d.n++;
      if (!Motor.esperando(e, agora)) d.vencidos++;
      else if (!d.proxima || e.voltaEm < d.proxima) d.proxima = e.voltaEm;
    });

    const total = degraus.reduce((s, d) => s + d.n, 0);
    /* ao lado da escada, os presumidos do nivelamento: dominados provisórios,
       que voltam por data como revisão e só então ganham degrau */
    const conf = presumidosAConfirmar();
    const aConfirmar = conf.n ? '<p class="legenda">' + t('painel.aConfirmarLegenda',
      { n: milhar(conf.n), quando: quandoVolta(conf.proxima) }) + '</p>' : '';
    if (!total) return aConfirmar ? '<h3>' + t('painel.escada') + '</h3>' + aConfirmar : '';

    const linhas = degraus.map(d => {
      /* Degrau vazio fica na tabela, esmaecido: a escada é a mesma para todo
         mundo, e ver o degrau vago diz que ninguém chegou lá ainda. */
      const vazio = d.n ? '' : ' class="vago"';
      /* Havendo vencidos no degrau, o próximo é um deles, e volta agora — a
         data do seguinte, ainda de molho, não diz nada. O número diz quantos
         já esperam a vez na fila. */
      const quando = d.vencidos ? tn('painel.agoraFila', d.vencidos, { n: milhar(d.vencidos) })
        : d.proxima ? quandoVolta(d.proxima) : '—';
      return '<tr' + vazio + '><td>' + rotuloEspera(d.dias) + '</td>' +
        '<td class="num">' + (d.n || '—') + '</td>' +
        '<td class="num">' + quando + '</td></tr>';
    }).join('');

    return '<h3>' + t('painel.escada') + '</h3>' +
      '<p class="legenda">' + t('painel.escadaLegenda') + '</p>' +
      '<table><tr><th>' + t('painel.espera') + '</th><th class="num">' + t('painel.cards') + '</th>' +
      '<th class="num">' + t('painel.proximoVolta') + '</th></tr>' + linhas +
      '<tr class="soma"><td>' + t('painel.todos') + '</td><td class="num">' + total + '</td>' +
      '<td class="num">—</td></tr></table>' + aConfirmar;
  }

  function tabelaNivel() {
    const g = {};
    Motor.NIVEIS.forEach(n => (g[n] =
      { vistos: 0, estreias: 0, certasEstreia: 0, depois: 0, certasDepois: 0,
        semEstreia: 0, respostas: 0, certas: 0 }));

    Object.keys(progresso.cards).forEach(id => {
      const c = PORID[id]; if (!c) return;
      const e = progresso.cards[id];
      const x = g[c.nivel];
      if (!e.vistas) return;
      x.vistos++;
      /* O geral entra por fora das outras duas colunas, e inclui os cards sem
         estreia anotada: é a conta de todas as respostas daquele nível. */
      x.respostas += e.vistas;
      x.certas += e.acertos;
      /* Sem saber se a estreia foi certa não dá para separá-la do resto:
         contar as respostas em «depois» e nenhuma em «de primeira» punha
         o acerto da estreia num denominador que não o comportava, e a
         coluna passava de 100%. Card assim fica fora das duas colunas —
         só as duas descrevendo o mesmo conjunto é que fecham. */
      if (e.primeiraCerta === undefined) { x.semEstreia++; return; }
      x.estreias++;
      if (e.primeiraCerta) x.certasEstreia++;
      /* tudo o que veio depois da estreia */
      x.depois += Math.max(0, e.vistas - 1);
      x.certasDepois += Math.max(0, e.acertos - (e.primeiraCerta ? 1 : 0));
    });

    const linhas = Motor.NIVEIS.filter(n => g[n].vistos).map(n => {
      const x = g[n];
      const geral = x.respostas ? Math.round(100 * x.certas / x.respostas) : 0;
      return '<tr><td>' + n + '</td>' +
        '<td class="num">' + x.vistos + '</td>' +
        '<td class="num">' + pctDe(x.certasEstreia, x.estreias) + '</td>' +
        '<td class="num">' + pctDe(x.certasDepois, x.depois) + '</td>' +
        '<td class="num">' + (x.respostas ? geral + '%' : '—') + '</td>' +
        '<td class="col-barra"><div class="barra"><i data-largura="' + geral + '"></i></div></td></tr>';
    }).join('');

    if (!linhas) return '';
    const semEstreia = Motor.NIVEIS.reduce((a, n) => a + g[n].semEstreia, 0);
    return '<h3>' + t('painel.acerto') + '</h3><p class="legenda">' + t('painel.acertoLegenda') +
      (semEstreia ? t('painel.semEstreia', { n: semEstreia }) : '') +
      '</p>' +
      '<table class="nivel"><tr><th>' + t('painel.nivel') + '</th>' +
      [t('painel.cards'), t('painel.colDePrimeira'), t('painel.colDepois'), t('painel.colGeral')].map(r =>
        '<th class="vert"><span>' + r + '</span></th>').join('') +
      '<th></th></tr>' + linhas + '</table>';
  }

  /* ═══════════════ os gráficos do diário ═══════════════
     Tudo daqui para baixo sai de progresso.diario (um resumo por dia), de
     progresso.retencao e da ficha de cada card. Os desenhos são SVG
     de largura fixa que a tela encolhe; tocar num quadrado, numa barra ou
     num ponto mostra o número dele na dica. */

  const MESES = t('datas.meses').split(',');
  const SEMANA = t('datas.semana').split(',');
  /* «seg, 06/10»: o dia da semana e o dia, na ordem e no formato da língua */
  const diaDaSemana = d => t('datas.diaSemana', { semana: SEMANA[meioDia(d).getDay()], dia: diaMes(d) });
  const RAMPA = ['var(--degrau-0)', 'var(--degrau-1)', 'var(--degrau-2)',
                 'var(--degrau-3)', 'var(--degrau-4)', 'var(--degrau-5)'];
  const LARGURA = 500;

  const milhar = n => Number(n).toLocaleString(LOCAL);
  const diaMes = d => meioDia(d).toLocaleDateString(LOCAL, { day: '2-digit', month: '2-digit' });
  const comDica = texto => ' class="alvo" data-dica="' + escapar(texto) + '"';
  const figura = (w, h, miolo, rotulo, extra) =>
    '<svg class="grafico"' + (extra || '') + ' viewBox="0 0 ' + w + ' ' + h +
    '" role="img" aria-label="' + escapar(rotulo) + '">' + miolo + '</svg>';
  const linhaDeGrade = (x1, x2, y) =>
    '<line class="malha" x1="' + x1 + '" x2="' + x2 + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
  /* Barra de topo arredondado e base reta, apoiada no eixo. */
  function barra(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x.toFixed(1) + ',' + (y + h).toFixed(1) + 'V' + (y + r).toFixed(1) +
      'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + r).toFixed(1) + ',' + y.toFixed(1) +
      'H' + (x + w - r).toFixed(1) + 'Q' + (x + w).toFixed(1) + ',' + y.toFixed(1) + ' ' +
      (x + w).toFixed(1) + ',' + (y + r).toFixed(1) + 'V' + (y + h).toFixed(1) + 'Z';
  }
  /* Um passo redondo para a grade, com umas quatro linhas. */
  function passoRedondo(topo) {
    const bruto = Math.max(1, topo / 4);
    const ordem = Math.pow(10, Math.floor(Math.log10(bruto)));
    const f = bruto / ordem;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * ordem;
  }

  /* Meio-dia local: somar dias ao meio-dia nunca tropeça numa troca de
     horário de verão. */
  const meioDia = d => new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10), 12);

  /* Os dias do diário, de ponta a ponta até hoje, sem buraco: dia sem
     estudo entra com zero. */
  function diasDoDiario() {
    const diario = progresso.diario || {};
    const chaves = Object.keys(diario).filter(d => diario[d] && diario[d].n).sort();
    if (!chaves.length) return [];
    const hoje = Motor.diaLocal(new Date());
    const fim = chaves[chaves.length - 1] > hoje ? chaves[chaves.length - 1] : hoje;
    const dias = [];
    for (const t = meioDia(chaves[0]); ; t.setDate(t.getDate() + 1)) {
      const d = Motor.diaLocal(t);
      const g = diario[d];
      dias.push({ d, n: g ? g.n : 0, ok: g ? g.ok : 0, g });
      if (d >= fim || dias.length > 3700) break;
    }
    return dias;
  }

  /* ── o calendário ──
     Um quadrado por dia, semana a semana, das últimas dezoito. O tom de
     verde é o volume do dia, e o número está na dica. */
  function calendarioEstudo() {
    let dias = diasDoDiario();
    if (!dias.length) return '';
    const segundaDe = d => (meioDia(d).getDay() + 6) % 7;         // seg = 0
    const SEMANAS = 18;
    const corte = meioDia(dias[dias.length - 1].d);
    corte.setDate(corte.getDate() - segundaDe(dias[dias.length - 1].d) - 7 * (SEMANAS - 1));
    dias = dias.filter(x => meioDia(x.d) >= corte);
    const inicio = meioDia(dias[0].d);
    inicio.setDate(inicio.getDate() - segundaDe(dias[0].d));

    const maior = Math.max(...dias.map(x => x.n));
    const tam = 20, vao = 4, L = 32, T = 20;
    let m = '', colunas = 0, ultimoMes = -9;
    [SEMANA[1], SEMANA[3], SEMANA[5]].forEach((n, i) => {
      m += '<text x="' + (L - 6) + '" y="' + (T + 2 * i * (tam + vao) + tam / 2 + 4) +
        '" text-anchor="end">' + n + '</text>';
    });
    dias.forEach(x => {
      const col = Math.floor((meioDia(x.d) - inicio + 3600e3) / (7 * 864e5));
      colunas = Math.max(colunas, col + 1);
      const lin = segundaDe(x.d);
      const tom = x.n ? RAMPA[Math.min(5, Math.floor(5 * x.n / (maior + 1)) + 1)] : 'var(--fundo-3)';
      const nome = diaDaSemana(x.d);
      m += '<rect' + comDica(nome + ' — ' + (x.n ? tn('painel.respostas', x.n, { n: milhar(x.n) }) : t('painel.semEstudo'))) +
        ' x="' + (L + col * (tam + vao)) + '" y="' + (T + lin * (tam + vao)) +
        '" width="' + tam + '" height="' + tam + '" rx="5" fill="' + tom + '"/>';
      /* o mês no alto da coluna em que ele começa, se couber */
      const mes = +x.d.slice(5, 7) - 1;
      if ((x.d.slice(8) === '01' || x === dias[0]) && col - ultimoMes >= 2) {
        m += '<text x="' + (L + col * (tam + vao)) + '" y="' + (T - 7) + '">' + MESES[mes] + '</text>';
        ultimoMes = col;
      }
    });
    const W = L + colunas * (tam + vao), H = T + 7 * (tam + vao);
    return '<h3>' + t('painel.calendario') + '</h3>' +
      '<div class="calendario" data-max="' + Math.round(W * 1.2) + '">' +
      figura(W, H, m, t('painel.calendarioAria')) + '</div>';
  }

  /* ── respostas por dia ──
     Os últimos sessenta dias em barras. A média é a dos sete dias antes de
     hoje: o de hoje ainda está pela metade. */
  function graficoRespostasDia() {
    const todos = diasDoDiario();
    if (todos.length < 2) return '';
    const antes = todos.slice(0, -1).slice(-7);
    const media = Math.round(antes.reduce((a, x) => a + x.n, 0) / antes.length);
    const recorde = todos.reduce((a, x) => x.n > a.n ? x : a);
    return '<h3>' + t('painel.respostasDia') + '</h3>' +
      '<p class="legenda">' + t('painel.respostasDiaLegenda', {
        periodo: tn('painel.dias', antes.length), media: milhar(media), recorde: milhar(recorde.n), dia: diaMes(recorde.d) }) + '</p>' +
      barrasPorDia(todos.slice(-60), 'var(--degrau-2)', n => tn('painel.respostas', n, { n: milhar(n) }), t('painel.respostasDia'));
  }

  function barrasPorDia(dias, cor, rotulo, titulo) {
    const W = LARGURA, L = 36, R = 6, T = 10, B = 196;
    const maior = Math.max(1, ...dias.map(x => x.n));
    const passo = passoRedondo(maior);
    const topo = Math.ceil(maior / passo) * passo;
    const y = v => B - (v / topo) * (B - T);
    const coluna = (W - L - R) / dias.length, larg = Math.max(2, Math.min(14, coluna * 0.72));
    const cadaRotulo = Math.ceil(dias.length / 7);
    let m = '';
    for (let v = 0; v <= topo; v += passo) {
      m += linhaDeGrade(L, W - R, y(v)) +
        '<text x="' + (L - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + milhar(v) + '</text>';
    }
    dias.forEach((x, i) => {
      const bx = L + i * coluna + (coluna - larg) / 2;
      if (x.n) {
        m += '<path' + comDica(diaDaSemana(x.d) + ' — ' + rotulo(x.n)) +
          ' d="' + barra(bx, y(x.n), larg, B - y(x.n), 3) + '" fill="' + cor + '"/>';
      }
      if ((dias.length - 1 - i) % cadaRotulo === 0) {
        m += '<text x="' + (bx + larg / 2).toFixed(1) + '" y="' + (B + 22) + '" text-anchor="middle">' + diaMes(x.d) + '</text>';
      }
    });
    return figura(W, B + 30, m, titulo);
  }

  /* ── a memória depois da espera ──
     Cada revisão de dominado, pelo degrau em que o card estava: quanto se
     lembra depois de três dias sem vê-lo, de uma semana, e assim por diante. */
  function tabelaMemoria() {
    const ret = progresso.retencao || [];
    if (!ret.some(g => g && g[0])) return '';
    const linhas = Motor.DIAS_DOMINADO.map((dias, i) => {
      const g = ret[i] || [0, 0];
      const acerto = g[0] >= 5 ? pctDe(g[1], g[0]) : g[0] ? t('painel.poucosDados') : '—';
      return '<tr' + (g[0] < 5 ? ' class="vago"' : '') + '><td>' + rotuloEspera(dias) + '</td>' +
        '<td class="num">' + (g[0] || '—') + '</td><td class="num">' + acerto + '</td></tr>';
    }).join('');
    return '<h3>' + t('painel.memoria') + '</h3>' +
      '<table><tr><th>' + t('painel.espera') + '</th><th class="num">' + t('painel.revisoes') + '</th><th class="num">' + t('painel.colAcerto') + '</th></tr>' +
      linhas + '</table>';
  }

  /* ── a dica ──
     Uma só, fixa na tela, para todos os gráficos. Vale o toque parado, como
     no gráfico do caminho: o dedo que arrasta está rolando a página. Com
     mouse, basta passar por cima. */
  function esconderDica() {
    el.dica.hidden = true;
    const antes = el['painel-conteudo'].querySelector('.alvo.tocado');
    if (antes) antes.classList.remove('tocado');
  }

  function mostrarDica(alvo, px, py) {
    const antes = el['painel-conteudo'].querySelector('.alvo.tocado');
    if (antes && antes !== alvo) antes.classList.remove('tocado');
    alvo.classList.add('tocado');
    el.dica.textContent = alvo.getAttribute('data-dica');
    el.dica.hidden = false;
    const larg = el.dica.offsetWidth, alt = el.dica.offsetHeight;
    let esq = px - larg / 2, topo = py - alt - 14;
    esq = Math.max(8, Math.min(esq, window.innerWidth - larg - 8));
    if (topo < 8) topo = py + 18;
    el.dica.style.left = esq + 'px';
    el.dica.style.top = topo + 'px';
  }

  function ligarDicas() {
    const painel = el['painel-conteudo'];
    let inicio = null;
    painel.addEventListener('pointerdown', ev => { inicio = [ev.clientX, ev.clientY]; });
    painel.addEventListener('click', ev => {
      if (inicio && Math.hypot(ev.clientX - inicio[0], ev.clientY - inicio[1]) > 8) return;
      const alvo = ev.target.closest && ev.target.closest('[data-dica]');
      if (!alvo) { esconderDica(); return; }
      mostrarDica(alvo, ev.clientX, ev.clientY);
    });
    painel.addEventListener('pointermove', ev => {
      if (ev.pointerType !== 'mouse') return;
      const alvo = ev.target.closest && ev.target.closest('[data-dica]');
      if (alvo) mostrarDica(alvo, ev.clientX, ev.clientY);
      else if (!el.dica.hidden) esconderDica();
    });
    window.addEventListener('scroll', () => { if (!el.dica.hidden) esconderDica(); }, { passive: true });
  }

  /* ═══════════════ todos os cards ═══════════════ */

  /* Situação de cada card, do jeito que interessa a quem está olhando a
     lista: não pelo nome interno da etapa, mas pelo que falta fazer. */
  function situacaoDe(id) {
    const e = progresso.cards[id];
    if (Motor.arquivado(id, progresso.arquivados)) {
      return { chave: 'arquivado', rotulo: t((PORID[id] || {}).tipo === 'palavra'
        ? 'situacao.arquivadoPalavra' : 'situacao.arquivado') };
    }
    /* a transparente total do curso conta como dominada e não entra em jogo;
       a presumida pelo nivelamento é dominada provisória (PLANO.md, 7.1 e 7.2) */
    if (Motor.transparenteTotal(id)) return { chave: 'transparente', rotulo: t('situacao.transparente') };
    if ((!e || !e.vistas) && Motor.presumidoEm(id, progresso.cards)) {
      return { chave: 'presumido', rotulo: t('situacao.presumido') };
    }
    if (!e || !e.vistas) {
      /* «Ainda não apareceu» sugere que é questão de tempo. A frase presa
         não é: ela depende de você vencer as palavras, e diz quais faltam. */
      const c = PORID[id];
      if (!Motor.liberado(c, progresso.cards, null, progresso.arquivados)) {
        const faltam = Motor.requeridas(c)
          .filter(r => Motor.sabidaEm(r, progresso.cards, progresso.arquivados) === Infinity)
          .map(r => String(r)[0] === '+' ? String(r).slice(1) : (PORID[r] || {})[L] || r);
        return { chave: 'preso', rotulo: faltam.length
          ? t('situacao.espera', { lista: faltam.map(aspas).join(', ') })
          : t('situacao.meiaNoite') };
      }
      return { chave: 'novo', rotulo: t('situacao.novo') };
    }
    if (e.etapa === 'dominado') return { chave: 'dominado', rotulo: t(TRILHAS ? 'situacao.dominadoIda' : 'situacao.dominado') };
    if (Motor.ehVolta(Motor.direcaoDe(e))) return { chave: 'invertido', rotulo: t('situacao.volta', { L: NOME_L }) };
    return {
      chave: 'andamento',
      rotulo: Motor.modoDe(e) === 'escrita' ? t('situacao.escrevendo', { A: NOME_A }) : t('modo.multipla')
    };
  }

  function montarFiltros() {
    const niveis = Motor.NIVEIS.filter(n => CARDS.some(c => c.nivel === n));
    niveis.forEach(n => {
      el['filtro-nivel'].insertAdjacentHTML('beforeend',
        '<option value="' + n + '">' + n + '</option>');
    });

    const conta = {};
    CARDS.forEach(c => (c.tags || []).forEach(g => { conta[g] = (conta[g] || 0) + 1; }));
    Object.keys(conta).sort((a, b) => conta[b] - conta[a] || nomeTag(a).localeCompare(nomeTag(b), LOCAL))
      .forEach(g => {
        el['filtro-tag'].insertAdjacentHTML('beforeend',
          '<option value="' + escapar(g) + '">' + escapar(nomeTag(g)) + ' (' + conta[g] + ')</option>');
      });
  }

  function abrirCards() {
    mostrar('tela-cards');
    renderizarCards();
  }

  /* ── «estudar mesmo assim» ──
     A transparente total volta ao jogo como card comum (extras.reativados,
     id → ISO); o caminho de volta grava a data com «-» na frente, o gesto de
     desfazer, para a mescla entre aparelhos saber qual veio por último (ver
     sincronia.js). Com o motor avisado (conciliarFila → usarExtras), o card
     entra nos inéditos — ou sai das filas, no caminho de volta. */
  function reativada(id) {
    return TaioeSincronia.gestoAtivo((progresso.reativados || {})[id]);
  }

  function marcarReativada(id, sim) {
    const c = PORID[id];
    if (!c) return;
    const agora = new Date().toISOString();
    progresso.reativados = progresso.reativados || {};
    progresso.reativados[id] = sim ? agora : '-' + agora;
    retirarDasFilas(id);
    const i = progresso.ineditos.indexOf(id);
    if (i >= 0) progresso.ineditos.splice(i, 1);
    conciliarFila(progresso);
    salvarProgresso();
    atualizarPlacar();
    if (Sinc) Sinc.agendar(3000);
    statusSync(t(sim ? 'cards.reativada' : 'cards.desreativada', { x: aspas(c[L]) }), 'ok');
  }

  /* A lista mostra o masculino, que é a forma canônica; o feminino entra
     embaixo, junto da nota, para o card de gênero não parecer um card comum. */
  function linhaDaNota(c) {
    const bruto = PORID_FONTE[c.id];
    const outra = bruto && Motor.temVariante(bruto) ? Motor.formaDoCard(bruto, 1) : null;
    /* e as palavras de outros lugares que o card também aceita */
    /* agrupadas por lugar: «A» e «B», na América Latina; «C», no México */
    const porLugar = new Map();
    Object.entries(c[Motor.CAMPOS[L].regionais] || {}).forEach(([forma, onde]) =>
      porLugar.set(onde, (porLugar.get(onde) || []).concat(aspas(forma.replace(/\.$/, '')))));
    const regionais = [...porLugar].map(([onde, formas]) =>
      formas.join(formas.length > 2 ? ', ' : t('lista.e')) + ', ' + lugar(onde));
    return [notaDe(c), outra ? t('nota.outraForma', { g: t('nota.feminino'), x: outra[L], y: outra[A] }) : '',
      regionais.length ? t('nota.tambemVale', { lista: regionais.join('; ') }) : '']
      .filter(Boolean).join('\n');
  }

  function renderizarCards() {
    const busca = Motor.normalizar(el['busca-cards'].value);
    const tipo = el['filtro-tipo'].value;
    const nivel = el['filtro-nivel'].value;
    const tag = el['filtro-tag'].value;
    const estado = el['filtro-estado'].value;

    const visiveis = CARDS.filter(c => {
      if (tipo && c.tipo !== tipo) return false;
      if (nivel && c.nivel !== nivel) return false;
      if (tag && !(c.tags || []).includes(tag)) return false;

      if (estado) {
        const e = progresso.cards[c.id];
        if (estado === 'errei') { if (!e || !e.erros) return false; }
        /* as transparentes do curso, inclusive as que a pessoa quis estudar
           mesmo assim — é daqui que elas voltam a contar como conhecidas */
        else if (estado === 'transparente') { if (c.transp !== 'total') return false; }
        else if (situacaoDe(c.id).chave !== estado) return false;
      }

      if (busca) {
        const alvo = Motor.normalizar(
          [c[L], c[A], notaDe(c), (c[CA.aceitas] || []).join(' '), Object.keys(c[Motor.CAMPOS[L].regionais] || {}).join(' '),
           (c.tags || []).map(nomeTag).join(' '), (c.tags || []).join(' ')].join(' '));
        if (!busca.split(' ').every(termo => alvo.includes(termo))) return false;
      }
      return true;
    });

    el['contagem-cards'].innerHTML = visiveis.length === CARDS.length
      ? t('cards.mostrandoTodos', { n: milhar(CARDS.length) })
      : t('cards.mostrando', { n: milhar(visiveis.length), total: milhar(CARDS.length) });


    if (!visiveis.length) {
      el['lista-cards'].innerHTML = '<p class="vazio">' + t('cards.nenhum') + '</p>';
      return;
    }

    el['lista-cards'].innerHTML = visiveis.map(c => {
      const s = situacaoDe(c.id);
      const e = progresso.cards[c.id];
      const placar = e && e.vistas
        ? '<span class="selo">' + t('cards.placar', { a: e.acertos, e: e.erros }) + '</span>' : '';

      /* «visto» é para o que já circulou. Preso e inédito nunca apareceram. */
      const marca = (s.chave === 'dominado' || s.chave === 'transparente' || s.chave === 'presumido') ? 'dominado'
        : (s.chave === 'novo' || s.chave === 'preso') ? '' : 'visto';
      return '<div class="card-linha ' + marca + '">' +
        '<div class="card-linha-topo">' +
          '<span class="es">' + escapar(c[L]) + '</span>' +
          '<span class="seta">→</span>' +
          '<span class="pt">' + escapar(c[A]) + '</span>' +
        '</div>' +
        '<div class="card-linha-meta">' +
          '<span class="selo nivel">' + escapar(c.nivel) + '</span>' +
          '<span class="selo">' + escapar(nomeTipo(c.tipo)) + '</span>' +
          '<span class="selo situacao ' + s.chave + '">' + escapar(s.rotulo) + '</span>' +
          placar +
          (c.tags || []).map(g => '<span class="selo">' + escapar(nomeTag(g)) + '</span>').join('') +
        '</div>' +
        (linhaDaNota(c) ? '<p class="card-linha-nota">' + escapar(linhaDaNota(c)) + '</p>' : '') +
        '<button class="link-comentar na-lista" data-comentar="' + escapar(c.id) + '">' + t('cards.comentar') + '</button>' +
        (s.chave === 'arquivado'
          ? ' <button class="link-comentar na-lista" data-desarquivar="' + escapar(c.id) + '">' + t('cards.desarquivar') + '</button>' : '') +
        (s.chave === 'transparente'
          ? ' <button class="link-comentar na-lista" data-reativar="' + escapar(c.id) + '">' + t('cards.reativar') + '</button>' : '') +
        (c.transp === 'total' && reativada(c.id)
          ? ' <button class="link-comentar na-lista" data-desreativar="' + escapar(c.id) + '">' + t('cards.desreativar') + '</button>' : '') +
      '</div>';
    }).join('');
  }

  /* ═══════════════ sincronização ═══════════════ */

  function statusSync(texto, classe) {
    el['estado-sync'].textContent = texto;
    el['estado-sync'].className = 'estado-sync ' + (classe || '');
    el['rodape-sync'].textContent = texto;
  }

  /* ═══════════════ exportar ═══════════════ */

  function exportar() {
    const blob = new Blob([JSON.stringify(progresso, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taioe-cards-' + ctx.curso + '-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ═══════════════ eventos ═══════════════ */

  /* com a avaliação do começo em aberto, é para ela que o «próximo» leva */
  el['btn-comecar'].addEventListener('click', () => { if (comeco) desenharComeco(); else proximoCard(); });
  el['btn-proximo'].addEventListener('click', avancar);
  el['btn-contestar'].addEventListener('click', contestar);

  el['btn-comentar-card'].addEventListener('click', () => cardAtual && abrirComentario(cardAtual.id));
  /* delegado: a lista se redesenha a cada filtro, e religar ouvinte a ouvinte
     em 458 linhas seria trabalho à toa */
  el['lista-cards'].addEventListener('click', e => {
    const b = e.target.closest('[data-comentar]');
    if (b) abrirComentario(b.dataset.comentar);
    const d = e.target.closest('[data-desarquivar]');
    if (d) {
      marcarArquivo(d.dataset.desarquivar, false);
      renderizarCards();
    }
    const r = e.target.closest('[data-reativar]') || e.target.closest('[data-desreativar]');
    if (r) {
      marcarReativada(r.dataset.reativar || r.dataset.desreativar, !!r.dataset.reativar);
      renderizarCards();
    }
  });
  el['btn-arquivar'].addEventListener('click', arquivarCardAtual);
  el['btn-comentario-enviar'].addEventListener('click', enviarComentario);
  el['btn-comentario-fechar'].addEventListener('click', fecharComentario);
  el['comentario-texto'].addEventListener('input', contarComentario);
  /* clicar fora fecha; clicar dentro do painel, não */
  el['comentario-fundo'].addEventListener('click', e => {
    if (e.target === el['comentario-fundo']) fecharComentario();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el['comentario-fundo'].classList.contains('oculto')) fecharComentario();
  });
  el['btn-responder'].addEventListener('click', () => responderEscrita(false));
  el['btn-nao-sei'].addEventListener('click', () => responderEscrita(true));
  el['btn-nao-sei-multipla'].addEventListener('click', () => responderMultipla(null, null));

  /* A caixa de escrever cresce para baixo quando a resposta não cabe numa
     linha (comentário do u141), e o Enter responde em vez de quebrar a
     linha: a quebra é só do desenho, a resposta continua sendo uma linha. */
  /* Vazia, a caixa fica com a altura natural de uma linha. Medir a altura com
     a tela do card ainda escondida dava zero, e a caixa nascia fechada — no
     celular, o teclado que só avisa a página no fim da palavra deixava o texto
     invisível enquanto se digitava (comentário do Gere, 05/10). */
  function ajustarEntrada() {
    const t = el.entrada;
    t.style.height = 'auto';
    const h = t.scrollHeight;
    const borda = t.offsetHeight - t.clientHeight;   // o scrollHeight não conta a borda
    t.style.height = (t.value && h) ? (h + borda) + 'px' : '';
  }
  el.entrada.addEventListener('input', () => {
    if (/\n/.test(el.entrada.value)) el.entrada.value = el.entrada.value.replace(/\s*\n\s*/g, ' ');
    ajustarEntrada();
  });
  /* o teclado com sugestão compõe a palavra antes de soltar o «input» */
  el.entrada.addEventListener('compositionupdate', () => requestAnimationFrame(ajustarEntrada));
  el.entrada.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); responderEscrita(false); }
  });

  /* Enquanto o card espera a resposta escrita, a tela não tem outra coisa a
     fazer: o que se digitar vai para a caixa (pedido do Gere, 20/10). Clicar
     fora devolve o foco a ela, e a tecla apertada com o foco num botão também
     cai lá. Enter e Tab seguem com o botão, para quem navega pelo teclado. */
  function esperandoEscrita() {
    return modoAtual === 'escrita' && !!cardAtual && !respostaPendente && !el.entrada.disabled &&
      !el['tela-card'].classList.contains('oculto') && el['comentario-fundo'].classList.contains('oculto') &&
      el['menu-topo'].hidden;
  }
  function ehCampo(n) {
    return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable);
  }
  function devolverFoco() {
    if (!esperandoEscrita()) return;
    const a = document.activeElement;
    if (!a || a === document.body || a === document.documentElement) el.entrada.focus({ preventScroll: true });
  }
  /* ── as teclas da subida (pedido do Gere, 24/10/2026) ──
     A tela sobe animada para o card novo, e o foco só vai para a caixa no fim
     da subida. No celular, o que se digitava nesse meio-tempo se perdia: o
     teclado ficava aberto sem caixa nenhuma, ou nem abria, porque ele só abre
     com certeza quando o foco vem no próprio toque. Então, no toque do
     «Próximo», o foco vai para a captura — um campo invisível preso no alto
     da tela, que não puxa rolagem —, o teclado abre ali, e no fim da subida
     (ou quando ela é interrompida) o que se digitou passa para a caixa. */
  function segurarTeclas() {
    el.captura.value = '';
    el.captura.focus({ preventScroll: true });
  }
  function soltarTeclas() {
    const cap = el.captura;
    const segurando = document.activeElement === cap;
    if (!esperandoEscrita()) {
      if (segurando) cap.blur();
      cap.value = '';
      return;
    }
    if (!segurando && ehCampo(document.activeElement)) return;
    el.entrada.focus({ preventScroll: true });
    const passar = () => {
      if (!cap.value) return;
      const limite = Number(el.entrada.getAttribute('maxlength')) || 120;
      el.entrada.value = (el.entrada.value + cap.value).replace(/\s*\n\s*/g, ' ').slice(0, limite);
      cap.value = '';
      ajustarEntrada();
      const fim = el.entrada.value.length;
      el.entrada.setSelectionRange(fim, fim);
    };
    passar();
    /* o teclado do celular pode entregar depois a palavra que estava compondo */
    setTimeout(passar, 60);
  }
  /* o Enter durante a subida responde, como responderia na caixa */
  el.captura.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.keyCode !== 13) return;
    e.preventDefault();
    soltarTeclas();
    if (el.entrada.value.trim()) responderEscrita(false);
  });

  /* o blur não dispara quando a janela está sem foco; o toque cobre esse caso */
  el.entrada.addEventListener('blur', () => setTimeout(devolverFoco, 0));
  document.addEventListener('pointerup', () => setTimeout(devolverFoco, 0));
  window.addEventListener('focus', () => setTimeout(devolverFoco, 0));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || !esperandoEscrita() || ehCampo(document.activeElement)) return;
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Dead') el.entrada.focus({ preventScroll: true });
  }, true);

  ligarDicas();

  document.querySelectorAll('.opcao-julgamento').forEach(b => {
    b.addEventListener('click', () => julgar(b.dataset.julgamento));
  });

  /* Sair de um card sem responder não pode sumir com ele: volta para a
     frente do baralho de onde saiu, para ser o próximo quando você voltar.
     Inédito volta para os inéditos — se fosse para a fila, entraria em
     circulação sem nunca ter sido respondido. */
  function irParaInicio() {
    devolverCardAtual();
    atualizarPlacar();
    mostrar('tela-inicio');
  }

  function devolverCardAtual() {
    /* A prévia do desafio que saiu sem resposta é de uma frase ainda presa:
       não volta para os inéditos, continua esperando as palavras. */
    if (cardAtual && !respostaPendente && desafioAtual && desafioAtual.previa && desafioAtual.id === cardAtual.id) {
      cardAtual = null;
    }
    desafioAtual = null;
    if (cardAtual && !respostaPendente && !Motor.encerrado(cardAtual.id, estadoParaFila(cardAtual.id))) {
      const id = cardAtual.id;
      const est = estadoParaFila(id);
      const baralho = !est ? progresso.ineditos
        : Motor.filaDe(est) === 'esPt' ? progresso.filaEsPt
        : Motor.filaDe(est) === 'ptEs' ? progresso.filaPtEs
        : progresso.dominados;
      if (baralho.indexOf(id) < 0) {
        baralho.unshift(id);
        /* Na fila de revisão a ordem não conta mais: o que o põe na frente
           é uma espera que nenhum outro card alcança. */
        if (est && est.etapa !== 'dominado') {
          est.naFila = { desde: progresso.totais.respostas - 1e6, distancia: 1 };
          if (Sinc) Sinc.marcarSujo(id);
        }
        salvarProgresso();
      }
    }
    cardAtual = null;
    respostaPendente = null;
  }

  /* ═══════════════ textos ═══════════════
     Desde 20/10/2026 (PLANO.md, seção 9): os poemas vêm da Biblioteca, sem
     tradução, e todo mundo começa com um poema automático. A escolha mora em
     textos.emVista.escolha ({ textos, em, propria }); cada verso mostrado vira
     uma entrada «<id>#<k>» em textos.lidos, e o poema inteiro, «<id>». */

  function escolhaDosTextos() {
    const tx = progresso.textos = progresso.textos || textosVazio();
    return (tx.emVista && tx.emVista.escolha) || null;
  }

  function gravarEscolha(ids) {
    const tx = progresso.textos;
    tx.emVista.escolha = { textos: ids.slice(0, Motor.MAX_TEXTOS), em: new Date().toISOString(), propria: true };
    conciliarFila(progresso);
    salvarProgresso();
    if (Sinc) Sinc.agendar(3000);
  }

  function textosAtivosAgora() {
    const tx = progresso.textos || textosVazio();
    return Motor.textosAtivos(escolhaDosTextos(), TEXTOS, tx.lidos || {});
  }

  /* Os versos que acabaram de ficar prontos num texto ativo: todas as
     palavras deles sabidas. Vem logo antes do próximo card, sem esperar a
     meia-noite: o verso não é card. */
  function textoParaLer() {
    if (!TEXTOS.length) return null;
    const lidos = progresso.textos.lidos;
    for (const txt of textosAtivosAgora()) {
      const total = Motor.versosDoTexto(txt).length;
      const k = Motor.versosProntos(txt, progresso.cards, progresso.arquivados || {});
      const vistos = Motor.versosVistos(txt, lidos);
      if (total && k > vistos) return { txt: txt, de: vistos, versos: k, total: total };
    }
    return null;
  }

  /* Algum verso, de qualquer texto, já foi mostrado? O primeiro aviso é o
     que explica o poema e oferece os três caminhos. */
  function jaViuVerso() {
    return Object.keys(progresso.textos.lidos || {}).some(k => k.indexOf('#') > 0);
  }

  /* O aviso, no lugar do próximo card. */
  function mostrarRecompensa(r) {
    const txt = r.txt, inteiro = r.versos >= r.total;
    const primeiro = !jaViuVerso();
    const lidos = progresso.textos.lidos;
    const agora = new Date().toISOString();
    for (let k = r.de + 1; k <= r.versos; k++) lidos[txt.id + '#' + k] = agora;
    const escolha = escolhaDosTextos();
    const propria = !!(escolha && escolha.propria);
    let aviso, botoes;
    const nomeDe = (x, semParte) => '«' + escapar(x.titulo) + '», ' +
      (x.parte && !semParte ? t('texto.parteN', { n: x.parte }) + ', ' : '') + t('texto.de', { a: escapar(x.autor) });
    if (inteiro) {
      lidos[txt.id] = agora;
      /* o texto terminado sai da escolha da pessoa; o automático dá lugar ao
         próximo da fila na conciliação */
      if (propria) {
        const ids = (escolha.textos || []).filter(id => id !== txt.id);
        progresso.textos.emVista.escolha = { textos: ids, em: agora, propria: true };
      }
      conciliarFila(progresso);
      /* fim de uma parte escolhida: a seguinte é o primeiro botão (o automático já a pôs na fila) */
      const seguinte = propria && Motor.parteSeguinte(txt, TEXTOS);
      aviso = txt.parte ? t('texto.parteInteira', { n: txt.parte, t: nomeDe(txt, true) }) : t('texto.inteiro', { t: nomeDe(txt) });
      const prox = !propria && textosAtivosAgora()[0];
      if (prox) aviso += ' ' + t('texto.proximoAutomatico', { t: nomeDe(prox) });
      botoes = (seguinte
        ? '<button class="primario" data-acao="parte" data-parte="' + escapar(seguinte.id) + '">' + t('texto.aprenderParte', { n: seguinte.parte }) + '</button>'
        : '<button class="primario" data-acao="seguir">' + t('texto.continuar') + '</button>') +
        (propria ? '<button class="secundario" data-acao="escolher">' + t('texto.escolherOutroTexto') + '</button>' : '');
    } else if (primeiro && !propria) {
      aviso = t('texto.primeiroVerso', { t: nomeDe(txt) });
      botoes = '<button class="primario" data-acao="seguir">' + t('texto.continuarPoema') + '</button>' +
        '<button class="secundario" data-acao="escolher">' + t('texto.escolherOutro') + '</button>' +
        '<button class="secundario" data-acao="soltos">' + t('texto.soCardsSoltos') + '</button>';
    } else {
      aviso = t(r.versos - r.de > 1 ? 'texto.versosNovos' : 'texto.versoNovo',
        { t: nomeDe(txt), a: r.de + 1, k: r.versos, n: r.total });
      botoes = '<button class="primario" data-acao="seguir">' + t('texto.continuar') + '</button>';
    }
    salvarProgresso();
    if (Sinc) Sinc.agendar(3000);
    const alvo = el['texto-conteudo'];
    alvo.innerHTML = '<p class="recompensa">' + aviso + '</p>' + cartaDoTexto(txt, r.versos, r.de) +
      '<div class="botoes-texto">' + botoes + '</div>';
    ligarCarta(alvo);
    alvo.querySelectorAll('[data-acao]').forEach(b => b.addEventListener('click', () => {
      const acao = b.dataset.acao;
      if (acao === 'soltos') gravarEscolha([]);
      if (acao === 'parte') gravarEscolha(textosAtivosAgora().map(x => x.id).concat([b.dataset.parte]));
      if (acao === 'escolher') { abrirTexto(); return; }
      mostrar('tela-card');
      proximoCard();
    }));
    mostrar('tela-texto');
  }

  /* «parte 1 (I, 1–7)»: a parte de um texto longo (Motor.parteDaVez) */
  function rotuloDaParte(x) {
    return x && x.parte ? t('texto.parte', { n: x.parte, r: escapar(x.trecho || '') }) : '';
  }

  function abrirTexto() {
    renderizarTexto();
    mostrar('tela-texto');
  }

  /* O poema na língua original, sem tradução, com cada palavra clicável.
     Com «ate», só os primeiros versos, e os que vêm depois de «novos» ficam
     marcados. */
  function cartaDoTexto(txt, ate, novos) {
    const total = Motor.versosDoTexto(txt).length;
    const parte = ate !== undefined && ate < total;
    const cab = '<h3 class="texto-titulo" lang="' + L + '">' + escapar(txt.titulo) + '</h3>' +
      '<p class="texto-autor">' + escapar(txt.autor) + (txt.ano ? ', ' + txt.ano : '') +
      (txt.parte ? ' · ' + rotuloDaParte(txt) : '') + '</p>';
    let n = 0, resta = parte ? ate : Infinity;
    const blocos = (txt.blocos || []).map(b => {
      const linhas = b.slice(0, Math.max(0, resta));
      resta -= linhas.length;
      if (!linhas.length) return '';
      return '<div class="estrofe" lang="' + L + '">' + linhas.map(l => {
        n++;
        const novo = novos !== undefined && n > novos;
        return '<p class="verso' + (novo ? ' verso-novo' : '') + '">' + (l.p || [[l.t, null]]).map(x => x[1]
          ? '<button type="button" class="palavra-texto" data-ch="' + escapar(x[1]) + '">' + escapar(x[0]) + '</button>'
          : escapar(x[0])).join('') + '</p>';
      }).join('') + '</div>';
    }).join('');
    const conta = parte ? '<p class="contador-versos">' + t('texto.contador', { k: ate, n: total }) + '</p>' : '';
    const pe = '<p class="ajuda">' + t('texto.toque') + (txt.biblioteca
      ? ' <a href="' + escapar(txt.biblioteca) + '">' + t('texto.naBiblioteca') + '</a>' : '') + '</p>';
    return '<div class="carta-texto" data-texto="' + escapar(txt.id) + '">' + cab + blocos + conta + pe + '</div>';
  }

  /* A nota da palavra: o lema, a classe (e a forma, para quem lê
     português) e a tradução do card no público de quem estuda; sem card, a
     definição do glossário da Biblioteca (ou a nota curta em es/en). */
  /* as classes do glossário, sem acento, que têm nome em es e en (classe.*) */
  const CLASSES = ['substantivo', 'verbo', 'adjetivo', 'adverbio', 'preposicao', 'conjuncao', 'artigo',
    'pronome', 'interjeicao', 'numeral', 'contracao', 'determinante'];
  function classeDe(c) {
    if (!c) return '';
    if (A === 'pt') return c;
    const x = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (x.indexOf('proprio') >= 0) return t('classe.nome');
    const k = CLASSES.find(y => x.indexOf(y) === 0) || CLASSES.find(y => x.indexOf(y) >= 0);
    return k ? t('classe.' + k) : '';
  }
  function notaDaPalavra(d) {
    const partes = Array.isArray(d.partes) ? d.partes : [d];
    const html = partes.map(x => {
      const card = x.card && PORID_FONTE[x.card] ? Motor.formaDoCard(PORID_FONTE[x.card], 0) : null;
      const def = A === 'pt' ? x.def : x['def' + A[0].toUpperCase() + A[1]];
      const sentido = card ? escapar(card[A] || '') : escapar(Array.isArray(def) ? def.join(' ') : (def || ''));
      const classe = classeDe(x.classe);
      /* no latim, o enunciado do dicionário e a função da palavra na linha */
      return '<p><b lang="' + L + '">' + escapar((card && card.enunciado) || x.lema || '') + '</b>' +
        (classe ? ' <span class="classe">' + escapar(classe) + (A === 'pt' && x.forma ? ', ' + escapar(x.forma) : '') + '</span>' : '') +
        (sentido ? '<br>' + sentido : '') +
        (x.funcao ? '<br><span class="classe">' + escapar(x.funcao) + '</span>' : '') +
        (card && PORID_FONTE[x.card].leitura ? '<br><span class="classe">' + t('card.leitura') + '</span>' : '') + '</p>';
    }).join('');
    const fonte = !partes.some(x => x.card) && d.wiki
      ? '<p class="fonte-nota">' + t('texto.fonteNota', { u: escapar(d.wiki) }) + '</p>' : '';
    return html + fonte;
  }

  function ligarCarta(raiz) {
    raiz.querySelectorAll('.carta-texto').forEach(carta => {
      const txt = TEXTO_POR_ID[carta.dataset.texto];
      if (!txt) return;
      carta.addEventListener('click', ev => {
        const b = ev.target.closest('.palavra-texto');
        if (!b) return;
        const aberta = carta.querySelector('.nota-palavra');
        const mesma = aberta && aberta.dataset.de === b.dataset.ch && aberta.previousElementSibling === b.closest('.verso');
        carta.querySelectorAll('.palavra-texto.ativa').forEach(x => x.classList.remove('ativa'));
        if (aberta) aberta.remove();
        if (mesma) return;
        const d = (txt.destinos || {})[b.dataset.ch];
        if (!d) return;
        b.classList.add('ativa');
        const nota = document.createElement('div');
        nota.className = 'nota-palavra';
        nota.dataset.de = b.dataset.ch;
        nota.innerHTML = notaDaPalavra(d);
        b.closest('.verso').insertAdjacentElement('afterend', nota);
      });
    });
  }

  /* A tela Textos: os textos do curso, cada um com a caixa de escolher (até
     MAX_TEXTOS, ou nenhum), os versos já lidos e quantas palavras faltam; e,
     embaixo, os que a pessoa já leu inteiros. */
  /* «novo»: o texto pedido pela Biblioteca quando já há MAX_TEXTOS escolhidos;
     a tela diz que é preciso desmarcar um e põe o pedido em primeiro. */
  function renderizarTexto(novo) {
    const alvo = el['texto-conteudo'];
    if (!TEXTOS.length) {
      alvo.innerHTML = '<p class="ajuda">' + t('texto.nenhum') + '</p>';
      return;
    }
    conciliarFila(progresso);
    const tx = progresso.textos;
    const escolha = escolhaDosTextos();
    const ativos = new Set(textosAtivosAgora().map(x => x.id));
    const arq = progresso.arquivados || {};
    const partes = ['<p class="ajuda">' + t(TRILHAS ? 'texto.explicaTrilhas' : 'texto.explica', { n: Motor.MAX_TEXTOS }) + '</p>'];
    if (novo && TEXTO_POR_ID[novo]) {
      partes.push('<p class="recompensa">' + t('texto.trocar', { n: Motor.MAX_TEXTOS, t: escapar(TEXTO_POR_ID[novo].titulo) }) + '</p>');
    }
    /* da obra em partes, só a parte da vez (Motor.textoEscolhivel) */
    const abertos = TEXTOS.filter(x => Motor.textoEscolhivel(x, TEXTOS, tx.lidos))
      .sort((a, b) => ((b.id === novo) - (a.id === novo)) || (ativos.has(b.id) - ativos.has(a.id)) || ((a.fila === undefined ? 1e9 : a.fila) - (b.fila === undefined ? 1e9 : b.fila)));
    partes.push('<div class="grupo lista-textos">');
    abertos.forEach(x => {
      const a = Motor.andamentoDoTexto(x, progresso.cards, arq);
      const vistos = Motor.versosVistos(x, tx.lidos);
      const marcado = ativos.has(x.id);
      const seguinte = Motor.parteSeguinte(x, TEXTOS);
      partes.push('<div class="item-texto"><label><input type="checkbox" data-texto="' + escapar(x.id) + '"' +
        (marcado ? ' checked' : '') + '> <b lang="' + L + '">' + escapar(x.titulo) + '</b> · ' + escapar(x.autor) +
        (x.parte ? ' · ' + rotuloDaParte(x) : '') + '</label>' +
        '<p class="andamento-texto">' + t('texto.andamento', { k: vistos, n: a.versos }) + ' · ' +
        (a.faltam ? tn('texto.faltamPalavras', a.faltam, { n: milhar(a.faltam) }) : t('texto.semFalta')) +
        (marcado && escolha && !escolha.propria ? ' · ' + t('texto.automatico') : '') +
        (seguinte ? ' · ' + t('texto.aSeguir', { n: seguinte.parte, r: escapar(seguinte.trecho || '') }) : '') + '</p>' +
        (vistos ? '<details class="texto-lido"><summary>' + t('texto.descobertos') + '</summary>' + cartaDoTexto(x, vistos) + '</details>' : '') +
        '</div>');
    });
    partes.push('<p class="ajuda" id="aviso-maximo" hidden>' + t('texto.maximo', { n: Motor.MAX_TEXTOS }) + '</p></div>');
    /* no modo trilhas a escolha é obrigatória (de 1 a 3), e daqui se começa */
    if (TRILHAS) {
      partes.push('<p class="ajuda" id="aviso-escolha" hidden>' + t('texto.escolhaUm') + '</p>' +
        '<div class="botoes-texto"><button class="primario" id="btn-comecar-trilha">' + t('texto.comecarTrilha') + '</button></div>');
    }
    const lidos = TEXTOS.filter(x => Motor.textoTerminado(x, tx.lidos))
      .sort((a, b) => String(tx.lidos[b.id]).localeCompare(String(tx.lidos[a.id])));
    if (lidos.length) {
      partes.push('<div class="grupo"><h3>' + t('texto.lidos') + '</h3>');
      /* as partes lidas de uma obra ficam juntas, sob a obra, na ordem das partes */
      const grupos = [], daObra = {};
      lidos.forEach(x => {
        if (!x.obra) grupos.push([x]);
        else if (daObra[x.obra]) daObra[x.obra].push(x);
        else grupos.push(daObra[x.obra] = [x]);
      });
      grupos.forEach(g => {
        const x = g[0];
        g.sort((a, b) => a.parte - b.parte);
        partes.push('<details class="texto-lido"><summary>' + escapar(x.titulo) + ' · ' + escapar(x.autor) +
          (x.obra ? ' · ' + tn('texto.partesLidas', g.length) : '') + '</summary>' + g.map(y => cartaDoTexto(y)).join('') + '</details>');
      });
      partes.push('</div>');
    }
    alvo.innerHTML = partes.join('');
    ligarCarta(alvo);
    const caixas = [...alvo.querySelectorAll('input[data-texto]')];
    const limitar = () => {
      const n = caixas.filter(c => c.checked).length;
      /* No modo trilhas a caixa marcada nunca se desativa (desativada, ela fica cinza e parece
         pular de cor a cada clique, 21/10): sem nenhum texto, quem segura é o «Começar». */
      caixas.forEach(c => { c.disabled = !c.checked && n >= Motor.MAX_TEXTOS; });
      document.getElementById('aviso-maximo').hidden = n < Motor.MAX_TEXTOS;
      if (TRILHAS) {
        document.getElementById('aviso-escolha').hidden = n > 0;
        document.getElementById('btn-comecar-trilha').disabled = !n;
      }
    };
    limitar();
    caixas.forEach(c => c.addEventListener('change', () => {
      gravarEscolha(caixas.filter(x => x.checked).map(x => x.dataset.texto));
      limitar();
    }));
    const comecar = document.getElementById('btn-comecar-trilha');
    if (comecar) comecar.addEventListener('click', () => { mostrar('tela-card'); proximoCard(); });
  }

  /* ═══════════════ o card desafio (PLANO.md, 7.4) ═══════════════
     Quem escolhe é o Motor.escolherDesafio, chamado a cada vaga de card novo
     (proximoNovo); o app só guarda os contadores e os entrega:

       desafios       quantos já houve — os estados com «desafio» (a estreia
                      marcada por Motor.marcarDesafio, que viaja com o estado)
                      mais os anotados neste aparelho (as prévias erradas não
                      criam estado);
       ultimoDesafio  o mais recente: «desafioEm» do estado, ou a data anotada;
       inicio         o começo do curso: o primeiro dia do diário (que vem do
                      servidor), o dia do nivelamento ou a primeira estreia;
       mostrados      os ids de todos eles, para nenhum se repetir.

     A anotação deste aparelho é cards:desafios:<conta>:<curso>, id →
     { em, previa, acertou }: é a única memória da prévia errada, que não tem
     estado nem resposta no servidor (outro aparelho pode mostrá-la uma vez
     mais, e é só). */
  const CHAVE_DESAFIOS = 'cards:desafios:' + CHAVE;
  let desafioAtual = null;   // { id, previa }: o card na tela é um desafio

  function desafiosDoAparelho() {
    const x = lerLocal(CHAVE_DESAFIOS);
    return x && typeof x === 'object' ? x : {};
  }

  function anotarDesafio(r) {
    if (!desafioAtual) return;
    const x = desafiosDoAparelho();
    if (!x[desafioAtual.id]) {
      x[desafioAtual.id] = { em: new Date().toISOString(), previa: desafioAtual.previa, acertou: !!r.acertou };
      guardarLocal(CHAVE_DESAFIOS, x);
    }
  }

  /* A prévia errada: nada se grava no progresso, a frase continua presa.
     O registro de mentira só serve para o «próximo» saber que a pergunta
     foi respondida. */
  function guardarPreviaErrada(r) {
    ultimoRegistro = { id: cardAtual.id, previa: true, r: r };
    sessao.eventos.push({ acertou: false });
    atualizarPlacar();
  }

  function inicioDoCurso() {
    let menor = Infinity;
    const diario = progresso.diario || {};
    Object.keys(diario).forEach(d => {
      if (diario[d] && diario[d].n && /^\d{4}-\d\d-\d\d$/.test(d)) menor = Math.min(menor, meioDia(d).getTime());
    });
    const feito = Date.parse(progresso.nivelamento && progresso.nivelamento.feitoEm);
    if (isFinite(feito)) menor = Math.min(menor, feito);
    Object.keys(progresso.cards).forEach(id => {
      const e = progresso.cards[id];
      if (e && /^\d{4}-\d\d-\d\d$/.test(e.estreia || '')) menor = Math.min(menor, meioDia(e.estreia).getTime());
    });
    return new Date(isFinite(menor) ? menor : Date.now()).toISOString();
  }

  function contextoDoDesafio() {
    const doAparelho = desafiosDoAparelho();
    const mostrados = new Set(Object.keys(doAparelho));
    const datas = Object.keys(doAparelho).map(id => doAparelho[id] && doAparelho[id].em);
    Object.keys(progresso.cards).forEach(id => {
      const e = progresso.cards[id];
      if (e && e.desafio) { mostrados.add(id); datas.push(e.desafioEm); }
    });
    const ordem = datas.filter(Boolean).sort();
    return {
      agora: Date.now(),
      respostas: progresso.totais.respostas,
      desafios: mostrados.size,
      ultimoDesafio: ordem.length ? ordem[ordem.length - 1] : null,
      inicio: inicioDoCurso(),
      mostrados: [...mostrados],
      arquivados: progresso.arquivados || {},
      prior: progresso.nivelamento && progresso.nivelamento.porNivel
    };
  }

  /* ═══════════════ o começo: avaliação e resultado ═══════════════
     PLANO.md, 7.3 e 7.4. Na primeira entrada num curso — sem nivelamento e
     sem nenhum card respondido — o app abre aqui, e não na página inicial:

       entrada       «Para começar, vamos avaliar o seu nível atual.» e «Você
                     já estudou…?» — Nunca pula o teste (pulou: true);
       teste         uma palavra por vez, «Já conheço» / «Quero aprender», a
                     barra e o «Pular»; quando o motor pede a conferência, a
                     mesma palavra vira múltipla escolha (Motor.alternativas
                     na ida, a língua de quem estuda);
       resultado     «Você já conhece cerca de N palavras deste baralho».

     A tela «como funciona» e os balões de dica saíram em 19/10/2026: o Gere
     viu que as pessoas pulavam tudo, e o app tem de se explicar sozinho.

     O teste (Motor.nivelamento) é JSON puro e mora em localStorage
     (cards:comeco:<conta>:<curso>) a cada resposta: recarregar a página no
     meio retoma de onde parou, e nada vai à rede até o fim. No fim, o
     resultado vai para progresso.nivelamento (o deduzir do motor, com
     feitoEm, pulou e comeco), que sobe nos extras.

     Quem já tem progresso no curso nunca cai aqui sozinho. Num aparelho novo
     o progresso local ainda está vazio até a primeira carga: se ela trouxer
     estados ou um nivelamento, a avaliação que ainda não acabou some
     (conferirComeco). «Refazer avaliação», nas configurações, abre o mesmo
     caminho; os presumidos ainda não respondidos saem quando o teste novo
     termina (o nivelamento inteiro é trocado, e o deduzir não presume card
     que já tem estado). */
  const CHAVE_COMECO = 'cards:comeco:' + CHAVE;
  const ROTULO_COMECO = { nunca: 'comeco.nunca', pouco: 'comeco.pouco', bastante: 'comeco.bastante' };
  let comeco = null;          // { fase, refazer, automatico, teste }
  let comecoOcupado = false;  // a pausa em que a conferência mostra a certa

  function precisaDoComeco(p) {
    if (TRILHAS) return false;   // o latim não tem teste de nível: começa pela escolha dos textos
    return !p.nivelamento && !Object.keys(p.cards || {}).some(id => p.cards[id] && p.cards[id].vistas);
  }

  /* Só o que vale retomar fica guardado: o teste em andamento e as duas
     telas que vêm depois dele. A entrada se refaz sozinha. */
  function guardarComeco() {
    if (!comeco || comeco.fase === 'entrada') { esquecerLocal(CHAVE_COMECO); return; }
    guardarLocal(CHAVE_COMECO, { fase: comeco.fase, refazer: !!comeco.refazer,
      automatico: !!comeco.automatico, teste: comeco.teste || null });
  }

  function abrirComeco(opcoes) {
    devolverCardAtual();
    comeco = { fase: 'entrada', refazer: !!opcoes.refazer, automatico: !!opcoes.automatico, teste: null };
    guardarComeco();
    desenharComeco();
  }

  /* Na abertura do app: o que ficou pela metade, ou a primeira entrada. */
  function retomarComeco() {
    const salvo = lerLocal(CHAVE_COMECO);
    const fases = ['teste', 'resultado'];
    if (salvo && fases.indexOf(salvo.fase) >= 0 &&
        (salvo.fase !== 'teste' || (salvo.teste && Array.isArray(salvo.teste.cartas))) &&
        !(salvo.automatico && salvo.fase === 'teste' && !precisaDoComeco(progresso))) {
      comeco = { fase: salvo.fase, refazer: !!salvo.refazer, automatico: !!salvo.automatico, teste: salvo.teste || null };
      desenharComeco();
      return true;
    }
    esquecerLocal(CHAVE_COMECO);
    if (precisaDoComeco(progresso)) { abrirComeco({ automatico: true }); return true; }
    return false;
  }

  /* Chegou progresso do servidor: quem já estudou este curso em outro
     aparelho não precisa da avaliação que se abriu sozinha. */
  function conferirComeco() {
    if (comeco && comeco.automatico && (comeco.fase === 'entrada' || comeco.fase === 'teste') &&
        !precisaDoComeco(progresso)) {
      comeco = null;
      guardarComeco();
      mostrar('tela-inicio');
    }
  }

  function fimDoComeco(jogar) {
    comeco = null;
    guardarComeco();
    if (jogar) proximoCard();
    else irParaInicio();
  }

  /* ── o desenho ── */
  function no(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function noHtml(tag, classe, html) {
    const e = no(tag, classe);
    e.innerHTML = html;
    return e;
  }

  function desenharComeco() {
    if (!comeco) return;
    const caixa = el['comeco-conteudo'];
    caixa.textContent = '';
    if (comeco.fase === 'teste') desenharTeste(caixa);
    else if (comeco.fase === 'resultado') desenharResultado(caixa);
    else desenharEntrada(caixa);
    if (comeco) mostrar('tela-comeco');
  }

  function desenharEntrada(caixa) {
    caixa.appendChild(no('h1', 'comeco-titulo',
      t(comeco.refazer ? 'comeco.refazendo' : LISTA ? 'comeco.avisoLista' : 'comeco.aviso')));
    /* 7.9: o aviso do objetivo do teste */
    if (LISTA) caixa.appendChild(no('p', 'comeco-nota', t('comeco.objetivoLista')));
    caixa.appendChild(no('p', 'comeco-pergunta', t('comeco.pergunta', { L: NOME_L })));
    const lista = no('div', 'escolhas-comeco');
    ['nunca', 'pouco', 'bastante'].forEach(k => {
      const b = no('button', 'secundario', t(ROTULO_COMECO[k]));
      b.addEventListener('click', () => escolherComeco(k));
      lista.appendChild(b);
    });
    caixa.appendChild(lista);
    caixa.appendChild(no('p', 'ajuda', t(LISTA ? 'comeco.entradaAjudaLista' : 'comeco.entradaAjuda')));
    if (comeco.refazer) {
      const voltar = no('button', 'link-arquivar', t('comum.voltar'));
      voltar.addEventListener('click', () => { comeco = null; guardarComeco(); abrirConfig(); });
      const linha = no('p', 'linha-pular');
      linha.appendChild(voltar);
      caixa.appendChild(linha);
    }
  }

  function escolherComeco(k) {
    /* 7.9: com a lista, a resposta só define o ponto de partida — o «Nunca»
       também faz o teste, a partir da primeira palavra */
    if (LISTA) {
      comeco.teste = NL.novo(LISTA, { comeco: k });
      comeco.fase = 'teste';
      guardarComeco();
      desenharComeco();
      return;
    }
    if (k === 'nunca') {
      progresso.nivelamento = { feitoEm: new Date().toISOString(), pulou: true, comeco: 'nunca' };
      depoisDoTeste();
      return;
    }
    comeco.teste = Motor.nivelamento.novo(CARDS, { comeco: k });
    comeco.fase = 'teste';
    guardarComeco();
    desenharComeco();
  }

  /* O teste pela lista (7.9): a mesma tela, com a palavra da lista (com ou
     sem card) e, na conferência, as alternativas do card ou, sem card, as
     traduções das vizinhas da lista (Motor.nivelamentoLista.alternativas). */
  function desenharTesteDaLista(caixa) {
    const teste = comeco.teste;
    const carta = NL.proximaCarta(teste, LISTA);
    if (!carta) { terminarTeste(false); return; }
    const item = carta.item;

    const topo = no('div', 'comeco-topo');
    topo.appendChild(no('span', 'etiqueta', Motor.ROTULO_NIVEL[item.nivel] || item.nivel));
    const barra = no('div', 'barra-teste');
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-label', t('comeco.barra'));
    barra.setAttribute('aria-valuemin', '0');
    barra.setAttribute('aria-valuemax', String(carta.teto));
    barra.setAttribute('aria-valuenow', String(carta.feitas));
    const cheio = no('i');
    cheio.style.width = Math.min(100, Math.round(100 * carta.feitas / carta.teto)) + '%';
    barra.appendChild(cheio);
    topo.appendChild(barra);
    caixa.appendChild(topo);

    const ficha = no('div');
    ficha.className = 'card ficha-teste';
    ficha.appendChild(no('p', 'enunciado', t(carta.conferir ? 'comeco.conferir' : 'comeco.conhece')));
    const linha = no('div', 'termo-linha');
    linha.appendChild(no('span', 'bandeira', BANDEIRA_L));
    const termo = no('div', 'termo', item.fr);
    termo.setAttribute('lang', L);
    linha.appendChild(termo);
    ficha.appendChild(linha);

    if (carta.conferir) {
      const card = (item.cards || []).map(id => PORID[id]).find(Boolean);
      let certa, opcoes;
      if (card) {
        certa = Motor.resposta(card, IDA);
        opcoes = Motor.alternativas(card, IDA, CARDS, progresso.cards);
      } else {
        const a = NL.alternativas(teste, LISTA, carta.pos);
        certa = a.certa;
        opcoes = a.opcoes;
      }
      const lista = no('div', 'alternativas');
      opcoes.forEach((texto, i) => {
        const b = no('button', 'alternativa');
        b.appendChild(no('span', 'num', String(i + 1)));
        b.appendChild(no('span', null, texto));
        b.addEventListener('click', () => conferirNoTeste(carta.pos, texto === certa, b, lista, certa));
        lista.appendChild(b);
      });
      ficha.appendChild(lista);
      const naoSei = no('button', 'secundario', t('card.naoSei'));
      naoSei.addEventListener('click', () => conferirNoTeste(carta.pos, false, null, lista, certa));
      const linhaNaoSei = no('div', 'linha-botoes');
      linhaNaoSei.appendChild(naoSei);
      ficha.appendChild(linhaNaoSei);
    } else {
      const botoes = no('div', 'botoes-teste');
      const sim = no('button', 'opcao-teste', t('comeco.jaConheco'));
      const nao = no('button', 'opcao-teste', t('comeco.queroAprender'));
      sim.addEventListener('click', () => responderNoTeste(carta.pos, true));
      nao.addEventListener('click', () => responderNoTeste(carta.pos, false));
      botoes.appendChild(sim);
      botoes.appendChild(nao);
      ficha.appendChild(botoes);
    }
    caixa.appendChild(ficha);

    const pular = no('button', 'link-arquivar', t('comeco.pular'));
    pular.addEventListener('click', () => { if (!comecoOcupado) terminarTeste(true); });
    const linhaPular = no('p', 'linha-pular');
    linhaPular.appendChild(pular);
    caixa.appendChild(linhaPular);
  }

  const testeDaLista = teste => !!(teste && teste.versao === 2);

  function desenharTeste(caixa) {
    const teste = comeco.teste;
    if (testeDaLista(teste)) {
      /* o teste guardado é da lista, mas o curso não a tem mais: recomeça */
      if (!LISTA) { comeco.fase = 'entrada'; comeco.teste = null; guardarComeco(); desenharEntrada(caixa); return; }
      desenharTesteDaLista(caixa);
      return;
    }
    let carta = Motor.nivelamento.proximaCarta(teste);
    /* card que saiu do baralho entre uma abertura e outra: conta como não
       conhecido, e o teste segue */
    while (carta && !PORID[carta.id]) {
      if (carta.conferir) Motor.nivelamento.conferir(teste, carta.id, false);
      else Motor.nivelamento.responder(teste, carta.id, false);
      carta = Motor.nivelamento.proximaCarta(teste);
    }
    if (!carta) { terminarTeste(false); return; }
    const c = PORID[carta.id];

    const topo = no('div', 'comeco-topo');
    topo.appendChild(no('span', 'etiqueta', Motor.ROTULO_NIVEL[carta.nivel] || carta.nivel));
    const barra = no('div', 'barra-teste');
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-label', t('comeco.barra'));
    barra.setAttribute('aria-valuemin', '0');
    barra.setAttribute('aria-valuemax', String(carta.teto));
    barra.setAttribute('aria-valuenow', String(carta.feitas));
    const cheio = no('i');
    /* a CSP não deixa estilo em HTML, mas deixa o CSSOM */
    cheio.style.width = Math.min(100, Math.round(100 * carta.feitas / carta.teto)) + '%';
    barra.appendChild(cheio);
    topo.appendChild(barra);
    caixa.appendChild(topo);

    const ficha = no('div');
    ficha.className = 'card ficha-teste';
    ficha.appendChild(no('p', 'enunciado', t(carta.conferir ? 'comeco.conferir' : 'comeco.conhece')));
    const linha = no('div', 'termo-linha');
    linha.appendChild(no('span', 'bandeira', BANDEIRA_L));
    const termo = no('div', 'termo', c[L]);
    termo.setAttribute('lang', L);
    linha.appendChild(termo);
    ficha.appendChild(linha);

    if (carta.conferir) {
      /* a conferência: a palavra vira múltipla escolha, com as alternativas
         do jogo na língua de quem estuda */
      const certa = Motor.resposta(c, IDA);
      const opcoes = Motor.alternativas(c, IDA, CARDS, progresso.cards);
      const lista = no('div', 'alternativas');
      opcoes.forEach((texto, i) => {
        const b = no('button', 'alternativa');
        b.appendChild(no('span', 'num', String(i + 1)));
        b.appendChild(no('span', null, texto));
        b.addEventListener('click', () => conferirNoTeste(carta.id, texto === certa, b, lista, certa));
        lista.appendChild(b);
      });
      ficha.appendChild(lista);
      const naoSei = no('button', 'secundario', t('card.naoSei'));
      naoSei.addEventListener('click', () => conferirNoTeste(carta.id, false, null, lista, certa));
      const linhaNaoSei = no('div', 'linha-botoes');
      linhaNaoSei.appendChild(naoSei);
      ficha.appendChild(linhaNaoSei);
    } else {
      const botoes = no('div', 'botoes-teste');
      const sim = no('button', 'opcao-teste', t('comeco.jaConheco'));
      const nao = no('button', 'opcao-teste', t('comeco.queroAprender'));
      sim.addEventListener('click', () => responderNoTeste(carta.id, true));
      nao.addEventListener('click', () => responderNoTeste(carta.id, false));
      botoes.appendChild(sim);
      botoes.appendChild(nao);
      ficha.appendChild(botoes);
    }
    caixa.appendChild(ficha);

    const pular = no('button', 'link-arquivar', t('comeco.pular'));
    pular.addEventListener('click', () => { if (!comecoOcupado) terminarTeste(true); });
    const linhaPular = no('p', 'linha-pular');
    linhaPular.appendChild(pular);
    caixa.appendChild(linhaPular);
  }

  function responderNoTeste(id, conhece) {
    if (comecoOcupado || !comeco || !comeco.teste) return;
    if (testeDaLista(comeco.teste)) NL.responder(comeco.teste, LISTA, id, conhece);
    else Motor.nivelamento.responder(comeco.teste, id, conhece);
    guardarComeco();
    desenharComeco();
  }

  /* A múltipla escolha da conferência: mostra a certa (e a errada, se foi
     o caso) por um instante, e segue. */
  function conferirNoTeste(id, acertou, botao, lista, certa) {
    if (comecoOcupado || !comeco || !comeco.teste) return;
    comecoOcupado = true;
    [...lista.children].forEach(b => {
      b.disabled = true;
      if (b.lastChild.textContent === certa) b.classList.add('certa');
      else if (b === botao) b.classList.add('errada');
    });
    if (testeDaLista(comeco.teste)) NL.conferir(comeco.teste, LISTA, id, acertou);
    else Motor.nivelamento.conferir(comeco.teste, id, acertou);
    guardarComeco();
    setTimeout(() => {
      comecoOcupado = false;
      if (comeco && comeco.fase === 'teste') desenharComeco();
    }, acertou ? 650 : 1400);
  }

  /* O fim do teste, ou o «Pular» no meio dele: a dedução fica com o que foi
     respondido até ali. */
  function terminarTeste(pulou) {
    const agora = new Date().toISOString();
    const teste = comeco.teste;
    const opcoes = { uid: ctx.uid, agora: agora, estados: progresso.cards, arquivados: progresso.arquivados || {} };
    const d = testeDaLista(teste) ? NL.deduzir(teste, LISTA, CARDS, opcoes)
      : Motor.nivelamento.deduzir(teste, CARDS, opcoes);
    progresso.nivelamento = Object.assign({ feitoEm: agora, pulou: !!pulou, comeco: teste.comeco }, d);
    depoisDoTeste();
  }

  /* O nivelamento novo entra no jogo: o motor recebe os presumidos (ou
     perde os antigos, no refazer) e o prior do nível, as filas e os inéditos
     se refazem, e os extras sobem. */
  function depoisDoTeste() {
    comeco.teste = null;
    conciliarFila(progresso);
    salvarProgresso();
    atualizarPlacar();
    if (Sinc) Sinc.agendar(3000);
    /* sem tela de «como funciona» (tirada a pedido do Gere, 19/10/2026):
       quem não ganhou palavra nenhuma vai direto ao primeiro card */
    comeco.fase = Motor.palavrasConhecidas(CARDS) ? 'resultado' : null;
    if (!comeco.fase) { fimDoComeco(!comeco.refazer); return; }
    guardarComeco();
    desenharComeco();
  }

  function desenharResultado(caixa) {
    const n = Motor.palavrasConhecidas(CARDS);
    const transparentes = Motor.palavrasConhecidas(CARDS, {});
    const presumidas = n - transparentes;
    caixa.appendChild(noHtml('h1', 'comeco-titulo', tn('comeco.resultado', n, { n: milhar(n) })));
    /* todas transparentes (o «Nunca», em geral): «71 delas» depois de «71
       palavras» soaria torto */
    if (transparentes && !presumidas) {
      caixa.appendChild(noHtml('p', 'comeco-nota', t('comeco.soTransparentes', { A: escapar(NOME_A) })));
    } else if (transparentes) {
      caixa.appendChild(noHtml('p', 'comeco-nota', tn('comeco.transparentes', transparentes, { n: milhar(transparentes), A: escapar(NOME_A) })));
    }
    if (presumidas > 0) {
      caixa.appendChild(noHtml('p', 'comeco-nota', tn('comeco.presumidas', presumidas, { n: milhar(presumidas) })));
    }
    /* quem refez a avaliação volta ao início; quem estreia vai ao primeiro card */
    const seguir = no('button', null, t(comeco.refazer ? 'comeco.continuar' : 'comeco.estudar'));
    seguir.className = 'primario grande';
    seguir.addEventListener('click', () => fimDoComeco(!comeco.refazer));
    caixa.appendChild(seguir);
  }

  el['btn-inicio'].addEventListener('click', irParaInicio);
  el['btn-cards'].addEventListener('click', abrirCards);
  el['btn-painel'].addEventListener('click', abrirPainel);
  el['btn-texto'].addEventListener('click', abrirTexto);

  ['filtro-tipo', 'filtro-nivel', 'filtro-tag', 'filtro-estado'].forEach(f => {
    el[f].addEventListener('change', renderizarCards);
  });
  let esperaBusca = null;
  el['busca-cards'].addEventListener('input', () => {
    clearTimeout(esperaBusca);
    esperaBusca = setTimeout(renderizarCards, 120);
  });
  el['btn-config'].addEventListener('click', abrirConfig);
  document.querySelectorAll('[data-voltar]').forEach(b => {
    b.addEventListener('click', () => {
      if (comeco) desenharComeco();
      else mostrar(cardAtual ? 'tela-card' : 'tela-inicio');
    });
  });

  function abrirConfig() {
    el['cfg-conta'].textContent = (ctx.nome || '') + ' · ' + (ctx.email || '');
    el['cfg-curso'].textContent = t('config.noCurso', { L: NOME_L, A: NOME_A });
    /* os outros cursos para quem fala a mesma língua, um botão cada */
    const outros = el['cfg-outros-cursos'];
    outros.textContent = '';
    (ctx.outrosCursos || []).forEach(k => {
      const b = document.createElement('button');
      b.className = 'secundario';
      b.dataset.curso = k;
      b.textContent = t('config.estudar', { x: t('lingua.' + ctx.linguaDoCurso(k)) });
      outros.appendChild(b);
    });
    el['cfg-lingua'].value = A;
    el['cfg-lingua'].disabled = false;
    mostrar('tela-config');
    mostrarMeusComentarios();
  }

  /* Vai para outro curso: o progresso deste sobe antes (o de cada curso fica
     guardado na conta e no aparelho, e nada se perde na troca). */
  async function irParaCurso(k) {
    salvarProgresso(true);
    await Sinc.antesDeSair().catch(() => 0);
    await ctx.trocarCurso(k);
  }

  /* O que a pessoa enviou e o que a curadoria respondeu (colunas triagem e retorno). */
  const SITUACAO = { aberto: t('config.sitAberto'), aceito: t('config.sitAceito'),
    recusado: t('config.sitRecusado'), resolvido: t('config.sitResolvido') };
  async function mostrarMeusComentarios() {
    const caixa = el['cfg-comentarios'];
    caixa.textContent = t('config.carregando');
    const sb = ctx.sb;
    const [a, b] = await Promise.all([
      sb.schema('cards').from('comentarios').select('card_id, curso, texto, triagem, retorno, feito_em').order('feito_em', { ascending: false }).limit(100),
      sb.schema('cards').from('contestacoes').select('card_id, curso, resposta, triagem, retorno, feito_em').order('feito_em', { ascending: false }).limit(100)
    ]).catch(() => [{ error: true }, { error: true }]);
    caixa.textContent = '';
    if (a.error || b.error) { caixa.textContent = t('config.semConexao'); return; }
    const todos = a.data.map(x => Object.assign({ tipo: t('config.tipoComentario'), dito: x.texto }, x))
      .concat(b.data.map(x => Object.assign({ tipo: t('config.tipoContestacao'), dito: aspas(x.resposta) }, x)))
      .sort((x, y) => (x.feito_em < y.feito_em ? 1 : -1));
    if (!todos.length) { caixa.textContent = t('config.nenhumComentario'); return; }
    todos.forEach(x => {
      const d = document.createElement('div'); d.className = 'meu-comentario';
      const c = (window.BARALHOS[x.curso.split('-')[0]] || { cards: [] }).cards.find(k => k.id === x.card_id);
      const topo = document.createElement('p'); topo.className = 'mc-topo';
      topo.textContent = x.tipo + ' · ' + (c ? c[x.curso.split('-')[0]] : x.card_id) + ' · ' + (SITUACAO[x.triagem] || x.triagem);
      const p = document.createElement('p'); p.className = 'mc-texto'; p.textContent = x.dito;
      d.appendChild(topo); d.appendChild(p);
      if (x.retorno) { const r = document.createElement('p'); r.className = 'mc-retorno'; r.textContent = x.retorno; d.appendChild(r); }
      caixa.appendChild(d);
    });
  }

  el['btn-conta'].addEventListener('click', () => { salvarProgresso(true); location.href = '/conta/'; });

  /* Sair manda antes o que estiver na fila. O que não subir fica guardado
     neste aparelho, ligado à conta, e sobe quando ela entrar de novo. */
  el['btn-sair'].addEventListener('click', async () => {
    el['btn-sair'].disabled = true;
    statusSync(t('config.enviando'));
    salvarProgresso(true);
    const faltam = await Sinc.antesDeSair().catch(() => Sinc.pendentes());
    if (faltam && !confirm(tn('config.sairPendentes', faltam))) {
      el['btn-sair'].disabled = false;
      return;
    }
    await TaioeSessao.sair(false);
    location.replace('/');
  });

  el['cfg-outros-cursos'].addEventListener('click', e => {
    const b = e.target.closest('[data-curso]');
    if (!b) return;
    [...el['cfg-outros-cursos'].children].forEach(x => { x.disabled = true; });
    irParaCurso(b.dataset.curso);
  });

  /* Trocar a língua da interface: se for a língua deste curso, nada muda na
     tela; se não, a escolha mostra os cursos da língua nova (ctx.mudarLingua,
     no inicio.js). Escolhido outro curso, este sobe antes; continuando neste,
     a língua volta à dele e as configurações reaparecem. */
  el['cfg-lingua'].addEventListener('change', async () => {
    const l = el['cfg-lingua'].value;
    el['cfg-lingua'].disabled = true;
    const k = await ctx.mudarLingua(l);
    if (k && k !== ctx.curso) { await irParaCurso(k); return; }
    abrirConfig();
  });

  el['btn-exportar'].addEventListener('click', exportar);

  /* «Refazer avaliação» (PLANO.md, 7.3 item 9) */
  el['btn-refazer'].addEventListener('click', () => {
    if (!confirm(t('config.refazerConfirma'))) return;
    abrirComeco({ refazer: true });
  });

  /* «Recomeçar este curso» (PLANO.md, 7.9): o servidor apaga o progresso do
     curso (cards.recomecar_curso), e este aparelho apaga a cópia dele, o
     teste guardado e os desafios anotados. Os outros aparelhos
     percebem na próxima carga (recomecado_em, em sincronia.js).
     O aviso diz quantos cards já foram vistos e só libera o botão quando a
     pessoa digita «recomeçar francês» (pedido do Gere, 17/10/2026), sem
     cobrar maiúscula, acento nem espaço a mais: o celular atrapalha nisso. */
  const fraseRecomecar = () => t('config.recomecarFrase', { L: NOME_L });
  const soLetras = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  const fraseConfere = () => soLetras(el['recomecar-frase'].value) === soLetras(fraseRecomecar());

  function abrirRecomecar() {
    const vistos = Object.keys(progresso.cards).length;
    el['recomecar-titulo'].textContent = t('config.recomecarPergunta', { L: NOME_L });
    el['recomecar-vistos'].innerHTML = vistos ? tn('config.recomecarVistos', vistos) : t('config.recomecarNenhum');
    el['recomecar-pede'].innerHTML = t('config.recomecarPede', { frase: fraseRecomecar() });
    el['recomecar-frase'].value = '';
    el['btn-recomecar-sim'].disabled = true;
    el['recomecar-fundo'].classList.remove('oculto');
    el['recomecar-frase'].focus();
  }

  function fecharRecomecar() {
    el['recomecar-fundo'].classList.add('oculto');
    el['btn-recomecar'].focus();
  }

  el['btn-recomecar'].addEventListener('click', abrirRecomecar);
  el['btn-recomecar-nao'].addEventListener('click', fecharRecomecar);
  el['recomecar-frase'].addEventListener('input', () => {
    el['btn-recomecar-sim'].disabled = !fraseConfere();
  });
  el['recomecar-frase'].addEventListener('keydown', e => {
    if (e.key === 'Enter' && fraseConfere()) el['btn-recomecar-sim'].click();
  });
  el['recomecar-fundo'].addEventListener('click', e => {
    if (e.target === el['recomecar-fundo']) fecharRecomecar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el['recomecar-fundo'].classList.contains('oculto')) fecharRecomecar();
  });

  el['btn-recomecar-sim'].addEventListener('click', async () => {
    if (!fraseConfere()) return;
    el['btn-recomecar-sim'].disabled = true;
    el['btn-recomecar-nao'].disabled = true;
    el['btn-recomecar'].disabled = true;
    Sinc.parar();
    const r = await ctx.sb.schema('cards').rpc('recomecar_curso', { curso: ctx.curso });
    if (r.error) {
      console.warn('o curso não recomeçou', r.error);
      el['btn-recomecar'].disabled = false;
      el['btn-recomecar-nao'].disabled = false;
      fecharRecomecar();
      Sinc.continuar();
      statusSync(t('config.recomecarFalhou'), 'erro');
      return;
    }
    apagando = true;
    clearTimeout(esperaSalvar);
    await Sinc.apagarLocal({ recomecadoEm: r.data });
    [CHAVE_COMECO, CHAVE_DESAFIOS].forEach(esquecerLocal);
    location.reload();
  });

  el['btn-zerar'].addEventListener('click', async () => {
    const n = Sinc.pendentes();
    const aviso = n ? tn('config.zerarPerdidas', n) : '';
    if (!confirm(aviso + t('config.zerarConfirma'))) return;
    apagando = true;
    clearTimeout(esperaSalvar);
    await Sinc.apagarLocal();
    location.reload();
  });

  /* teclado */
  document.addEventListener('keydown', e => {
    /* no teste do começo, «1» e «2» são «Já conheço» e «Quero aprender»; na
       conferência, de 1 a 5 escolhem a alternativa */
    if (!el['tela-comeco'].classList.contains('oculto')) {
      if (!comeco || comeco.fase !== 'teste' || !/^[1-5]$/.test(e.key)) return;
      const b = el['comeco-conteudo'].querySelectorAll('.botoes-teste button, .alternativas button')[+e.key - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (el['tela-card'].classList.contains('oculto')) return;
    const alvo = e.target.tagName;
    if (alvo === 'INPUT' && e.key !== 'Escape') return;
    /* O comentário se abre por cima do card, com o feedback à mostra: sem
       isto, o espaço digitado no texto não entrava e ainda avançava o card
       lá atrás, e «1» e «2» julgavam o «deu quase». */
    if (alvo === 'TEXTAREA' || alvo === 'SELECT') return;
    if (!el['comentario-fundo'].classList.contains('oculto')) return;

    if (!el['area-feedback'].classList.contains('oculto')) {
      if (!el['area-julgamento'].classList.contains('oculto')) {
        if ('12'.includes(e.key)) {
          e.preventDefault();
          document.querySelectorAll('.opcao-julgamento')[+e.key - 1].click();
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avancar(); }
      return;
    }
    if (modoAtual === 'multipla' && '12345'.includes(e.key)) {
      e.preventDefault();
      const b = el['area-multipla'].children[+e.key - 1];
      if (b && !b.disabled) b.click();
    }
  });

  /* tempo só conta enquanto a aba está visível; e a aba que some grava já
     (o envio do fechamento é com a sincronia) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (cardAtual && !respostaPendente) pausou = true;
      salvarProgresso(true);
    }
  });
  window.addEventListener('pagehide', () => salvarProgresso(true));

  /* A frase do card gruda logo abaixo do cabeçalho, e para isso precisa saber
     a altura dele — que não é fixa: em tela estreita o placar quebra de linha e
     o cabeçalho cresce. O CSS não mede outro elemento, então a medida vem
     daqui. */
  function medirCabecalho() {
    const t = document.querySelector('.topo');
    if (t) document.documentElement.style.setProperty('--altura-topo', t.offsetHeight + 'px');
  }
  medirCabecalho();
  window.addEventListener('resize', medirCabecalho);

  /* ═══════════════ arranque ═══════════════ */

  /* Os textos da tela que dependem da língua do curso. */
  function ajustarTextosDaLingua() {
    el['busca-cards'].placeholder = t('cards.buscar', { L: NOME_L, A: NOME_A });
    const op = el['filtro-estado'].querySelector('option[value="invertido"]');
    if (op) op.textContent = t('cards.fInvertido', { x: ROTULO_VOLTA });
    el['btn-texto'].hidden = !TEXTOS.length;
    ['conceito', 'forma', 'contraste'].forEach(v => {
      const opcao = el['filtro-tipo'].querySelector('option[value="' + v + '"]');
      if (opcao) opcao.hidden = v === 'contraste' ? !CARDS.some(c => c.tipo === 'contraste') : !TRILHAS;
    });
    /* no modo trilhas não há volta nem teste de nível: sai o filtro da volta, sai o grupo da
       avaliação, e o recomeço volta à escolha dos textos */
    if (TRILHAS) {
      if (op) op.hidden = true;
      const grupo = el['btn-refazer'] && el['btn-refazer'].closest('.grupo');
      if (grupo) grupo.hidden = true;
      [['config.recomecarAjuda', 'config.recomecarAjudaTrilhas'], ['config.recomecarApaga', 'config.recomecarApagaTrilhas']].forEach(([de, para]) =>
        document.querySelectorAll('[data-i18n="' + de + '"]').forEach(x => { x.setAttribute('data-i18n', para); x.textContent = t(para); }));
    }
    const icone = document.querySelector('link[rel="icon"]');
    if (icone) icone.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>" +
      BANDEIRA_L + '</text></svg>';
    document.title = 'Taioé Cards · ' + ctx.nomeCurso;
  }

  montarFiltros();
  ajustarTextosDaLingua();

  /* O texto pedido pela Biblioteca (PLANO.md, 9.1): entra na escolha da
     pessoa e tira o automático; com MAX_TEXTOS já escolhidos, a tela Textos
     pergunta qual trocar. O endereço perde o «?texto=», para recarregar não
     repetir o pedido. */
  let textoParaTrocar = null;
  /* a obra em partes: vale a parte da vez (terminadas todas, nada a fazer) */
  let pedido = ctx.textoPedido && TEXTO_POR_ID[ctx.textoPedido];
  if (pedido && pedido.obra) pedido = Motor.parteDaVez(pedido.obra, TEXTOS, (progresso.textos || {}).lidos || {});
  if (pedido) {
    const id = pedido.id;
    const e = escolhaDosTextos();
    const ativos = textosAtivosAgora().map(x => x.id);
    if (ativos.indexOf(id) < 0) {
      if (!e || !e.propria) gravarEscolha([id]);
      else if (ativos.length < Motor.MAX_TEXTOS) gravarEscolha(ativos.concat([id]));
      else textoParaTrocar = id;
    }
  }
  if (ctx.textoPedido) {
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* sem history, fica */ }
  }

  progresso.totais.sessoes = (progresso.totais.sessoes || 0) + 1;
  salvarProgresso();
  atualizarPlacar();
  carregarCursosDoTopo();
  /* a primeira entrada no curso (ou a avaliação que ficou pela metade) abre
     no começo; o resto, na página inicial */
  if (TRILHAS) esquecerLocal(CHAVE_COMECO);
  if (!retomarComeco()) {
    if (textoParaTrocar) { renderizarTexto(textoParaTrocar); mostrar('tela-texto'); }
    /* no modo trilhas, quem ainda não escolheu texto começa pela escolha */
    else if (TRILHAS && !textosAtivosAgora().length) abrirTexto();
    else mostrar('tela-inicio');
  }

  Sinc = TaioeSincronia.criar({
    sb: ctx.sb, uid: ctx.uid, curso: ctx.curso,
    progresso: () => progresso,
    aoMudar: () => { conciliarFila(progresso); salvarProgresso(); atualizarPlacar(); conferirComeco(); },
    retrato: () => (progresso.serie && progresso.serie.length ? progresso.serie[progresso.serie.length - 1] : null),
    extras: () => {
      const x = {
        arquivados: progresso.arquivados || {},
        emVista: progresso.emVista || [],
        textos: { emVista: (progresso.textos || textosVazio()).emVista, lidos: (progresso.textos || textosVazio()).lidos }
      };
      /* Os extras do começo do app (PLANO.md, 7) só viajam quando existem.
         Vazios a mais mudariam a assinatura dos extras de todo mundo e os
         mandariam de novo sem motivo — e o banco só passa a guardá-los com a
         RPC nova (gravar_extras e carregar_curso, no taioe-infra). */
      if (progresso.nivelamento) x.nivelamento = progresso.nivelamento;
      if (Object.keys(progresso.reativados || {}).length) x.reativados = progresso.reativados;
      if (Object.keys(progresso.dicasVistas || {}).length) x.dicasVistas = progresso.dicasVistas;
      return x;
    },
    /* o curso foi recomeçado em outro aparelho: a cópia daqui já foi
       apagada pela sincronia; falta o que mora no localStorage */
    recomecado: () => {
      apagando = true;
      clearTimeout(esperaSalvar);
      [CHAVE_COMECO, CHAVE_DESAFIOS].forEach(esquecerLocal);
      location.reload();
    },
    aplicarExtras: x => {
      x = x || {};
      progresso.arquivados = x.arquivados || {};
      progresso.emVista = Array.isArray(x.emVista) ? x.emVista : [];
      const t = x.textos || {};
      progresso.textos = { emVista: Object.assign({ poema: null, prosa: null, escolha: null }, t.emVista || {}), lidos: t.lidos || {} };
      /* Os do começo do app: o servidor que ainda não os guarda devolve os
         extras sem eles, e a ausência não apaga o que este aparelho tem. Quem
         chega com o campo (mesclado por mesclarExtras, ou do servidor) manda. */
      if (x.nivelamento !== undefined) {
        if (x.nivelamento && typeof x.nivelamento === 'object') progresso.nivelamento = x.nivelamento;
        else delete progresso.nivelamento;
      }
      if (x.reativados !== undefined) progresso.reativados = x.reativados || {};
      if (x.dicasVistas !== undefined) progresso.dicasVistas = x.dicasVistas || {};
    },
    estado: statusSync,
    t: t, local: LOCAL
  });
  Sinc.iniciar();

  window.TaioeCards = { progresso: () => progresso, sessao: () => sessao };
};
