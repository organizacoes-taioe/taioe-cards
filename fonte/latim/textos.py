"""Monta os textos latinos do app (fonte/textos/la/<autor>--<pasta>.json) a partir dos versos anotados.

    python -I fonte/latim/textos.py

No latim, o texto são os versos anotados (fonte/latim/versos.json: o verso e, palavra por palavra,
a forma no texto, o card do lema, o rótulo da forma e a função), e os cards são os trechos (as
frases, que podem atravessar o verso: cortes.py, desde 04/11/2026), com «texto», «linha» (a ordem)
e «versos» (o primeiro e o último que tocam). Daqui sai o texto no formato que o build e o app leem
(PLANO.md, 9.1): os versos em «blocos», cada um com as palavras em «p» e as flexões das formas dele
em «flexoes», e, em «destinos», o que cada chave é (o card do lema, ou «nome» e «gramatical» para o
que não tem card). A Biblioteca tem o mesmo texto com o glossário dela; o endereço vai em
«biblioteca». Os dados de cada texto (título, autor, endereço) ficam em TEXTOS, abaixo.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
DESTINO = AQUI.parent / 'textos' / 'la'
VERSOS = AQUI / 'versos.json'

# «ordem» é a da tela Textos: as orações e os clássicos intercalados (pedido de 22/10: menos
# religioso), do mais curto ao mais difícil
TEXTOS = {
    'oracoes/gloria-patri': {'titulo': 'Gloria Patri', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 1},
    'oracoes/pater-noster': {'titulo': 'Pater Noster', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 4},
    'oracoes/ave-maria': {'titulo': 'Ave Maria', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 5},
    'marcial/non-amo-te': {'titulo': 'Non amo te', 'autor': 'Marcial', 'tipo': 'poema', 'ordem': 2,
                           'fonte': 'Epigramas, livro I, 32'},
    'oracoes/regina-caeli': {'titulo': 'Regina caeli', 'autor': 'Orações', 'tipo': 'prosa', 'ordem': 6},
    'catulo/odi-et-amo': {'titulo': 'Odi et amo', 'autor': 'Catulo', 'tipo': 'poema', 'ordem': 3,
                          'fonte': 'Poemas, 85'},
    'fedro/lupus-et-agnus': {'titulo': 'Lupus et agnus', 'autor': 'Fedro', 'tipo': 'poema', 'ordem': 7,
                             'fonte': 'Fábulas, livro I, 1 (os oito primeiros versos)'},
    # texto longo em partes (PLANO.md §9.6): cada parte é um texto, com «obra», «parte» e «trecho»,
    # e todas apontam para a mesma página da Biblioteca
    'vergilio/eneida-parte-1': {'titulo': 'Aeneis', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 8,
                                'fonte': 'Eneida, livro I, 1–7', 'obra': 'vergilio/eneida', 'parte': 1,
                                'trecho': 'I, 1–7', 'biblioteca': '/biblioteca/vergilio/eneida/'},
    'vergilio/eneida-parte-2': {'titulo': 'Aeneis', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 9,
                                'fonte': 'Eneida, livro I, 8–11', 'obra': 'vergilio/eneida', 'parte': 2,
                                'trecho': 'I, 8–11', 'biblioteca': '/biblioteca/vergilio/eneida/'},
    # leva de 03/11/2026: Horácio e o começo da Bucólica IV (o resto da écloga fica para depois)
    'horacio/tu-ne-quaesieris': {'titulo': 'Tu ne quaesieris', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 10,
                                 'fonte': 'Odes, livro I, 11'},
    'horacio/exegi-monumentum-parte-1': {'titulo': 'Exegi monumentum', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 11,
                                         'fonte': 'Odes, livro III, 30, 1–9', 'obra': 'horacio/exegi-monumentum',
                                         'parte': 1, 'trecho': '1–9',
                                         'biblioteca': '/biblioteca/horacio/exegi-monumentum/'},
    'horacio/exegi-monumentum-parte-2': {'titulo': 'Exegi monumentum', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 12,
                                         'fonte': 'Odes, livro III, 30, 10–16', 'obra': 'horacio/exegi-monumentum',
                                         'parte': 2, 'trecho': '10–16',
                                         'biblioteca': '/biblioteca/horacio/exegi-monumentum/'},
    'vergilio/bucolica-iv-parte-1': {'titulo': 'Ecloga IV', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 13,
                                     'fonte': 'Bucólicas, IV, 1–7', 'obra': 'vergilio/bucolica-iv', 'parte': 1,
                                     'trecho': '1–7', 'biblioteca': '/biblioteca/vergilio/bucolica-iv/'},
    'vergilio/bucolica-iv-parte-2': {'titulo': 'Ecloga IV', 'autor': 'Vergílio', 'tipo': 'poema', 'ordem': 14,
                                     'fonte': 'Bucólicas, IV, 8–14', 'obra': 'vergilio/bucolica-iv', 'parte': 2,
                                     'trecho': '8–14', 'biblioteca': '/biblioteca/vergilio/bucolica-iv/'},
    # orações, leva A (16/11/2026; LATIM.md §19)
    'oracoes/memorare': {"titulo": "Memorare", "autor": "Orações", "tipo": "prosa", "ordem": 15, "fonte": "Memorare"},
    'oracoes/alma-redemptoris-mater': {"titulo": "Alma Redemptoris Mater", "autor": "Orações", "tipo": "poema", "ordem": 16, "fonte": "Alma Redemptoris Mater"},
    'oracoes/ave-regina-caelorum': {"titulo": "Ave, Regina caelorum", "autor": "Orações", "tipo": "poema", "ordem": 17, "fonte": "Ave, Regina caelorum"},
    'oracoes/veni-sancte-spiritus': {"titulo": "Veni, Sancte Spiritus", "autor": "Orações", "tipo": "prosa", "ordem": 18, "fonte": "Veni, Sancte Spiritus"},
    'oracoes/symbolum-apostolorum': {"titulo": "Symbolum Apostolorum", "autor": "Orações", "tipo": "prosa", "ordem": 19, "fonte": "Credo dos Apóstolos"},
    'oracoes/credo-parte-1': {"titulo": "Credo", "autor": "Orações", "tipo": "prosa", "ordem": 20, "fonte": "Credo niceno-constantinopolitano", "obra": "oracoes/credo", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/oracoes/credo/"},
    'oracoes/credo-parte-2': {"titulo": "Credo", "autor": "Orações", "tipo": "prosa", "ordem": 21, "fonte": "Credo niceno-constantinopolitano", "obra": "oracoes/credo", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/oracoes/credo/"},
    'oracoes/adoro-te-devote-parte-1': {"titulo": "Adoro te devote", "autor": "Orações", "tipo": "poema", "ordem": 22, "fonte": "Adoro te devote (Santo Tomás de Aquino)", "obra": "oracoes/adoro-te-devote", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/oracoes/adoro-te-devote/"},
    'oracoes/adoro-te-devote-parte-2': {"titulo": "Adoro te devote", "autor": "Orações", "tipo": "poema", "ordem": 23, "fonte": "Adoro te devote (Santo Tomás de Aquino)", "obra": "oracoes/adoro-te-devote", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/oracoes/adoro-te-devote/"},
    'oracoes/adoro-te-devote-parte-3': {"titulo": "Adoro te devote", "autor": "Orações", "tipo": "poema", "ordem": 24, "fonte": "Adoro te devote (Santo Tomás de Aquino)", "obra": "oracoes/adoro-te-devote", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/oracoes/adoro-te-devote/"},
    'oracoes/adoro-te-devote-parte-4': {"titulo": "Adoro te devote", "autor": "Orações", "tipo": "poema", "ordem": 25, "fonte": "Adoro te devote (Santo Tomás de Aquino)", "obra": "oracoes/adoro-te-devote", "parte": 4, "trecho": "parte 4", "biblioteca": "/biblioteca/oracoes/adoro-te-devote/"},
    'oracoes/pange-lingua-parte-1': {"titulo": "Pange lingua", "autor": "Orações", "tipo": "poema", "ordem": 26, "fonte": "Pange lingua (Santo Tomás de Aquino)", "obra": "oracoes/pange-lingua", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/oracoes/pange-lingua/"},
    'oracoes/pange-lingua-parte-2': {"titulo": "Pange lingua", "autor": "Orações", "tipo": "poema", "ordem": 27, "fonte": "Pange lingua (Santo Tomás de Aquino)", "obra": "oracoes/pange-lingua", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/oracoes/pange-lingua/"},
    'oracoes/pange-lingua-parte-3': {"titulo": "Pange lingua", "autor": "Orações", "tipo": "poema", "ordem": 28, "fonte": "Pange lingua (Santo Tomás de Aquino)", "obra": "oracoes/pange-lingua", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/oracoes/pange-lingua/"},
    'oracoes/psalmus-2-parte-1': {"titulo": "Psalmus II", "autor": "Orações", "tipo": "prosa", "ordem": 29, "fonte": "Sl 2, com antífona e oração", "obra": "oracoes/psalmus-2", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/oracoes/psalmus-2/"},
    'oracoes/psalmus-2-parte-2': {"titulo": "Psalmus II", "autor": "Orações", "tipo": "prosa", "ordem": 30, "fonte": "Sl 2, com antífona e oração", "obra": "oracoes/psalmus-2", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/oracoes/psalmus-2/"},
    'oracoes/psalmus-2-parte-3': {"titulo": "Psalmus II", "autor": "Orações", "tipo": "prosa", "ordem": 31, "fonte": "Sl 2, com antífona e oração", "obra": "oracoes/psalmus-2", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/oracoes/psalmus-2/"},
    'oracoes/ne-recorderis-parte-1': {"titulo": "Ne recorderis", "autor": "Orações", "tipo": "prosa", "ordem": 32, "fonte": "Responso pelos defuntos", "obra": "oracoes/ne-recorderis", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/oracoes/ne-recorderis/"},
    'oracoes/ne-recorderis-parte-2': {"titulo": "Ne recorderis", "autor": "Orações", "tipo": "prosa", "ordem": 33, "fonte": "Responso pelos defuntos", "obra": "oracoes/ne-recorderis", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/oracoes/ne-recorderis/"},
    'oracoes/ne-recorderis-parte-3': {"titulo": "Ne recorderis", "autor": "Orações", "tipo": "prosa", "ordem": 34, "fonte": "Responso pelos defuntos", "obra": "oracoes/ne-recorderis", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/oracoes/ne-recorderis/"},
    # poemas curtos de 16/11/2026 (só por escolha)
    'horacio/persicos-odi': {'titulo': 'Persicos odi', 'autor': 'Horácio', 'tipo': 'poema', 'ordem': 35,
                             'fonte': 'Odes, livro I, 38'},
    'catulo/vivamus-mea-lesbia': {'titulo': 'Vivamus, mea Lesbia', 'autor': 'Catulo', 'tipo': 'poema', 'ordem': 36,
                                  'fonte': 'Poemas, 5'},
    'catulo/multas-per-gentes': {'titulo': 'Multas per gentes', 'autor': 'Catulo', 'tipo': 'poema', 'ordem': 37,
                                 'fonte': 'Poemas, 101'},
    # leva 1a de 19/11/2026 (LATIM.md §21): textos curtos fora da liturgia e diálogos curtos da Missa (só por escolha);
    # a liturgia fica só nos Cards, sem página na Biblioteca (o Gere, 19/11): «biblioteca» None
    'marcial/sunt-bona': {"titulo": "Sunt bona", "autor": "Marcial", "tipo": "poema", "ordem": 38, "fonte": "Epigramas, I,16"},
    'marcial/quem-recitas': {"titulo": "Quem recitas", "autor": "Marcial", "tipo": "poema", "ordem": 39, "fonte": "Epigramas, I,38"},
    'marcial/nuper-erat-medicus': {"titulo": "Nuper erat medicus", "autor": "Marcial", "tipo": "poema", "ordem": 40, "fonte": "Epigramas, I,47"},
    'marcial/bella-es': {"titulo": "Bella es", "autor": "Marcial", "tipo": "poema", "ordem": 41, "fonte": "Epigramas, I,64"},
    'marcial/versiculos-in-me': {"titulo": "Versiculos in me", "autor": "Marcial", "tipo": "poema", "ordem": 42, "fonte": "Epigramas, III,9"},
    'marcial/thais-habet': {"titulo": "Thais habet", "autor": "Marcial", "tipo": "poema", "ordem": 43, "fonte": "Epigramas, V,43"},
    'marcial/semper-pauper-eris': {"titulo": "Semper pauper eris", "autor": "Marcial", "tipo": "poema", "ordem": 44, "fonte": "Epigramas, V,81"},
    'marcial/miraris-veteres': {"titulo": "Miraris veteres", "autor": "Marcial", "tipo": "poema", "ordem": 45, "fonte": "Epigramas, VIII,69"},
    'marcial/difficilis-facilis': {"titulo": "Difficilis facilis", "autor": "Marcial", "tipo": "poema", "ordem": 46, "fonte": "Epigramas, XII,46"},
    'catulo/nulli-se-dicit': {"titulo": "Nulli se dicit", "autor": "Catulo", "tipo": "poema", "ordem": 47, "fonte": "Poemas, 70"},
    'publilio-siro/sententiae-parte-1': {"titulo": "Sententiae", "autor": "Publílio Siro", "tipo": "prosa", "ordem": 48, "fonte": "Sentenças", "obra": "publilio-siro/sententiae", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/publilio-siro/sententiae/"},
    'publilio-siro/sententiae-parte-2': {"titulo": "Sententiae", "autor": "Publílio Siro", "tipo": "prosa", "ordem": 49, "fonte": "Sentenças", "obra": "publilio-siro/sententiae", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/publilio-siro/sententiae/"},
    'publilio-siro/sententiae-parte-3': {"titulo": "Sententiae", "autor": "Publílio Siro", "tipo": "prosa", "ordem": 50, "fonte": "Sentenças", "obra": "publilio-siro/sententiae", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/publilio-siro/sententiae/"},
    'inscricoes/admiror-paries': {"titulo": "Admiror, paries", "autor": "Inscrições", "tipo": "poema", "ordem": 51, "fonte": "Grafites de Pompeia e epitáfios"},
    'missal-romano/in-nomine-patris': {"titulo": "In nomine Patris", "autor": "Missal Romano", "tipo": "prosa", "ordem": 52, "fonte": "Ritos iniciais da Missa", "biblioteca": None},
    'missal-romano/per-dominum-nostrum': {"titulo": "Per Dominum nostrum", "autor": "Missal Romano", "tipo": "prosa", "ordem": 53, "fonte": "A conclusão das orações da Missa", "biblioteca": None},
    'missal-romano/verbum-domini': {"titulo": "Verbum Domini", "autor": "Missal Romano", "tipo": "prosa", "ordem": 54, "fonte": "As leituras da Missa", "biblioteca": None},
    'missal-romano/sursum-corda': {"titulo": "Sursum corda", "autor": "Missal Romano", "tipo": "prosa", "ordem": 55, "fonte": "O diálogo do Prefácio", "biblioteca": None},
    'missal-romano/sanctus': {"titulo": "Sanctus", "autor": "Missal Romano", "tipo": "prosa", "ordem": 56, "fonte": "Ordinário da Missa", "biblioteca": None},
    'missal-romano/agnus-dei': {"titulo": "Agnus Dei", "autor": "Missal Romano", "tipo": "prosa", "ordem": 57, "fonte": "Ordinário da Missa", "biblioteca": None},
    'missal-romano/ite-missa-est': {"titulo": "Ite, missa est", "autor": "Missal Romano", "tipo": "prosa", "ordem": 58, "fonte": "Ritos finais da Missa", "biblioteca": None},
    # leva 1b de 19/11/2026 (LATIM.md §21): textos curtos fora da liturgia (só por escolha)
    'fedro/vulpes-et-uva': {"titulo": "Vulpes et uva", "autor": "Fedro", "tipo": "poema", "ordem": 59, "fonte": "Fábulas, IV,3"},
    'fedro/canis-per-fluvium': {"titulo": "Canis per fluvium", "autor": "Fedro", "tipo": "poema", "ordem": 60, "fonte": "Fábulas, I,4"},
    'fedro/vulpes-et-corvus': {"titulo": "Vulpes et corvus", "autor": "Fedro", "tipo": "poema", "ordem": 61, "fonte": "Fábulas, I,13"},
    'fedro/rana-rupta-et-bos': {"titulo": "Rana rupta et bos", "autor": "Fedro", "tipo": "poema", "ordem": 62, "fonte": "Fábulas, I,24"},
    'anonimo/gaudeamus-igitur': {"titulo": "Gaudeamus igitur", "autor": "Anônimo", "tipo": "poema", "ordem": 63, "fonte": "Canção estudantil, estrofes 1 a 3 (Kindleben, 1781)", "biblioteca": "/biblioteca/cancoes-estudantis/gaudeamus-igitur/"},
    'carmina-burana/o-fortuna-parte-1': {"titulo": "O Fortuna", "autor": "Carmina Burana", "tipo": "poema", "ordem": 64, "fonte": "Carmina Burana, 17", "obra": "carmina-burana/o-fortuna", "parte": 1, "trecho": "parte 1", "biblioteca": "/biblioteca/carmina-burana/o-fortuna/"},
    'carmina-burana/o-fortuna-parte-2': {"titulo": "O Fortuna", "autor": "Carmina Burana", "tipo": "poema", "ordem": 65, "fonte": "Carmina Burana, 17", "obra": "carmina-burana/o-fortuna", "parte": 2, "trecho": "parte 2", "biblioteca": "/biblioteca/carmina-burana/o-fortuna/"},
    'carmina-burana/o-fortuna-parte-3': {"titulo": "O Fortuna", "autor": "Carmina Burana", "tipo": "poema", "ordem": 66, "fonte": "Carmina Burana, 17", "obra": "carmina-burana/o-fortuna", "parte": 3, "trecho": "parte 3", "biblioteca": "/biblioteca/carmina-burana/o-fortuna/"},
    'cesar/gallia-est-omnis': {"titulo": "Gallia est omnis", "autor": "César", "tipo": "prosa", "ordem": 67, "fonte": "Guerra das Gálias, I,1 (começo)"},
    'cicero/quo-usque-tandem': {"titulo": "Quo usque tandem", "autor": "Cícero", "tipo": "prosa", "ordem": 68, "fonte": "Primeira Catilinária, 1–2 (começo)"},
    'seneca/ita-fac-mi-lucili': {"titulo": "Ita fac, mi Lucili", "autor": "Sêneca", "tipo": "prosa", "ordem": 69, "fonte": "Cartas a Lucílio, I,1 (começo)"},
    'ovidio/in-nova-fert-animus': {"titulo": "In nova fert animus", "autor": "Ovídio", "tipo": "poema", "ordem": 70, "fonte": "Metamorfoses, I,1–4", "biblioteca": "/biblioteca/ovidio/metamorfoses-i/"},
    # leva 2 de 19/11/2026 (LATIM.md §21): o resto da Missa (só por escolha, sem Biblioteca)
    'missal-romano/confiteor': {"titulo": "Confiteor", "autor": "Missal Romano", "tipo": "prosa", "ordem": 71, "fonte": "Ato penitencial da Missa", "biblioteca": None},
    'missal-romano/gloria-parte-1': {"titulo": "Gloria in excelsis", "autor": "Missal Romano", "tipo": "prosa", "ordem": 72, "fonte": "Ordinário da Missa", "obra": "missal-romano/gloria", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'missal-romano/gloria-parte-2': {"titulo": "Gloria in excelsis", "autor": "Missal Romano", "tipo": "prosa", "ordem": 73, "fonte": "Ordinário da Missa", "obra": "missal-romano/gloria", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'missal-romano/benedictus-es-domine-parte-1': {"titulo": "Benedictus es, Domine", "autor": "Missal Romano", "tipo": "prosa", "ordem": 74, "fonte": "A apresentação dos dons", "obra": "missal-romano/benedictus-es-domine", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'missal-romano/benedictus-es-domine-parte-2': {"titulo": "Benedictus es, Domine", "autor": "Missal Romano", "tipo": "prosa", "ordem": 75, "fonte": "A apresentação dos dons", "obra": "missal-romano/benedictus-es-domine", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'missal-romano/orate-fratres': {"titulo": "Orate, fratres", "autor": "Missal Romano", "tipo": "prosa", "ordem": 76, "fonte": "A apresentação dos dons", "biblioteca": None},
    'missal-romano/accipite': {"titulo": "Accipite et manducate", "autor": "Missal Romano", "tipo": "prosa", "ordem": 77, "fonte": "A consagração (igual em todas as Orações Eucarísticas)", "biblioteca": None},
    'missal-romano/mysterium-fidei': {"titulo": "Mysterium fidei", "autor": "Missal Romano", "tipo": "prosa", "ordem": 78, "fonte": "A aclamação depois da consagração", "biblioteca": None},
    'missal-romano/per-ipsum': {"titulo": "Per ipsum", "autor": "Missal Romano", "tipo": "prosa", "ordem": 79, "fonte": "A doxologia da Oração Eucarística", "biblioteca": None},
    'missal-romano/libera-nos': {"titulo": "Libera nos", "autor": "Missal Romano", "tipo": "prosa", "ordem": 80, "fonte": "O rito da comunhão", "biblioteca": None},
    'missal-romano/pacem-relinquo-vobis': {"titulo": "Pacem relinquo vobis", "autor": "Missal Romano", "tipo": "prosa", "ordem": 81, "fonte": "O rito da paz", "biblioteca": None},
    'missal-romano/ecce-agnus-dei': {"titulo": "Ecce Agnus Dei", "autor": "Missal Romano", "tipo": "prosa", "ordem": 82, "fonte": "O rito da comunhão", "biblioteca": None},
    # leva 3 de 19/11/2026 (LATIM.md §21): a Liturgia das Horas (só por escolha, sem Biblioteca)
    'liturgia-das-horas/deus-in-adiutorium': {"titulo": "Deus, in adiutorium", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 83, "fonte": "O começo das Horas", "biblioteca": None},
    'liturgia-das-horas/venite-exsultemus-parte-1': {"titulo": "Venite, exsultemus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 84, "fonte": "Salmo invitatório, 94 (95), pela Nova Vulgata", "obra": "liturgia-das-horas/venite-exsultemus", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'liturgia-das-horas/venite-exsultemus-parte-2': {"titulo": "Venite, exsultemus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 85, "fonte": "Salmo invitatório, 94 (95), pela Nova Vulgata", "obra": "liturgia-das-horas/venite-exsultemus", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'liturgia-das-horas/venite-exsultemus-parte-3': {"titulo": "Venite, exsultemus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 86, "fonte": "Salmo invitatório, 94 (95), pela Nova Vulgata", "obra": "liturgia-das-horas/venite-exsultemus", "parte": 3, "trecho": "parte 3", "biblioteca": None},
    'liturgia-das-horas/benedictus-parte-1': {"titulo": "Benedictus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 87, "fonte": "Cântico de Zacarias (Lc 1,68–79), nas Laudes", "obra": "liturgia-das-horas/benedictus", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'liturgia-das-horas/benedictus-parte-2': {"titulo": "Benedictus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 88, "fonte": "Cântico de Zacarias (Lc 1,68–79), nas Laudes", "obra": "liturgia-das-horas/benedictus", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'liturgia-das-horas/benedictus-parte-3': {"titulo": "Benedictus", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 89, "fonte": "Cântico de Zacarias (Lc 1,68–79), nas Laudes", "obra": "liturgia-das-horas/benedictus", "parte": 3, "trecho": "parte 3", "biblioteca": None},
    'liturgia-das-horas/magnificat-parte-1': {"titulo": "Magnificat", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 90, "fonte": "Cântico de Maria (Lc 1,46–55), nas Vésperas", "obra": "liturgia-das-horas/magnificat", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'liturgia-das-horas/magnificat-parte-2': {"titulo": "Magnificat", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 91, "fonte": "Cântico de Maria (Lc 1,46–55), nas Vésperas", "obra": "liturgia-das-horas/magnificat", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'liturgia-das-horas/nunc-dimittis': {"titulo": "Nunc dimittis", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 92, "fonte": "Cântico de Simeão (Lc 2,29–32) e o fim das Completas", "biblioteca": None},
    'liturgia-das-horas/salve-regina': {"titulo": "Salve, Regina", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 93, "fonte": "Antífona de Nossa Senhora, nas Completas", "biblioteca": None},
    'liturgia-das-horas/te-deum-parte-1': {"titulo": "Te Deum", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 94, "fonte": "Hino do Ofício das Leituras, nos domingos e festas", "obra": "liturgia-das-horas/te-deum", "parte": 1, "trecho": "parte 1", "biblioteca": None},
    'liturgia-das-horas/te-deum-parte-2': {"titulo": "Te Deum", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 95, "fonte": "Hino do Ofício das Leituras, nos domingos e festas", "obra": "liturgia-das-horas/te-deum", "parte": 2, "trecho": "parte 2", "biblioteca": None},
    'liturgia-das-horas/te-deum-parte-3': {"titulo": "Te Deum", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 96, "fonte": "Hino do Ofício das Leituras, nos domingos e festas", "obra": "liturgia-das-horas/te-deum", "parte": 3, "trecho": "parte 3", "biblioteca": None},
    'liturgia-das-horas/te-deum-parte-4': {"titulo": "Te Deum", "autor": "Liturgia das Horas", "tipo": "prosa", "ordem": 97, "fonte": "Hino do Ofício das Leituras, nos domingos e festas", "obra": "liturgia-das-horas/te-deum", "parte": 4, "trecho": "parte 4", "biblioteca": None},
}

# o que não tem card: nomes próprios, «amen» e «alleluia»
SEM_CARD = {
    'alleluia': {'lema': 'alleluia', 'classe': 'interjeição', 'g': 'gramatical',
                 'def': ['Aleluia: louvai a Deus. Palavra hebraica de louvor, própria do tempo da Páscoa.'],
                 'wiki': 'https://en.wiktionary.org/wiki/alleluia#Latin'},
    'amen': {'lema': 'amen', 'classe': 'interjeição', 'g': 'gramatical',
             'def': ['Amém: assim seja. Palavra hebraica que fecha a oração.'],
             'wiki': 'https://en.wiktionary.org/wiki/amen#Latin'},
    'maria': {'lema': 'Maria', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Maria, a mãe de Jesus.'],
              'wiki': 'https://en.wiktionary.org/wiki/Maria#Latin'},
    'iesus': {'lema': 'Iesus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Jesus.'],
              'wiki': 'https://en.wiktionary.org/wiki/Iesus#Latin'},
    'sabidi': {'lema': 'Sabidius', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Sabídio, o homem a quem o epigrama se dirige.']},
    # Eneida I,1–11
    'troiae': {'lema': 'Troia', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Troia, a cidade de Príamo, na Ásia Menor, destruída pelos gregos.'],
               'wiki': 'https://en.wiktionary.org/wiki/Troia#Latin'},
    'italiam': {'lema': 'Italia', 'classe': 'nome próprio', 'g': 'nome', 'def': ['A Itália.'],
                'wiki': 'https://en.wiktionary.org/wiki/Italia#Latin'},
    'lavinia': {'lema': 'Lavinius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                'def': ['De Lavínio, a cidade que Eneias fundou no Lácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Lavinius#Latin'},
    'iunonis': {'lema': 'Iuno', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Juno, a rainha dos deuses, mulher de Júpiter.'],
                'wiki': 'https://en.wiktionary.org/wiki/Iuno#Latin'},
    'latio': {'lema': 'Latium', 'classe': 'nome próprio', 'g': 'nome', 'def': ['O Lácio, a região da Itália onde fica Roma.'],
              'wiki': 'https://en.wiktionary.org/wiki/Latium#Latin'},
    'latinum': {'lema': 'Latinus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome', 'def': ['Latino, do Lácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Latinus#Latin'},
    'albani': {'lema': 'Albanus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
               'def': ['Albano, de Alba Longa, a cidade que o filho de Eneias fundou e de onde veio Rômulo.'],
               'wiki': 'https://en.wiktionary.org/wiki/Albanus#Latin'},
    'romae': {'lema': 'Roma', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Roma.'],
              'wiki': 'https://en.wiktionary.org/wiki/Roma#Latin'},
    # Horácio, Odes I,11 e III,30; Vergílio, Bucólica IV,1–14
    'leuconoë': {'lema': 'Leuconoe', 'classe': 'nome próprio', 'g': 'nome',
                 'def': ['Leucônoe, a moça a quem a ode se dirige.']},
    'babylonios': {'lema': 'Babylonius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                   'def': ['Babilônico, da Babilônia, a terra dos astrólogos.'],
                   'wiki': 'https://en.wiktionary.org/wiki/Babylonius#Latin'},
    'iuppiter': {'lema': 'Iuppiter', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Júpiter, o rei dos deuses.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Iuppiter#Latin'},
    'tyrrhenum': {'lema': 'Tyrrhenus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                  'def': ['Tirreno: o mar Tirreno, a oeste da Itália.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Tyrrhenus#Latin'},
    'aquilo': {'lema': 'Aquilo', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['O Aquilão, o vento norte, frio e violento.'],
               'wiki': 'https://en.wiktionary.org/wiki/aquilo#Latin'},
    'libitinam': {'lema': 'Libitina', 'classe': 'nome próprio', 'g': 'nome',
                  'def': ['Libitina, a deusa dos funerais; daí, a morte.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Libitina#Latin'},
    'capitolium': {'lema': 'Capitolium', 'classe': 'nome próprio', 'g': 'nome',
                   'def': ['O Capitólio, a colina do templo de Júpiter, em Roma.'],
                   'wiki': 'https://en.wiktionary.org/wiki/Capitolium#Latin'},
    'aufidus': {'lema': 'Aufidus', 'classe': 'nome próprio', 'g': 'nome',
                'def': ['O Áufido (hoje Ofanto), rio da Apúlia, a terra de Horácio.'],
                'wiki': 'https://en.wiktionary.org/wiki/Aufidus#Latin'},
    'daunus': {'lema': 'Daunus', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Dauno, rei lendário da Apúlia, terra seca.'],
               'wiki': 'https://en.wiktionary.org/wiki/Daunus#Latin'},
    'aeolium': {'lema': 'Aeolius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                'def': ['Eólio: da Eólia, a terra de Safo e Alceu, os poetas líricos gregos.'],
                'wiki': 'https://en.wiktionary.org/wiki/Aeolius#Latin'},
    'italos': {'lema': 'Italus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome', 'def': ['Itálico, da Itália.'],
               'wiki': 'https://en.wiktionary.org/wiki/Italus#Latin'},
    'delphica': {'lema': 'Delphicus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                 'def': ['Délfico, de Delfos, o santuário de Apolo, a quem o louro é sagrado.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Delphicus#Latin'},
    'melpomene': {'lema': 'Melpomene', 'classe': 'nome próprio', 'g': 'nome',
                  'def': ['Melpômene, uma das Musas.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Melpomene#Latin'},
    'sicelides': {'lema': 'Sicelis', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                  'def': ['Siciliana, da Sicília, a terra de Teócrito, o pai da poesia pastoril.'],
                  'wiki': 'https://en.wiktionary.org/wiki/Sicelis#Latin'},
    'cumaei': {'lema': 'Cumaeus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
               'def': ['De Cumas, a cidade da Sibila, a profetisa.'],
               'wiki': 'https://en.wiktionary.org/wiki/Cumaeus#Latin'},
    'saturnia': {'lema': 'Saturnius', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                 'def': ['De Saturno, o deus da idade de ouro.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Saturnius#Latin'},
    'lucina': {'lema': 'Lucina', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Lucina, a deusa dos partos (aqui, Diana, irmã de Apolo).'],
               'wiki': 'https://en.wiktionary.org/wiki/Lucina#Latin'},
    'apollo': {'lema': 'Apollo', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Apolo, o deus da luz e da poesia.'],
               'wiki': 'https://en.wiktionary.org/wiki/Apollo#Latin'},
    'pollio': {'lema': 'Pollio', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Polião (Caio Asínio Polião), cônsul em 40 a.C., amigo de Vergílio.'],
               'wiki': 'https://en.wiktionary.org/wiki/Pollio#Latin'},
    # orações, leva A (16/11/2026)
    "christe": {"lema": "Christus", "classe": "nome próprio", "g": "nome", "def": ["Cristo, o Ungido: título de Jesus."], "wiki": "https://en.wiktionary.org/wiki/Christus#Latin"},
    "christi": {"lema": "Christus", "classe": "nome próprio", "g": "nome", "def": ["Cristo, o Ungido: título de Jesus."], "wiki": "https://en.wiktionary.org/wiki/Christus#Latin"},
    "christo": {"lema": "Christus", "classe": "nome próprio", "g": "nome", "def": ["Cristo, o Ungido: título de Jesus."], "wiki": "https://en.wiktionary.org/wiki/Christus#Latin"},
    "christum": {"lema": "Christus", "classe": "nome próprio", "g": "nome", "def": ["Cristo, o Ungido: título de Jesus."], "wiki": "https://en.wiktionary.org/wiki/Christus#Latin"},
    "eleison": {"lema": "eleison", "classe": "verbo (imperativo)", "g": "gramatical", "def": ["Tende piedade, em grego: «Kyrie, eleison»."], "wiki": "https://en.wiktionary.org/wiki/eleison#Latin"},
    "gabrielis": {"lema": "Gabriel", "classe": "nome próprio", "g": "nome", "def": ["Gabriel, o arcanjo que anunciou a Maria."]},
    "iesu": {"lema": "Iesus", "classe": "nome próprio", "g": "nome", "def": ["Jesus."], "wiki": "https://en.wiktionary.org/wiki/Iesus#Latin"},
    "iesum": {"lema": "Iesus", "classe": "nome próprio", "g": "nome", "def": ["Jesus."], "wiki": "https://en.wiktionary.org/wiki/Iesus#Latin"},
    "kyrie": {"lema": "Kyrie", "classe": "interjeição", "g": "gramatical", "def": ["Senhor, em grego: «Kyrie, eleison» é «Senhor, tende piedade»."], "wiki": "https://en.wiktionary.org/wiki/Kyrie#Latin"},
    "pilato": {"lema": "Pilatus", "classe": "nome próprio", "g": "nome", "def": ["Pilatos, o governador romano da Judeia que condenou Jesus."]},
    "pontio": {"lema": "Pontius", "classe": "nome próprio", "g": "nome", "def": ["Pôncio, nome de família romano, o de Pilatos."]},
    "sion": {"lema": "Sion", "classe": "nome próprio", "g": "nome", "def": ["Sião, o monte santo de Jerusalém, cidade de Deus."], "wiki": "https://en.wiktionary.org/wiki/Sion#Latin"},
    "thomas": {"lema": "Thomas", "classe": "nome próprio", "g": "nome", "def": ["Tomé, o apóstolo que só creu depois de ver as chagas do Senhor."]},
    # poemas curtos de 16/11/2026
    'lesbia': {'lema': 'Lesbia', 'classe': 'nome próprio', 'g': 'nome',
               'def': ['Lésbia, a amada dos poemas de Catulo.'],
               'wiki': 'https://en.wiktionary.org/wiki/Lesbia#Latin'},
    'persicos': {'lema': 'Persicus', 'classe': 'adjetivo (nome próprio)', 'g': 'nome',
                 'def': ['Persa, da Pérsia: para os romanos, a terra do luxo.'],
                 'wiki': 'https://en.wiktionary.org/wiki/Persicus#Latin'},
    # leva 1a de 19/11/2026
    'avite': {'lema': 'Avitus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Avito, o amigo a quem Marcial dedica o epigrama.']},
    'fidentine': {'lema': 'Fidentinus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Fidentino, o plagiário que recitava os versos de Marcial como seus.']},
    'diaulus': {'lema': 'Diaulus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Diaulo, o médico que virou coveiro nos epigramas de Marcial.']},
    'fabulla': {'lema': 'Fabulla', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Fabula, a mulher vaidosa do epigrama.']},
    'cinna': {'lema': 'Cinna', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Cina, o poeta invejoso do epigrama.']},
    'thais': {'lema': 'Thais', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Taís, nome grego de mulher, comum nos epigramas.']},
    'laecania': {'lema': 'Laecania', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Lecânia, a mulher de dentes postiços do epigrama.']},
    'aemiliane': {'lema': 'Aemilianus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Emiliano, o pobre a quem o epigrama se dirige.']},
    'vacerra': {'lema': 'Vacerra', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Vacerra, o que só admirava os poetas mortos.']},
    'matthaeum': {'lema': 'Matthaeus', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Mateus, o apóstolo e evangelista.']},
    'hosanna': {'lema': 'hosanna', 'classe': 'interjeição', 'g': 'gramatical', 'def': ['Hosana: salva, por favor! Aclamação hebraica de louvor.'], 'wiki': 'https://en.wiktionary.org/wiki/hosanna#Latin'},
    'sabaoth': {'lema': 'Sabaoth', 'classe': 'nome (hebraico)', 'g': 'gramatical', 'def': ['Dos exércitos: palavra hebraica, em «Senhor Deus Sabaoth», o Senhor dos exércitos (do céu).'], 'wiki': 'https://en.wiktionary.org/wiki/Sabaoth#Latin'},
    # leva 1b de 19/11/2026
    'gallia': {'lema': 'Gallia', 'classe': 'nome próprio', 'g': 'nome', 'def': ['A Gália, a terra dos gauleses (hoje, sobretudo a França e a Bélgica).']},
    'belgae': {'lema': 'Belgae', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Os belgas, o povo do norte da Gália.']},
    'aquitani': {'lema': 'Aquitani', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Os aquitanos, o povo do sudoeste da Gália.']},
    'celtae': {'lema': 'Celtae', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Os celtas: o nome que os gauleses do centro davam a si mesmos.']},
    'galli': {'lema': 'Galli', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Os gauleses: o nome romano dos celtas da Gália.']},
    'catilina': {'lema': 'Catilina', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Catilina, o senador que conspirou contra Roma em 63 a.C.']},
    'lucili': {'lema': 'Lucilius', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Lucílio, o amigo a quem Sêneca escreve as cartas.']},
    # leva 2 de 19/11/2026
    'mariam': {'lema': 'Maria', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Maria, a mãe de Jesus.'], 'wiki': 'https://en.wiktionary.org/wiki/Maria#Latin'},
    # leva 3 de 19/11/2026
    'israel': {'lema': 'Israel', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Israel, o povo de Deus (e o patriarca Jacó, que deu o nome ao povo).'], 'wiki': 'https://en.wiktionary.org/wiki/Israel#Latin'},
    'david': {'lema': 'David', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Davi, o rei de Israel, de cuja casa vem o Messias.'], 'wiki': 'https://en.wiktionary.org/wiki/David#Latin'},
    'abraham': {'lema': 'Abraham', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Abraão, o patriarca, pai do povo de Israel.'], 'wiki': 'https://en.wiktionary.org/wiki/Abraham#Latin'},
    'meriba': {'lema': 'Meriba', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Meribá, o lugar do deserto onde o povo discutiu com Deus por falta de água (Ex 17).']},
    'massa': {'lema': 'Massa', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Massá, o lugar do deserto onde o povo tentou a Deus (Ex 17); o mesmo episódio de Meribá.']},
    'evae': {'lema': 'Eva', 'classe': 'nome próprio', 'g': 'nome', 'def': ['Eva, a primeira mulher.'], 'wiki': 'https://en.wiktionary.org/wiki/Eva#Latin'},
    'cherubim': {'lema': 'Cherubim', 'classe': 'nome (hebraico)', 'g': 'nome', 'def': ['Os Querubins, uma das ordens dos anjos (plural hebraico de cherub).'], 'wiki': 'https://en.wiktionary.org/wiki/cherubim#Latin'},
    'seraphim': {'lema': 'Seraphim', 'classe': 'nome (hebraico)', 'g': 'nome', 'def': ['Os Serafins, uma das ordens dos anjos (plural hebraico de seraph).'], 'wiki': 'https://en.wiktionary.org/wiki/seraphim#Latin'},
}

PALAVRA = re.compile(r'[A-Za-zÀ-ÿ]+')


def classe_de(card):
    tags = card.get('tags', [])
    if 'substantivo' in tags:
        fim = card.get('enunciado', '').rstrip().rstrip('.').split(',')[-1].strip()
        return {'m': 'substantivo masculino', 'f': 'substantivo feminino', 'n': 'substantivo neutro'}.get(fim, 'substantivo')
    for t, nome in (('verbo', 'verbo'), ('adjetivo', 'adjetivo'), ('pronomes', 'pronome'), ('preposição', 'preposição'),
                    ('advérbio', 'advérbio'), ('conjunção', 'conjunção'), ('interjeição', 'interjeição')):
        if t in tags:
            return nome
    return ''


def destino_de(entrada, cards):
    c = cards[entrada['c']]
    d = {'lema': c['la'], 'classe': classe_de(c)}
    if entrada.get('f'):
        d['forma'] = entrada['f']
    if entrada.get('fn'):
        d['funcao'] = entrada['fn']
    d['card'] = c['id']
    d['wiki'] = 'https://en.wiktionary.org/wiki/' + c['la'] + '#Latin'
    return d


def sem_card(entrada):
    k = entrada['w'].lower()
    if k not in SEM_CARD:
        raise SystemExit(f"«{entrada['w']}» não tem card nem destino em SEM_CARD")
    d = dict(SEM_CARD[k])
    if entrada.get('f'):
        d['forma'] = entrada['f']
    # no nome próprio, a função sem a repetição do nome («nome próprio, Maria: a quem se fala»)
    fn = entrada.get('fn', '')
    if d['g'] == 'nome' and ':' in fn:
        d['funcao'] = fn.split(':', 1)[1].strip()
    return d


def linha_de(trecho, cards, destinos):
    """A linha em pedaços [texto, chave]; cada palavra consome uma ou duas entradas de
    «palavras» (duas quando a palavra junta duas, como tecum = te + cum)."""
    fila = list(trecho['palavras'])
    p, pos = [], 0
    ms = list(PALAVRA.finditer(trecho['la']))
    for k, m in enumerate(ms):
        if m.start() > pos:
            p.append([trecho['la'][pos:m.start()], None])
        w = m.group(0)
        if not fila:
            raise SystemExit(f"{trecho['id']}: sobrou «{w}» sem anotação")
        partes = [fila.pop(0)]
        # a enclítica vem anotada à parte, com hífen: Longeque = Longe + -que
        while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
            if not fila or len(partes) > 2:
                raise SystemExit(f"{trecho['id']}: «{w}» não bate com a anotação")
            partes.append(fila.pop(0))
        # a mesma palavra repetida no texto («Sanctus, Sanctus», «fui, fui») é uma entrada cada
        prox = ms[k + 1].group(0).lower() if k + 1 < len(ms) else None
        if partes[0]['w'].lower() == w.lower() and fila and fila[0]['w'].lower() == w.lower() and prox != w.lower():
            partes.append(fila.pop(0))
        ds = [destino_de(x, cards) if x.get('c') else sem_card(x) for x in partes]
        d = ds[0] if len(ds) == 1 else {'partes': ds}
        p.append([w, chave_para(w.lower(), d, destinos)])
        pos = m.end()
    if pos < len(trecho['la']):
        p.append([trecho['la'][pos:], None])
    if fila:
        raise SystemExit(f"{trecho['id']}: anotação a mais: {[x['w'] for x in fila]}")
    return {'t': trecho['la'], 'p': p, 'card': trecho['id']}


def chave_para(base, d, destinos):
    """A mesma palavra com a mesma análise usa a mesma chave; com outra, «base#2», «base#3»…"""
    k, n = base, 1
    while k in destinos and destinos[k] != d:
        n += 1
        k = f'{base}#{n}'
    destinos[k] = d
    return k


def chave_latina(w):
    """A mesma chave do build (chaveLatina): minúscula, sem acento, sem o hífen da enclítica, j→i, v→u."""
    s = unicodedata.normalize('NFD', str(w).lower())
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lstrip('-')
    return s.replace('j', 'i').replace('v', 'u')


def flexoes_do_verso(verso, flexao):
    """As flexões das formas do verso (LATIM.md §3.8), na ordem da leitura: o verso espera também
    elas, e não só os lemas (o build as põe logo depois do lema de cada uma)."""
    saida = []
    for p in verso['palavras']:
        if p.get('c') and not p['w'].startswith('-'):
            f = flexao.get(chave_latina(p['w']) + '|' + p['c'])
            if f and f not in saida:
                saida.append(f)
    return saida


def montar():
    cards = {}
    for f in sorted(BARALHO.glob('*.json')):
        for c in json.loads(f.read_text(encoding='utf-8')):
            cards[c['id']] = c
    flexao = {chave_latina(c['la']) + '|' + c['lema']: c['id'] for c in cards.values() if c.get('tipo') == 'flexao'}
    # o texto vem dos versos anotados; o card é o trecho (a frase), que pode atravessar o verso
    # (cortes.py, desde 04/11/2026)
    versos = json.loads(VERSOS.read_text(encoding='utf-8'))
    trechos = {}
    for c in cards.values():
        if c.get('tipo') == 'frase' and c.get('texto'):
            trechos.setdefault(c['texto'], []).append(c)
    DESTINO.mkdir(parents=True, exist_ok=True)
    for tid, vs in sorted(versos.items()):
        if tid not in TEXTOS:
            raise SystemExit(f'o texto {tid} não está em TEXTOS')
        meta = TEXTOS[tid]
        ts = sorted(trechos.get(tid, []), key=lambda c: c['linha'])
        if [c['linha'] for c in ts] != list(range(1, len(ts) + 1)):
            raise SystemExit(f'{tid}: os trechos não vão de 1 a {len(ts)} («linha» é a ordem deles)')
        cobertos = set()
        for c in ts:
            a, b = c.get('versos') or (0, 0)
            if not 1 <= a <= b <= len(vs):
                raise SystemExit(f"{c['id']}: «versos» fora do texto")
            cobertos.update(range(a, b + 1))
        # o verso repetido (a antífona que volta, «Oremus.») não ganha trecho de novo: basta que cada
        # palavra com card dele esteja num trecho de algum texto (cortes.py, so_letras)
        em_trecho = {w for c in cards.values() if c.get('tipo') == 'frase' and c.get('texto')
                     for w in re.findall(r'[a-z]+', c['la'].lower())}
        for n, v in enumerate(vs, 1):
            if n not in cobertos and all(w in em_trecho for p in v['palavras'] if p.get('c')
                                         for w in re.findall(r'[a-z]+', p['w'].lower())):
                cobertos.add(n)
        if cobertos != set(range(1, len(vs) + 1)):
            raise SystemExit(f'{tid}: versos sem trecho: {sorted(set(range(1, len(vs) + 1)) - cobertos)}')
        destinos = {}
        linhas = []
        for n, v in enumerate(vs, 1):
            linha = linha_de(dict(v, id=f'{tid}#{n}'), cards, destinos)
            del linha['card']
            fl = flexoes_do_verso(v, flexao)
            if fl:
                linha['flexoes'] = fl
            linhas.append(linha)
        autor, pasta = tid.split('/')
        texto = {'id': tid, 'idioma': 'la', 'tipo': meta['tipo'], 'titulo': meta['titulo'], 'autor': meta['autor'],
                 'ano': None, 'biblioteca': meta.get('biblioteca', f'/biblioteca/{autor}/{pasta}/'), 'ordem': meta['ordem']}
        for k in ('fonte', 'obra', 'parte', 'trecho'):
            if meta.get(k):
                texto[k] = meta[k]
        texto['blocos'] = [linhas]
        texto['destinos'] = destinos
        arq = DESTINO / f'{autor}--{pasta}.json'
        arq.write_text(json.dumps(texto, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
        print(f'{arq.name}: {len(linhas)} versos, {len(ts)} trechos, {len(destinos)} chaves')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    montar()
