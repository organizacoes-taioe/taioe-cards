"""Decide à mão o destino de palavras de um texto (PLANO.md, 9.3), e a decisão sobrevive a
uma nova importação (fica marcada com «manual»).

    python fonte/destino-texto.py <arquivo-do-texto> <chave>=gramatical [<chave>=nome] [<chave>=<id-do-card>] ...
    python fonte/destino-texto.py <arquivo-do-texto> <chave>=leitura      # o «+lema» passa a card de leitura
    python fonte/destino-texto.py <arquivo-do-texto> <chave>=comum        # o «+lema» deixa de ser de leitura

Numa palavra composta («partes»), a chave leva o número da parte: «don't.2=gramatical».
"""
import json
import sys


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    arq = sys.argv[1]
    d = json.load(open(arq, encoding='utf-8'))
    for par in sys.argv[2:]:
        ch, valor = par.rsplit('=', 1)
        parte = None
        if '.' in ch and ch.rsplit('.', 1)[1].isdigit():
            ch, parte = ch.rsplit('.', 1)
            parte = int(parte) - 1
        if ch not in d['destinos']:
            sys.exit('chave desconhecida: ' + ch)
        alvo = d['destinos'][ch]
        x = alvo['partes'][parte] if parte is not None else alvo
        if valor in ('gramatical', 'nome'):
            x.pop('card', None); x.pop('leitura', None); x['g'] = valor
        elif valor == 'leitura':
            x['leitura'] = True
        elif valor == 'comum':
            x.pop('leitura', None)
        else:
            x.pop('g', None); x['card'] = valor
            if valor[:1] != '+':
                x.pop('leitura', None)
        x.pop('conferir', None)
        alvo['manual'] = True
    with open(arq, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('ok')


if __name__ == '__main__':
    main()
