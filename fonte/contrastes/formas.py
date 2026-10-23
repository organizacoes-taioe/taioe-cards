"""As formas das línguas vivas no Wiktionary, pelo kaikki.org (cards/PLANO.md §10).

    python -I fonte/contrastes/formas.py es analisar <forma> [...]   # as análises de cada forma

O mesmo caminho do índice do latim (fonte/latim/formas.py): baixa só a página de cada palavra,
uma vez, e guarda em fonte/contrastes/cache/kaikki-<língua>/ (fora do git). A diferença é a
chave: aqui o acento conta («llegue» e «llegué» são formas diferentes). Licença dos dados:
CC BY-SA 4.0 (Wiktionary). Os dados baixados são lidos como JSON e nada mais.
"""

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
NOME = {'es': 'Spanish', 'en': 'English', 'fr': 'French', 'pt': 'Portuguese'}


def pasta(lingua):
    return AQUI / 'cache' / f'kaikki-{lingua}'


def nome_no_disco(palavra):
    # no Windows a pasta não distingue maiúscula: a maiúscula vira ^ na frente da letra
    return ''.join('^' + c.lower() if c.isupper() else c for c in palavra) + '.jsonl'


def url_de(lingua, palavra):
    partes = [urllib.parse.quote(x, safe='') for x in (palavra[0], palavra[:2], palavra)]
    return f'https://kaikki.org/dictionary/{NOME[lingua]}/meaning/{partes[0]}/{partes[1]}/{partes[2]}.jsonl'


def baixar(lingua, palavra, pausa=0.3):
    """As entradas da página da palavra (forma ou lema), baixada uma vez só; [] se não há."""
    p = pasta(lingua)
    p.mkdir(parents=True, exist_ok=True)
    arquivo = p / nome_no_disco(palavra)
    if not arquivo.exists():
        try:
            with urllib.request.urlopen(url_de(lingua, palavra), timeout=30) as r:
                corpo = r.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            corpo = ''
        arquivo.write_text(corpo, encoding='utf-8', newline='\n')
        time.sleep(pausa)
    return [json.loads(l) for l in arquivo.read_text(encoding='utf-8').splitlines() if l.strip()]


def analisar(lingua, forma):
    """[{lema, pos, marcas}]: cada análise da forma (a forma flexionada aponta para o lema; o
    lema aparece com marcas vazias, e com as do quadro de formas quando a forma está nele)."""
    saida, vistos = [], set()

    def por(lema, pos, marcas):
        # o verbo com pronomes colados (dímelo) vem como «decir combined with … me and … lo»
        lema = (lema or '').split(' combined with ')[0]
        chave = (lema, pos, tuple(sorted(marcas)))
        if chave not in vistos:
            vistos.add(chave)
            saida.append({'lema': lema, 'pos': pos, 'marcas': sorted(marcas)})

    for f in sorted({forma, forma.lower()}):
        for e in baixar(lingua, f):
            pos = e.get('pos')
            for s in e.get('senses', []):
                for alvo in s.get('form_of') or []:
                    por(alvo.get('word'), pos, [t for t in s.get('tags', []) if t != 'form-of'])
            if not any(s.get('form_of') for s in e.get('senses', [])):
                por(e.get('word'), pos, [])
            for fx in e.get('forms', []):
                if fx.get('form', '').lower() == f.lower() and 'canonical' not in fx.get('tags', []):
                    por(e.get('word'), pos, fx.get('tags', []))
    return saida


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 4 or sys.argv[2] != 'analisar' or sys.argv[1] not in NOME:
        print(__doc__)
        sys.exit(1)
    for forma in sys.argv[3:]:
        print(forma, json.dumps(analisar(sys.argv[1], forma), ensure_ascii=False))
