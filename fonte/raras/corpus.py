"""Frases reais de uso das palavras raras, nos originais em português da Biblioteca (RARAS.md §4).

  python3 -I fonte/raras/corpus.py <corpus-obras.json> <saida.json> <palavras-obra.json>…

<corpus-obras.json> sai de `node fonte/raras/obra.mjs <biblioteca> --todas` (só os originais em
português: nunca tradução nossa). Para cada palavra, até MAX frases de outras obras com alguma
das formas dela, de 6 a 35 palavras, no máximo duas por obra, as mais curtas primeiro.
"""
import json
import re
import sys

PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")
MAX = 10


def main():
    f_corpus, f_saida, *obras = sys.argv[1:]
    corpus = json.load(open(f_corpus, encoding='utf-8'))
    alvo = {}   # forma → [(obra, lema)]
    pedidas = []
    for f in obras:
        d = json.load(open(f, encoding='utf-8'))
        for x in d['palavras']:
            pedidas.append((d['obra'], x['lema']))
            for w in x['formas']:
                alvo.setdefault(w.lower(), []).append((d['obra'], x['lema']))
    achadas = {k: [] for k in pedidas}
    for o in corpus:
        for parte in o['partes']:
            for par in re.split(r"\n\s*\n", parte):
                par = par.replace('\n', ' ').strip()
                for fr in FIM.split(par):
                    fr = fr.strip()
                    toks = [t.lower() for t in PAL.findall(fr)]
                    if not 6 <= len(toks) <= 35:
                        continue
                    for t in set(toks):
                        for (ob, lema) in alvo.get(t, []):
                            if ob == o['id'] or o['id'].startswith(ob):
                                continue
                            achadas[(ob, lema)].append({'frase': fr, 'forma': t, 'obra': o['id'], 'autor': o.get('autor'),
                                                        'titulo': o.get('titulo'), 'ano': o.get('ano'), 'n': len(toks)})
    saida = {}
    for k, lst in achadas.items():
        lst.sort(key=lambda x: (abs(x['n'] - 14), x['obra']))
        por_obra, escolhidas = {}, []
        for x in lst:
            if por_obra.get(x['obra'], 0) >= 2:
                continue
            por_obra[x['obra']] = por_obra.get(x['obra'], 0) + 1
            escolhidas.append(x)
            if len(escolhidas) >= MAX:
                break
        saida[k[0] + '|' + k[1]] = escolhidas
    json.dump(saida, open(f_saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sem = sum(1 for v in saida.values() if not v)
    print(len(saida), 'palavras;', sem, 'sem frase noutra obra')


if __name__ == '__main__':
    main()
