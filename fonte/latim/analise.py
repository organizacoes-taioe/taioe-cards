"""Os cards de análise e a nota pelo verbo (pedido do Gere, 04/11/2026, LATIM.md §15; aula 1 do Falcon).

Das levas (fora do git, em fonte/latim/cache/levas/), escritas por agentes e revistas:
- analise-frases-*.json, uma entrada por frase (primeiras frases e versos):
  «verbo» → o card «Qual é o verbo desta frase?» (D39);
  «concordancias» → os cards «Com que palavra concorda a palavra destacada?» (D42);
  «leitura» → a primeira linha da nota da frase, pelo verbo e pelo que ele pede (D35);
  «distratorConcordancia» → a errada que liga o adjetivo ao nome errado, na frente das erradas da
  frase (D37; a última sai, para ficarem quatro).
- analise-verbos.json, uma entrada por verbo: o card «O que este verbo pede?» (a regência, D40).

Grava fonte/cards/la/25-analise.json e as notas e erradas das frases. Roda de novo sem estrago.
Uso: python3 -I fonte/latim/analise.py [--lista]
"""
import json, re, sys, unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
LA = AQUI.parent / 'cards' / 'la'
LEVAS = AQUI / 'cache' / 'levas'
SAIDA = LA / '25-analise.json'
TAGS = ['gramática', 'análise']
PERGUNTA = {
    'concordancia': 'Com que palavra concorda a palavra destacada?',
    'regencia': 'O que este verbo pede?',
}


def chave(w):
    s = unicodedata.normalize('NFD', str(w).lower())
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).replace('j', 'i').replace('v', 'u')


def ler(arq):
    texto = arq.read_text(encoding='utf-8')
    return json.loads(texto), texto.startswith('[\n {"')


def gravar(arq, cards, compacto):
    if compacto:
        arq.write_text('[\n' + ',\n'.join(' ' + json.dumps(c, ensure_ascii=False) for c in cards) + '\n]\n', encoding='utf-8')
    else:
        arq.write_text(json.dumps(cards, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def sufixo(id_):
    return id_.split('-', 1)[1]


def card_da_frase(fr, ent, pal):
    """O card do verbo, ou None."""
    v = ent.get('verbo')
    if not v:
        return None
    certa = pal[v['i']]['w']
    erradas = []
    for j in v['distratores']:
        w = pal[j]['w']
        if w.startswith('-') or chave(w) == chave(certa) or chave(w) in map(chave, erradas):
            continue
        erradas.append(w)
    if len(erradas) < 2:
        return None
    return {'id': 'la-a' + sufixo(fr['id']) + '-v', 'tipo': 'analise', 'familia': 'verbo', 'la': certa,
            'frase': fr['la'], 'de': fr['id'], 'pt': certa, 'distratores': erradas[:4],
            'pergunta': v['pergunta'], 'nota': v['nota'], 'nivel': fr['nivel'], 'tags': TAGS,
            **({'fonte': fr['fonte']} if fr.get('fonte') else {})}


def cards_de_concordancia(fr, ent, pal):
    saida = []
    for k in ent.get('concordancias') or []:
        w = pal[k['i']]['w']
        certa = pal[k['com']]['w']
        erradas = []
        for j in k['distratores']:
            x = pal[j]['w']
            if x.startswith('-') or chave(x) in {chave(certa), chave(w)} or chave(x) in map(chave, erradas):
                continue
            erradas.append(x)
        if len(erradas) < 2:
            continue
        vez = sum(1 for p in pal[:k['i']] if chave(p['w']) == chave(w)) + 1
        saida.append({'id': 'la-a' + sufixo(fr['id']) + '-c' + str(k['i']), 'tipo': 'analise', 'familia': 'concordancia',
                      'la': w, 'ocorrencia': vez, 'frase': fr['la'], 'de': fr['id'], 'pt': certa,
                      'distratores': erradas[:4], 'pergunta': PERGUNTA['concordancia'], 'nota': k['nota'],
                      'nivel': fr['nivel'], 'tags': TAGS, **({'fonte': fr['fonte']} if fr.get('fonte') else {})})
    return saida


def main():
    lista = '--lista' in sys.argv
    arquivos = {}
    porid = {}
    for arq in sorted(LA.glob('*.json')):
        if arq == SAIDA:
            continue
        cards, compacto = ler(arq)
        arquivos[arq] = (cards, compacto)
        for c in cards:
            porid[c['id']] = (arq, c)
    mudou = set()
    novos = []
    leituras = erradas = 0
    for leva in sorted(LEVAS.glob('analise-frases-*.json')):
        for ent in json.loads(leva.read_text(encoding='utf-8')):
            arq, fr = porid[ent['id']]
            pal = fr['palavras']
            c = card_da_frase(fr, ent, pal)
            if c:
                novos.append(c)
            novos.extend(cards_de_concordancia(fr, ent, pal))
            leitura = (ent.get('leitura') or '').strip()
            if leitura and not fr['nota'].startswith(leitura):
                fr['nota'] = leitura + '\n' + fr['nota']
                mudou.add(arq)
                leituras += 1
            dc = (ent.get('distratorConcordancia') or '').strip()
            if dc and dc not in fr['distratores']:
                fr['distratores'] = [dc] + fr['distratores'][:3]
                mudou.add(arq)
                erradas += 1
    verbos = LEVAS / 'analise-verbos.json'
    if verbos.exists():
        for ent in json.loads(verbos.read_text(encoding='utf-8')):
            if not ent.get('pt'):
                continue
            _, lema = porid[ent['id']]
            novos.append({'id': 'la-a' + sufixo(ent['id']) + '-r', 'tipo': 'analise', 'familia': 'regencia',
                          'la': lema['enunciado'], 'lema': ent['id'], 'pt': ent['pt'],
                          'distratores': ent['distratores'][:4], 'pergunta': PERGUNTA['regencia'],
                          'nota': ent['nota'], 'nivel': lema['nivel'], 'tags': TAGS,
                          'requerTodas': [ent['id']]})
    familias = {}
    for c in novos:
        familias[c['familia']] = familias.get(c['familia'], 0) + 1
    if lista:
        for c in novos:
            print(f"{c['id']:16} {c['familia']:13} {c['la'][:30]:30} → {c['pt'][:50]:50} × {' | '.join(c['distratores'])[:80]}")
    print(f"{len(novos)} cards de análise {familias}; {leituras} notas com a leitura pelo verbo; {erradas} frases com a errada de concordância")
    if not lista:
        SAIDA.write_text(json.dumps(novos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        for arq in mudou:
            gravar(arq, *arquivos[arq])


if __name__ == '__main__':
    main()
