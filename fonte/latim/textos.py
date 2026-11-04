"""Monta os textos latinos do app (fonte/textos/la/<autor>--<pasta>.json) a partir dos versos anotados.

    python -I fonte/latim/textos.py

No latim, o texto são os versos anotados (fonte/latim/versos.json: o verso e, palavra por palavra,
a forma no texto, o card do lema, o rótulo da forma e a função), e os cards são os trechos (as
frases, que podem atravessar o verso: cortes.py, desde 04/11/2026), com «texto», «linha» (a ordem)
e «versos» (o primeiro e o último que tocam). Daqui sai o texto no formato que o build e o app leem
(PLANO.md, 9.1): os versos em «blocos», cada um com as palavras em «p» e as flexões das formas dele
em «flexoes», e, em «destinos», o que cada chave é (o card do lema, ou «nome» e «gramatical» para o
que não tem card). A Biblioteca tem o mesmo texto com o glossário dela; o endereço vai em
«biblioteca». Os dados de cada texto (título, autor, endereço) ficam em TEXTOS, abaixo.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
DESTINO = AQUI.parent / 'textos' / 'la'
VERSOS = AQUI / 'versos.json'

# «ordem» é a da tela Textos: as orações e os clássicos intercalados (pedido de 22/10: menos
# religioso), do mais curto ao mais difícil
TEXTOS = {
    'oracoes/gloria-patri': {'titulo': 'Gloria Patri', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 1},
    'oracoes/pater-noster': {'titulo': 'Pater Noster', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 4},
    'oracoes/ave-maria': {'titulo': 'Ave Maria', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 5},
    'marcial/non-amo-te': {'titulo': 'Non amo te', 'autor': 'Marcial', 'tipo': 'poema', 'ordem': 2,
                           'fonte': 'Epigramas, livro I, 32'},
    'oracoes/regina-caeli': {'titulo': 'Regina caeli', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 6},
    'catulo/odi-et-amo': {'titulo': 'Odi et amo', 'autor': 'Catulo', 'tipo': 'poema', 'ordem': 3,
                          'fonte': 'Poemas, 85'},
    'fedro/lupus-et-agnus': {'titulo': 'Lupus et agnus', 'autor': 'Fedro', 'tipo': 'poema', 'ordem': 7,
                             'fonte': 'Fábulas, livro I, 1 (os oito primeiros versos)'},
    # texto longo em partes (PLANO.md §9.6): cada parte é um texto, com «obra», «parte» e «trecho»,
    # e todas apontam para a mesma página da Biblioteca
    'vergilio/eneida-parte-1': {'titulo': 'Aeneis', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 8,
                                'fonte': 'Eneida, livro I, 1–7', 'obra': 'vergilio/eneida', 'parte': 1,
                                'trecho': 'I, 1–7', 'biblioteca': '/biblioteca/vergilio/eneida/'},
    'vergilio/eneida-parte-2': {'titulo': 'Aeneis', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 9,
                                'fonte': 'Eneida, livro I, 8–11', 'obra': 'vergilio/eneida', 'parte': 2,
                                'trecho': 'I, 8–11', 'biblioteca': '/biblioteca/vergilio/eneida/'},
    # leva de 03/11/2026: Horácio e o começo da Bucólica IV (o resto da écloga fica para depois)
    'horacio/tu-ne-quaesieris': {'titulo': 'Tu ne quaesieris', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 10,
                                 'fonte': 'Odes, livro I, 11'},
    'horacio/exegi-monumentum-parte-1': {'titulo': 'Exegi monumentum', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 11,
                                         'fonte': 'Odes, livro III, 30, 1–9', 'obra': 'horacio/exegi-monumentum',
                                         'parte': 1, 'trecho': '1–9',
                                         'biblioteca': '/biblioteca/horacio/exegi-monumentum/'},
    'horacio/exegi-monumentum-parte-2': {'titulo': 'Exegi monumentum', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 12,
                                         'fonte': 'Odes, livro III, 30, 10–16', 'obra': 'horacio/exegi-monumentum',
                                         'parte': 2, 'trecho': '10–16',
                                         'biblioteca': '/biblioteca/horacio/exegi-monumentum/'},
    'vergilio/bucolica-iv-parte-1': {'titulo': 'Ecloga IV', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 13,
                                     'fonte': 'Bucólicas, IV, 1–7', 'obra': 'vergilio/bucolica-iv', 'parte': 1,
                                     'trecho': '1–7', 'biblioteca': '/biblioteca/vergilio/bucolica-iv/'},
    'vergilio/bucolica-iv-parte-2': {'titulo': 'Ecloga IV', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 14,
                                     'fonte': 'Bucólicas, IV, 8–14', 'obra': 'vergilio/bucolica-iv', 'parte': 2,
                                     'trecho': '8–14', 'biblioteca': '/biblioteca/vergilio/bucolica-iv/'},
}

# o que não tem card: nomes próprios, «amen» e «alleluia»
SEM_CARD = {
    'alleluia': {'lema': 'alleluia', 'classe': 'interjeição', 'g': 'gramatical',
                 'def': ['Aleluia: louvai a Deus. Palavra hebraica de louvor, própria do tempo da Páscoa.'],
                 'wiki': 'https://en.wiktionary.org/wiki/alleluia#Latin'},
    'amen': {'lema': 'amen', 'classe': 'interjeição', 'g': 'gramatical',
             'def': ['Amém: assim seja. Palavra hebraica que fecha a oração.'],
             'wiki': 'https://en.wiktionary.org/wiki/amen#Latin'},
    'maria': {'lema': 'Maria', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Maria, a mãe de Jesus.'],
              'wiki': 'https://en.wiktionary.org/wiki/Maria#Latin'},
    'iesus': {'lema': 'Iesus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Jesus.'],
              'wiki': 'https://en.wiktionary.org/wiki/Iesus#Latin'},
    'sabidi': {'lema': 'Sabidius', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Sabídio, o homem a quem o epigrama se dirige.']},
    # Eneida I,1–11
    'troiae': {'lema': 'Troia', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Troia, a cidade de Príamo, na Ásia Menor, destruída pelos gregos.'],
               'wiki': 'https://en.wiktionary.org/wiki/Troia#Latin'},
    'italiam': {'lema': 'Italia', 'classe': 'nome próprio', 'g': 'nome', 'def': ['A Itália.'],
                'wiki': 'https://en.wiktionary.org/wiki/Italia#Latin'},
    'lavinia': {'lema': 'Lavinius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                'def': ['De Lavínio, a cidade que Eneias fundou no Lácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Lavinius#Latin'},
    'iunonis': {'lema': 'Iuno', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Juno, a rainha dos deuses, mulher de Júpiter.'],
                'wiki': 'https://en.wiktionary.org/wiki/Iuno#Latin'},
    'latio': {'lema': 'Latium', 'classe': 'nome próprio', 'g': 'nome', 'def': ['O Lácio, a região da Itália onde fica Roma.'],
              'wiki': 'https://en.wiktionary.org/wiki/Latium#Latin'},
    'latinum': {'lema': 'Latinus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome', 'def': ['Latino, do Lácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Latinus#Latin'},
    'albani': {'lema': 'Albanus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
               'def': ['Albano, de Alba Longa, a cidade que o filho de Eneias fundou e de onde veio Rômulo.'],
               'wiki': 'https://en.wiktionary.org/wiki/Albanus#Latin'},
    'romae': {'lema': 'Roma', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Roma.'],
              'wiki': 'https://en.wiktionary.org/wiki/Roma#Latin'},
    # Horácio, Odes I,11 e III,30; Vergílio, Bucólica IV,1–14
    'leuconoë': {'lema': 'Leuconoe', 'classe': 'nome próprio', 'g': 'nome',
                 'def': ['Leucônoe, a moça a quem a ode se dirige.']},
    'babylonios': {'lema': 'Babylonius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                   'def': ['Babilônico, da Babilônia, a terra dos astrólogos.'],
                   'wiki': 'https://en.wiktionary.org/wiki/Babylonius#Latin'},
    'iuppiter': {'lema': 'Iuppiter', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Júpiter, o rei dos deuses.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Iuppiter#Latin'},
    'tyrrhenum': {'lema': 'Tyrrhenus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                  'def': ['Tirreno: o mar Tirreno, a oeste da Itália.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Tyrrhenus#Latin'},
    'aquilo': {'lema': 'Aquilo', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['O Aquilão, o vento norte, frio e violento.'],
               'wiki': 'https://en.wiktionary.org/wiki/aquilo#Latin'},
    'libitinam': {'lema': 'Libitina', 'classe': 'nome próprio', 'g': 'nome',
                  'def': ['Libitina, a deusa dos funerais; daí, a morte.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Libitina#Latin'},
    'capitolium': {'lema': 'Capitolium', 'classe': 'nome próprio', 'g': 'nome',
                   'def': ['O Capitólio, a colina do templo de Júpiter, em Roma.'],
                   'wiki': 'https://en.wiktionary.org/wiki/Capitolium#Latin'},
    'aufidus': {'lema': 'Aufidus', 'classe': 'nome próprio', 'g': 'nome',
                'def': ['O Áufido (hoje Ofanto), rio da Apúlia, a terra de Horácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Aufidus#Latin'},
    'daunus': {'lema': 'Daunus', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Dauno, rei lendário da Apúlia, terra seca.'],
               'wiki': 'https://en.wiktionary.org/wiki/Daunus#Latin'},
    'aeolium': {'lema': 'Aeolius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                'def': ['Eólio: da Eólia, a terra de Safo e Alceu, os poetas líricos gregos.'],
                'wiki': 'https://en.wiktionary.org/wiki/Aeolius#Latin'},
    'italos': {'lema': 'Italus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome', 'def': ['Itálico, da Itália.'],
               'wiki': 'https://en.wiktionary.org/wiki/Italus#Latin'},
    'delphica': {'lema': 'Delphicus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                 'def': ['Délfico, de Delfos, o santuário de Apolo, a quem o louro é sagrado.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Delphicus#Latin'},
    'melpomene': {'lema': 'Melpomene', 'classe': 'nome próprio', 'g': 'nome',
                  'def': ['Melpômene, uma das Musas.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Melpomene#Latin'},
    'sicelides': {'lema': 'Sicelis', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                  'def': ['Siciliana, da Sicília, a terra de Teócrito, o pai da poesia pastoril.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Sicelis#Latin'},
    'cumaei': {'lema': 'Cumaeus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
               'def': ['De Cumas, a cidade da Sibila, a profetisa.'],
               'wiki': 'https://en.wiktionary.org/wiki/Cumaeus#Latin'},
    'saturnia': {'lema': 'Saturnius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                 'def': ['De Saturno, o deus da idade de ouro.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Saturnius#Latin'},
    'lucina': {'lema': 'Lucina', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Lucina, a deusa dos partos (aqui, Diana, irmã de Apolo).'],
               'wiki': 'https://en.wiktionary.org/wiki/Lucina#Latin'},
    'apollo': {'lema': 'Apollo', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Apolo, o deus da luz e da poesia.'],
               'wiki': 'https://en.wiktionary.org/wiki/Apollo#Latin'},
    'pollio': {'lema': 'Pollio', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Polião (Caio Asínio Polião), cônsul em 40 a.C., amigo de Vergílio.'],
               'wiki': 'https://en.wiktionary.org/wiki/Pollio#Latin'},
}

PALAVRA = re.compile(r'[A-Za-zÀ-ÿ]+')


def classe_de(card):
    tags = card.get('tags', [])
    if 'substantivo' in tags:
        fim = card.get('enunciado', '').rstrip().rstrip('.').split(',')[-1].strip()
        return {'m': 'substantivo masculino', 'f': 'substantivo feminino', 'n': 'substantivo neutro'}.get(fim, 'substantivo')
    for t, nome in (('verbo', 'verbo'), ('adjetivo', 'adjetivo'), ('pronomes', 'pronome'), ('preposição', 'preposição'),
                    ('advérbio', 'advérbio'), ('conjunção', 'conjunção'), ('interjeição', 'interjeição')):
        if t in tags:
            return nome
    return ''


def destino_de(entrada, cards):
    c = cards[entrada['c']]
    d = {'lema': c['la'], 'classe': classe_de(c)}
    if entrada.get('f'):
        d['forma'] = entrada['f']
    if entrada.get('fn'):
        d['funcao'] = entrada['fn']
    d['card'] = c['id']
    d['wiki'] = 'https://en.wiktionary.org/wiki/' + c['la'] + '#Latin'
    return d


def sem_card(entrada):
    k = entrada['w'].lower()
    if k not in SEM_CARD:
        raise SystemExit(f"«{entrada['w']}» não tem card nem destino em SEM_CARD")
    d = dict(SEM_CARD[k])
    if entrada.get('f'):
        d['forma'] = entrada['f']
    # no nome próprio, a função sem a repetição do nome («nome próprio, Maria: a quem se fala»)
    fn = entrada.get('fn', '')
    if d['g'] == 'nome' and ':' in fn:
        d['funcao'] = fn.split(':', 1)[1].strip()
    return d


def linha_de(trecho, cards, destinos):
    """A linha em pedaços [texto, chave]; cada palavra consome uma ou duas entradas de
    «palavras» (duas quando a palavra junta duas, como tecum = te + cum)."""
    fila = list(trecho['palavras'])
    p, pos = [], 0
    for m in PALAVRA.finditer(trecho['la']):
        if m.start() > pos:
            p.append([trecho['la'][pos:m.start()], None])
        w = m.group(0)
        if not fila:
            raise SystemExit(f"{trecho['id']}: sobrou «{w}» sem anotação")
        partes = [fila.pop(0)]
        # a enclítica vem anotada à parte, com hífen: Longeque = Longe + -que
        while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
            if not fila or len(partes) > 2:
                raise SystemExit(f"{trecho['id']}: «{w}» não bate com a anotação")
            partes.append(fila.pop(0))
        if partes[0]['w'].lower() == w.lower() and fila and fila[0]['w'].lower() == w.lower():
            partes.append(fila.pop(0))
        ds = [destino_de(x, cards) if x.get('c') else sem_card(x) for x in partes]
        d = ds[0] if len(ds) == 1 else {'partes': ds}
        p.append([w, chave_para(w.lower(), d, destinos)])
        pos = m.end()
    if pos < len(trecho['la']):
        p.append([trecho['la'][pos:], None])
    if fila:
        raise SystemExit(f"{trecho['id']}: anotação a mais: {[x['w'] for x in fila]}")
    return {'t': trecho['la'], 'p': p, 'card': trecho['id']}


def chave_para(base, d, destinos):
    """A mesma palavra com a mesma análise usa a mesma chave; com outra, «base#2», «base#3»…"""
    k, n = base, 1
    while k in destinos and destinos[k] != d:
        n += 1
        k = f'{base}#{n}'
    destinos[k] = d
    return k


def chave_latina(w):
    """A mesma chave do build (chaveLatina): minúscula, sem acento, sem o hífen da enclítica, j→i, v→u."""
    s = unicodedata.normalize('NFD', str(w).lower())
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lstrip('-')
    return s.replace('j', 'i').replace('v', 'u')


def flexoes_do_verso(verso, flexao):
    """As flexões das formas do verso (LATIM.md §3.8), na ordem da leitura: o verso espera também
    elas, e não só os lemas (o build as põe logo depois do lema de cada uma)."""
    saida = []
    for p in verso['palavras']:
        if p.get('c') and not p['w'].startswith('-'):
            f = flexao.get(chave_latina(p['w']) + '|' + p['c'])
            if f and f not in saida:
                saida.append(f)
    return saida


def montar():
    cards = {}
    for f in sorted(BARALHO.glob('*.json')):
        for c in json.loads(f.read_text(encoding='utf-8')):
            cards[c['id']] = c
    flexao = {chave_latina(c['la']) + '|' + c['lema']: c['id'] for c in cards.values() if c.get('tipo') == 'flexao'}
    # o texto vem dos versos anotados; o card é o trecho (a frase), que pode atravessar o verso
    # (cortes.py, desde 04/11/2026)
    versos = json.loads(VERSOS.read_text(encoding='utf-8'))
    trechos = {}
    for c in cards.values():
        if c.get('tipo') == 'frase' and c.get('texto'):
            trechos.setdefault(c['texto'], []).append(c)
    DESTINO.mkdir(parents=True, exist_ok=True)
    for tid, vs in sorted(versos.items()):
        if tid not in TEXTOS:
            raise SystemExit(f'o texto {tid} não está em TEXTOS')
        meta = TEXTOS[tid]
        ts = sorted(trechos.get(tid, []), key=lambda c: c['linha'])
        if [c['linha'] for c in ts] != list(range(1, len(ts) + 1)):
            raise SystemExit(f'{tid}: os trechos não vão de 1 a {len(ts)} («linha» é a ordem deles)')
        cobertos = set()
        for c in ts:
            a, b = c.get('versos') or (0, 0)
            if not 1 <= a <= b <= len(vs):
                raise SystemExit(f"{c['id']}: «versos» fora do texto")
            cobertos.update(range(a, b + 1))
        if cobertos != set(range(1, len(vs) + 1)):
            raise SystemExit(f'{tid}: versos sem trecho: {sorted(set(range(1, len(vs) + 1)) - cobertos)}')
        destinos = {}
        linhas = []
        for n, v in enumerate(vs, 1):
            linha = linha_de(dict(v, id=f'{tid}#{n}'), cards, destinos)
            del linha['card']
            fl = flexoes_do_verso(v, flexao)
            if fl:
                linha['flexoes'] = fl
            linhas.append(linha)
        autor, pasta = tid.split('/')
        texto = {'id': tid, 'idioma': 'la', 'tipo': meta['tipo'], 'titulo': meta['titulo'], 'autor': meta['autor'],
                 'ano': None, 'biblioteca': meta.get('biblioteca', f'/biblioteca/{autor}/{pasta}/'), 'ordem': meta['ordem']}
        for k in ('fonte', 'obra', 'parte', 'trecho'):
            if meta.get(k):
                texto[k] = meta[k]
        texto['blocos'] = [linhas]
        texto['destinos'] = destinos
        arq = DESTINO / f'{autor}--{pasta}.json'
        arq.write_text(json.dumps(texto, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'{arq.name}: {len(linhas)} versos, {len(ts)} trechos, {len(destinos)} chaves')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    montar()
