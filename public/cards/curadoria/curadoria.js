/* Curadoria dos comentários (só o revisor geral, isto é, o Gere). Mostra cada comentário e
   contestação dos usuários com o card, o que o Claude decidiu, o retorno que o usuário vê e a
   conversa sobre o item; o Gere escreve notas e responde as dúvidas, que o Claude lê na rodada
   seguinte (tarefa agendada + workflow Retorno do taioe-infra). Tudo o que vem do banco entra
   com textContent. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function estado(txt, erro) { var p = $('cur-estado'); p.textContent = txt; p.classList.toggle('erro', !!erro); p.hidden = !txt; }
  function quando(iso) {
    try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
  }
  function carregarScript(caminho) {
    var v = (window.CARDS_VERSOES || {})[caminho];
    return new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = '../' + caminho + (v ? '?v=' + v : '');
      s.onload = ok; s.onerror = ok;
      document.body.appendChild(s);
    });
  }

  var sb, itens = [], conversa = [], filtro = 'gere', cardsPorCurso = {};
  var NOME_TRIAGEM = { aberto: 'aberto', aceito: 'aceito', recusado: 'recusado', resolvido: 'resolvido' };

  function textoDoCard(curso, id) {
    var l = curso.split('-')[0], c = (cardsPorCurso[l] || {})[id];
    return c ? [c[l], c.pt] : null;
  }

  function fio(caixa, msgs) {
    caixa.textContent = '';
    msgs.forEach(function (m) {
      var d = el('div', 'cur-msg ' + m.autor + (m.tipo === 'pergunta' ? ' pergunta' : ''));
      d.appendChild(el('span', 'quem', (m.autor === 'claude' ? 'Claude' : 'Você') + ' · ' +
        ({ nota: 'nota', pergunta: 'pergunta para você', resposta: 'resposta', decisao: 'decisão' }[m.tipo] || m.tipo) + ' · ' + quando(m.criado_em)));
      d.appendChild(document.createTextNode(m.texto));
      caixa.appendChild(d);
    });
  }

  function formulario(itemTipo, itemId, msgs, aoEnviar) {
    var f = el('form', 'cur-escrever');
    var ta = el('textarea'); ta.rows = 2; ta.maxLength = 4000;
    var pergunta = msgs.filter(function (m) { return m.autor === 'claude' && m.tipo === 'pergunta'; }).pop();
    ta.placeholder = pergunta ? 'Responda a dúvida do Claude…' : 'Escreva uma nota sobre este caso…';
    ta.setAttribute('aria-label', ta.placeholder);
    var b = el('button', 'primario', pergunta ? 'Responder' : 'Enviar nota'); b.type = 'submit';
    f.appendChild(ta); f.appendChild(b);
    f.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var texto = ta.value.trim();
      if (!texto) return;
      b.disabled = true;
      var r = await sb.schema('cards').from('conversa').insert({
        item_tipo: itemTipo, item_id: itemId, tipo: pergunta ? 'resposta' : 'nota', texto: texto,
        responde_a: pergunta ? pergunta.id : null
      }).select().single();
      b.disabled = false;
      if (r.error) { alert('Não consegui enviar: ' + r.error.message); return; }
      ta.value = '';
      conversa.push(r.data);
      aoEnviar();
    });
    return f;
  }

  function desenhar() {
    var caixa = $('cur-itens');
    caixa.textContent = '';
    var vis = itens.filter(function (i) {
      if (filtro === 'gere') return i.para_gere || conversa.some(function (m) { return m.item_id === i.id && m.autor === 'claude' && m.tipo === 'pergunta' && !respondida(m); });
      if (filtro === 'novos') return !i.avaliado_em;
      if (filtro === 'avaliados') return !!i.avaliado_em && !i.para_gere;
      return true;
    });
    if (!vis.length) {
      caixa.appendChild(el('p', 'sub', filtro === 'gere' ? 'Nada esperando você. Quando o Claude tiver uma dúvida, ela aparece aqui.' : 'Nenhum item neste filtro.'));
      return;
    }
    vis.forEach(function (i) {
      var c = el('article', 'cur-item' + (i.para_gere ? ' para-gere' : ''));
      var topo = el('div', 'cur-topo');
      topo.appendChild(el('span', 'cur-chip ' + i.triagem, NOME_TRIAGEM[i.triagem] || i.triagem));
      if (i.para_gere) topo.appendChild(el('span', 'cur-chip gere', 'espera você'));
      topo.appendChild(el('span', '', (i.tipo === 'comentario' ? 'Comentário' : 'Contestação') + ' · ' + i.curso + ' · ' + quando(i.feito_em)));
      c.appendChild(topo);
      var txt = textoDoCard(i.curso, i.card_id);
      var card = el('div', 'cur-card', i.card_id + ' ');
      if (txt) card.appendChild(el('span', '', txt[0] + ' → ' + txt[1]));
      c.appendChild(card);
      if (i.tipo === 'comentario') {
        c.appendChild(el('p', 'cur-rotulo', 'O usuário escreveu'));
        c.appendChild(el('p', 'cur-texto', i.texto));
      } else {
        c.appendChild(el('p', 'cur-rotulo', 'Resposta contestada (' + i.etapa + ')'));
        c.appendChild(el('p', 'cur-texto', i.resposta + (i.esperado ? '\nO card esperava: ' + i.esperado : '')));
      }
      if (i.decisao) { c.appendChild(el('p', 'cur-rotulo', 'Decisão do Claude')); c.appendChild(el('p', 'cur-texto', i.decisao)); }
      if (i.retorno) { c.appendChild(el('p', 'cur-rotulo', 'Retorno que o usuário vê')); c.appendChild(el('p', 'cur-texto', i.retorno)); }
      var msgs = conversa.filter(function (m) { return m.item_id === i.id; });
      var caixaFio = el('div', 'cur-fio');
      if (msgs.length) { c.appendChild(el('p', 'cur-rotulo', 'Conversa')); fio(caixaFio, msgs); }
      c.appendChild(caixaFio);
      c.appendChild(formulario(i.tipo, i.id, msgs, desenharTudo));
      caixa.appendChild(c);
    });
  }
  function respondida(p) { return conversa.some(function (m) { return m.responde_a === p.id; }); }

  function resumo() {
    var r = $('cur-resumo'); r.textContent = '';
    var met = function (v, rot) { var d = el('div', 'metrica'); d.appendChild(el('div', 'valor', String(v))); d.appendChild(el('div', 'rotulo', rot)); r.appendChild(d); };
    met(itens.filter(function (i) { return i.para_gere; }).length, 'esperam você');
    met(itens.filter(function (i) { return !i.avaliado_em; }).length, 'ainda não avaliados');
    met(itens.length, 'comentários e contestações');
  }

  function desenharTudo() {
    resumo();
    desenhar();
    var geral = conversa.filter(function (m) { return m.item_tipo === 'geral'; });
    fio($('cur-geral-fio'), geral);
  }

  async function carregarDados() {
    var a = await sb.schema('cards').from('comentarios').select('*').order('recebido_em', { ascending: false }).limit(1000);
    var b = await sb.schema('cards').from('contestacoes').select('*').order('recebido_em', { ascending: false }).limit(1000);
    var v = await sb.schema('cards').from('conversa').select('*').order('criado_em', { ascending: true }).limit(5000);
    if (a.error || b.error || v.error) throw (a.error || b.error || v.error);
    itens = a.data.map(function (x) { x.tipo = 'comentario'; return x; })
      .concat(b.data.map(function (x) { x.tipo = 'contestacao'; return x; }))
      .sort(function (x, y) { return x.recebido_em < y.recebido_em ? 1 : -1; });
    conversa = v.data;
  }

  async function principal() {
    if (!TaioeSessao.temSessaoSalva()) { TaioeSessao.irParaEntrar(); return; }
    sb = TaioeSessao.cliente();
    var s = (await sb.auth.getSession()).data.session;
    if (!s) { TaioeSessao.irParaEntrar(); return; }
    var pode = await sb.schema('conta').rpc('tem_papel', { papel: 'revisor', escopo: '*' });
    if (pode.error || !pode.data) { estado('Esta página é só para a curadoria dos Cards.', true); return; }
    estado('Carregando os comentários…');
    /* os baralhos publicados (o versoes.js diz quais), para o comentário mostrar o card; o
       francês e o latim (21/10/2026) entraram com eles */
    var LINGUAS = ['es', 'en', 'pt', 'fr', 'la'].filter(function (l) { return !!(window.CARDS_VERSOES || {})['data/cards-' + l + '.js']; });
    await Promise.all(LINGUAS.map(function (l) { return carregarScript('data/cards-' + l + '.js'); }));
    LINGUAS.forEach(function (l) {
      var b = window.BARALHOS && window.BARALHOS[l];
      cardsPorCurso[l] = {};
      if (b) b.cards.forEach(function (c) { cardsPorCurso[l][c.id] = c; });
    });
    await carregarDados();
    estado('');
    $('cur-app').hidden = false;
    Array.prototype.forEach.call(document.querySelectorAll('[data-filtro]'), function (b) {
      b.addEventListener('click', function () {
        filtro = b.getAttribute('data-filtro');
        Array.prototype.forEach.call(document.querySelectorAll('[data-filtro]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        desenhar();
      });
    });
    var fg = document.querySelector('.cur-geral form');
    fg.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var ta = fg.querySelector('textarea'), texto = ta.value.trim();
      if (!texto) return;
      var r = await sb.schema('cards').from('conversa').insert({ item_tipo: 'geral', tipo: 'nota', texto: texto }).select().single();
      if (r.error) { alert('Não consegui enviar: ' + r.error.message); return; }
      ta.value = '';
      conversa.push(r.data);
      desenharTudo();
    });
    desenharTudo();
  }

  principal().catch(function (e) { console.error(e); estado('Não consegui abrir a curadoria. Confira a conexão e recarregue.', true); });
})();
