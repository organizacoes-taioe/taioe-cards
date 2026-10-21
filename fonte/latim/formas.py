"""O índice de formas do latim, tirado do Wiktionary pelo kaikki.org (cards/LATIM.md §7).

    python -I fonte/latim/formas.py analisar <forma> [...]   # as análises possíveis de cada forma
    python -I fonte/latim/formas.py lema <lema> [...]        # as formas de cada lema, com as marcas
    python -I fonte/latim/formas.py separar <palavra> [...]  # a enclítica e o «cum» posposto à parte
    python -I fonte/latim/formas.py baixar <lista.txt>       # baixa as formas e os lemas da lista

Cada palavra baixada fica em fonte/latim/cache/kaikki/ (fora do git). No Windows a pasta não
distingue maiúscula, então a maiúscula vira ^ na frente da letra (Deus → ^deus.jsonl), como no
cache do Wiktionary da Biblioteca. Licença dos dados: CC BY-SA 4.0 (Wiktionary).

Os dados baixados são lidos como JSON e nada mais.
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latim  # noqa: E402

AQUI = Path(__file__).resolve().parent
PASTA = AQUI / 'cache' / 'kaikki'
BASE = 'https://kaikki.org/dictionary/Latin/meaning/'
RE_GLOSA = re.compile(r'((?:nominative|genitive|dative|accusative|ablative|vocative)(?:/(?:nominative|genitive|dative|accusative|ablative|vocative))*) (singular|plural) of (\S+?)[;,.)]?(?:\s|$)')

# A enclítica que se escreve junto (virumque = virum + -que) e o «cum» posposto ao pronome.
ENCLITICAS = ('que', 'ne', 've')
COM_CUM = {'mecum': 'me', 'tecum': 'te', 'secum': 'se', 'nobiscum': 'nobis', 'vobiscum': 'vobis',
           'quocum': 'quo', 'quacum': 'qua', 'quibuscum': 'quibus', 'quicum': 'qui'}


def nome_no_disco(palavra):
    return ''.join('^' + c.lower() if c.isupper() else c for c in palavra) + '.jsonl'


def url_de(palavra):
    p1 = palavra[0]
    p2 = palavra[:2]
    partes = [urllib.parse.quote(x, safe='') for x in (p1, p2, palavra)]
    return f'{BASE}{partes[0]}/{partes[1]}/{partes[2]}.jsonl'


def baixar_palavra(palavra, pausa=0.3):
    """Baixa a página da palavra (forma ou lema), uma vez só. Devolve as entradas, ou []."""
    PASTA.mkdir(parents=True, exist_ok=True)
    arquivo = PASTA / nome_no_disco(palavra)
    if not arquivo.exists():
        try:
            with urllib.request.urlopen(url_de(palavra), timeout=30) as r:
                corpo = r.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            corpo = '' if e.code == 404 else None
            if corpo is None:
                raise
        arquivo.write_text(corpo, encoding='utf-8', newline='\n')
        time.sleep(pausa)
    texto = arquivo.read_text(encoding='utf-8')
    return [json.loads(l) for l in texto.splitlines() if l.strip()]


def analisar(forma):
    """As análises possíveis da forma: [{lema, pos, marcas}]. Procura a forma como está, em
    minúscula e com maiúscula inicial, porque o Wiktionary separa «deus» de «Deus»."""
    vistos = set()
    saida = []
    candidatas = {forma, forma.lower(), forma[:1].upper() + forma[1:].lower()}
    for f in sorted(candidatas):
        for e in baixar_palavra(f):
            pos = e.get('pos')
            for s in e.get('senses', []):
                for alvo in s.get('form_of') or []:
                    marcas = tuple(t for t in s.get('tags', []) if t != 'form-of')
                    chave = (alvo.get('word'), pos, marcas)
                    if chave not in vistos:
                        vistos.add(chave)
                        saida.append({'lema': alvo.get('word'), 'pos': pos, 'marcas': list(marcas)})
            # sem «form_of»: a palavra invariável (et, in, non) é o próprio lema, e o pronome
            # («me») traz o caso só na glosa: «accusative singular of ego»
            if not any(s.get('form_of') for s in e.get('senses', [])) and latim.chave(e.get('word', '')) == latim.chave(f):
                for s in e.get('senses', []):
                    for g in s.get('glosses', []):
                        m = RE_GLOSA.search(g)
                        if m:
                            marcas = tuple(m.group(1).split('/')) + (m.group(2),)
                            chave = (m.group(3), pos, marcas)
                            if chave not in vistos:
                                vistos.add(chave)
                                saida.append({'lema': m.group(3), 'pos': pos, 'marcas': list(marcas)})
                no_quadro = any(latim.chave(fx.get('form', '')) == latim.chave(f) and 'canonical' not in fx.get('tags', [])
                                for fx in e.get('forms', []))
                if not no_quadro:
                    chave = (e.get('word'), pos, ())
                    if chave not in vistos:
                        vistos.add(chave)
                        saida.append({'lema': e.get('word'), 'pos': pos, 'marcas': []})
            # a própria forma do dicionário: a que o quadro de formas marca igual à palavra
            for fx in e.get('forms', []):
                if latim.chave(fx.get('form', '')) == latim.chave(f) and 'canonical' not in fx.get('tags', []):
                    marcas = tuple(fx.get('tags', []))
                    chave = (e.get('word'), pos, marcas)
                    if chave not in vistos:
                        vistos.add(chave)
                        saida.append({'lema': e.get('word'), 'pos': pos, 'marcas': list(marcas)})
    return saida


def separar(palavra):
    """A palavra em partes: «virumque» → ['virum', '-que']; «vobiscum» → ['vobis', 'cum'];
    o resto fica como está. Só separa a enclítica quando a palavra inteira não tem análise e a
    raiz tem (assim «atque», «quoque», «itaque» ficam inteiros)."""
    k = latim.chave(palavra)
    com_cum = {latim.chave(a): b for a, b in COM_CUM.items()}
    if k in com_cum:
        corte = len(com_cum[k])
        return [palavra[:corte], palavra[corte:]]
    for enc in ENCLITICAS:
        if k.endswith(enc) and len(k) > len(enc) + 1 and not analisar(palavra):
            raiz = palavra[:-len(enc)]
            if analisar(raiz):
                return [raiz, '-' + enc]
    return [palavra]


def formas_do_lema(lema):
    """{pos: [(forma com mácron, [marcas])]} — o quadro de formas de cada classe do lema."""
    saida = {}
    for e in baixar_palavra(lema):
        if any(s.get('form_of') for s in e.get('senses', [])):
            continue
        lista = saida.setdefault(e.get('pos'), [])
        for fx in e.get('forms', []):
            lista.append((fx.get('form'), fx.get('tags', [])))
    return saida


def glosas(lema):
    """As glosas inglesas do lema, por classe (para conferir o sentido, não para copiar)."""
    saida = {}
    for e in baixar_palavra(lema):
        for s in e.get('senses', []):
            if s.get('form_of'):
                continue
            saida.setdefault(e.get('pos'), []).extend(s.get('glosses', []))
    return saida


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    comando, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('', [])
    args = [a.strip() for a in args if a.strip()]
    if comando == 'analisar':
        for forma in args:
            try:
                print(forma, json.dumps(analisar(forma), ensure_ascii=False))
            except Exception as e:  # uma palavra que falha não para as outras
                print(forma, 'ERRO', repr(e))
    elif comando == 'separar':
        for forma in args:
            print(forma, separar(forma))
    elif comando == 'lema':
        for lema in args:
            print(lema, json.dumps(formas_do_lema(lema), ensure_ascii=False))
    elif comando == 'baixar':
        lista = [w for w in Path(args[0]).read_text(encoding='utf-8').split() if w]
        for i, palavra in enumerate(lista, 1):
            baixar_palavra(palavra)
            if i % 50 == 0:
                print(f'{i}/{len(lista)}')
        print(f'{len(lista)} palavras no cache')
    else:
        print(__doc__)
        sys.exit(1)
