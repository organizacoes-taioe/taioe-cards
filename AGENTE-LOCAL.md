# Roteiro para o agente local

Este arquivo é para o agente que roda no computador do Gere, com acesso ao
`taioe-infra` (banco), ao navegador com login e ao deploy — o que a sessão
na nuvem não alcança. Ele fecha o trabalho do branch `ccr-c5a1794f-0tbpvt`.

## O que o branch traz

1. **O curso de francês** (`fonte/cards/fr`, 1023 cards) para quem fala
   português, espanhol e inglês: cursos `fr-pt`, `fr-es`, `fr-en`. Ver
   `PLANO.md`, «O baralho de francês».
2. **O começo do app sem tédio** — `PLANO.md`, seção 7, inteira, e a 7.8 em
   especial (o código como ficou): palavras transparentes, dominado
   provisório, nivelamento, card desafio, vitrine dos textos, dicas no
   momento certo.

Leia antes: `PLANO.md` (seções «O baralho de francês» e 7),
`fonte/MANUAL-DOS-CARDS.md` (seções 15.1 e 19) e o `git log` do branch.

## 1. Banco (taioe-infra)

Nada disso foi feito; o app já manda e espera estes dados.

1. **Cursos novos**: o banco tem de aceitar `fr-pt`, `fr-es` e `fr-en` em
   tudo que tem coluna `curso` (`conta.perfis.curso_atual`, `cards.catalogo`,
   `cards.versoes`, `cards.estado`, respostas, extras, comentários,
   contestações). Procure `check`/enum/lista de cursos nas migrações.
2. **Catálogos do francês**: aplicar `fonte/sql/catalogo-fr-pt.sql`,
   `catalogo-fr-es.sql` e `catalogo-fr-en.sql` pelo workflow Catálogo do
   taioe-infra, no teste e depois na produção, **antes** de o branch ir
   para a main. Os catálogos dos outros cursos não mudaram.
3. **Extras novos** — RPCs `cards.gravar_extras` e `cards.carregar_curso`:
   - guardar e devolver três chaves novas: `nivelamento`, `reativados` e
     `dicasVistas` (hoje o servidor só conhece `arquivados`, `emVista` e
     `textos`, e pode estar descartando o resto);
   - mesclar **exatamente** como `mesclarExtras` em
     `public/cards/js/sincronia.js` (a mescla do aparelho é a referência):
     `nivelamento` inteiro, ganha o de `feitoEm` mais recente (empate: o do
     servidor); `reativados` e `dicasVistas` chave a chave, ganha a ação
     mais recente, com o desfazer gravado como a data precedida de «-»
     (`"-2026-10-09T…"`), empate: o do servidor;
   - conferir o **tamanho**: um nivelamento generoso guardou 446 presumidos
     (`{ id: dataISO }`). Se houver limite de tamanho nos extras, ajustar.
4. **Estado do card** — RPC `cards.registrar_respostas`:
   - aceitar e guardar os campos novos do estado `desafio` (boolean) e
     `desafioEm` (ISO); sem eles, o ritmo do desafio fica só no
     `localStorage` do aparelho;
   - aceitar a confirmação de um presumido: a primeira resposta de um card
     que não tinha estado chega com `etapa_antes: 'dominado'` e
     `degrau: null`, fica fora de `retencao` e não conta como estreia.
     Conferir que o servidor não rejeita nem conta errado.
5. Rodar os testes do próprio taioe-infra, se houver, e aplicar no teste
   antes da produção.

## 2. O app no navegador, com login de verdade

No celular (ou com a largura de um, 390 px), com uma conta de teste:

1. **Francês**: a escolha de curso mostra Francês com a bandeira, nas três
   línguas da interface; abrir `fr-pt`, `fr-es` e `fr-en`.
2. **Nivelamento**: conta nova em `es-pt` → a mensagem, «Você já estudou…»,
   *Um pouco* → o teste (recarregar no meio e ver que continua de onde
   parou) → resultado → «como funciona» → jogo. Repetir com *Nunca* e com
   *Bastante*. Conferir no banco que `extras.nivelamento` chegou.
3. **Outro aparelho, mesma conta**: o nivelamento não reaparece; os
   presumidos e as dicas vistas vieram juntos.
4. **Conta antiga** (com progresso em `es-pt`): não vê o nivelamento; as 278
   transparentes saíram das filas, o progresso delas continua guardado e
   «estudar mesmo assim» (lista → filtro «transparentes») devolve o card.
5. **Dicas**: aparecem uma vez cada (arquivar, quase, comentar, frase,
   dominado, transparente, desafio); «Rever dicas» as traz de volta.
6. **Desafio**: depois de 15 respostas aparece um, com a marca; se for frase
   presa, a prévia («essa volta quando você tiver as palavras dela»).
7. **Painel**: «a confirmar» e a vitrine do próximo texto (espanhol e
   inglês; português e francês ainda não têm textos).
8. Console sem erros além dos 404 esperados de `textos-pt.js`/`textos-fr.js`.

O que já foi testado na nuvem, num navegador com sessão simulada: tudo
acima menos o login, as RPCs reais e a dica `frase`.

## 3. Ir para a main

1. Conferir o CI do branch (workflow «Cópias»: motor copiado, interface nas
   três línguas, build em dia, `fonte/testar-comeco.js`).
2. Abrir o pull request de `ccr-c5a1794f-0tbpvt` para a `main` e fazer o
   merge só depois dos passos 1 e 2 deste roteiro.
3. Publicar como de costume (Cloudflare, `wrangler.jsonc`).

## 4. Conteúdo que ficou para depois (não bloqueia)

O build avisa, e o nivelamento funciona melhor com isto feito:

- **Palavras sem tema**: 461 no espanhol, 227 no inglês, 62 no português, 64
  no francês. Cada uma precisa de uma etiqueta de tema além da classe
  (manual, seção 19). É trabalho de card, com as regras do manual.
- **Banco do nivelamento magro**: `pt-es`/`pt-en` sem temas suficientes no
  A2; `fr-*` com um só tema no A2; `es-*` com 5 temas no B2 (precisa de 6).
- **Curadoria das transparentes** (é do Gere): `node fonte/transparentes.js
  es-pt` e `pt-es` (os cursos em que elas pesam), lido de olho; onde a regra
  errar, o campo `transparencia` no card.

Ao terminar, marque na tabela da seção 7.7 do `PLANO.md` a linha «banco
(extras novos) e teste no navegador» como feita, com a data.
