#!/usr/bin/env node
/* Confere que todo elemento que os scripts procuram pelo id existe na página (ou é criado pelo
   próprio script). Em 04/11/2026 o merge do PR #72 apagou do index.html o painel do «Já conheço»,
   o app.js quebrou ao abrir e nenhum curso abria; o CI não tinha como ver.

     node fonte/conferir-pagina.js

   Lê, em cada script: a lista do `el` do app.js, `getElementById('…')`, `$('…')` do inicio.js
   (que é getElementById) e `querySelector('#…')`. Um id vale se aparece como id="…" no HTML da
   página ou em qualquer dos scripts dela (os que montam HTML por texto). */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', 'public', 'cards');
const PAGINAS = [
  { html: 'index.html', js: ['js/inicio.js', 'js/app.js', 'js/sincronia.js', 'js/armazem.js', 'js/i18n.js'], dolarEhId: ['js/inicio.js'] },
  { html: 'curadoria/index.html', js: ['curadoria/curadoria.js'], dolarEhId: ['curadoria/curadoria.js'] }
];

const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
let falhas = 0;

for (const p of PAGINAS) {
  const html = ler(p.html);
  const scripts = p.js.filter(f => fs.existsSync(path.join(RAIZ, f))).map(f => ({ f, s: ler(f) }));

  const existentes = new Set();
  const marcaId = /\bid\s*=\s*["']([A-Za-z][\w-]*)["']/g;
  for (const texto of [html, ...scripts.map(x => x.s)]) {
    for (const m of texto.matchAll(marcaId)) existentes.add(m[1]);
  }

  const pedidos = new Map(); // id → onde
  const pedir = (id, onde) => { if (!pedidos.has(id)) pedidos.set(id, onde); };
  for (const { f, s } of scripts) {
    // a lista de ids do `el` (app.js): [ 'a', 'b', … ].forEach(id => { el[id] = document.getElementById(id); })
    for (const m of s.matchAll(/\[([^\]]*)\]\s*\.forEach\(\s*id\s*=>\s*\{\s*el\[id\]\s*=\s*document\.getElementById\(id\)/g)) {
      const lista = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
      for (const n of lista.matchAll(/'([^']+)'/g)) pedir(n[1], f + ' (lista do el)');
    }
    for (const m of s.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) pedir(m[1], f);
    for (const m of s.matchAll(/querySelector\(\s*'#([\w-]+)'\s*\)/g)) pedir(m[1], f);
    if (p.dolarEhId.includes(f)) for (const m of s.matchAll(/\$\(\s*'([^']+)'\s*\)/g)) pedir(m[1], f);
  }

  const faltam = [...pedidos].filter(([id]) => !existentes.has(id));
  for (const [id, onde] of faltam) console.error(`✗ ${p.html}: falta o elemento #${id} (procurado em ${onde})`);
  falhas += faltam.length;
  console.log(`${p.html}: ${pedidos.size} ids procurados, ${faltam.length} faltando`);
}

if (falhas) {
  console.error(`\n${falhas} elemento(s) faltando: algum merge apagou parte da página, ou o id mudou de nome.`);
  process.exit(1);
}
