/* Confere, dentro de um baralho, que nenhuma resposta certa de um card é a
   resposta certa (ou uma aceita) de outro, em nenhuma língua — pela régua do
   motor. O build compara só a língua ensinada; esta olha as respostas dos
   públicos, onde o funil derruba sujeito e artigo e junta o que parecia
   diferente: «Eu também!» e «também», «Ele cozinha» e «a cozinha».

   Saem dois tipos de linha:
     CANÔNICA REPETIDA — dois cards com a mesma resposta: é para trocar um deles;
     aceita de X é a canônica de Y — leia: às vezes é legítimo (um sinônimo
       aceito que é a palavra de outro card), às vezes é card dividindo resposta.
   E a letra portuguesa (ç, ã, õ) em campo espanhol, fora das aspas «».

   uso: node fonte/cruzar-respostas.js fr */
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const w = {}; new Function('window', fs.readFileSync(path.join(raiz, 'js', 'motor.js'), 'utf8'))(w);
const M = w.Motor;
const idioma = process.argv[2] || 'fr';
const pasta = path.join(__dirname, 'cards', idioma);
let cards = [];
for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json')).sort())
  cards = cards.concat(JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8')).map(c => Object.assign({ idioma }, c)));
const L = { pt: ['pt', 'aceitas'], es: ['es', 'aceitasEs'], en: ['en', 'aceitasEn'], fr: ['fr', 'aceitasFr'], it: ['it', 'aceitasIt'] };
let n = 0;
for (const [l, [cer, ac]] of Object.entries(L)) {
  const canon = new Map();
  for (const bruto of cards) for (const c of M.formasDoCard(bruto)) {
    if (!c[cer]) continue;
    const k = M.normalizar(c[cer], l);
    if (canon.has(k) && canon.get(k) !== c.id) { console.log('CANÔNICA REPETIDA [' + l + '] ' + canon.get(k) + ' e ' + c.id + ': ' + c[cer]); n++; }
    canon.set(k, c.id);
  }
  for (const bruto of cards) for (const c of M.formasDoCard(bruto)) {
    if (!c[cer]) continue;
    const vistos = new Set();
    for (const a of [c[cer]].concat(c[ac] || [], String(c[cer]).split('/'))) {
      const k = M.normalizar(a, l); const o = canon.get(k);
      if (o && o !== c.id && !vistos.has(o)) { vistos.add(o); console.log('aceita de ' + c.id + ' é a canônica de ' + o + ' [' + l + ']: ' + a); n++; }
    }
  }
}
for (const c of cards) for (const k of ['es', 'aceitasEs', 'distratoresEs', 'notaEs'])
  if (/[çãõ]/.test(JSON.stringify(c[k] || '').replace(/«[^»]*»/g, ''))) { console.log('letra portuguesa no espanhol: ' + c.id + ' ' + k); n++; }
console.log(n ? '\n  ' + n + ' ocorrência(s) para ler' : '\n  nada cruzado');
