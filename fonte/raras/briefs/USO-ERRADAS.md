# Refazer as erradas dos cards de uso

Contexto: cards para brasileiros adultos aprenderem palavras raras (regras gerais em
`/home/geremias/.cache/raras-2011/BRIEF.md`; leia a seção do `uso`). No card de uso, a pessoa vê uma
frase real com uma lacuna (`___`) e escolhe, entre cinco, a palavra que a completa.

Defeito: muitas erradas são **absurdas** (para «um negro ___ e beiçudo»: «gasoso», «mensal»,
«triangular»; para «ao pé do ___»: «verão», «domingo»). Quem não sabe a palavra acerta pelo
absurdo das outras. A regra da casa: **toda alternativa tem de ter sentido e ser plausível**.

Refaça as quatro erradas do `uso` de cada linha que tem `uso` nos arquivos
`/home/geremias/.cache/raras-2011/lotes/revisada-1.jsonl` a `revisada-8.jsonl` (mexa **só** no
campo `uso.distratores`; o resto da linha fica igual, letra por letra). Grave cada arquivo de volta
logo que terminar as linhas dele (reescrevendo-o inteiro, uma linha JSON por palavra, na mesma
ordem), e anote em `/home/geremias/.cache/raras-2011/lotes/uso-erradas.txt` uma linha por card
(«lema: antes → depois»).

As novas erradas:
- palavras **reais**, de preferência **parecidas com a certa na forma ou no som** (parônimos:
  «cambaio» → «cambado», «zambro»? não: só se existir e não couber) ou **do mesmo campo** (outras
  peças de roupa, outros bichos do mato, outros ofícios), e de registro parecido (raras ou cultas,
  quando a certa é rara);
- **na mesma forma** da resposta na frase: mesma classe, gênero, número; no verbo, mesmo tempo e
  pessoa;
- **nenhuma pode caber na frase** com o sentido que ela tem: lida a frase inteira, só a certa fica
  boa. Se uma errada deixa a frase possível (ainda que com outro sentido), troque-a. Na dúvida,
  prefira a errada claramente incompatível com o contexto, mas nunca absurda à primeira vista;
- diferentes entre si e da certa, sem repetir as erradas do card de `escrever` da mesma palavra
  quando houver outras boas.

Para conferir que uma palavra existe, se precisar:
`grep -c -x "<palavra>" /home/geremias/.cache/raras-2011/dados/morphobr.txt` (1 = existe; o
MorphoBr não tem alguns compostos).

No fim, responda só com quantos cards refez e as dúvidas (uma linha cada).
