"""Candidatas a frase de uso, na biblioteca de apoio (cards/LATIM.md §3.2 e §7).

    python -I fonte/latim/buscar.py [--max 8]

Para cada card de palavra do latim, procura em fonte/latim/cache/frases.jsonl as frases completas
de 3 a 10 palavras que trazem uma forma dele e cujas outras palavras a pessoa vai ter: as do texto
zero (as primeiras frases, que todos estudam) e as do mesmo texto. Uma palavra a mais, sem card, é
tolerada (ela viria com a tradução ao lado). Grava fonte/latim/cache/candidatos-uso.json, com as
melhores primeiro: sem palavra a mais, com a palavra noutra forma que a dos textos, as mais curtas.
Desde 22/10 (pedido do Gere: menos religioso) a lista de cada lema alterna clássico e Vulgata,
começando pelo clássico, para que a escolha saia meio a meio.
"""

import json
import re
import sys
from itertools import zip_longest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latim  # noqa: E402
import formas  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
FRASES = AQUI / 'cache' / 'frases.jsonl'
SAIDA = AQUI / 'cache' / 'candidatos-uso.json'


def carregar():
    cards = []
    for arq in sorted(BARALHO.glob('*.json')):
        cards.extend(json.loads(arq.read_text(encoding='utf-8')))
    return cards


def indice_de_formas(palavras):
    """chave da forma → {ids de card}: o quadro de formas de cada lema, o próprio lema e as
    variantes (para as palavras invariáveis, que não têm quadro)."""
    idx = {}
    for c in palavras:
        lemas = [c['la']] + c.get('variantes', [])
        for lema in lemas:
            if lema.startswith('-'):
                continue
            idx.setdefault(latim.chave(lema), set()).add(c['id'])
            for pos, lista in formas.formas_do_lema(lema).items():
                for forma, marcas in lista:
                    if not forma or 'canonical' in marcas or 'romanization' in marcas:
                        continue
                    # «laudatus sum»: só o particípio é do lema; o «sum» é do verbo sum
                    idx.setdefault(latim.chave(forma.split(' ')[0]), set()).add(c['id'])
    return idx


ENCLITICAS = {'que': None, 'ne': None, 've': None}


def cards_do_token(tok, idx, que):
    k = latim.chave(tok)
    if k in idx:
        return [idx[k]]
    for enc in ('que', 've', 'ne'):
        if k.endswith(enc) and k[:-len(enc)] in idx:
            return [idx[k[:-len(enc)]], {que} if enc == 'que' and que else set()]
    com_cum = {latim.chave(a): b for a, b in formas.COM_CUM.items()}
    if k in com_cum and latim.chave(com_cum[k]) in idx:
        return [idx[latim.chave(com_cum[k])], idx.get('cum', set())]
    return [set()]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    maximo = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 8
    cards = carregar()
    palavras = [c for c in cards if c['tipo'] == 'palavra']
    frases = [c for c in cards if c['tipo'] == 'frase']
    que = next((c['id'] for c in palavras if c['la'] == '-que'), None)
    print('montando o índice de formas…')
    idx = indice_de_formas(palavras)
    print(f'{len(idx)} formas para {len(palavras)} lemas')

    # o vocabulário de cada texto, e as formas que cada lema já tem nos textos
    zero = set()
    por_texto = {}
    formas_vistas = {}
    for f in frases:
        ids = [p['c'] for p in f.get('palavras', []) if 'c' in p]
        if f['id'].startswith('la-f'):
            zero.update(ids)
        if f.get('texto'):
            por_texto.setdefault(f['texto'], set()).update(ids)
        for p in f.get('palavras', []):
            if 'c' in p:
                formas_vistas.setdefault(p['c'], set()).add(latim.chave(p['w']))
    # o texto longo em partes (PLANO.md §9.6): quem chega à parte 2 já passou pela 1, então a frase
    # de uso de uma palavra da parte n pode usar as palavras das partes 1 a n
    textos_do_lema = {}
    for t, ids in por_texto.items():
        for i in ids:
            textos_do_lema.setdefault(i, set()).add(t)
    meta = {}
    for arq in (AQUI.parent / 'textos' / 'la').glob('*.json'):
        t = json.loads(arq.read_text(encoding='utf-8'))
        if t.get('obra'):
            meta[t['id']] = (t['obra'], t['parte'])
    por_texto = {t: ids | set().union(*[por_texto[u] for u, (o, m) in meta.items()
                                        if t in meta and o == meta[t][0] and m < meta[t][1] and u in por_texto])
                 for t, ids in por_texto.items()}
    ja_cards = {latim.chave(f['la']) for f in frases}

    cand = {c['id']: [] for c in palavras}
    with FRASES.open(encoding='utf-8') as arq:
        for linha in arq:
            r = json.loads(linha)
            if not r['completa'] or not 3 <= r['n'] <= 10:
                continue
            if latim.chave(r['texto']) in ja_cards:
                continue
            toks = latim.palavras(r['texto'])
            grupos = []
            for tok in toks:
                grupos.extend((tok, g) for g in cards_do_token(tok, idx, que))
            for c in palavras:
                cid = c['id']
                if not any(cid in g for _, g in grupos):
                    continue
                permitido = set(zero)
                for t in textos_do_lema.get(cid, ()):
                    permitido |= por_texto[t]
                fora = [tok for tok, g in grupos if g and not (g & permitido) and cid not in g]
                vazias = [tok for tok, g in grupos if not g]
                extras = len(fora) + len(vazias)
                if extras > 1:
                    continue
                forma = next(tok for tok, g in grupos if cid in g)
                nova = latim.chave(forma) not in formas_vistas.get(cid, set())
                cand[cid].append({'fonte': r['fonte'], 'ref': r['ref'], 'texto': r['texto'], 'n': r['n'], 'forma': forma,
                                  'nova': nova, 'a_mais': fora + vazias})
    for cid, lista in cand.items():
        lista.sort(key=lambda x: (len(x['a_mais']), not x['nova'], abs(x['n'] - 5), x['ref']))
        vistas = set()
        unicas = []
        for x in lista:
            if latim.chave(x['texto']) in vistas:
                continue
            vistas.add(latim.chave(x['texto']))
            unicas.append(x)
        # alterna as duas bibliotecas, o clássico primeiro (meio a meio, pedido de 22/10)
        de = {f: [x for x in unicas if x['fonte'] == f] for f in ('classicos', 'vulgata')}
        alternadas = []
        for par in zip_longest(de['classicos'], de['vulgata']):
            alternadas.extend(x for x in par if x)
        cand[cid] = alternadas[:maximo]
    SAIDA.write_text(json.dumps(cand, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
    sem = [c['la'] for c in palavras if not cand[c['id']]]
    so_com_mais = [c['la'] for c in palavras if cand[c['id']] and cand[c['id']][0]['a_mais']]
    print(f'gravado {SAIDA.name}: {len(palavras) - len(sem)} lemas com candidata')
    print('sem candidata:', ', '.join(sem) or '—')
    print('só com uma palavra a mais:', ', '.join(so_com_mais) or '—')


if __name__ == '__main__':
    main()
