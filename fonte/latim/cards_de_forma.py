"""Os cards de forma do latim (cards/LATIM.md §3.6): o caso, ou o tempo e o modo, de cada
palavra dos textos e das primeiras frases, com a nota de dificuldade que decide quais se
perguntam sempre e quais entram por sorteio.

    python -I fonte/latim/cards_de_forma.py            # grava fonte/cards/la/07-formas.json e os
                                                       # distratores dos exemplos dos conceitos
    python -I fonte/latim/cards_de_forma.py --lista    # só mostra as notas, do maior ao menor

Sai tudo da anotação que trechos e primeiras frases já têm («palavras»: forma, card do lema,
rótulo, função); nenhuma ficha escrita à mão. Ficam de fora o nome próprio e a palavra sem card,
o invariável e a preposição. A mesma forma com a mesma resposta no mesmo texto (ou nas primeiras
frases) vira um card só, o da primeira vez em que aparece.

A nota soma três sinais (LATIM.md §3.6): a terminação ambígua (quantos casos, ou tempos e modos,
a forma pode ter no índice, formas.py), o caso ou o tempo pouco natural para quem fala português,
e a forma irregular. Do CORTE para cima, «sempre» é true (o painel da lista ainda o mostra).

Desde 29/10/2026 (LATIM.md §13, D28) só se pergunta a forma que, sozinha, teria mais de uma
leitura («ambigua»: true): ali é a frase que decide. O vocativo igual ao nominativo não conta.

Desde 24/10/2026 os cards de forma e de conceito são só de escolher (pedido do Gere), e as quatro
alternativas erradas são as que mais se confundem com a certa: primeiro as outras leituras que a
mesma forma teria fora da frase (rosae: genitivo, dativo, nominativo plural), que só o contexto
desfaz; depois os pares que mais se trocam (CONFUSAO). Só entram nomes que o baralho já usa como
resposta, para ninguém tropeçar num termo que nunca viu.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import formas  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
SAIDA = BARALHO / '07-formas.json'
FONTES = ['03-texto-zero.json', '04-trechos.json', '09-trechos-2.json', '14-trechos-3.json', '22-trechos-4.json', '29-trechos-5.json', '32-trechos-6.json', '37-trechos-8.json', '40-trechos-9.json', '43-trechos-10.json']
CORTE = 2.0

CASOS = {'nominative': 'nominativo', 'vocative': 'vocativo', 'accusative': 'acusativo',
         'genitive': 'genitivo', 'dative': 'dativo', 'ablative': 'ablativo'}
ABREVIADO = {'nominativo': ['nom'], 'vocativo': ['voc'], 'acusativo': ['acus', 'ac'],
             'genitivo': ['gen'], 'dativo': ['dat'], 'ablativo': ['abl']}
# o peso do caso para quem fala português: sujeito e objeto quase nada, dativo e ablativo mais
PESO_DO_CASO = {'nominativo': 0, 'acusativo': 0, 'vocativo': 0.5, 'genitivo': 1, 'dativo': 2, 'ablativo': 1.5}
PESO_COM_PREPOSICAO = 0.5   # a preposição diz metade: in + ablativo, in + acusativo

# a resposta do card de verbo: o tempo e o modo, sem pessoa, número nem voz
RESPOSTA_DO_VERBO = [
    (r'^imperativo', 'imperativo'),
    (r'^infinitivo', 'infinitivo'),
    (r'^particípio perfeito', 'particípio perfeito'),
    (r'^particípio presente', 'particípio presente'),
    (r'^particípio futuro', 'particípio futuro'),
    (r'^(presente|imperfeito|perfeito|mais-que-perfeito|futuro perfeito|futuro) do (indicativo|subjuntivo)',
     None),
]
PESO_DO_VERBO = {'presente do indicativo': 0, 'imperativo': 0.5, 'infinitivo': 0.5,
                 'perfeito do indicativo': 1, 'imperfeito do indicativo': 1, 'futuro do indicativo': 1.5,
                 'presente do subjuntivo': 1.5, 'imperfeito do subjuntivo': 1.5,
                 'perfeito do subjuntivo': 2, 'particípio perfeito': 1.5, 'particípio presente': 1.5}
# o que mais se confunde com cada resposta, do mais ao menos parecido
CONFUSAO = {
    'nominativo': ['vocativo', 'acusativo', 'genitivo', 'ablativo', 'dativo'],
    'vocativo': ['nominativo', 'acusativo', 'ablativo', 'genitivo', 'dativo'],
    'acusativo': ['nominativo', 'ablativo', 'genitivo', 'dativo', 'vocativo'],
    'genitivo': ['dativo', 'nominativo', 'ablativo', 'acusativo', 'vocativo'],
    'dativo': ['ablativo', 'genitivo', 'nominativo', 'acusativo', 'vocativo'],
    'ablativo': ['dativo', 'acusativo', 'genitivo', 'nominativo', 'vocativo'],
    'presente do indicativo': ['perfeito do indicativo', 'futuro do indicativo', 'presente do subjuntivo',
                               'imperfeito do indicativo', 'imperativo'],
    'imperfeito do indicativo': ['perfeito do indicativo', 'futuro do indicativo', 'presente do indicativo',
                                 'mais-que-perfeito do indicativo', 'imperfeito do subjuntivo'],
    'perfeito do indicativo': ['presente do indicativo', 'imperfeito do indicativo', 'mais-que-perfeito do indicativo',
                               'futuro do indicativo', 'particípio perfeito'],
    'mais-que-perfeito do indicativo': ['perfeito do indicativo', 'imperfeito do indicativo',
                                        'imperfeito do subjuntivo', 'futuro do indicativo'],
    'futuro do indicativo': ['presente do subjuntivo', 'presente do indicativo', 'imperfeito do indicativo',
                             'perfeito do indicativo'],
    'presente do subjuntivo': ['futuro do indicativo', 'presente do indicativo', 'imperativo',
                               'imperfeito do subjuntivo', 'imperfeito do indicativo'],
    'imperfeito do subjuntivo': ['infinitivo', 'presente do subjuntivo', 'imperfeito do indicativo',
                                 'mais-que-perfeito do indicativo'],
    'perfeito do subjuntivo': ['perfeito do indicativo', 'presente do subjuntivo', 'imperfeito do subjuntivo',
                               'futuro do indicativo', 'mais-que-perfeito do indicativo'],
    'imperativo': ['presente do indicativo', 'infinitivo', 'presente do subjuntivo', 'futuro do indicativo'],
    'infinitivo': ['imperativo', 'imperfeito do subjuntivo', 'presente do indicativo', 'particípio presente',
                   'particípio perfeito'],
    'particípio perfeito': ['perfeito do indicativo', 'particípio presente', 'infinitivo', 'imperfeito do indicativo'],
    'particípio presente': ['particípio perfeito', 'presente do indicativo', 'infinitivo', 'imperativo'],
}
TEMPOS = {'present': 'presente', 'imperfect': 'imperfeito', 'perfect': 'perfeito',
          'pluperfect': 'mais-que-perfeito', 'future': 'futuro', 'future-perfect': 'futuro perfeito'}
MODOS = {'indicative': 'indicativo', 'subjunctive': 'subjuntivo', 'imperative': 'imperativo',
         'infinitive': 'infinitivo', 'participle': 'particípio'}


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c)).lower()


def limpa(w):
    return re.sub(r'[^A-Za-zÀ-ÿĀ-ſ]', '', w)


def resposta_de(rotulo):
    """O rótulo da anotação → (família, resposta), ou None se não se pergunta."""
    for caso in PESO_DO_CASO:
        if rotulo.startswith(caso):
            return 'caso', caso
    for padrao, fixa in RESPOSTA_DO_VERBO:
        m = re.match(padrao, rotulo)
        if m:
            return 'verbo', fixa or m.group(0)
    return None


def analises_do_lema(w, lema):
    alvo = sem_acento(lema)
    return [a for a in formas.analisar(w) if sem_acento(a['lema']) == alvo]


def leituras_de(familia, analises):
    """As leituras das análises, na família: os casos, ou os pares (modo, tempo)."""
    leituras = set()
    for a in analises:
        m = set(a['marcas'])
        if familia == 'caso':
            leituras |= {CASOS[x] for x in m if x in CASOS}
        else:
            modo = next((MODOS[x] for x in m if x in MODOS), None)
            tempo = next((TEMPOS[x] for x in m if x in TEMPOS), None)
            if modo:
                leituras.add((modo, tempo if modo in ('indicativo', 'subjuntivo', 'particípio') else None))
    return leituras


def nome_da_leitura(leitura):
    """O caso como está; o par (modo, tempo) como a resposta do card de verbo o escreve."""
    if isinstance(leitura, str):
        return leitura
    modo, tempo = leitura
    if modo in ('indicativo', 'subjuntivo'):
        return f'{tempo} do {modo}' if tempo else None
    if modo == 'particípio':
        return f'particípio {tempo}' if tempo else None
    return modo


def distratores_de(familia, resposta, analises, nomes):
    """As quatro erradas: as outras leituras da mesma forma, depois as de CONFUSAO, depois o resto
    dos «nomes» (as respostas que o baralho usa), sempre só entre eles."""
    saida = []
    def poe(x):
        if x and x != resposta and x in nomes and x not in saida:
            saida.append(x)
    ordem = CONFUSAO.get(resposta, [])
    for x in sorted((nome_da_leitura(l) for l in leituras_de(familia, analises)),
                    key=lambda x: ordem.index(x) if x in ordem else len(ordem)):
        poe(x)
    for x in ordem:
        poe(x)
    for x in sorted(nomes):
        poe(x)
    return saida[:4]


def ambiguidade(familia, resposta, w, lema):
    """Quantas outras leituras a forma tem no índice, para o mesmo lema."""
    leituras = leituras_de(familia, analises_do_lema(w, lema))
    if familia == 'caso' and resposta != 'vocativo':
        leituras.discard('vocativo')   # o vocativo igual ao nominativo, o contexto resolve
    return max(len(leituras) - 1, 0)


def nota_da_forma(fam, resposta, w, lema_card, rotulo, anterior):
    lema = lema_card.get('la', '')
    n = 1.5 * ambiguidade(fam, resposta, limpa(w), lema)
    tags = ' '.join(lema_card.get('tags', []))
    if fam == 'caso':
        prep = (anterior or {}).get('f', '').startswith('preposição')
        n += PESO_COM_PREPOSICAO if prep and resposta in ('ablativo', 'acusativo') else PESO_DO_CASO[resposta]
        if any(d in tags for d in ('3ª declinação', '4ª declinação', '5ª declinação')):
            n += 1
        if 'pronome' in tags:
            n += 1
    else:
        n += PESO_DO_VERBO.get(resposta, 1.5)
        if 'voz passiva' in rotulo:
            n += 1
        if 'irregular' in tags:
            n += 1
    return round(n, 2)


def do_baralho(tipo):
    """Os cards de um tipo, de todas as levas (02-palavras, 08-palavras-2…; 01-conceitos, 12-conceitos-2…)."""
    return [c for arq in sorted(BARALHO.glob('*.json')) if arq != SAIDA
            for c in json.loads(arq.read_text(encoding='utf-8')) if c.get('tipo') == tipo]


def gerar():
    palavras_do_baralho = {c['id']: c for c in do_baralho('palavra')}
    conceitos = {c['pt']: c['id'] for c in do_baralho('conceito')}
    cards, vistos = [], set()

    def fazer(fr, i, pal, p, ocorrencia):
        w = limpa(p['w'])
        rotulo = p.get('f', '')
        lema_card = palavras_do_baralho.get(p.get('c'))
        fam, resposta = resposta_de(rotulo)
        nota = nota_da_forma(fam, resposta, w, lema_card, rotulo, pal[i - 1] if i else None)
        explicacao = w + ': ' + ', '.join(x for x in (rotulo, p.get('fn')) if x) + '.'
        if fam == 'caso' and i and pal[i - 1].get('f', '').startswith('preposição'):
            explicacao += ' Vem depois de «' + limpa(pal[i - 1]['w']) + '», ' + pal[i - 1]['f'] + '.'
        return {
            'id': 'la-x' + fr['id'][3:] + '-' + str(i),
            'tipo': 'forma',
            'familia': fam,
            'la': w,
            'frase': fr['la'],
            'ocorrencia': ocorrencia,
            'de': fr['id'],
            'fonte': fr.get('fonte', ''),
            'lema': p['c'],
            'pt': resposta,
            'aceitas': aceitas_de(fam, resposta),
            'distratores': distratores_de(fam, resposta, analises_do_lema(w, lema_card.get('la', '')),
                                          nomes_de(fam)),
            'nota': explicacao,
            'nivel': fr.get('nivel', 'A1'),
            'tags': ['gramática', 'caso' if fam == 'caso' else 'forma verbal'],
            'conceitos': [conceitos[resposta]] if resposta in conceitos else [],
            'dificuldade': nota,
            'sempre': nota >= CORTE,
            'ambigua': ambiguidade(fam, resposta, w, lema_card.get('la', '')) >= 1,
            '_rotulo': rotulo,
        }

    def ocorrencia_em(pal, i):
        k = sem_acento(limpa(pal[i]['w']))
        return sum(1 for x in pal[:i + 1] if sem_acento(limpa(x['w'])) == k)

    for arquivo in FONTES:
        for fr in json.loads((BARALHO / arquivo).read_text(encoding='utf-8')):
            grupo = fr.get('texto') or 'primeiras'
            pal = fr.get('palavras', [])
            for i, p in enumerate(pal):
                w = limpa(p['w'])
                k = sem_acento(w)
                r = resposta_de(p.get('f', ''))
                if not r or not palavras_do_baralho.get(p.get('c')) or not w:
                    continue
                chave = (grupo, k, r[1])
                if chave in vistos:
                    continue
                vistos.add(chave)
                cards.append(fazer(fr, i, pal, p, ocorrencia_em(pal, i)))

    # o segundo contexto (03/11/2026): a forma ambígua noutra frase do curso, noutro caso
    import segundo_contexto
    ck = segundo_contexto.chave
    amb = {(ck(c['la']), c['lema']): c['pt'] for c in cards if c['ambigua'] and c['familia'] == 'caso'}
    tem = {(ck(c['la']), c['lema'], c['pt']) for c in cards}
    primeiro = {(ck(c['la']), c['lema']): c['id'] for c in reversed(cards) if c['familia'] == 'caso'}
    for fr, i, p, caso in segundo_contexto.ocorrencias(amb, tem):
        if not palavras_do_baralho.get(p.get('c')):
            continue
        pal = fr['palavras']
        c = fazer(fr, i, pal, p, ocorrencia_em(pal, i))
        c['segundo'] = primeiro[(ck(p['w']), p['c'])]
        cards.append(c)

    enriquecer(cards, palavras_do_baralho)
    return cards


PESSOAS = [(n, num) for num in ('singular', 'plural') for n in ('1ª', '2ª', '3ª')]


def enriquecer(cards, palavras):
    """As outras perguntas do card de forma (03/11/2026): a função na frase (anotada em
    funcoes.json), a pessoa e o número do verbo e a forma de dicionário."""
    arq = AQUI / 'funcoes.json'
    funcoes = json.loads(arq.read_text(encoding='utf-8')) if arq.exists() else {}
    for c in cards:
        rotulo = c.pop('_rotulo', '')
        f = funcoes.get(c['id'])
        if c['familia'] == 'caso' and f and f.get('funcao') and len(f.get('distratores', [])) >= 4:
            c['funcao'] = f['funcao']
            c['distratoresFuncao'] = f['distratores'][:4]
        m = re.search(r'([123]ª) pessoa do (singular|plural)', rotulo)
        if c['familia'] == 'verbo' and m:
            certa = (m.group(1), m.group(2))
            outras = sorted((x for x in PESSOAS if x != certa),
                            key=lambda x: (x[0] != certa[0], x[1] != certa[1], PESSOAS.index(x)))
            c['pessoa'] = f'{certa[0]} pessoa do {certa[1]}'
            c['distratoresPessoa'] = [f'{a} pessoa do {b}' for a, b in outras[:4]]
        lema = palavras.get(c['lema'], {})
        dic = lema.get('la', '')
        if dic and sem_acento(dic) != sem_acento(c['la']):
            # verbetes inventados da mesma palavra, pelos outros padrões (pedido do Gere, 04/11);
            # irregulares, pronomes e o que não tem padrão ficam com verbetes reais do curso
            erradas = falsos(lema, c['la'], existe=existe_no_wiktionary)[:4]
            if len(erradas) < 2:
                erradas = []
            # com dois ou três inventados, um verbete real parecido completa os quatro; nunca um de
            # que a forma da frase também possa vir («Iacta», imperativo de iacto)
            origens = {sem_acento(a.get('lema') or '') for a in formas.analisar(sem_acento(limpa(c['la'])))}
            reais = [v for v in parecidas(c['la'], lema, palavras, 12)
                     if v not in erradas and sem_acento(v.split(',')[0].strip()) not in origens]
            erradas += reais[:4 - len(erradas)]
            if len(erradas) >= 4:
                c['dicionario'] = verbete(lema)
                c['distratoresDicionario'] = erradas


def verbete(card):
    """O verbete inteiro, como no dicionário: «vir, viri, m.», «habeo, habere, habui, habitum»
    (pedido do Gere, 04/11/2026, no comentário do la-xt036-1; até então só a 1ª forma, «vir»).
    Sem as observações em português entre parênteses («(defectivo)», «(comparativo de bonus)»)."""
    v = card.get('enunciado') or card.get('la', '')
    return re.sub(r'\s+', ' ', re.sub(r'\s*\([^)]*\)', '', v)).strip(' ,')


CLASSES = ['pronomes', 'adjetivo', 'advérbio', 'conjunção', 'preposição', 'interjeição']


def classe(card):
    """A classe da palavra, pelas etiquetas: pronome, adjetivo… ou nome."""
    tags = card.get('tags', [])
    return next((t for t in CLASSES if t in tags), 'nome')


def molde(v):
    """A forma do verbete: quantas formas e se termina no gênero. As erradas seguem a da certa,
    para o formato não entregar a resposta (manual §6.2)."""
    return (len(v.split(',')), bool(re.search(r'\b[mfn]\.$', v)))


# ── os verbetes falsos (pedido do Gere, 04/11/2026) ──
# «quero que as alternativas sejam formas falsas, baseadas nos outros padrões de verbetes»: as
# erradas da pergunta de dicionário são a mesma palavra posta noutra declinação ou conjugação
# («vir, viri, m.» × «virus, virus, m.», «vira, virae, f.»). Primeiro as de que a forma da frase
# também poderia vir (virum: virus, viri; virus, virus), que obrigam a saber o verbete; nunca uma
# que seja palavra de verdade da mesma classe (dico, dicare; dea, deae), conferida no Wiktionary.

# a declinação dos nomes: (nominativo, genitivo, gênero, terminações que a forma pode ter)
NOMES = {
    '1': ('a', 'ae', 'f.', ('a', 'ae', 'am', 'arum', 'is', 'as')),
    '2m': ('us', 'i', 'm.', ('us', 'i', 'o', 'um', 'e', 'orum', 'is', 'os')),
    '2n': ('um', 'i', 'n.', ('um', 'i', 'o', 'a', 'orum', 'is')),
    '3': (None, 'is', None, ('is', 'i', 'em', 'e', 'es', 'um', 'ibus', 'a')),
    '4': ('us', 'us', 'm.', ('us', 'ui', 'um', 'u', 'uum', 'ibus')),
    '5': ('es', 'ei', 'f.', ('es', 'ei', 'em', 'e', 'erum', 'ebus')),
}
GENITIVO = {'1': 'ae', '2': 'i', '3': 'is', '4': 'us', '5': 'ei'}
# a conjugação: (1ª pessoa, infinitivo, perfeito, supino), na ordem do que mais se confunde
VERBOS = {'1': ('o', 'are', 'avi', 'atum'), '2': ('eo', 'ere', 'ui', 'itum'), '3': ('o', 'ere', None, None),
          '3io': ('io', 'ere', None, None), '4': ('io', 'ire', 'ivi', 'itum')}
DEPOENTES = {'1': ('or', 'ari', 'atus sum'), '2': ('eor', 'eri', 'itus sum'), '3': ('or', 'i', None),
             '3io': ('ior', 'i', None), '4': ('ior', 'iri', 'itus sum')}
ORDEM_VERBOS = {'1': ['3', '2', '4', '3io'], '2': ['3', '1', '4', '3io'], '3': ['2', '3io', '1', '4'],
                '3io': ['4', '3', '2', '1'], '4': ['3io', '3', '2', '1']}
VOGAIS = 'aeiou'


def partes(card):
    return [x.strip() for x in verbete(card).split(',')]


def falsos_do_nome(card, w):
    p = partes(card)
    tags = card.get('tags', [])
    dec = next((k for k in '12345' if f'{k}ª declinação' in tags), None)
    if len(p) != 3 or not dec or not p[2] in ('m.', 'f.', 'n.', 'm. e f.') or not p[1].endswith(GENITIVO[dec]):
        return []
    nom, gen, g = p
    st = gen[:-len(GENITIVO[dec])]
    saida = []
    for k, (n, gn, gg, fins) in NOMES.items():
        if k == '3':
            v = (nom if nom == st else st + 'is', st + 'is', g)
        else:
            v = (st + n, st + gn, gg)
        pode = any(w == st + f for f in fins) or w == v[0]
        saida.append((not pode, v[0], ', '.join(v)))
    return [(cab, v) for _, cab, v in sorted(saida, key=lambda x: x[0])]


def falsos_do_adjetivo(card, w):
    p = partes(card)
    if len(p) == 3:
        m, f, _ = p
        if not f.endswith('a'):
            return []
        st = f[:-1]
        saida = [(st + 'is', f'{st}is, {st}e'), (m, f'{m}, {st}is')]
        if m.endswith('er'):
            saida += [(st + 'us', f'{st}us, {st}a, {st}um'), (m, f'{m}, {st}is, {st}e')]
        elif st[-1] not in VOGAIS:
            # como liber, libera, liberum e celer, celeris, celere
            saida += [(st + 'er', f'{st}er, {st}era, {st}erum'), (st + 'er', f'{st}er, {st}eris, {st}ere')]
        return saida
    if len(p) == 2:
        m, segunda = p
        if segunda.endswith('e') and m.endswith('is'):      # omnis, omne
            st = m[:-2]
        elif segunda.endswith('is'):                         # memor, memoris
            st = segunda[:-2]
        else:
            return []
        saida = [(st + 'us', f'{st}us, {st}a, {st}um')]
        saida += [(m, f'{m}, {st}is')] if segunda.endswith('e') else [(st + 'is', f'{st}is, {st}e')]
        if st[-1] not in VOGAIS:
            saida += [(st + 'er', f'{st}er, {st}era, {st}erum'), (st + 'er', f'{st}er, {st}eris, {st}ere')]
        return saida
    return []


def falsos_do_verbo(card, w):
    p = partes(card)
    tags = card.get('tags', [])
    if 'irregular' in tags or len(p) < 2:
        return []
    pres, inf = p[0], p[1]
    if pres.endswith('or'):                                  # depoente
        if inf.endswith('ari'):
            conj, st = '1', inf[:-3]
        elif inf.endswith('iri'):
            conj, st = '4', inf[:-3]
        elif inf.endswith('eri') and pres.endswith('eor'):
            conj, st = '2', inf[:-3]
        elif inf.endswith('i') and pres.endswith('ior'):
            conj, st = '3io', inf[:-1]
        elif inf.endswith('i'):
            conj, st = '3', inf[:-1]
        else:
            return []
        saida = []
        for k in ORDEM_VERBOS[conj]:
            a, b, perf = DEPOENTES[k]
            v = [st + a, st + b] + ([st + perf] if perf else p[2:3])
            saida.append((st + a, ', '.join(v[:len(p)])))
        return saida
    if inf.endswith('are'):
        conj = '1'
    elif inf.endswith('ire'):
        conj = '4'
    elif inf.endswith('ere') and pres.endswith('eo'):
        conj = '2'
    elif inf.endswith('ere') and pres.endswith('io'):
        conj = '3io'
    elif inf.endswith('ere'):
        conj = '3'
    else:
        return []
    st = inf[:-3]
    saida = []
    for k in ORDEM_VERBOS[conj]:
        a, b, perf, sup = VERBOS[k]
        v = [st + a, st + b] + ([st + perf, st + sup] if perf else p[2:4])
        saida.append((st + a, ', '.join(v[:len(p)])))
    return saida


def falsos(lema, w, existe=None):
    """Os verbetes falsos da palavra, na ordem de preferência; [] quando ela não tem padrão
    (irregulares, pronomes, indeclináveis): aí as erradas são verbetes reais (parecidas)."""
    tags = lema.get('tags', [])
    w = sem_acento(limpa(w)).lower().replace('æ', 'ae').replace('œ', 'oe')
    if 'verbo' in tags:
        cands, cls = falsos_do_verbo(lema, w), 'verbo'
    elif 'adjetivo' in tags:
        cands, cls = falsos_do_adjetivo(lema, w), 'adjetivo'
    elif 'pronomes' in tags:
        cands, cls = [], ''
    else:
        cands, cls = falsos_do_nome(lema, w), 'nome'
    certo = sem_acento(verbete(lema))
    cabeca = sem_acento(partes(lema)[0])
    duas = [sem_acento(x) for x in partes(lema)[:2]]
    saida = []
    for cab, v in cands:
        # nem o próprio verbete, nem ele só com outro gênero («dies, diei, f.»)
        if sem_acento(v) == certo or v in saida or [sem_acento(x.strip()) for x in v.split(',')[:2]] == duas:
            continue
        if existe and sem_acento(cab) != cabeca and existe(cab, cls, v, w):
            continue
        saida.append(v)
    return saida


POS = {'verbo': ('verb',), 'adjetivo': ('adj', 'participle', 'det', 'pron', 'num'), 'nome': ('noun', 'name')}


def existe_no_wiktionary(palavra, cls, v, w):
    """O verbete falso não serve quando é de verdade: a forma da frase pode vir daquela palavra
    («malum», de «mālus»), ou a palavra existe com a mesma 2ª forma do verbete («dea, deae»,
    «virus, viri»). Inventado de fato («fugo, fugere»: fugo é da 1ª) fica."""
    try:
        if any(sem_acento(a.get('lema') or '') == sem_acento(palavra) for a in formas.analisar(w)):
            return True
        entradas = formas.baixar_palavra(palavra)
    except Exception:
        return True
    segunda = sem_acento(v.split(',')[1].strip()) if ',' in v else ''
    for e in entradas:
        if e.get('pos') not in POS.get(cls, ()) or sem_acento(e.get('word', '')) != sem_acento(palavra):
            continue
        # só o verbete de dicionário conta («aquis» é só uma forma de aqua)
        if all(sn.get('form_of') or 'form-of' in sn.get('tags', []) for sn in e.get('senses', [])):
            continue
        if segunda and any(sem_acento(f.get('form', '')) == segunda for f in e.get('forms', [])):
            return True
    return False


def parecidas(w, lema, palavras, quantas=4):
    """Quatro formas de dicionário do curso que se confundem com a certa: da mesma classe
    (verbo ou nome), com o começo mais parecido com a forma da frase e com a do dicionário."""
    verbo = 'verbo' in lema.get('tags', [])
    alvo, dic = sem_acento(w), sem_acento(lema.get('la', ''))

    def prefixo(a, b):
        n = 0
        while n < min(len(a), len(b)) and a[n] == b[n]:
            n += 1
        return n
    vistos, saida = {dic, alvo}, []
    certo = molde(verbete(lema))
    candidatos = []
    for c in palavras.values():
        la = c.get('la', '')
        k = sem_acento(la)
        if not la or ' ' in la or k in vistos or ('verbo' in c.get('tags', [])) != verbo:
            continue
        m = molde(verbete(c))
        # verbete de uma forma só («hodie») nunca é errada de um que tem várias
        if certo[0] > 1 and m[0] == 1:
            continue
        nota = 2 * prefixo(alvo, k) + prefixo(dic, k) - abs(len(k) - len(dic)) * 0.3
        # primeiro as da mesma forma de verbete e da mesma classe (pronome com pronome)
        candidatos.append(((m != certo) + (classe(c) != classe(lema)), -nota, la, verbete(c)))
    for _, _, la, v in sorted(candidatos):
        k = sem_acento(la)
        if k in vistos or sem_acento(v) in {sem_acento(x) for x in saida}:
            continue
        vistos.add(k)
        saida.append(v)
        if len(saida) == quantas:
            break
    return saida


def nomes_de(fam):
    """As respostas que o baralho usa na família: os seis casos, ou os tempos e modos que algum
    card de conceito ou de forma pede."""
    if fam == 'caso':
        return set(CASOS.values())
    nomes = {c['pt'] for c in do_baralho('conceito') if c.get('familia') == 'verbo'}
    if SAIDA.exists():
        nomes |= {c['pt'] for c in json.loads(SAIDA.read_text(encoding='utf-8')) if c.get('familia') == 'verbo'}
    return nomes


def distratores_dos_conceitos():
    """Grava em cada exemplo dos cards de conceito de caso e de verbo as suas quatro erradas.
    O exemplo não diz o lema: valem as leituras de qualquer lema com a mesma forma."""
    todos = []
    for arquivo in sorted(BARALHO.glob('*.json')):
        cards = json.loads(arquivo.read_text(encoding='utf-8'))
        conceitos = [c for c in cards if c.get('tipo') == 'conceito']
        if not conceitos:
            continue
        for c in conceitos:
            if c.get('familia') not in ('caso', 'verbo'):
                continue
            for ex in c.get('exemplos', []):
                ex['distratores'] = distratores_de(c['familia'], c['pt'], formas.analisar(limpa(ex['w'])),
                                                   nomes_de(c['familia']))
        arquivo.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        todos.extend(conceitos)
    return todos


def aceitas_de(fam, resposta):
    if fam == 'caso':
        return ['caso ' + resposta] + ABREVIADO[resposta]
    m = re.match(r'(\S+(?: perfeito)?) do (indicativo|subjuntivo)$', resposta)
    if m:
        return [m.group(2) + ' ' + m.group(1)]
    return [resposta.replace('í', 'i')]


if __name__ == '__main__':
    cards = gerar()
    if '--lista' in sys.argv:
        for c in sorted(cards, key=lambda c: -c['dificuldade']):
            print(f"{c['dificuldade']:4.1f} {'★' if c['sempre'] else ' '} {c['id']:14} {c['la']:13} {c['pt']:24} ← {c['frase'][:50]}")
        sempre = sum(c['sempre'] for c in cards)
        ambiguas = sum(c['ambigua'] for c in cards)
        print(f'{len(cards)} cards, {sempre} sempre, {ambiguas} ambíguos (os que se perguntam)')
    else:
        SAIDA.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'{len(cards)} cards → {SAIDA.relative_to(AQUI.parent.parent)}')
        n = sum(len(c.get('exemplos', [])) for c in distratores_dos_conceitos() if c.get('familia') in ('caso', 'verbo'))
        print(f'{n} exemplos de conceito com distratores → os cards de conceito de fonte/cards/la/')
