"""O card de flexão dos nomes pergunta o caso (cards/LATIM.md §3.8, pedido do Gere de 26/10/2026):
nos substantivos, adjetivos e pronomes, a tradução de cada forma («a rosa (objeto)») confundia
mais do que ensinava; a pergunta passa a ser «Em que caso está esta forma?», e a resposta, o nome
do caso: *rosam* → «acusativo singular». Os verbos, os particípios e o gerúndio continuam com o
sentido («que eu faça»).

Fora da frase, metade das formas pode estar em mais de um caso (*aquae*: genitivo ou dativo
singular, nominativo plural), e a resposta traz todos, porque é a terminação que se decora; o caso
dentro da frase é o card de forma (§3.6). Só caso e número: o gênero fica na nota, e o vocativo
sai quando é igual ao nominativo do mesmo número. A múltipla escolha é a única etapa, e as quatro
erradas não dividem nenhum caso com a certa: primeiro as outras formas do mesmo lema, depois os
padrões que as formas do baralho têm, do mesmo tamanho que a certa.

    python -I fonte/latim/flexao_caso.py           # converte 16-flexoes.json (só o que falta)
    python -I fonte/latim/flexao_caso.py --lista   # mostra cada card convertido, sem gravar

O «gravar» do flexoes.py chama a conversão sozinho: a leva continua escrita como antes, com o
sentido, e o card do nome sai dela com o caso. O sentido antigo fica no campo «sentido» (a
leitura principal e as outras), que o app mostra depois da resposta.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SAIDA = AQUI.parent / 'cards' / 'la' / '16-flexoes.json'

CASOS = ['nominativo', 'genitivo', 'dativo', 'acusativo', 'ablativo', 'vocativo', 'locativo']
NUMEROS = ['singular', 'plural']
# a análise que fala de verbo (ou é preposição) continua com o sentido
DE_VERBO = ('indicativo', 'subjuntivo', 'infinitivo', 'imperativo', 'particípio', 'gerúndio',
            'gerundivo', 'supino', 'pessoa', 'preposição')


def pares(analise):
    """Os pares (caso, número) que a análise dá, sem o gênero e sem o vocativo igual ao
    nominativo; None quando a forma não é de nome (ou a análise não diz o número)."""
    a = analise.lower()
    if any(p in a for p in DE_VERBO) or not any(c in a for c in CASOS):
        return None
    res, pendentes, ultimos = set(), [], []
    for t in re.findall(r'[a-zà-ú]+', a):
        if t in CASOS:
            pendentes.append(t)
        elif t in NUMEROS:
            # «nominativo feminino singular e plural»: o número sem caso antes repete os últimos
            for c in pendentes or ultimos:
                res.add((c, t))
            if pendentes:
                ultimos, pendentes = pendentes, []
    if pendentes or not res:
        return None
    return frozenset(p for p in res if not (p[0] == 'vocativo' and ('nominativo', p[1]) in res))


def _lista(casos):
    casos = sorted(casos, key=CASOS.index)
    return casos[0] if len(casos) == 1 else ', '.join(casos[:-1]) + ' ou ' + casos[-1]


def texto(ps):
    """«genitivo ou dativo singular; nominativo plural»"""
    por = {n: [c for c, m in ps if m == n] for n in NUMEROS}
    if por['singular'] and sorted(por['singular']) == sorted(por['plural']):
        return _lista(por['singular']) + ' singular ou plural'
    return '; '.join(_lista(por[n]) + ' ' + n for n in NUMEROS if por[n])


# o conceito de cada caso da resposta entra antes do card (ordenarTrilhas no app): quem responde
# «genitivo ou dativo» já viu os dois
CONCEITO = {'nominativo': 'la-g001', 'vocativo': 'la-g002', 'acusativo': 'la-g003', 'genitivo': 'la-g004',
            'dativo': 'la-g005', 'ablativo': 'la-g006'}


def conceitos(card):
    """Os conceitos dos casos da resposta, na ordem dos casos."""
    return [CONCEITO[c] for c in CASOS if c in CONCEITO and re.search(r'\b' + c + r'\b', card['pt'])]


MARCA = {'nominative': 'nominativo', 'genitive': 'genitivo', 'dative': 'dativo', 'accusative': 'acusativo',
         'ablative': 'ablativo', 'vocative': 'vocativo', 'locative': 'locativo'}


def pares_do_indice(forma, lema):
    """Os pares (caso, número) que o índice do Wiktionary (formas.py) dá à forma, só no lema do
    card: a trava contra a errada que é leitura rara mas certa (*vi* também é dativo)."""
    sys.path.insert(0, str(AQUI))
    import formas
    import latim
    res = set()
    for a in formas.analisar(forma):
        if latim.chave(a['lema'] or '') != latim.chave(lema):
            continue
        casos = [MARCA[m] for m in a['marcas'] if m in MARCA]
        for n in NUMEROS:
            if n in a['marcas']:
                res.update((c, n) for c in casos)
    return res


def _sorteio(*partes):
    return hashlib.sha256('|'.join(partes).encode('utf-8')).hexdigest()


def distratores(card, certa, irmaos, reais, indice=frozenset()):
    """Quatro erradas que não dividem nenhum par com a certa (nem com o que o índice dá à forma):
    as outras formas do mesmo lema, os padrões reais do baralho e, para igualar o tamanho, a
    junção de dois deles."""
    certa_ou_indice = certa | indice
    soltos = {frozenset([(c, n)]) for c in CASOS[:5] for n in NUMEROS}
    base = reais | soltos
    # o vocativo só entra como ele é nas formas reais (domine, mi): junto, «dativo ou vocativo» é
    # combinação que nenhuma terminação tem
    sem_voc = [x for x in base if not any(c == 'vocativo' for c, _ in x)]
    juntos = {a | b for a in sem_voc for b in sem_voc if not (a & b) and len(a | b) <= 4}
    numeros = {n for _, n in certa}
    vistos, cands = set(), []
    for x in sorted(base | juntos | irmaos, key=texto):
        if x & certa_ou_indice or texto(x) in vistos:
            continue
        vistos.add(texto(x))
        nota = abs(len(x) - len(certa)) * 2
        nota += 0 if {n for _, n in x} == numeros else 1
        nota += 0 if x in irmaos else 0.5 if x in reais else 1.2
        cands.append((x, nota))
    escolhidos = []
    while len(escolhidos) < 4 and cands:
        # os que dividem um caso com uma errada já escolhida perdem: as quatro, variadas
        def custo(xn):
            x, nota = xn
            return (nota + 0.7 * sum(1 for e in escolhidos if x & e), _sorteio(card['id'], texto(x)))
        x, _ = min(cands, key=custo)
        escolhidos.append(x)
        cands = [c for c in cands if c[0] != x]
    return [texto(x) for x in escolhidos]


def converter(cards, lemas):
    """Converte, em cards (a lista de 16-flexoes.json), os de nome que ainda pedem o sentido;
    lemas: id do card do lema → a palavra do dicionário (deus, is, vis). Devolve os convertidos,
    e em cada um, no campo provisório «_indice», o que o índice dá e a análise não tem."""
    analisados = [(c, pares(c['analise'])) for c in cards if c.get('tipo') == 'flexao']
    reais = {ps for c, ps in analisados if ps}
    por_lema = {}
    for c, ps in analisados:
        if ps:
            por_lema.setdefault(c['lema'], set()).add(ps)
    feitos = []
    for c, ps in analisados:
        if not ps or c.get('familia') == 'caso':
            continue
        sentido = '; '.join([c['pt']] + c.get('outras', []))
        indice = pares_do_indice(c['la'], lemas[c['lema']])
        indice = {p for p in indice if not (p[0] == 'vocativo' and ('nominativo', p[1]) in indice | ps)}
        novo = {}
        for k, v in c.items():
            if k in ('outras', 'aceitas'):
                continue
            if k == 'pt':
                novo['familia'] = 'caso'
                novo['pt'] = texto(ps)
                novo['sentido'] = sentido
            elif k == 'distratores':
                novo['distratores'] = distratores(c, ps, por_lema[c['lema']] - {ps}, reais, frozenset(indice))
            elif k != 'conceitos':
                novo[k] = v
        novo['conceitos'] = conceitos(novo)
        c.clear()
        c.update(novo)
        c['_indice'] = sorted(indice - ps)
        feitos.append(c)
    return feitos


def lemas_do_baralho():
    lemas = {}
    for arq in sorted(SAIDA.parent.glob('*.json')):
        for c in json.loads(arq.read_text(encoding='utf-8')):
            if c.get('tipo') == 'palavra':
                lemas[c['id']] = c['la']
    return lemas


def principal():
    cards = json.loads(SAIDA.read_text(encoding='utf-8'))
    feitos = converter(cards, lemas_do_baralho())
    a_mais = [dict(c) for c in feitos if c['_indice']]
    for c in feitos:
        c.pop('_indice')
    if '--lista' in sys.argv:
        for c in feitos:
            print(f"{c['id']} {c['la']:<12} {c['pt']}  ← {c['sentido']}")
            print('      ×', ' | '.join(c['distratores']))
        print(len(feitos), 'cards de nome (sem gravar)')
    if a_mais:
        print('o índice dá leituras que a análise não tem (ficaram fora das erradas; conferir):')
        for c in a_mais:
            print(f"  {c['id']} {c['la']}: {c['pt']}; o índice dá também {texto(frozenset(c['_indice']))}")
    if '--lista' in sys.argv:
        return
    SAIDA.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(len(feitos), 'cards de nome passaram a perguntar o caso →', SAIDA.name)


if __name__ == '__main__':
    principal()
