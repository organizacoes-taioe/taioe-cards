"""O glossário da Eneida na Biblioteca (edicoes/lingua-original/eneida/glossario.json), tirado da
anotação dos trechos dos Cards (texto «vergilio/eneida-parte-N»): o lema, a classe, a forma e a nota
de cada palavra são os do trecho; a definição, a do sentido no verso, traduzida do en.wiktionary
(seção Latin), está em DEF. Parte nova da Eneida: as palavras novas entram em DEF, e roda-se de novo.

    python -I fonte/latim/glossario_eneida.py fonte/cards/la ../biblioteca/edicoes/lingua-original/eneida/glossario.json

Depois, na Biblioteca: lingua_original.py conferir eneida, publicar e o gerador do site."""
import json, re, sys
from pathlib import Path
CARDS = Path(sys.argv[1])          # .../cards/fonte/cards/la
SAIDA = Path(sys.argv[2])          # .../edicoes/lingua-original/eneida/glossario.json
sys.path.insert(0, str(CARDS.parent.parent / 'latim'))
import textos  # noqa: E402  (classe_de, SEM_CARD)

DEF = {
 'arma': ['Armas, armamento.'], 'vir': ['Homem valente, herói.'], '-que': ['E.'], 'cano': ['Cantar, recitar.'],
 'qui': ['Que, o qual, quem.'], 'primus': ['Primeiro.'], 'ab': ['De, desde (o lugar de onde).'],
 'ora': ['Costa, litoral, beira-mar.'], 'fatum': ['Destino, sorte.'], 'profugus': ['Banido, exilado.'],
 'venio': ['Vir (a um lugar), chegar.'], 'litus': ['Praia, margem, beira-mar.'], 'multus': ['Muito.'],
 'ille': ['Ele, ela (pronome da 3ª pessoa).'], 'et': ['E; repetido, tanto… como.'],
 'terra': ['Terra firme, oposta ao mar.'], 'iacto': ['Agitar, atormentar; lançar de um lado para o outro.'],
 'altus': ['Alto, elevado; profundo.'], 'vis': ['Força; violência.'], 'superus': ['De cima, do alto.'],
 'saevus': ['Furioso, feroz, cruel.'], 'memor': ['Que se lembra, que não esquece.'],
 'ob': ['Por causa de, por.'], 'ira': ['Ira, cólera.'], 'quoque': ['Também.'], 'bellum': ['Guerra.'],
 'patior': ['Sofrer, suportar.'], 'dum': ['(Com subjuntivo) até que.'], 'condo': ['Fundar, construir, estabelecer.'],
 'urbs': ['Cidade cercada de muralhas.'], 'infero': ['Levar para dentro, introduzir.'], 'deus': ['Deus, divindade.'],
 'genus': ['Nascimento, origem, linhagem; raça.'], 'unde': ['De onde.'], 'pater': ['Antepassado.'],
 'atque': ['E também, e ainda.'], 'moenia': ['Muralhas da cidade, fortificações.'],
 'musa': ['Musa, uma das nove deusas das artes liberais.'], 'ego': ['Eu.'], 'causa': ['Causa, motivo.'],
 'memoro': ['Contar, narrar, relatar.'], 'quis': ['Que? qual? o quê?'], 'numen': ['Vontade ou poder divino.'],
 'laedo': ['Ofender.'], 'doleo': ['Afligir-se, sentir pesar.'], 'regina': ['Rainha.'], 'tot': ['Tantos.'],
 'volvo': ['Fazer rolar, rolar.'], 'casus': ['Desgraça, infortúnio.'], 'insignis': ['Notável, ilustre.'],
 'pietas': ['Senso do dever; piedade, devoção.'], 'adeo': ['Enfrentar, empreender.'],
 'labor': ['Trabalho, fadiga, sofrimento.'], 'impello': ['Impelir, levar a, instigar.'],
 'tantus': ['Tão grande, tamanho.'], '-ve': ['Ou.'], '-ne': ['Partícula que faz a pergunta (de sim ou não).'],
 'animus': ['Ânimo, coração, espírito: a sede dos sentimentos.'], 'caelestis': ['Celeste, dos deuses.'],
}
# o mesmo lema com outro sentido em outro verso
DEF_ESPECIAL = {('et', 'também, junto com quoque'): ['Também.'],
                ('volvo', 'depende de impulerit: a passar por'): ['Fazer rolar, rolar.']}
NOTA_EXTRA = {'deos': 'São os Penates, que Eneias leva consigo.',
              'volvere': 'Volvere casus: passar por uma série de desgraças, como uma roda que gira.'}

cards = {}
for arq in sorted(CARDS.glob('*.json')):
    for c in json.loads(arq.read_text(encoding='utf-8')):
        cards[c['id']] = c
# os versos anotados (fonte/latim/versos.json), e não os trechos: desde 04/11/2026 o trecho é a frase,
# que atravessa o verso (cortes.py)
_versos = json.loads((CARDS.parent.parent / 'latim' / 'versos.json').read_text(encoding='utf-8'))
trechos = [v for tid in sorted(_versos) if tid.startswith('vergilio/eneida') for v in _versos[tid]]

def frase(fn):
    fn = fn.strip()
    return (fn[0].upper() + fn[1:]).rstrip('.') + '.' if fn else ''

def parte(p):
    if p.get('c'):
        c = cards[p['c']]
        lema = c['la']
        d = {'lema': lema, 'classe': textos.classe_de(c) or ('conjunção' if lema.startswith('-') else '')}
        if lema == '-ne':
            d['classe'] = 'partícula'
        if p.get('f'):
            d['forma'] = p['f']
        d['def'] = DEF_ESPECIAL.get((lema, p.get('fn', '')), DEF[lema])
        if lema == 'musa':   # a definição vem da página «Musa» (a deusa); «musa» é «canto, poema»
            d['lema'] = 'Musa'
        return d, p.get('fn', '')
    s = textos.SEM_CARD[p['w'].lower()]
    d = {'lema': s['lema'], 'classe': s['classe']}
    if p.get('f'):
        d['forma'] = p['f']
    d['def'] = s['def']
    fn = p.get('fn', '')
    if ':' in fn:
        fn = fn.split(':', 1)[1].strip()
    return d, fn

PAL = re.compile(r'[A-Za-zÀ-ÿ]+')
verbetes, ocorrencias = {}, {}
# o título, «Liber I» (o livro da obra «Aeneis»)
verbetes['liber'] = {'lema': 'liber', 'classe': 'substantivo masculino', 'def': ['Livro; cada uma das partes de uma obra.']}
verbetes['i'] = {'lema': 'I', 'classe': 'numeral', 'def': ['Um (em algarismo romano).'], 'nota': 'O primeiro livro da Eneida.'}
for n, tr in enumerate(trechos, start=1):
    fila = list(tr['palavras'])
    for pos, m in enumerate(PAL.finditer(tr['la']), start=1):
        w = m.group(0)
        partes = [fila.pop(0)]
        while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
            partes.append(fila.pop(0))
        if len(partes) == 1:
            d, fn = parte(partes[0])
            nota = (frase(fn) + ' ' + NOTA_EXTRA[w.lower()]).strip() if w.lower() in NOTA_EXTRA else frase(fn)
            if nota:
                d['nota'] = nota
        else:
            ds = [parte(x) for x in partes]
            d = {'partes': [x[0] for x in ds]}
            nota = frase(ds[0][1])
            if nota:
                d['nota'] = nota
        base = w.lower()
        k, i = base, 1
        while k in verbetes and verbetes[k] != d:
            i += 1
            k = f'{base}#{i}'
        verbetes[k] = d
        if k != base:
            ocorrencias[f'{n}.{pos}'] = k
    assert not fila, tr['la']
SAIDA.write_text(json.dumps({'verbetes': verbetes, 'ocorrencias': ocorrencias}, ensure_ascii=False, indent=2) + '\n',
                 encoding='utf-8', newline='\n')
print(len(verbetes), 'verbetes;', len(ocorrencias), 'ocorrências especiais')
