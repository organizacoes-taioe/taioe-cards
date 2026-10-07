/* i18n.js — a língua da interface: 'pt', 'es' ou 'en'. O mesmo desenho do hub
   (os dois repositórios são servidos na mesma origem e dividem a escolha):

     1. localStorage 'taioe:lingua', se a pessoa já escolheu;
     2. senão, a primeira de navigator.languages que comece por pt, es ou en;
     3. senão, 'pt'.

   window.TaioeI18n = { lingua(), definir(l), t(chave, vars), aplicar(raiz) }:
   t() interpola «{nome}»; aplicar() troca o texto de [data-i18n] (textContent),
   [data-i18n-html] (innerHTML, só com HTML do próprio dicionário) e os
   atributos de [data-i18n-attr="placeholder:chave;title:chave2"].

   Nos Cards a interface é a língua de quem estuda no curso aberto, que pode
   não ser a escolhida (quem escolheu inglês e ainda está no curso de
   espanhol para quem fala português). Para isso existem dois extras: usar(l)
   muda a língua desta página sem gravar a escolha, e tEm(l, chave, vars)
   traduz numa língua dada. Os dicionários moram em textos-i18n.js
   (window.TAIOE_TEXTOS), carregado antes deste. */
(function () {
  'use strict';
  var LINGUAS = ['pt', 'es', 'en'];
  var CHAVE = 'taioe:lingua';
  var LANG_HTML = { pt: 'pt-BR', es: 'es', en: 'en' };
  var LOCAL = { pt: 'pt-BR', es: 'es', en: 'en' };
  var h = location.hostname;
  var DEV = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.(localhost|test)$/.test(h);

  function valida(l) { return LINGUAS.indexOf(l) >= 0 ? l : null; }
  function lerGuardada() { try { return valida(localStorage.getItem(CHAVE)); } catch (e) { return null; } }
  function doNavegador() {
    var lista = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < lista.length; i++) {
      var l = valida(String(lista[i] || '').slice(0, 2).toLowerCase());
      if (l) return l;
    }
    return null;
  }
  function preferida() { return lerGuardada() || doNavegador() || 'pt'; }

  var atual = preferida();

  function dicionario(l) { return ((window.TAIOE_TEXTOS || {})[l]) || {}; }

  function tEm(l, chave, vars) {
    l = valida(l) || 'pt';
    var s = dicionario(l)[chave];
    if (s == null) {
      if (DEV && l !== 'pt') console.warn('[i18n] falta «' + chave + '» em ' + l);
      s = dicionario('pt')[chave];
    }
    if (s == null) {
      if (DEV) console.warn('[i18n] chave desconhecida: «' + chave + '»');
      return chave;
    }
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
    });
  }

  function t(chave, vars) { return tEm(atual, chave, vars); }

  function cada(raiz, seletor, fn) {
    raiz = raiz || document;
    if (raiz.matches && raiz.matches(seletor)) fn(raiz);
    Array.prototype.forEach.call(raiz.querySelectorAll(seletor), fn);
  }

  function aplicar(raiz) {
    raiz = raiz || document;
    cada(raiz, '[data-i18n]', function (e) { e.textContent = t(e.getAttribute('data-i18n')); });
    cada(raiz, '[data-i18n-html]', function (e) { e.innerHTML = t(e.getAttribute('data-i18n-html')); });
    cada(raiz, '[data-i18n-attr]', function (e) {
      e.getAttribute('data-i18n-attr').split(';').forEach(function (par) {
        var i = par.indexOf(':');
        if (i < 1) return;
        e.setAttribute(par.slice(0, i).trim(), t(par.slice(i + 1).trim()));
      });
    });
  }

  function marcarHtml() { document.documentElement.lang = LANG_HTML[atual]; }

  /* Muda a língua da página, sem gravar a escolha. */
  function usar(l) {
    l = valida(l);
    if (!l) return atual;
    atual = l;
    marcarHtml();
    aplicar(document);
    return atual;
  }

  /* A escolha da pessoa: grava e aplica. O perfil da conta é com quem chama
     (inicio.js), que tem a sessão. */
  function guardar(l) {
    l = valida(l);
    if (!l) return null;
    try { localStorage.setItem(CHAVE, l); } catch (e) {}
    return l;
  }
  function definir(l) {
    l = guardar(l);
    if (!l) return atual;
    return usar(l);
  }

  /* ── o lugar de uma forma regional ──
     Os cards guardam o lugar em português, com a preposição, para caber na
     frase do aviso: «na América Latina», «no México e na Colômbia», «em boa
     parte da América do Sul», «no México e em outros países da América
     Latina» (o build exige /^(na|no|nas|nos|em) /). Nas outras línguas a
     frase se refaz: cada pedaço perde a preposição, o nome sai da tabela
     «lugar.<nome>» do dicionário, e a lista se junta com a vírgula e o «e»
     da língua, com uma preposição só: «en México y Colombia», «in Mexico and
     Colombia». Nome que a tabela não conhece devolve o texto original. */
  function lugar(texto, l) {
    l = valida(l) || atual;
    var s = String(texto == null ? '' : texto).trim();
    if (l === 'pt' || !s) return s;
    var d = dicionario(l);
    var nomes = [];
    var partes = s.split(/, | e /);
    for (var i = 0; i < partes.length; i++) {
      var resto = partes[i].replace(/^(na|no|nas|nos|em)\s+/, '');
      var molde = null, m;
      if ((m = /^boa parte d[aoe]s? (.+)$/.exec(resto))) { molde = 'lugar.boaParte'; resto = m[1]; }
      else if ((m = /^outros países d[aoe]s? (.+)$/.exec(resto))) { molde = 'lugar.outrosPaises'; resto = m[1]; }
      var nome = d['lugar.' + resto];
      if (nome == null || (molde && d[molde] == null)) {
        if (DEV) console.warn('[i18n] lugar sem tradução em ' + l + ': «' + s + '»');
        return s;
      }
      nomes.push(molde ? d[molde].replace('{x}', nome) : nome);
    }
    var junto = nomes.length < 2 ? nomes[0]
      : nomes.slice(0, -1).join(', ') + (d['lista.e'] || ', ') + nomes[nomes.length - 1];
    return (d['lugar.em'] || '') + ' ' + junto;
  }

  window.TaioeI18n = {
    lugar: lugar,
    lingua: function () { return atual; },
    definir: definir,
    t: t,
    aplicar: aplicar,
    /* extras dos Cards */
    usar: usar,
    guardar: guardar,
    preferida: preferida,
    guardada: lerGuardada,
    tEm: tEm,
    local: function (l) { return LOCAL[valida(l) || atual]; },
    LINGUAS: LINGUAS.slice()
  };

  marcarHtml();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { aplicar(document); });
  else aplicar(document);
})();
