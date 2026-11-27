"""Frases reais para as palavras da lista do Gere (o curso «Português», RARAS.md §6).

  python3 -I fonte/raras/lista.py <leva.json> <corpus-bib.json> <pasta do gutenberg> <saida.json> [<lemmatization-pt.txt>]

<leva.json>: [{"p": palavra ou expressão, "s": sentido curto, "grupo": ...}] (a escolha dele, na
lista de ../anexos/portugues-lista/). <corpus-bib.json>: `node fonte/raras/obra.mjs <biblioteca>
--todas`. <pasta do gutenberg>: os .txt em português do Projeto Gutenberg (no desktop,
/mnt/arquivos/gutenberg/_Portuguese), um por obra, com «Title:» e «Author:» no cabeçalho.
As formas de cada lema vêm de fonte/frequencia/brutos/lemas/lemmatization-pt.txt (fora do git;
numa worktree, passar o caminho do clone principal). Para cada
palavra, até MAX frases de 6 a 40 palavras, no máximo duas por obra: primeiro as da Biblioteca
(grafia de hoje), depois as do Gutenberg, primeiro as sem marca de grafia antiga (ph, th, y, êle,
sôbre…); as de grafia antiga vão marcadas (`grafia_antiga`), e o card as traz em grafia atualizada.
"""
import glob
import json
import os
import re
import sys

PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")
MAX, DA_BIB = 12, 8
ANTIGA = re.compile(r"ph|th|y|ll|mm|nn|cç|sc[eéi]n|^(êle|êles|ela?s?|êste|êsse|êstes|êsses|aquêle|aquêles|sôbre|dêle|nêle|dêste|dêsse|nêste|nêsse|pôde-se|hontem|hoje?|ha|he|cahir|sahir|paiz|nella|delle)$")
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def antiga(toks):
    return any(ANTIGA.search(t) and t not in ('ela', 'elas', 'hoje') for t in toks)


def gutenberg(pasta):
    for f in sorted(glob.glob(os.path.join(pasta, '**', '*.txt'), recursive=True)):
        txt = open(f, encoding='utf-8', errors='replace').read()
        tit = re.search(r"^Title:\s*(.+)$", txt, re.M)
        aut = re.search(r"^Author:\s*(.+)$", txt, re.M)
        ini = re.search(r"\*\*\* ?START OF.*?\*\*\*", txt)
        fim = re.search(r"\*\*\* ?END OF", txt)
        corpo = txt[ini.end() if ini else 0: fim.start() if fim else len(txt)]
        yield {'id': 'gutenberg:' + os.path.basename(f), 'autor': aut.group(1).strip() if aut else '',
               'titulo': tit.group(1).strip() if tit else '', 'ano': None, 'partes': [corpo], 'gutenberg': True}


def main():
    f_leva, f_bib, p_gut, f_saida = sys.argv[1:5]
    f_lemas = sys.argv[5] if len(sys.argv) > 5 else os.path.join(RAIZ, 'fonte/frequencia/brutos/lemas/lemmatization-pt.txt')
    leva = json.load(open(f_leva, encoding='utf-8'))
    formas = {}
    lemas = {}
    for x in leva:
        base = x['p'][:-3] if x['p'].endswith('-se') else x['p']
        lemas[x['p']] = base
    alvo_lema = {}
    for x, b in lemas.items():
        if ' ' not in b:
            alvo_lema.setdefault(b.lower(), []).append(x)
    for l in open(f_lemas, encoding='utf-8-sig'):
        p = l.rstrip('\n').split('\t')
        if len(p) == 2 and p[0].lower() in alvo_lema:
            for x in alvo_lema[p[0].lower()]:
                formas.setdefault(p[1].lower(), set()).add(x)
    for b, xs in alvo_lema.items():
        for x in xs:
            formas.setdefault(b, set()).add(x)
    expressoes = {x: re.compile(r"(?<![^\W\d_])" + re.escape(b) + r"(?![^\W\d_])", re.I) for x, b in lemas.items() if ' ' in b}
    achadas = {x['p']: [] for x in leva}
    por_obra = {x['p']: {} for x in leva}

    def guardar(x, fr, forma, o, n, velha):
        if por_obra[x].get(o['id'], 0) >= 2:
            return
        por_obra[x][o['id']] = por_obra[x].get(o['id'], 0) + 1
        achadas[x].append({'frase': fr, 'forma': forma, 'autor': o.get('autor'), 'titulo': o.get('titulo'),
                           'ano': o.get('ano'), 'n': n, 'gutenberg': bool(o.get('gutenberg')),
                           'grafia_antiga': velha})

    obras = json.load(open(f_bib, encoding='utf-8'))
    for fonte in (obras, gutenberg(p_gut)):
        for o in fonte:
            for parte in o['partes']:
                for par in re.split(r"\n\s*\n", parte):
                    par = re.sub(r"\s+", ' ', par).strip()
                    if not par:
                        continue
                    for fr in FIM.split(par):
                        fr = fr.strip()
                        toks = [t.lower() for t in PAL.findall(fr)]
                        if not 6 <= len(toks) <= 40:
                            continue
                        vistos = set()
                        for t in set(toks):
                            for x in formas.get(t, ()):
                                vistos.add((x, t))
                        low = None
                        for x, rx in expressoes.items():
                            m = rx.search(fr)
                            if m:
                                vistos.add((x, m.group(0)))
                        if not vistos:
                            continue
                        velha = bool(o.get('gutenberg')) and antiga(toks)
                        for x, t in vistos:
                            lim = DA_BIB * 3 if not o.get('gutenberg') else MAX * 4
                            if len(achadas[x]) < lim + (MAX * 4 if o.get('gutenberg') else 0):
                                guardar(x, fr, t, o, len(toks), velha)
    saida = {}
    for x in leva:
        lst = achadas[x['p']]
        bib = sorted([y for y in lst if not y['gutenberg']], key=lambda y: abs(y['n'] - 18))[:DA_BIB]
        # do Gutenberg, primeiro as de grafia de hoje; as de grafia antiga só completam
        gut = sorted([y for y in lst if y['gutenberg']], key=lambda y: (y['grafia_antiga'], abs(y['n'] - 18)))[:MAX - len(bib)]
        saida[x['p']] = bib + gut
    json.dump(saida, open(f_saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sem = [k for k, v in saida.items() if not v]
    poucas = [k for k, v in saida.items() if 0 < len(v) < 3]
    print(len(saida), 'palavras;', len(sem), 'sem frase:', ', '.join(sem))
    print(len(poucas), 'com 1 ou 2:', ', '.join(poucas))


if __name__ == '__main__':
    main()
