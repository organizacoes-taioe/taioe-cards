"""Os cards de flexão do latim (cards/LATIM.md §3.8): cada forma que aparece numa frase e não é a
do dicionário (id, faciam, requiris, Domini) ganha um card que pergunta o sentido dela em
português, com a gramática dentro («isso», «que eu faça», «perguntas», «do Senhor»). Os pronomes
e sum e possum ganham a tabela inteira, também as formas que ainda não apareceram, e nos
pronomes de três gêneros também as formas do dicionário (is, ea, id).

    python -I fonte/latim/flexoes.py lista                   # quantas formas, quantas com card
    python -I fonte/latim/flexoes.py faltam [--saida X.json] # as formas sem card, com o contexto,
                                                             # para quem escreve a leva
    python -I fonte/latim/flexoes.py gravar [leva.json ...]  # junta as tabelas e as levas em
                                                             # 16-flexoes.json e refaz o
                                                             # «requerTodas» das frases

O «gravar» nunca reescreve um card que já está em 16-flexoes.json (a correção feita à mão fica):
só acrescenta as formas novas, das tabelas ou das levas, e refaz o «requerTodas» de toda frase
presa (os lemas e, depois deles, as flexões, na ordem da frase). Texto novo (a Eneida, por
exemplo): «faltam» → a leva escrita → «gravar» → build.

A leva é uma lista de cards sem id: la, lema (o id do card do lema), analise, pt (a leitura
principal, a que a múltipla escolha mostra), outras (as outras leituras), aceitas, distratores
(4) e nota. As regras de cada campo estão em LATIM.md §3.8.
"""

import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import latim  # noqa: E402

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
SAIDA = BARALHO / '16-flexoes.json'

# o conceito de cada análise: entra antes do card (ver ordenarTrilhas no app)
CONCEITOS = [
    ('nominativo', 'la-g001'), ('vocativo', 'la-g002'), ('acusativo', 'la-g003'),
    ('genitivo', 'la-g004'), ('dativo', 'la-g005'), ('ablativo', 'la-g006'),
    ('presente do indicativo', 'la-g007'), ('imperfeito do indicativo', 'la-g008'),
    ('perfeito do indicativo', 'la-g009'), ('futuro do indicativo', 'la-g010'),
    ('imperativo', 'la-g011'), ('presente do subjuntivo', 'la-g012'), ('infinitivo', 'la-g013'),
    ('particípio perfeito', 'la-g014'), ('passiv', 'la-g015'),
    ('imperfeito do subjuntivo', 'la-g017'), ('perfeito do subjuntivo', 'la-g018'),
    ('particípio presente', 'la-g019'),
]

# ── as tabelas ──
# (forma, análise, a leitura principal, as outras leituras, as aceitas)
# A leitura principal é a que a múltipla escolha mostra; quando o português diz igual o sujeito e
# o objeto, o parêntese separa («ele (sujeito)» × «o, ele (objeto)»), e na escrita basta «ele».
TABELAS = {
    'is': {
        'resumo': 'Singular: is, ea, id (nom.); eum, eam, id (acus.); eius (gen.); ei (dat.); eo, ea, eo '
                  '(abl.). Plural: ii, eae, ea (nom.); eos, eas, ea (acus.); eorum, earum, eorum (gen.); '
                  'eis (dat. e abl.).',
        'formas': [
            ('is', 'nominativo masculino singular', 'ele (sujeito)', [], ['ele', 'este', 'esse']),
            ('ea', 'nominativo feminino singular; também ablativo feminino singular e nominativo e acusativo neutro plural',
             'ela (sujeito)', ['por ela, com ela', 'essas coisas'],
             ['ela', 'esta', 'essa', 'por ela', 'com ela', 'nela', 'essas coisas', 'estas coisas']),
            ('id', 'nominativo e acusativo neutro singular', 'isso', [], ['isso', 'isto']),
            ('eius', 'genitivo singular, dos três gêneros', 'dele, dela', [], ['dele', 'dela', 'disso', 'deste', 'desta']),
            ('ei', 'dativo singular, dos três gêneros; também nominativo masculino plural', 'a ele, a ela, lhe',
             ['eles (sujeito)'], ['a ele', 'a ela', 'lhe', 'para ele', 'para ela', 'eles']),
            ('eum', 'acusativo masculino singular', 'o, ele (objeto)', [], ['o', 'ele', 'lo', 'no', 'este']),
            ('eam', 'acusativo feminino singular', 'a, ela (objeto)', [], ['a', 'ela', 'la', 'na', 'esta']),
            ('eo', 'ablativo masculino e neutro singular', 'por ele, com ele', ['por isso, com isso'],
             ['por ele', 'com ele', 'nele', 'por isso', 'com isso', 'nisso']),
            ('ii', 'nominativo masculino plural', 'eles (sujeito)', [], ['eles', 'estes', 'esses']),
            ('eae', 'nominativo feminino plural', 'elas (sujeito)', [], ['elas', 'estas', 'essas']),
            ('eorum', 'genitivo masculino e neutro plural', 'deles', [], ['deles', 'destes']),
            ('earum', 'genitivo feminino plural', 'delas', [], ['delas', 'destas']),
            ('eis', 'dativo e ablativo plural, dos três gêneros', 'a eles, lhes', ['por eles, com eles'],
             ['a eles', 'a elas', 'lhes', 'para eles', 'para elas', 'por eles', 'por elas', 'com eles',
              'com elas', 'neles', 'nelas']),
            ('eos', 'acusativo masculino plural', 'os, eles (objeto)', [], ['os', 'eles', 'los']),
            ('eas', 'acusativo feminino plural', 'as, elas (objeto)', [], ['as', 'elas', 'las']),
        ],
    },
    'hic': {
        'resumo': 'Singular: hic, haec, hoc (nom.); hunc, hanc, hoc (acus.); huius (gen.); huic (dat.); hoc, '
                  'hac, hoc (abl.). Plural: hi, hae, haec (nom.); hos, has, haec (acus.); horum, harum, horum '
                  '(gen.); his (dat. e abl.).',
        'formas': [
            ('hic', 'nominativo masculino singular', 'este (sujeito)', [], ['este', 'esse']),
            ('haec', 'nominativo feminino singular; também nominativo e acusativo neutro plural', 'esta (sujeito)',
             ['estas coisas'], ['esta', 'essa', 'estas coisas', 'essas coisas']),
            ('hoc', 'nominativo e acusativo neutro singular; também ablativo masculino e neutro singular', 'isto',
             ['por este, com este'], ['isto', 'isso', 'por este', 'com este', 'neste', 'por isto', 'com isto', 'nisto']),
            ('huius', 'genitivo singular, dos três gêneros', 'deste, desta', [], ['deste', 'desta', 'disto']),
            ('huic', 'dativo singular, dos três gêneros', 'a este, a esta', [],
             ['a este', 'a esta', 'para este', 'para esta', 'a isto']),
            ('hunc', 'acusativo masculino singular', 'este (objeto)', [], ['este', 'esse']),
            ('hanc', 'acusativo feminino singular', 'esta (objeto)', [], ['esta', 'essa']),
            ('hac', 'ablativo feminino singular', 'por esta, com esta', [], ['por esta', 'com esta', 'nesta']),
            ('hi', 'nominativo masculino plural', 'estes (sujeito)', [], ['estes', 'esses']),
            ('hae', 'nominativo feminino plural', 'estas (sujeito)', [], ['estas', 'essas']),
            ('horum', 'genitivo masculino e neutro plural', 'destes', [], ['destes', 'desses']),
            ('harum', 'genitivo feminino plural', 'destas', [], ['destas', 'dessas']),
            ('his', 'dativo e ablativo plural, dos três gêneros', 'a estes, a estas', ['por estes, com estes'],
             ['a estes', 'a estas', 'para estes', 'para estas', 'por estes', 'por estas', 'com estes',
              'com estas', 'nestes', 'nestas']),
            ('hos', 'acusativo masculino plural', 'estes (objeto)', [], ['estes', 'esses']),
            ('has', 'acusativo feminino plural', 'estas (objeto)', [], ['estas', 'essas']),
        ],
    },
    'ille': {
        'resumo': 'Singular: ille, illa, illud (nom.); illum, illam, illud (acus.); illius (gen.); illi (dat.); '
                  'illo, illa, illo (abl.). Plural: illi, illae, illa (nom.); illos, illas, illa (acus.); illorum, '
                  'illarum, illorum (gen.); illis (dat. e abl.). Como hic, o genitivo em -ius e o dativo em -i.',
        'formas': [
            ('ille', 'nominativo masculino singular', 'aquele (sujeito)', [], ['aquele', 'ele']),
            ('illa', 'nominativo feminino singular; também ablativo feminino singular e nominativo e acusativo neutro plural',
             'aquela (sujeito)', ['por aquela, com aquela', 'aquelas coisas'],
             ['aquela', 'ela', 'por aquela', 'com aquela', 'naquela', 'aquelas coisas']),
            ('illud', 'nominativo e acusativo neutro singular', 'aquilo', [], ['aquilo', 'isso']),
            ('illius', 'genitivo singular, dos três gêneros', 'daquele, daquela', [],
             ['daquele', 'daquela', 'daquilo', 'dele', 'dela']),
            ('illi', 'dativo singular, dos três gêneros; também nominativo masculino plural', 'àquele, àquela',
             ['aqueles (sujeito)'], ['àquele', 'àquela', 'a ele', 'a ela', 'lhe', 'aqueles', 'eles']),
            ('illum', 'acusativo masculino singular', 'aquele (objeto)', [], ['aquele', 'o', 'ele']),
            ('illam', 'acusativo feminino singular', 'aquela (objeto)', [], ['aquela', 'a', 'ela']),
            ('illo', 'ablativo masculino e neutro singular', 'por aquele', ['com aquele', 'por aquilo, com aquilo'],
             ['por aquele', 'com aquele', 'naquele', 'por aquilo', 'com aquilo', 'naquilo']),
            ('illae', 'nominativo feminino plural', 'aquelas (sujeito)', [], ['aquelas', 'elas']),
            ('illorum', 'genitivo masculino e neutro plural', 'daqueles', [], ['daqueles', 'deles']),
            ('illarum', 'genitivo feminino plural', 'daquelas', [], ['daquelas', 'delas']),
            ('illis', 'dativo e ablativo plural, dos três gêneros', 'àqueles, àquelas', ['por aqueles, com aqueles'],
             ['àqueles', 'àquelas', 'a eles', 'a elas', 'lhes', 'por aqueles', 'com aqueles', 'naqueles',
              'por aquelas', 'com aquelas', 'naquelas']),
            ('illos', 'acusativo masculino plural', 'aqueles (objeto)', [], ['aqueles', 'os', 'eles']),
            ('illas', 'acusativo feminino plural', 'aquelas (objeto)', [], ['aquelas', 'as', 'elas']),
        ],
    },
    'qui': {
        'resumo':'Singular: qui, quae, quod (nom.); quem, quam, quod (acus.); cuius (gen.); cui (dat.); quo, '
                  'qua, quo (abl.). Plural: qui, quae, quae (nom.); quos, quas, quae (acus.); quorum, quarum, '
                  'quorum (gen.); quibus (dat. e abl.).',
        'formas': [
            ('qui', 'nominativo masculino singular e plural', 'que, o qual (sujeito)', ['que, os quais (sujeito)'],
             ['que', 'o qual', 'os quais', 'quem']),
            ('quae', 'nominativo feminino singular e plural; também nominativo e acusativo neutro plural',
             'que, a qual (sujeito)', ['que, as quais (sujeito)', 'as coisas que'],
             ['que', 'a qual', 'as quais', 'as coisas que']),
            ('quod', 'nominativo e acusativo neutro singular', 'o que', [], ['o que', 'que', 'o qual', 'aquilo que']),
            ('cuius', 'genitivo singular, dos três gêneros', 'cujo, de quem', ['do qual, da qual'],
             ['cujo', 'cuja', 'de quem', 'do qual', 'da qual']),
            ('cui', 'dativo singular, dos três gêneros', 'a quem, ao qual', ['à qual'], ['a quem', 'ao qual', 'à qual']),
            ('quem', 'acusativo masculino singular', 'que, o qual (objeto)', [], ['que', 'o qual', 'quem']),
            ('quam', 'acusativo feminino singular', 'que, a qual (objeto)', [], ['que', 'a qual']),
            ('quo', 'ablativo masculino e neutro singular', 'pelo qual, com o qual', ['no qual, em que'],
             ['pelo qual', 'com o qual', 'no qual', 'por quem', 'com quem', 'em que']),
            ('qua', 'ablativo feminino singular', 'pela qual, com a qual', ['na qual'],
             ['pela qual', 'com a qual', 'na qual', 'em que']),
            ('quorum', 'genitivo masculino e neutro plural', 'dos quais', ['de quem, cujos'],
             ['dos quais', 'de quem', 'cujo', 'cuja', 'cujos', 'cujas']),
            ('quarum', 'genitivo feminino plural', 'das quais', ['de quem, cujas'],
             ['das quais', 'de quem', 'cujo', 'cuja', 'cujos', 'cujas']),
            ('quibus', 'dativo e ablativo plural, dos três gêneros', 'aos quais, a quem',
             ['pelos quais, com os quais'],
             ['aos quais', 'às quais', 'a quem', 'pelos quais', 'pelas quais', 'com os quais', 'com as quais',
              'nos quais', 'nas quais', 'com quem', 'por quem']),
            ('quos', 'acusativo masculino plural', 'que, os quais (objeto)', [], ['que', 'os quais', 'quem']),
            ('quas', 'acusativo feminino plural', 'que, as quais (objeto)', [], ['que', 'as quais']),
        ],
    },
    'idem': {
        'resumo': 'Singular: idem, eadem, idem (nom.); eundem, eandem, idem (acus.); eiusdem (gen.); eidem '
                  '(dat.); eodem, eadem, eodem (abl.). Plural: iidem, eaedem, eadem (nom.); eosdem, easdem, '
                  'eadem (acus.); eorundem, earundem, eorundem (gen.); eisdem (dat. e abl.). É is, ea, id com '
                  '-dem.',
        'formas': [
            ('idem', 'nominativo masculino singular; também nominativo e acusativo neutro singular',
             'o mesmo (sujeito)', ['a mesma coisa'], ['o mesmo', 'mesmo', 'a mesma coisa']),
            ('eadem', 'nominativo feminino singular; também ablativo feminino singular e nominativo e acusativo neutro plural',
             'a mesma (sujeito)', ['pela mesma, com a mesma', 'as mesmas coisas'],
             ['a mesma', 'mesma', 'pela mesma', 'com a mesma', 'na mesma', 'as mesmas coisas']),
            ('eiusdem', 'genitivo singular, dos três gêneros', 'do mesmo, da mesma', [], ['do mesmo', 'da mesma']),
            ('eidem', 'dativo singular, dos três gêneros; também nominativo masculino plural', 'ao mesmo, à mesma',
             ['os mesmos (sujeito)'], ['ao mesmo', 'à mesma', 'para o mesmo', 'para a mesma', 'os mesmos']),
            ('eundem', 'acusativo masculino singular', 'o mesmo (objeto)', [], ['o mesmo', 'mesmo']),
            ('eandem', 'acusativo feminino singular', 'a mesma (objeto)', [], ['a mesma', 'mesma']),
            ('eodem', 'ablativo masculino e neutro singular', 'pelo mesmo, com o mesmo', ['no mesmo'],
             ['pelo mesmo', 'com o mesmo', 'no mesmo']),
            ('iidem', 'nominativo masculino plural', 'os mesmos (sujeito)', [], ['os mesmos', 'mesmos']),
            ('eaedem', 'nominativo feminino plural', 'as mesmas (sujeito)', [], ['as mesmas', 'mesmas']),
            ('eorundem', 'genitivo masculino e neutro plural', 'dos mesmos', [], ['dos mesmos']),
            ('earundem', 'genitivo feminino plural', 'das mesmas', [], ['das mesmas']),
            ('eisdem', 'dativo e ablativo plural, dos três gêneros', 'aos mesmos, às mesmas',
             ['pelos mesmos, com os mesmos'],
             ['aos mesmos', 'às mesmas', 'pelos mesmos', 'pelas mesmas', 'com os mesmos', 'com as mesmas',
              'nos mesmos', 'nas mesmas']),
            ('eosdem', 'acusativo masculino plural', 'os mesmos (objeto)', [], ['os mesmos', 'mesmos']),
            ('easdem', 'acusativo feminino plural', 'as mesmas (objeto)', [], ['as mesmas', 'mesmas']),
        ],
    },
    'ego': {
        'resumo': 'ego (eu), mei (de mim), mihi (a mim, me), me (me; por mim); mecum (comigo).',
        'formas': [
            ('mei', 'genitivo singular', 'de mim', [], ['de mim']),
            ('mihi', 'dativo singular', 'a mim, me', ['para mim'], ['a mim', 'me', 'para mim', 'mim']),
            ('me', 'acusativo singular; também ablativo singular', 'me (objeto)', ['por mim, comigo'],
             ['me', 'mim', 'por mim', 'comigo', 'em mim']),
        ],
    },
    'tu': {
        'resumo': 'tu (tu), tui (de ti), tibi (a ti, te), te (te; por ti); tecum (contigo).',
        'formas': [
            ('tui', 'genitivo singular', 'de ti', [], ['de ti', 'de você']),
            ('tibi', 'dativo singular', 'a ti, te', ['para ti'], ['a ti', 'te', 'para ti', 'ti', 'a você', 'para você']),
            ('te', 'acusativo singular; também ablativo singular', 'te (objeto)', ['por ti, contigo'],
             ['te', 'ti', 'você', 'por ti', 'contigo', 'em ti']),
        ],
    },
    'nos': {
        'resumo': 'nos (nós), nostri / nostrum (de nós), nobis (a nós, nos; por nós), nos (nos, objeto); '
                  'nobiscum (conosco). Nostrum é o «de nós» de parte de um todo: unus nostrum, um de nós.',
        'formas': [
            ('nostri', 'genitivo plural', 'de nós', [], ['de nós']),
            ('nostrum', 'genitivo plural (de parte de um todo)', 'de nós', [], ['de nós', 'dentre nós']),
            ('nobis', 'dativo plural; também ablativo plural', 'a nós, nos', ['por nós, conosco'],
             ['a nós', 'nos', 'para nós', 'por nós', 'conosco', 'em nós']),
        ],
    },
    'vos': {
        'resumo': 'vos (vós), vestri / vestrum (de vós), vobis (a vós, vos; por vós), vos (vos, objeto); '
                  'vobiscum (convosco). Vestrum é o «de vós» de parte de um todo: unus vestrum, um de vós.',
        'formas': [
            ('vestri', 'genitivo plural', 'de vós', [], ['de vós', 'de vocês']),
            ('vestrum', 'genitivo plural (de parte de um todo)', 'de vós', [], ['de vós', 'de vocês', 'dentre vós']),
            ('vobis', 'dativo plural; também ablativo plural', 'a vós, vos', ['por vós, convosco'],
             ['a vós', 'vos', 'para vós', 'a vocês', 'para vocês', 'por vós', 'convosco', 'com vocês', 'em vós']),
        ],
    },
    'sum': {
        'resumo': {
            'presente do indicativo': 'Presente: sum, es, est, sumus, estis, sunt.',
            'imperfeito do indicativo': 'Imperfeito: eram, eras, erat, eramus, eratis, erant.',
            'futuro do indicativo': 'Futuro: ero, eris, erit, erimus, eritis, erunt.',
            'perfeito do indicativo': 'Perfeito: fui, fuisti, fuit, fuimus, fuistis, fuerunt.',
            'presente do subjuntivo': 'Presente do subjuntivo: sim, sis, sit, simus, sitis, sint.',
            'infinitivo': 'O enunciado: sum, esse, fui.',
        },
        'formas': [
            ('sum', 'presente do indicativo, 1ª pessoa do singular', 'sou', ['estou'], ['sou', 'eu sou', 'estou', 'eu estou']),
            ('es', 'presente do indicativo, 2ª pessoa do singular (também o imperativo)', 'és', ['estás', 'sê'],
             ['és', 'tu és', 'você é', 'estás', 'tu estás', 'sê']),
            ('est', 'presente do indicativo, 3ª pessoa do singular', 'é', ['está, há'],
             ['é', 'ele é', 'ela é', 'está', 'ele está', 'há', 'existe']),
            ('sumus', 'presente do indicativo, 1ª pessoa do plural', 'somos', ['estamos'],
             ['somos', 'nós somos', 'estamos', 'nós estamos']),
            ('estis', 'presente do indicativo, 2ª pessoa do plural', 'sois', ['estais'],
             ['sois', 'vós sois', 'vocês são', 'estais']),
            ('sunt', 'presente do indicativo, 3ª pessoa do plural', 'são', ['estão, há'],
             ['são', 'eles são', 'elas são', 'estão', 'eles estão', 'há', 'existem']),
            ('eram', 'imperfeito do indicativo, 1ª pessoa do singular', 'eu era', ['eu estava'],
             ['era', 'eu era', 'estava', 'eu estava']),
            ('eras', 'imperfeito do indicativo, 2ª pessoa do singular', 'tu eras', ['tu estavas'],
             ['eras', 'tu eras', 'estavas', 'tu estavas', 'você era']),
            ('erat', 'imperfeito do indicativo, 3ª pessoa do singular', 'ele era', ['ele estava, havia'],
             ['era', 'ele era', 'ela era', 'estava', 'ele estava', 'havia']),
            ('eramus', 'imperfeito do indicativo, 1ª pessoa do plural', 'éramos', ['estávamos'],
             ['éramos', 'nós éramos', 'estávamos']),
            ('eratis', 'imperfeito do indicativo, 2ª pessoa do plural', 'éreis', ['estáveis'],
             ['éreis', 'vós éreis', 'estáveis', 'vocês eram']),
            ('erant', 'imperfeito do indicativo, 3ª pessoa do plural', 'eles eram', ['eles estavam, havia'],
             ['eram', 'eles eram', 'elas eram', 'estavam', 'eles estavam', 'havia']),
            ('ero', 'futuro do indicativo, 1ª pessoa do singular', 'serei', ['estarei'], ['serei', 'eu serei', 'estarei']),
            ('eris', 'futuro do indicativo, 2ª pessoa do singular', 'serás', ['estarás'],
             ['serás', 'tu serás', 'estarás', 'você será']),
            ('erit', 'futuro do indicativo, 3ª pessoa do singular', 'será', ['estará, haverá'],
             ['será', 'ele será', 'ela será', 'estará', 'haverá']),
            ('erimus', 'futuro do indicativo, 1ª pessoa do plural', 'seremos', [], ['seremos', 'nós seremos', 'estaremos']),
            ('eritis', 'futuro do indicativo, 2ª pessoa do plural', 'sereis', [], ['sereis', 'vós sereis', 'estareis', 'vocês serão']),
            ('erunt', 'futuro do indicativo, 3ª pessoa do plural', 'serão', [], ['serão', 'eles serão', 'elas serão', 'estarão']),
            ('fui', 'perfeito do indicativo, 1ª pessoa do singular', 'fui', ['estive'], ['fui', 'eu fui', 'estive', 'eu estive']),
            ('fuisti', 'perfeito do indicativo, 2ª pessoa do singular', 'foste', ['estiveste'],
             ['foste', 'tu foste', 'estiveste', 'você foi']),
            ('fuit', 'perfeito do indicativo, 3ª pessoa do singular', 'foi', ['esteve, houve'],
             ['foi', 'ele foi', 'ela foi', 'esteve', 'houve']),
            ('fuimus', 'perfeito do indicativo, 1ª pessoa do plural', 'fomos', ['estivemos'],
             ['fomos', 'nós fomos', 'estivemos']),
            ('fuistis', 'perfeito do indicativo, 2ª pessoa do plural', 'fostes', ['estivestes'],
             ['fostes', 'vós fostes', 'estivestes', 'vocês foram']),
            ('fuerunt', 'perfeito do indicativo, 3ª pessoa do plural', 'foram', ['estiveram'],
             ['foram', 'eles foram', 'elas foram', 'estiveram']),
            ('sim', 'presente do subjuntivo, 1ª pessoa do singular', 'que eu seja', ['que eu esteja'],
             ['que eu seja', 'eu seja', 'que eu esteja']),
            ('sis', 'presente do subjuntivo, 2ª pessoa do singular', 'que tu sejas', ['que tu estejas'],
             ['que tu sejas', 'que sejas', 'sejas', 'tu sejas', 'que você seja', 'que estejas']),
            ('sit', 'presente do subjuntivo, 3ª pessoa do singular', 'que ele seja', ['que ele esteja', 'seja!'],
             ['que ele seja', 'que seja', 'seja', 'ele seja', 'que ela seja', 'que esteja', 'esteja']),
            ('simus', 'presente do subjuntivo, 1ª pessoa do plural', 'que sejamos', ['sejamos!'],
             ['que sejamos', 'sejamos', 'que nós sejamos', 'que estejamos']),
            ('sitis', 'presente do subjuntivo, 2ª pessoa do plural', 'que sejais', [],
             ['que sejais', 'sejais', 'que vós sejais', 'que vocês sejam']),
            ('sint', 'presente do subjuntivo, 3ª pessoa do plural', 'que eles sejam', ['sejam!'],
             ['que eles sejam', 'que sejam', 'sejam', 'que elas sejam', 'que estejam']),
            ('esse', 'infinitivo presente', 'ser', ['estar'], ['ser', 'estar', 'existir']),
        ],
    },
    'possum': {
        'resumo': {
            'presente do indicativo': 'Presente: possum, potes, potest, possumus, potestis, possunt.',
            'imperfeito do indicativo': 'Imperfeito: poteram, poteras, poterat, poteramus, poteratis, poterant.',
            'futuro do indicativo': 'Futuro: potero, poteris, poterit, poterimus, poteritis, poterunt.',
            'perfeito do indicativo': 'Perfeito: potui, potuisti, potuit, potuimus, potuistis, potuerunt.',
            'presente do subjuntivo': 'Presente do subjuntivo: possim, possis, possit, possimus, possitis, possint.',
            'infinitivo': 'O enunciado: possum, posse, potui. É pot- + sum: pos- antes de s, pot- antes de vogal.',
        },
        'formas': [
            ('possum', 'presente do indicativo, 1ª pessoa do singular', 'posso', [], ['posso', 'eu posso', 'consigo']),
            ('potes', 'presente do indicativo, 2ª pessoa do singular', 'podes', [], ['podes', 'tu podes', 'você pode']),
            ('potest', 'presente do indicativo, 3ª pessoa do singular', 'pode', [], ['pode', 'ele pode', 'ela pode', 'consegue']),
            ('possumus', 'presente do indicativo, 1ª pessoa do plural', 'podemos', [], ['podemos', 'nós podemos']),
            ('potestis', 'presente do indicativo, 2ª pessoa do plural', 'podeis', [], ['podeis', 'vós podeis', 'vocês podem']),
            ('possunt', 'presente do indicativo, 3ª pessoa do plural', 'podem', [], ['podem', 'eles podem', 'elas podem']),
            ('poteram', 'imperfeito do indicativo, 1ª pessoa do singular', 'eu podia', [], ['podia', 'eu podia']),
            ('poteras', 'imperfeito do indicativo, 2ª pessoa do singular', 'tu podias', [], ['podias', 'tu podias', 'você podia']),
            ('poterat', 'imperfeito do indicativo, 3ª pessoa do singular', 'ele podia', [], ['podia', 'ele podia', 'ela podia']),
            ('poteramus', 'imperfeito do indicativo, 1ª pessoa do plural', 'podíamos', [], ['podíamos', 'nós podíamos']),
            ('poteratis', 'imperfeito do indicativo, 2ª pessoa do plural', 'podíeis', [], ['podíeis', 'vós podíeis', 'vocês podiam']),
            ('poterant', 'imperfeito do indicativo, 3ª pessoa do plural', 'eles podiam', [], ['podiam', 'eles podiam', 'elas podiam']),
            ('potero', 'futuro do indicativo, 1ª pessoa do singular', 'poderei', [], ['poderei', 'eu poderei']),
            ('poteris', 'futuro do indicativo, 2ª pessoa do singular', 'poderás', [], ['poderás', 'tu poderás', 'você poderá']),
            ('poterit', 'futuro do indicativo, 3ª pessoa do singular', 'poderá', [], ['poderá', 'ele poderá', 'ela poderá']),
            ('poterimus', 'futuro do indicativo, 1ª pessoa do plural', 'poderemos', [], ['poderemos', 'nós poderemos']),
            ('poteritis', 'futuro do indicativo, 2ª pessoa do plural', 'podereis', [], ['podereis', 'vós podereis', 'vocês poderão']),
            ('poterunt', 'futuro do indicativo, 3ª pessoa do plural', 'poderão', [], ['poderão', 'eles poderão', 'elas poderão']),
            ('potui', 'perfeito do indicativo, 1ª pessoa do singular', 'pude', [], ['pude', 'eu pude', 'consegui']),
            ('potuisti', 'perfeito do indicativo, 2ª pessoa do singular', 'pudeste', [], ['pudeste', 'tu pudeste']),
            ('potuit', 'perfeito do indicativo, 3ª pessoa do singular', 'pôde', [], ['pôde', 'ele pôde', 'ela pôde', 'conseguiu']),
            ('potuimus', 'perfeito do indicativo, 1ª pessoa do plural', 'pudemos', [], ['pudemos', 'nós pudemos']),
            ('potuistis', 'perfeito do indicativo, 2ª pessoa do plural', 'pudestes', [], ['pudestes', 'vós pudestes']),
            ('potuerunt', 'perfeito do indicativo, 3ª pessoa do plural', 'puderam', [], ['puderam', 'eles puderam', 'elas puderam']),
            ('possim', 'presente do subjuntivo, 1ª pessoa do singular', 'que eu possa', [], ['que eu possa', 'eu possa']),
            ('possis', 'presente do subjuntivo, 2ª pessoa do singular', 'que tu possas', [],
             ['que tu possas', 'que possas', 'possas', 'que você possa']),
            ('possit', 'presente do subjuntivo, 3ª pessoa do singular', 'que ele possa', [],
             ['que ele possa', 'que possa', 'possa', 'que ela possa']),
            ('possimus', 'presente do subjuntivo, 1ª pessoa do plural', 'que possamos', [], ['que possamos', 'possamos']),
            ('possitis', 'presente do subjuntivo, 2ª pessoa do plural', 'que possais', [], ['que possais', 'possais']),
            ('possint', 'presente do subjuntivo, 3ª pessoa do plural', 'que eles possam', [],
             ['que eles possam', 'que possam', 'possam', 'que elas possam']),
            ('posse', 'infinitivo presente', 'poder', [], ['poder', 'conseguir']),
        ],
    },
}
# nos pronomes de três gêneros as formas do dicionário são muito diferentes entre si (is, ea, id):
# cada uma ganha card, também a que coincide com o lema (pedido do Gere, 24/10/2026)
TABELAS_COM_O_LEMA = {'is', 'hic', 'ille', 'qui', 'idem', 'sum', 'possum'}
# os pessoais têm poucas formas: as alternativas erradas saem dos quatro juntos, e também do
# nominativo de cada um, que não ganha card (é o card do lema)
FAMILIA = {'ego': 'pessoais', 'tu': 'pessoais', 'nos': 'pessoais', 'vos': 'pessoais'}
SO_ALTERNATIVA = {
    'ego': ('ego', 'nominativo singular', 'eu (sujeito)'), 'tu': ('tu', 'nominativo singular', 'tu (sujeito)'),
    'nos': ('nos', 'nominativo plural', 'nós (sujeito)'), 'vos': ('vos', 'nominativo plural', 'vós (sujeito)'),
}


def chave(palavra):
    return latim.chave(palavra).lstrip('-')


def ler_baralho():
    cards = []
    for arq in sorted(BARALHO.glob('*.json')):
        for c in json.loads(arq.read_text(encoding='utf-8')):
            cards.append((arq, c))
    return cards


def lemas_por_la(cards):
    return {c['la']: c for _, c in cards if c.get('tipo') == 'palavra'}


def presa(c):
    """A frase que espera as palavras (o trecho e a frase de uso); a primeira frase é livre."""
    return c.get('tipo') == 'frase' and 'primeiros passos' not in (c.get('tags') or [])


def ocorrencias(cards):
    """(forma, lema) → as frases em que aparece: a frase, a tradução e a anotação da palavra."""
    porid = {c['id']: c for _, c in cards}
    saida = {}
    for _, c in cards:
        if c.get('tipo') != 'frase':
            continue
        for p in c.get('palavras') or []:
            if not p.get('c') or str(p.get('w', '')).startswith('-'):
                continue
            lema = porid.get(p['c'])
            if not lema or lema.get('tipo') != 'palavra':
                continue
            k = (chave(p['w']), p['c'])
            saida.setdefault(k, []).append({
                'card': c['id'], 'la': c['la'], 'pt': c['pt'], 'f': p.get('f', ''), 'fn': p.get('fn', ''),
                'fonte': c.get('fonte', ''), 'origem': 'texto' if c.get('texto') else
                ('primeira' if not presa(c) else 'uso'),
            })
    return saida


def pede_card(forma, lema):
    """A forma pede card de flexão se não é a do dicionário, ou se é de pronome de três gêneros."""
    return forma != chave(lema['la']) or lema['la'] in TABELAS_COM_O_LEMA


def conceitos_de(analise):
    """Os conceitos da primeira leitura. «imperfeito», «mais-que-perfeito» e «futuro perfeito»
    contêm «perfeito»: o termo só conta inteiro."""
    primeira = analise.split(';')[0]
    achados = []
    for termo, g in CONCEITOS:
        for m in re.finditer(re.escape(termo), primeira):
            antes = primeira[:m.start()]
            if not re.search(r'[\w-]$', antes) and not antes.endswith('futuro '):
                achados.append(g)
                break
    return achados[:2]


# ── a conferência das alternativas (a mesma régua do build: fonte/build.js, checarFormato) ──
def norm(t, parentese=True):
    """Como o motor lê a resposta do card de flexão: minúscula, sem acento nem pontuação, e o
    artigo fica («o», «a» são resposta: eum, eam). Sem parentese=False, o parêntese sai."""
    # a crase e o «ó» ficam: «à água» é dativo, «ó água» é vocativo
    t = re.sub(r'(^|\s)ó(?=\s|$)', r'\1oo', str(t).lower().replace('à', 'aa'))
    if not parentese:
        t = re.sub(r'\([^)]*\)', ' ', t)
    t = unicodedata.normalize('NFD', t)
    t = ''.join(ch for ch in t if unicodedata.category(ch) != 'Mn')
    t = re.sub(r'[^a-z0-9]+', ' ', t)
    return ' '.join(t.split())


def leituras(card):
    return [card['pt']] + list(card.get('outras') or [])


def aceitas_norm(card):
    s = {norm(x, False) for x in card.get('aceitas') or []}
    s |= {norm(x, False) for x in leituras(card)}
    return s


def pode_ser_distrator(alvo, outro_pt):
    """O texto de outro card serve de alternativa errada se não é leitura deste, nem, sem o
    parêntese, uma resposta aceita deste (a não ser que o parêntese seja o que separa)."""
    if norm(outro_pt) in {norm(x) for x in leituras(alvo)}:
        return False
    if '(' not in outro_pt and norm(outro_pt, False) in aceitas_norm(alvo):
        return False
    return True


def formato_ok(certa, distratores):
    if len(distratores) != 4:
        return False
    par = lambda s: '(' in s  # noqa: E731
    n = sum(map(par, distratores))
    if par(certa) and n == 0:
        return False
    if not par(certa) and n >= 3:
        return False
    w = lambda s: len(s.split())  # noqa: E731
    if w(certa) > max(map(w, distratores)) + 1 or w(certa) < min(map(w, distratores)) - 1:
        return False
    return True


def marcas(analise):
    return set(re.findall(r'[a-zçãáéíóúâêô0-9ª]+', analise.split(';')[0].lower())) - {'do', 'da', 'de', 'e', 'dos', 'três', 'gêneros', 'pessoa', 'singular', 'plural'} | \
        ({'sing'} if 'singular' in analise.split(';')[0] else set()) | ({'plur'} if 'plural' in analise.split(';')[0] else set())


def escolher_distratores(alvo, irmaos):
    """As quatro erradas da tabela: as formas do mesmo lema que mais se parecem com a certa (o
    mesmo tempo ou a mesma pessoa; o mesmo gênero e número ou o mesmo caso), sem nenhuma que
    seja leitura dela, e no formato da certa."""
    m = marcas(alvo['analise'])
    cands = []
    for o in irmaos:
        if o['la'] == alvo['la'] or not pode_ser_distrator(alvo, o['pt']):
            continue
        comuns = len(m & marcas(o['analise']))
        desempate = int(hashlib.sha1((alvo['la'] + '|' + o['la']).encode()).hexdigest(), 16) % 1000 / 1000
        cands.append((-comuns - desempate, o['pt']))
    cands.sort()
    nomes = []
    for _, pt in cands:
        if pt not in nomes and norm(pt) not in {norm(x) for x in nomes}:
            nomes.append(pt)
    # a primeira combinação de quatro, das mais parecidas, que passa na régua do formato
    from itertools import combinations
    for comb in combinations(nomes[:9], 4):
        if formato_ok(alvo['pt'], list(comb)) and not categoria_comum(alvo['pt'], comb):
            return list(comb)
    return None


VAZIAS = set(('a o as os um uma uns umas de do da dos das em no na nos nas por para pra com sem que se e ou '
              'ele ela eles elas eu voce nao ja ao aos isso esse essa este esta seu sua meu minha ser estar '
              'quem qual').split())


def categoria_comum(certa, distratores):
    pal = lambda s: {p for p in norm(s, False).split() if len(p) > 2 and p not in VAZIAS}  # noqa: E731
    conj = [pal(d) for d in distratores]
    return any(all(p in c for c in conj) and p not in pal(certa) for p in conj[0])


def nota_da_tabela(card, nome, tab, ocorr):
    lema = card['_enunciado']
    resumo = tab['resumo']
    if isinstance(resumo, dict):
        tempo = next((k for k in resumo if k in card['analise']), 'infinitivo')
        resumo = resumo[tempo]
    linhas = [f"{card['la']}: {card['analise']}, de {lema}.", resumo]
    if ocorr:
        o = ocorr[0]
        linhas.append(f"No texto: «{o['la']}» ({o['fonte']}).")
    return '\n'.join(linhas)


def cards_das_tabelas(lemas, ocorr):
    saida = []
    for nome, tab in TABELAS.items():
        lema = lemas.get(nome)
        if not lema:
            continue
        cards = []
        for forma, analise, pt, outras, aceitas in tab['formas']:
            cards.append({'la': forma, 'lema': lema['id'], 'analise': analise, 'pt': pt, 'outras': outras,
                          'aceitas': aceitas, '_enunciado': lema.get('enunciado', lema['la']).split(' (')[0]})
        saida.extend(cards)
    for c in saida:
        nome = next(n for n, t in TABELAS.items() if lemas.get(n) and lemas[n]['id'] == c['lema'])
        tab = TABELAS[nome]
        lema = lemas[nome]
        familia = [o for o in saida if FAMILIA.get(nome) and FAMILIA.get(_nome(o, lemas)) == FAMILIA[nome]] \
            or [o for o in saida if o['lema'] == c['lema']]
        extras = [{'la': f, 'analise': a, 'pt': pt} for n, (f, a, pt) in SO_ALTERNATIVA.items()
                  if FAMILIA.get(nome) and FAMILIA.get(n) == FAMILIA[nome]]
        if True:
            d = escolher_distratores(c, familia + extras)
            if not d:
                raise SystemExit(f'sem quatro distratores bons para {c["la"]} ({nome})')
            c['distratores'] = d
            c['nota'] = nota_da_tabela(c, nome, tab, ocorr.get((chave(c['la']), lema['id']), []))
            c['nivel'] = lema.get('nivel', 'A1')
            c['origem'] = 'tabela'
    return saida


def _nome(card, lemas):
    return next((n for n, t in TABELAS.items() if lemas.get(n) and lemas[n]['id'] == card['lema']), None)


def chave_do_card(c):
    return (chave(c['la']), c['lema'])


def montar(card, ident):
    """O card no formato do baralho, com os campos na ordem de sempre."""
    saida = {'id': ident, 'tipo': 'flexao', 'la': card['la'], 'lema': card['lema'], 'analise': card['analise'],
             'pt': card['pt']}
    if card.get('outras'):
        saida['outras'] = card['outras']
    saida['aceitas'] = card['aceitas']
    saida['distratores'] = card['distratores']
    saida['nota'] = card['nota']
    saida['nivel'] = card.get('nivel', 'A1')
    saida['tags'] = ['gramática', 'flexão']
    g = conceitos_de(card['analise'])
    if g:
        saida['conceitos'] = g
    return saida


def refazer_requer(cards, flexoes):
    """O «requerTodas» de cada frase presa: os lemas e, depois, as flexões, na ordem da frase."""
    por = {chave_do_card(f): f['id'] for f in flexoes}
    mudou = {}
    for arq, c in cards:
        if not presa(c):
            continue
        lemas, flex = [], []
        for p in c.get('palavras') or []:
            if not p.get('c'):
                continue
            if p['c'] not in lemas:
                lemas.append(p['c'])
            if str(p.get('w', '')).startswith('-'):
                continue
            f = por.get((chave(p['w']), p['c']))
            if f and f not in flex:
                flex.append(f)
        novo = lemas + flex
        if c.get('requerTodas') != novo:
            c['requerTodas'] = novo
            mudou.setdefault(arq, 0)
            mudou[arq] += 1
    return mudou


def gravar_arquivo(arq, lista):
    arq.write_text(json.dumps(lista, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')


def principal():
    args = sys.argv[1:]
    if not args or args[0] not in ('lista', 'faltam', 'gravar'):
        print(__doc__)
        return
    cards = [(a, c) for a, c in ler_baralho() if a != SAIDA]
    existentes = json.loads(SAIDA.read_text(encoding='utf-8')) if SAIDA.exists() else []
    lemas = lemas_por_la(cards)
    porid = {c['id']: c for _, c in cards}
    ocorr = ocorrencias(cards)
    pedidas = {k: v for k, v in ocorr.items() if pede_card(k[0], porid[k[1]])}
    tabela = cards_das_tabelas(lemas, ocorr)
    da_tabela = {chave_do_card(c) for c in tabela}
    ja = {chave_do_card(c) for c in existentes}

    if args[0] == 'lista':
        print('formas das frases que pedem card:', len(pedidas))
        for origem in ('texto', 'primeira', 'uso'):
            print(' ', origem, sum(1 for v in pedidas.values() if any(o['origem'] == origem for o in v)))
        print('das tabelas:', len(tabela), '(nas frases:', len(da_tabela & set(pedidas)), ')')
        print('total de cards:', len(set(pedidas) | da_tabela), '— já gravados:', len(ja))
        return

    if args[0] == 'faltam':
        faltam = []
        for (forma, lid), occ in sorted(pedidas.items(), key=lambda kv: (kv[0][1], kv[0][0])):
            if (forma, lid) in da_tabela or (forma, lid) in ja:
                continue
            lema = porid[lid]
            faltam.append({
                'la': _forma_escrita(occ, forma), 'lema': lid,
                'lema_la': lema['la'], 'enunciado': lema.get('enunciado', ''), 'lema_pt': lema.get('pt', ''),
                'lema_aceitas': lema.get('aceitas', []), 'nivel': lema.get('nivel', 'A1'),
                'ocorrencias': [{k: o[k] for k in ('la', 'pt', 'f', 'fn', 'fonte', 'origem')} for o in occ[:4]],
            })
        destino = args[args.index('--saida') + 1] if '--saida' in args else None
        texto = json.dumps(faltam, ensure_ascii=False, indent=1)
        if destino:
            Path(destino).write_text(texto + '\n', encoding='utf-8')
            print(len(faltam), 'formas sem card →', destino)
        else:
            print(texto)
        return

    # gravar
    novos = [c for c in tabela if chave_do_card(c) not in ja]
    for leva in args[1:]:
        for c in json.loads(Path(leva).read_text(encoding='utf-8')):
            if chave_do_card(c) in ja or chave_do_card(c) in da_tabela:
                continue
            novos.append(c)
    vistos = set(ja)
    numeros = [int(c['id'][4:]) for c in existentes]
    proximo = max(numeros, default=0) + 1
    saida = list(existentes)
    # na ordem do baralho: o lema, e nele a ordem da tabela ou a da primeira frase
    ordem_lema = {c['id']: i for i, (_, c) in enumerate(cards)}
    novos.sort(key=lambda c: ordem_lema.get(c['lema'], 1e9))
    for c in novos:
        k = chave_do_card(c)
        if k in vistos:
            continue
        vistos.add(k)
        saida.append(montar(c, 'la-v%03d' % proximo))
        proximo += 1
    sobrando = [c['id'] + ' ' + c['la'] for c in saida
                if chave_do_card(c) not in pedidas and chave_do_card(c) not in da_tabela]
    if sobrando:
        print('flexões que nenhuma frase pede e nenhuma tabela tem (conferir):', ', '.join(sobrando))
    faltando = [f'{k[0]} ({porid[k[1]]["la"]})' for k in pedidas if k not in vistos]
    for c in saida:   # os conceitos saem da análise: refeitos sempre
        g = conceitos_de(c['analise'])
        if g:
            c['conceitos'] = g
        else:
            c.pop('conceitos', None)
    gravar_arquivo(SAIDA, saida)
    mudou = refazer_requer(cards, saida)
    arquivos = {}
    for arq, c in cards:
        arquivos.setdefault(arq, []).append(c)
    for arq in mudou:
        gravar_arquivo(arq, arquivos[arq])
    print(len(saida), 'flexões em', SAIDA.name, f'({len(saida) - len(existentes)} novas);',
          'requerTodas refeito em', sum(mudou.values()), 'frases')
    if faltando:
        print(len(faltando), 'formas ainda sem card (rode «faltam»):', ', '.join(faltando[:30]))


def _forma_escrita(occ, forma):
    """A forma como o texto a escreve, em minúscula (Domini, não domini; mas o nome fica fora)."""
    for o in occ:
        for w in re.findall(r'[A-Za-zÀ-ÿ]+', o['la']):
            for enc in ('', 'que', 'ne', 've'):
                if chave(w) == forma + enc:
                    w = w[:len(w) - len(enc)]
                    return w.lower() if not w[0].isupper() or w[1:].islower() else w
    return forma


if __name__ == '__main__':
    principal()
