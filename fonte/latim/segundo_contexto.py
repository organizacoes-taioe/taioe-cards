"""O segundo contexto do card de forma (pedido do Gere, 03/11/2026: «mostrar em contextos
diferentes, especialmente se a palavra tiver mais de uma possibilidade de caso»): para a forma
ambígua que o curso também usa em outra frase, noutro caso, a ocorrência dessa outra frase.
cards_de_forma.py importa ocorrencias(); sozinho, lista o que acharia.

    python -I fonte/latim/segundo_contexto.py
"""
import json
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
# as frases de uso e as primeiras frases; os textos já dão card a cada caso diferente
USOS = ['03-texto-zero.json', '05-usos-a.json', '06-usos-b.json', '10-usos-c.json', '15-usos-d.json']
CASOS = ('nominativo', 'vocativo', 'acusativo', 'genitivo', 'dativo', 'ablativo')


def chave(w):
    w = unicodedata.normalize('NFD', w.lower())
    return ''.join(ch for ch in w if not unicodedata.combining(ch)).replace('æ', 'ae').replace('œ', 'oe').strip('.,;:!?«»"()')


def caso_de(rotulo):
    r = (rotulo or '').split(' ')[0]
    return r if r in CASOS else None


def ocorrencias(formas_ambiguas, ja_tem):
    """formas_ambiguas: (chave, lema) → resposta do card; ja_tem: {(chave, lema, resposta)}.
    Devolve (frase, índice, palavra, caso) da primeira ocorrência em outro caso de cada forma."""
    saida, postos = [], set()
    for arquivo in USOS:
        for fr in json.loads((BARALHO / arquivo).read_text(encoding='utf-8')):
            for i, p in enumerate(fr.get('palavras') or []):
                k, lema, caso = chave(p.get('w', '')), p.get('c'), caso_de(p.get('f'))
                if not caso or (k, lema) not in formas_ambiguas:
                    continue
                if caso == formas_ambiguas[(k, lema)] or (k, lema, caso) in ja_tem or (k, lema, caso) in postos:
                    continue
                postos.add((k, lema, caso))
                saida.append((fr, i, p, caso))
    return saida


if __name__ == '__main__':
    formas = json.loads((BARALHO / '07-formas.json').read_text(encoding='utf-8'))
    amb = {(chave(c['la']), c['lema']): c['pt'] for c in formas if c.get('ambigua') and c['familia'] == 'caso'}
    tem = {(chave(c['la']), c['lema'], c['pt']) for c in formas}
    oc = ocorrencias(amb, tem)
    for fr, i, p, caso in oc:
        print('la-x' + fr['id'][3:] + '-' + str(i), p['w'], caso, '←', fr['la'][:60])
    print(len(oc), 'segundos contextos')
