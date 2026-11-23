"""O texto e o glossário de um texto latino dos Cards na Biblioteca (língua original), tirados dos
versos anotados (fonte/latim/versos.json): o poema.txt (as partes da obra em sequência, uma linha em
branco entre elas) e o glossario.json, com o lema, a classe, a forma e a nota (a função) de cada
palavra como estão na anotação. A definição é o sentido do card do lema (o «pt», com as primeiras
aceitas), ou a do SEM_CARD. Feito para as orações de 16/11/2026 (LATIM.md §19); a Eneida tem o
glossário próprio (glossario_eneida.py), com as definições traduzidas uma a uma.

    python -I fonte/latim/glossario_textos.py <pasta da Biblioteca: edicoes/lingua-original/<obra>> <titulo> <texto> [<texto>…]

As palavras do título que não estão no texto pedem verbete em TITULO.
"""
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import textos  # noqa: E402

BARALHO = AQUI.parent / 'cards' / 'la'
PAL = re.compile(r'[A-Za-zÀ-ÿ]+')

TITULO = {
    'psalmus': {'lema': 'psalmus', 'classe': 'substantivo masculino', 'def': ['Salmo.'],
                'nota': 'O título: o Salmo II do Saltério.'},
    'ii': {'lema': 'II', 'classe': 'numeral', 'def': ['Dois (em algarismo romano).']},
    'symbolum': {'lema': 'symbolum', 'classe': 'substantivo neutro', 'def': ['Símbolo: o resumo da fé, o Credo.']},
    'litaniae': {'lema': 'litania', 'classe': 'substantivo feminino', 'forma': 'nominativo plural',
                 'def': ['Ladainha: oração de súplicas curtas, uma depois da outra.']},
    'lauretanae': {'lema': 'Lauretanus', 'classe': 'adjetivo (nome próprio)', 'forma': 'nominativo feminino plural',
                   'def': ['De Loreto, o santuário de Nossa Senhora na Itália onde a ladainha se rezava.']},
    'apostolorum': {'lema': 'apostolus', 'classe': 'substantivo masculino', 'forma': 'genitivo plural',
                    'def': ['Apóstolo.'], 'nota': 'Dos Apóstolos: o Credo que a tradição atribui a eles.'},
}


def frase(fn):
    fn = (fn or '').strip()
    return (fn[0].upper() + fn[1:]).rstrip('.') + '.' if fn else ''


def definicao(card):
    """O sentido do card (o «pt», com o parêntese virando segundo sentido: «o laço (o vínculo)» →
    «O laço; o vínculo.»). As «aceitas» não servem: no baralho elas ficam sem acento."""
    pt = card['pt']
    m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', pt)
    d = f'{m.group(1)}; {m.group(2)}' if m else pt
    return [d[0].upper() + d[1:] + '.']


def main():
    pasta, titulo, tids = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    cards = {}
    for arq in sorted(BARALHO.glob('*.json')):
        for c in json.loads(arq.read_text(encoding='utf-8')):
            cards[c['id']] = c
    versos = json.loads((AQUI / 'versos.json').read_text(encoding='utf-8'))

    def parte(p):
        if p.get('c'):
            c = cards[p['c']]
            d = {'lema': c['la'], 'classe': textos.classe_de(c) or ('conjunção' if c['la'].startswith('-') else
                                                              'numeral' if 'numeral' in c.get('tags', []) else '')}
            if p.get('f'):
                d['forma'] = p['f']
            d['def'] = definicao(c)
            return d, p.get('fn', '')
        s = textos.SEM_CARD[p['w'].lower()]
        d = {'lema': s['lema'], 'classe': s['classe']}
        if p.get('f'):
            d['forma'] = p['f']
        d['def'] = s['def']
        return d, p.get('fn', '')

    linhas_txt, verbetes, ocorrencias = [], {}, {}
    n = 0
    for k, tid in enumerate(tids):
        if k:
            linhas_txt.append('')
        for v in versos[tid]:
            n += 1
            linhas_txt.append(v['la'])
            fila = list(v['palavras'])
            for pos, m in enumerate(PAL.finditer(v['la']), start=1):
                w = m.group(0)
                partes = [fila.pop(0)]
                while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
                    partes.append(fila.pop(0))
                if partes[0]['w'].lower() == w.lower() and fila and fila[0]['w'].lower() == w.lower():
                    partes.append(fila.pop(0))
                if len(partes) == 1:
                    d, fn = parte(partes[0])
                    if frase(fn):
                        d['nota'] = frase(fn)
                else:
                    ds = [parte(x) for x in partes]
                    d = {'partes': [x[0] for x in ds]}
                    nota = '; '.join(frase(x[1]).rstrip('.') for x in ds if x[1])
                    if nota:
                        d['nota'] = nota + '.'
                base = w.lower()
                chave, i = base, 1
                while chave in verbetes and verbetes[chave] != d:
                    i += 1
                    chave = f'{base}#{i}'
                verbetes[chave] = d
                if chave != base:
                    ocorrencias[f'{n}.{pos}'] = chave
            assert not fila, v['la']
    for w in PAL.findall(titulo):
        if w.lower() not in verbetes:
            verbetes[w.lower()] = TITULO[w.lower()]
    pasta.mkdir(parents=True, exist_ok=True)
    (pasta / 'poema.txt').write_text('\n'.join(linhas_txt) + '\n', encoding='utf-8', newline='\n')
    (pasta / 'glossario.json').write_text(json.dumps({'verbetes': verbetes, 'ocorrencias': ocorrencias},
                                                     ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{pasta.name}: {n} linhas, {len(verbetes)} verbetes, {len(ocorrencias)} ocorrências especiais')


if __name__ == '__main__':
    main()
