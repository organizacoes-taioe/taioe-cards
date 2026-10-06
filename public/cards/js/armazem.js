/* armazem.js — o IndexedDB «cards:dados» (anexo do banco, §2.1): o progresso e a fila de
   envio, cada um por usuário e curso («<uid>:<curso>»), para não misturar contas no mesmo
   navegador. O localStorage não serve: a cota de uns 5 MB é da origem inteira, e o progresso
   de quem estuda há meses passa de meio megabyte.

   Sem IndexedDB (alguns modos privados), tudo fica só na memória da página: o estudo funciona,
   e o que não subir até fechar a aba se perde. TaioeArmazem.persistente diz qual dos dois. */
(function () {
  'use strict';
  var NOME = 'cards:dados', VERSAO = 1, LOJAS = ['progresso', 'fila'];
  var base = null, memoria = { progresso: {}, fila: {} };

  function abrir() {
    if (base) return base;
    base = new Promise(function (ok) {
      var r;
      try { r = indexedDB.open(NOME, VERSAO); } catch (e) { ok(null); return; }
      r.onupgradeneeded = function () {
        LOJAS.forEach(function (l) { if (!r.result.objectStoreNames.contains(l)) r.result.createObjectStore(l); });
      };
      r.onsuccess = function () {
        var db = r.result;
        // «apagar os dados deste aparelho», no hub, apaga a base: esta aba solta a dela
        db.onversionchange = function () { db.close(); base = null; };
        ok(db);
      };
      r.onerror = function () { ok(null); };
      r.onblocked = function () { ok(null); };
    });
    return base;
  }

  function pedido(loja, modo, fazer) {
    return abrir().then(function (db) {
      if (!db) return fazer(null);
      return new Promise(function (ok, falha) {
        var tx = db.transaction(loja, modo), resultado;
        var req = fazer(tx.objectStore(loja));
        if (req) req.onsuccess = function () { resultado = req.result; };
        tx.oncomplete = function () { ok(resultado); };
        tx.onerror = tx.onabort = function () { falha(tx.error); };
      });
    });
  }

  function ler(loja, chave) {
    return pedido(loja, 'readonly', function (s) {
      if (!s) return memoria[loja][chave];
      return s.get(chave);
    }).catch(function () { return memoria[loja][chave]; });
  }

  function gravar(loja, chave, valor) {
    memoria[loja][chave] = valor;
    return pedido(loja, 'readwrite', function (s) { return s ? s.put(valor, chave) : null; })
      .catch(function (e) { console.warn('não consegui gravar no IndexedDB', e); });
  }

  function apagar(loja, chave) {
    delete memoria[loja][chave];
    return pedido(loja, 'readwrite', function (s) { return s ? s.delete(chave) : null; })
      .catch(function () {});
  }

  window.TaioeArmazem = {
    ler: ler, gravar: gravar, apagar: apagar,
    persistente: function () { return abrir().then(function (db) { return !!db; }); }
  };
})();
