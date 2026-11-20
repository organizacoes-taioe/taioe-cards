"""Confere a saída dos agentes antes de montar os cards (RARAS.md §4).

  python3 -I fonte/raras/verificar.py <pasta de trabalho> [--morphobr <lista>] [--json saida.json]

Lê lotes/lote-*.json e lotes/saida-*.jsonl. Acusa, por palavra: campo faltando; a régua de
formato do build (a certa com mais de uma palavra além da maior errada, ou mais de uma aquém da
menor; «/», «;» e parêntese só de um lado); errada repetida ou igual à certa; mesóclise; palavra
das alternativas de escrever e de uso que não existe no MorphoBr; a frase de uso que não é,
letra por letra, uma das frases do lote (com a resposta no lugar da lacuna).
"""
import glob
import json
import os
import re
import sys

MESOCLISE = re.compile(r"[A-Za-zÀ-ÿ]+-(lo|la|los|las|o|a|os|as|me|te|se|lhe|lhes|nos|vos|no|na)-(ei|as|á|ás|emos|eis|ão|ia|ias|íamos|íeis|iam)([^A-Za-zÀ-ÿ]|$)")
PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")


def n_pal(t):
    return len(PAL.findall(t))


def formato(certa, erradas):
    erros = []
    nc = n_pal(certa)
    ns = [n_pal(e) for e in erradas]
    if ns and nc > max(ns) + 1:
        erros.append('certa longa (%d contra no máximo %d)' % (nc, max(ns)))
    if ns and nc < min(ns) - 1:
        erros.append('certa curta (%d contra no mínimo %d)' % (nc, min(ns)))
    for sinal in ('/', ';', '('):
        c = certa.count(sinal)
        iguais = sum(1 for e in erradas if e.count(sinal) == c)
        if iguais < 3:
            erros.append('«%s»: a certa tem %d, as erradas %s' % (sinal, c, [e.count(sinal) for e in erradas]))
    low = [e.strip().lower() for e in erradas]
    if len(set(low)) < len(low):
        erros.append('errada repetida')
    if certa.strip().lower() in low:
        erros.append('errada igual à certa')
    return erros


def main():
    args = sys.argv[1:]
    trab = args[0]
    morpho = os.path.join(trab, 'dados', 'morphobr.txt')
    if '--morphobr' in args:
        morpho = args[args.index('--morphobr') + 1]
    lotes = {}
    for f in glob.glob(os.path.join(trab, 'lotes', 'lote-*.json')):
        for x in json.load(open(f, encoding='utf-8')):
            lotes[(x['obra'], x['lema'])] = x
    saidas = []
    for f in sorted(glob.glob(os.path.join(trab, 'lotes', 'saida-*.jsonl'))):
        rev = f.replace('saida-', 'revisada-')
        if os.path.exists(rev):
            f = rev
        for linha in open(f, encoding='utf-8'):
            if linha.strip():
                saidas.append((os.path.basename(f), json.loads(linha)))
    precisa = set()
    for _, a in saidas:
        for chave in ('escrever', 'uso'):
            b = a.get(chave) or {}
            for w in b.get('distratores', []) + ([b['resposta']] if b.get('resposta') else []):
                precisa.update(t.lower() for t in PAL.findall(w))
    existe = set()
    if os.path.exists(morpho):
        with open(morpho, encoding='utf-8') as fh:
            for linha in fh:
                w = linha.rstrip('\n')
                if w in precisa:
                    existe.add(w)
    problemas = {}
    for arq, a in saidas:
        k = (a.get('obra'), a.get('lema'))
        p = []
        if k not in lotes:
            p.append('palavra que não está nos lotes')
        if a.get('excluir'):
            continue
        for campo in ('marca', 'pt', 'distratores', 'nota', 'nivel'):
            if not a.get(campo):
                p.append('falta ' + campo)
        if len(a.get('distratores') or []) != 4:
            p.append('sentido: não são 4 erradas')
        else:
            p += ['sentido: ' + e for e in formato(a['pt'], a['distratores'])]
        tudo = json.dumps(a, ensure_ascii=False)
        if MESOCLISE.search(tudo):
            p.append('mesóclise: ' + MESOCLISE.search(tudo).group(0))
        if a.get('marca') == 'viva':
            e = a.get('escrever')
            if not e:
                p.append('viva sem escrever')
            else:
                if len(e.get('distratores') or []) != 4:
                    p.append('escrever: não são 4 erradas')
                for w in e.get('distratores', []):
                    if existe and any(t.lower() not in existe for t in PAL.findall(w)):
                        p.append('escrever: «%s» não está no MorphoBr' % w)
                    if w.lower() == a['lema'].lower():
                        p.append('escrever: a errada é a própria palavra')
            u = a.get('uso')
            if u:
                if len(u.get('distratores') or []) != 4:
                    p.append('uso: não são 4 erradas')
                if '___' not in u.get('frase', ''):
                    p.append('uso: frase sem lacuna')
                else:
                    cheia = u['frase'].replace('___', u.get('resposta', ''))
                    pedacos = [x.strip() for x in cheia.split('…') if x.strip()]
                    fontes = [f['frase'] for f in (lotes.get(k) or {}).get('frases_de_outras_obras', [])]
                    if not any(all(pd in f for pd in pedacos) for f in fontes):
                        p.append('uso: a frase não é nenhuma das do lote')
                for w in u.get('distratores', []):
                    if existe and any(t.lower() not in existe for t in PAL.findall(w)):
                        p.append('uso: «%s» não está no MorphoBr' % w)
                p += ['uso: ' + e for e in formato(u.get('resposta', ''), u.get('distratores', [])) if 'certa' not in e]
        if p:
            problemas[arq + ' ' + str(k[0]) + '|' + str(k[1])] = p
    faltam = [k for k in lotes if k not in {(a.get('obra'), a.get('lema')) for _, a in saidas}]
    for k, p in problemas.items():
        print(k)
        for x in p:
            print('   ' + x)
    print('%d palavras gravadas, %d com problema; %d sem saída' % (len(saidas), len(problemas), len(faltam)))
    if '--json' in args:
        json.dump(problemas, open(args[args.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
