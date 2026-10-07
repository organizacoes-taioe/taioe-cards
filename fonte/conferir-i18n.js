#!/usr/bin/env node
/* conferir-i18n.js — confere a tradução da interface dos Cards (07/10/2026).

     node fonte/conferir-i18n.js

   1. As três línguas de public/cards/js/textos-i18n.js têm as MESMAS chaves, e
      cada chave tem as mesmas variáveis «{x}» nas três.
   2. Toda chave usada em index.html (data-i18n, data-i18n-html,
      data-i18n-attr) e no código (t, tn, tEm, porta…) existe no dicionário.
   3. Não sobrou texto visível fora do dicionário: nenhuma string do código
      (app.js, inicio.js, sincronia.js) nem texto do index.html com cara de
      frase — duas palavras ou uma letra acentuada —, tirando comentários,
      console.* e as exceções listadas aqui embaixo.
   4. Todo lugar das formas regionais dos cards (regionais, regionaisEs,
      regionaisEn) tem tradução em es e en (TaioeI18n.lugar).

   Sai com código 1 se algo falhar. A curadoria (public/cards/curadoria/) é só
   do Gere e fica em português: não entra aqui. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const pub = path.join(raiz, 'public', 'cards');
const ler = f => fs.readFileSync(path.join(pub, f), 'utf8');
const erros = [];

/* ── o dicionário e o módulo, num navegador de mentira ── */
const janela = { location: { hostname: 'conferencia' }, navigator: { languages: ['pt-BR'] } };
janela.window = janela;
janela.document = { readyState: 'complete', documentElement: {}, querySelectorAll: () => [], addEventListener() {} };
janela.localStorage = { getItem: () => null, setItem() {} };
janela.console = console;
vm.createContext(janela);
vm.runInContext(ler('js/textos-i18n.js'), janela);
vm.runInContext(ler('js/i18n.js'), janela);
const D = janela.TAIOE_TEXTOS;
const I = janela.TaioeI18n;
const LINGUAS = ['pt', 'es', 'en'];

/* 1 ── mesmas chaves, mesmas variáveis */
const variaveis = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
const todas = new Set();
LINGUAS.forEach(l => Object.keys(D[l]).forEach(k => todas.add(k)));
for (const k of todas) {
  for (const l of LINGUAS) {
    if (!(k in D[l])) erros.push('chave «' + k + '» falta em ' + l);
    else if (typeof D[l][k] !== 'string' || !D[l][k].trim()) erros.push('chave «' + k + '» vazia em ' + l);
  }
  const v = LINGUAS.filter(l => k in D[l]).map(l => variaveis(D[l][k]));
  if (new Set(v).size > 1) erros.push('chave «' + k + '» com variáveis diferentes: ' + v.join(' | '));
}
/* nada de mesóclise no português */
Object.entries(D.pt).forEach(([k, s]) => {
  const m = s.match(/[A-Za-zÀ-ÿ]+-(lo|la|los|las|o|a|os|as|me|te|se|lhe|lhes|nos|vos|no|na)-(ei|as|á|ás|emos|eis|ão|ia|ias|íamos|íeis|iam)\b/);
  if (m) erros.push('mesóclise em «' + k + '»: ' + m[0]);
});
/* nem «vosotros», nem «coger» no espanhol */
Object.entries(D.es).forEach(([k, s]) => {
  if (/\b(vosotr[oa]s|os\s+\w+áis|coger|cog[eií]\w*)\b/i.test(s)) erros.push('espanhol de um país só em «' + k + '»: ' + s);
});

/* 2 ── as chaves usadas existem */
const usadas = new Map();      // chave → onde
const usar = (k, onde) => { if (!usadas.has(k)) usadas.set(k, onde); };
const html = ler('index.html');
for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) usar(m[1], 'index.html');
for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
  m[1].split(';').forEach(par => { const k = par.split(':')[1]; if (k) usar(k.trim(), 'index.html'); });
}
const CODIGO = ['js/app.js', 'js/inicio.js', 'js/sincronia.js'];
/* as chaves montadas na hora: o prefixo, e os sufixos que ele pode ter */
const MONTADAS = {
  'lingua.': ['es', 'en', 'pt'], 'curso.': ['es', 'en', 'pt'], 'tipo.': ['palavra', 'frase']
};
for (const f of CODIGO) {
  const src = ler(f);
  for (const m of src.matchAll(/\b(?:t|I\.t|TaioeI18n\.t|I18N\.t)\(\s*'([^']+)'/g)) usar(m[1], f);
  for (const m of src.matchAll(/\btEm\([^,]+,\s*'([^']+)'/g)) usar(m[1], f);
  for (const m of src.matchAll(/\btn\(\s*'([^']+)'/g)) { usar(m[1] + '.1', f); usar(m[1] + '.n', f); }
  for (const m of src.matchAll(/\bporta\(\s*'([^']+)'/g)) usar(m[1], f);
  /* t(cond ? 'a' : 'b'): as chaves literais dentro de um t( … ) */
  for (const m of src.matchAll(/\bt\(([^()]*\?[^()]*)\)/g)) {
    for (const q of m[1].matchAll(/'([a-zA-Z]+\.[\w.]+)'/g)) usar(q[1], f);
  }
  for (const m of src.matchAll(/'((?:lingua|curso|tipo)\.)'\s*\+/g)) MONTADAS[m[1]].forEach(s => usar(m[1] + s, f));
  /* e toda string do código que é exatamente uma chave (t(cond ? 'a' : 'b')) */
  for (const m of src.matchAll(/'([a-zA-Z]+\.[\w.]+)'/g)) if (m[1] in D.pt) usar(m[1], f);
}
for (const k of [...usadas.keys()]) if (/\.$/.test(k)) usadas.delete(k);   // o prefixo das montadas
for (const [k, onde] of usadas) {
  if (!(k in D.pt)) erros.push('chave usada e inexistente: «' + k + '» (' + onde + ')');
}
const semUso = [...todas].filter(k => !usadas.has(k) && !/^lugar\./.test(k) && k !== 'aspas' && k !== 'lista.e');
if (semUso.length) console.log('  aviso: chaves sem uso encontrado: ' + semUso.join(', '));

/* 3 ── texto visível fora do dicionário */
/* As strings literais de um arquivo JS, sem os comentários e as expressões
   regulares, com a linha de cada uma. */
function literais(src) {
  const saida = [];
  let i = 0, linha = 1, ultimo = '';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { linha++; i++; continue; }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const fim = src.indexOf('*/', i + 2);
      linha += (src.slice(i, fim).match(/\n/g) || []).length;
      i = fim + 2; continue;
    }
    if (c === '/' && (/[(,=:[!&|?{};+\-*%<>~^]/.test(ultimo) || ultimo === '' || /\breturn$/.test(src.slice(Math.max(0, i - 8), i).trim()))) {
      i++;
      let classe = false;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') classe = true;
        else if (src[i] === ']') classe = false;
        else if (src[i] === '/' && !classe) break;
        i++;
      }
      i++;
      while (/[a-z]/.test(src[i])) i++;
      ultimo = ')';
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; }
        if (src[j] === '\n') linha++;
        s += src[j]; j++;
      }
      saida.push({ s, linha, contexto: src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', j)) });
      i = j + 1; ultimo = 'a';
      continue;
    }
    if (!/\s/.test(c)) ultimo = c;
    i++;
  }
  return saida;
}

/* palavras soltas do português que já foram texto de tela */
const PALAVRA_SOLTA = /^(agora|nada|todos|todas|arquivados?|dominados?|palavras?|frases?|comentar|voltar|sair|enviar|cancelar|carregando|aguardando|aceito|resolvido|certo|errado|certas|erradas|respostas?|cards|card|dias?|semanas?|meses|min)$/i;
const CARA_DE_FRASE = s => {
  const texto = s.replace(/<[^>]*(>|$)/g, ' ').replace(/^[^<]*>/, ' ').replace(/\s[\w-]+="[^"]*("|$)/g, ' ').replace(/&\w+;/g, ' ').replace(/\{\w+\}/g, ' ');
  return /[À-ÿ]/.test(texto) || /[A-Za-zÀ-ÿ]{2,}\s+[A-Za-zÀ-ÿ]{2,}/.test(texto);
};
/* o que pode ficar: nomes próprios, o que não é texto de tela, e as linhas de console */
const PODE = [
  /^Taioé Cards( ·)?$/, /^taioe-cards-$/, /^Taioé$/,
  /^(Português|Español|English)$/,
  /^http:\/\/www\.w3\.org\/2000\/svg$/,
  /^data:image\/svg\+xml/, /^<\/svg>$/, /^'><text /
];
const CONTEXTO_LIVRE = /'use strict'|className|console\.(warn|error|log)|new Error\(|\.select\(|\.order\(|cards:estudo|cards:perfil|querySelector|matchMedia|addEventListener/;
for (const f of CODIGO) {
  for (const { s, linha, contexto } of literais(ler(f))) {
    /* a palavra solta só conta quando vai para a tela */
    const solta = PALAVRA_SOLTA.test(s.trim()) && /textContent|innerHTML|placeholder|confirm\(|statusSync|estado\(|rotulo:|nome:|setAttribute/.test(contexto);
    if (!solta && !CARA_DE_FRASE(s)) continue;
    /* comparação e chave interna não são tela: «tipo === 'palavra'», «chave: 'dominado'» */
    if (solta && (contexto.includes("=== '" + s + "'") || contexto.includes("chave: '" + s + "'"))) continue;
    if (PODE.some(r => r.test(s.trim()))) continue;
    if (CONTEXTO_LIVRE.test(contexto)) continue;
    erros.push('texto fora do dicionário em ' + f + ':' + linha + ': ' + JSON.stringify(s.slice(0, 90)));
  }
}
/* o index.html: o texto entre as marcas e os atributos de tela, sem os comentários e o <noscript> */
const corpo = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
  .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')
  .replace(/<title>[\s\S]*?<\/title>/, '');
for (const m of corpo.matchAll(/>([^<]+)</g)) {
  const s = m[1].trim();
  if (!s || !/[A-Za-zÀ-ÿ]/.test(s)) continue;
  if (PODE.some(r => r.test(s)) || s === 'Cards' || /^Taioé$/.test(s)) continue;
  erros.push('texto fixo no index.html (sem data-i18n): ' + JSON.stringify(s));
}
for (const m of corpo.matchAll(/\s(title|placeholder|aria-label|alt)="([^"]*)"/g)) {
  if (m[2] && m[2] !== 'Taioé' && CARA_DE_FRASE(m[2])) erros.push('atributo fixo no index.html: ' + m[1] + '="' + m[2] + '"');
}

/* 4 ── os lugares das formas regionais */
const lugares = new Set();
function varrer(o) {
  if (Array.isArray(o)) return o.forEach(varrer);
  if (!o || typeof o !== 'object') return;
  for (const k of Object.keys(o)) {
    if (/^regionais(Es|En)?$/.test(k) && o[k] && typeof o[k] === 'object') Object.values(o[k]).forEach(v => lugares.add(v));
    else varrer(o[k]);
  }
}
function andar(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) andar(p);
    else if (e.name.endsWith('.json')) { try { varrer(JSON.parse(fs.readFileSync(p, 'utf8'))); } catch (x) {} }
  }
}
andar(path.join(raiz, 'data'));
andar(path.join(raiz, 'fonte', 'cards'));
for (const lugar of lugares) {
  for (const l of ['es', 'en']) {
    const r = I.lugar(lugar, l);
    if (r === lugar) erros.push('lugar sem tradução em ' + l + ': «' + lugar + '»');
  }
}

console.log('  ' + todas.size + ' chaves em cada língua; ' + usadas.size + ' usadas; ' + lugares.size + ' lugares de formas regionais');
if (erros.length) {
  console.log('\n  ' + erros.length + ' problema(s):');
  erros.forEach(e => console.log('   ✗ ' + e));
  process.exit(1);
}
console.log('  ok: as três línguas batem, e nenhum texto ficou fora do dicionário\n');
