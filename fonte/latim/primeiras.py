"""Aplica uma leva de primeiras frases do latim (cards/LATIM.md, D11 de 22/10).

    python -I fonte/latim/primeiras.py fonte/latim/cache/levas/primeiras-2.json

A leva diz que frases saem («saem»), as novas («frases», no formato do montar.py, com «ensina»
e os nomes dos conceitos), as palavras novas («palavras», cards de palavra sem «tipo» nem
«nivel») e a ordem final das primeiras frases («ordem»), que é a ordem do arquivo e, portanto, a
do estudo. Depois disso:
- a palavra que nenhuma frase restante (primeira frase ou trecho de texto) usa sai do baralho,
  porque não teria mais caminho na trilha;
- sai junto a frase de uso que pede uma palavra que saiu.
Grava 02-palavras, 03-texto-zero, 05-usos-a e 06-usos-b. Os cards de forma se refazem depois,
com cards_de_forma.py.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from montar import nota_de  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'


def ler(nome):
    return json.loads((BARALHO / nome).read_text(encoding='utf-8'))


def gravar(nome, cards):
    (BARALHO / nome).write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')


def frase_de(x, conceitos):
    palavras = []
    for w, c, f, fn in x['palavras']:
        p = {'w': w}
        if c:
            p['c'] = c
        if f:
            p['f'] = f
        if fn:
            p['fn'] = fn
        palavras.append(p)
    faltam = [n for n in x.get('conceitos', []) if n not in conceitos]
    if faltam:
        raise SystemExit(f"{x['id']}: conceito que não existe: {faltam}")
    return {'id': x['id'], 'tipo': 'frase', 'la': x['la'], 'pt': x['pt'], 'gabarito': x['gabarito'],
            'aceitas': x.get('aceitas', []), 'distratores': x['distratores'],
            'nota': nota_de(x['palavras'], x.get('ensina', '')), 'nivel': x.get('nivel', 'A1'),
            'tags': ['primeiros passos'], 'fonte': x['fonte'], 'requerTodas': [], 'palavras': palavras,
            'conceitos': [conceitos[n] for n in x.get('conceitos', [])]}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    leva = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    conceitos = {c['la']: c['id'] for c in ler('01-conceitos.json')}
    palavras = ler('02-palavras.json')
    zero = ler('03-texto-zero.json')
    trechos = ler('04-trechos.json')

    ids = {c['id'] for c in palavras}
    for p in leva['palavras']:
        if p['id'] in ids:
            raise SystemExit(f"{p['id']} já existe")
        palavras.append({'id': p['id'], 'tipo': 'palavra', **{k: v for k, v in p.items() if k != 'id'},
                         'nivel': p.get('nivel', 'A1')})
    for p in palavras:   # a ordem dos campos de sempre, com «variantes» e «transparencia» no fim
        extras = {k: p.pop(k) for k in ('variantes', 'transparencia') if k in p}
        p.update(extras)

    porid = {f['id']: f for f in zero if f['id'] not in set(leva['saem'])}
    for x in leva['frases']:
        porid[x['id']] = frase_de(x, conceitos)
    faltam = set(porid) - set(leva['ordem'])
    sobram = set(leva['ordem']) - set(porid)
    if faltam or sobram:
        raise SystemExit(f'a ordem não bate: faltam {sorted(faltam)}, sobram {sorted(sobram)}')
    zero = [porid[i] for i in leva['ordem']]

    usadas = {p['c'] for f in zero + trechos for p in f.get('palavras', []) if p.get('c')}
    saem = [p for p in palavras if p['id'] not in usadas]
    palavras = [p for p in palavras if p['id'] in usadas]
    fora = {p['id'] for p in saem}
    gravar('02-palavras.json', palavras)
    gravar('03-texto-zero.json', zero)
    tiradas = []
    for nome in ('05-usos-a.json', '06-usos-b.json'):
        usos = ler(nome)
        ficam = [u for u in usos if not (set(u.get('requerTodas', [])) | {u.get('requer')}) & fora]
        tiradas += [u['id'] for u in usos if u not in ficam]
        gravar(nome, ficam)
    print(f'{len(zero)} primeiras frases; {len(palavras)} palavras')
    print('palavras que saíram:', ', '.join(f"{p['id']} {p['la']}" for p in saem) or '—')
    print(f'frases de uso que saíram ({len(tiradas)}):', ', '.join(tiradas) or '—')


if __name__ == '__main__':
    main()
