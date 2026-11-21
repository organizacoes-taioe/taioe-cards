"""As palavras raras de uma obra, na ordem do livro (cards/RARAS.md §4).

  python3 -I fonte/raras/palavras.py <obra.json> <vocabulario.json> <saida.json> [--min N] [--max N]

<obra.json> sai de `node fonte/raras/obra.mjs <biblioteca> <id>`; o vocabulário é o da
Biblioteca (edicoes/vocabulario/<id>.json). Para cada verbete: a primeira ocorrência (capítulo,
parágrafo, a forma como está no texto) e a frase dela; e as partes, de capítulos seguidos com
de --min a --max palavras novas (o último grupo curto se junta ao anterior). Grava também os
parágrafos de cada parte: só os da primeira ocorrência de alguma palavra (pedido do Gere,
20/11/2026: «bastam os parágrafos com palavras a serem aprendidas»).
"""
import json
import re
import sys

PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
# fim de frase: ponto, exclamação, interrogação ou reticências, e depois espaço e começo de outra
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")


CLITICOS = {'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'o', 'a', 'os', 'as', 'lo', 'la', 'los', 'las', 'no', 'na', 'nas'}


def candidatas(tok):
    """A palavra inteira e, no verbo com pronome pendurado («apeou-se»), só o verbo."""
    saida = [tok]
    partes = tok.split('-')
    if len(partes) > 1 and all(x.lower() in CLITICOS for x in partes[1:]):
        saida.append(partes[0])
    elif len(partes) == 3 and partes[1].lower() in CLITICOS:   # a mesóclise: «apear-se-ia»
        saida.append(partes[0])
    return saida


def frases(par):
    partes, ini = [], 0
    for m in FIM.finditer(par):
        partes.append(par[ini:m.start() + (1 if par[m.start()] in '»"”' else 0)].strip())
        ini = m.end()
    partes.append(par[ini:].strip())
    return [p for p in partes if p]


def main():
    args = sys.argv[1:]
    opc = {'--min': 10, '--max': 25}
    pos = []
    i = 0
    while i < len(args):
        if args[i] in opc:
            opc[args[i]] = int(args[i + 1])
            i += 2
        else:
            pos.append(args[i])
            i += 1
    f_obra, f_voc, f_saida = pos
    obra = json.load(open(f_obra, encoding='utf-8'))
    voc = json.load(open(f_voc, encoding='utf-8'))['palavras']
    caps = [[p.strip() for p in re.split(r"\n\s*\n", parte['texto']) if p.strip()] for parte in obra['partes']]
    forma_de = {}
    for k, v in enumerate(voc):
        for f in v['formas']:
            forma_de.setdefault(f.lower(), []).append(k)
    vale = lambda k, cap: not voc[k].get('so_capitulos') or cap in voc[k]['so_capitulos']
    primeira = {}
    for c, pars in enumerate(caps, 1):
        for p, par in enumerate(pars):
            for m in PAL.finditer(par):
                for w in candidatas(m.group(0)):
                    for k in forma_de.get(w.lower(), []):
                        if k not in primeira and vale(k, c):
                            primeira[k] = (c, p, w, m.start())
    faltam = [voc[k]['lema'] for k in range(len(voc)) if k not in primeira]
    if faltam:
        print('sem ocorrência no texto:', ', '.join(faltam), file=sys.stderr)
    ordem = sorted(primeira, key=lambda k: primeira[k][:2] + (primeira[k][3],))
    palavras = []
    for k in ordem:
        c, p, w, ini = primeira[k]
        par = caps[c - 1][p]
        fr = next((s for s in frases(par) if re.search(r"(?<![^\W\d_])" + re.escape(w) + r"(?![^\W\d_])", s)), par)
        v = voc[k]
        palavras.append({'lema': v['lema'], 'formas': v['formas'], 'classe': v['classe'], 'def': v['def'],
                         'so_capitulos': v.get('so_capitulos'), 'cap': c, 'par': p, 'w': w, 'frase': fr,
                         'titulo_cap': obra['partes'][c - 1]['titulo']})
    # as partes: capítulos seguidos até juntar de min a max palavras
    por_cap = {}
    for x in palavras:
        por_cap.setdefault(x['cap'], []).append(x)
    grupos, atual = [], []
    for c in range(1, len(caps) + 1):
        n_atual = sum(len(por_cap.get(cc, [])) for cc in atual)
        n_c = len(por_cap.get(c, []))
        if atual and n_atual >= opc['--min'] and n_atual + n_c > opc['--max']:
            grupos.append(atual)
            atual = []
        atual.append(c)
    if atual:
        n = sum(len(por_cap.get(cc, [])) for cc in atual)
        if grupos and n < opc['--min']:
            grupos[-1].extend(atual)
        else:
            grupos.append(atual)
    grupos = [g for g in grupos if any(por_cap.get(c) for c in g)]
    partes = []
    for n, g in enumerate(grupos, 1):
        pars = sorted({(x['cap'], x['par']) for c in g for x in por_cap.get(c, [])})
        partes.append({'parte': n, 'caps': g, 'titulos': [obra['partes'][c - 1]['titulo'] for c in g],
                       'paragrafos': [{'cap': c, 'par': p, 'texto': caps[c - 1][p]} for c, p in pars],
                       'palavras': [x['lema'] for c in g for x in por_cap.get(c, [])]})
    json.dump({'obra': obra['id'], 'autor': obra['autor'], 'titulo': obra['titulo'], 'ano': obra['ano'],
               'palavras': palavras, 'partes': partes}, open(f_saida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(obra['id'] + ':', len(palavras), 'palavras,', len(partes), 'partes:',
          ', '.join(str(len(p['palavras'])) + '/' + str(len(p['paragrafos'])) for p in partes))


if __name__ == '__main__':
    main()
