"""Mais frases reais, do Wikisource em português, para as palavras com poucas (RARAS.md §6).

  python3 -I fonte/raras/wikisource.py <frases.json> <cache/> [--minimo 3]

Para cada palavra de <frases.json> (de lista.py) com menos de --minimo frases: busca a palavra no
pt.wikisource.org (textos em domínio público, leis incluídas), lê o wikitexto das páginas achadas
e acrescenta as frases de 6 a 40 palavras que a contêm, com o autor (do cabeçalho) e o título da
página, no máximo duas por página. Grava de volta em <frases.json>; o que baixa fica em <cache/>.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.error
import urllib.request

API = 'https://pt.wikisource.org/w/api.php'
UA = {'User-Agent': 'taioe-cards-corpus/1.0 (frases de exemplo; uso educacional)'}
PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")


def pedir(params, cache):
    q = urllib.parse.urlencode(dict(params, format='json', formatversion=2))
    f = os.path.join(cache, hashlib.sha1(q.encode()).hexdigest() + '.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    for tentativa in range(6):
        time.sleep(2)
        try:
            with urllib.request.urlopen(urllib.request.Request(API + '?' + q, headers=UA), timeout=30) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or tentativa == 5:
                raise
            time.sleep(int(e.headers.get('Retry-After') or 30) + 5)
    json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
    return d


def limpar(wt):
    wt = re.sub(r"<ref[^>]*/>|<ref.*?</ref>", ' ', wt, flags=re.S)
    wt = re.sub(r"\{\{[^{}]*\}\}", ' ', wt)
    wt = re.sub(r"\{\{[^{}]*\}\}", ' ', wt)
    wt = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r'\1', wt)
    wt = re.sub(r"<[^>]+>", ' ', wt)
    wt = re.sub(r"'{2,}", '', wt)
    wt = re.sub(r"^[=*#:;].*$", ' ', wt, flags=re.M)
    return wt


def main():
    args = sys.argv[1:]
    minimo = 3
    if '--minimo' in args:
        i = args.index('--minimo')
        minimo = int(args[i + 1])
        del args[i:i + 2]
    f_frases, cache = args
    os.makedirs(cache, exist_ok=True)
    frases = json.load(open(f_frases, encoding='utf-8'))
    for p, lst in frases.items():
        if len(lst) >= minimo:
            continue
        base = p[:-3] if p.endswith('-se') else p
        rx = re.compile(r"(?<![^\W\d_])" + re.escape(base) + r"\w{0,4}(?![^\W\d_])", re.I)
        busca = pedir({'action': 'query', 'list': 'search', 'srsearch': '"' + base + '"', 'srlimit': 12,
                       'srnamespace': 0}, cache)
        titulos = [h['title'] for h in busca.get('query', {}).get('search', [])]
        novas = 0
        ja = {x['frase'] for x in lst}
        paginas = {}
        if titulos:
            pg = pedir({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                        'titles': '|'.join(titulos)}, cache)
            for x in pg.get('query', {}).get('pages', []):
                try:
                    paginas[x['title']] = x['revisions'][0]['slots']['main']['content']
                except (KeyError, IndexError):
                    pass
        for tit in titulos:
            if len(lst) >= 8:
                break
            wt = paginas.get(tit)
            if not wt:
                continue
            autor = re.search(r"\|\s*autor\s*=\s*([^|\n}]+)", wt)
            autor = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r'\1', autor.group(1)).strip() if autor else ''
            obra = tit.split('/')[0]
            n_pag = 0
            for par in re.split(r"\n\s*\n", limpar(wt)):
                par = re.sub(r"\s+", ' ', par).strip()
                for fr in FIM.split(par):
                    fr = fr.strip()
                    m = rx.search(fr)
                    if not m or fr in ja:
                        continue
                    toks = PAL.findall(fr)
                    if not 6 <= len(toks) <= 40 or n_pag >= 2:
                        continue
                    lst.append({'frase': fr, 'forma': m.group(0).lower(), 'autor': autor, 'titulo': obra, 'ano': None,
                                'n': len(toks), 'gutenberg': False, 'wikisource': tit, 'grafia_antiga': None})
                    ja.add(fr)
                    n_pag += 1
                    novas += 1
        print(p, '+', novas, '=', len(lst), flush=True)
    json.dump(frases, open(f_frases, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sem = [k for k, v in frases.items() if not v]
    print(len(sem), 'ainda sem frase:', ', '.join(sem))


if __name__ == '__main__':
    main()
