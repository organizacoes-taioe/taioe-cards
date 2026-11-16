/* sincronia.js — o protocolo do anexo do banco, §2. A fila de respostas mora no aparelho
   (TaioeArmazem, loja «fila») e só perde um evento depois do recibo do servidor. O relógio das
   filas («totais.respostas») é linearizado no servidor: cada lote leva a «base» que o aparelho
   conhecia, e o recibo devolve o «delta» de respostas que outro aparelho gravou antes destas.

     fila = { base, eventos: [...], sujos: [ids], puxadoEm, loteSemRecibo,
              extrasEnviados, retorno: [...], quarentena: [...] }

   O app entrega os ganchos em TaioeSincronia.criar(opcoes):
     progresso()        o objeto progresso, vivo
     aoMudar(motivo)    o servidor mexeu no progresso: reconciliar filas, salvar, redesenhar
     retrato()          o ponto da série agora: [respostas, ida, volta, d0…] (um d por degrau da escada do curso), ou null
     extras()           { arquivados, emVista, textos: { emVista, lidos } }, e, quando existem,
                        nivelamento, reativados e dicasVistas (o começo do app, PLANO.md, 7)
     aplicarExtras(x)   adota os extras mesclados pelo servidor
     estado(txt, cls)   a linha de estado da sincronização, para a tela */
(function () {
  'use strict';

  var POR_LOTE = 100, ESTADOS_POR_LOTE = 200;
  var ENVIAR_COM = 5;                      // eventos na fila
  var ENVIAR_DEPOIS = 4000;                // ms depois do primeiro pendente
  /* Dois aparelhos no mesmo curso: o que ficou para trás estreava de novo os cards que o
     outro acabara de estrear, e o «Já conheço» voltava (o Gere, 03/11/2026). Por isso a carga
     vem a cada volta ao app, sem esperar, e a cada minuto enquanto ele está aberto. */
  var PUXAR_NO_FOCO = 15000;               // na volta ao app, se a última carga for mais velha
  var PUXAR_A_CADA = 60000;                // com o app à vista
  var JANELA_DIAS = 30;                    // o servidor descarta resposta mais velha (correção 5)

  function bytes(o) { return new TextEncoder().encode(JSON.stringify(o)).length; }

  // JSON com as chaves em ordem: o jsonb devolve as chaves noutra ordem, e a assinatura dos
  // extras não pode mudar só por isso.
  function canonico(v) {
    if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canonico(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  // a mescla de gravar_extras, do lado do aparelho: arquivo pelo gesto mais recente, lido pela
  // data mais antiga, e o que está em vista vem do servidor quando ele tiver algo
  function mesclarExtras(local, servidor) {
    var arq = Object.assign({}, local.arquivados || {});
    Object.keys(servidor.arquivados || {}).forEach(function (id) {
      var s = servidor.arquivados[id];
      if (!arq[id] || String(s.em) >= String(arq[id].em)) arq[id] = s;
    });
    var tl = (local.textos || {}), ts = (servidor.textos || {});
    var lidos = Object.assign({}, tl.lidos || {});
    Object.keys(ts.lidos || {}).forEach(function (id) {
      if (!lidos[id] || String(ts.lidos[id]) < String(lidos[id])) lidos[id] = ts.lidos[id];
    });
    var tev = ts.emVista && (ts.emVista.poema || ts.emVista.prosa) ? ts.emVista : (tl.emVista || {});
    // a escolha dos textos (PLANO.md, 9.3): a de «em» mais recente; no empate, a do servidor
    var el = (tl.emVista || {}).escolha, es = (ts.emVista || {}).escolha;
    var escolha = !el ? (es || null) : !es ? el : (String(es.em || '') >= String(el.em || '') ? es : el);
    tev = Object.assign({}, tev, { escolha: escolha });
    var ev = (servidor.emVista || []).length ? servidor.emVista : (local.emVista || []);
    var saida = { arquivados: arq, emVista: ev, textos: { emVista: tev, lidos: lidos } };

    // o começo do app (PLANO.md, seção 7). Cada campo só entra na mescla se um dos lados o tem:
    // vazio a mais mudaria a assinatura dos extras (ver o extras() do app).
    // — nivelamento: o feito ou revisto mais recente vence, inteiro — o «refazer» troca o teste
    //   e os presumidos juntos, e misturar dois testes não tem sentido; no empate, o do servidor;
    var nl = local.nivelamento, ns = servidor.nivelamento;
    if (nl || ns) {
      // desde 15/11/2026 a estimativa viva refaz a divisa (revistoEm), e vale a mais recente
      var quando = function (n) { return String(n.revistoEm || n.feitoEm || ''); };
      saida.nivelamento = !nl ? ns : !ns ? nl : (quando(ns) >= quando(nl) ? ns : nl);
    }
    // — reativados (id → ISO) e dicasVistas (chave → ISO): chave a chave, o GESTO MAIS RECENTE
    //   vence, como no arquivo. A primeira versão era a união com a data mais antiga, e a união
    //   não desfaz nada: o «Rever dicas» e o «voltar a contar como conhecida» (09/10, as telas)
    //   precisam desfazer. Desfazer grava a data com um «-» na frente («-2026-10-09T…»): a
    //   chave fica, com a data do gesto, e quem lê trata o «-» como «não» (ver gestoAtivo).
    //   No empate, o do servidor.
    ['reativados', 'dicasVistas'].forEach(function (campo) {
      var l = local[campo], s = servidor[campo];
      if (!l && !s) return;
      var u = Object.assign({}, l || {});
      Object.keys(s || {}).forEach(function (k) {
        if (!u[k] || dataDoGesto(s[k]) >= dataDoGesto(u[k])) u[k] = s[k];
      });
      saida[campo] = u;
    });
    return saida;
  }

  // o valor de reativados e dicasVistas: «ISO» é sim, «-ISO» é o gesto de desfazer
  function dataDoGesto(v) { return String(v || '').replace(/^-/, ''); }
  function gestoAtivo(v) { return typeof v === 'string' && v !== '' && v[0] !== '-'; }

  // o estado que vem do servidor substitui o local (o histórico é só daqui)
  function adotar(p, e) {
    var local = p.cards[e.id];
    p.cards[e.id] = Object.assign({}, e, { historico: (local && local.historico) || [], vistasServidor: e.vistas });
  }

  /* ── a série do gráfico «O caminho até aqui» ──
     [respostas, ida, volta, d0…]. Ela anda sempre para a frente no número de respostas: fica
     a maior sequência crescente (até 09/11/2026 a carga podia pôr o ponto do outro aparelho fora
     de ordem). E sai a foto velha: o ponto que vem depois de um salto de mais de 20 respostas
     quase sem mudança nenhuma, mais os seguidos dele de uma em uma resposta, até a contagem dar
     o pulo de quando o aparelho recebeu os estados do outro. Era a resposta que ficara na fila
     deste aparelho, empurrada para depois das do outro com as contagens de antes delas: no
     gráfico, um trecho parado e um degrau (o Gere, 09/11/2026). */
  function mudanca(a, b) {
    var s = 0;
    for (var k = 1; k < a.length; k++) s += Math.abs(a[k] - b[k]);
    return s;
  }
  /* O tamanho do ponto é do curso: 3 números e um por degrau da escada (Motor.degraus): 9 nas
     línguas vivas, 10 nas mortas. Nas mortas, o ponto de 9 (de antes da escada de sete degraus,
     11/11/2026) ganha 0 no fim; os índices são os mesmos do estado do card. Devolve o ponto
     certo (cópia, se completou) ou null. */
  function ajustarPonto(pt) {
    var n = 3 + Motor.degraus();
    if (!Array.isArray(pt)) return null;
    if (pt.length === n) return pt;
    if (Motor.escada() === 'mortas' && pt.length === n - 1) return pt.concat([0]);
    return null;
  }
  function limparSerie(serie) {
    serie = (serie || []).map(ajustarPonto).filter(function (pt) { return pt; });
    var fins = [], antes = new Array(serie.length);   // fins[k]: o ponto que fecha a sequência de k+1
    serie.forEach(function (pt, i) {
      var a = 0, b = fins.length;
      while (a < b) { var m = (a + b) >> 1; if (serie[fins[m]][0] < pt[0]) a = m + 1; else b = m; }
      antes[i] = a ? fins[a - 1] : -1;
      fins[a] = i;
    });
    var ordem = [];
    for (var i = fins.length ? fins[fins.length - 1] : -1; i >= 0; i = antes[i]) ordem.push(serie[i]);
    ordem.reverse();
    var fica = [];
    for (var j = 0; j < ordem.length; j++) {
      var ant = fica[fica.length - 1];
      if (ant && ordem[j][0] - ant[0] > 20 && mudanca(ant, ordem[j]) <= 2) {
        while (j + 1 < ordem.length && ordem[j + 1][0] - ordem[j][0] === 1 && mudanca(ordem[j], ordem[j + 1]) <= 2) j++;
        continue;
      }
      fica.push(ordem[j]);
    }
    return semDesvio(fica);
  }
  /* Cada resposta muda no máximo duas contagens em um (um card sai de uma etapa e entra em
     outra): entre dois pontos a mudança não passa de duas vezes as respostas que os separam,
     mais uma folga. O ponto que passa disso e que os pontos seguintes desmentem (algum dos
     próximos doze volta a combinar com o anterior) é foto velha que ficou no meio dos pontos do
     outro aparelho: sai. Se os seguintes confirmam o salto, ele é de verdade (o nivelamento, a
     flexão que adormece) e fica. Era a reentrância perto da resposta 7.800 (o Gere, 11/11/2026). */
  function combina(a, b) { return mudanca(a, b) <= 2 * (b[0] - a[0]) + 4; }
  function semDesvio(serie) {
    var fica = serie.length ? [serie[0]] : [];
    for (var i = 1; i < serie.length; i++) {
      var ant = fica[fica.length - 1];
      if (!combina(ant, serie[i])) {
        var desmentido = false;
        for (var j = i + 1; j < serie.length && j <= i + 12; j++) {
          if (combina(ant, serie[j])) { desmentido = true; break; }
        }
        if (desmentido) continue;
      }
      fica.push(serie[i]);
    }
    return fica;
  }
  // um ponto por vaga de «passo» respostas (o último de cada), com no máximo «teto» pontos
  function rarear(serie, teto) {
    if (!serie.length) return serie;
    var passo = Math.max(5, Math.ceil(serie[serie.length - 1][0] / teto));
    return serie.filter(function (pt, i) {
      return i === serie.length - 1 || Math.floor(serie[i + 1][0] / passo) !== Math.floor(pt[0] / passo);
    });
  }

  function filaVazia() {
    return { base: 0, eventos: [], sujos: [], puxadoEm: null, loteSemRecibo: null,
             extrasEnviados: null, retorno: [], quarentena: [] };
  }

  function criar(o) {
    var sb = o.sb, uid = o.uid, curso = o.curso, chave = uid + ':' + curso;
    /* os textos da linha de estado, na língua da interface (o app passa o
       tradutor dele; sem ele, o da página) */
    var t = o.t || function (k, v) { return window.TaioeI18n ? TaioeI18n.t(k, v) : k; };
    var tn = function (k, n, v) { return t(k + (n === 1 ? '.1' : '.n'), Object.assign({ n: n }, v)); };
    var local = o.local || 'pt-BR';
    var fila = filaVazia();
    var emVoo = false, temporizador = null, recuo = 0, pausaAte = 0, sessao = null, parado = false;

    function hora() { return new Date().toLocaleTimeString(local, { hour: '2-digit', minute: '2-digit' }); }
    function salvarFila() { return TaioeArmazem.gravar('fila', chave, fila); }
    function pendentes() { return fila.eventos.length + (fila.retorno || []).length; }

    function contarEstado() {
      if (parado) return;
      var n = pendentes();
      if (!n) { o.estado(t('sinc.tudoSalvo', { hora: hora() }), 'ok'); return; }
      var velho = fila.eventos.length && (Date.now() - Date.parse(fila.eventos[0].em)) > 3 * 864e5;
      o.estado(tn('sinc.esperando', n) +
        (navigator.onLine === false ? t('sinc.semConexao') : '') + '.' +
        (velho ? t('sinc.velho') : ''),
        velho ? 'erro' : '');
    }

    /* ── a sessão em cache síncrono, para o envio do fechamento ── */
    sb.auth.getSession().then(function (r) { sessao = r.data && r.data.session; });
    sb.auth.onAuthStateChange(function (ev, s) { sessao = s; });

    /* ── anotar ── */
    function anotar(evento, idCard) {
      fila.eventos.push(evento);
      marcarSujo(idCard, true);
      salvarFila();
      if (fila.eventos.length >= ENVIAR_COM) enviar();
      else agendar(ENVIAR_DEPOIS, true);
      contarEstado();
    }

    function marcarSujo(id, semSalvar) {
      if (id && fila.sujos.indexOf(id) < 0) fila.sujos.push(id);
      if (!semSalvar) { salvarFila(); agendar(ENVIAR_DEPOIS, true); }
    }

    // comentário ou contestação: vai por uma fila pequena, pelo mesmo envio
    function retorno(tabela, linha) {
      fila.retorno = fila.retorno || [];
      fila.retorno.push({ tabela: tabela, linha: linha });
      salvarFila();
      agendar(1500);
      contarEstado();
    }

    // «manter» não adia um envio já marcado: a rede de segurança dos 30 s conta do primeiro
    function agendar(ms, manter) {
      if (temporizador && manter) return;
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { temporizador = null; enviar(); }, ms || 3000);
    }

    /* ── o lote ── */
    function montarLote(limite) {
      limite = limite || {};
      var p = o.progresso();
      var estados = fila.sujos.slice(0, limite.maxEstados || ESTADOS_POR_LOTE)
        .map(function (id) { return p.cards[id]; })
        .filter(function (e) { return e && e.vistas; })
        .map(function (e) {
          var copia = {};
          Object.keys(e).forEach(function (k) { if (k !== 'historico' && k !== 'vistasServidor') copia[k] = e[k]; });
          // as vistas que este aparelho sabe que o servidor tem: com base velha, o servidor
          // recusa o estado e devolve o dele (migração 20261103120000 do taioe-infra)
          if (typeof e.vistasServidor === 'number') copia.base = e.vistasServidor;
          return copia;
        });
      var lote = { curso: curso, base: fila.base, respostas: fila.eventos.slice(0, POR_LOTE), estados: estados };
      var r = o.retrato();
      if (r && r.length === 3 + Motor.degraus()) lote.retrato = r;
      while (limite.bytes && bytes({ lote: lote }) > limite.bytes &&
             (lote.respostas.length > 1 || lote.estados.length > 1)) {
        if (lote.estados.length > 1) lote.estados = lote.estados.slice(0, Math.floor(lote.estados.length / 2));
        else lote.respostas = lote.respostas.slice(0, Math.floor(lote.respostas.length / 2));
      }
      return lote;
    }

    // enquanto houver lote sem recibo, o próximo envio repete esse lote (correção 12)
    function proximoLote() {
      if (fila.loteSemRecibo) return fila.loteSemRecibo;
      var p = o.progresso();
      fila.sujos = fila.sujos.filter(function (id) { return p.cards[id] && p.cards[id].vistas; });
      var lote = montarLote();
      if (!lote.respostas.length && !lote.estados.length) return null;
      fila.loteSemRecibo = lote;
      salvarFila();
      return lote;
    }

    // a resposta mais velha que a janela do servidor não sobe: vai para a quarentena, com aviso
    function separarVelhas() {
      var corte = Date.now() - (JANELA_DIAS - 1) * 864e5;
      var velhas = fila.eventos.filter(function (e) { return Date.parse(e.em) < corte; });
      if (!velhas.length) return;
      var ids = {};
      velhas.forEach(function (e) { ids[e.id] = true; });
      fila.eventos = fila.eventos.filter(function (e) { return !ids[e.id]; });
      fila.quarentena = (fila.quarentena || []).concat(velhas).slice(-2000);
      if (fila.loteSemRecibo) {
        fila.loteSemRecibo.respostas = fila.loteSemRecibo.respostas.filter(function (e) { return !ids[e.id]; });
      }
      console.warn('respostas de mais de ' + JANELA_DIAS + ' dias ficaram de fora do envio', velhas.length);
    }

    /* ── o recibo ── */
    function aplicarRecibo(r, lote) {
      var p = o.progresso();
      fila.loteSemRecibo = null;
      var enviados = {};
      lote.respostas.forEach(function (e) { enviados[e.id] = true; });
      fila.eventos = fila.eventos.filter(function (e) { return !enviados[e.id]; });
      // rebase: outro aparelho gravou r.delta respostas «antes» das nossas
      if (r.delta) {
        Object.keys(p.cards).forEach(function (id) {
          var e = p.cards[id];
          if (e.naFila && e.naFila.desde >= fila.base) e.naFila.desde += r.delta;
          if (e.estreouNa !== undefined && e.estreouNa >= fila.base) e.estreouNa += r.delta;
          if (e.testadoNa !== undefined && e.testadoNa >= fila.base) e.testadoNa += r.delta;   // o teste do presumido (15/11/2026)
        });
        fila.eventos.forEach(function (e) { if (e.relogio != null) e.relogio += r.delta; });
        // os pontos da série depois da base são fotos de antes das respostas do outro
        // aparelho: empurrados, viravam um degrau falso. Saem; a carga traz os certos
        if (p.serie) p.serie = p.serie.filter(function (pt) { return pt[0] <= fila.base; });
        if (fila.serieAte > fila.base) fila.serieAte = fila.base;   // a carga seguinte os traz de novo
      }
      fila.base = r.relogio;
      p.totais.respostas = r.relogio + fila.eventos.length;
      p.totais.acertos = r.acertos + fila.eventos.filter(function (e) { return e.acertou; }).length;
      // estados: limpa os sujos que não mudaram durante o envio; adota os do servidor
      var mandados = {};
      lote.estados.forEach(function (e) { mandados[e.id] = e.vistas; });
      var pendentesNoServidor = r.estados_pendentes || [];
      var doServidor = {};
      (r.estados_servidor || []).forEach(function (e) { doServidor[e.id] = true; });
      // o estado que subiu: o servidor agora tem estas vistas
      Object.keys(mandados).forEach(function (id) {
        if (!doServidor[id] && pendentesNoServidor.indexOf(id) < 0 && p.cards[id]) p.cards[id].vistasServidor = mandados[id];
      });
      fila.sujos = fila.sujos.filter(function (id) {
        if (doServidor[id] && id in mandados) return false;     // recusado: fica o do servidor
        return !(id in mandados) || (p.cards[id] && p.cards[id].vistas !== mandados[id]) ||
               pendentesNoServidor.indexOf(id) >= 0;
      });
      (r.estados_servidor || []).forEach(function (e) {
        if (fila.sujos.indexOf(e.id) >= 0) return;
        adotar(p, e);
      });
      salvarFila();
      o.aoMudar('recibo');
      avisarRelogio(r.servidor_em);
      if (r.descartadas) console.warn('o servidor descartou respostas fora da janela', r.descartadas);
      if (r.delta > 0) puxar();
    }

    function avisarRelogio(servidorEm) {
      var dif = Math.abs(Date.now() - Date.parse(servidorEm));
      if (dif > 5 * 60000) {
        o.estado(t('sinc.relogio', { n: Math.round(dif / 60000) }), 'erro');
        parado = true;
        setTimeout(function () { parado = false; }, 60000);
      }
    }

    /* ── erros (tabela do §2.3) ── */
    function codigoDe(erro) { return (erro && (erro.code || '')) + ''; }

    async function tratarErro(erro, status, lote) {
      var cod = codigoDe(erro);
      if (cod === 'PT401' || status === 401) {
        var r = await sb.auth.refreshSession().catch(function () { return { error: true }; });
        if (r && !r.error && r.data && r.data.session) { agendar(500); return; }
        parado = true;
        o.estado(t('sinc.sessao'), 'erro');
        return;
      }
      if (cod === 'PT403' || status === 403) {
        parado = true;
        o.estado(t('sinc.cadastro'), 'erro');
        TaioeSessao.irParaEntrar();
        return;
      }
      if (cod === 'PT409') {
        // a base está à frente do servidor: recomeça da carga completa e monta outro lote
        fila.loteSemRecibo = null;
        var carga = await puxar(true);
        if (carga) {
          fila.base = carga.relogio;
          o.progresso().totais.respostas = carga.relogio + fila.eventos.length;
          o.aoMudar('carga');
        }
        salvarFila();
        agendar(1000);
        return;
      }
      if (cod === 'PT400' && /curso/i.test(erro && erro.message)) {
        parado = true;
        o.estado(t('sinc.cursoFechado'), 'erro');
        return;
      }
      if (cod === 'PT413' || status === 413) {
        if (lote && (lote.respostas.length > 1 || lote.estados.length > 1)) {
          fila.loteSemRecibo = montarLote({ bytes: bytes({ lote: lote }) / 2, maxEstados: Math.max(1, lote.estados.length >> 1) });
          salvarFila();
          agendar(500);
        }
        return;
      }
      if (cod === 'PT429' || status === 429) {
        var amanha = new Date();
        amanha.setUTCHours(24, 5, 0, 0);
        pausaAte = amanha.getTime();
        o.estado(t('sinc.limite'), 'erro');
        return;
      }
      if (lote && (status === 400 || cod === '22P02' || cod === '23514' || cod === 'PT400') &&
          !/no partition/i.test(erro && erro.message)) {
        // algum item ruim: divide até achar, e o culpado vai para a quarentena
        if (lote.respostas.length > 1) {
          fila.loteSemRecibo = { curso: lote.curso, base: lote.base, estados: [],
                                 respostas: lote.respostas.slice(0, lote.respostas.length >> 1) };
        } else if (lote.respostas.length === 1) {
          var ruim = lote.respostas[0];
          fila.eventos = fila.eventos.filter(function (e) { return e.id !== ruim.id; });
          fila.quarentena = (fila.quarentena || []).concat([ruim]).slice(-2000);
          fila.loteSemRecibo = null;
          console.warn('resposta recusada pelo servidor, posta de lado', ruim, erro);
        } else {
          fila.sujos = fila.sujos.filter(function (id) { return !lote.estados.some(function (e) { return e.id === id; }); });
          fila.loteSemRecibo = null;
          console.warn('estados recusados pelo servidor', lote.estados.map(function (e) { return e.id; }), erro);
        }
        salvarFila();
        agendar(500);
        return;
      }
      // rede, 5xx ou partição faltando: recuo exponencial, a fila fica
      recuo = Math.min(recuo ? recuo * 2 : 2000, 5 * 60000);
      agendar(recuo);
      contarEstado();
    }

    /* ── enviar ── */
    async function enviar() {
      if (emVoo || parado || navigator.onLine === false) return;
      if (pausaAte && Date.now() < pausaAte) return;
      emVoo = true;
      try {
        separarVelhas();
        var lote = proximoLote();
        if (lote && (lote.respostas.length || lote.estados.length)) {
          var r = await sb.schema('cards').rpc('registrar_respostas', { lote: lote });
          if (r.error) { await tratarErro(r.error, r.status, lote); return; }
          recuo = 0;
          aplicarRecibo(r.data, lote);
          // ainda há o que mandar: o próximo lote sai logo (card fora do catálogo fica sujo,
          // mas espera o próximo envio normal, para não virar laço)
          if (fila.eventos.length || lote.estados.length >= ESTADOS_POR_LOTE) agendar(300);
        } else if (fila.loteSemRecibo) {
          fila.loteSemRecibo = null;
          salvarFila();
        }
        await enviarExtras();
        await enviarRetorno();
        contarEstado();
      } catch (e) {
        await tratarErro(e, 0, null);
      } finally {
        emVoo = false;
      }
    }

    function extrasSujos() {
      return canonico(o.extras()) !== fila.extrasEnviados;
    }

    async function enviarExtras() {
      if (!extrasSujos()) return;
      var mandados = o.extras();
      var r = await sb.schema('cards').rpc('gravar_extras', { curso: curso, extras: mandados });
      if (r.error) { console.warn('extras não subiram', r.error); return; }
      // se nada mudou aqui durante o envio, adota a mescla do servidor
      if (canonico(o.extras()) === canonico(mandados)) {
        o.aplicarExtras(r.data);
        fila.extrasEnviados = canonico(o.extras());
        salvarFila();
        o.aoMudar('extras');
      }
    }

    async function enviarRetorno() {
      while ((fila.retorno || []).length) {
        var item = fila.retorno[0];
        var r = await sb.schema('cards').from(item.tabela)
          .upsert(item.linha, { onConflict: 'id', ignoreDuplicates: true });
        if (r.error) {
          var cod = codigoDe(r.error);
          if (cod === 'PT429' || r.status === 429 || !r.status || r.status >= 500) return;   // tenta depois
          console.warn('comentário recusado, posto de lado', item, r.error);
          fila.quarentena = (fila.quarentena || []).concat([item]).slice(-2000);
        }
        fila.retorno.shift();
        salvarFila();
      }
    }

    /* ── o fechamento: fetch com keepalive (até 64 KiB de corpo) ── */
    function enviarNoFechamento() {
      var s = sessao;
      if (emVoo || parado || !s || s.expires_at * 1000 - Date.now() < 30000) return;
      if (fila.loteSemRecibo) return;                      // há lote pendente: ele vai na abertura
      if (!sb.supabaseUrl || !sb.supabaseKey) return;
      // os extras primeiro, se couberem: o arquivo feito agora vale no outro aparelho
      var x = extrasSujos() ? o.extras() : null;
      var tamExtras = x ? bytes({ curso: curso, extras: x }) : 0;
      if (x && tamExtras < 24000) {
        fetch(sb.supabaseUrl + '/rest/v1/rpc/gravar_extras', {
          method: 'POST', keepalive: true,
          headers: { apikey: sb.supabaseKey, Authorization: 'Bearer ' + s.access_token,
                     'Content-Type': 'application/json', 'Content-Profile': 'cards' },
          body: JSON.stringify({ curso: curso, extras: x })
        }).catch(function () {});
      } else tamExtras = 0;
      var lote = montarLote({ bytes: 60000 - tamExtras, maxEstados: 60 });
      if (!lote.respostas.length && !lote.estados.length) return;
      fila.loteSemRecibo = lote;
      salvarFila();
      emVoo = true;
      fetch(sb.supabaseUrl + '/rest/v1/rpc/registrar_respostas', {
        method: 'POST', keepalive: true,
        headers: { apikey: sb.supabaseKey, Authorization: 'Bearer ' + s.access_token,
                   'Content-Type': 'application/json', 'Content-Profile': 'cards' },
        body: JSON.stringify({ lote: lote })
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (recibo) { aplicarRecibo(recibo, lote); })   // se a página sobreviveu
        .catch(function () {})                                       // a fila fica; vai na próxima
        .finally(function () { emVoo = false; });
    }

    /* ── a série no servidor (migração 20261109120000 do taioe-infra) ──
       Um ponto a cada lote, e a mesma curva em todo aparelho. Na primeira vez, o aparelho
       manda a série que já tinha (o servidor fica, em cada faixa de 25 respostas, com a fonte
       de mais pontos); na abertura vem a série inteira, e depois só o que veio de novo. O que
       ainda não subiu fica por cima, do aparelho. Devolve false se o servidor não a tem. */
    var serieInteira = false;
    async function juntarSerie() {
      var p = o.progresso();
      if (!fila.serieEnviada) {
        var minha = rarear(limparSerie(p.serie), 3000);
        if (minha.length) {
          var g = await sb.schema('cards').rpc('gravar_serie', { curso: curso, pontos: minha });
          if (g.error) return false;
        }
        fila.serieEnviada = true;
      }
      var depois = serieInteira ? (fila.serieAte || 0) : null;
      var r = await sb.schema('cards').rpc('carregar_serie', { curso: curso, depois: depois });
      if (r.error) return false;
      var pontos = Array.isArray(r.data) ? r.data : [];
      p = o.progresso();
      if (pontos.length) {
        var ate = pontos[pontos.length - 1][0];
        var local = p.serie || [];
        p.serie = local.filter(function (pt) { return depois !== null && pt[0] <= depois; })
          .concat(pontos, local.filter(function (pt) { return pt[0] > ate; }));
        fila.serieAte = ate;
      }
      serieInteira = true;
      return true;
    }

    /* ── puxar (§2.4) ── */
    async function puxar(completo) {
      var p = o.progresso();
      var desde = (!completo && fila.puxadoEm) ? new Date(Date.parse(fila.puxadoEm) - 60000).toISOString() : null;
      var r = await sb.schema('cards').rpc('carregar_curso', { curso: curso, desde: desde });
      if (r.error) { if (!r.status || r.status >= 500) return null; throw r.error; }
      var c = r.data;
      /* o curso recomeçou (cards.recomecar_curso) depois da última carga
         deste aparelho: a cópia daqui é da vida anterior, e sai inteira */
      var recomecado = Date.parse(c.recomecado_em) || 0;
      if (recomecado > (Date.parse(fila.recomecadoEm) || 0)) {
        var velha = !!fila.puxadoEm && Date.parse(fila.puxadoEm) < recomecado;
        if (velha && o.recomecado) {
          parado = true;
          await apagarLocal({ recomecadoEm: c.recomecado_em });
          o.recomecado();
          return null;
        }
        fila.recomecadoEm = c.recomecado_em;
      }
      var sujos = {};
      fila.sujos.forEach(function (id) { sujos[id] = true; });
      (c.estados || []).forEach(function (e) {
        // sujo: fica o local, mas ele fica sabendo das vistas do servidor, que decide no envio
        if (sujos[e.id]) { if (p.cards[e.id]) p.cards[e.id].vistasServidor = e.vistas; return; }
        adotar(p, e);
      });
      if (completo) fila.bases = 1;

      var semFila = !fila.eventos.length && !fila.loteSemRecibo;
      p.diario = p.diario || {};
      Object.keys(c.diario || {}).forEach(function (d) {
        var g = c.diario[d];
        p.diario[d] = { n: g.n, ok: g.ok, h: (g.h || []).slice() };
      });
      if (semFila) {
        p.totais.respostas = c.relogio;
        p.totais.acertos = c.acertos;
        fila.base = c.relogio;
        if (Array.isArray(c.retencao) && c.retencao.length === Motor.degraus()) p.retencao = c.retencao.map(function (x) { return x.slice(); });
      } else {
        // com fila pendente, a base e o relógio NÃO mudam (correção 11); o diário do servidor
        // ganha por cima os eventos que ainda não subiram
        var dias = c.diario || {};
        fila.eventos.forEach(function (e) {
          if (dias[Motor.diaLocal(e.em)]) Motor.anotarDiario(p.diario, e, e.em);
        });
      }

      // a série: a do servidor; se ele ainda não a tiver, o retrato de cada dia, como antes
      if (!(await juntarSerie()) && semFila) {
        var retratos = Object.keys(c.diario || {}).map(function (d) { return c.diario[d].retrato; })
          .map(ajustarPonto).filter(function (x) { return x; })
          .sort(function (a, b) { return a[0] - b[0]; });
        p.serie = p.serie || [];
        var ultimo = p.serie.length ? p.serie[p.serie.length - 1][0] : -1;
        retratos.forEach(function (x) { if (x[0] > ultimo) { p.serie.push(x.slice()); ultimo = x[0]; } });
      }

      if (c.extras) {
        if (fila.extrasEnviados === null) {
          // aparelho que nunca sincronizou os extras: fica com os do servidor, mesclados com o
          // que tiver sido feito aqui antes (o mesmo critério da RPC gravar_extras)
          o.aplicarExtras(mesclarExtras(o.extras(), c.extras));
          fila.extrasEnviados = canonico(c.extras);
        } else if (!extrasSujos()) {
          o.aplicarExtras(c.extras);
          fila.extrasEnviados = canonico(o.extras());
        } else {
          // há gesto daqui ainda sem subir: mescla pelo critério do servidor (o arquivo feito no
          // outro aparelho não espera o envio daqui para valer); a mescla sobe no próximo envio
          o.aplicarExtras(mesclarExtras(o.extras(), c.extras));
        }
      }
      fila.puxadoEm = c.servidor_em;
      salvarFila();
      o.aoMudar('carga');
      return c;
    }

    /* ── abrir ── */
    async function iniciar() {
      var salva = await TaioeArmazem.ler('fila', chave);
      if (salva && Array.isArray(salva.eventos)) fila = Object.assign(filaVazia(), salva);
      contarEstado();
      try {
        // na abertura, ENVIAR antes de puxar, com a base antiga
        if (fila.eventos.length || fila.loteSemRecibo) await enviar();
        var aparelhoNovo = !fila.puxadoEm || !Object.keys(o.progresso().cards).length;
        // uma carga completa ensina a cada card as vistas do servidor (a «base» do envio)
        await puxar(aparelhoNovo || fila.bases !== 1);
        sb.schema('conta').rpc('registrar_acesso', { app: 'cards' }).then(function () {}, function () {});
        contarEstado();
      } catch (e) {
        console.warn('não consegui carregar o curso do servidor', e);
        contarEstado();
      }

      // a volta ao app: aba, janela (o Chrome do Linux nem sempre avisa a aba coberta) ou a
      // página que volta do cache do navegador
      var puxando = false;
      function puxarSeVelho(ms) {
        if (puxando || parado || emVoo || navigator.onLine === false) return;
        if (fila.puxadoEm && Date.now() - Date.parse(fila.puxadoEm) < ms) return;
        puxando = true;
        // o que está na fila sobe antes, para a carga já vir com ele
        (pendentes() ? enviar() : Promise.resolve())
          .then(function () { return puxar(); })
          .catch(function () {})
          .then(function () { puxando = false; });
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') enviarNoFechamento();
        else puxarSeVelho(PUXAR_NO_FOCO);
      });
      window.addEventListener('focus', function () { puxarSeVelho(PUXAR_NO_FOCO); });
      window.addEventListener('pageshow', function (ev) { if (ev.persisted) puxarSeVelho(0); });
      setInterval(function () {
        if (document.visibilityState === 'visible') puxarSeVelho(PUXAR_A_CADA - 5000);
      }, PUXAR_A_CADA);
      window.addEventListener('pagehide', enviarNoFechamento);
      window.addEventListener('online', function () { recuo = 0; enviar(); });
      window.addEventListener('offline', contarEstado);
    }

    // «Sair»: manda o que der antes de encerrar a sessão
    async function antesDeSair() {
      if (pendentes() || extrasSujos()) await enviar();
      return pendentes();
    }

    /* Apaga a cópia deste curso. Com «recomecadoEm», a fila nova já nasce
       sabendo do recomeço, para a carga seguinte não apagar de novo. */
    async function apagarLocal(opcoes) {
      await TaioeArmazem.apagar('fila', chave);
      await TaioeArmazem.apagar('progresso', chave);
      fila = filaVazia();
      if (opcoes && opcoes.recomecadoEm) {
        fila.recomecadoEm = opcoes.recomecadoEm;
        await TaioeArmazem.gravar('fila', chave, fila);
      }
    }

    /* Para tudo (o «Recomeçar este curso» espera o servidor sem nada subir
       no meio) e volta. */
    function parar() { parado = true; clearTimeout(temporizador); }
    function continuar() { parado = false; agendar(1000); }

    return {
      iniciar: iniciar, anotar: anotar, marcarSujo: marcarSujo, retorno: retorno,
      agendar: agendar, enviar: enviar, puxar: puxar, antesDeSair: antesDeSair,
      apagarLocal: apagarLocal, pendentes: pendentes, parar: parar, continuar: continuar,
      quarentena: function () { return (fila.quarentena || []).length; }
    };
  }

  window.TaioeSincronia = { criar: criar, mesclarExtras: mesclarExtras, gestoAtivo: gestoAtivo, dataDoGesto: dataDoGesto,
                           limparSerie: limparSerie, ajustarPonto: ajustarPonto };
})();
