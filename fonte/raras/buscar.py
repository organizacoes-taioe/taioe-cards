"""Frases reais com uma forma, nos originais em português da Biblioteca (RARAS.md §4).

  python3 -I fonte/raras/buscar.py <corpus-obras.json> <forma>… [--max N]

Para cada forma (a palavra exata, sem diferença de maiúscula), até N frases (padrão 8) de 6 a 35
palavras, no máximo duas por obra, com o autor, o título e o ano.
"""
import json
import re
import sys

PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")


def main():
    args = sys.argv[1:]
    n = 8
    if '--max' in args:
        i = args.index('--max')
        n = int(args[i + 1])
        del args[i:i + 2]
    corpus = json.load(open(args[0], encoding='utf-8'))
    formas = [f.lower() for f in args[1:]]
    achadas = {f: [] for f in formas}
    por_obra = {f: {} for f in formas}
    for o in corpus:
        for parte in o['partes']:
            for par in re.split(r"\n\s*\n", parte):
                for fr in FIM.split(par.replace('\n', ' ').strip()):
                    toks = [t.lower() for t in PAL.findall(fr)]
                    if not 6 <= len(toks) <= 35:
                        continue
                    for f in formas:
                        if f in toks and len(achadas[f]) < n * 6 and por_obra[f].get(o['id'], 0) < 2:
                            por_obra[f][o['id']] = por_obra[f].get(o['id'], 0) + 1
                            achadas[f].append((len(toks), fr.strip(), o.get('autor'), o.get('titulo'), o.get('ano')))
    for f in formas:
        lst = sorted(achadas[f], key=lambda x: abs(x[0] - 14))[:n]
        print('== ' + f + ' (' + str(len(lst)) + ')')
        for _, fr, a, t, ano in lst:
            print('  ' + fr + '  [' + str(a) + ' | ' + str(t) + ' | ' + str(ano) + ']')


if __name__ == '__main__':
    main()
