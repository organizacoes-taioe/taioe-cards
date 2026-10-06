/* Esboço da etapa 3 (PdC 2): login obrigatório, decidido pela sessão guardada; «Sair» aqui
   tira todas as abas de todos os apps. Sai na etapa 5, quando o app de verdade entrar. */
(function () {
  'use strict';
  if (!TaioeSessao.temSessaoSalva()) { TaioeSessao.irParaEntrar(); return; }
  TaioeSessao.aoSair(function () { location.replace('/'); });
  var quem = document.getElementById('quem');
  TaioeSessao.cliente().auth.getSession().then(async function (r) {
    var s = r.data && r.data.session;
    if (!s) { quem.textContent = 'Sessão guardada, mas sem rede para conferir. O app estudaria offline.'; return; }
    var p = await TaioeSessao.cliente().schema('conta').from('perfis').select('nome').maybeSingle();
    if (!p.data) { location.replace('/entrar/cadastro/'); return; }
    quem.textContent = 'Conectado como ' + p.data.nome + ' (' + s.user.email + ').';
    TaioeSessao.cliente().schema('conta').rpc('registrar_acesso', { app: 'cards' });
  });
  document.getElementById('sair').addEventListener('click', function () { TaioeSessao.sair(false); });
})();
