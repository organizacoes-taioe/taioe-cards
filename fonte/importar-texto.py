"""Traz um poema da Biblioteca para os Cards (PLANO.md, seção 9).

    python fonte/importar-texto.py <pasta-da-biblioteca> <pasta-do-poema> [--fila N]

Lê edicoes/lingua-original/<pasta>/poema.txt e glossario.json pela própria ferramenta da
Biblioteca (ferramentas/lingua_original.py: a mesma divisão em palavras e as mesmas chaves) e
grava fonte/textos/<língua>/<autor>--<pasta>.json:

  - «blocos»: as estrofes; cada verso é {t: o texto, p: [[pedaço, chave | null], ...]};
  - «destinos»: chave → {lema, classe, forma, def, wiki, ...} e o destino da palavra:
      card: "<id>"        a palavra tem card (o lema está na lista de frequência com card)
      card: "+<lema>"     falta o card; com «leitura»: true, é card de leitura (fora da lista)
      g: "gramatical"     artigo, preposição, conjunção, pronome sem card: aprende-se nas frases
      g: "nome"           nome próprio
    e, nas palavras sem card, «defEs»/«defEn» para os públicos que não leem português.

Rodar de novo preserva o que foi decidido à mão em cada chave (card, g, leitura, defEs, defEn,
conferir) e refaz o resto a partir da Biblioteca. «conferir» marca o que o automático não
garante (lema com mais de um card, homógrafo): ler e apagar a marca.
"""

import importlib.util
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
COLUNA = {'es': 'es', 'en': 'en', 'fr': 'fr', 'pt': 'pt'}
ARTIGO = {
    'es': re.compile(r'^(el|la|los|las)\s+', re.I),
    'en': re.compile(r'^(the|to)\s+', re.I),
    'fr': re.compile(r"^(le\s+|la\s+|les\s+|l['’])", re.I),
    'pt': re.compile(r'^(o|a|os|as)\s+', re.I),
}
GRAMATICAL = re.compile(r'artigo|preposi|conjun|pronome|contra[cç]|interjei|determinante|numeral', re.I)
PROPRIO = re.compile(r'pr[óo]prio', re.I)
MANUAIS = ('card', 'g', 'leitura', 'defEs', 'defEn', 'conferir', 'cards')


def carregar_biblioteca(raiz):
    arq = os.path.join(raiz, 'ferramentas', 'lingua_original.py')
    spec = importlib.util.spec_from_file_location('lingua_original', arq)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def ler_lista(lingua):
    linhas = open(os.path.join(AQUI, 'frequencia', lingua + '.tsv'), encoding='utf-8').read().splitlines()
    cab = linhas[0].split('\t')
    i_w, i_c, i_cl = cab.index(COLUNA[lingua]), cab.index('cards'), cab.index('classe')
    lista = {}
    for l in linhas[1:]:
        r = l.split('\t')
        w = ARTIGO[lingua].sub('', r[i_w]).strip().lower()
        cards = [c for c in (r[i_c] if len(r) > i_c else '').split(',') if c]
        lista.setdefault(w, []).append({'classe': r[i_cl], 'cards': cards, 'pos': int(r[0])})
    return lista


def mesma_classe(a, b):
    a, b = (a or '').lower(), (b or '').lower()
    for k in ('subst', 'verbo', 'adjet', 'advérb', 'prepos', 'conjun', 'pronom', 'artigo', 'numer', 'interj'):
        if k in a and k in b:
            return True
    return False


def destino_automatico(v, lista):
    """O destino de um verbete (ou de uma parte de palavra composta) pela lista de frequência."""
    lema = (v.get('lema') or '').strip()
    classe = v.get('classe') or ''
    if PROPRIO.search(classe):
        return {'g': 'nome'}
    linhas = lista.get(lema.lower(), [])
    if not linhas and lema[:1].isupper():
        linhas = lista.get(lema.lower(), [])
    if linhas:
        certas = [x for x in linhas if mesma_classe(x['classe'], classe)] or linhas
        com_card = [x for x in certas if x['cards']]
        if com_card:
            d = {'card': com_card[0]['cards'][0]}
            if len(com_card) > 1 or len(com_card[0]['cards']) > 1:
                d['conferir'] = 'mais de um card: ' + ', '.join(c for x in com_card for c in x['cards'])
            return d
        if GRAMATICAL.search(classe):
            return {'g': 'gramatical'}
        return {'card': '+' + lema}
    if GRAMATICAL.search(classe):
        return {'g': 'gramatical'}
    return {'card': '+' + lema, 'leitura': True}


def main():
    a = sys.argv[1:]
    fila = None
    if '--fila' in a:
        i = a.index('--fila')
        fila = int(a[i + 1])
        del a[i:i + 2]
    if len(a) != 2:
        sys.exit(__doc__)
    raiz, pasta = a
    lo = carregar_biblioteca(raiz)
    poema = lo.achar(pasta)
    lingua = poema['lingua']
    glos = lo.ler_glossario(pasta)
    if not glos:
        sys.exit('o poema ainda não tem glossario.json na Biblioteca')
    verbetes, ocorr = glos['verbetes'], glos.get('ocorrencias', {})
    lista = ler_lista(lingua)

    # os versos, com as palavras, em estrofes (linha em branco separa); título e marcas ficam fora
    bruto = lo.ler_texto(pasta).split('\n')
    por_indice = {i: (n, t) for (n, t, i, d) in lo.linhas_do_poema(poema) if isinstance(i, int)}
    blocos, atual, usadas = [], [], []
    for i, l in enumerate(bruto):
        if not l.strip():
            if atual:
                blocos.append(atual)
                atual = []
            continue
        if l.startswith('::') or i not in por_indice:
            continue
        n, texto = por_indice[i]
        p, ini = [], 0
        for k, (x, y) in enumerate(lo.separar(texto, lingua), 1):
            if x > ini:
                p.append([texto[ini:x], None])
            ch = ocorr.get('%s.%d' % (n, k), lo.chave(texto[x:y]))
            if ch not in verbetes:
                sys.exit('o glossário não tem a chave «%s» (verso %s)' % (ch, n))
            p.append([texto[x:y], ch])
            usadas.append(ch)
            ini = y
        if ini < len(texto):
            p.append([texto[ini:], None])
        atual.append({'t': texto, 'p': p})
    if atual:
        blocos.append(atual)

    autor = poema['autor']
    nome_autor = autor
    arq_autores = os.path.join(raiz, 'conteudo', 'autores.js')
    if os.path.exists(arq_autores):
        m = re.search(r"id: '%s',\s*nome: '((?:[^'\\]|\\.)*)'" % re.escape(autor), open(arq_autores, encoding='utf-8').read())
        if m:
            nome_autor = m.group(1).replace("\\'", "'")
    saida_dir = os.path.join(AQUI, 'textos', lingua)
    os.makedirs(saida_dir, exist_ok=True)
    arq = os.path.join(saida_dir, '%s--%s.json' % (autor, pasta))
    antes = json.load(open(arq, encoding='utf-8')) if os.path.exists(arq) else {}
    antigos = antes.get('destinos', {})

    destinos = {}
    for ch in dict.fromkeys(usadas):
        v = verbetes[ch]
        d = {}
        if v.get('partes'):
            d['partes'] = []
            for parte in v['partes']:
                x = {k: parte[k] for k in ('lema', 'classe', 'forma', 'def') if parte.get(k)}
                x.update(destino_automatico(parte, lista))
                d['partes'].append(x)
        else:
            d.update({k: v[k] for k in ('lema', 'classe', 'forma', 'def') if v.get(k)})
            d.update(destino_automatico(v, lista))
        if v.get('wiki') is not None or 'wiki' not in v:
            d['wiki'] = lo.url_wiki(v.get('wiki') or lingua, v.get('lema') or '', lingua) if v.get('lema') else None
            if not d['wiki']:
                del d['wiki']
        velho = antigos.get(ch, {})
        if velho.get('manual'):
            for k in ('card', 'g', 'leitura', 'conferir', 'partes'):
                d.pop(k, None)
            for k in MANUAIS + ('partes', 'manual'):
                if k in velho:
                    d[k] = velho[k]
        else:
            for k in ('defEs', 'defEn'):
                if k in velho:
                    d[k] = velho[k]
        destinos[ch] = d

    titulo = poema['titulo']
    saida = {
        'id': autor + '/' + pasta,
        'idioma': lingua,
        'tipo': 'poema',
        'titulo': titulo,
        'autor': nome_autor,
        'ano': poema.get('ano'),
        'biblioteca': '/biblioteca/%s/%s/' % (autor, pasta),
        'fonte': (poema.get('fontes') or [{}])[0].get('url'),
    }
    if fila is not None or 'fila' in antes:
        saida['fila'] = fila if fila is not None else antes['fila']
    saida['blocos'] = blocos
    saida['destinos'] = destinos
    with open(arq, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
        f.write('\n')

    falta = sorted({d['card'] for d in destinos.values() if str(d.get('card', ''))[:1] == '+'} |
                   {p['card'] for d in destinos.values() for p in d.get('partes', []) if str(p.get('card', ''))[:1] == '+'})
    leitura = sorted({d['card'] for d in destinos.values() if d.get('leitura')})
    conferir = [ch for ch, d in destinos.items() if d.get('conferir')]
    print('%s: %d versos, %d chaves; %d com card, %d por fazer (%d de leitura), %d gramaticais, %d nomes, %d a conferir' % (
        os.path.relpath(arq, AQUI), sum(len(b) for b in blocos), len(destinos),
        sum(1 for d in destinos.values() if d.get('card') and d['card'][0] != '+'),
        len(falta), len(leitura),
        sum(1 for d in destinos.values() if d.get('g') == 'gramatical'),
        sum(1 for d in destinos.values() if d.get('g') == 'nome'), len(conferir)))


if __name__ == '__main__':
    main()
