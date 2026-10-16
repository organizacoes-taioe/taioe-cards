/* inicio.js — a porta dos Cards. Sem sessão, vai ao /entrar/; sem cadastro, também (o hub leva
   ao cadastro e volta para cá). Sem curso escolhido, mostra a escolha. Depois carrega o baralho
   do curso e o progresso guardado neste aparelho, e entrega tudo ao app (TaioeCardsApp).
   Uma aba estuda por vez: duas abas no mesmo curso brigariam pela mesma fila (Web Locks).

   A língua da interface (07/10/2026) é a de quem estuda no curso aberto: no curso en-es tudo
   sai em espanhol. Antes de abrir um curso — a porta e a escolha — vale a língua escolhida
   (TaioeI18n.lingua(): a gravada, a do navegador ou o português), e a escolha mostra só os
   cursos dela. Se a língua escolhida não é a do curso atual (a pessoa trocou no hub, ou nas
   configurações), a escolha aparece com os cursos da língua nova e um botão para continuar no
   atual — que devolve a língua à do curso. Com login, a língua mora também no perfil
   (conta.perfis.lingua_interface), e o perfil vale mais que o aparelho. */
(function () {
  'use strict';
  var I = window.TaioeI18n;
  /* Cada curso: a língua ensinada e a de quem estuda (audiencia). O nome do
     curso sai do dicionário, na língua da interface («curso.es»: Espanhol,
     Español, Spanish). */
  var CURSOS = {
    'es-pt': { lingua: 'es', audiencia: 'pt', bandeira: '🇪🇸' },
    'en-pt': { lingua: 'en', audiencia: 'pt', bandeira: '🇺🇸' },
    'en-es': { lingua: 'en', audiencia: 'es', bandeira: '🇺🇸' },
    'pt-es': { lingua: 'pt', audiencia: 'es', bandeira: '🇧🇷' },
    'es-en': { lingua: 'es', audiencia: 'en', bandeira: '🇪🇸' },
    'pt-en': { lingua: 'pt', audiencia: 'en', bandeira: '🇧🇷' },
    /* o francês (08/10/2026) serve às três línguas da casa */
    'fr-pt': { lingua: 'fr', audiencia: 'pt', bandeira: '🇫🇷' },
    'fr-es': { lingua: 'fr', audiencia: 'es', bandeira: '🇫🇷' },
    'fr-en': { lingua: 'fr', audiencia: 'en', bandeira: '🇫🇷' }
  };
  /* Os que aparecem na escolha e nas configurações. O de português (pt-es,
     pt-en) entra quando o baralho existir. */
  var CURSOS_ATIVOS = ['es-pt', 'en-pt', 'en-es', 'es-en', 'pt-es', 'pt-en', 'fr-pt', 'fr-es', 'fr-en'];
  var ativo = function (k) { return !!CURSOS[k] && CURSOS_ATIVOS.indexOf(k) >= 0; };
  function cursosDa(l) {
    return CURSOS_ATIVOS.filter(function (k) { return CURSOS[k] && CURSOS[k].audiencia === l; });
  }
  function nomeDoCurso(k, l) { return CURSOS[k] ? I.tEm(l || I.lingua(), 'curso.' + CURSOS[k].lingua) : k; }

  function $(id) { return document.getElementById(id); }
  function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function porta(chave, erro, vars) {
    $('porta-texto').removeAttribute('data-i18n');
    $('porta-texto').textContent = I.t(chave, vars);
    $('porta-texto').classList.toggle('erro', !!erro);
    $('tela-porta').classList.remove('oculto');
  }

  function carregar(caminho) {
    var v = (window.CARDS_VERSOES || {})[caminho];
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = caminho + (v ? '?v=' + v : '');
      s.onload = ok;
      s.onerror = function () { falha(new Error('não carregou ' + caminho)); };
      document.body.appendChild(s);
    });
  }

  /* ── as bandeiras da escolha, desenhadas por DOM (a CSP não aceita HTML com estilo) ── */
  var SVG = 'http://www.w3.org/2000/svg';
  function forma(pai, tipo, attrs) {
    var e = document.createElementNS(SVG, tipo);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    pai.appendChild(e);
    return e;
  }
  function bandeira(lingua) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('class', 'curso-bandeira');
    s.setAttribute('viewBox', '0 0 30 20');
    s.setAttribute('aria-hidden', 'true');
    if (lingua === 'es') {
      forma(s, 'rect', { width: 30, height: 20, fill: '#c60b1e' });
      forma(s, 'rect', { y: 5, width: 30, height: 10, fill: '#ffc400' });
    } else if (lingua === 'en') {
      forma(s, 'rect', { width: 30, height: 20, fill: '#b22234' });
      for (var i = 1; i < 13; i += 2) forma(s, 'rect', { y: (i * 20 / 13).toFixed(3), width: 30, height: 1.538, fill: '#fff' });
      forma(s, 'rect', { width: 13, height: 10.769, fill: '#3c3b6e' });
      for (var lin = 0; lin < 5; lin++) {
        for (var col = 0; col < (lin % 2 ? 4 : 5); col++) {
          forma(s, 'circle', { cx: ((lin % 2 ? 2.8 : 1.6) + 2.4 * col).toFixed(1), cy: (1.4 + 1.9 * lin).toFixed(1), r: 0.45, fill: '#fff' });
        }
      }
    } else if (lingua === 'fr') {
      forma(s, 'rect', { width: 30, height: 20, fill: '#ce1126' });
      forma(s, 'rect', { width: 20, height: 20, fill: '#fff' });
      forma(s, 'rect', { width: 10, height: 20, fill: '#002654' });
    } else {
      forma(s, 'rect', { width: 30, height: 20, fill: '#009b3a' });
      forma(s, 'path', { d: 'M15 2.6 27.4 10 15 17.4 2.6 10Z', fill: '#fedf00' });
      forma(s, 'circle', { cx: 15, cy: 10, r: 4.4, fill: '#002776' });
    }
    return s;
  }

  /* ── o perfil da conta guarda a língua ── */
  var conta = null;   // { sb, uid, perfil }, preenchido em principal()
  async function gravarLinguaNoPerfil(l) {
    if (!conta) return;
    conta.perfil.lingua_interface = l;
    guardarLocal('cards:perfil:' + conta.uid, conta.perfil);
    /* o construtor do supabase-js só tem then, não catch: o erro de rede vem
       pelo try (sem ele, a troca de língua parava aqui) */
    var r;
    try { r = await conta.sb.schema('conta').from('perfis').update({ lingua_interface: l }).eq('usuario_id', conta.uid); }
    catch (e) { r = { error: e }; }
    if (r && r.error) console.warn('a língua escolhida fica só neste aparelho até a próxima conexão', r.error);
  }
  /* A escolha da pessoa: grava no aparelho e no perfil. Não muda a língua da
     página — quem decide isso é o curso aberto. */
  function escolherLingua(l) {
    I.guardar(l);
    return gravarLinguaNoPerfil(l);
  }

  /* ── a escolha do curso ──
     Mostra os cursos da língua «l». «atual» é o curso aberto (ou o do perfil);
     se ele não é dessa língua, aparece o botão de continuar nele. Devolve o
     curso escolhido; continuar no atual devolve o atual, com a língua de volta
     à dele. O seletor de língua, ali mesmo, refaz a lista. */
  function escolherCurso(l, atual) {
    return new Promise(function (ok) {
      var nav = document.querySelector('.acoes-topo');
      var visiveis = Array.prototype.filter.call(document.querySelectorAll('main > .tela'), function (t) {
        return !t.classList.contains('oculto');
      });
      visiveis.forEach(function (t) { t.classList.add('oculto'); });
      if (nav) nav.hidden = true;
      /* a escolha do curso é página principal: a marca volta a «Taioé», para o início da Taioé */
      var marca = document.querySelector('.topo .marca');
      if (marca && marca.classList.contains('fora-do-inicio')) {
        marca.textContent = 'Taioé';
        marca.setAttribute('href', '/');
        marca.setAttribute('data-i18n-attr', 'title:topo.marca');
        marca.classList.remove('fora-do-inicio');
      }
      var caixa = $('escolha-cursos'), seletor = $('escolha-lingua'), manter = $('btn-escolha-manter');

      function desenhar() {
        I.usar(l);
        seletor.value = l;
        caixa.textContent = '';
        var lista = cursosDa(l);
        lista.forEach(function (k) {
          var b = document.createElement('button');
          b.className = 'curso';
          b.setAttribute('data-curso', k);
          b.appendChild(bandeira(CURSOS[k].lingua));
          var n = document.createElement('span');
          n.className = 'curso-nome';
          n.textContent = nomeDoCurso(k, l);
          b.appendChild(n);
          caixa.appendChild(b);
        });
        $('escolha-nenhum').classList.toggle('oculto', lista.length > 0);
        var mostraManter = ativo(atual) && CURSOS[atual].audiencia !== l;
        manter.classList.toggle('oculto', !mostraManter);
        if (mostraManter) {
          manter.textContent = I.tEm(l, 'escolha.manter', {
            L: I.tEm(l, 'lingua.' + CURSOS[atual].lingua), A: I.tEm(l, 'lingua.' + CURSOS[atual].audiencia)
          });
        }
        $('tela-escolha').classList.remove('oculto');
      }

      function fim(curso) {
        caixa.removeEventListener('click', aoClicar);
        seletor.removeEventListener('change', aoTrocar);
        manter.removeEventListener('click', aoManter);
        $('tela-escolha').classList.add('oculto');
        if (nav) nav.hidden = false;
        ok(curso);
      }
      function aoClicar(e) {
        var b = e.target.closest && e.target.closest('[data-curso]');
        if (b) fim(b.getAttribute('data-curso'));
      }
      function aoTrocar() {
        l = seletor.value;
        escolherLingua(l);
        desenhar();
      }
      function aoManter() {
        var a = CURSOS[atual].audiencia;
        escolherLingua(a);
        I.usar(a);
        fim(atual);
      }
      caixa.addEventListener('click', aoClicar);
      seletor.addEventListener('change', aoTrocar);
      manter.addEventListener('click', aoManter);
      desenhar();
    });
  }

  async function gravarCurso(sb, uid, perfil, curso) {
    perfil.curso_atual = curso;
    guardarLocal('cards:perfil:' + uid, perfil);
    var r = await sb.schema('conta').from('perfis').update({ curso_atual: curso }).eq('usuario_id', uid);
    if (r.error) console.warn('o curso escolhido fica só neste aparelho até a próxima conexão', r.error);
  }

  async function abrir(sb, sessao, perfil, curso) {
    var uid = sessao.user.id, c = CURSOS[curso];
    I.usar(c.audiencia);
    porta('porta.abrindoCurso', false, { L: I.t('lingua.' + c.lingua) });
    await carregar('data/cards-' + curso + '.js');
    /* os textos e a lista de frequência (PLANO.md, 7.9) só existem em alguns cursos: o
       versoes.js diz quais, e o que não existe nem é pedido */
    var temArquivo = function (a) { return !!(window.CARDS_VERSOES || {})[a]; };
    if (temArquivo('data/textos-' + c.lingua + '.js')) await carregar('data/textos-' + c.lingua + '.js').catch(function () {});
    if (temArquivo('data/lista-' + curso + '.js')) await carregar('data/lista-' + curso + '.js').catch(function () {});
    var salvo = await TaioeArmazem.ler('progresso', uid + ':' + curso);
    $('tela-porta').classList.add('oculto');
    window.TaioeCardsApp({
      sb: sb, uid: uid, email: sessao.user.email, nome: perfil.nome,
      curso: curso, lingua: c.lingua, audiencia: c.audiencia, nomeCurso: nomeDoCurso(curso, c.audiencia), bandeira: c.bandeira,
      /* os outros cursos ativos para quem fala a mesma língua */
      outrosCursos: cursosDa(c.audiencia).filter(function (k) { return k !== curso; }),
      linguaDoCurso: function (k) { return CURSOS[k] ? CURSOS[k].lingua : null; },
      nomeDoCurso: function (k) { return nomeDoCurso(k, c.audiencia); },
      progressoSalvo: salvo || null,
      trocarCurso: async function (novo) {
        await gravarCurso(sb, uid, perfil, novo);
        location.reload();
      },
      /* A pessoa trocou a língua nas configurações. Se é a do curso, só
         grava. Se não é, oferece os cursos dela: devolve o curso escolhido
         (o app sincroniza e chama trocarCurso), ou o próprio curso, quando a
         pessoa preferiu continuar nele — e aí a língua volta à dele. */
      mudarLingua: async function (l) {
        await escolherLingua(l);
        if (l === c.audiencia) return curso;
        return escolherCurso(l, curso);
      }
    });
  }

  async function principal() {
    if (!TaioeSessao.temSessaoSalva()) { TaioeSessao.irParaEntrar(); return; }
    var sb = TaioeSessao.cliente();
    var lida = await sb.auth.getSession();
    var sessao = lida.data && lida.data.session;
    // offline com o token vencido o supabase-js não renova, mas a sessão guardada continua
    // valendo para estudar: as respostas sobem quando a conexão voltar
    if (!sessao && (lida.error || navigator.onLine === false)) {
      var guardada = lerLocal('taioe-auth');
      if (guardada && guardada.user) sessao = guardada;
    }
    if (!sessao) { TaioeSessao.irParaEntrar(); return; }
    var uid = sessao.user.id, chavePerfil = 'cards:perfil:' + uid;

    // o perfil vem do servidor; offline, da última vez que veio
    var perfil = null;
    var r = await sb.schema('conta').from('perfis').select('nome, curso_atual, lingua_interface').maybeSingle();
    if (!r.error && !r.data) { TaioeSessao.irParaEntrar(); return; }    // cadastro incompleto
    if (!r.error) {
      perfil = r.data;
      var antes = lerLocal(chavePerfil);
      // curso escolhido offline, que ainda não subiu
      if (!perfil.curso_atual && antes && antes.curso_atual) perfil.curso_atual = antes.curso_atual;
      guardarLocal(chavePerfil, perfil);
    } else {
      perfil = lerLocal(chavePerfil);
    }
    if (!perfil) {
      porta('porta.semConexao', true);
      return;
    }
    conta = { sb: sb, uid: uid, perfil: perfil };

    /* a língua do perfil vale mais que a do aparelho */
    var doPerfil = perfil.lingua_interface;
    if (I.LINGUAS.indexOf(doPerfil) >= 0 && doPerfil !== I.guardada()) I.definir(doPerfil);

    TaioeSessao.aoSair(function () { location.replace('/'); });

    var curso = perfil.curso_atual;
    if (!ativo(curso) || CURSOS[curso].audiencia !== I.lingua()) {
      var escolhido = await escolherCurso(I.lingua(), ativo(curso) ? curso : null);
      if (escolhido !== curso) { curso = escolhido; await gravarCurso(sb, uid, perfil, curso); }
    }

    if (!navigator.locks) { await abrir(sb, sessao, perfil, curso); return; }
    navigator.locks.request('cards:estudo:' + uid + ':' + curso, { ifAvailable: true }, function (trava) {
      if (!trava) {
        porta('porta.outraAba', true);
        return null;
      }
      // a trava fica com esta aba enquanto ela viver
      return new Promise(function () {
        abrir(sb, sessao, perfil, curso).catch(function (e) {
          console.error(e);
          porta('porta.erroCurso', true);
        });
      });
    });
  }

  principal().catch(function (e) {
    console.error(e);
    porta('porta.erroCards', true);
  });
})();
