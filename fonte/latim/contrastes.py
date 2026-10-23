"""Monta os cards de contraste do latim (cards/LATIM.md §3.7, pedido do Gere de 22/10).

    python -I fonte/latim/contrastes.py fonte/latim/cache/levas/contrastes-1.json

A leva traz os conjuntos: quatro alternativas latinas («opcoes»: o texto, o sentido e a anotação
palavra por palavra, no formato do montar.py), as mesmas palavras na mesma ordem e só os casos
mudando, e os cards que as usam («cards»: a frase portuguesa e o índice da certa). Grava
fonte/cards/la/11-contrastes.json, um card por frase portuguesa, com ids la-k001 em diante.
- Antes de gravar, a anotação das QUATRO alternativas passa pelo conferir.py (a alternativa que
  não é resposta de card nenhum também tem de ser latim certo).
- O card espera («requerTodas») as palavras do conjunto e os conceitos dos casos que aparecem
  em qualquer das quatro (D14).
- A nota: a anotação da certa, a explicação do conjunto e o sentido de cada alternativa, uma por linha.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import conferir  # noqa: E402
from montar import nota_de  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
SAIDA = BARALHO / '11-contrastes.json'
CASOS = ['nominativo', 'vocativo', 'acusativo', 'genitivo', 'dativo', 'ablativo']


def palavras_de(lista):
    saida = []
    for w, c, f, fn in lista:
        p = {'w': w}
        for k, v in (('c', c), ('f', f), ('fn', fn)):
            if v:
                p[k] = v
        saida.append(p)
    return saida


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    leva = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    baralho = []
    for arq in sorted(BARALHO.glob('*.json')):
        if arq != SAIDA:
            baralho.extend(json.loads(arq.read_text(encoding='utf-8')))
    conceito = {c['la']: c['id'] for c in baralho if c['tipo'] == 'conceito'}

    # a anotação de todas as alternativas, como frases de mentira, pelo conferir.py
    falsas = []
    for k in leva['conjuntos']:
        for i, o in enumerate(k['opcoes']):
            falsas.append({'id': f"conf-{k['id']}-{i}", 'tipo': 'frase', 'la': o['la'],
                           'palavras': palavras_de(o['palavras'])})
    if conferir.conferir(baralho + falsas, 'conf-'):
        raise SystemExit('a anotação de alguma alternativa não bate com o Wiktionary')

    cards, n = [], 0
    for k in leva['conjuntos']:
        ops = k['opcoes']
        if len(ops) != 4:
            raise SystemExit(f"{k['id']}: são 4 alternativas")
        ids = []
        for o in ops:
            for w, c, f, fn in o['palavras']:
                if c and c not in ids:
                    ids.append(c)
        casos = [x for x in CASOS if any(x in (f or '') for o in ops for _, _, f, _ in o['palavras'])]
        conceitos = [conceito[x] for x in casos]
        sentidos = 'As quatro alternativas:\n' + '\n'.join(f"{o['la'].rstrip('.')} — {o['sentido']}." for o in ops)
        for x in k['cards']:
            n += 1
            o = ops[x['certa']]
            cards.append({
                'id': f'la-k{n:03d}', 'tipo': 'contraste', 'conjunto': k['id'],
                'la': o['la'], 'pt': x['pt'],
                'distratoresLa': [y['la'] for j, y in enumerate(ops) if j != x['certa']],
                'aceitas': [], 'distratores': [],
                'nota': nota_de(o['palavras'], k['ensina']) + '\n' + sentidos,
                'nivel': k.get('nivel', 'A1'), 'tags': ['contraste'],
                'requerTodas': ids + conceitos, 'palavras': palavras_de(o['palavras']),
                'conceitos': conceitos})
    SAIDA.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f"{len(cards)} cards de contraste em {len(leva['conjuntos'])} conjuntos → {SAIDA.name}")


if __name__ == '__main__':
    main()
