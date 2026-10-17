# As listas de frequência

`<língua>.tsv` (`fr`, `es`, `en`, `pt`): umas 5.000 palavras de cada língua, da mais básica à
mais rara, com todas as palavras que têm card no baralho (`fonte/cards/<língua>`) e as que
ainda não têm. É o que o nivelamento de cada curso percorre (PLANO.md, 7.9) e o roteiro dos
cards que vierem.

| coluna | o quê |
|---|---|
| `pos` | a posição: 1 é a mais básica |
| `<língua>` | a forma de citação (substantivo com o artigo, verbo no infinitivo — no inglês com `to` —, adjetivo no masculino) |
| `classe`, `genero` | a classe, e o gênero do substantivo (vazio no inglês) |
| `nivel` | o nível pela posição: até 700 A1, até 1.500 A2, até 2.500 B1, até 3.750 B2, até 5.000 C1, depois C2 |
| as línguas dos públicos | a tradução curta (a resposta da conferência do nivelamento): `pt es en` no francês, `pt en` no espanhol, `pt es` no inglês, `es en` no português |
| `cards` | os ids dos cards de palavra dessa entrada |

## Como foi feita

1. `node fonte/frequencia/ordenar.js <língua>` cruza as fontes e grava `candidatos-<língua>.tsv`:
   cada lema ganha a posição na lista dos livros didáticos (nível de entrada, depois a
   frequência) e nas legendas (frequência do lema), e a ordem sai da média das duas. O
   português não tem lista de livros didáticos: vale só a das legendas, e a curadoria pesa mais.
2. A curadoria, trecho a trecho (`brutos/CURADORIA.md` tem as regras): forma de citação,
   classe, gênero, tradução, e a marca do que sai (chulo, nome próprio, fragmento, forma
   flexionada, estrangeira, sigla, duplicata, gramatical) e do que muda de lugar (o
   vocabulário básico de curso que a frequência põe tarde demais vai para o A1; a expressão
   fora do lugar, para o nível dela).
3. `node fonte/frequencia/juntar.js <língua> <pasta-das-partes>` junta as partes e grava `<língua>.tsv`.

Para mexer depois, edite `<língua>.tsv` direto: a posição é a ordem das linhas (renumere
`pos`), e o `node fonte/build.js` confere que toda palavra com card está na lista.

## Fontes e licença

- **FLELex**, **ELELex** e **EFLLex** (CEFRLex, CENTAL, UCLouvain): a frequência de cada lema
  nos livros didáticos de francês, espanhol e inglês para estrangeiros, por nível do QECR.
  Thomas François, Nùria Gala, Patrick Watrin e Cédrick Fairon, «FLELex: a graded lexical
  resource for French foreign learners», LREC 2014; Luise Dürlich e Thomas François,
  «EFLLex: A Graded Lexical Resource for Learners of English as a Foreign Language», LREC
  2018; o ELELex ainda não tem artigo de referência (a página dele diz «forthcoming»).
  <https://cental.uclouvain.be/cefrlex/> — CC BY-NC-SA 4.0.
- **Lexique 4.10** (francês): Boris New, Christophe Pallier, Gauvain Schalchli, Jessica
  Bourggin e Manuel Gimenes, «Lexique 4: a major upgrade of the « Lexique » French Lexical
  Database», 2026. <http://www.lexique.org> — Creative Commons, uso não comercial.
- **FrequencyWords** (espanhol, inglês e português do Brasil): Hermit Dave, a frequência das
  palavras nas legendas do OpenSubtitles 2018 (P. Lison e J. Tiedemann, LREC 2016).
  <https://github.com/hermitdave/FrequencyWords> — CC BY-SA 4.0.
- **lemmatization-lists** (as formas de cada lema, para somar a frequência das legendas):
  Michal Měchura. <https://github.com/michmech/lemmatization-lists> — ODbL.

A ordem e as traduções destas listas são obra derivada e saem sob **CC BY-NC-SA 4.0**, com o
crédito acima. As legendas e as listas de lemas só dão a frequência usada para ordenar; nada
delas é reproduzido (ponto para o advogado: CC BY-SA e ODbL pedem a mesma licença na obra
derivada). Os arquivos originais ficam em `brutos/`, fora do git (baixe-os das páginas acima
para refazer o passo 1; nas legendas, os arquivos `<língua>_full.txt` de `content/2018/`).
