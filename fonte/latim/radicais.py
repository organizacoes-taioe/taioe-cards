"""O radical na nota (pedido do Gere, 04/11/2026, LATIM.md §15, D36; aula 1 do Falcon).

Quando o radical do nome ou do adjetivo não se vê no nominativo (pater → patr-, do genitivo
patris; pulcher → pulchr-, do feminino pulchra), a nota do card da palavra ganha no fim
«Radical: patr- (do genitivo patris).», e a de cada flexão de caso daquele lema, na linha da
terminação, a mesma frase. É por esse radical que se acha a palavra no dicionário.

Uso: python3 -I fonte/latim/radicais.py [--lista]   (sem --lista, grava os arquivos)
Roda de novo sem estrago: a linha que já tem «Radical:» não se repete.
"""
import json, re, sys
from pathlib import Path

LA = Path(__file__).resolve().parent.parent / 'cards' / 'la'
FLEXOES = LA / '16-flexoes.json'
SEM_RADICAL = {'la-p218'}  # vis, vim, vi: irregular, sem um radical só


def partes(enunciado):
    sem_par = re.sub(r'\([^)]*\)', '', enunciado)
    return [p.strip() for p in sem_par.split(',') if p.strip() and not re.fullmatch(r'(m|f|n|m\. e f|n\. pl|f\. pl|m\. pl)\.?', p.strip())]


def radical(card):
    """(radical, de onde vem) ou None, quando o nominativo já mostra o radical."""
    if card['id'] in SEM_RADICAL:
        return None
    tags = set(card.get('tags', []))
    p = partes(card.get('enunciado', ''))
    if len(p) < 2 or ' ' in p[0] or ' ' in p[1]:
        return None
    nom, seg = p[0], p[1]
    if 'adjetivo' in tags and len(p) >= 3 and seg.endswith('a'):
        rad, origem = seg[:-1], 'do feminino ' + seg
    else:
        for fim in ('arum', 'orum', 'ium', 'ae', 'is', 'us', 'ei', 'um', 'i', 'es'):
            if seg.endswith(fim) and len(seg) > len(fim) + 1:
                rad = seg[:-len(fim)]
                break
        else:
            return None
        origem = 'do genitivo ' + seg
    if 'adjetivo' in tags and len(p) == 2 and not seg.endswith(('is', 'ius')):
        return None  # brevis, breve: o neutro não dá o radical
    if nom.lower().startswith(rad.lower()):
        return None
    return rad, origem


def gravar_como_era(arq, cards):
    """Grava no formato que o arquivo já tinha: um card por linha, ou indentado."""
    if arq.read_text().startswith('[\n {"'):
        arq.write_text('[\n' + ',\n'.join(' ' + json.dumps(c, ensure_ascii=False) for c in cards) + '\n]\n')
    else:
        arq.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n')


def frase(rad, origem):
    return f'Radical: {rad}- ({origem}).'


def main():
    gravar = '--lista' not in sys.argv
    lemas = {}
    mudados = {}
    for arq in sorted(LA.glob('*.json')):
        cards = json.loads(arq.read_text())
        mudou = False
        for c in cards:
            if c.get('tipo') != 'palavra' or not ({'substantivo', 'adjetivo'} & set(c.get('tags', []))):
                continue
            r = radical(c)
            if not r:
                continue
            lemas[c['id']] = r
            if 'Radical:' in c.get('nota', ''):
                continue
            # «o genitivo mostra o tema» (lapis): a frase nova diz qual é
            c['nota'] = c['nota'].replace(' (o genitivo mostra o tema)', '').rstrip() + ' ' + frase(*r)
            mudou = True
            print(f"{c['id']:9} {c['enunciado']:40} → {frase(*r)}")
        if mudou:
            mudados[arq] = cards
    flex = mudados.get(FLEXOES) or json.loads(FLEXOES.read_text())
    n = 0
    for c in flex:
        r = lemas.get(c.get('lema'))
        if not r or c.get('familia') != 'caso' or 'Radical:' in c.get('nota', '') or 'o radical é' in c.get('nota', ''):
            continue
        linhas = c['nota'].split('\n')
        i = 1 if len(linhas) > 1 else 0
        tema = f'o tema é {r[0]}-'
        if tema in linhas[i]:
            # a nota antiga já dizia «o tema é patr-»: vira o radical, com a origem
            linhas[i] = linhas[i].replace(tema, f'o radical é {r[0]}-, {r[1]}')
        else:
            linhas[i] = linhas[i].rstrip() + ' ' + frase(*r)
        c['nota'] = '\n'.join(linhas)
        n += 1
    if n:
        mudados[FLEXOES] = flex
    print(f'{len(lemas)} lemas com radical diferente; {n} flexões de caso com a linha nova')
    if gravar:
        for arq, cards in mudados.items():
            gravar_como_era(arq, cards)


if __name__ == '__main__':
    main()
