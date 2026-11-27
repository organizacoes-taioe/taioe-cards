"""Grava os cards e os textos das palavras raras (cards/RARAS.md §4).

  python3 -I fonte/raras/montar.py <pasta de trabalho> <pasta da biblioteca> <obra>…

A pasta de trabalho do piloto está no repositório: fonte/raras/trabalho (correção de card: na
linha da palavra em trabalho/lotes/revisada-N.jsonl, ou em trabalho/sinonimos.json, e montar de
novo; o que se muda à mão em fonte/cards/pc/ se perde):
  python3 -I fonte/raras/montar.py fonte/raras/trabalho ../biblioteca vidas-secas dom-casmurro

O «Português» sem textos (27/11/2026, RARAS.md §6): as obras não gravam mais textos, e as palavras
da lista do Gere (fora dos livros) vêm de trabalho/lista/: leva-N.json (a ordem da leva) e
lotes/revisada-*.jsonl (ou saida-*.jsonl) dos agentes (briefs/LISTA.md). Os ids delas ficam em
trabalho/lista/ids.json (palavra → número), para não mudarem quando uma palavra sai. Gravam
00-lista-1-sentido.json, 00-lista-2-escrever.json e 00-lista-3-uso.json, que o build lê antes das
obras: a fila do curso começa por elas. Todo card com frase traz na nota de onde ela veio.

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


def fonte_de(autor, titulo, ano, atualizada=False):
    s = (autor or '') + (', ' if autor and titulo else '') + (titulo or '') + (' (' + str(ano) + ')' if ano else '')
    return s + ('; grafia atualizada' if atualizada else '')


def com_fonte(nota, fonte):
    # a fonte vai no campo «fonte», que o app mostra no fim da nota («📖 Frase de …»)
    return nota


def tags_da(classe):
    t = ['palavras difíceis']
    if 'verbo' in classe:
        t.append('verbo')
    if 'adjetivo' in classe:
        t.append('adjetivo')
    return t


def main():
    trab, bib, *obras = sys.argv[1:]
    nomes = dict(re.findall(r"id: '([^']+)',\s*nome: '([^']+)'", open(os.path.join(bib, 'conteudo', 'autores.js'), encoding='utf-8').read()))
    agentes = {}
    # a versão revisada de cada lote (REVISAO.md), ou a dos agentes, quando não há revisada
    revisadas = sorted(glob.glob(os.path.join(trab, 'lotes', 'revisada-*.jsonl')))
    saidas = [f for f in sorted(glob.glob(os.path.join(trab, 'lotes', 'saida-*.jsonl')))
              if not os.path.exists(f.replace('saida-', 'revisada-'))]
    for f in revisadas + saidas:
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
            fonte_livro = fonte_de(autor, d['titulo'], d.get('ano'))
            c = {'id': pid, 'tipo': 'palavra', 'pc': x['lema'], 'pt': a['pt'],
                 'aceitas': sorted({re.sub(r"[^\w\s-]", '', t.lower()).strip() for t in (a['pt'], re.sub(r"\s*\([^)]*\)", '', a['pt']))}),
                 'distratores': a['distratores'], 'nivel': 'C1' if viva else 'C2', 'tags': tags_da(x['classe']),
                 'nota': com_fonte(a.get('nota', ''), fonte_livro), 'fonte': fonte_livro, 'escolher': True, 'pergunta': PERGUNTA['sentido'], 'selo': 'sentido',
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
                fonte = fonte_de(nomes.get(u.get('autor'), u.get('autor') or ''), u.get('titulo'), u.get('ano'))
                uso.append({'id': 'pc-u%03d' % n, 'tipo': 'frase', 'pc': u['frase'], 'pt': u['resposta'],
                            'aceitas': [u['resposta'].lower()], 'distratores': u['distratores'], 'escolher': True,
                            'requer': pid, 'requerTodas': [pid], 'pergunta': PERGUNTA['uso'], 'selo': 'uso', 'nivel': 'C1',
                            'tags': tags_da(x['classe']), 'fonte': fonte,
                            'nota': com_fonte(u.get('nota', ''), fonte)})
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
                fonte = fonte_de(nomes.get(c.get('autor'), c.get('autor') or ''), c.get('titulo'), c.get('ano'))
                sin.append({'id': 'pc-k%03d' % k, 'tipo': 'contraste', 'conjunto': cj['conjunto'], 'pc': c['resposta'],
                            'pt': c['frase'], 'distratoresPc': [w for w in cj['alternativas'] if w != c['resposta']],
                            'aceitas': [], 'distratores': [], 'pergunta': PERGUNTA['sinonimo'], 'selo': 'sinônimos',
                            'nota': com_fonte(cj['nota'], fonte), 'nivel': 'C1', 'tags': ['palavras difíceis', 'sinônimos'],
                            'requerTodas': req, 'fonte': fonte})
    json.dump(sin, open(os.path.join(pasta, '04-sinonimos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ptx = os.path.join(RAIZ, 'fonte', 'textos', 'pc')
    os.makedirs(ptx, exist_ok=True)
    # desde 27/11/2026 o curso não tem textos: as partes se calculam (a conferência das formas), mas
    # não se gravam, e as antigas saem
    for f in glob.glob(os.path.join(ptx, '*.json')):
        os.remove(f)
    print(len(sentido), 'de sentido,', len(escrever), 'de escrever,', len(uso), 'de uso (obras)')
    montar_lista(os.path.join(trab, 'lista'), pasta, n, nomes)


def montar_lista(dir_lista, pasta, n_obras, nomes):
    """As palavras da lista do Gere (RARAS.md §6): ids estáveis em ids.json, a partir do último das
    obras; na fila, primeiro as que ele marcou, os grupos alternados (adjetivo, verbo, substantivo…)."""
    if not os.path.isdir(dir_lista):
        return
    leva = []
    for f in sorted(glob.glob(os.path.join(dir_lista, 'leva-*.json')), key=lambda f: int(re.findall(r'\d+', os.path.basename(f))[0])):
        leva += json.load(open(f, encoding='utf-8'))
    agentes = {}
    rev = sorted(glob.glob(os.path.join(dir_lista, 'lotes', 'revisada-*.jsonl')))
    sai = [f for f in sorted(glob.glob(os.path.join(dir_lista, 'lotes', 'saida-*.jsonl'))) if not os.path.exists(f.replace('saida-', 'revisada-'))]
    for f in rev + sai:
        for linha in open(f, encoding='utf-8'):
            if linha.strip():
                x = json.loads(linha)
                agentes[x['p']] = x
    f_ids = os.path.join(dir_lista, 'ids.json')
    ids = json.load(open(f_ids, encoding='utf-8')) if os.path.exists(f_ids) else {}
    prox = max([n_obras] + list(ids.values())) + 1
    # a ordem da fila: as marcadas antes; dentro de cada origem, os grupos em rodízio
    grupos = ['adj', 'verbo', 'subst', 'adv', 'conc', 'lat', 'par', 'sent']
    ordem = []
    for origem in ('marcada', 'fim da lista'):
        filas = {g: [x for x in leva if x.get('origem', 'marcada') == origem and x['grupo'] == g] for g in grupos}
        while any(filas.values()):
            for g in grupos:
                if filas[g]:
                    ordem.append(filas[g].pop(0))
    sentido, escrever, uso, faltam, sem = [], [], [], [], []
    classe_do = {'adj': 'adjetivo', 'verbo': 'verbo', 'subst': 'substantivo', 'adv': 'locução', 'conc': 'substantivo'}
    for x in ordem:
        a = agentes.get(x['p'])
        if not a:
            faltam.append(x['p'])
            continue
        if a.get('sem_frase') or a.get('excluir'):
            sem.append(x['p'])
            continue
        if x['p'] not in ids:
            ids[x['p']] = prox
            prox += 1
        k = ids[x['p']]
        pid = 'pc-p%03d' % k
        viva = a.get('marca') == 'viva'
        s = a['sentido']
        fonte = fonte_de(nomes.get(s.get('autor'), s.get('autor')), s.get('titulo'), s.get('ano'), s.get('grafia_atualizada'))
        frase = recorte(s['frase'], s['forma'], 30)
        c = {'id': pid, 'tipo': 'palavra', 'pc': x['p'], 'pt': a['pt'],
             'aceitas': sorted({re.sub(r"[^\w\s-]", '', t.lower()).strip() for t in (a['pt'], re.sub(r"\s*\([^)]*\)", '', a['pt']))}),
             'distratores': a['distratores'], 'nivel': 'C1' if viva else 'C2', 'tags': tags_da(classe_do.get(x['grupo'], '')),
             'nota': com_fonte(a.get('nota', ''), fonte), 'fonte': fonte, 'escolher': True,
             'pergunta': PERGUNTA['sentido'], 'selo': 'sentido', 'frase': frase, 'w': s['forma'],
             'classe': classe_do.get(x['grupo'], ''), 'lista': x['grupo']}
        if not viva:
            c['leitura'] = True
        sentido.append(c)
        e = a.get('escrever') if viva else None
        if e:
            escrever.append({'id': 'pc-e%03d' % k, 'tipo': 'frase', 'pc': e['pergunta'], 'pt': x['p'],
                             'aceitas': sorted({w.lower() for w in e.get('aceitas', [])} - {x['p'].lower()}) or [x['p'].lower()],
                             'distratores': e['distratores'], 'requer': pid, 'requerTodas': [pid],
                             'pergunta': PERGUNTA['escrever'], 'selo': 'escrever', 'nivel': 'C1',
                             'tags': tags_da(classe_do.get(x['grupo'], '')), 'nota': a.get('nota', '')})
            if e.get('sinonimos'):
                escrever[-1]['sinonimos'] = e['sinonimos']
        u = a.get('uso') if viva else None
        if u:
            fu = fonte_de(nomes.get(u.get('autor'), u.get('autor')), u.get('titulo'), u.get('ano'), u.get('grafia_atualizada'))
            uso.append({'id': 'pc-u%03d' % k, 'tipo': 'frase', 'pc': u['frase'], 'pt': u['resposta'],
                        'aceitas': [u['resposta'].lower()], 'distratores': u['distratores'], 'escolher': True,
                        'requer': pid, 'requerTodas': [pid], 'pergunta': PERGUNTA['uso'], 'selo': 'uso', 'nivel': 'C1',
                        'tags': tags_da(classe_do.get(x['grupo'], '')), 'fonte': fu,
                        'nota': com_fonte(u.get('nota', ''), fu)})
    for nome, lista in (('00-lista-1-sentido.json', sentido), ('00-lista-2-escrever.json', escrever), ('00-lista-3-uso.json', uso)):
        json.dump(lista, open(os.path.join(pasta, nome), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(ids, open(f_ids, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if faltam:
        print('lista, sem o lote dos agentes:', len(faltam), ', '.join(faltam[:12]), file=sys.stderr)
    print(len(sentido), 'de sentido,', len(escrever), 'de escrever,', len(uso), 'de uso (lista);', len(sem), 'sem frase:', ', '.join(sem))


if __name__ == '__main__':
    main()
