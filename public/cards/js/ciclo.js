/* ciclo.js — todas as línguas num fluxo só (pedido do Gere, 23/11/2026).

   Cada língua tem a quantidade de cards dela no ciclo (de 0 a 99), e o ciclo é a soma
   (pedido de 24/11: antes era uma rodada fixa de 25 dividida em percentuais). Uma língua por
   vez, na ordem dos cursos, e o ciclo recomeça. Em 0 a língua fica pausada; a que nunca entrou
   fica em 0 até a pessoa ligá-la. A página mostra as línguas da maior quantidade para a menor.

   Só contas, sem tela nem rede: o app guarda o resultado, e fonte/testar-ciclo.js confere.
     proporção: { cotas: { curso: cards por ciclo }, antes: { curso: o que tinha antes da pausa } }
     posição:   { curso, feitos } */
(function (raiz) {
  'use strict';
  var MAX = 99;
  var INICIO = 25;   // só na primeira vez: as línguas já começadas dividem 25 por igual

  function cotaDe(p, k) { return ((p && p.cotas) || {})[k] || 0; }

  function ativos(p, ordem) {
    return ordem.filter(function (k) { return cotaDe(p, k) > 0; });
  }
  function total(p, ordem) {
    return ordem.reduce(function (s, k) { return s + cotaDe(p, k); }, 0);
  }

  /* a primeira proporção de quem ainda não tem nenhuma */
  function inicial(cursos) {
    var cotas = {};
    if (cursos.length) {
      var cada = Math.ceil(INICIO / cursos.length);
      cursos.forEach(function (k) { cotas[k] = cada; });
    }
    return { cotas: cotas, antes: {} };
  }

  function inteiro(n) {
    return Number.isInteger(n) && n > 0 ? Math.min(n, MAX) : 0;
  }

  /* o que veio guardado (também o formato de 23/11, com «igual»), conferido contra os cursos
     que existem; sem nada ligado, null */
  function limpar(p, ordem) {
    if (!p || typeof p.cotas !== 'object' || !p.cotas) return null;
    var cotas = {}, antes = {};
    var velho = (typeof p.antes === 'object' && p.antes) || {};
    ordem.forEach(function (k) {
      var n = inteiro(p.cotas[k]);
      if (n) cotas[k] = n;
      else if (inteiro(velho[k])) antes[k] = inteiro(velho[k]);
    });
    if (!ativos({ cotas: cotas }, ordem).length) return null;
    return { cotas: cotas, antes: antes };
  }

  /* a quantidade desta língua; em 0 ela pausa e guarda o que tinha. A última ligada não zera */
  function definir(p, ordem, curso, n) {
    if (ordem.indexOf(curso) < 0) return p;
    n = Math.max(0, Math.min(MAX, Math.round(Number(n)) || 0));
    var atual = cotaDe(p, curso);
    if (n === atual) return p;
    if (!n && ativos(p, ordem).length === 1) return p;
    var cotas = Object.assign({}, p.cotas), antes = Object.assign({}, p.antes);
    if (n) { cotas[curso] = n; delete antes[curso]; }
    else { delete cotas[curso]; antes[curso] = atual; }
    return { cotas: cotas, antes: antes };
  }
  function ajustar(p, ordem, curso, delta) {
    return definir(p, ordem, curso, cotaDe(p, curso) + (delta > 0 ? 1 : -1));
  }
  function pausar(p, ordem, curso) { return definir(p, ordem, curso, 0); }
  /* volta com o que tinha antes da pausa; a que nunca entrou volta com 1 */
  function retomar(p, ordem, curso) {
    return definir(p, ordem, curso, (p.antes && p.antes[curso]) || 1);
  }

  /* para a página: da maior quantidade para a menor; no empate, a ordem dos cursos */
  function ordenada(p, ordem) {
    return ordem.slice().sort(function (a, b) {
      return cotaDe(p, b) - cotaDe(p, a) || ordem.indexOf(a) - ordem.indexOf(b);
    });
  }

  function percentual(p, ordem, curso) {
    var t = total(p, ordem);
    return t ? Math.round(100 * cotaDe(p, curso) / t) : 0;
  }

  function seguinte(lig, curso, ordem) {
    var i = ordem.indexOf(curso);
    for (var n = 1; n <= ordem.length; n++) {
      var k = ordem[(i + n + ordem.length) % ordem.length];
      if (lig.indexOf(k) >= 0) return k;
    }
    return lig[0];
  }

  /* onde o ciclo está: bloco terminado ou língua pausada passam à próxima ligada */
  function resolver(p, ordem, pos) {
    var lig = ativos(p, ordem);
    if (!lig.length) return null;
    if (!pos || ordem.indexOf(pos.curso) < 0) return { curso: lig[0], feitos: 0 };
    if (lig.indexOf(pos.curso) < 0) return { curso: seguinte(lig, pos.curso, ordem), feitos: 0 };
    var feitos = Number.isInteger(pos.feitos) && pos.feitos > 0 ? pos.feitos : 0;
    if (feitos >= p.cotas[pos.curso]) return { curso: seguinte(lig, pos.curso, ordem), feitos: 0 };
    return { curso: pos.curso, feitos: feitos };
  }

  /* uma resposta dada nesta língua. Fora do bloco da vez (não deveria acontecer), não conta */
  function contar(p, ordem, pos, curso) {
    var r = resolver(p, ordem, pos);
    if (!r || r.curso !== curso) return r;
    return resolver(p, ordem, { curso: r.curso, feitos: r.feitos + 1 });
  }

  /* pula o bloco desta língua (ela não tem card nenhum para dar agora) */
  function pular(p, ordem, curso) {
    var lig = ativos(p, ordem);
    return lig.length ? { curso: seguinte(lig, curso, ordem), feitos: 0 } : null;
  }

  /* entre dois aparelhos, cada metade vale pela data dela */
  function maisNovo(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return String(b.em || '') > String(a.em || '') ? b : a;
  }
  function mesclar(a, b) {
    a = a || {}; b = b || {};
    return { proporcao: maisNovo(a.proporcao, b.proporcao), posicao: maisNovo(a.posicao, b.posicao) };
  }

  var api = {
    MAX: MAX, ativos: ativos, total: total, inicial: inicial, limpar: limpar, definir: definir,
    ajustar: ajustar, pausar: pausar, retomar: retomar, ordenada: ordenada, percentual: percentual,
    resolver: resolver, contar: contar, pular: pular, mesclar: mesclar
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.TaioeCiclo = api;
})(typeof window !== 'undefined' ? window : this);
