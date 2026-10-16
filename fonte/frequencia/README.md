# A lista de frequência do francês

`fr.tsv`: 5.356 palavras do francês, da mais básica à mais rara, com todas as palavras que
têm card no baralho (`fonte/cards/fr`) e as que ainda não têm. É o que o nivelamento do curso
de francês percorre (PLANO.md, 7.9) e o roteiro dos cards que vierem.

| coluna | o quê |
|---|---|
| `pos` | a posição: 1 é a mais básica |
| `fr` | a forma de citação (substantivo com o artigo, verbo no infinitivo, adjetivo no masculino) |
| `classe`, `genero` | a classe, e o gênero do substantivo |
| `nivel` | o nível pela posição: até 700 A1, até 1.500 A2, até 2.500 B1, até 3.750 B2, até 5.000 C1, depois C2 |
| `pt`, `es`, `en` | a tradução curta (a resposta da conferência do nivelamento) |
| `cards` | os ids dos cards de palavra dessa entrada |

## Como foi feita

1. `node fonte/frequencia/ordenar.js` cruza as duas fontes e grava `candidatos-fr.tsv`: cada
   lema ganha a posição no FLELex (nível de entrada nos livros didáticos, depois a
   frequência) e no Lexique (frequência nas legendas), e a ordem sai da média das duas.
2. A curadoria, trecho a trecho: forma de citação, classe, gênero, tradução, e a marca do que
   sai (chulo, nome próprio, fragmento, forma flexionada, estrangeira, sigla, duplicata) e do
   que muda de lugar (o vocabulário básico de curso que a frequência põe tarde demais).
3. `node fonte/frequencia/juntar.js <pasta-das-partes>` junta as partes e grava `fr.tsv`.

Para mexer depois, edite `fr.tsv` direto: a posição é a ordem das linhas (renumere `pos`), e o
`node fonte/build.js` confere que toda palavra com card está na lista.

## Fontes e licença

- **FLELex** (CENTAL, UCLouvain): Thomas François, Nùria Gala, Patrick Watrin e Cédrick
  Fairon, «FLELex: a graded lexical resource for French foreign learners», LREC 2014.
  <https://cental.uclouvain.be/cefrlex/flelex/> — CC BY-NC-SA 4.0.
- **Lexique 4.10**: Boris New, Christophe Pallier, Gauvain Schalchli, Jessica Bourggin e
  Manuel Gimenes, «Lexique 4: a major upgrade of the « Lexique » French Lexical Database»,
  2026. <http://www.lexique.org> — Creative Commons, uso não comercial.

A ordem e as traduções desta lista são obra derivada e saem sob a mesma licença,
**CC BY-NC-SA 4.0**, com o crédito acima. Os arquivos originais ficam em `brutos/`, fora do git
(baixe-os das páginas acima para refazer o passo 1).
