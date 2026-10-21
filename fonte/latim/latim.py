"""Latim: o que as ferramentas do curso dividem (cards/LATIM.md).

- `grafia`: a grafia de exibição — i e v, sem j, ae e oe sem ligadura (LATIM.md §9).
- `chave`: a forma de comparar — minúscula, sem acento nem mácron, j = i, v = u.
- `palavras`: as palavras de um trecho, com a pontuação separada.
- `referencia`: o livro da Vulgata (código do arquivo do eBible) no jeito brasileiro, com o
  salmo na numeração hebraica e a latina entre parênteses (`../../biblia/ESCOLHAS.md`).

Só a biblioteca padrão do Python.
"""

import re
import unicodedata

LIGADURAS = {'æ': 'ae', 'Æ': 'Ae', 'œ': 'oe', 'Œ': 'Oe'}


def sem_marcas(texto):
    """Tira acento, mácron, breve e trema (ā → a, ë → e, Dóminus → Dominus)."""
    decomposto = unicodedata.normalize('NFD', texto)
    return unicodedata.normalize('NFC', ''.join(c for c in decomposto if unicodedata.category(c) != 'Mn'))


def grafia(texto):
    """A grafia de exibição: sem ligadura, sem j, sem trema («Israël»), sem colchete do eBible e
    sem o espaço do eBible antes de «!», «?», «;» e «:»; o v fica."""
    for de, para in LIGADURAS.items():
        texto = texto.replace(de, para)
    texto = texto.replace('j', 'i').replace('J', 'I')
    for de, para in (('ë', 'e'), ('ï', 'i'), ('ü', 'u'), ('Ë', 'E'), ('Ï', 'I'), ('Ü', 'U')):
        texto = texto.replace(de, para)
    texto = texto.replace('[', '').replace(']', '')
    texto = re.sub(r'\s+', ' ', texto).strip()
    texto = re.sub(r'\s+([!?;:])', r'\1', texto)
    return texto


def chave(palavra):
    """A forma de comparar duas palavras latinas, venham de que edição vierem."""
    p = sem_marcas(grafia(palavra)).lower()
    return p.replace('v', 'u').replace('j', 'i')


RE_PALAVRA = re.compile(r"[A-Za-zÀ-ÿĀ-ſ]+")


def palavras(trecho):
    """As palavras do trecho, na ordem, sem a pontuação."""
    return RE_PALAVRA.findall(trecho)


# Os códigos dos livros no arquivo do eBible (latVUC_vpl.txt) e a abreviação brasileira.
LIVROS = {
    'GEN': 'Gn', 'EXO': 'Ex', 'LEV': 'Lv', 'NUM': 'Nm', 'DEU': 'Dt', 'JOS': 'Js', 'JDG': 'Jz',
    'RUT': 'Rt', '1SA': '1Sm', '2SA': '2Sm', '1KI': '1Rs', '2KI': '2Rs', '1CH': '1Cr',
    '2CH': '2Cr', 'EZR': 'Esd', 'NEH': 'Ne', 'TOB': 'Tb', 'JDT': 'Jt', 'EST': 'Est',
    '1MA': '1Mc', '2MA': '2Mc', 'JOB': 'Jó', 'PSA': 'Sl', 'PRO': 'Pr', 'ECC': 'Ecl',
    'SOL': 'Ct', 'WIS': 'Sb', 'SIR': 'Eclo', 'ISA': 'Is', 'JER': 'Jr', 'LAM': 'Lm',
    'BAR': 'Br', 'EZE': 'Ez', 'DAN': 'Dn', 'HOS': 'Os', 'JOE': 'Jl', 'AMO': 'Am', 'OBA': 'Ab',
    'JON': 'Jn', 'MIC': 'Mq', 'NAH': 'Na', 'HAB': 'Hab', 'ZEP': 'Sf', 'HAG': 'Ag', 'ZEC': 'Zc',
    'MAL': 'Ml', 'MAT': 'Mt', 'MAR': 'Mc', 'LUK': 'Lc', 'JOH': 'Jo', 'ACT': 'At', 'ROM': 'Rm',
    '1CO': '1Cor', '2CO': '2Cor', 'GAL': 'Gl', 'EPH': 'Ef', 'PHI': 'Fl', 'COL': 'Cl',
    '1TH': '1Ts', '2TH': '2Ts', '1TI': '1Tm', '2TI': '2Tm', 'TIT': 'Tt', 'PHM': 'Fm',
    'HEB': 'Hb', 'JAM': 'Tg', '1PE': '1Pd', '2PE': '2Pd', '1JO': '1Jo', '2JO': '2Jo',
    '3JO': '3Jo', 'JUD': 'Jd', 'REV': 'Ap',
}


def salmo_hebraico(n, v):
    """(salmo, versículo, rótulo latino) no hebraico para o salmo n, versículo v da Vulgata.
    O versículo da Vulgata conta o título, como o hebraico. Onde a Vulgata junta dois salmos
    (9 e 113) ou parte um (114 e 115; 146 e 147), o versículo é refeito."""
    if n <= 8:
        return n, v, str(n)
    if n == 9:
        return (9, v, '9') if v <= 21 else (10, v - 21, '9B')
    if n <= 112:
        return n + 1, v, str(n)
    if n == 113:
        return (114, v, '113') if v <= 8 else (115, v - 8, '113B')
    if n == 114:
        return 116, v, '114'
    if n == 115:
        return 116, v + 9, '115'
    if n <= 145:
        return n + 1, v, str(n)
    if n == 146:
        return 147, v, '146'
    if n == 147:
        return 147, v + 11, '147'
    return n, v, str(n)


CASOS = {'nominative': 'nominativo', 'vocative': 'vocativo', 'accusative': 'acusativo',
         'genitive': 'genitivo', 'dative': 'dativo', 'ablative': 'ablativo', 'locative': 'locativo'}
NUMEROS = {'singular': 'singular', 'plural': 'plural'}
GENEROS = {'masculine': 'masculino', 'feminine': 'feminino', 'neuter': 'neutro'}
TEMPOS = {'present': 'presente', 'imperfect': 'imperfeito', 'future': 'futuro', 'perfect': 'perfeito',
          'pluperfect': 'mais-que-perfeito', 'future-perfect': 'futuro perfeito'}
MODOS = {'indicative': 'do indicativo', 'subjunctive': 'do subjuntivo', 'imperative': 'do imperativo'}
PESSOAS = {'first-person': '1ª', 'second-person': '2ª', 'third-person': '3ª'}


def rotulo(marcas):
    """As marcas do Wiktionary (accusative, singular…) no rótulo das gramáticas brasileiras:
    «acusativo singular», «presente do subjuntivo, 3ª pessoa do singular, voz passiva»."""
    m = set(marcas)
    caso = next((CASOS[t] for t in CASOS if t in m), None)
    numero = next((NUMEROS[t] for t in NUMEROS if t in m), None)
    if 'participle' in m:
        tempo = next((TEMPOS[t] for t in TEMPOS if t in m), '')
        partes = [f'particípio {tempo}'.strip()]
        if caso:
            partes.append(' '.join(x for x in (caso, next((GENEROS[t] for t in GENEROS if t in m), ''), numero) if x))
        return ', '.join(partes)
    if 'infinitive' in m:
        tempo = next((TEMPOS[t] for t in TEMPOS if t in m), 'presente')
        voz = ', voz passiva' if 'passive' in m else ''
        return f'infinitivo {tempo}{voz}'
    if 'gerund' in m:
        return ' '.join(x for x in ('gerúndio', caso) if x)
    if 'gerundive' in m:
        return ' '.join(x for x in ('gerundivo', caso, numero) if x)
    tempo = next((TEMPOS[t] for t in TEMPOS if t in m), None)
    if tempo:
        modo = next((MODOS[t] for t in MODOS if t in m), '')
        rot = f'{tempo} {modo}'.strip() if modo != 'do imperativo' else f'imperativo {tempo}'
        pessoa = next((PESSOAS[t] for t in PESSOAS if t in m), None)
        if pessoa and numero:
            rot += f', {pessoa} pessoa do {numero}'
        if 'passive' in m:
            rot += ', voz passiva'
        return rot
    return ' '.join(x for x in (caso, numero) if x)


def referencia(livro, capitulo, versiculo):
    """«Gn 1,3»; no salmo, «Sl 117 (116),1»: a numeração hebraica e, entre parênteses, a da
    Vulgata, como na Bíblia Taioé."""
    if livro == 'PSA':
        heb, v, lat = salmo_hebraico(capitulo, versiculo)
        if str(heb) != lat:
            return f'Sl {heb} ({lat}),{v}'
        return f'Sl {heb},{v}'
    return f'{LIVROS[livro]} {capitulo},{versiculo}'
