"""Confere a anotação das frases do latim contra o índice de formas (cards/LATIM.md §8).

    python -I fonte/latim/conferir.py            # todas as frases de fonte/cards/la
    python -I fonte/latim/conferir.py la-f001    # só as que começam assim

Para cada frase: as palavras de «la» (com a enclítica e o «cum» posposto separados) têm de bater,
na ordem, com a lista «palavras»; e cada palavra com card tem de ter, no Wiktionary, uma análise
daquele lema com o caso, o tempo e a pessoa que a anotação diz. O que não bate sai como problema;
nome próprio e palavra sem card não se conferem. O card pode trazer «variantes»: outros títulos do
mesmo lema no Wiktionary (ab → a; tenebrae → tenebra).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latim  # noqa: E402
import formas  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'

CASO = {v: k for k, v in latim.CASOS.items()}
TEMPO = {v: k for k, v in latim.TEMPOS.items()}
PESSOA = {'1ª': 'first-person', '2ª': 'second-person', '3ª': 'third-person'}


def marcas_pedidas(f):
    """As marcas do Wiktionary que o rótulo em português exige (só as que dá para conferir)."""
    if not f:
        return set()
    m = set()
    for pt, en in CASO.items():
        if pt in f:
            m.add(en)
    if 'singular' in f:
        m.add('singular')
    if 'plural' in f:
        m.add('plural')
    for pt, en in sorted(TEMPO.items(), key=lambda x: -len(x[0])):
        if f.startswith(pt) or f.startswith('imperativo ' + pt) or ('particípio ' + pt) in f or ('infinitivo ' + pt) in f:
            m.add(en)
            break
    if 'subjuntivo' in f:
        m.add('subjunctive')
    if 'indicativo' in f:
        m.add('indicative')
    if 'imperativo' in f:
        m.add('imperative')
    if 'infinitivo' in f:
        m.add('infinitive')
    if 'particípio' in f:
        m.add('participle')
    if 'passiva' in f:
        m.add('passive')
    for pt, en in PESSOA.items():
        if pt + ' pessoa' in f:
            m.add(en)
    return m


def tokens(la):
    saida = []
    for p in latim.palavras(la):
        saida.extend(formas.separar(p))
    return saida


def conferir(cards, filtro=''):
    por_id = {c['id']: c for c in cards}
    problemas = 0
    for c in cards:
        if c['tipo'] != 'frase' or not c['id'].startswith(filtro):
            continue
        pal = c.get('palavras') or []
        toks = tokens(c['la'])
        ws = [p['w'] for p in pal]
        if [latim.chave(t) for t in toks] != [latim.chave(x) for x in ws]:
            print(f"{c['id']}: as palavras não batem com o texto\n   texto:    {toks}\n   palavras: {ws}")
            problemas += 1
            continue
        for p in pal:
            if 'c' not in p:
                continue
            alvo = por_id.get(p['c'])
            if not alvo:
                print(f"{c['id']}: «{p['w']}» aponta para {p['c']}, que não existe")
                problemas += 1
                continue
            if p['w'].startswith('-'):
                continue
            analises = formas.analisar(p['w'])
            lemas_do_card = {latim.chave(x) for x in [alvo['la']] + alvo.get('variantes', [])}
            do_lema = [a for a in analises if latim.chave(a['lema']) in lemas_do_card]
            if not do_lema and 'particípio' in p.get('f', ''):
                # o Wiktionary dá o particípio como lema próprio (benedictus, consummatus):
                # basta que ele seja particípio do verbo do card
                if any(any(latim.chave(b['lema']) in lemas_do_card and 'participle' in b['marcas']
                           for b in formas.analisar(latim.sem_marcas(a['lema']))) for a in analises):
                    continue
            if not do_lema:
                lemas = sorted({a['lema'] for a in analises})
                print(f"{c['id']}: «{p['w']}» não é forma de {alvo['la']} no Wiktionary (é de {lemas or 'nada'})")
                problemas += 1
                continue
            if p.get('f', '').startswith('preposição') or 'particípio' in p.get('f', ''):
                continue   # a preposição não tem caso; o particípio, no Wiktionary, vem sem ele
            pedidas = marcas_pedidas(p.get('f', ''))
            if pedidas and not any(pedidas <= set(a['marcas']) for a in do_lema):
                vistas = ['/'.join(a['marcas']) for a in do_lema]
                print(f"{c['id']}: «{p['w']}» como «{p.get('f')}» não aparece; o Wiktionary dá {vistas}")
                problemas += 1
    return problemas


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    cards = []
    for arq in sorted(BARALHO.glob('*.json')):
        cards.extend(json.loads(arq.read_text(encoding='utf-8')))
    n = conferir(cards, sys.argv[1] if len(sys.argv) > 1 else '')
    print('tudo certo' if not n else f'{n} problema(s)')
    sys.exit(1 if n else 0)
