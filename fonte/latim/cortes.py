"""O corte dos textos latinos em trechos (cards/LATIM.md §3.3, critério de 04/11/2026).

    python -I fonte/latim/cortes.py extrair        # uma vez: os versos anotados → fonte/latim/versos.json
    python -I fonte/latim/cortes.py entrada <saida.json>     # os trechos de CORTES, com o contexto, para a leva
    python -I fonte/latim/cortes.py gravar <leva.json> ...   # os trechos novos no lugar dos antigos
    python -I fonte/latim/cortes.py perguntas                # as perguntas sobre os trechos (D41)

Depois do «gravar»: flexoes.py gravar (o «requerTodas» dos trechos novos), cortes.py perguntas,
analise.py (o verbo, a concordância e a leitura dos trechos novos), cards_de_forma.py, textos.py e o
build. As levas (fora do git) ficam em cache/levas/cortes-*.json (os trechos e as perguntas) e
analise-frases-*.json (a análise).

O texto é feito de versos (fonte/latim/versos.json: o verso e a anotação de cada palavra), e é
deles que textos.py monta a tela do texto. O card é outra coisa: o trecho, a frase ou a oração
inteira, que pode atravessar o fim do verso. Pedido do Gere (04/11): «Arma virumque cano, Troiæ qui
primus ab oris» não serve de card. O critério:

- o trecho é uma unidade de sentido, com o verbo dela;
- o que fica de fora vira «…», e nenhuma palavra muda («Arma virumque cano, Troiæ qui primus ab
  oris Italiam … venit»);
- até 10 palavras, e até 12 quando é isso que fecha a frase;
- pode repetir palavras de outro trecho, quando o sentido pede (o antecedente do relativo);
- toda palavra do texto entra em algum trecho.

Cada trecho em CORTES é uma lista de intervalos de palavras do texto, numeradas de 0 (as palavras
como textos.PALAVRA as acha, verso após verso). O trecho que fica igual ao de antes guarda o id.
"""

import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
VERSOS = AQUI / 'versos.json'
sys.path.insert(0, str(AQUI))
import textos  # noqa: E402

CORTES = {
    'vergilio/eneida-parte-1': [
        [(0, 8), (12, 12)],          # Arma virumque cano, Troiae qui primus ab oris Italiam … venit
        [(8, 13)],                   # Italiam, fato profugus, Laviniaque venit litora
        [(14, 22)],                  # multum ille et terris iactatus et alto vi superum
        [(18, 18), (23, 27)],        # iactatus … saevae memorem Iunonis ob iram;
        [(28, 32)],                  # multa quoque et bello passus
        [(33, 38)],                  # dum conderet urbem inferretque deos Latio
        [(39, 47)],                  # genus unde Latinum, Albanique patres, atque altae moenia Romae.
    ],
    'vergilio/eneida-parte-2': [
        [(0, 3)],                    # Musa, mihi causas memora
        [(4, 10), (16, 16), (20, 20)],   # quo numine laeso, quidve dolens, regina deum … virum … impulerit
        [(9, 16), (20, 20)],         # regina deum tot volvere casus insignem pietate virum … impulerit
        [(14, 20)],                  # insignem pietate virum, tot adire labores impulerit.
        [(21, 24)],                  # Tantaene animis caelestibus irae?
    ],
    'horacio/tu-ne-quaesieris': [
        [(0, 11)],                   # Tu ne quaesieris, scire nefas, quem mihi, quem tibi finem di dederint
        [(12, 16)],                  # Leuconoë, nec Babylonios temptaris numeros.
        [(17, 28)],                  # Ut melius, quidquid erit, pati, seu pluris hiemes seu tribuit Iuppiter ultimam
        [(28, 35)],                  # ultimam, quae nunc oppositis debilitat pumicibus mare Tyrrhenum
        [(36, 44)],                  # sapias, vina liques, et spatio brevi spem longam reseces.
        [(45, 49)],                  # Dum loquimur, fugerit invida aetas:
        [(50, 55)],                  # carpe diem, quam minimum credula postero.
    ],
    'horacio/exegi-monumentum-parte-1': [
        [(0, 7)],                    # Exegi monumentum ære perennius regalique situ pyramidum altius
        [(8, 16)],                   # quod non imber edax, non Aquilo impotens possit diruere
        [(8, 8), (15, 23)],          # quod … possit diruere aut innumerabilis annorum series et fuga temporum.
        [(24, 31)],                  # Non omnis moriar, multaque pars mei vitabit Libitinam:
        [(32, 37)],                  # usque ego postera crescam laude recens
        [(38, 44)],                  # dum Capitolium scandet cum tacita virgine pontifex.
    ],
    'horacio/exegi-monumentum-parte-2': [
        [(0, 4)],                    # Dicar, qua violens obstrepit Aufidus
        [(5, 12)],                   # et qua pauper aquae Daunus agrestium regnavit populorum
        [(0, 0), (13, 22)],          # Dicar … ex humili potens princeps Aeolium carmen ad Italos deduxisse modos.
        [(23, 26)],                  # Sume superbiam quaesitam meritis
        [(27, 34)],                  # et mihi Delphica lauro cinge volens, Melpomene, comam.
    ],
    'fedro/lupus-et-agnus': [
        [(0, 8)],                    # Ad rivum eundem lupus et agnus venerant siti compulsi;
        [(9, 14)],                   # superior stabat lupus longeque inferior agnus.
        [(15, 22)],                  # Tunc fauce improba latro incitatus iurgii causam intulit.
        [(23, 29)],                  # Cur, inquit, turbulentam fecisti mihi aquam bibenti?
        [(30, 39)],                  # Laniger contra timens: Qui possum, quaeso, facere, quod quereris, lupe?
        [(40, 46)],                  # A te decurrit ad meos haustus liquor.
    ],
    'vergilio/bucolica-iv-parte-2': [
        [(0, 3), (14, 16)],          # Tu modo nascenti puero … casta fave Lucina:
        [(4, 13)],                   # quo ferrea primum desinet ac toto surget gens aurea mundo
        [(17, 20)],                  # tuus iam regnat Apollo.
        [(21, 29)],                  # Teque adeo decus hoc aevi te consule inibit, Pollio
        [(30, 34)],                  # et incipient magni procedere menses.
        [(35, 42), (45, 47)],        # Te duce, si qua manent sceleris vestigia nostri, … solvent formidine terras.
        [(41, 41), (43, 47)],        # vestigia … inrita perpetua solvent formidine terras.
    ],
    'oracoes/regina-caeli': [
        [(0, 2)],                    # Regina caeli, laetare.
        [(4, 7), (9, 11)],           # Quia quem meruisti portare resurrexit, sicut dixit.
        [(13, 16)],                  # Ora pro nobis Deum.
    ],
}

FIM = '.;:?!'

# O refrão que sai do trecho sem deixar «…» (o Gere, 15/11, la-t126: «pode tirar o aleluia do fim
# […] E não precisa dos três pontinhos»). Também não precisa entrar em trecho nenhum.
REFRAO = {'alleluia'}


def ler_baralho():
    arquivos, cards = {}, {}
    for f in sorted(BARALHO.glob('*.json')):
        lista = json.loads(f.read_text(encoding='utf-8'))
        arquivos[f] = lista
        for c in lista:
            cards[c['id']] = c
    return arquivos, cards


def palavras_do_verso(verso):
    """[(início, fim, texto, [entradas da anotação])] de cada palavra do verso, como linha_de as
    alinha (a enclítica e o cum colado consomem duas entradas)."""
    fila = list(verso['palavras'])
    saida = []
    for m in textos.PALAVRA.finditer(verso['la']):
        w = m.group(0)
        partes = [fila.pop(0)]
        while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
            partes.append(fila.pop(0))
        if partes[0]['w'].lower() == w.lower() and fila and fila[0]['w'].lower() == w.lower():
            partes.append(fila.pop(0))
        saida.append((m.start(), m.end(), w, partes))
    if fila:
        raise SystemExit(f"anotação a mais em «{verso['la']}»")
    return saida


def extrair():
    _, cards = ler_baralho()
    por_texto = {}
    for c in cards.values():
        if c.get('tipo') == 'frase' and c.get('texto'):
            por_texto.setdefault(c['texto'], []).append(c)
    versos = {}
    for tid in sorted(por_texto):
        ts = sorted(por_texto[tid], key=lambda c: c['linha'])
        versos[tid] = [{'la': c['la'], 'palavras': c['palavras']} for c in ts]
    gravar_versos(versos)
    print(f'{VERSOS.name}: {len(versos)} textos, {sum(map(len, versos.values()))} versos')


def gravar_versos(versos):
    linhas = ['{']
    itens = list(versos.items())
    for k, (tid, vs) in enumerate(itens):
        linhas.append(f' {json.dumps(tid)}: [')
        for j, v in enumerate(vs):
            linhas.append('  ' + json.dumps(v, ensure_ascii=False) + (',' if j < len(vs) - 1 else ''))
        linhas.append(' ]' + (',' if k < len(itens) - 1 else ''))
    linhas.append('}')
    VERSOS.write_text('\n'.join(linhas) + '\n', encoding='utf-8', newline='\n')


def ler_versos():
    return json.loads(VERSOS.read_text(encoding='utf-8'))


def montar_trecho(tid, versos, intervalos, cards):
    """O «la», as «palavras» e os versos de um trecho: as palavras dos intervalos, com a pontuação
    de dentro de cada intervalo, «…» entre um intervalo e outro e a pontuação forte do fim. A
    maiúscula do começo do verso cai no meio da frase (Longeque → longeque), menos no nome
    próprio e depois de pontuação forte (a fala do cordeiro: «timens: Qui possum»)."""
    lista = []      # (n do verso, início, fim, texto, entradas)
    for nv, v in enumerate(versos, 1):
        for ini, fim, w, partes in palavras_do_verso(v):
            lista.append((nv, ini, fim, w, partes))
    pedacos, pal, usados = [], [], []
    for k, (a, b) in enumerate(intervalos):
        trecho = ''
        for n in range(a, b + 1):
            nv, ini, fim, w, partes = lista[n]
            usados.append(n)
            entre = ''
            if n > a:
                pv, _, pfim, _, _ = lista[n - 1]
                entre = versos[pv - 1]['la'][pfim:] + ' ' if pv != nv else versos[nv - 1]['la'][pfim:ini]
                entre = re.sub(r'\s+', ' ', entre)
            antes = (trecho + entre).rstrip()
            comeco_de_verso = ini == 0 or not versos[nv - 1]['la'][:ini].strip()
            proprio = any(not x.get('c') or (cards.get(x['c'], {}).get('la') or 'a')[0].isupper() for x in partes[:1])
            if comeco_de_verso and n != intervalos[0][0] and not proprio and w[0].isupper() and (not antes or antes[-1] not in FIM):
                w = w[0].lower() + w[1:]
                partes = [dict(partes[0], w=partes[0]['w'][0].lower() + partes[0]['w'][1:])] + partes[1:]
            trecho += entre + w
            pal.extend(json.loads(json.dumps(partes, ensure_ascii=False)))
        pedacos.append(trecho)
    la = pedacos[0]
    for k in range(1, len(pedacos)):
        fora = [lista[n][3].lower() for n in range(intervalos[k - 1][1] + 1, intervalos[k][0])]
        la += (' ' if fora and all(w in REFRAO for w in fora) else ' … ') + pedacos[k]
    # a pontuação forte depois da última palavra fica
    nv, ini, fim, w, _ = lista[intervalos[-1][1]]
    resto = versos[nv - 1]['la'][fim:].strip()
    if resto and resto[0] in FIM:
        la += resto[0]
    primeiro = lista[intervalos[0][0]][0]
    ultimo = max(lista[n][0] for n in usados)
    return {'la': la, 'palavras': pal, 'versos': [primeiro, ultimo], 'usados': usados}


def fonte_de(antigos, a, b):
    fa, fb = antigos[a - 1]['fonte'], antigos[b - 1]['fonte']
    if fa == fb:
        return fa
    m = re.search(r'(\d+)$', fb)
    return f'{fa}–{m.group(1)}'


def trechos_novos(tid, versos, cards, antigos):
    proximo = max(int(i[4:]) for i in cards if i.startswith('la-t')) + 1
    por_la = {c['la']: c for c in antigos}
    total = sum(len(palavras_do_verso(v)) for v in versos)
    usados = set()
    saida = []
    for intervalos in CORTES[tid]:
        t = montar_trecho(tid, versos, intervalos, cards)
        usados.update(t.pop('usados'))
        velho = por_la.get(t['la'])
        t['id'] = velho['id'] if velho else None
        t['fonte'] = fonte_de(antigos, *t['versos'])
        saida.append(t)
    faltam = set(range(total)) - usados
    if faltam:
        # a palavra que só se repete (o alleluia do fim de cada linha) pode ficar de fora
        formas = {w.lower() for v in versos for _, _, w, _ in palavras_do_verso(v)}
        nos_trechos = {re.sub(r'[^\w]', '', x).lower() for t in saida for x in t['la'].split()}
        lista = [w for v in versos for _, _, w, _ in palavras_do_verso(v)]
        faltam = {n for n in faltam if lista[n].lower() not in nos_trechos}
        if faltam:
            raise SystemExit(f'{tid}: palavras fora de todo trecho: {[lista[n] for n in sorted(faltam)]}')
    for t in saida:
        if not t['id']:
            t['id'] = f'la-t{proximo:03d}'
            proximo += 1
            cards[t['id']] = t
        n = len([p for p in t['palavras'] if not p['w'].startswith('-')])
        if n > 12:
            raise SystemExit(f"{tid}: trecho com {n} palavras: {t['la']}")
    return saida


def antigos_de(cards, tid):
    return sorted([c for c in cards.values() if c.get('tipo') == 'frase' and c.get('texto') == tid],
                  key=lambda c: c['linha'])


def entrada(destino):
    _, cards = ler_baralho()
    versos = ler_versos()
    saida = []
    for tid in CORTES:
        antigos = antigos_de(cards, tid)
        novos = trechos_novos(tid, versos[tid], cards, antigos)
        texto = {'texto': tid, 'versos': [{'n': i, 'la': v['la'], 'pt': antigos[i - 1]['pt']}
                                          for i, v in enumerate(versos[tid], 1)], 'trechos': []}
        for t in novos:
            a, b = t['versos']
            texto['trechos'].append({
                'id': t['id'], 'la': t['la'], 'versos': t['versos'], 'fonte': t['fonte'],
                'igual_ao_antigo': any(c['id'] == t['id'] for c in antigos),
                'palavras': [dict(p, i=i) for i, p in enumerate(t['palavras'])],
                'antigos': [{k: c[k] for k in ('id', 'la', 'pt', 'gabarito', 'aceitas', 'distratores', 'nota')}
                            for c in antigos[a - 1:b]]})
        saida.append(texto)
        print(tid, len(antigos), '→', len(novos), 'trechos')
        for t in novos:
            print('   ', t['id'], t['versos'], t['la'])
    Path(destino).write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def nota_das_palavras(palavras):
    linhas = []
    for p in palavras:
        if p['w'].startswith('-'):
            continue
        f, fn = p.get('f', ''), p.get('fn', '')
        if f or fn:
            linhas.append(f"{p['w']}: " + ', '.join(x for x in (f, fn) if x) + '.')
    return linhas


def conceitos_de(palavras, antigos):
    """Os conceitos dos versos de antes, na ordem, sem o do neutro quando o trecho não tem palavra
    neutra no plural ou no acusativo (LATIM.md §15)."""
    vistos = []
    for c in antigos:
        for g in c.get('conceitos', []):
            if g not in vistos:
                vistos.append(g)
    neutro = any('neutro' in p.get('f', '') and ('plural' in p.get('f', '') or 'acusativo' in p.get('f', ''))
                 for p in palavras)
    return [g for g in vistos if g != 'la-g032' or neutro]


def gravar(levas):
    arquivos, cards = ler_baralho()
    versos = ler_versos()
    escrito = {}
    for arq in levas:
        for x in json.loads(Path(arq).read_text(encoding='utf-8')):
            escrito[x['id']] = x
    for tid in CORTES:
        antigos = antigos_de(cards, tid)
        novos = trechos_novos(tid, versos[tid], cards, antigos)
        arq = next(f for f, lista in arquivos.items() if any(c['id'] == antigos[0]['id'] for c in lista))
        lista = arquivos[arq]
        pos = min(i for i, c in enumerate(lista) if c.get('texto') == tid)
        resto = [c for c in lista if not (c.get('tipo') == 'frase' and c.get('texto') == tid)]
        feitos = []
        for k, t in enumerate(novos, 1):
            velho = next((c for c in antigos if c['id'] == t['id']), None)
            a, b = t['versos']
            if velho:
                card = dict(velho)
            else:
                x = escrito.get(t['id'])
                if not x:
                    raise SystemExit(f"{t['id']} ({t['la']}) sem texto na leva")
                pal = t['palavras']
                for i, fn in (x.get('fn') or {}).items():
                    pal[int(i)]['fn'] = fn
                nota = nota_das_palavras(pal) + [l for l in (x.get('ensina') or []) if l]
                card = {'id': t['id'], 'tipo': 'frase', 'la': t['la'], 'pt': x['pt'], 'gabarito': x['gabarito'],
                        'aceitas': x.get('aceitas', []), 'distratores': x['distratores'], 'nota': '\n'.join(nota),
                        'nivel': antigos[0]['nivel'], 'tags': ['trecho'], 'fonte': t['fonte'],
                        'requerTodas': [], 'palavras': pal, 'conceitos': conceitos_de(pal, antigos[a - 1:b])}
            card['texto'] = tid
            card['linha'] = k
            card['versos'] = t['versos']
            feitos.append(card)
        resto[pos:pos] = feitos
        arquivos[arq] = resto
        print(tid, len(antigos), '→', len(feitos))
    # o texto que não mudou de corte: cada trecho é um verso
    for lista in arquivos.values():
        for c in lista:
            if c.get('tipo') == 'frase' and c.get('texto') and c['texto'] not in CORTES:
                c['versos'] = [c['linha'], c['linha']]
    for f, lista in arquivos.items():
        gravar_cards(f, lista)


def gravar_cards(f, lista):
    """Só o arquivo que mudou, no formato que ele já tinha (um card por linha, ou indentado)."""
    antes = f.read_text(encoding='utf-8')
    if json.loads(antes) == lista:
        return
    if antes.startswith('[\n {"'):
        texto = '[\n' + ',\n'.join(' ' + json.dumps(c, ensure_ascii=False) for c in lista) + '\n]\n'
    else:
        texto = json.dumps(lista, ensure_ascii=False, indent=1) + '\n'
    f.write_text(texto, encoding='utf-8', newline='\n')


def aceitas_de(q):
    """O build pede «aceitas»; a pergunta é só de escolher (a escrita nunca a vê), e uma variante
    sem o artigo arriscaria aceitar uma errada («ao Pai» × «o Pai»): vai a própria resposta, com ponto."""
    return [q['pt'] + '.']


def perguntas():
    """As perguntas de compreensão sobre os trechos (LATIM.md §16, D41): das levas
    cache/levas/cortes-*.json («compreensao» de cada trecho) para fonte/cards/la/26-compreensao-versos.json.
    Cada uma espera o que o trecho espera (as palavras e as flexões: rode antes flexoes.py gravar) e,
    no app, o próprio trecho já visto; uma vez só, como os cards de análise."""
    _, cards = ler_baralho()
    saida = []
    for leva in sorted((AQUI / 'cache' / 'levas').glob('cortes-*.json')):
        for x in json.loads(leva.read_text(encoding='utf-8')):
            tr = cards.get(x['id'])
            if not tr:
                continue
            for k, q in enumerate(x.get('compreensao') or []):
                saida.append({'id': f"la-q{x['id'][3:]}{'abc'[k]}", 'tipo': 'compreensao', 'la': tr['la'],
                              'pergunta': q['pergunta'], 'pt': q['pt'], 'aceitas': q.get('aceitas') or aceitas_de(q),
                              'distratores': q['distratores'], 'nota': q['nota'], 'nivel': tr['nivel'],
                              'tags': ['compreensão'], 'fonte': tr['fonte'], 'de': tr['id'],
                              'requerTodas': list(tr['requerTodas']), 'conjunto': 'q-' + tr['id'][3:]})
    saida.sort(key=lambda c: c['id'])
    arq = BARALHO / '26-compreensao-versos.json'
    arq.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f'{arq.name}: {len(saida)} perguntas')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if sys.argv[1:2] == ['extrair']:
        extrair()
    elif sys.argv[1:2] == ['entrada']:
        entrada(sys.argv[2])
    elif sys.argv[1:2] == ['gravar']:
        gravar(sys.argv[2:])
    elif sys.argv[1:2] == ['perguntas']:
        perguntas()
    else:
        print(__doc__)
