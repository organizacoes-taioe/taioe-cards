/* inicio.js — a porta dos Cards. Sem sessão, vai ao /entrar/; sem cadastro, também (o hub leva
   ao cadastro e volta para cá). Sem curso escolhido, mostra a escolha. Depois carrega o baralho
   do curso e o progresso guardado neste aparelho, e entrega tudo ao app (TaioeCardsApp).
   Uma aba estuda por vez: duas abas no mesmo curso brigariam pela mesma fila (Web Locks). */
(function () {
  'use strict';
  var CURSOS = {
    'es-pt': { lingua: 'es', nome: 'Espanhol', bandeira: '🇪🇸' },
    'en-pt': { lingua: 'en', nome: 'Inglês', bandeira: '🇺🇸' }
  };

  function $(id) { return document.getElementById(id); }
  function lerLocal(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function porta(texto, erro) {
    $('porta-texto').textContent = texto;
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

  function escolherCurso() {
    return new Promise(function (ok) {
      $('tela-porta').classList.add('oculto');
      $('tela-escolha').classList.remove('oculto');
      Array.prototype.forEach.call(document.querySelectorAll('[data-curso]'), function (b) {
        b.addEventListener('click', function () {
          $('tela-escolha').classList.add('oculto');
          ok(b.getAttribute('data-curso'));
        });
      });
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
    porta('Abrindo o curso de ' + c.nome.toLowerCase() + '…');
    await carregar('data/cards-' + c.lingua + '.js');
    if (c.lingua === 'es') await carregar('data/textos-es.js').catch(function () {});
    var salvo = await TaioeArmazem.ler('progresso', uid + ':' + curso);
    $('tela-porta').classList.add('oculto');
    window.TaioeCardsApp({
      sb: sb, uid: uid, email: sessao.user.email, nome: perfil.nome,
      curso: curso, lingua: c.lingua, nomeCurso: c.nome, bandeira: c.bandeira,
      outroCurso: curso === 'es-pt' ? 'en-pt' : 'es-pt',
      nomeDoCurso: function (k) { return CURSOS[k] ? CURSOS[k].nome : k; },
      progressoSalvo: salvo || null,
      trocarCurso: async function (novo) {
        await gravarCurso(sb, uid, perfil, novo);
        location.reload();
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
    var r = await sb.schema('conta').from('perfis').select('nome, curso_atual').maybeSingle();
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
      porta('Sem conexão para abrir sua conta pela primeira vez neste aparelho. Tente de novo quando estiver online.', true);
      return;
    }

    TaioeSessao.aoSair(function () { location.replace('/'); });

    var curso = perfil.curso_atual;
    if (!CURSOS[curso]) {
      curso = await escolherCurso();
      await gravarCurso(sb, uid, perfil, curso);
    }

    if (!navigator.locks) { await abrir(sb, sessao, perfil, curso); return; }
    navigator.locks.request('cards:estudo:' + uid + ':' + curso, { ifAvailable: true }, function (trava) {
      if (!trava) {
        porta('Os Cards estão abertos em outra aba ou janela. Feche a outra para estudar aqui, e recarregue esta página.', true);
        return null;
      }
      // a trava fica com esta aba enquanto ela viver
      return new Promise(function () {
        abrir(sb, sessao, perfil, curso).catch(function (e) {
          console.error(e);
          porta('Não consegui abrir o curso. Confira a conexão e recarregue a página.', true);
        });
      });
    });
  }

  principal().catch(function (e) {
    console.error(e);
    porta('Não consegui abrir os Cards. Confira a conexão e recarregue a página.', true);
  });
})();
