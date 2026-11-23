"""O corte dos textos latinos em trechos (cards/LATIM.md §3.3, critério de 04/11/2026).

    python -I fonte/latim/cortes.py extrair        # uma vez: os versos anotados → fonte/latim/versos.json
    python -I fonte/latim/cortes.py entrada <saida.json> [texto…]  # os trechos de CORTES (ou só os dos textos dados), para a leva
    python -I fonte/latim/cortes.py gravar <leva.json> ...   # os trechos novos no lugar dos antigos
    python -I fonte/latim/cortes.py perguntas                # as perguntas sobre os trechos (D41)

Depois do «gravar»: flexoes.py gravar (o «requerTodas» dos trechos novos), cortes.py perguntas,
analise.py (o verbo, a concordância e a leitura dos trechos novos), cards_de_forma.py, textos.py e o
build. As levas (fora do git) ficam em cache/levas/cortes-*.json (os trechos e as perguntas) e
analise-frases-*.json (a análise).

O texto é feito de versos (fonte/latim/versos.json: o verso e a anotação de cada palavra), e é
deles que textos.py monta a tela do texto. O card é outra coisa: o trecho, a frase ou a oração
inteira, que pode atravessar o fim do verso. Pedido do Gere (04/11): «Arma virumque cano, Troiæ qui
primus ab oris» não serve de card. O critério:

- o trecho é uma unidade de sentido, com o verbo dela;
- o que fica de fora some sem marca, e nenhuma palavra muda («Arma virumque cano, Troiæ qui primus
  ab oris Italiam venit»; até 19/11/2026 com «…» no lugar do que saiu, que o Gere dispensou);
- até 10 palavras, e até 12 quando é isso que fecha a frase;
- pode repetir palavras de outro trecho, quando o sentido pede (o antecedente do relativo);
- toda palavra do texto entra em algum trecho.

Cada trecho em CORTES é uma lista de intervalos de palavras do texto, numeradas de 0 (as palavras
como textos.PALAVRA as acha, verso após verso). O trecho que fica igual ao de antes guarda o id.
"""

import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
BARALHO = AQUI.parent / 'cards' / 'la'
VERSOS = AQUI / 'versos.json'
sys.path.insert(0, str(AQUI))
import textos  # noqa: E402

CORTES = {
    'vergilio/eneida-parte-1': [
        [(0, 8), (12, 12)],          # Arma virumque cano, Troiae qui primus ab oris Italiam … venit
        [(8, 13)],                   # Italiam, fato profugus, Laviniaque venit litora
        [(14, 22)],                  # multum ille et terris iactatus et alto vi superum
        [(18, 18), (23, 27)],        # iactatus … saevae memorem Iunonis ob iram;
        [(28, 32)],                  # multa quoque et bello passus
        [(33, 38)],                  # dum conderet urbem inferretque deos Latio
        [(39, 47)],                  # genus unde Latinum, Albanique patres, atque altae moenia Romae.
    ],
    'vergilio/eneida-parte-2': [
        [(0, 3)],                    # Musa, mihi causas memora
        [(4, 10), (16, 16), (20, 20)],   # quo numine laeso, quidve dolens, regina deum … virum … impulerit
        [(9, 16), (20, 20)],         # regina deum tot volvere casus insignem pietate virum … impulerit
        [(14, 20)],                  # insignem pietate virum, tot adire labores impulerit.
        [(21, 24)],                  # Tantaene animis caelestibus irae?
    ],
    'horacio/tu-ne-quaesieris': [
        [(0, 11)],                   # Tu ne quaesieris, scire nefas, quem mihi, quem tibi finem di dederint
        [(12, 16)],                  # Leuconoë, nec Babylonios temptaris numeros.
        [(17, 28)],                  # Ut melius, quidquid erit, pati, seu pluris hiemes seu tribuit Iuppiter ultimam
        [(28, 35)],                  # ultimam, quae nunc oppositis debilitat pumicibus mare Tyrrhenum
        [(36, 44)],                  # sapias, vina liques, et spatio brevi spem longam reseces.
        [(45, 49)],                  # Dum loquimur, fugerit invida aetas:
        [(50, 55)],                  # carpe diem, quam minimum credula postero.
    ],
    'horacio/exegi-monumentum-parte-1': [
        [(0, 7)],                    # Exegi monumentum ære perennius regalique situ pyramidum altius
        [(8, 16)],                   # quod non imber edax, non Aquilo impotens possit diruere
        [(8, 8), (15, 23)],          # quod … possit diruere aut innumerabilis annorum series et fuga temporum.
        [(24, 31)],                  # Non omnis moriar, multaque pars mei vitabit Libitinam:
        [(32, 37)],                  # usque ego postera crescam laude recens
        [(38, 44)],                  # dum Capitolium scandet cum tacita virgine pontifex.
    ],
    'horacio/exegi-monumentum-parte-2': [
        [(0, 4)],                    # Dicar, qua violens obstrepit Aufidus
        [(5, 12)],                   # et qua pauper aquae Daunus agrestium regnavit populorum
        [(0, 0), (13, 22)],          # Dicar … ex humili potens princeps Aeolium carmen ad Italos deduxisse modos.
        [(23, 26)],                  # Sume superbiam quaesitam meritis
        [(27, 34)],                  # et mihi Delphica lauro cinge volens, Melpomene, comam.
    ],
    'fedro/lupus-et-agnus': [
        [(0, 8)],                    # Ad rivum eundem lupus et agnus venerant siti compulsi;
        [(9, 14)],                   # superior stabat lupus longeque inferior agnus.
        [(15, 22)],                  # Tunc fauce improba latro incitatus iurgii causam intulit.
        [(23, 29)],                  # Cur, inquit, turbulentam fecisti mihi aquam bibenti?
        [(30, 39)],                  # Laniger contra timens: Qui possum, quaeso, facere, quod quereris, lupe?
        [(40, 46)],                  # A te decurrit ad meos haustus liquor.
    ],
    'vergilio/bucolica-iv-parte-2': [
        [(0, 3), (14, 16)],          # Tu modo nascenti puero … casta fave Lucina:
        [(4, 13)],                   # quo ferrea primum desinet ac toto surget gens aurea mundo
        [(17, 20)],                  # tuus iam regnat Apollo.
        [(21, 29)],                  # Teque adeo decus hoc aevi te consule inibit, Pollio
        [(30, 34)],                  # et incipient magni procedere menses.
        [(35, 42), (45, 47)],        # Te duce, si qua manent sceleris vestigia nostri, … solvent formidine terras.
        [(41, 41), (43, 47)],        # vestigia … inrita perpetua solvent formidine terras.
    ],
    'oracoes/regina-caeli': [
        [(0, 2)],                    # Regina caeli, laetare.
        [(4, 7), (9, 11)],           # Quia quem meruisti portare resurrexit, sicut dixit.
        [(13, 16)],                  # Ora pro nobis Deum.
    ],
    # orações, leva A (16/11/2026)
    'oracoes/memorare': [
        [(0, 9)],  # Memorare o piissima Virgo Maria non esse auditum a saeculo
        [(5, 10), (21, 22)],  # non esse auditum a saeculo quemquam … esse derelictum
        [(10, 14), (21, 22)],  # quemquam ad tua currentem praesidia … esse derelictum
        [(10, 10), (15, 22)],  # quemquam … tua implorantem auxilia tua petentem suffragia esse derelictum
        [(23, 32)],  # Ego tali animatus confidentia ad te Virgo virginum Mater curro
        [(33, 40)],  # ad te venio coram te gemens peccator assisto
        [(41, 46)],  # Noli Mater Verbi verba mea despicere
        [(47, 52)],  # sed audi propitia et exaudi Amen
    ],
    'oracoes/alma-redemptoris-mater': [
        [(0, 7)],  # Alma Redemptoris Mater quae pervia caeli porta manes
        [(0, 2), (8, 12)],  # Alma Redemptoris Mater … et stella maris succurre cadenti
        [(11, 16)],  # succurre cadenti surgere qui curat populo
        [(17, 24)],  # tu quae genuisti natura mirante tuum sanctum Genitorem
        [(25, 34)],  # Virgo prius ac posterius Gabrielis ab ore sumens illud Ave
        [(32, 36)],  # sumens illud Ave peccatorum miserere
    ],
    'oracoes/ave-regina-caelorum': [
        [(0, 2)],  # Ave Regina caelorum
        [(3, 5)],  # ave Domina angelorum
        [(6, 9)],  # salve radix salve porta
        [(10, 15)],  # ex qua mundo lux est orta
        [(16, 21)],  # Gaude Virgo gloriosa super omnes speciosa
        [(22, 25)],  # vale o valde decora
        [(26, 30)],  # et pro nobis Christum exora
    ],
    'oracoes/veni-sancte-spiritus': [
        [(0, 6)],  # Veni Sancte Spiritus reple tuorum corda fidelium
        [(7, 13)],  # et tui amoris in eis ignem accende
        [(14, 18)],  # Emitte Spiritum tuum et creabuntur
        [(19, 22)],  # Et renovabis faciem terrae
        [(23, 23)],  # Oremus
        [(24, 31)],  # Deus qui corda fidelium Sancti Spiritus illustratione docuisti
        [(32, 38)],  # da nobis in eodem Spiritu recta sapere
        [(39, 44)],  # et de eius semper consolatione gaudere
        [(45, 49)],  # Per Christum Dominum nostrum Amen
    ],
    'oracoes/symbolum-apostolorum': [
        [(0, 8)],  # Credo in Deum, Patrem omnipotentem, Creatorem caeli et terrae.
        [(9, 17)],  # Et in Iesum Christum, Filium eius unicum, Dominum nostrum,
        [(18, 27)],  # qui conceptus est de Spiritu Sancto, natus ex Maria Virgine,
        [(28, 35)],  # passus sub Pontio Pilato, crucifixus, mortuus, et sepultus,
        [(36, 43)],  # descendit ad inferos, tertia die resurrexit a mortuis,
        [(44, 52)],  # ascendit ad caelos, sedet ad dexteram Dei Patris omnipotentis,
        [(53, 59)],  # inde venturus est iudicare vivos et mortuos.
        [(60, 63)],  # Credo in Spiritum Sanctum,
        [(64, 68)],  # sanctam Ecclesiam catholicam, Sanctorum communionem,
        [(69, 75)],  # remissionem peccatorum, carnis resurrectionem, vitam aeternam. Amen.
    ],
    'oracoes/credo-parte-1': [
        [(0, 5)],  # Credo in unum Deum, Patrem omnipotentem,
        [(6, 13)],  # factorem caeli et terrae, visibilium omnium et invisibilium.
        [(14, 22)],  # Et in unum Dominum Iesum Christum, Filium Dei unigenitum,
        [(23, 29)],  # et ex Patre natum ante omnia saecula.
        [(30, 35)],  # Deum de Deo, lumen de lumine,
        [(36, 40)],  # Deum verum de Deo vero,
        [(41, 45)],  # genitum, non factum, consubstantialem Patri:
        [(46, 50)],  # per quem omnia facta sunt.
        [(51, 61)],  # Qui propter nos homines et propter nostram salutem descendit de caelis.
        [(62, 70)],  # Et incarnatus est de Spiritu Sancto ex Maria Virgine,
        [(71, 74)],  # et homo factus est.
    ],
    'oracoes/credo-parte-2': [
        [(0, 6)],  # Crucifixus etiam pro nobis sub Pontio Pilato;
        [(7, 10)],  # passus et sepultus est,
        [(11, 16)],  # et resurrexit tertia die, secundum Scripturas,
        [(17, 24)],  # et ascendit in caelum, sedet ad dexteram Patris.
        [(25, 34)],  # Et iterum venturus est cum gloria, iudicare vivos et mortuos,
        [(35, 39)],  # cuius regni non erit finis.
        [(40, 46)],  # Et in Spiritum Sanctum, Dominum et vivificantem:
        [(47, 51)],  # qui ex Patre Filioque procedit.
        [(52, 60)],  # Qui cum Patre et Filio simul adoratur et conglorificatur:
        [(61, 65)],  # qui locutus est per prophetas.
        [(66, 72)],  # Et unam, sanctam, catholicam et apostolicam Ecclesiam.
        [(73, 78)],  # Confiteor unum baptisma in remissionem peccatorum.
        [(79, 82)],  # Et exspecto resurrectionem mortuorum,
        [(83, 87)],  # et vitam venturi saeculi. Amen.
    ],
    'oracoes/adoro-te-devote-parte-1': [
        [(0, 4)],  # Adoro te devote, latens Deitas
        [(4, 10)],  # Deitas, quae sub his figuris vere latitas
        [(11, 16)],  # tibi se cor meum totum subicit
        [(17, 21)],  # quia te contemplans totum deficit
        [(22, 27)],  # Visus, tactus, gustus in te fallitur
        [(28, 32)],  # sed auditu solo tuto creditur
        [(33, 37)],  # credo quidquid dixit Dei Filius
        [(38, 42)],  # nil hoc verbo Veritatis verius
    ],
    'oracoes/adoro-te-devote-parte-2': [
        [(0, 4)],  # In cruce latebat sola Deitas
        [(5, 10)],  # at hic latet simul et humanitas
        [(11, 15)],  # ambo tamen credens atque confitens
        [(16, 20)],  # peto quod petivit latro paenitens
        [(21, 25)],  # Plagas, sicut Thomas, non intueor
        [(26, 30)],  # Deum tamen meum te confiteor
        [(31, 36)],  # fac me tibi semper magis credere
        [(37, 42)],  # in te spem habere, te diligere
    ],
    'oracoes/adoro-te-devote-parte-3': [
        [(0, 3)],  # O memoriale mortis Domini
        [(4, 8)],  # panis vivus, vitam praestans homini
        [(9, 14)],  # praesta meae menti de te vivere
        [(15, 20)],  # et te illi semper dulce sapere
        [(21, 24)],  # Pie pellicane, Iesu Domine
        [(25, 29)],  # me immundum munda tuo sanguine
        [(30, 40)],  # cuius una stilla salvum facere totum mundum quit ab omni scelere
    ],
    'oracoes/adoro-te-devote-parte-4': [
        [(0, 4)],  # Iesu, quem velatum nunc aspicio
        [(5, 10)],  # oro fiat illud quod tam sitio
        [(11, 20)],  # ut te revelata cernens facie, visu sim beatus tuae gloriae
    ],
    'oracoes/pange-lingua-parte-1': [
        [(0, 4)],  # Pange, lingua, gloriosi Corporis mysterium,
        [(5, 10), (14, 16)],  # Sanguinisque pretiosi, quem in mundi pretium … Rex effudit gentium.
        [(11, 16)],  # fructus ventris generosi Rex effudit gentium.
        [(17, 23)],  # Nobis datus, nobis natus ex intacta Virgine,
        [(24, 27), (31, 36)],  # et in mundo conversatus, … sui moras incolatus miro clausit ordine.
        [(28, 36)],  # sparso verbi semine, sui moras incolatus miro clausit ordine.
    ],
    'oracoes/pange-lingua-parte-2': [
        [(0, 6)],  # In supremae nocte cenae recumbens cum fratribus,
        [(7, 12)],  # observata lege plene cibis in legalibus,
        [(13, 19)],  # cibum turbae duodenae se dat suis manibus.
        [(20, 26)],  # Verbum caro, panem verum verbo carnem efficit:
        [(27, 30)],  # fitque sanguis Christi merum,
        [(31, 34)],  # et si sensus deficit,
        [(35, 41)],  # ad firmandum cor sincerum sola fides sufficit.
    ],
    'oracoes/pange-lingua-parte-3': [
        [(0, 4)],  # Tantum ergo Sacramentum veneremur cernui:
        [(5, 10)],  # et antiquum documentum novo cedat ritui:
        [(11, 15)],  # praestet fides supplementum sensuum defectui.
        [(16, 20)],  # Genitori, Genitoque laus et iubilatio,
        [(21, 27)],  # salus, honor, virtus quoque sit et benedictio:
        [(28, 33)],  # procedenti ab utroque compar sit laudatio.
    ],
    'oracoes/psalmus-2-parte-1': [
        [(0, 4)],  # Regnum eius regnum sempiternum est
        [(5, 11)],  # et omnes reges servient ei et oboedient.
        [(12, 19)],  # Quare fremuerunt gentes, et populi meditati sunt inania?
        [(20, 27)],  # Astiterunt reges terrae, et principes convenerunt in unum
        [(25, 27), (28, 33)],  # convenerunt in unum … adversus Dominum et adversus Christum eius:
        [(34, 42)],  # Dirumpamus vincula eorum et proiciamus a nobis iugum ipsorum!
        [(43, 51)],  # Qui habitat in caelis, irridebit eos, Dominus subsannabit eos.
        [(52, 58)],  # Tunc loquetur ad eos in ira sua
        [(59, 64)],  # et in furore suo conturbabit eos:
        [(65, 74)],  # Ego autem constitui regem meum super Sion, montem sanctum meum!
    ],
    'oracoes/psalmus-2-parte-2': [
        [(0, 2)],  # Praedicabo decretum eius.
        [(3, 6)],  # Dominus dixit ad me:
        [(7, 10)],  # Filius meus es tu;
        [(11, 14)],  # ego hodie genui te.
        [(15, 23)],  # Postula a me, et dabo tibi gentes hereditatem tuam
        [(19, 23), (24, 28)],  # dabo tibi gentes hereditatem tuam … et possessionem tuam terminos terrae.
        [(29, 33)],  # Reges eos in virga ferrea
        [(34, 39)],  # et tamquam vas figuli confringes eos
        [(40, 47)],  # Et nunc, reges, intellegite; erudimini, qui iudicatis terram.
        [(48, 56)],  # Servite Domino in timore et exsultate ei cum tremore.
        [(57, 61)],  # Apprehendite disciplinam, ne quando irascatur
        [(62, 71)],  # et pereatis de via, cum exarserit in brevi ira eius.
        [(72, 77)],  # Beati omnes, qui confidunt in eo.
    ],
    'oracoes/psalmus-2-parte-3': [
        [(0, 1)],  # Gloria Patri.
        [(2, 6)],  # Regnum eius regnum sempiternum est
        [(7, 13)],  # et omnes reges servient ei et oboedient.
        [(14, 17)],  # Domine, exaudi orationem meam.
        [(18, 23)],  # Et clamor meus ad te veniat.
        [(24, 24)],  # Oremus.
        [(25, 27), (38, 39)],  # Omnipotens sempiterne Deus … concede propitius
        [(28, 34), (35, 37)],  # qui in dilecto Filio tuo, universorum Rege … omnia instaurare voluisti
        [(40, 46), (47, 50)],  # ut cuncta familia Gentium, peccati vulnere disgregata … eius suavissimo subdantur Imperio:
        [(51, 60)],  # Qui tecum vivit et regnat in unitate Spiritus Sancti Deus:
        [(61, 64)],  # per omnia saecula saeculorum.
    ],
    'oracoes/ne-recorderis-parte-1': [
        [(0, 10)],  # Ne recorderis peccata mea, Domine, dum veneris iudicare saeculum per ignem.
        [(11, 19)],  # Dirige, Domine Deus meus, in conspectu tuo viam meam,
        [(11, 11), (18, 19), (20, 25)],  # Dirige, … viam meam, … dum veneris iudicare saeculum per ignem.
        [(26, 35)],  # Requiem aeternam dona ei, Domine, et lux perpetua luceat ei,
        [(36, 41)],  # dum veneris iudicare saeculum per ignem.
    ],
    'oracoes/ne-recorderis-parte-2': [
        [(0, 1)],  # Pater noster.
        [(2, 7)],  # Et ne nos inducas in tentationem.
        [(8, 12)],  # Sed libera nos a malo.
        [(13, 19)],  # A porta inferi erue, Domine, animam eius.
        [(20, 22)],  # Requiescat in pace.
        [(24, 27)],  # Domine, exaudi orationem meam.
        [(28, 33)],  # Et clamor meus ad te veniat.
        [(34, 35)],  # Dominus vobiscum.
        [(36, 39)],  # Et cum spiritu tuo.
    ],
    'oracoes/ne-recorderis-parte-3': [
        [(0, 0)],  # Oremus.
        [(1, 9)],  # Absolve, quaesumus, Domine, famulum tuum ab omni vinculo delictorum,
        [(10, 17)],  # ut, qui in hoc saeculo Christo meruit conformari,
        [(18, 25)],  # in resurrectionis gloria inter Sanctos tuos resuscitatus respiret.
        [(26, 29)],  # Per Christum Dominum nostrum.
        [(31, 31)],  # Oremus.
        [(32, 37)],  # Fidelium, Deus, omnium conditor et redemptor:
        [(38, 45)],  # animabus famulorum famularumque tuarum remissionem cunctorum tribue peccatorum;
        [(46, 53)],  # ut indulgentiam, quam semper optaverunt, piis supplicationibus consequantur.
        [(54, 57)],  # Per Christum Dominum nostrum.
        [(59, 63)],  # Requiem aeternam dona ei, Domine.
        [(64, 68)],  # Et lux perpetua luceat ei.
        [(69, 71)],  # Requiescat in pace.
        [(73, 79), (83, 83)],  # Anima eius et animae omnium fidelium defunctorum … requiescant
        [(80, 85)],  # per misericordiam Dei requiescant in pace.
    ],
    # poemas curtos de 16/11/2026: Horácio, Odes I,38, e Catulo 5 e 101
    'horacio/persicos-odi': [
        [(0, 3)],                    # Persicos odi, puer, apparatus,
        [(4, 7)],                    # displicent nexae philyra coronae;
        [(8, 14)],                   # mitte sectari, rosa quo locorum sera moretur.
        [(15, 20)],                  # Simplici myrto nihil allabores sedulus curo:
        [(21, 31)],                  # neque te ministrum dedecet myrtus neque me sub arta vite bibentem.
    ],
    'catulo/vivamus-mea-lesbia': [
        [(0, 4)],                    # Vivamus, mea Lesbia, atque amemus,
        [(5, 11)],                   # rumoresque senum severiorum omnes unius aestimemus assis.
        [(12, 16)],                  # Soles occidere et redire possunt:
        [(17, 27)],                  # nobis, cum semel occidit brevis lux, nox est perpetua una dormienda.
        [(28, 33)],                  # Da mi basia mille, deinde centum,
        [(28, 28), (34, 39)],        # Da … dein mille altera, dein secunda centum,
        [(28, 28), (40, 45)],        # Da … deinde usque altera mille, deinde centum,
        [(46, 54)],                  # dein, cum milia multa fecerimus, conturbabimus illa, ne sciamus,
        [(55, 65)],                  # aut ne quis malus invidere possit, cum tantum sciat esse basiorum.
    ],
    'catulo/multas-per-gentes': [
        [(0, 8)],                    # Multas per gentes et multa per aequora vectus advenio
        [(8, 13)],                   # advenio has miseras, frater, ad inferias,
        [(14, 19)],                  # ut te postremo donarem munere mortis
        [(14, 14), (20, 24)],        # ut … et mutam nequiquam adloquerer cinerem,
        [(25, 30)],                  # quandoquidem fortuna mihi tete abstulit ipsum,
        [(31, 36)],                  # heu miser indigne frater adempte mihi.
        [(37, 40), (51, 55)],        # Nunc tamen interea haec … accipe fraterno multum manantia fletu
        [(41, 50)],                  # prisco quae more parentum tradita sunt tristi munere ad inferias,
        [(56, 62)],                  # atque in perpetuum, frater, ave atque vale.
    ],
    # leva 1a de 19/11/2026 (LATIM.md §21): Marcial, Catulo 70, Publílio Siro, inscrições e a Missa
    'marcial/sunt-bona': [
        [(0, 10)],                   # Sunt bona, sunt quaedam mediocria, sunt mala plura quae legis hic:
        [(11, 15)],                  # aliter non fit, Avite, liber.
    ],
    'marcial/quem-recitas': [[(0, 6)], [(7, 13)]],
    'marcial/nuper-erat-medicus': [[(0, 6)], [(7, 12)]],
    'marcial/bella-es': [
        [(0, 6)],                    # Bella es, novimus, et puella, verum est,
        [(7, 12)],                   # et dives, quis enim potest negare?
        [(13, 16), (18, 25)],        # Sed cum te nimium laudas, nec dives neque bella nec puella es.
    ],
    'marcial/versiculos-in-me': [[(0, 5)], [(6, 11)]],
    'marcial/thais-habet': [[(0, 5)], [(6, 8)], [(9, 13)]],
    'marcial/semper-pauper-eris': [[(0, 6)], [(7, 12)]],
    'marcial/miraris-veteres': [
        [(0, 8)],                    # Miraris veteres, Vacerra, solos, nec laudas nisi mortuos poetas.
        [(9, 11)],                   # Ignoscas petimus, Vacerra:
        [(12, 18)],                  # tanti non est, ut placeam tibi, perire.
    ],
    'marcial/difficilis-facilis': [[(0, 5)], [(6, 12)]],
    'catulo/nulli-se-dicit': [
        [(0, 8)],                    # Nulli se dicit mulier mea nubere malle quam mihi,
        [(9, 14)],                   # non si se Iuppiter ipse petat.
        [(15, 21)],                  # Dicit: sed mulier cupido quod dicit amanti,
        [(19, 28)],                  # quod dicit amanti, in vento et rapida scribere oportet aqua.
    ],
    'publilio-siro/sententiae-parte-1': [[(0, 6)], [(7, 12)], [(13, 17)], [(18, 24)], [(25, 31)]],
    'publilio-siro/sententiae-parte-2': [[(0, 6)], [(7, 13)], [(14, 19)], [(20, 25)], [(26, 31)]],
    'publilio-siro/sententiae-parte-3': [[(0, 5)], [(6, 12)], [(13, 21)], [(22, 31)], [(32, 37)]],
    'inscricoes/admiror-paries': [
        [(0, 10)],                   # Admiror, paries, te non cecidisse ruinis, qui tot scriptorum taedia sustineas.
        [(11, 17)],                  # Quisquis amat valeat, pereat qui nescit amare;
        [(18, 23)],                  # bis tanto pereat quisquis amare vetat.
        [(24, 30)],                  # Non fui, fui, non sum, non desidero.
        [(31, 34)],                  # Sit tibi terra levis.
    ],
    'missal-romano/in-nomine-patris': [
        [(0, 7)],                    # In nomine Patris, et Filii, et Spiritus Sancti.
        [(9, 16), (21, 24)],         # Gratia Domini nostri Iesu Christi, et caritas Dei sit cum omnibus vobis
        [(17, 24)],                  # et communicatio Sancti Spiritus sit cum omnibus vobis.
        [(25, 28)], [(29, 30)], [(31, 34)],   # Et cum spiritu tuo. / Dominus vobiscum. (já são cards)
        [(35, 45)],                  # Fratres, agnoscamus peccata nostra, ut apti simus ad sacra mysteria celebranda.
    ],
    'missal-romano/per-dominum-nostrum': [
        [(0, 0)],                    # Oremus. (já é card)
        [(1, 7)],                    # Per Dominum nostrum Iesum Christum, Filium tuum,
        [(8, 17)],                   # qui tecum vivit et regnat in unitate Spiritus Sancti, Deus,
        [(18, 21)],                  # per omnia saecula saeculorum. (já é card)
        [(23, 26)],                  # Per Christum Dominum nostrum. (já é card)
    ],
    'missal-romano/verbum-domini': [
        [(0, 1)], [(2, 3)], [(4, 5)], [(6, 9)], [(10, 14)], [(15, 17)], [(18, 19)], [(20, 22)],
    ],
    'missal-romano/sursum-corda': [[(0, 1)], [(2, 5)], [(6, 7)], [(8, 10)], [(11, 15)], [(16, 19)]],
    'missal-romano/sanctus': [[(0, 5)], [(6, 12)], [(13, 15)], [(16, 21)], [(22, 24)]],
    'missal-romano/agnus-dei': [[(0, 7)], [(8, 15)], [(16, 24)]],
    'missal-romano/ite-missa-est': [[(0, 1)], [(2, 5)], [(6, 15)], [(17, 19)], [(20, 21)]],
    # leva 1b de 19/11/2026 (LATIM.md §21): Fedro, Gaudeamus, O Fortuna, César, Cícero, Sêneca, Ovídio
    'fedro/vulpes-et-uva': [[(0, 10)], [(11, 17)], [(18, 23)], [(24, 35)]],
    'fedro/canis-per-fluvium': [
        [(0, 5)],                    # Amittit merito proprium qui alienum adpetit.
        [(6, 12)],                   # Canis per flumen carnem cum ferret natans,
        [(6, 6), (13, 18)],          # Canis … lympharum in speculo vidit simulacrum suum,
        [(19, 26)],                  # aliamque praedam ab altero ferri putans eripere voluit;
        [(27, 35)],                  # verum decepta aviditas et quem tenebat ore dimisit cibum,
        [(27, 29), (36, 41)],        # verum decepta aviditas … nec quem petebat potuit adeo adtingere.
    ],
    'fedro/vulpes-et-corvus': [
        [(0, 10)],                   # Qui se laudari gaudet verbis subdolis, fere dat poenas turpi paenitentia.
        [(11, 18)],                  # Cum de fenestra corvus raptum caseum comesse vellet,
        [(19, 28)],                  # celsa residens arbore, vulpes hunc vidit, deinde sic coepit loqui:
        [(29, 35)], [(36, 41)], [(42, 48)],
        [(49, 58)],                  # At ille stultus, dum vult vocem ostendere, emisit ore caseum,
        [(58, 65)],                  # caseum, quem celeriter dolosa vulpes avidis rapuit dentibus.
        [(66, 71)], [(72, 77)], [(78, 81)],
    ],
    'fedro/rana-rupta-et-bos': [
        [(0, 5)], [(6, 11)],
        [(12, 19)],                  # et tacta invidia tantae magnitudinis rugosam inflavit pellem:
        [(20, 27)],                  # tum natos suos interrogavit, an bove esset latior.
        [(28, 29)],                  # Illi negarunt.
        [(30, 41)],                  # Rursus intendit cutem maiore nisu et simili quaesivit modo, quis maior esset.
        [(42, 44)], [(45, 54)],
    ],
    'anonimo/gaudeamus-igitur': [[(0, 4)], [(5, 13)], [(14, 21)], [(22, 30)], [(31, 36)], [(37, 44)]],
    'carmina-burana/o-fortuna-parte-1': [[(0, 9)], [(10, 19)], [(20, 24)]],
    'carmina-burana/o-fortuna-parte-2': [[(0, 6)], [(7, 12)], [(13, 18)], [(19, 26)]],
    'carmina-burana/o-fortuna-parte-3': [[(0, 6)], [(7, 13)], [(14, 21)], [(22, 29)]],
    'cesar/gallia-est-omnis': [[(0, 6)], [(7, 12)], [(13, 20)], [(21, 28)]],
    'cicero/quo-usque-tandem': [[(0, 6)], [(7, 14)], [(15, 21)], [(22, 25)], [(26, 30)], [(31, 33)]],
    'seneca/ita-fac-mi-lucili': [
        [(0, 6)],                    # Ita fac, mi Lucili; vindica te tibi,
        [(7, 12), (17, 19)],         # et tempus, quod adhuc aut auferebatur … collige et serva.
        [(8, 9), (13, 19)],          # tempus, quod … aut subripiebatur aut excidebat, collige et serva.
        [(20, 26)], [(27, 34)], [(35, 42)],
    ],
    'ovidio/in-nova-fert-animus': [
        [(0, 7)],                    # In nova fert animus mutatas dicere formas corpora;
        [(8, 9), (15, 16)],          # di, coeptis … adspirate meis
        [(10, 14)],                  # nam vos mutastis et illas
        [(17, 26)],                  # primaque ab origine mundi ad mea perpetuum deducite tempora carmen.
    ],
    # leva 2 de 19/11/2026 (LATIM.md §21): o resto da Missa
    'missal-romano/confiteor': [
        [(0, 5)],                    # Confiteor Deo omnipotenti et vobis, fratres,
        [(6, 13)],                   # quia peccavi nimis cogitatione, verbo, opere et omissione:
        [(14, 20)],                  # mea culpa, mea culpa, mea maxima culpa.
        [(21, 26)],                  # Ideo precor beatam Mariam semper Virginem,
        [(22, 22), (27, 33)],        # precor … omnes Angelos et Sanctos, et vos, fratres,
        [(22, 22), (34, 40)],        # precor … orare pro me ad Dominum Deum nostrum.
        [(41, 44)],                  # Misereatur nostri omnipotens Deus
        [(45, 53)],                  # et, dimissis peccatis nostris, perducat nos ad vitam aeternam.
    ],
    'missal-romano/gloria-parte-1': [
        [(0, 10)],                   # Gloria in excelsis Deo et in terra pax hominibus bonae voluntatis.
        [(11, 18)],                  # Laudamus te, benedicimus te, adoramus te, glorificamus te,
        [(19, 25)],                  # gratias agimus tibi propter magnam gloriam tuam,
        [(26, 32)],                  # Domine Deus, Rex caelestis, Deus Pater omnipotens.
    ],
    'missal-romano/gloria-parte-2': [
        [(0, 4)],                    # Domine Fili unigenite, Iesu Christe,
        [(5, 10)],                   # Domine Deus, Agnus Dei, Filius Patris,
        [(11, 16)],                  # qui tollis peccata mundi, miserere nobis;
        [(17, 23)],                  # qui tollis peccata mundi, suscipe deprecationem nostram.
        [(24, 30)],                  # Qui sedes ad dexteram Patris, miserere nobis.
        [(31, 37)],                  # Quoniam tu solus Sanctus, tu solus Dominus,
        [(38, 49)],                  # tu solus Altissimus, Iesu Christe, cum Sancto Spiritu: in gloria Dei Patris.
    ],
    'missal-romano/benedictus-es-domine-parte-1': [
        [(0, 4)],                    # Benedictus es, Domine, Deus universi,
        [(5, 10)],                   # quia de tua largitate accepimus panem,
        [(11, 19)],                  # quem tibi offerimus, fructum terrae et operis manuum hominum:
        [(20, 25)],                  # ex quo nobis fiet panis vitae.
        [(26, 29)],                  # Benedictus Deus in saecula.
        [(30, 39)],                  # Per huius aquae et vini mysterium eius efficiamur divinitatis consortes,
        [(36, 36), (40, 46)],        # eius … qui humanitatis nostrae fieri dignatus est particeps.
    ],
    'missal-romano/benedictus-es-domine-parte-2': [
        [(0, 4)],                    # (igual à parte 1)
        [(5, 10)],                   # quia de tua largitate accepimus vinum,
        [(11, 19)],                  # quod tibi offerimus, fructum vitis et operis manuum hominum:
        [(20, 25)],                  # ex quo nobis fiet potus spiritalis.
        [(26, 29)],                  # (igual à parte 1)
        [(30, 40)],                  # In spiritu humilitatis et in animo contrito suscipiamur a te, Domine;
        [(41, 49)],                  # et sic fiat sacrificium nostrum in conspectu tuo hodie,
        [(43, 44), (50, 54)],        # fiat sacrificium … ut placeat tibi, Domine Deus.
        [(55, 60)],                  # Lava me, Domine, ab iniquitate mea,
        [(61, 66)],                  # et a peccato meo munda me.
    ],
    'missal-romano/orate-fratres': [
        [(0, 1)],                    # Orate, fratres:
        [(2, 12)],                   # ut meum ac vestrum sacrificium acceptabile fiat apud Deum Patrem omnipotentem.
        [(13, 18)],                  # Suscipiat Dominus sacrificium de manibus tuis
        [(13, 15), (19, 24)],        # Suscipiat Dominus sacrificium … ad laudem et gloriam nominis sui,
        [(13, 15), (25, 32)],        # Suscipiat Dominus sacrificium … ad utilitatem quoque nostram totiusque Ecclesiae suae sanctae.
    ],
    'missal-romano/accipite': [
        [(0, 5)],                    # Accipite et manducate ex hoc omnes:
        [(6, 14)],                   # hoc est enim Corpus meum, quod pro vobis tradetur.
        [(15, 20)],                  # Accipite et bibite ex eo omnes:
        [(21, 30)],                  # hic est enim calix Sanguinis mei novi et aeterni testamenti,
        [(24, 25), (31, 40)],        # calix Sanguinis … qui pro vobis et pro multis effundetur in remissionem peccatorum.
        [(41, 45)],                  # Hoc facite in meam commemorationem.
    ],
    'missal-romano/mysterium-fidei': [
        [(0, 1)],                    # Mysterium fidei.
        [(2, 11)],                   # Mortem tuam annuntiamus, Domine, et tuam resurrectionem confitemur, donec venias.
        [(12, 18)],                  # Quotiescumque manducamus panem hunc et calicem bibimus,
        [(19, 24)],                  # mortem tuam annuntiamus, Domine, donec venias.
        [(25, 28)],                  # Salvator mundi, salva nos,
        [(29, 36)],                  # qui per crucem et resurrectionem tuam liberasti nos.
    ],
    'missal-romano/per-ipsum': [
        [(0, 8)],                    # Per ipsum, et cum ipso, et in ipso, est
        [(8, 12), (17, 20)],         # est tibi Deo Patri omnipotenti, … omnis honor et gloria
        [(13, 24)],                  # in unitate Spiritus Sancti, omnis honor et gloria per omnia saecula saeculorum.
    ],
    'missal-romano/libera-nos': [
        [(0, 8)],                    # Praeceptis salutaribus moniti, et divina institutione formati, audemus dicere:
        [(9, 15)],                   # Libera nos, quaesumus, Domine, ab omnibus malis,
        [(16, 21)],                  # da propitius pacem in diebus nostris,
        [(22, 26), (30, 32)],        # ut, ope misericordiae tuae adiuti, … simus semper liberi
        [(22, 22), (27, 37)],        # ut … et a peccato simus semper liberi et ab omni perturbatione securi:
        [(38, 46)],                  # exspectantes beatam spem et adventum Salvatoris nostri Iesu Christi.
        [(47, 56)],                  # Quia tuum est regnum, et potestas, et gloria in saecula.
    ],
    'missal-romano/pacem-relinquo-vobis': [
        [(0, 6)],                    # Domine Iesu Christe, qui dixisti Apostolis tuis:
        [(7, 13)],                   # Pacem relinquo vobis, pacem meam do vobis:
        [(14, 21)],                  # ne respicias peccata nostra, sed fidem Ecclesiae tuae;
        [(22, 29)],                  # eamque secundum voluntatem tuam pacificare et coadunare digneris.
        [(30, 36)],                  # Qui vivis et regnas in saecula saeculorum.
        [(38, 42)],                  # Pax Domini sit semper vobiscum.
        [(43, 46)],                  # Et cum spiritu tuo. (já é card)
        [(47, 49)],                  # Offerte vobis pacem.
    ],
    'missal-romano/ecce-agnus-dei': [
        [(0, 7)],                    # Ecce Agnus Dei, ecce qui tollit peccata mundi.
        [(8, 14)],                   # Beati qui ad cenam Agni vocati sunt.
        [(15, 23)],                  # Domine, non sum dignus, ut intres sub tectum meum,
        [(24, 31)],                  # sed tantum dic verbo, et sanabitur anima mea.
        [(32, 33)],                  # Corpus Christi.
    ],
    # leva 3 de 19/11/2026 (LATIM.md §21): a Liturgia das Horas
    'liturgia-das-horas/deus-in-adiutorium': [
        [(0, 3)],                    # Domine, labia mea aperies.
        [(4, 9)],                    # Et os meum annuntiabit laudem tuam.
        [(10, 14)],                  # Deus, in adiutorium meum intende.
        [(15, 19)],                  # Domine, ad adiuvandum me festina.
    ],
    'liturgia-das-horas/venite-exsultemus-parte-1': [
        [(0, 6)],                    # Venite, exsultemus Domino; iubilemus Deo salutari nostro.
        [(7, 16)],                   # Praeoccupemus faciem eius in confessione et in psalmis iubilemus ei.
        [(17, 26)],                  # Quoniam Deus magnus Dominus et rex magnus super omnes deos.
    ],
    'liturgia-das-horas/venite-exsultemus-parte-2': [
        [(0, 11)],                   # Quia in manu eius sunt profunda terrae, et altitudines montium ipsius sunt.
        [(12, 19)],                  # Quoniam ipsius est mare, et ipse fecit illud,
        [(20, 24)],                  # et siccam manus eius formaverunt.
        [(25, 33)],                  # Venite, adoremus et procidamus et genua flectamus ante Dominum,
        [(33, 41)],                  # Dominum, qui fecit nos, quia ipse est Deus noster,
        [(42, 50)],                  # et nos populus pascuae eius et oves manus eius.
    ],
    'liturgia-das-horas/venite-exsultemus-parte-3': [
        [(0, 4)],                    # Utinam hodie vocem eius audiatis:
        [(5, 11)],                   # Nolite obdurare corda vestra, sicut in Meriba,
        [(5, 6), (12, 16)],          # Nolite obdurare … secundum diem Massa in deserto,
        [(17, 27)],                  # ubi tentaverunt me patres vestri: probaverunt me, etsi viderunt opera mea.
        [(28, 33)],                  # Quadraginta annis taeduit me generationis illius,
        [(34, 40)],                  # et dixi: Populus errantium corde sunt isti.
        [(41, 46)],                  # Et ipsi non cognoverunt vias meas;
        [(47, 56)],                  # ideo iuravi in ira mea: Non introibunt in requiem meam.
    ],
    'liturgia-das-horas/benedictus-parte-1': [
        [(0, 3)],                    # Benedictus Dominus, Deus Israel,
        [(4, 10)],                   # quia visitavit et fecit redemptionem plebi suae
        [(11, 20)],                  # et erexit cornu salutis nobis in domo David pueri sui,
        [(21, 26), (31, 32)],        # sicut locutus est per os sanctorum … prophetarum eius,
        [(26, 32)],                  # sanctorum, qui a saeculo sunt, prophetarum eius,
        [(12, 13), (33, 36)],        # erexit cornu … salutem ex inimicis nostris
        [(33, 33), (37, 43)],        # salutem … et de manu omnium, qui oderunt nos;
    ],
    'liturgia-das-horas/benedictus-parte-2': [
        [(0, 5)],                    # ad faciendam misericordiam cum patribus nostris
        [(6, 10)],                   # et memorari testamenti sui sancti,
        [(11, 17)],                  # iusiurandum, quod iuravit ad Abraham patrem nostrum,
        [(11, 13), (18, 20)],        # iusiurandum, quod iuravit … daturum se nobis,
        [(21, 29)],                  # ut sine timore, de manu inimicorum liberati, serviamus illi
        [(28, 38)],                  # serviamus illi in sanctitate et iustitia coram ipso omnibus diebus nostris.
    ],
    'liturgia-das-horas/benedictus-parte-3': [
        [(0, 5)],                    # Et tu, puer, propheta Altissimi vocaberis:
        [(6, 13)],                   # praeibis enim ante faciem Domini parare vias eius,
        [(14, 23)],                  # ad dandam scientiam salutis plebi eius in remissionem peccatorum eorum,
        [(24, 28)],                  # per viscera misericordiae Dei nostri,
        [(25, 25), (29, 35)],        # viscera … in quibus visitabit nos oriens ex alto,
        [(36, 45)],                  # illuminare his, qui in tenebris et in umbra mortis sedent,
        [(46, 52)],                  # ad dirigendos pedes nostros in viam pacis.
    ],
    'liturgia-das-horas/magnificat-parte-1': [
        [(0, 3)],                    # Magnificat anima mea Dominum,
        [(4, 11)],                   # et exsultavit spiritus meus in Deo salvatore meo,
        [(12, 16)],                  # quia respexit humilitatem ancillae suae.
        [(17, 25)],                  # Ecce enim ex hoc beatam me dicent omnes generationes,
        [(26, 32)],                  # quia fecit mihi magna, qui potens est,
        [(33, 36)],                  # et sanctum nomen eius,
        [(37, 45)],                  # et misericordia eius in progenies et progenies timentibus eum.
    ],
    'liturgia-das-horas/magnificat-parte-2': [
        [(0, 9)],                    # Fecit potentiam in brachio suo, dispersit superbos mente cordis sui;
        [(10, 16)],                  # deposuit potentes de sede et exaltavit humiles.
        [(17, 23)],                  # Esurientes implevit bonis et divites dimisit inanes.
        [(24, 29)],                  # Suscepit Israel puerum suum, recordatus misericordiae,
        [(30, 41)],                  # sicut locutus est ad patres nostros, Abraham et semini eius in saecula.
    ],
    'liturgia-das-horas/nunc-dimittis': [
        [(0, 6)],                    # Salva nos, Domine, vigilantes, custodi nos dormientes,
        [(7, 14)],                   # ut vigilemus cum Christo et requiescamus in pace.
        [(15, 24)],                  # Nunc dimittis servum tuum, Domine, secundum verbum tuum in pace,
        [(25, 30)],                  # quia viderunt oculi mei salutare tuum,
        [(29, 36)],                  # salutare tuum, quod parasti ante faciem omnium populorum,
        [(37, 45)],                  # lumen ad revelationem gentium et gloriam plebis tuae Israel.
        [(46, 52)],                  # In manus tuas, Domine, commendo spiritum meum.
        [(53, 57)],                  # Redemisti nos, Domine, Deus veritatis.
        [(58, 66)],                  # Noctem quietam et finem perfectum concedat nobis Dominus omnipotens.
    ],
    'liturgia-das-horas/salve-regina': [
        [(0, 9)],                    # Salve, Regina, mater misericordiae, vita, dulcedo et spes nostra, salve.
        [(10, 15)],                  # Ad te clamamus, exsules filii Evae.
        [(16, 25)],                  # Ad te suspiramus gementes et flentes in hac lacrimarum valle.
        [(26, 36)],                  # Eia ergo, advocata nostra, illos tuos misericordes oculos ad nos converte.
        [(37, 47)],                  # Et Iesum, benedictum fructum ventris tui, nobis post hoc exsilium ostende.
        [(48, 55)],                  # O clemens, o pia, o dulcis Virgo Maria.
    ],
    'liturgia-das-horas/te-deum-parte-1': [
        [(0, 5)],                    # Te Deum laudamus: te Dominum confitemur.
        [(6, 11)],                   # Te aeternum Patrem omnis terra veneratur.
        [(12, 14), (24, 26)],        # Tibi omnes Angeli … incessabili voce proclamant
        [(15, 19), (26, 26)],        # tibi caeli et universae potestates … proclamant
        [(20, 26)],                  # tibi Cherubim et Seraphim incessabili voce proclamant:
        [(27, 32)],                  # Sanctus, Sanctus, Sanctus Dominus Deus Sabaoth. (já é card)
        [(33, 40)],                  # Pleni sunt caeli et terra maiestatis gloriae tuae.
    ],
    'liturgia-das-horas/te-deum-parte-2': [
        [(0, 3), (11, 11)],          # Te gloriosus Apostolorum chorus … laudat
        [(4, 7), (11, 11)],          # te Prophetarum laudabilis numerus … laudat
        [(8, 12)],                   # te Martyrum candidatus laudat exercitus.
        [(13, 19)],                  # Te per orbem terrarum sancta confitetur Ecclesia,
        [(13, 13), (18, 22)],        # Te … confitetur Ecclesia, Patrem immensae maiestatis;
        [(18, 19), (23, 28)],        # confitetur Ecclesia … venerandum tuum verum et unicum Filium;
        [(18, 19), (29, 32)],        # confitetur Ecclesia … Sanctum quoque Paraclitum Spiritum.
    ],
    'liturgia-das-horas/te-deum-parte-3': [
        [(0, 3)],                    # Tu rex gloriae, Christe.
        [(4, 8)],                    # Tu Patris sempiternus es Filius.
        [(9, 17)],                   # Tu, ad liberandum suscepturus hominem, non horruisti Virginis uterum.
        [(18, 25)],                  # Tu, devicto mortis aculeo, aperuisti credentibus regna caelorum.
        [(26, 33)],                  # Tu ad dexteram Dei sedes, in gloria Patris.
        [(34, 37)],                  # Iudex crederis esse venturus.
        [(38, 47)],                  # Te ergo quaesumus, tuis famulis subveni, quos pretioso sanguine redemisti.
        [(48, 55)],                  # Aeterna fac cum sanctis tuis in gloria numerari.
    ],
    'liturgia-das-horas/te-deum-parte-4': [
        [(0, 8)],                    # Salvum fac populum tuum, Domine, et benedic hereditati tuae.
        [(9, 17)],                   # Et rege eos, et extolle illos usque in aeternum.
        [(18, 22)],                  # Per singulos dies benedicimus te;
        [(23, 32)],                  # et laudamus nomen tuum in saeculum, et in saeculum saeculi.
        [(33, 40)],                  # Dignare, Domine, die isto sine peccato nos custodire.
        [(41, 45)],                  # Miserere nostri, Domine, miserere nostri.
        [(46, 55)],                  # Fiat misericordia tua, Domine, super nos, quemadmodum speravimus in te.
        [(56, 63)],                  # In te, Domine, speravi: non confundar in aeternum.
    ],
    # orações, leva B (17/11/2026)
    'oracoes/litaniae-lauretanae-parte-1': [
        [(6, 11)],  # Christe, audi nos. Christe, exaudi nos.
        [(12, 17)],  # Pater de caelis, Deus, miserere nobis.
        [(18, 23)],  # Fili, Redemptor mundi, Deus, miserere nobis.
        [(24, 28)],  # Spiritus Sancte, Deus, miserere nobis.
        [(29, 34)],  # Sancta Trinitas, unus Deus, miserere nobis.
        [(35, 39)],  # Sancta Maria, ora pro nobis.
        [(40, 45)],  # Sancta Dei Genetrix, sancta Virgo virginum
        [(46, 51)],  # Mater Christi, mater Ecclesiae, mater misericordiae
        [(52, 56)],  # Mater divinae gratiae, mater spei
        [(57, 62)],  # Mater purissima, mater castissima, mater inviolata
        [(63, 68)],  # Mater intemerata, mater amabilis, mater admirabilis
        [(69, 75)],  # Mater boni consilii, mater Creatoris, mater Salvatoris
    ],
    'oracoes/litaniae-lauretanae-parte-2': [
        [(0, 7)],  # Virgo prudentissima, virgo veneranda, virgo praedicanda, virgo potens
        [(8, 15)],  # Virgo clemens, virgo fidelis, speculum iustitiae, sedes sapientiae
        [(16, 22)],  # Causa nostrae laetitiae, vas spirituale, vas honorabile
        [(23, 29)],  # Vas insigne devotionis, rosa mystica, turris Davidica
        [(30, 37)],  # Turris eburnea, domus aurea, foederis arca, ianua caeli
        [(38, 43)],  # Stella matutina, salus infirmorum, refugium peccatorum
        [(44, 49)],  # Solacium migrantium, consolatrix afflictorum, auxilium Christianorum
    ],
    'oracoes/litaniae-lauretanae-parte-3': [
        [(0, 7)],  # Regina Angelorum, regina Patriarcharum, regina Prophetarum, regina Apostolorum
        [(8, 13)],  # Regina Martyrum, regina Confessorum, regina Virginum
        [(14, 21)],  # Regina Sanctorum omnium, regina sine labe originali concepta
        [(22, 28)],  # Regina in caelum assumpta, regina sacratissimi Rosarii
        [(29, 32)],  # Regina familiae, regina pacis.
        [(33, 41)],  # Agnus Dei, qui tollis peccata mundi, parce nobis, Domine.
        [(42, 50)],  # Agnus Dei, qui tollis peccata mundi, exaudi nos, Domine.
        [(51, 58)],  # Agnus Dei, qui tollis peccata mundi, miserere nobis.
        [(59, 64)],  # Ora pro nobis, sancta Dei Genetrix.
        [(65, 69)],  # Ut digni efficiamur promissionibus Christi.
        [(70, 77), (83, 83)],  # Oremus. Concede nos famulos tuos, quaesumus, Domine Deus … gaudere:
        [(78, 83)],  # perpetua mentis et corporis sanitate gaudere:
        [(84, 90), (91, 94)],  # et gloriosa beatae Mariae semper Virginis intercessione … a praesenti liberari tristitia
        [(95, 98)],  # et aeterna perfrui laetitia.
        [(99, 103)],  # Per Christum Dominum nostrum. Amen.
    ],
    'oracoes/trium-puerorum-parte-1': [
        [(0, 11)],  # Trium puerorum cantemus hymnum, quem cantabant sancti in camino ignis, benedicentes Dominum.
        [(12, 22)],  # Benedicite, omnia opera Domini, Domino: laudate et superexaltate eum in saecula.
        [(23, 29)],  # Benedicite, Angeli Domini, Domino: benedicite, caeli, Domino.
        [(30, 37)],  # Benedicite, aquae omnes, quae super caelos sunt, Domino:
        [(38, 42)],  # benedicite, omnes virtutes Domini, Domino.
        [(43, 51)],  # Benedicite, sol et luna, Domino: benedicite, stellae caeli, Domino.
        [(52, 62)],  # Benedicite, omnis imber et ros, Domino: benedicite, omnes spiritus Dei, Domino.
        [(63, 72)],  # Benedicite, ignis et aestus, Domino: benedicite, frigus et aestus, Domino.
        [(73, 82)],  # Benedicite, rores et pruina, Domino: benedicite, gelu et frigus, Domino.
        [(83, 92)],  # Benedicite, glacies et nives, Domino: benedicite, noctes et dies, Domino.
        [(93, 102)],  # Benedicite, lux et tenebrae, Domino: benedicite, fulgura et nubes, Domino.
    ],
    'oracoes/trium-puerorum-parte-2': [
        [(0, 8)],  # Benedicat terra Dominum: laudet et superexaltet eum in saecula.
        [(9, 19)],  # Benedicite, montes et colles, Domino: benedicite, universa germinantia in terra, Domino.
        [(20, 27)],  # Benedicite, fontes, Domino: benedicite, maria et flumina, Domino.
        [(28, 36)],  # Benedicite, cete, et omnia, quae moventur in aquis, Domino:
        [(37, 41)],  # benedicite, omnes volucres caeli, Domino.
        [(42, 51)],  # Benedicite, omnes bestiae et pecora, Domino: benedicite, filii hominum, Domino.
        [(52, 60)],  # Benedicat Israel Dominum: laudet et superexaltet eum in saecula.
        [(61, 68)],  # Benedicite, sacerdotes Domini, Domino: benedicite, servi Domini, Domino.
        [(69, 80)],  # Benedicite, spiritus et animae iustorum, Domino: benedicite, sancti et humiles corde, Domino.
    ],
    'oracoes/trium-puerorum-parte-3': [
        [(0, 4)],  # Benedicite, Anania, Azaria, Misael, Domino:
        [(5, 10)],  # laudate et superexaltate eum in saecula.
        [(11, 17)],  # Benedicamus Patrem et Filium cum Sancto Spiritu:
        [(18, 23)],  # laudemus et superexaltemus eum in saecula.
        [(24, 29)],  # Benedictus es, Domine, in firmamento caeli:
        [(30, 37)],  # et laudabilis, et gloriosus, et superexaltatus in saecula.
        [(38, 42)],  # Laudate Dominum in sanctis eius:
        [(43, 48)],  # laudate eum in firmamento virtutis eius.
        [(49, 53)],  # Laudate eum in virtutibus eius:
        [(54, 59)],  # laudate eum secundum multitudinem magnitudinis eius.
        [(60, 64)],  # Laudate eum in sono tubae:
        [(65, 70)],  # laudate eum in psalterio et cithara.
        [(71, 76)],  # Laudate eum in tympano et choro:
        [(77, 82)],  # laudate eum in chordis et organo.
        [(83, 87)],  # Laudate eum in cymbalis benesonantibus:
        [(88, 92)],  # laudate eum in cymbalis iubilationis:
        [(93, 96)],  # omnis spiritus laudet Dominum.
    ],
    'oracoes/trium-puerorum-parte-4': [
        [(0, 1)],  # Gloria Patri.
        [(2, 5)],  # Trium puerorum cantemus hymnum,
        [(5, 13)],  # hymnum, quem cantabant sancti in camino ignis, benedicentes Dominum.
        [(14, 19)],  # Confiteantur tibi, Domine, omnia opera tua.
        [(20, 24)],  # Et sancti tui benedicant tibi.
        [(25, 28)],  # Exsultabunt sancti in gloria.
        [(29, 32)],  # Laetabuntur in cubilibus suis.
        [(33, 37)],  # Non nobis, Domine, non nobis.
        [(38, 42)],  # Sed nomini tuo da gloriam.
        [(43, 46)],  # Domine, exaudi orationem meam.
        [(47, 52)],  # Et clamor meus ad te veniat.
    ],
    'oracoes/trium-puerorum-parte-5': [
        [(0, 0)],  # Oremus.
        [(1, 7)],  # Deus, qui tribus pueris mitigasti flammas ignium:
        [(8, 17)],  # concede propitius; ut nos famulos tuos non exurat flamma vitiorum.
        [(18, 26)],  # Actiones nostras, quaesumus, Domine, aspirando praeveni et adiuvando prosequere:
        [(27, 36)],  # ut cuncta nostra oratio et operatio a te semper incipiat,
        [(37, 41)],  # et per te coepta finiatur.
        [(42, 49)],  # Da nobis, quaesumus, Domine, vitiorum nostrorum flammas exstinguere:
        [(50, 57)],  # qui beato Laurentio tribuisti tormentorum suorum incendia superare.
        [(58, 61)],  # Per Christum Dominum nostrum.
    ],
    'oracoes/quicumque-parte-1': [
        [(0, 3)],  # Quicumque vult salvus esse,
        [(4, 11)],  # ante omnia opus est, ut teneat catholicam fidem:
        [(12, 22)],  # Quam nisi quisque integram inviolatamque servaverit, absque dubio in aeternum peribit.
        [(23, 27)],  # Fides autem catholica haec est:
        [(28, 37)],  # ut unum Deum in Trinitate, et Trinitatem in unitate veneremur.
        [(38, 43)],  # Neque confundentes personas, neque substantiam separantes.
        [(44, 53)],  # Alia est enim persona Patris, alia Filii, alia Spiritus Sancti.
        [(54, 63)],  # Sed Patris, et Filii, et Spiritus Sancti una est divinitas,
        [(61, 67)],  # una est divinitas, aequalis gloria, coaeterna maiestas.
    ],
    'oracoes/quicumque-parte-2': [
        [(0, 6)],  # Qualis Pater, talis Filius, talis Spiritus Sanctus.
        [(7, 13)],  # Increatus Pater, increatus Filius, increatus Spiritus Sanctus.
        [(14, 20)],  # Immensus Pater, immensus Filius, immensus Spiritus Sanctus.
        [(21, 27)],  # Aeternus Pater, aeternus Filius, aeternus Spiritus Sanctus.
        [(28, 35)],  # Et tamen non tres aeterni, sed unus aeternus.
        [(36, 42)],  # Sicut non tres increati, nec tres immensi,
        [(43, 48)],  # sed unus increatus, et unus immensus.
        [(49, 56)],  # Similiter omnipotens Pater, omnipotens Filius, omnipotens Spiritus Sanctus.
        [(57, 64)],  # Et tamen non tres omnipotentes, sed unus omnipotens.
        [(65, 72)],  # Ita Deus Pater, Deus Filius, Deus Spiritus Sanctus.
        [(73, 81)],  # Et tamen non tres dii, sed unus est Deus.
        [(82, 89)],  # Ita Dominus Pater, Dominus Filius, Dominus Spiritus Sanctus.
        [(90, 98)],  # Et tamen non tres domini, sed unus est Dominus.
    ],
    'oracoes/quicumque-parte-3': [
        [(0, 0), (3, 8), (11, 11)],  # Quia, … unamquamque personam Deum ac Dominum confiteri … compellimur,
        [(0, 2), (9, 11)],  # Quia, sicut singillatim … christiana veritate compellimur,
        [(12, 20)],  # ita tres deos aut dominos dicere catholica religione prohibemur.
        [(21, 25)],  # Pater a nullo est factus:
        [(26, 29)],  # nec creatus, nec genitus.
        [(30, 34)],  # Filius a Patre solo est:
        [(35, 40)],  # non factus, nec creatus, sed genitus.
        [(41, 46)],  # Spiritus Sanctus a Patre et Filio:
        [(47, 54)],  # non factus, nec creatus, nec genitus, sed procedens.
        [(55, 60)],  # Unus ergo Pater, non tres Patres;
        [(61, 65)],  # unus Filius, non tres Filii;
        [(66, 72)],  # unus Spiritus Sanctus, non tres Spiritus Sancti.
        [(73, 80)],  # Et in hac Trinitate nihil prius aut posterius,
        [(81, 84)],  # nihil maius aut minus,
        [(85, 93)],  # sed totae tres personae coaeternae sibi sunt et coaequales.
        [(94, 102)],  # Ita ut per omnia, sicut iam supra dictum est,
        [(94, 95), (103, 112)],  # Ita ut … et unitas in Trinitate, et Trinitas in unitate veneranda sit.
    ],
    'oracoes/quicumque-parte-4': [
        [(0, 8)],  # Qui vult ergo salvus esse, ita de Trinitate sentiat.
        [(9, 14)],  # Sed necessarium est ad aeternam salutem
        [(9, 11), (15, 23)],  # Sed necessarium est … ut incarnationem quoque Domini nostri Iesu Christi fideliter credat.
        [(24, 31)],  # Est ergo fides recta ut credamus et confiteamur
        [(32, 42)],  # quia Dominus noster Iesus Christus, Dei Filius, Deus et homo est.
        [(43, 49)],  # Deus ex substantia Patris ante saecula genitus
        [(50, 57)],  # et homo ex substantia matris in saeculo natus.
        [(58, 61)],  # Perfectus Deus, perfectus homo:
        [(60, 68)],  # perfectus homo: ex anima rationali et humana carne subsistens.
        [(69, 76)],  # Aequalis Patri secundum divinitatem, minor Patre secundum humanitatem.
    ],
    'oracoes/quicumque-parte-5': [
        [(0, 5)],  # Qui, licet Deus sit et homo
        [(0, 0), (6, 12)],  # Qui … non duo tamen, sed unus est Christus.
        [(13, 24)],  # Unus autem non conversione divinitatis in carnem, sed assumptione humanitatis in Deum.
        [(25, 32)],  # Unus omnino, non confusione substantiae, sed unitate personae.
        [(33, 41)],  # Nam sicut anima rationalis et caro unus est homo:
        [(42, 48)],  # ita Deus et homo unus est Christus.
        [(49, 57)],  # Qui passus est pro salute nostra; descendit ad inferos;
        [(49, 49), (58, 62)],  # Qui … tertia die resurrexit a mortuis.
    ],
    'oracoes/quicumque-parte-6': [
        [(0, 8)],  # Ascendit ad caelos, sedet ad dexteram Dei Patris omnipotentis:
        [(9, 15)],  # inde venturus est iudicare vivos et mortuos.
        [(16, 25)],  # Ad cuius adventum omnes homines resurgere habent cum corporibus suis
        [(26, 32)],  # et reddituri sunt de factis propriis rationem.
        [(33, 40)],  # Et qui bona egerunt, ibunt in vitam aeternam;
        [(41, 46)],  # qui vero mala, in ignem aeternum.
        [(47, 50)],  # Haec est fides catholica
        [(51, 60)],  # quam nisi quisque fideliter firmiterque crediderit, salvus esse non poterit.
    ],
}

FIM = '.;:?!'

MAIUSCULA = {'la-p001', 'la-p012', 'la-p072', 'la-p043', 'la-p054'}

# o arquivo dos trechos dos textos novos (os que ainda não têm card de trecho)
ARQUIVO_NOVO = '35-trechos-7.json'


def ler_baralho():
    arquivos, cards = {}, {}
    for f in sorted(BARALHO.glob('*.json')):
        lista = json.loads(f.read_text(encoding='utf-8'))
        arquivos[f] = lista
        for c in lista:
            cards[c['id']] = c
    return arquivos, cards


def palavras_do_verso(verso):
    """[(início, fim, texto, [entradas da anotação])] de cada palavra do verso, como linha_de as
    alinha (a enclítica e o cum colado consomem duas entradas)."""
    fila = list(verso['palavras'])
    saida = []
    ms = list(textos.PALAVRA.finditer(verso['la']))
    for k, m in enumerate(ms):
        w = m.group(0)
        partes = [fila.pop(0)]
        while partes[0]['w'].lower() != w.lower() and ''.join(x['w'].lstrip('-') for x in partes).lower() != w.lower():
            partes.append(fila.pop(0))
        # a mesma palavra repetida no texto («Sanctus, Sanctus», «fui, fui») é uma entrada cada
        prox = ms[k + 1].group(0).lower() if k + 1 < len(ms) else None
        if partes[0]['w'].lower() == w.lower() and fila and fila[0]['w'].lower() == w.lower() and prox != w.lower():
            partes.append(fila.pop(0))
        saida.append((m.start(), m.end(), w, partes))
    if fila:
        raise SystemExit(f"anotação a mais em «{verso['la']}»")
    return saida


def extrair():
    _, cards = ler_baralho()
    por_texto = {}
    for c in cards.values():
        if c.get('tipo') == 'frase' and c.get('texto'):
            por_texto.setdefault(c['texto'], []).append(c)
    versos = {}
    for tid in sorted(por_texto):
        ts = sorted(por_texto[tid], key=lambda c: c['linha'])
        versos[tid] = [{'la': c['la'], 'palavras': c['palavras']} for c in ts]
    gravar_versos(versos)
    print(f'{VERSOS.name}: {len(versos)} textos, {sum(map(len, versos.values()))} versos')


def gravar_versos(versos):
    linhas = ['{']
    itens = list(versos.items())
    for k, (tid, vs) in enumerate(itens):
        linhas.append(f' {json.dumps(tid)}: [')
        for j, v in enumerate(vs):
            linhas.append('  ' + json.dumps(v, ensure_ascii=False) + (',' if j < len(vs) - 1 else ''))
        linhas.append(' ]' + (',' if k < len(itens) - 1 else ''))
    linhas.append('}')
    VERSOS.write_text('\n'.join(linhas) + '\n', encoding='utf-8', newline='\n')


def ler_versos():
    return json.loads(VERSOS.read_text(encoding='utf-8'))


def montar_trecho(tid, versos, intervalos, cards):
    """O «la», as «palavras» e os versos de um trecho: as palavras dos intervalos, com a pontuação
    de dentro de cada intervalo, um espaço entre um intervalo e outro e a pontuação forte do fim. A
    maiúscula do começo do verso cai no meio da frase (Longeque → longeque), menos no nome
    próprio e depois de pontuação forte (a fala do cordeiro: «timens: Qui possum»)."""
    lista = []      # (n do verso, início, fim, texto, entradas)
    for nv, v in enumerate(versos, 1):
        for ini, fim, w, partes in palavras_do_verso(v):
            lista.append((nv, ini, fim, w, partes))
    pedacos, pal, usados = [], [], []
    for k, (a, b) in enumerate(intervalos):
        trecho = ''
        for n in range(a, b + 1):
            nv, ini, fim, w, partes = lista[n]
            usados.append(n)
            entre = ''
            if n > a:
                pv, _, pfim, _, _ = lista[n - 1]
                entre = versos[pv - 1]['la'][pfim:] + ' ' if pv != nv else versos[nv - 1]['la'][pfim:ini]
                entre = re.sub(r'\s+', ' ', entre)
            antes = (trecho + entre).rstrip()
            comeco_de_verso = ini == 0 or not versos[nv - 1]['la'][:ini].strip()
            # Deus, Dominus e as Pessoas divinas (Pater, Filius, Spiritus) guardam a maiúscula no começo
            # do verso (Missa: «Benedicat vos omnipotens Deus, Pater, et Filius…»)
            proprio = any(not x.get('c') or x.get('c') in MAIUSCULA or (cards.get(x['c'], {}).get('la') or 'a')[0].isupper() for x in partes[:1])
            if comeco_de_verso and n != intervalos[0][0] and not proprio and w[0].isupper() and (not antes or antes[-1] not in FIM):
                w = w[0].lower() + w[1:]
                partes = [dict(partes[0], w=partes[0]['w'][0].lower() + partes[0]['w'][1:])] + partes[1:]
            trecho += entre + w
            pal.extend(json.loads(json.dumps(partes, ensure_ascii=False)))
        pedacos.append(trecho)
    la = pedacos[0]
    for k in range(1, len(pedacos)):
        la += ' ' + pedacos[k]
    # a pontuação forte depois da última palavra fica
    nv, ini, fim, w, _ = lista[intervalos[-1][1]]
    resto = versos[nv - 1]['la'][fim:].strip()
    if resto and resto[0] in FIM:
        la += resto[0]
    primeiro = lista[intervalos[0][0]][0]
    ultimo = max(lista[n][0] for n in usados)
    return {'la': la, 'palavras': pal, 'versos': [primeiro, ultimo], 'usados': usados}


def fonte_de(antigos, a, b):
    fa, fb = antigos[a - 1]['fonte'], antigos[b - 1]['fonte']
    if fa == fb:
        return fa
    m = re.search(r'(\d+)$', fb)
    return f'{fa}–{m.group(1)}'


def so_letras(la):
    return re.sub(r'[^a-z ]', '', la.lower().replace('…', ' ')).split().__str__()


def trechos_novos(tid, versos, cards, antigos):
    proximo = max(int(i[4:]) for i in cards if i.startswith('la-t')) + 1
    por_la = {c['la']: c for c in antigos}
    total = sum(len(palavras_do_verso(v)) for v in versos)
    usados, repetidas = set(), set()
    saida = []
    # a frase que já é card (noutro texto, ou antes neste) não se repete: o build recusa card repetido
    # («Oremus.», a antífona repetida, «Et ne nos inducas in tentationem» do Pai-Nosso no responso)
    outros = {so_letras(c['la']) for c in cards.values()
              if c.get('tipo') == 'frase' and c.get('texto') and c.get('texto') != tid}
    neste = set()
    for intervalos in CORTES[tid]:
        t = montar_trecho(tid, versos, intervalos, cards)
        u = t.pop('usados')
        chave = so_letras(t['la'])
        if chave in neste or (chave in outros and t['la'] not in por_la):
            repetidas.update(u)
            continue
        neste.add(chave)
        usados.update(u)
        velho = por_la.get(t['la'])
        t['id'] = velho['id'] if velho else None
        if velho:
            t['fonte'] = velho['fonte']
        else:
            t['fonte'] = fonte_de(antigos, *t['versos']) if antigos else textos.TEXTOS[tid]['fonte']
        saida.append(t)
    faltam = set(range(total)) - usados - repetidas
    if faltam:
        # a palavra que só se repete (o alleluia do fim de cada linha) pode ficar de fora
        formas = {w.lower() for v in versos for _, _, w, _ in palavras_do_verso(v)}
        nos_trechos = {re.sub(r'[^\w]', '', x).lower() for t in saida for x in t['la'].split()}
        lista = [w for v in versos for _, _, w, _ in palavras_do_verso(v)]
        faltam = {n for n in faltam if lista[n].lower() not in nos_trechos}
        # e a palavra sem card nem forma (amen, Kyrie, eleison), que não se estuda
        sem = [all(not x.get('c') for x in partes) for v in versos for _, _, _, partes in palavras_do_verso(v)]
        faltam = {n for n in faltam if not sem[n]}
        if faltam:
            raise SystemExit(f'{tid}: palavras fora de todo trecho: {[lista[n] for n in sorted(faltam)]}')
    for t in saida:
        if not t['id']:
            t['id'] = f'la-t{proximo:03d}'
            proximo += 1
            cards[t['id']] = dict(t, tipo='frase', texto=tid)
        n = len([p for p in t['palavras'] if not p['w'].startswith('-')])
        if n > 12:
            raise SystemExit(f"{tid}: trecho com {n} palavras: {t['la']}")
    return saida


def antigos_de(cards, tid):
    return sorted([c for c in cards.values() if c.get('tipo') == 'frase' and c.get('texto') == tid],
                  key=lambda c: c['linha'])


def entrada(destino, so=()):
    _, cards = ler_baralho()
    versos = ler_versos()
    saida = []
    for tid in CORTES:
        if so and tid not in so:
            continue
        antigos = antigos_de(cards, tid)
        novos = trechos_novos(tid, versos[tid], cards, antigos)
        texto = {'texto': tid, 'versos': [{'n': i, 'la': v['la'], 'pt': antigos[i - 1]['pt'] if i <= len(antigos) else ''}
                                          for i, v in enumerate(versos[tid], 1)], 'trechos': []}
        for t in novos:
            a, b = t['versos']
            texto['trechos'].append({
                'id': t['id'], 'la': t['la'], 'versos': t['versos'], 'fonte': t['fonte'],
                'igual_ao_antigo': any(c['id'] == t['id'] for c in antigos),
                'palavras': [dict(p, i=i) for i, p in enumerate(t['palavras'])],
                'antigos': [{k: c[k] for k in ('id', 'la', 'pt', 'gabarito', 'aceitas', 'distratores', 'nota')}
                            for c in antigos[a - 1:b]]})
        saida.append(texto)
        print(tid, len(antigos), '→', len(novos), 'trechos')
        for t in novos:
            print('   ', t['id'], t['versos'], t['la'])
    Path(destino).write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def nota_das_palavras(palavras):
    linhas = []
    for p in palavras:
        if p['w'].startswith('-'):
            continue
        f, fn = p.get('f', ''), p.get('fn', '')
        if f or fn:
            linhas.append(f"{p['w']}: " + ', '.join(x for x in (f, fn) if x) + '.')
    return linhas


def conceitos_de(palavras, antigos):
    """Os conceitos dos versos de antes, na ordem, sem o do neutro quando o trecho não tem palavra
    neutra no plural ou no acusativo (LATIM.md §15)."""
    vistos = []
    for c in antigos:
        for g in c.get('conceitos', []):
            if g not in vistos:
                vistos.append(g)
    neutro = any('neutro' in p.get('f', '') and ('plural' in p.get('f', '') or 'acusativo' in p.get('f', ''))
                 for p in palavras)
    return [g for g in vistos if g != 'la-g032' or neutro]


def conceitos_da_leva(x, palavras, cards):
    """Texto novo, sem versos de antes: os conceitos que a leva dá pelo nome («conceitos»: ["acusativo",
    "verbo depoente"]), na ordem, sem o do neutro quando o trecho não pede (como conceitos_de)."""
    por_nome = {c.get('pt'): c['id'] for c in cards.values() if c['id'].startswith('la-g')}
    ids = []
    for nome in x.get('conceitos') or []:
        if nome not in por_nome:
            raise SystemExit(f"{x['id']}: conceito desconhecido «{nome}»")
        if por_nome[nome] not in ids:
            ids.append(por_nome[nome])
    return conceitos_de(palavras, [{'conceitos': ids}])


def gravar(levas):
    arquivos, cards = ler_baralho()
    versos = ler_versos()
    escrito = {}
    for arq in levas:
        for x in json.loads(Path(arq).read_text(encoding='utf-8')):
            escrito[x['id']] = x
    for tid in CORTES:
        antigos = antigos_de(cards, tid)
        # o texto já cortado só se refaz quando a leva traz trecho dele (os cards antigos têm
        # ajustes feitos à mão, como a pontuação, e o corte de novo os trocaria por outros)
        if antigos and not any(escrito.get(c['id'], {}).get('texto_novo') for c in antigos) and \
                not any(x.get('texto') == tid for x in escrito.values()):
            continue
        novos = trechos_novos(tid, versos[tid], cards, antigos)
        if antigos:
            arq = next(f for f, lista in arquivos.items() if any(c['id'] == antigos[0]['id'] for c in lista))
        else:
            # texto novo: os trechos vão para o arquivo da leva (ARQUIVO_NOVO), no fim
            arq = BARALHO / ARQUIVO_NOVO
            arquivos.setdefault(arq, [])
        lista = arquivos[arq]
        pos = min((i for i, c in enumerate(lista) if c.get('texto') == tid), default=len(lista))
        resto = [c for c in lista if not (c.get('tipo') == 'frase' and c.get('texto') == tid)]
        feitos = []
        for k, t in enumerate(novos, 1):
            velho = next((c for c in antigos if c['id'] == t['id']), None)
            a, b = t['versos']
            if velho:
                card = dict(velho)
            else:
                x = escrito.get(t['id'])
                if not x:
                    raise SystemExit(f"{t['id']} ({t['la']}) sem texto na leva")
                pal = t['palavras']
                for i, fn in (x.get('fn') or {}).items():
                    pal[int(i)]['fn'] = fn
                nota = nota_das_palavras(pal) + [l for l in (x.get('ensina') or []) if l]
                card = {'id': t['id'], 'tipo': 'frase', 'la': t['la'], 'pt': x['pt'], 'gabarito': x['gabarito'],
                        'aceitas': x.get('aceitas', []), 'distratores': x['distratores'], 'nota': '\n'.join(nota),
                        'nivel': antigos[0]['nivel'] if antigos else 'A1', 'tags': ['trecho'], 'fonte': t['fonte'],
                        'requerTodas': [], 'palavras': pal,
                        'conceitos': conceitos_de(pal, antigos[a - 1:b]) if antigos else conceitos_da_leva(x, pal, cards)}
            card['texto'] = tid
            card['linha'] = k
            card['versos'] = t['versos']
            feitos.append(card)
        resto[pos:pos] = feitos
        arquivos[arq] = resto
        print(tid, len(antigos), '→', len(feitos))
    # o texto que não mudou de corte: cada trecho é um verso
    for lista in arquivos.values():
        for c in lista:
            if c.get('tipo') == 'frase' and c.get('texto') and c['texto'] not in CORTES:
                c['versos'] = [c['linha'], c['linha']]
    for f, lista in arquivos.items():
        gravar_cards(f, lista)


def gravar_cards(f, lista):
    """Só o arquivo que mudou, no formato que ele já tinha (um card por linha, ou indentado)."""
    antes = f.read_text(encoding='utf-8') if f.exists() else '[]'
    if json.loads(antes) == lista:
        return
    if antes.startswith('[\n {"'):
        texto = '[\n' + ',\n'.join(' ' + json.dumps(c, ensure_ascii=False) for c in lista) + '\n]\n'
    else:
        texto = json.dumps(lista, ensure_ascii=False, indent=1) + '\n'
    f.write_text(texto, encoding='utf-8', newline='\n')


def aceitas_de(q):
    """O build pede «aceitas»; a pergunta é só de escolher (a escrita nunca a vê), e uma variante
    sem o artigo arriscaria aceitar uma errada («ao Pai» × «o Pai»): vai a própria resposta, com ponto."""
    return [q['pt'] + '.']


def perguntas():
    """As perguntas de compreensão sobre os trechos (LATIM.md §16, D41): das levas
    cache/levas/cortes-*.json («compreensao» de cada trecho) para fonte/cards/la/26-compreensao-versos.json.
    Cada uma espera o que o trecho espera (as palavras e as flexões: rode antes flexoes.py gravar) e,
    no app, o próprio trecho já visto; uma vez só, como os cards de análise."""
    _, cards = ler_baralho()
    saida = []
    for leva in sorted((AQUI / 'cache' / 'levas').glob('cortes-*.json')):
        for x in json.loads(leva.read_text(encoding='utf-8')):
            tr = cards.get(x['id'])
            if not tr:
                continue
            for k, q in enumerate(x.get('compreensao') or []):
                saida.append({'id': f"la-q{x['id'][3:]}{'abc'[k]}", 'tipo': 'compreensao', 'la': tr['la'],
                              'pergunta': q['pergunta'], 'pt': q['pt'], 'aceitas': q.get('aceitas') or aceitas_de(q),
                              'distratores': q['distratores'], 'nota': q['nota'], 'nivel': tr['nivel'],
                              'tags': ['compreensão'], 'fonte': tr['fonte'], 'de': tr['id'],
                              'requerTodas': list(tr['requerTodas']), 'conjunto': 'q-' + tr['id'][3:]})
    saida.sort(key=lambda c: c['id'])
    arq = BARALHO / '26-compreensao-versos.json'
    arq.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(f'{arq.name}: {len(saida)} perguntas')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if sys.argv[1:2] == ['extrair']:
        extrair()
    elif sys.argv[1:2] == ['entrada']:
        entrada(sys.argv[2], sys.argv[3:])
    elif sys.argv[1:2] == ['gravar']:
        gravar(sys.argv[2:])
    elif sys.argv[1:2] == ['perguntas']:
        perguntas()
    else:
        print(__doc__)
