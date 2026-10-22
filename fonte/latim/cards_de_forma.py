"""Os cards de forma do latim (cards/LATIM.md §3.6): o caso, ou o tempo e o modo, de cada
palavra dos textos e das primeiras frases, com a nota de dificuldade que decide quais se
perguntam sempre e quais entram por sorteio.

    python -I fonte/latim/cards_de_forma.py            # grava fonte/cards/la/07-formas.json
    python -I fonte/latim/cards_de_forma.py --lista    # só mostra as notas, do maior ao menor

Sai tudo da anotação que trechos e primeiras frases já têm («palavras»: forma, card do lema,
rótulo, função); nenhuma ficha escrita à mão. Ficam de fora o nome próprio e a palavra sem card,
o invariável e a preposição. A mesma forma com a mesma resposta no mesmo texto (ou nas primeiras
frases) vira um card só, o da primeira vez em que aparece.

A nota soma três sinais (LATIM.md §3.6): a terminação ambígua (quantos casos, ou tempos e modos,
a forma pode ter no índice, formas.py), o caso ou o tempo pouco natural para quem fala português,
e a forma irregular. Do CORTE para cima, o card é perguntado sempre («sempre»: true).
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
FONTES = ['03-texto-zero.json', '04-trechos.json', '09-trechos-2.json']
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


def ambiguidade(familia, resposta, w, lema):
    """Quantas outras leituras a forma tem no índice, para o mesmo lema."""
    leituras = set()
    for a in analises_do_lema(w, lema):
        m = set(a['marcas'])
        if familia == 'caso':
            leituras |= {CASOS[x] for x in m if x in CASOS}
        else:
            modo = next((MODOS[x] for x in m if x in MODOS), None)
            tempo = next((TEMPOS[x] for x in m if x in TEMPOS), None)
            if modo:
                leituras.add((modo, tempo if modo in ('indicativo', 'subjuntivo', 'particípio') else None))
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


def gerar():
    palavras_do_baralho = {c['id']: c for c in json.loads((BARALHO / '02-palavras.json').read_text(encoding='utf-8'))}
    conceitos = {c['pt']: c['id'] for c in json.loads((BARALHO / '01-conceitos.json').read_text(encoding='utf-8'))}
    cards, vistos = [], set()
    for arquivo in FONTES:
        for fr in json.loads((BARALHO / arquivo).read_text(encoding='utf-8')):
            grupo = fr.get('texto') or 'primeiras'
            pal = fr.get('palavras', [])
            ocorrencias = {}
            for i, p in enumerate(pal):
                w = limpa(p['w'])
                k = sem_acento(w)
                ocorrencias[k] = ocorrencias.get(k, 0) + 1
                rotulo = p.get('f', '')
                lema_card = palavras_do_baralho.get(p.get('c'))
                r = resposta_de(rotulo)
                if not r or not lema_card or not w:
                    continue
                fam, resposta = r
                chave = (grupo, k, resposta)
                if chave in vistos:
                    continue
                vistos.add(chave)
                nota = nota_da_forma(fam, resposta, w, lema_card, rotulo, pal[i - 1] if i else None)
                explicacao = w + ': ' + ', '.join(x for x in (rotulo, p.get('fn')) if x) + '.'
                if fam == 'caso' and i and pal[i - 1].get('f', '').startswith('preposição'):
                    explicacao += ' Vem depois de «' + limpa(pal[i - 1]['w']) + '», ' + pal[i - 1]['f'] + '.'
                cards.append({
                    'id': 'la-x' + fr['id'][3:] + '-' + str(i),
                    'tipo': 'forma',
                    'familia': fam,
                    'la': w,
                    'frase': fr['la'],
                    'ocorrencia': ocorrencias[k],
                    'de': fr['id'],
                    'fonte': fr.get('fonte', ''),
                    'lema': p['c'],
                    'pt': resposta,
                    'aceitas': aceitas_de(fam, resposta),
                    'nota': explicacao,
                    'nivel': fr.get('nivel', 'A1'),
                    'tags': ['gramática', 'caso' if fam == 'caso' else 'forma verbal'],
                    'conceitos': [conceitos[resposta]] if resposta in conceitos else [],
                    'dificuldade': nota,
                    'sempre': nota >= CORTE,
                })
    return cards


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
        print(f'{len(cards)} cards, {sempre} sempre, {len(cards) - sempre} por sorteio')
    else:
        SAIDA.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'{len(cards)} cards → {SAIDA.relative_to(AQUI.parent.parent)}')
