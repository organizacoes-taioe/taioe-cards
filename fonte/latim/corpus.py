"""A biblioteca de apoio do latim, cortada em frases (cards/LATIM.md §7).

    python -I fonte/latim/corpus.py vulgata     # a Vulgata Clementina, frase a frase
    python -I fonte/latim/corpus.py classicos   # os clássicos do Perseus (canonical-latinLit)
    python -I fonte/latim/corpus.py baixar-classicos   # baixa os clássicos no commit de fontes.json
    python -I fonte/latim/corpus.py contar      # quantas frases e palavras, por fonte

O corpus fica em fonte/latim/corpus/ e o resultado em fonte/latim/cache/frases.jsonl, os dois fora
do git; fonte/latim/fontes.json diz de onde veio cada arquivo. Cada linha do resultado:
{"fonte": "vulgata", "ref": "Gn 1,3", "texto": "Fiat lux.", "n": 2, "completa": true}

A frase é o trecho entre dois sinais de pausa forte (. : ; ? !) dentro do versículo. Trecho que
acaba sem um deles (o versículo que continua no seguinte) sai com "completa": false.
Os clássicos (pedido do Gere, 22/10: as frases de uso meio a meio entre a Vulgata e os autores
clássicos) vêm do TEI do Perseus, em fonte/latim/corpus/perseus-latinlit/data/<autor>/<obra>/: o
texto de cada <p> e de cada <l>, sem notas nem títulos; os versos de um mesmo poema se juntam
antes do corte, e a frase leva a referência do verso em que começa. Cada linha sai com
"fonte": "classicos" e "autor".
Os arquivos baixados são dado, não código: este script só os lê (o XML é lido pelo
xml.etree, sem entidades externas).
"""

import hashlib
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latim  # noqa: E402

AQUI = Path(__file__).resolve().parent
CORPUS = AQUI / 'corpus'
CACHE = AQUI / 'cache'
SAIDA = CACHE / 'frases.jsonl'

RE_VERSO = re.compile(r'^([1-3]?[A-Z]{2,3}) (\d+):(\d+) (.*)$')
RE_CORTE = re.compile(r'(?<=[.:;?!])\s+')


def frases_do_versiculo(texto):
    for pedaco in RE_CORTE.split(texto):
        pedaco = pedaco.strip()
        if pedaco:
            yield pedaco


def vulgata():
    arquivo = CORPUS / 'vulgata-clementina' / 'latVUC_vpl.txt'
    saida = []
    for linha in arquivo.read_text(encoding='utf-8').splitlines():
        m = RE_VERSO.match(linha)
        if not m:
            continue
        livro, cap, ver, texto = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        if livro not in latim.LIVROS:
            continue
        ref = latim.referencia(livro, cap, ver)
        for frase in frases_do_versiculo(latim.grafia(texto)):
            n = len(latim.palavras(frase))
            if not n:
                continue
            saida.append({'fonte': 'vulgata', 'ref': ref, 'texto': frase, 'n': n,
                          'completa': frase[-1] in '.:;?!'})
    return saida


# autor (código PHI) → nome em português; obra → título em português (o que não está aqui fica
# com o título latino do Perseus)
AUTORES = {'phi0448': 'César', 'phi0474': 'Cícero', 'phi0472': 'Catulo', 'phi0690': 'Vergílio',
           'phi0959': 'Ovídio', 'phi0893': 'Horácio', 'phi1017': 'Sêneca', 'phi0975': 'Fedro',
           'phi1294': 'Marcial', 'phi0914': 'Lívio', 'phi0588': 'Cornélio Nepos', 'phi1348': 'Suetônio',
           'phi0134': 'Terêncio'}
OBRAS = {'phi0448.phi001': 'Guerra das Gálias', 'phi0474.phi013': 'Catilinárias',
         'phi0474.phi051': 'Da velhice', 'phi0474.phi052': 'Da amizade', 'phi0474.phi055': 'Dos deveres',
         'phi0474.phi049': 'Tusculanas', 'phi0474.phi056': 'Cartas aos amigos', 'phi0474.phi057': 'Cartas a Ático',
         'phi0474.phi035': 'Filípicas', 'phi0474.phi037': 'Do orador', 'phi0474.phi023': 'Contra Vatínio',
         'phi0474.phi058': 'Cartas ao irmão Quinto', 'phi0474.phi059': 'Cartas a Bruto', 'phi0474.phi043': 'Da república', 'phi0474.phi044': 'Das leis',
         'phi0474.phi050': 'Da natureza dos deuses', 'phi0474.phi048': 'Dos fins',
         'phi0472.phi001': '', 'phi0690.phi001': 'Bucólicas', 'phi0690.phi002': 'Geórgicas',
         'phi0690.phi003': 'Eneida', 'phi0959.phi001': 'Amores', 'phi0959.phi002': 'Heroides',
         'phi0959.phi004': 'Arte de amar', 'phi0959.phi006': 'Metamorfoses', 'phi0959.phi007': 'Fastos',
         'phi0959.phi008': 'Tristes', 'phi0959.phi009': 'Pônticas', 'phi0893.phi001': 'Odes',
         'phi0893.phi003': 'Epodos', 'phi0893.phi004': 'Sátiras', 'phi0893.phi005': 'Epístolas',
         'phi0893.phi006': 'Arte poética', 'phi1017.phi015': 'Cartas a Lucílio',
         'phi1017.phi013': 'Dos benefícios', 'phi1017.phi014': 'Da clemência', 'phi1017.phi004': 'Medeia',
         'phi0975.phi001': 'Fábulas', 'phi1294.phi002': 'Epigramas', 'phi0914.phi001': 'História de Roma',
         'phi1348.abo011': 'Vida de César', 'phi1348.abo012': 'Vida de Augusto'}
# a obra sem livros: o primeiro número é o poema («Catulo 85,1»), e não vai em romano
SEM_LIVROS = {'phi0472.phi001'}
TEI = '{http://www.tei-c.org/ns/1.0}'
FORA = {'note', 'head', 'bibl', 'del', 'gap', 'label', 'ref', 'figure', 'speaker'}
ROMANOS = [(1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'), (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
           (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]


def romano(n):
    if not n.isdigit() or not 0 < int(n) < 4000:
        return n
    n, saida = int(n), ''
    for v, r in ROMANOS:
        while n >= v:
            saida, n = saida + r, n - v
    return saida


def texto_de(el):
    """O texto do elemento, sem o que está dentro de nota, título e afins."""
    partes = []
    if el.text:
        partes.append(el.text)
    for filho in el:
        if filho.tag.replace(TEI, '') not in FORA:
            partes.append(texto_de(filho))
        if filho.tail:
            partes.append(filho.tail)
    return ''.join(partes)


def rotulo(autor, obra, ns, livros=True):
    """«Horácio, Odes I,11»: o livro em romano quando há mais de um nível."""
    # fica o número (com a letra de verso partido, «91c»); o prólogo ganha o nome; o nível que é
    # só nome (as «elegies» do Catulo) sai
    ns = ['prólogo' if n in ('pr', 'prologus') else n for n in ns if n]
    ns = [n for n in ns if n == 'prólogo' or re.match(r'^\d+[a-z]?$', n)]
    if livros and len(ns) >= 2:
        ns = [romano(ns[0])] + ns[1:]
    num = ','.join(ns)
    return (autor + (', ' + obra if obra else '') + (' ' + num if num else '')).strip()


def blocos(div, ns, saida):
    """Percorre os textparts: cada <p> é um bloco; os <l> seguidos de um mesmo div, outro."""
    versos = []
    for filho in div:
        nome = filho.tag.replace(TEI, '')
        if nome == 'div':
            if versos:
                saida.append(versos)
                versos = []
            # o nível «part» do Lívio (as décadas) não entra na referência
            nivel = [] if filho.get('subtype') in ('part', 'index') else [filho.get('n') or '']
            blocos(filho, ns + nivel, saida)
        elif nome == 'l':
            versos.append((ns + [filho.get('n') or ''], texto_de(filho)))
        elif nome == 'lg':
            for l in filho.iter(TEI + 'l'):
                versos.append((ns + [l.get('n') or ''], texto_de(l)))
        elif nome == 'p':
            if versos:
                saida.append(versos)
                versos = []
            saida.append([(ns, texto_de(filho))])
        elif nome == 'sp':
            for x in filho:
                if x.tag.replace(TEI, '') == 'l':
                    versos.append((ns + [x.get('n') or ''], texto_de(x)))
                elif x.tag.replace(TEI, '') == 'p':
                    saida.append([(ns, texto_de(x))])
    if versos:
        saida.append(versos)


def classicos():
    base = CORPUS / 'perseus-latinlit' / 'data'
    saida = []
    for arq in sorted(base.glob('*/*/*.perseus-lat2.xml')):
        autor_cod, obra_cod = arq.parent.parent.name, arq.parent.name
        autor = AUTORES.get(autor_cod)
        if not autor:
            continue
        chave_obra = autor_cod + '.' + obra_cod
        obra = OBRAS.get(chave_obra)
        if obra is None:
            m = re.search(r'<ti:title[^>]*>([^<]+)', (arq.parent / '__cts__.xml').read_text(encoding='utf-8'))
            obra = m.group(1).strip() if m else ''
        corpo = ET.parse(arq).getroot().find('.//' + TEI + 'body')
        if corpo is None:
            continue
        edicao = corpo.find(TEI + 'div')
        lista = []
        blocos(edicao if edicao is not None else corpo, [], lista)
        for bloco in lista:
            # junta o bloco e lembra onde começa cada pedaço, para dar a referência da frase
            texto, inicios = '', []
            for ns, t in bloco:
                t = latim.grafia(t)
                if not t:
                    continue
                inicios.append((len(texto), ns))
                texto += t + ' '
            pos = 0
            for frase in frases_do_versiculo(texto):
                achado = texto.find(frase, pos)
                pos = achado + len(frase) if achado >= 0 else pos
                ns = next((n for i, n in reversed(inicios) if i <= max(achado, 0)), inicios[0][1] if inicios else [])
                n = len(latim.palavras(frase))
                # sem número de livro, capítulo ou verso é o aparato da edição (siglas, prefácio)
                if not n or not any(ns):
                    continue
                saida.append({'fonte': 'classicos', 'autor': autor, 'ref': rotulo(autor, obra, ns, chave_obra not in SEM_LIVROS),
                              'texto': frase, 'n': n, 'completa': frase[-1] in '.:;?!'})
    return saida


PERSEUS = 'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/'
ARVORE = 'https://api.github.com/repos/PerseusDL/canonical-latinLit/git/trees/{}?recursive=1'


def baixar_classicos():
    """Baixa, no commit que fontes.json registra, o texto latino (perseus-lat2) e o __cts__.xml de
    cada obra dos autores de AUTORES (do Lívio, só a obra 001), e confere o sha256 do conjunto."""
    fonte = next(f for f in json.loads((AQUI / 'fontes.json').read_text(encoding='utf-8'))['fontes']
                 if f['pasta'] == 'perseus-latinlit')
    commit = fonte['commit']
    with urllib.request.urlopen(ARVORE.format(commit), timeout=60) as r:
        arvore = json.loads(r.read().decode('utf-8'))['tree']
    caminhos = sorted(x['path'] for x in arvore if x['path'].endswith('.xml') and x['path'].count('/') == 3
                      and x['path'].split('/')[1] in AUTORES
                      and (x['path'].endswith('__cts__.xml') or x['path'].endswith('.perseus-lat2.xml'))
                      and not (x['path'].split('/')[1] == 'phi0914' and x['path'].split('/')[2] != 'phi001'))
    pasta = CORPUS / 'perseus-latinlit'
    for c in caminhos:
        destino = pasta / c
        if not destino.exists():
            destino.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(PERSEUS + commit + '/' + c, timeout=60) as r:
                destino.write_bytes(r.read())
    return caminhos, soma(pasta, caminhos)


def soma(pasta, caminhos):
    """O sha256 do conjunto: o de cada arquivo, na ordem dos caminhos, numa linha cada."""
    h = hashlib.sha256()
    for c in caminhos:
        h.update((hashlib.sha256((pasta / c).read_bytes()).hexdigest() + '  ' + c + '\n').encode('utf-8'))
    return h.hexdigest()


def gravar(registros, fonte):
    CACHE.mkdir(exist_ok=True)
    antigos = []
    if SAIDA.exists():
        with SAIDA.open(encoding='utf-8') as f:
            antigos = [json.loads(l) for l in f if l.strip()]
    novos = [r for r in antigos if r['fonte'] != fonte] + registros
    with SAIDA.open('w', encoding='utf-8', newline='\n') as f:
        for r in novos:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    return len(registros), len(novos)


def contar():
    por = {}
    with SAIDA.open(encoding='utf-8') as f:
        for l in f:
            r = json.loads(l)
            d = por.setdefault(r['fonte'], [0, 0, 0])
            d[0] += 1
            d[1] += r['n']
            if r['completa'] and r['n'] <= 10:
                d[2] += 1
    for fonte, (frases, palavras, curtas) in sorted(por.items()):
        print(f'{fonte}: {frases} frases, {palavras} palavras, {curtas} completas de até 10 palavras')


if __name__ == '__main__':
    comando = sys.argv[1] if len(sys.argv) > 1 else ''
    if comando == 'vulgata':
        n, total = gravar(vulgata(), 'vulgata')
        print(f'vulgata: {n} frases (o arquivo tem {total})')
    elif comando == 'classicos':
        n, total = gravar(classicos(), 'classicos')
        print(f'clássicos: {n} frases (o arquivo tem {total})')
    elif comando == 'baixar-classicos':
        caminhos, sha = baixar_classicos()
        print(f'{len(caminhos)} arquivos; sha256 do conjunto: {sha}')
    elif comando == 'contar':
        contar()
    else:
        print(__doc__)
        sys.exit(1)
