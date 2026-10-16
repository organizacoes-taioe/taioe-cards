/* sincronia.js — o protocolo do anexo do banco, §2. A fila de respostas mora no aparelho
   (TaioeArmazem, loja «fila») e só perde um evento depois do recibo do servidor. O relógio das
   filas («totais.respostas») é linearizado no servidor: cada lote leva a «base» que o aparelho
   conhecia, e o recibo devolve o «delta» de respostas que outro aparelho gravou antes destas.

     fila = { base, eventos: [...], sujos: [ids], puxadoEm, loteSemRecibo,
              extrasEnviados, retorno: [...], quarentena: [...] }

   O app entrega os ganchos em TaioeSincronia.criar(opcoes):
     progresso()        o objeto progresso, vivo
     aoMudar(motivo)    o servidor mexeu no progresso: reconciliar filas, salvar, redesenhar
     retrato()          o ponto da série agora: [respostas, ida, volta, d0..d5], ou null
     extras()           { arquivados, emVista, textos: { emVista, lidos } }, e, quando existem,
                        nivelamento, reativados e dicasVistas (o começo do app, PLANO.md, 7)
     aplicarExtras(x)   adota os extras mesclados pelo servidor
     estado(txt, cls)   a linha de estado da sincronização, para a tela */
(function () {
  'use strict';

  var POR_LOTE = 100, ESTADOS_POR_LOTE = 200;
  var ENVIAR_COM = 10;                     // eventos na fila
  var ENVIAR_DEPOIS = 30000;               // ms depois do primeiro pendente
  var PUXAR_SE_PARADO = 5 * 60000;         // no foco, se a última carga for mais velha
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
    var ev = (servidor.emVista || []).length ? servidor.emVista : (local.emVista || []);
    var saida = { arquivados: arq, emVista: ev, textos: { emVista: tev, lidos: lidos } };

    // o começo do app (PLANO.md, seção 7). Cada campo só entra na mescla se um dos lados o tem:
    // vazio a mais mudaria a assinatura dos extras (ver o extras() do app).
    // — nivelamento: o feito mais recente (feitoEm) vence, inteiro — o «refazer» troca o teste
    //   e os presumidos juntos, e misturar dois testes não tem sentido; no empate, o do servidor;
    var nl = local.nivelamento, ns = servidor.nivelamento;
    if (nl || ns) {
      saida.nivelamento = !nl ? ns : !ns ? nl
        : (String(ns.feitoEm || '') >= String(nl.feitoEm || '') ? ns : nl);
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
          Object.keys(e).forEach(function (k) { if (k !== 'historico') copia[k] = e[k]; });
          return copia;
        });
      var lote = { curso: curso, base: fila.base, respostas: fila.eventos.slice(0, POR_LOTE), estados: estados };
      var r = o.retrato();
      if (r && r.length === 9) lote.retrato = r;
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
        });
        fila.eventos.forEach(function (e) { if (e.relogio != null) e.relogio += r.delta; });
        (p.serie || []).forEach(function (pt) { if (pt[0] > fila.base) pt[0] += r.delta; });
      }
      fila.base = r.relogio;
      p.totais.respostas = r.relogio + fila.eventos.length;
      p.totais.acertos = r.acertos + fila.eventos.filter(function (e) { return e.acertou; }).length;
      // estados: limpa os sujos que não mudaram durante o envio; adota os do servidor
      var mandados = {};
      lote.estados.forEach(function (e) { mandados[e.id] = e.vistas; });
      var pendentesNoServidor = r.estados_pendentes || [];
      fila.sujos = fila.sujos.filter(function (id) {
        return !(id in mandados) || (p.cards[id] && p.cards[id].vistas !== mandados[id]) ||
               pendentesNoServidor.indexOf(id) >= 0;
      });
      (r.estados_servidor || []).forEach(function (e) {
        if (fila.sujos.indexOf(e.id) >= 0) return;
        var local = p.cards[e.id];
        p.cards[e.id] = Object.assign({}, e, { historico: (local && local.historico) || [] });
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
      var lote = montarLote({ bytes: 60000, maxEstados: 60 });
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
        if (sujos[e.id]) return;                         // fica o local; o servidor decide no envio
        var local = p.cards[e.id];
        p.cards[e.id] = Object.assign({}, e, { historico: (local && local.historico) || [] });
      });

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
        if (Array.isArray(c.retencao)) p.retencao = c.retencao.map(function (x) { return x.slice(); });
      } else {
        // com fila pendente, a base e o relógio NÃO mudam (correção 11); o diário do servidor
        // ganha por cima os eventos que ainda não subiram
        var dias = c.diario || {};
        fila.eventos.forEach(function (e) {
          if (dias[Motor.diaLocal(e.em)]) Motor.anotarDiario(p.diario, e, e.em);
        });
      }

      // a série: um ponto por dia (o retrato), depois do último ponto que o aparelho já tem
      var retratos = Object.keys(c.diario || {}).map(function (d) { return c.diario[d].retrato; })
        .filter(function (x) { return Array.isArray(x) && x.length === 9; })
        .sort(function (a, b) { return a[0] - b[0]; });
      p.serie = p.serie || [];
      var ultimo = p.serie.length ? p.serie[p.serie.length - 1][0] : -1;
      retratos.forEach(function (x) { if (x[0] > ultimo) { p.serie.push(x.slice()); ultimo = x[0]; } });

      if (c.extras) {
        if (fila.extrasEnviados === null) {
          // aparelho que nunca sincronizou os extras: fica com os do servidor, mesclados com o
          // que tiver sido feito aqui antes (o mesmo critério da RPC gravar_extras)
          o.aplicarExtras(mesclarExtras(o.extras(), c.extras));
          fila.extrasEnviados = canonico(c.extras);
        } else if (!extrasSujos()) {
          o.aplicarExtras(c.extras);
          fila.extrasEnviados = canonico(o.extras());
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
        await puxar(aparelhoNovo);
        sb.schema('conta').rpc('registrar_acesso', { app: 'cards' }).then(function () {}, function () {});
        contarEstado();
      } catch (e) {
        console.warn('não consegui carregar o curso do servidor', e);
        contarEstado();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') enviarNoFechamento();
        else if (!fila.puxadoEm || Date.now() - Date.parse(fila.puxadoEm) > PUXAR_SE_PARADO) puxar().catch(function () {});
      });
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

  window.TaioeSincronia = { criar: criar, mesclarExtras: mesclarExtras, gestoAtivo: gestoAtivo, dataDoGesto: dataDoGesto };
})();
