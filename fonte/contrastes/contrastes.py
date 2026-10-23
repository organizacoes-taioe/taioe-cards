"""Monta os cards de contraste das línguas vivas (cards/PLANO.md §10; o do latim é o
fonte/latim/contrastes.py).

    python -I fonte/contrastes/contrastes.py fonte/contrastes/cache/levas/es-1.json

A leva traz a língua, os públicos e os conjuntos. Cada conjunto tem as alternativas («opcoes»:
a frase e, se é certa, o «sentido» e as «formas» a conferir; se é errada, o porquê em
«errada»), as palavras com card que ele usa («palavras»: lema → id) e os cards (a frase de
quem estuda e o índice da certa). As alternativas erradas podem ser frases impossíveis: entra
tudo o que confunde com a certa (pedido do Gere, 23/10/2026).

Antes de gravar, confere no Wiktionary (fonte/contrastes/formas.py):
- cada forma anotada é do lema dito, com o tempo, o modo e a pessoa do rótulo;
- toda palavra das alternativas certas existe na língua;
- cada id de «palavras» é o card daquele lema.
Grava fonte/cards/<língua>/<arquivo da leva> com ids <prefixo>k001 em diante.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import formas  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHOS = AQUI.parent / 'cards'
PREFIXO = {'es': '', 'en': 'en-', 'fr': 'fr-', 'pt': 'pt-'}
ARQUIVO = {'es': '33-contrastes.json'}
PALAVRA = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ']+")

TEMPO_MODO = [
    ('presente do indicativo', {'present', 'indicative'}),
    ('presente do subjuntivo', {'present', 'subjunctive'}),
    ('imperfeito do indicativo', {'imperfect', 'indicative'}),
    ('imperfeito do subjuntivo', {'imperfect', 'subjunctive'}),
    ('pretérito', {'preterite'}),
    ('futuro', {'future'}),
    ('condicional', {'conditional'}),
    ('imperativo', {'imperative'}),
    ('infinitivo', {'infinitive'}),
    ('gerúndio', {'gerund'}),
    ('particípio', {'participle'}),
]
PESSOA = {'1ª pessoa': 'first-person', '2ª pessoa': 'second-person', '3ª pessoa': 'third-person'}


def marcas_do_rotulo(rotulo):
    pedidas = set()
    for nome, tags in TEMPO_MODO:
        if rotulo.startswith(nome):
            pedidas |= tags
            break
    else:
        raise SystemExit(f'rótulo que o conferidor não conhece: «{rotulo}»')
    for nome, tag in PESSOA.items():
        if nome in rotulo:
            pedidas.add(tag)
    for n in ('singular', 'plural'):
        if n in rotulo:
            pedidas.add(n)
    return pedidas


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def nota_de(k, certa):
    linhas = [x for x in k['ensina'].split('\n')]
    pares = [x for x in linhas if x[:1] in '🇪🇬🇫🇵🇧🇺' and '→' in x]
    corpo = [x for x in linhas if x not in pares]
    alternativas = []
    for o in k['opcoes']:
        txt = o[k['lingua']].rstrip('.')
        alternativas.append(f'{txt} — {o["sentido"]}.' if 'sentido' in o else f'{txt} — ✗ {o["errada"]}.')
    return '\n'.join(corpo + ['As alternativas:'] + alternativas + pares)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    leva = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    L = leva['lingua']
    saida = BARALHOS / L / ARQUIVO[L]
    baralho = {}
    for arq in sorted((BARALHOS / L).glob('*.json')):
        if arq != saida:
            for c in json.loads(arq.read_text(encoding='utf-8')):
                baralho[c['id']] = c

    problemas = []
    cards, n = [], 0
    for k in leva['conjuntos']:
        k['lingua'] = L
        ops = k['opcoes']
        textos = [o[L] for o in ops]
        if not 4 <= len(ops) <= 5 or len(set(textos)) != len(ops):
            problemas.append(f"{k['id']}: são 4 ou 5 alternativas, todas diferentes")
        for lema, cid in k['palavras'].items():
            c = baralho.get(cid)
            nome = c and sem_acento(re.sub(r'^(el|la|los|las|the|le|la|les|l\'|o|a|os|as|to)\s+', '', c[L].lower()))
            if not c or c['tipo'] != 'palavra' or not nome.startswith(sem_acento(lema)):
                problemas.append(f"{k['id']}: «{lema}» não é o card {cid} ({c and c[L]})")
        for o in ops:
            if 'errada' in o:
                continue
            for w in PALAVRA.findall(o[L]):
                if not formas.analisar(L, w):
                    problemas.append(f"{k['id']}: «{w}» (em «{o[L]}») não está no Wiktionary")
            for forma, lema, rotulo in o.get('formas', []):
                pedidas = marcas_do_rotulo(rotulo)
                analises = [a for a in formas.analisar(L, forma) if a['lema'] == lema]
                if not any(pedidas <= set(a['marcas']) for a in analises):
                    vistas = ['/'.join(a['marcas']) for a in analises] or 'nenhuma análise desse lema'
                    problemas.append(f"{k['id']}: «{forma}» como {rotulo} de {lema}: o Wiktionary dá {vistas}")
        for x in k['cards']:
            if 'errada' in ops[x['certa']]:
                problemas.append(f"{k['id']}: a resposta de «{x['pt']}» é uma alternativa errada")
            n += 1
            o = ops[x['certa']]
            card = {'id': f"{PREFIXO[L]}k{n:03d}", 'tipo': 'contraste', 'conjunto': k['id'],
                    L: o[L], 'pt': x['pt'], 'distratores' + L.capitalize(): [y[L] for y in ops if y is not o],
                    'aceitas': [], 'distratores': [], 'nota': nota_de(k, o), 'nivel': k['nivel'],
                    'tags': ['contraste'], 'requerTodas': list(dict.fromkeys(k['palavras'].values())),
                    'publicos': leva['publicos']}
            cards.append(card)
    if problemas:
        print('\n'.join(problemas))
        raise SystemExit(f'{len(problemas)} problema(s); nada gravado')
    saida.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f"{len(cards)} cards de contraste em {len(leva['conjuntos'])} conjuntos → {saida.relative_to(BARALHOS.parent)}")


if __name__ == '__main__':
    main()
