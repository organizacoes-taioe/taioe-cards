"""Monta os textos latinos do app (fonte/textos/la/<autor>--<pasta>.json) a partir dos trechos.

    python -I fonte/latim/textos.py

No latim, cada linha do texto é um card de frase (o trecho, fonte/cards/la/04-trechos.json, com
«texto» e «linha»), e a anotação palavra por palavra já está nele («palavras»: forma no texto,
card do lema, rótulo da forma e função). Daqui sai o texto no formato que o build e o app leem
(PLANO.md, 9.1): os versos em «blocos», cada um com as palavras em «p» e o card do trecho em
«card», e, em «destinos», o que cada chave é (o card do lema, ou «nome» e «gramatical» para o
que não tem card). A Biblioteca tem o mesmo texto com o glossário dela; o endereço vai em
«biblioteca». Os dados de cada texto (título, autor, endereço) ficam em TEXTOS, abaixo.
"""

import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
DESTINO = AQUI.parent / 'textos' / 'la'

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


def montar():
    cards = {}
    for f in sorted(BARALHO.glob('*.json')):
        for c in json.loads(f.read_text(encoding='utf-8')):
            cards[c['id']] = c
    por_texto = {}
    for c in cards.values():
        if c.get('texto'):
            por_texto.setdefault(c['texto'], []).append(c)
    DESTINO.mkdir(parents=True, exist_ok=True)
    for tid, trechos in sorted(por_texto.items()):
        if tid not in TEXTOS:
            raise SystemExit(f'o texto {tid} não está em TEXTOS')
        meta = TEXTOS[tid]
        trechos.sort(key=lambda c: c['linha'])
        if [c['linha'] for c in trechos] != list(range(1, len(trechos) + 1)):
            raise SystemExit(f'{tid}: as linhas não vão de 1 a {len(trechos)}')
        destinos = {}
        linhas = [linha_de(c, cards, destinos) for c in trechos]
        autor, pasta = tid.split('/')
        texto = {'id': tid, 'idioma': 'la', 'tipo': meta['tipo'], 'titulo': meta['titulo'], 'autor': meta['autor'],
                 'ano': None, 'biblioteca': f'/biblioteca/{autor}/{pasta}/', 'ordem': meta['ordem']}
        if meta.get('fonte'):
            texto['fonte'] = meta['fonte']
        texto['blocos'] = [linhas]
        texto['destinos'] = destinos
        arq = DESTINO / f'{autor}--{pasta}.json'
        arq.write_text(json.dumps(texto, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'{arq.name}: {len(linhas)} linhas, {len(destinos)} chaves')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    montar()
