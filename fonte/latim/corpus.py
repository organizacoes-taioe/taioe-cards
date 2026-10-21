"""A biblioteca de apoio do latim, cortada em frases (cards/LATIM.md §7).

    python -I fonte/latim/corpus.py vulgata     # a Vulgata Clementina, frase a frase
    python -I fonte/latim/corpus.py contar      # quantas frases e palavras, por fonte

O corpus fica em fonte/latim/corpus/ e o resultado em fonte/latim/cache/frases.jsonl, os dois fora
do git; fonte/latim/fontes.json diz de onde veio cada arquivo. Cada linha do resultado:
{"fonte": "vulgata", "ref": "Gn 1,3", "texto": "Fiat lux.", "n": 2, "completa": true}

A frase é o trecho entre dois sinais de pausa forte (. : ; ? !) dentro do versículo. Trecho que
acaba sem um deles (o versículo que continua no seguinte) sai com "completa": false.
Os arquivos baixados são dado, não código: este script só os lê.
"""

import json
import re
import sys
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
    elif comando == 'contar':
        contar()
    else:
        print(__doc__)
        sys.exit(1)
