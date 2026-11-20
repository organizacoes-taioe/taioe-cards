"""Grava os cards e os textos das palavras raras (cards/RARAS.md §4).

  python3 -I fonte/raras/montar.py <pasta de trabalho> <pasta da biblioteca> <obra>…

Na pasta de trabalho: dados/palavras-<obra>.json (de palavras.py), lotes/saida-*.jsonl (os agentes:
a marca, as erradas, a nota, o card de escrever e o de uso) e, se houver, sinonimos.json (os
conjuntos de sinônimos). Grava fonte/cards/pc/01-sentido.json, 02-escrever.json, 03-uso.json,
04-sinonimos.json e fonte/textos/pc/<autor>--<obra>-parte-N.json. O número do card de escrever
(pc-e) e do de uso (pc-u) é o da palavra (pc-p).
"""
import glob
import json
import os
import re
import sys

PAL = re.compile(r"[^\W\d_]+(?:-[^\W\d_]+)*")
FIM = re.compile(r"(?<=[.!?…])[»\"”]?\s+(?=[—\-«\"“(]?[A-ZÀ-Ú])")
CLITICOS = {'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes', 'o', 'a', 'os', 'as', 'lo', 'la', 'los', 'las', 'no', 'na', 'nas'}
PERGUNTA = {'sentido': 'O que quer dizer a palavra destacada?', 'escrever': 'Que palavra quer dizer isto?',
            'uso': 'Que palavra completa a frase?', 'sinonimo': 'Que palavra cabe melhor na frase?'}
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def candidatas(tok):
    saida = [tok]
    partes = tok.split('-')
    if len(partes) > 1 and all(x.lower() in CLITICOS for x in partes[1:]):
        saida.append(partes[0])
    elif len(partes) == 3 and partes[1].lower() in CLITICOS:
        saida.append(partes[0])
    return saida


def frases(par):
    partes, ini = [], 0
    for m in FIM.finditer(par):
        partes.append(par[ini:m.start() + (1 if par[m.start()] in '»"”' else 0)].strip())
        ini = m.end()
    partes.append(par[ini:].strip())
    return [p for p in partes if p]


def recorte(frase, w, teto=26):
    """A frase do card do sentido: inteira até o teto de palavras; acima dele, só as orações em
    volta da palavra, com «…» onde cortou (o parágrafo inteiro fica na tela do texto)."""
    if len(frase.split()) <= teto:
        return frase
    pedacos = re.split(r'(?<=[,;:])\s+', frase)
    alvo = next((i for i, p in enumerate(pedacos) if re.search(r'(?<![^\W\d_])' + re.escape(w) + r'(?![^\W\d_])', p)), None)
    if alvo is None:
        return frase
    a = z = alvo
    conta = lambda: sum(len(pedacos[k].split()) for k in range(a, z + 1))
    while conta() < 10:
        antes = len(pedacos[a - 1].split()) if a > 0 else 99
        depois = len(pedacos[z + 1].split()) if z + 1 < len(pedacos) else 99
        if min(antes, depois) == 99 or conta() + min(antes, depois) > teto:
            break
        if antes <= depois:
            a -= 1
        else:
            z += 1
    texto = ' '.join(pedacos[a:z + 1]).rstrip(',;:')
    if conta() > teto + 6:
        return frase
    return ('… ' if a > 0 else '') + texto + (' …' if z + 1 < len(pedacos) else '')


def romano(n):
    s = ''
    for v, r in ((1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'), (100, 'C'), (90, 'XC'), (50, 'L'), (40, 'XL'),
                 (10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v:
            s += r
            n -= v
    return s


def tags_da(classe):
    t = ['raras']
    if 'verbo' in classe:
        t.append('verbo')
    if 'adjetivo' in classe:
        t.append('adjetivo')
    return t


def main():
    trab, bib, *obras = sys.argv[1:]
    nomes = dict(re.findall(r"id: '([^']+)',\s*nome: '([^']+)'", open(os.path.join(bib, 'conteudo', 'autores.js'), encoding='utf-8').read()))
    agentes = {}
    for f in sorted(glob.glob(os.path.join(trab, 'lotes', 'saida-*.jsonl'))):
        # a versão revisada, quando há (REVISAO.md)
        rev = f.replace('saida-', 'revisada-')
        if os.path.exists(rev):
            f = rev
        for linha in open(f, encoding='utf-8'):
            linha = linha.strip()
            if linha:
                x = json.loads(linha)
                agentes[(x['obra'], x['lema'])] = x
    sentido, escrever, uso, textos = [], [], [], []
    n = 0
    ja = {}   # lema → id do primeiro card
    ja_funil = {}   # a chave do funil → id do primeiro card (homógrafos)
    com_frase = set()   # os lemas que já ganharam escrever ou uso (noutra obra)
    faltam = []
    for ordem, obra in enumerate(obras, 1):
        d = json.load(open(os.path.join(trab, 'dados', 'palavras-' + obra + '.json'), encoding='utf-8'))
        autor = nomes.get(d['autor'], d['autor'])
        id_da = {}
        for x in d['palavras']:
            a = agentes.get((obra, x['lema']))
            if not a:
                faltam.append(obra + '|' + x['lema'])
                continue
            if a.get('excluir'):   # chulo ou de duplo sentido: fora do curso (manual §2)
                continue
            n += 1
            pid = 'pc-p%03d' % n
            id_da[x['lema']] = pid
            viva = a.get('marca') == 'viva'
            c = {'id': pid, 'tipo': 'palavra', 'pc': x['lema'], 'pt': a['pt'],
                 'aceitas': sorted({re.sub(r"[^\w\s-]", '', t.lower()).strip() for t in (a['pt'], re.sub(r"\s*\([^)]*\)", '', a['pt']))}),
                 'distratores': a['distratores'], 'nivel': 'C1' if viva else 'C2', 'tags': tags_da(x['classe']),
                 'nota': a.get('nota', ''), 'escolher': True, 'pergunta': PERGUNTA['sentido'], 'selo': 'sentido',
                 'frase': recorte(x['frase'], x['w']), 'w': x['w'], 'classe': x['classe'], 'obra': obra}
            if not viva:
                c['leitura'] = True
            # o mesmo lema noutra obra, ou dois que o funil iguala («cobre» e «cobres»): homógrafos
            chave = re.sub(r"s$", '', x['lema'].lower())
            if chave in ja_funil:
                c['homografos'] = [ja_funil[chave]]
            ja_funil.setdefault(chave, pid)
            sentido.append(c)
            repetida = x['lema'] in com_frase
            ja.setdefault(x['lema'], pid)
            if viva and (a.get('escrever') or a.get('uso')):
                com_frase.add(x['lema'])
            if viva and not repetida and a.get('escrever'):
                e = a['escrever']
                escrever.append({'id': 'pc-e%03d' % n, 'tipo': 'frase', 'pc': e['pergunta'], 'pt': x['lema'],
                                 'aceitas': sorted({w.lower() for w in e.get('aceitas', [])} - {x['lema'].lower()}) or [x['lema'].lower()],
                                 'distratores': e['distratores'], 'requer': pid, 'requerTodas': [pid],
                                 'pergunta': PERGUNTA['escrever'], 'selo': 'escrever', 'nivel': 'C1', 'tags': tags_da(x['classe']),
                                 'nota': a.get('nota', '')})
                if e.get('sinonimos'):
                    escrever[-1]['sinonimos'] = e['sinonimos']
            u = a.get('uso') if viva and not repetida else None
            if u:
                fonte = nomes.get(u.get('autor'), u.get('autor') or '') + ', ' + (u.get('titulo') or '') + (' (' + str(u['ano']) + ')' if u.get('ano') else '')
                uso.append({'id': 'pc-u%03d' % n, 'tipo': 'frase', 'pc': u['frase'], 'pt': u['resposta'],
                            'aceitas': [u['resposta'].lower()], 'distratores': u['distratores'], 'escolher': True,
                            'requer': pid, 'requerTodas': [pid], 'pergunta': PERGUNTA['uso'], 'selo': 'uso', 'nivel': 'C1',
                            'tags': tags_da(x['classe']), 'fonte': fonte,
                            'nota': (u.get('nota', '') + '\n' if u.get('nota') else '') + '— ' + fonte})
        # os textos: uma parte por grupo de capítulos, só os parágrafos das palavras dela
        forma_de = {}
        for x in d['palavras']:
            if x['lema'] not in id_da:
                continue
            for f in x['formas']:
                forma_de.setdefault(f.lower(), []).append(x)
        nparts = len(d['partes'])
        for p in d['partes']:
            destinos, blocos = {}, []
            for par in p['paragrafos']:
                cap = par['cap']
                linhas = []
                for fr in frases(par['texto']):
                    pecas, ini = [], 0
                    for m in PAL.finditer(fr):
                        x = None
                        for w in candidatas(m.group(0)):
                            for y in forma_de.get(w.lower(), []):
                                if not y.get('so_capitulos') or cap in y['so_capitulos']:
                                    x = y
                                    break
                            if x:
                                break
                        if not x:
                            continue
                        if m.start() > ini:
                            pecas.append([fr[ini:m.start()], None])
                        chave = x['formas'][0].lower()
                        destinos[chave] = {'lema': x['lema'], 'classe': x['classe'], 'card': id_da[x['lema']]}
                        pecas.append([m.group(0), chave])
                        ini = m.end()
                    if ini < len(fr):
                        pecas.append([fr[ini:], None])
                    linhas.append({'t': fr, 'p': pecas})
                # o parágrafo cuja palavra saiu do curso não entra
                if any(pc[1] for l in linhas for pc in l['p']):
                    blocos.append(linhas)
            caps = p['caps']
            if len(caps) == 1 and p['titulos'][0]:
                trecho = p['titulos'][0]
            else:
                trecho = 'capítulos ' + romano(caps[0]) + ' a ' + romano(caps[-1])
            slug = d['autor'] + '/' + obra
            textos.append((d['autor'] + '--' + obra + '-parte-' + str(p['parte']) + '.json', {
                'id': slug + '-parte-' + str(p['parte']), 'idioma': 'pc', 'tipo': 'prosa', 'titulo': d['titulo'],
                'autor': autor, 'ano': d['ano'], 'biblioteca': '/biblioteca/' + d['autor'] + '/' + obra + '/',
                'fonte': None, 'ordem': ordem, 'obra': slug, 'parte': p['parte'], 'trecho': trecho,
                'blocos': blocos, 'destinos': destinos}))
    if faltam:
        print('sem o lote dos agentes:', len(faltam), ', '.join(faltam[:12]), file=sys.stderr)
    pasta = os.path.join(RAIZ, 'fonte', 'cards', 'pc')
    os.makedirs(pasta, exist_ok=True)
    for nome, lista in (('01-sentido.json', sentido), ('02-escrever.json', escrever), ('03-uso.json', uso)):
        json.dump(lista, open(os.path.join(pasta, nome), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # os sinônimos (RARAS.md §3, card 4): cada conjunto vira 2 a 4 contrastes com as mesmas alternativas
    fsin = os.path.join(trab, 'sinonimos.json')
    sin = []
    if os.path.exists(fsin):
        k = 0
        for cj in json.load(open(fsin, encoding='utf-8')):
            req = [ja[l] for l in cj.get('palavras_do_curso', []) if l in ja]
            for c in cj['cards']:
                k += 1
                fonte = nomes.get(c.get('autor'), c.get('autor') or '') + ', ' + (c.get('titulo') or '') + (' (' + str(c['ano']) + ')' if c.get('ano') else '')
                sin.append({'id': 'pc-k%03d' % k, 'tipo': 'contraste', 'conjunto': cj['conjunto'], 'pc': c['resposta'],
                            'pt': c['frase'], 'distratoresPc': [w for w in cj['alternativas'] if w != c['resposta']],
                            'aceitas': [], 'distratores': [], 'pergunta': PERGUNTA['sinonimo'], 'selo': 'sinônimos',
                            'nota': cj['nota'] + '\n— ' + fonte, 'nivel': 'C1', 'tags': ['raras', 'sinônimos'],
                            'requerTodas': req, 'fonte': fonte})
    json.dump(sin, open(os.path.join(pasta, '04-sinonimos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ptx = os.path.join(RAIZ, 'fonte', 'textos', 'pc')
    os.makedirs(ptx, exist_ok=True)
    for f in glob.glob(os.path.join(ptx, '*.json')):
        os.remove(f)
    for nome, t in textos:
        json.dump(t, open(os.path.join(ptx, nome), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(sentido), 'de sentido,', len(escrever), 'de escrever,', len(uso), 'de uso,', len(textos), 'partes')


if __name__ == '__main__':
    main()
