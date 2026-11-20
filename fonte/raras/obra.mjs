// Uma obra da Biblioteca Taioé como JSON (cards/RARAS.md §4): os capítulos com o texto limpo.
//   node fonte/raras/obra.mjs <pasta da biblioteca> <id da obra> > saida.json
// Lê conteudo/ como o ferramentas/vocabulario.mjs da Biblioteca.
import fs from 'node:fs'; import path from 'node:path';
const [, , bib, id] = process.argv;
const porId = {}, ordem = [];
const reg = (o) => { if (porId[o.id]) return; porId[o.id] = o; ordem.push(o); };
const B = new Proxy({}, { get: (t, k) => ({
  obra: reg,
  poemas: (pac) => pac.poemas.forEach((p) => reg({ ...p, autor: pac.autor, poema: true, partes: (p.partes || [{}]).map((x) => ({ titulo: x.titulo || '' })) })),
  textos: (mapa) => Object.keys(mapa).forEach((i) => { const o = porId[i]; if (!o) return; mapa[i].t.forEach((t, j) => { o.partes[j] = o.partes[j] || {}; o.partes[j].texto = t; }); }),
}[k] || (() => {})) });
const dir = path.join(bib, 'conteudo');
const andar = (d) => fs.readdirSync(d).sort().flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? andar(p) : p.endsWith('.js') ? [p] : []; });
const todos = andar(dir), raiz = todos.filter((f) => path.dirname(f) === dir);
const rodar = (f) => { try { new Function('BIBLIOTECA', 'window', fs.readFileSync(f, 'utf8'))(B, {}); } catch (e) { /* não é obra */ } };
const lista = raiz.concat(todos.filter((f) => !raiz.includes(f)));
lista.forEach(rodar);
lista.filter((f) => fs.readFileSync(f, 'utf8').includes('BIBLIOTECA.textos(')).forEach(rodar);
const limpo = (t) => String(t || '').replace(/::\S+/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/[_*|¤@#]/g, '').replace(/[ \t]+/g, ' ');
if (id === '--todas') {
  // o corpus: os originais em português (sem as traduções nossas nem as obras noutra língua)
  const saida = ordem.filter((o) => !o.traducao && !o.original && (o.lingua || 'pt') === 'pt')
    .map((o) => ({ id: o.id, autor: o.autor, titulo: o.titulo, ano: o.ano, partes: (o.partes || []).map((p) => limpo(p.texto)) }));
  process.stdout.write(JSON.stringify(saida));
} else {
  const o = porId[id];
  if (!o) { console.error('obra que não existe:', id); process.exit(1); }
  process.stdout.write(JSON.stringify({ id: o.id, autor: o.autor, titulo: o.titulo, ano: o.ano,
    partes: o.partes.map((p) => ({ titulo: p.titulo || '', texto: limpo(p.texto) })) }, null, 1));
}
