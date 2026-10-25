"""Monta os cards de frase do latim a partir de uma leva escrita à mão (cards/LATIM.md §3).

    python -I fonte/latim/montar.py <leva.json> <fonte/cards/la/NN-nome.json>

A leva é uma lista de frases neste formato (o que muda de uma frase para outra):

    {"id": "la-u001", "requer": "la-p018", "la": "Laudabo Dominum in vita mea;",
     "fonte": "Sl 146 (145),2", "pt": "Louvarei o Senhor em minha vida;",
     "gabarito": "[Eu ~] louvarei o Senhor [em minha vida ~ na minha vida ~ durante a minha vida]",
     "aceitas": [], "distratores": ["…", "…", "…", "…"],
     "palavras": [["Laudabo", "la-p018", "futuro do indicativo, 1ª pessoa do singular", ""], …],
     "ensina": "Laudabo, com o -bo do futuro da 1ª conjugação: «louvarei».",
     "conceitos": ["futuro do indicativo", "acusativo"]}

Cada palavra é [forma no texto, id do card ou null, rótulo da forma, função]. A nota sai das
palavras (uma linha por palavra com rótulo ou função) e da linha «ensina»; o «requerTodas», dos
cards das palavras, na ordem; os conceitos, dos nomes dos cards de conceito (de todas as levas).
Frase de uso leva «requer» (a palavra que ela ensina); trecho de texto leva «texto» e «linha».
"""

import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'


def nota_de(palavras, ensina):
    linhas = []
    for w, c, f, fn in palavras:
        if f or fn:
            linhas.append(f'{w}: ' + ', '.join(x for x in (f, fn) if x) + '.')
    if ensina:
        linhas.append(ensina)
    return '\n'.join(linhas)


def montar(itens, conceitos, tag):
    saida = []
    for x in itens:
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
        card = {'id': x['id'], 'tipo': 'frase', 'la': x['la'], 'pt': x['pt'], 'gabarito': x['gabarito'],
                'aceitas': x.get('aceitas', []), 'distratores': x['distratores'],
                'nota': nota_de(x['palavras'], x.get('ensina', '')), 'nivel': x.get('nivel', 'A1'),
                'tags': [tag], 'fonte': x['fonte']}
        if x.get('requer'):
            card['requer'] = x['requer']
        card['requerTodas'] = list(dict.fromkeys(p['c'] for p in palavras if 'c' in p))
        card['palavras'] = palavras
        faltam = [n for n in x.get('conceitos', []) if n not in conceitos]
        if faltam:
            raise SystemExit(f"{x['id']}: conceito que não existe: {faltam}")
        card['conceitos'] = [conceitos[n] for n in x.get('conceitos', [])]
        for k in ('texto', 'linha'):
            if k in x:
                card[k] = x[k]
        saida.append(card)
    return saida


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    entrada, destino = Path(sys.argv[1]), Path(sys.argv[2])
    # os conceitos de todas as levas (01-conceitos, 12-conceitos-2…)
    conceitos = {c['la']: c['id'] for arq in sorted(BARALHO.glob('*.json'))
                 for c in json.loads(arq.read_text(encoding='utf-8')) if c.get('tipo') == 'conceito'}
    itens = json.loads(entrada.read_text(encoding='utf-8'))
    tag = 'frase de uso' if all(x.get('requer') for x in itens) else 'trecho'
    cards = montar(itens, conceitos, tag)
    destino.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(cards)} cards em {destino}')
