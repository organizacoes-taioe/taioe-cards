"""Confere as saídas dos agentes da lista do «Português» (RARAS.md §6; briefs/LISTA.md).

  python3 -I fonte/raras/verificar_lista.py <pasta de trabalho> <morphobr.txt> [N…]

Lê lotes/lote-N.json e lotes/saida-N.jsonl (ou revisada-N.jsonl, se houver) e grava
problemas.json ({"N|palavra": [problemas]}), imprimindo o resumo. Confere: a frase do sentido e a do
uso são do lote (letra por letra, fora os «…» do corte; com grafia atualizada, quase iguais) e
diferentes; a forma está na frase; a lacuna é uma só; quatro erradas diferentes, sem a certa, de
tamanho parecido com a certa; as palavras erradas existem (MorphoBr); nada de mesóclise.
"""
import difflib
import glob
import json
import os
import re
import sys

MESOCLISE = re.compile(r"[A-Za-zÀ-ÿ]+-(lo|la|los|las|o|a|os|as|me|te|se|lhe|lhes|nos|vos|no|na)-(ei|as|á|ás|emos|eis|ão|ia|ias|íamos|íeis|iam)([^A-Za-zÀ-ÿ]|$)")


def norm(s):
    return re.sub(r"\s+", ' ', s.replace('…', ' ')).strip().lower()


def da_lista(frase, frases, atualizada):
    f = norm(frase)
    pedacos = [p.strip() for p in f.split('  ') if p.strip()] or [f]
    for x in frases:
        g = norm(x['frase'])
        if f in g or all(p in g for p in norm(frase).split(' ... ')):
            return True
        if all(p in g for p in [q.strip() for q in re.split(r"\s*…\s*", frase.lower()) if q.strip()]):
            return True
        if atualizada and difflib.SequenceMatcher(None, f, g).ratio() > 0.8:
            return True
        if atualizada and any(difflib.SequenceMatcher(None, p, g).find_longest_match().size > 0.7 * len(p) for p in [f]):
            return True
    return False


def palavras(s):
    return len(re.findall(r"[^\W\d_]+", s))


def main():
    trab, f_morpho, *ns = sys.argv[1:]
    morpho = set(open(f_morpho, encoding='utf-8').read().split('\n'))
    if not ns:
        ns = sorted({re.findall(r'\d+', os.path.basename(f))[0] for f in glob.glob(os.path.join(trab, 'lotes', 'saida-*.jsonl'))}, key=int)
    problemas = {}
    total = 0
    for n in ns:
        lote = {x['p']: x for x in json.load(open(os.path.join(trab, 'lotes', 'lote-' + n + '.json'), encoding='utf-8'))}
        f = os.path.join(trab, 'lotes', 'revisada-' + n + '.jsonl')
        if not os.path.exists(f):
            f = os.path.join(trab, 'lotes', 'saida-' + n + '.jsonl')
        vistas = set()
        for linha in open(f, encoding='utf-8'):
            if not linha.strip():
                continue
            a = json.loads(linha)
            p = a.get('p')
            vistas.add(p)
            pr = []
            if p not in lote:
                pr.append('palavra que não está no lote')
                problemas[n + '|' + str(p)] = pr
                continue
            if a.get('sem_frase') or a.get('excluir'):
                continue
            fr = lote[p]['frases']
            s = a.get('sentido') or {}
            if not s.get('frase'):
                pr.append('sem frase do sentido')
            else:
                if not da_lista(s['frase'], fr, s.get('grafia_atualizada')):
                    pr.append('frase do sentido não é do lote')
                if s.get('forma', '').lower() not in s['frase'].lower():
                    pr.append('a forma não está na frase do sentido')
                if palavras(s['frase']) > 34:
                    pr.append('frase do sentido longa (%d palavras)' % palavras(s['frase']))
            ds = a.get('distratores') or []
            if len(ds) != 4 or len(set(ds)) != 4 or a.get('pt') in ds:
                pr.append('erradas do sentido: não são 4 diferentes')
            elif a.get('pt'):
                tams = [palavras(x) for x in ds]
                c = palavras(a['pt'])
                if c > max(tams) + 1:
                    pr.append('certa longa (%d contra no máximo %d)' % (c, max(tams)))
                if c < min(tams) - 1:
                    pr.append('certa curta (%d contra no mínimo %d)' % (c, min(tams)))
            for campo in (a.get('nota') or '', (a.get('uso') or {}).get('nota') or ''):
                if MESOCLISE.search(campo):
                    pr.append('mesóclise na nota')
            if a.get('marca') == 'viva':
                e = a.get('escrever')
                if not e:
                    pr.append('viva sem escrever')
                else:
                    if len(set(e.get('distratores') or [])) != 4:
                        pr.append('escrever: não são 4 erradas')
                    for w in e.get('distratores') or []:
                        if ' ' not in w and w.lower() not in morpho:
                            pr.append('escrever: «%s» não está no MorphoBr' % w)
                u = a.get('uso')
                if u:
                    if u.get('frase', '').count('___') != 1:
                        pr.append('uso: lacuna não é uma só')
                    else:
                        cheia = u['frase'].replace('___', u.get('resposta', ''))
                        if not da_lista(cheia, fr, u.get('grafia_atualizada')):
                            pr.append('frase do uso não é do lote')
                        if s.get('frase') and difflib.SequenceMatcher(None, norm(cheia), norm(s['frase'])).ratio() > 0.7:
                            pr.append('uso com a mesma frase do sentido')
                    if len(set(u.get('distratores') or [])) != 4 or u.get('resposta') in (u.get('distratores') or []):
                        pr.append('uso: não são 4 erradas diferentes')
                    for w in u.get('distratores') or []:
                        if ' ' not in w and w.lower() not in morpho:
                            pr.append('uso: «%s» não está no MorphoBr' % w)
            if pr:
                problemas[n + '|' + p] = pr
                total += len(pr)
        faltam = set(lote) - vistas
        if faltam:
            problemas[n + '|(faltam)'] = sorted(faltam)
    json.dump(problemas, open(os.path.join(trab, 'problemas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for k, v in problemas.items():
        print(k, '—', '; '.join(v))
    print(len(problemas), 'palavras com problema,', total, 'problemas')


if __name__ == '__main__':
    main()
