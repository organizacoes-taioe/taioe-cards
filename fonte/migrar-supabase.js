#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────────
   fonte/migrar-supabase.js — a importação, uma vez só, do histórico do
   Gere (o repositório de dados do app antigo) para a conta dele na Taioé.
   Anexo do banco, §3.3 a §3.5.

   Uso, no terminal do próprio Gere (o SQL sai com o histórico de estudo
   dele: fica FORA de qualquer repositório, e quem roda o psql é ele, com a
   connection string que só ele tem):

     cd espanhol/dados && git pull
     node fonte/migrar-supabase.js <pasta dos dados> <email da conta> [--substituir] > %TEMP%\migracao.sql
     psql "<Session pooler da produção>" -v ON_ERROR_STOP=1 -f %TEMP%\migracao.sql

   O SQL roda numa transação só. Ele recusa se o email não tiver conta com
   cadastro feito, se faltar o catálogo es-pt e se a conta já tiver estudo
   no curso es-pt — a menos que venha --substituir, que apaga antes o que a
   conta tiver nesse curso (estado, relógio, diário, respostas e extras).

   Só Node nativo. O id de cada resposta é derivado do horário e do card:
   rodar duas vezes não duplica nada.
   ──────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const substituir = args.includes('--substituir');
const [pastaDados, email] = args.filter(a => a !== '--substituir');
if (!pastaDados || !email || !/^[^@\s']+@[^@\s']+$/.test(email)) {
  console.error('uso: node fonte/migrar-supabase.js <pasta dos dados> <email da conta> [--substituir] > migracao.sql');
  process.exit(1);
}

const ler = f => JSON.parse(fs.readFileSync(path.join(pastaDados, f), 'utf8'));
const p = ler('progresso.json');

const uuidDe = chave => {                 // determinístico (v5 sobre sha1)
  const h = crypto.createHash('sha1').update('taioe:' + chave).digest();
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
};
const etapa = e => (e === 'consolidado' ? 'inversa-multipla' : e);
const ETAPAS = new Set(['multipla', 'escrita', 'inversa-multipla', 'inversa-escrita', 'dominado']);
const entre = (v, a, b) => (Number.isFinite(v) && v >= a && v <= b ? v : null);
/* a mesma régua de velocidadeDe, no app */
const velocidadeDe = (modo, ms) => {
  const [rapido, medio] = modo === 'multipla' ? [4000, 10000] : [8000, 20000];
  return ms < rapido ? 'rapido' : ms < medio ? 'medio' : 'lento';
};

/* (a) estado de cada card, com as correções que conciliarFila faria */
const estados = Object.entries(p.cards).map(([id, e]) => {
  const et = etapa(e.etapa), dom = et === 'dominado';
  if (!ETAPAS.has(et)) throw new Error('etapa desconhecida em ' + id + ': ' + e.etapa);
  const pm = e.porModo || { multipla: { n: 0, certas: 0 }, escrita: { n: 0, certas: 0 } };
  return {
    card: id, etapa: et, vistas: Math.max(1, e.vistas || 0), acertos: e.acertos || 0, erros: e.erros || 0,
    seguidas: e.seguidas || 0, erros_seguidos: e.errosSeguidos || 0, revisoes: Math.min(5, e.revisoes || 0),
    multipla_n: pm.multipla.n, multipla_certas: pm.multipla.certas,
    escrita_n: pm.escrita.n, escrita_certas: pm.escrita.certas,
    ultima: e.ultima, volta_em: dom ? e.voltaEm || null : null,
    dominado_em: e.dominadoEm || (dom ? e.ultima : null),
    primeira_certa: e.primeiraCerta === undefined ? null : !!e.primeiraCerta,
    estreia: e.estreia || null,
    ate_dominar: e.ateDominar === undefined ? null : e.ateDominar,
    conhecia: ['sim', 'nao', 'mais_ou_menos'].includes(e.conhecia) ? e.conhecia : null,
    na_fila_desde: !dom && e.naFila ? e.naFila.desde : null,
    na_fila_distancia: !dom && e.naFila ? Math.min(1000, Math.max(1, e.naFila.distancia)) : null,
    estreou_na: e.estreouNa === undefined ? null : e.estreouNa
  };
});

/* (b) o relógio TEM de ser o totais.respostas do mesmo arquivo: os naFila.desde estão nessa numeração */
const ret = Array.isArray(p.retencao) && p.retencao.length === 6 ? p.retencao : Array.from({ length: 6 }, () => [0, 0]);
const contadores = {
  respostas: p.totais.respostas, acertos: p.totais.acertos,
  retencao_n: ret.map(g => g[0]), retencao_ok: ret.map(g => g[1])
};

/* (c) diário; o retrato de cada dia é o último ponto da série até o fim daquele dia */
const vetor = (obj, n) => Array.from({ length: n }, (_, i) => (obj && obj[i]) || 0);
const serie = (p.serie || []).filter(s => Array.isArray(s) && s.length === 9);
let acumulado = 0;
const diario = Object.keys(p.diario || {}).sort().map(dia => {
  const g = p.diario[dia];
  acumulado += g.n;
  const pt = serie.filter(s => s[0] <= acumulado).pop() || null;
  return { dia, n: g.n, ok: Math.min(g.ok, g.n), horas: vetor(g.h, 24), tempos_multipla: vetor(g.m, 36),
           tempos_escrita: vetor(g.e, 36), retrato: pt };
});

/* (d) as respostas brutas dos logs de sessão (melhor esforço: os logs perderam parte delas).
   A mais velha que a partição mais antiga do banco (3 meses antes do mês corrente) fica de fora. */
const hoje = new Date();
const corte = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 3, 1)).toISOString();
const eventos = fs.readdirSync(path.join(pastaDados, 'sessoes')).filter(f => f.endsWith('.json')).sort()
  .flatMap(f => ler(path.join('sessoes', f)).eventos || [])
  .filter(ev => ev && ev.em && ev.card)
  .sort((a, b) => (a.em < b.em ? -1 : a.em > b.em ? 1 : 0));
const vistos = new Set(), ultimaEtapa = {}, respostas = [];
let foraDoCorte = 0;
for (const ev of eventos) {
  const chave = ev.em + '|' + ev.card;
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  const volta = ev.direcao === 'pt-es';
  const modo = ev.modo === 'escrita' ? 'escrita' : 'multipla';
  let antes = ultimaEtapa[ev.card];      // a etapa_depois da resposta anterior do mesmo card
  if (!antes) antes = modo === 'multipla' ? (volta ? 'inversa-multipla' : 'multipla') : (volta ? 'inversa-escrita' : 'escrita');
  const depois = etapa(ev.etapa_depois);
  if (ETAPAS.has(depois)) ultimaEtapa[ev.card] = depois;
  if (ev.em < corte) { foraDoCorte++; continue; }
  if (!ETAPAS.has(depois)) continue;
  const ms = Math.min(Math.max(Math.round(ev.ms || 0), 0), 3600000);
  const limpo = ev.acertou && !ev.quase;
  respostas.push({
    id: uuidDe('resposta:' + chave), em: ev.em, card: ev.card, versao: '00000000',
    etapa_antes: etapa(antes), etapa_depois: depois,
    velocidade: ['rapido', 'medio', 'lento'].includes(ev.velocidade) ? ev.velocidade : velocidadeDe(modo, ms),
    ms, distancia: entre(ev.distancia_fila, 1, 1000), fuso: -180,
    acertou: !!ev.acertou, quase: !!ev.quase, julgado: !!ev.quase && !!ev.julgado_por_voce,
    desistiu: !!ev.desistiu, pausado: !!ev.pausado,
    resposta: limpo ? null : (String(ev.resposta || '').slice(0, 120) || null),
    dinamicos: Array.isArray(ev.dinamicos) && ev.dinamicos.length ? ev.dinamicos.slice(0, 4).map(String) : null
  });
}

/* (e) comentários e contestações, com triagem «aberto» (o Gere decide o que já foi resolvido) */
const casos = f => { try { return ler(f).casos || []; } catch (e) { return []; } };
const comentarios = casos('comentarios.json').filter(c => c.card && c.texto).map(c => ({
  id: uuidDe('comentario:' + c.em + '|' + c.card), card: c.card,
  texto: String(c.texto).slice(0, 500), em: c.em
}));
const contestacoes = casos('contestacoes.json').filter(c => c.card && String(c.resposta || '').trim()).map(c => ({
  id: uuidDe('contestacao:' + c.em + '|' + c.card), card: c.card,
  etapa: c.direcao === 'pt-es' ? 'inversa-escrita' : 'escrita',
  resposta: String(c.resposta).slice(0, 120), esperado: String(c.esperado || '').slice(0, 300) || null, em: c.em
}));

/* (f) os extras: arquivados, textos lidos e em vista, frases em vista */
const extras = {
  arquivados: p.arquivados && typeof p.arquivados === 'object' ? p.arquivados : {},
  lidos: (p.textos && p.textos.lidos) || {},
  textos_em_vista: (p.textos && p.textos.emVista) || {},
  em_vista: Array.isArray(p.emVista) ? p.emVista : []
};

/* ── o SQL ── */
const json = v => {
  const t = JSON.stringify(v);
  if (t.includes('$j$')) throw new Error('um texto contém $j$; ajuste o script antes de gerar o SQL');
  return '$j$' + t + '$j$::jsonb';
};
const q = t => "'" + String(t).replace(/'/g, "''") + "'";
const ALVO = '(select id from pg_temp.alvo)';

const sql = `-- GERADO POR fonte/migrar-supabase.js em ${new Date().toISOString()} — NÃO VERSIONAR.
-- Contém o histórico de estudo da conta ${email}. Rodar uma vez, como postgres, pelo psql.
-- Progresso de ${p.atualizado_em}: ${estados.length} cards, ${contadores.respostas} respostas no relógio,
-- ${diario.length} dias, ${respostas.length} respostas brutas (${foraDoCorte} antes de ${corte.slice(0, 10)} ficaram de fora),
-- ${comentarios.length} comentários, ${contestacoes.length} contestações.
\\set ON_ERROR_STOP on
begin;

create temporary table alvo on commit drop as
  select u.id from auth.users u where lower(u.email) = lower(${q(email)});

do $$
begin
  if (select count(*) from pg_temp.alvo) <> 1 then
    raise exception 'nenhuma conta com o email ${email.replace(/'/g, "''")}';
  end if;
  if not exists (select 1 from conta.perfis p where p.usuario_id = ${ALVO}) then
    raise exception 'a conta existe, mas o cadastro (nome e aceite) ainda não foi feito';
  end if;
  if (select count(*) from cards.catalogo where curso = 'es-pt') = 0 then
    raise exception 'o catálogo es-pt não foi carregado (workflow Catálogo)';
  end if;
  ${substituir ? '' : `if exists (select 1 from cards.estado where usuario_id = ${ALVO} and curso = 'es-pt')
     or exists (select 1 from cards.contadores where usuario_id = ${ALVO} and curso = 'es-pt') then
    raise exception 'a conta já tem estudo no curso es-pt; para trocar pelo histórico, gere o SQL com --substituir';
  end if;`}
end $$;
${substituir ? `
-- --substituir: o que a conta tiver no curso es-pt sai antes
delete from cards.respostas  where usuario_id = ${ALVO} and curso = 'es-pt';
delete from cards.estado     where usuario_id = ${ALVO} and curso = 'es-pt';
delete from cards.contadores where usuario_id = ${ALVO} and curso = 'es-pt';
delete from cards.diario     where usuario_id = ${ALVO} and curso = 'es-pt';
delete from cards.extras     where usuario_id = ${ALVO} and curso = 'es-pt';
` : ''}
-- o bruto importado não mexe no relógio, no diário nem no teto (vêm do progresso.json),
-- e passa da janela de 30 dias do gatilho de inserção
alter table cards.respostas disable trigger respostas_apos_inserir;
alter table cards.respostas disable trigger respostas_antes_inserir;

insert into cards.estado (usuario_id, curso, card_id, etapa, vistas, acertos, erros, seguidas,
       erros_seguidos, revisoes, multipla_n, multipla_certas, escrita_n, escrita_certas,
       ultima, volta_em, dominado_em, primeira_certa, estreia, ate_dominar, conhecia,
       na_fila_desde, na_fila_distancia, estreou_na)
select ${ALVO}, 'es-pt', x.card, x.etapa::cards.etapa, x.vistas, x.acertos, x.erros, x.seguidas,
       x.erros_seguidos, x.revisoes, x.multipla_n, x.multipla_certas, x.escrita_n, x.escrita_certas,
       x.ultima, x.volta_em, x.dominado_em, x.primeira_certa, x.estreia, x.ate_dominar, x.conhecia,
       x.na_fila_desde, x.na_fila_distancia, x.estreou_na
  from jsonb_to_recordset(${json(estados)}) as x(
       card text, etapa text, vistas smallint, acertos smallint, erros smallint, seguidas smallint,
       erros_seguidos smallint, revisoes smallint, multipla_n smallint, multipla_certas smallint,
       escrita_n smallint, escrita_certas smallint, ultima timestamptz, volta_em timestamptz,
       dominado_em timestamptz, primeira_certa boolean, estreia date, ate_dominar smallint,
       conhecia text, na_fila_desde integer, na_fila_distancia smallint, estreou_na integer)
 where exists (select 1 from cards.catalogo k where k.curso = 'es-pt' and k.card_id = x.card);

insert into cards.contadores (usuario_id, curso, respostas, acertos, retencao_n, retencao_ok)
values (${ALVO}, 'es-pt', ${contadores.respostas}, ${contadores.acertos},
        '{${contadores.retencao_n.join(',')}}', '{${contadores.retencao_ok.join(',')}}');

insert into cards.diario (usuario_id, curso, dia, n, ok, horas, tempos_multipla, tempos_escrita, retrato)
select ${ALVO}, 'es-pt', x.dia, x.n, x.ok, x.horas, x.tempos_multipla, x.tempos_escrita, x.retrato
  from jsonb_to_recordset(${json(diario)}) as x(
       dia date, n smallint, ok smallint, horas smallint[], tempos_multipla smallint[],
       tempos_escrita smallint[], retrato integer[]);

insert into cards.respostas (usuario_id, respondido_em, id, curso, card_id, versao, etapa_antes,
       etapa_depois, velocidade, ms, distancia, fuso_min, acertou, quase, julgado, desistiu,
       pausado, resposta, dinamicos)
select ${ALVO}, x.em, x.id, 'es-pt', x.card, x.versao, x.etapa_antes::cards.etapa,
       x.etapa_depois::cards.etapa, x.velocidade::cards.velocidade, x.ms, x.distancia, x.fuso,
       x.acertou, x.quase, x.julgado, x.desistiu, x.pausado, x.resposta, x.dinamicos
  from jsonb_to_recordset(${json(respostas)}) as x(
       id uuid, em timestamptz, card text, versao text, etapa_antes text, etapa_depois text,
       velocidade text, ms integer, distancia smallint, fuso smallint, acertou boolean,
       quase boolean, julgado boolean, desistiu boolean, pausado boolean, resposta text,
       dinamicos text[])
on conflict do nothing;

alter table cards.respostas enable trigger respostas_antes_inserir;
alter table cards.respostas enable trigger respostas_apos_inserir;

insert into cards.extras (usuario_id, curso, arquivados, lidos, textos_em_vista, em_vista)
values (${ALVO}, 'es-pt', ${json(extras.arquivados)}, ${json(extras.lidos)},
        ${json(extras.textos_em_vista)}, ${json(extras.em_vista)});

-- o gatilho de limite (100 por dia) conta pelo recebido_em: se passar, ele avisa e nada entra
insert into cards.comentarios (id, usuario_id, curso, card_id, versao, texto, feito_em)
select x.id, ${ALVO}, 'es-pt', x.card, '00000000', x.texto, x.em
  from jsonb_to_recordset(${json(comentarios)}) as x(id uuid, card text, texto text, em timestamptz)
on conflict (id) do nothing;

insert into cards.contestacoes (id, usuario_id, curso, card_id, versao, etapa, resposta, esperado, feito_em)
select x.id, ${ALVO}, 'es-pt', x.card, '00000000', x.etapa::cards.etapa, x.resposta, x.esperado, x.em
  from jsonb_to_recordset(${json(contestacoes)}) as x(id uuid, card text, etapa text, resposta text, esperado text, em timestamptz)
on conflict (id) do nothing;

-- conferência (§3.5): tem de bater com o progresso.json
select 'estado' as o_que, count(*)::text as total from cards.estado where usuario_id = ${ALVO} and curso = 'es-pt'
union all select 'relógio', respostas || ' respostas, ' || acertos || ' certas' from cards.contadores where usuario_id = ${ALVO} and curso = 'es-pt'
union all select 'diário', count(*) || ' dias, ' || sum(n) || ' respostas' from cards.diario where usuario_id = ${ALVO} and curso = 'es-pt'
union all select 'respostas brutas', count(*)::text from cards.respostas where usuario_id = ${ALVO} and curso = 'es-pt'
union all select 'fora de fila (tem de ser 0)', count(*)::text from cards.estado
           where usuario_id = ${ALVO} and curso = 'es-pt' and etapa <> 'dominado' and na_fila_desde is null;

commit;
`;

process.stdout.write(sql);
console.error('  ' + estados.length + ' cards, relógio ' + contadores.respostas + ', ' + diario.length + ' dias, ' +
  respostas.length + ' respostas brutas (' + foraDoCorte + ' antes de ' + corte.slice(0, 10) + ' fora), ' +
  comentarios.length + ' comentários, ' + contestacoes.length + ' contestações' + (substituir ? ' — com --substituir' : ''));
