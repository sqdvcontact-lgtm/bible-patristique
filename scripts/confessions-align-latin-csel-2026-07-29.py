from __future__ import annotations

import hashlib
import json
import math
import re
import statistics
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path('tmp/confessions-import-2026-07-29')
LATIN_ROOT = Path('tmp/confessions-latin-csel-2026-07-29')


def stable_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n'


def plain(value: str) -> str:
    value = re.sub(r'\[\[\d+\]\]', '', value)
    return value.replace('*', '').replace('^^', '').replace('++', '')


def measure(value: str) -> int:
    return sum(character.isalpha() for character in plain(value))


def normalized_tokens(value: str) -> set[str]:
    folded = unicodedata.normalize('NFD', plain(value).lower())
    folded = ''.join(character for character in folded if unicodedata.category(character) != 'Mn')
    tokens = re.findall(r'[a-z]{5,}', folded)
    stop = {
        'autem', 'atque', 'etiam', 'enim', 'igitur', 'itaque', 'quidem', 'quoniam', 'domine',
        'nostre', 'vostre', 'cette', 'comme', 'quand', 'apres', 'avant', 'point', 'toutes', 'estre',
        'avoir', 'leurs', 'parce', 'celuy', 'celle', 'homme', 'dieu', 'seigneur',
    }
    return {token[:6] for token in tokens if token not in stop}


def split_latin(value: str, minimum: int) -> list[str]:
    chunks = re.split(r'(?<=[.!?;:])\s+', value)
    chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
    if len(chunks) < minimum:
        chunks = re.split(r'(?<=[.!?;:,])\s+', value)
        chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
    if len(chunks) < minimum:
        raise RuntimeError(f'Pas assez de bornes latines ({len(chunks)} < {minimum})')
    if ' '.join(chunks) != value:
        raise RuntimeError('La découpe latine ne recompose pas le chapitre')
    return chunks


# Les deux passages ci-dessous ne peuvent pas être alignés correctement par les
# seules bornes de ponctuation. Au livre IX, d'Andilly imprime séparément chacun
# des huit vers du cantique d'Ambroise, tandis que le témoin BKV donne le cantique
# en prose continue. Au livre X, sa frontière de paragraphe coupe une phrase
# latine. Les marqueurs ont donc été établis par confrontation sémantique.
MANUAL_BOUNDARY_MARKERS = {
    (1, 4): [
        'Quid est ergo deus meus?',
        'semper agens, semper quietus,',
        'amas nec aestuas, zelas et securus es;',
        'et quid diximus, deus meus, vita mea, dulcedo mea sancta,',
    ],
    (1, 5): [
        'Quis mihi dabit adquiescere in te?',
        'dic mihi per miserationes tuas, domine deus meus, quid sis mihi.',
        'Angusta est domus animae meae, quo venias ad eam:',
    ],
    (1, 6): [
        'Sed tamen sine me loqui apud misericordiam tuam,',
        'et susceperunt me consolationes miserationum tuarum,',
        'et ecce paulatim sentiebam, ubi essem,',
        'Et ecce infantia mea olim mortua est et ego vivo.',
        'dic mihi supplici tuo, deus, et misericors misero tuo,',
        'unde hoc tale animal nisi abs te, domine?',
        'et quoniam anni tui non deficiunt,',
        'quid ad me, si quis non intellegat?',
    ],
    (1, 11): [
        'Audieram enim ego adhuc puer de vita aeterna promissa nobis',
        'vidisti, domine, cum adhuc puer essem,',
        'ita iam credebam,',
        'Rogo te, deus meus, vellem scire,',
        'quanto ergo melius et cito sanarer,',
    ],
    (1, 16): [
        'Sed vae tibi, flumen moris humani!',
        'Et tamen, o flumen tartareum,',
        'Non omnino, non omnino per hanc turpitudinem verba ista commodius discuntur,',
    ],
    (1, 19): [
        'Horum ego puer morum in limine iacebam miser,',
        'Furta etiam faciebam de cellario parentum et de mensa,',
        'Istane est innocentia puerilis?',
    ],
    (2, 1): [
        'Recordari volo transactas foeditates meas,',
        'et colligens me a dispersione,',
    ],
    (2, 2): [
        'Et quid erat, quod me delectabat, nisi amare et amari?',
        'invaluerat super me ira tua, et nesciebam.',
        'Quis mihi modularetur aerumnam meam',
        'aut certe sonitum nubium tuarum vigilantius adverterem:',
        'Sed efferbui miser,',
        'ubi eram, et quam longe exulabam',
    ],
    (2, 3): [
        'Et anno quidem illo intermissa erant studia mea,',
        'cum interea non satageret idem pater,',
        'Sed ubi sexto illo et decimo anno interposito otio',
        'sed matris in pectore iam inchoaveras templum tuum',
        'et audeo dicere tacuisse te, deus meus,',
        'sed nesciebam et praeceps ibam tanta caecitate,',
        'ecce cum quibus comitibus iter agebam platearum Babyloniae,',
        'non enim et illa, quae iam de medio Babylonis fugerat,',
        'ita enim conicio recolens, ut possum,',
    ],
    (2, 5): [
        'Etenim species est pulchris corporibus,',
        'propter universa haec atque huius modi peccatum admittitur,',
        'homicidium fecit. cur fecit?',
        'praedicta est tamen causa:',
    ],
    (2, 6): [
        'Quid ego miser in te amavi, o furtum meum,',
        'et nunc, domine deus meus, quaero,',
        'Nam et superbia celsitudinem imitatur,',
        'et curiositas affectare videtur studium scientiae,',
        'tristitia rebus amissis contabescit,',
        'perverse te imitantur omnes,',
    ],
    (3, 2): [
        'Rapiebant me spectacula theatrica,',
        'si autem doleat, manet intentus et gaudens.',
        'et hoc de illa vena amicitiae est.',
        'sed tunc in theatris congaudebam amantibus,',
        'nunc vero magis miseror gaudentem in flagitio',
        'nonnullus itaque dolor adprobandus, nullus amandus est.',
        'At ego tunc miser dolere amabam,',
    ],
    (3, 7): [
        'Nesciebam enim aliud, vere quod est,',
        'non noveram deum esse spiritum,',
        'Et non noveram iustitiam veram interiorem',
        'tamquam si quis nescius in armamentis,',
        'sic sunt isti qui indignantur,',
        'numquid iustitia varia est et mutabilis?',
        'Haec ego tunc nesciebam et non advertebam,',
        'et reprehendebam caecus pios patres,',
    ],
    (4, 8): [
        'Non vacant tempora, nec otiose volvuntur per sensus nostros:',
        'alia erant, quae in eis amplius capiebant animum,',
        'his atque huius modi signis,',
    ],
    (4, 10): [
        'Deus virtutum, converte nos et ostende faciem tuam,',
        'laudet te ex illis anima mea, deus, creator omnium,',
    ],
    (4, 12): [
        'Si placent corpora, deum ex illis lauda,',
        'state cum eo et stabitis,',
        'Et descendit huc ipsa vita nostra et tulit mortem nostram,',
        'cui confitetur anima mea, et sanat eam,',
    ],
    (4, 15): [
        'Sed tantae rei cardinem in arte tua nondum videbam,',
        'et cum in virtute pacem amarem,',
        'non enim noveram neque didiceram nec ullam substantiam malum esse,',
        'Sed ego conabar ad te et repellebar abs te,',
        'et dicebam parvulis fidelibus tuis,',
        'Et eram aetate annorum fortasse viginti sex aut septem,',
    ],
    (5, 5): [
        'Sed tamen quis quaerebat Manichaeum nescio quem etiam ista scribere,',
        'non enim parvi se aestimari voluit,',
        'Cum enim audio Christianum aliquem fratrem,',
        'sed tamen nondum liquido conpereram,',
    ],
    (5, 6): [
        'Et per annos ferme ipsos novem,',
        'ergo ubi venit, expertus sum hominem gratum et iucundum verbis,',
        'Sensi autem aliud genus hominum etiam veritatem habere suspectam,',
        'igitur aviditas mea, qua illum tanto tempore expectaveram hominem,',
        'quod ubi potui, et aures eius cum familiaribus meis',
    ],
    (5, 9): [
        'Et ecce excipior ibi flagello aegritudinis corporalis,',
        'et ingravescentibus febribus, iam ibam et peribam.',
        'sed in dedecus meum creveram,',
        'et ubi essent tantae preces, tam crebrae sine intermissione?',
        'huiusne tu lacrimas,',
        'absit, ut tu falleres eam in illis visionibus et responsionibus tuis,',
    ],
    (6, 1): [
        'Spes mea a iuventute mea, ubi mihi eras et quo recesseras?',
        'iam venerat ad me mater pietate fortis,',
        'nulla ergo turbulenta exultatione trepidavit, cor eius,',
        'tibi autem, fons misericordiarum, preces et lacrimas densiores,',
    ],
    (6, 7): [
        'Congemescebamus in his, qui simul amice vivebamus,',
        'Sed enim de memoria mihi lapsum erat agere cum illo,',
        'at ille in se rapuit,',
        'taceat laudes tuas, qui miserationes tuas non considerat,',
    ],
    (6, 8): [
        'Non sane relinquens incantatem sibi a parentibus terrenam viam,',
        'quo ubi ventum est et sedibus quibus potuerunt locati sunt,',
        'ut enim vidit illum sanguinem, inmanitatem simul ebibit;',
    ],
    (6, 14): [
        'Et multi amici agitaveramus animo,',
        'et placuerat nobis, ut bini annui tamquam magistratus omnia necessaria curarent,',
    ],
    (7, 6): [
        'Iam etiam mathematicorum fallaces divinationes et inpia deliramenta reieceram.',
        'tu procurasti pervicaciae meae,',
        'procurasti tu ergo hominem amicum,',
        'tum ille mihi narravit, patrem suum fuisse librorum talium curiosissimum',
        'itaque dicebat audisse se a patre suo,',
        'et tamen Firminus amplo apud suos loco natus,',
        'His itaque auditis et creditis',
        'Hinc autem accepto aditu ipse mecum talia ruminando.',
        'tu enim, domine, iustissime moderator universitatis,',
    ],
    (7, 9): [
        'Et primo volens ostendere mihi, quam resistas superbis,',
        'quia vero in sua propria venit et sui eum non receperunt,',
        'Item legi ibi, quia verbum, deus, non ex carne,',
        'quod autem ante omnia tempora et supra omnia tempora',
        'qui autem cothurno tamquam doctrinae sublimioris elati non audiunt dicentem:',
        'Et ideo legebam ibi etiam inmutatum gloriam incorruptionis tuae in idola',
    ],
    (7, 12): [
        'Et manifestatum est mihi, quoniam bona sunt, quae corrumpuntur,',
        'itaque vidi et manifestatum est mihi, quia omnia bona tu fecisti,',
    ],
    (7, 17): [
        'Et mirabar, quod iam te amabam, non pro te plantasma:',
        'sed mecum erat memoria tui,',
        'eramque certissimus, quod invisibilia tua a constitutione mundi',
        'atque ita gradatim a corporibus ad sentientem per corpus animam,',
        'quae se quoque in me comperiens mutabilem,',
        'tunc vero invisibilia tua per ea quae facta sunt intellecta conspexi,',
    ],
    (7, 20): [
        'Sed tunc, lectis Platonicorum illis libris,',
        'certus esse te et infinitum esse,',
        'garriebam plane quasi peritus',
        'ubi enim erat illa aedificans caritas a fundamento humilitatis,',
    ],
    (8, 1): [
        'Deus meus, recorder in gratiarum actione tibi,',
        'inhaeserant praecordiis meis verba tua,',
        'dubitatio tamen omnis de incorruptibili substantia,',
        'et inmisisti in mentem meam, visumque est bonum in conspectu meo,',
        'mihi autem displicebat, quod agebam in saeculo,',
        'sed ego infirmior eligebam molliorem locum;',
        'vani sunt certe omnes homines, quibus non inest dei scientia,',
        'et est aliud genus inpiorum, qui cognoscentes deum',
    ],
    (8, 2): [
        'Perrexi ergo ad Simplicianum,',
        'deinde, ut me exhortaretur ad humilitatem Christi,',
        'O domine, domine, qui inclinasti caelos et descendisti,',
        'sed posteaquam legendo et hausit firmatatem,',
        'Denique ut ventum est ad horam profitendae fidei,',
        'itaque ubi ascendit, ut redderet,',
    ],
    (8, 4): [
        'Age, domine, fac excita et revoca nos,',
        'absit enim, ut in tabernaculo tuo prae pauperibus accipiantur personae divitum,',
        'quanto igitur gratius cogitabatur Victorini pectus,',
    ],
    (8, 6): [
        'Et de vinculo quidem desiderii concubitus,',
        'mecum erat Alypius,',
        'non itaque Nebridium cupiditas commodorum eo traxit',
        'Quodam igitur die',
        'stupebamus autem, audientes tam recenti memoria',
        'Inde sermo eius devolutus est ad monasteriorum greges,',
        'quam legere coepit unus eorum,',
        'dixit hoc, et turbidus parturitione novae vitae reddidit oculos paginis:',
        'tum Ponticianus et qui cum eo per alias horti partes deambulabant,',
    ],
    (8, 10): [
        'Pereant a facie tua, deus, sicuti pereunt,',
        'ego cum deliberabam, ut servirem domino deo meo,',
        'Nam si tot sunt contrariae naturae,',
        'Iam ergo non dicant,',
        'ita et in bonis voluntatibus.',
        'ita etiam, cum aeternitas delectat superius',
    ],
    (8, 11): [
        'Sic aegrotabam et excruciabar,',
        'dicebam enim apud me intus:',
        'Retinebant nugae nugarum et vanitates vanitatum,',
        'et audiebam eas iam longe minus quam dimidius,',
        'et inridebat me inrisione hortatoria,',
    ],
    (8, 12): [
        'Ubi vero a fundo arcano alta consideratio traxit',
        'surrexi ab Alypio',
        'Dicebam haec, et flebam,',
        'itaque concitus redii in eum locum, ubi sedebat Alypius:',
        'Tum interiecto aut digito aut nescio quo alio signo, codicem clausi,',
        'inde ad matrem ingredimur, indicamus:',
    ],
    (9, 4): [
        'Et venit dies, quo etiam actu solverer a professione rhetorica,',
        'revocat enim me recordatio mea,',
        'Quas tibi, deus meus, voces dedi,',
        'quas tibi voces dabam in psalmis illis,',
        'quam vehementi et acri dolore indignabar Manichaeis,',
        'Inhorrui timendo,',
        'et miserat eum iam, sed ego nesciebam.',
        'Legebam: Irascimini et nolite peccare.',
        'nec iam bona mea foris erant,',
        'o si viderent internum aeternum,',
        'Et clamabam in consequenti versu clamore alto cordis mei:',
        'legebam et ardebam,',
        'sed nec oblitus sum, nec silebo,',
    ],
    (9, 3): [
        'Macerabatur anxitudine Verecundus de isto nostro bono,',
        'benigne tamen obtulit, ut, quamdiu ibi essemus,',
        'gratias tibi, deus noster! tui sumus:',
        'Angebatur ergo tunc ipse, Nebridius autem conlaetabatur.',
        'et nunc ille vivit in sinu Abraham.',
        'sic ergo eramus, Verecundum consolantes tristem,',
    ],
    (9, 8): [
        'Qui habitare facis unanimes in domo,',
        'multa praetereo, quia multum festino.',
        'nec tantam erga suam disciplinam diligentiam matris praedicabat,',
        'hac retione praecipiendi et auctoritate imperandi frenabat aviditatem tenerioris aetatis,',
        'Et subrepserat tamen, sicut mihi filio famula tua narrabat,',
        'at tu, domine, rector caelitum et terrenorum,',
    ],
    (9, 10): [
        'Impendente autem die, quo ex hac vita erat exitura',
        'conloquebamur ergo soli valde dulciter;',
        'Cumque ad eum finem sermo perduceretur,',
        'et adhuc ascendebamus, interius cogitando et loquendo',
        'Dicebamus ergo: se cui sileat tumultus carnis,',
        'Dicebam talia, etsi non isto modo et his verbis,',
    ],
    (9, 11): [
        'Ad haec ei quid responderim, non satis recolo,',
        'cumque hanc sententiam verbis quibus poterat explicasset,',
        'quando autem ista inanitas plenitudine bonitatis tuae coeperat in eius corde non esse,',
    ],
    (9, 12): [
        'Premebam oculos eius;',
        'hoc modo etiam meum quiddam puerile,',
        'Quid ergo, quod intus mihi graviter dolebat,',
        'Cohibito ergo a fletu illo puero,',
        'quod erat tempori congruum disputabam;',
        'Cum ecce corpus elatum est,',
        'visum etiam mihi est, ut irem lavatum,',
        'deinde dormivi, et vigilavi,',
        'tu es enim, deus, creator omnium',
        'polique rector',
        'vestiens diem decoro lumine,',
        'noctem sopora gratia,',
        'artus solutos ut quies',
        'reddat laboris usui',
        'mentesque fessas allevet',
        'luctuque solvat anxios.',
        'Atque inde paulatim redducebam in pristinum sensum ancillam tuam,',
        'et nunc, domine, confiteor tibi in litteris.',
    ],
    (10, 25): [
        'Sed ubi manes in memoria mea, domine,',
        'et commutantur haec omnia,',
    ],
    (10, 3): [
        'Quid mihi ergo est cum hominibus, ut audiant confessiones meas,',
        'sed quia caritas omnia credit',
        'quo itaque fructu, domine meus,',
    ],
    (10, 6): [
        'Non dubia, sed certa conscientia, domine, amo te.',
        'non speciem corporis nec decus temporis,',
        'non haec amo, cum amo deum meum.',
        'Et quid est hoc? interrogavi terram,',
        'interrogatio mea intentio mea, et responsio eorum species eorum.',
        'sed melius quod interius.',
        'interrogavi mundi molem de deo meo,',
        'nec respondent ista interrogantibus nisi iudicantibus,',
    ],
    (10, 12): [
        'Item continet memoria numerorum dimensionumque rationes et leges innumerabiles,',
        'vidi lineas fabrorum vel etiam tenuissimas,',
    ],
    (10, 13): [
        'Haec omnia memoria teneo et quomodo ea didicerim memoria teneo.',
        'et discrevisse me inter illa vera et haec falsa,',
        'Affectiones quoque animi mei eadem memoria continet',
    ],
    (10, 14): [
        'quod mirandum non est de corpore:',
        'hic vero, cum animus sit etiam ipsa memoria',
        'Sed ecce de memoria profero,',
        'forte ergo sicut de ventre cibus ruminando,',
    ],
    (10, 18): [
        'si praeter memoriam meam te invenio, inmemor tui sum.',
        'verum tamen si forte aliquid ab oculis perit, non a memoria,',
    ],
    (10, 21): [
        'Numquid ita, ut memini Carthaginem qui vidi?',
        'numquid sicut meminimus eloquentiam?',
        'numquid sicut meminimus gaudium?',
        'Ubi ergo et quando expertus sum vitam meam beatam,',
        'si quaeratur a duobus, utrum militare velint,',
    ],
    (10, 23): [
        'Non ergo certum est, quod omnes esse beati volunt,',
        'nam quaero ab omnibus, utrum malint de veritate quam de falsitate gaudere:',
        'multos expertus sum, qui vellent fallere,',
        'cur ergo non de illa gaudent? cur non beati sunt?',
        'Cur autem veritas parit odium,',
        'sic, sic, etiam sic animus humanus,',
    ],
    (10, 31): [
        'Est alia malitia diei, quae utinam sufficiat ei.',
        'Hoc me docuisti, ut quemadmodum medicamenta sic alimenta sumpturus accedam.',
        'his temptationibus cotidie conor resistere,',
        'audivi aliam vocem tuam:',
        'Docuisti me, pater bone: Omnia munda mundis,',
        'non ego inmunditiam obsonii timeo,',
        'In his ergo temptationibus positus,',
    ],
    (10, 34): [
        'Restat voluptas oculorum istorum carnis meae,',
        'pulchras formas et varias, nitidos et amoenos colores amant oculi.',
        'O lux, quam videbat Tobis,',
        'ipsa est lux, una est et unum omnes, qui vident et amant eam.',
        'resisto seductionibus oculorum,',
        'Quam innumerabilia variis artibus et opificiis',
        'at ego, deus meus et decus meum, etiam hinc tibi dico hymnum',
        'ego autem haec loquens atque discernens',
    ],
    (10, 36): [
        'Numquid etiam hoc inter contemnenda deputabimus,',
        'Sed numquid, domine, qui solus sine typho dominaris,',
        'itaque nobis, quoniam propter quaedam humanae societatis officia necessarium est amari et timeri ab hominibus,',
        'nos autem, domine, pusillus grex tuus ecce sumus,',
    ],
    (10, 37): [
        'Temptamur his temptationibus cotidie, domine,',
        'nam et a voluptatibus carnis et a curiositate supervacuanea cognoscendi',
        'laude vero ut careamus atque in eo experiamur, quid possumus,',
        'Quid igitur tibi in hoc genere temptationis, domine, confiteor?',
        'verum tamen nollem, ut vel augeret mihi gaudium',
        'nam et contristor aliquando laudibus meis,',
        'ergone de hoc incertus sum mei?',
        'iterum me diligentius interrogem.',
        'insaniam istam, domine, longe fac a me,',
    ],
    (11, 23): [
        'Audivi a quodam homine docto,',
        'sunt sidera et luminaria caeli in signis et in temporibus et in diebus et in annis.',
        'si enim primum dies esset,',
        'non itaque nunc quaeram, quid sit illud, quod vocatur dies,',
    ],
    (11, 2): [
        'Quando autem sufficio lingua calami enuntiare omnia hortamenta tua,',
        'et olim inardesco meditari in lege tua,',
        'Domine deus meus, intende orationi meae,',
        'tuus est dies et tua est nox:',
        'Domine, miserere mei et exaudi desiderium meum.',
    ],
    (11, 15): [
        'Et tamen dicimus longum tempus et breve tempus,',
        'domine meus, lux mea, nonne et hic veritas tua deridebit hominem?',
        'Videamus ergo, anima humana, utrum praesens tempus possit esse longum:',
        'vide saltem, utrum qui agitur mensis,',
        'Ecce praesens tempus, quod solum inveniebamus longum appellandum,',
        'et ipsa una hora fugitivis particulis agitur:',
        'praesens autem nullum habet spatium.',
    ],
    (11, 27): [
        'Insiste, anime meus, et adtende fortiter:',
        'si ergo tunc poterat, ecce puta altera coepit sonare',
        'Deus creator omnium:',
        'eius enim finitio praeteritio est.',
        'In te, anime meus, tempora mea metior.',
        'quid cum metimur silentia,',
    ],
    (12, 11): [
        'Iam dixisti mihi, domine, voce forti in aurem interiorem,',
        'item dixisti mihi, domine, voce forti, in aurem interiorem,',
        'Item dixisti mihi voce forti in aurem interiorem',
        'Unde intellegat anima, cuius peregrinatio longinqua facta est,',
        'Ecce nescio quid informe in istis mutationibus rerum extremarum atque infirmarum,',
    ],
    (13, 21): [
        'Ac per hoc in verbo tuo non maris profunditas,',
        'nec isto igitur genere volatili,',
        'terra producit eam,',
        'primarum enim vocum evangelizantium infidelitas hominum causa extitit;',
        'Operentur ergo iam in terra ministri tui,',
        'quaerite deum, et vivet anima vestra,',
        'ita erunt in anima viva bestiae bonae in mansuetudine actionis.',
    ],
    (13, 15): [
        'Aut quis nisi tu, deus noster, fecisti nobis firmamentum auctoritatis',
        'Videamus, domine, caelos, opera digitorum tuorum:',
        'Sunt aliae aquae super hoc firmamentum,',
        'transeunt praedicatores verbi tui ex hac vita in aliam vitam,',
    ],
    (13, 19): [
        'Sed prius lavamini, mundi estote',
        'quaerebat dives ille a magistro bono,',
        'feci, inquit, haec omnia.',
        'Vos autem, genus electum in firmamento mundi,',
        'luna et stellae nocti lucent,',
    ],
    (13, 20): [
        'Concipiat et mare et pariat opera vestra,',
        'et inter haec facta sunt magnalia mirabilia tamquam coeti grandes;',
        'Numquid mentior, aut mixtione misceo,',
        'aquae produxerunt haec, sed in verbo tuo:',
        'Et pulchra sunt omnia faciente te,',
        'sic enim mihi nunc occurrerunt reptilia et volatilia,',
    ],
    (13, 23): [
        'Quod autem iudicat omnia,',
        'ergo in ecclesia tua, deus noster, secundum gratiam tuam,',
        'neque de illa distinctione iudicat spiritalium videlicet atque carnalium hominum,',
        'neque de turbidis huius saeculi populis quamquam spiritalis homo iudicat.',
        'Ideoque homo, quem fecisti ad imaginem tuam,',
        'iudicat enim et approbat, quod recte,',
        'quibus omnibus vocibus corporaliter enuntiandis causa est abyssus saeculi',
        'iudicat etiam spiritalis approbando, quod rectum,',
    ],
    (13, 24): [
        'Sed quid est hoc et quale mysterium est?',
        'item dicerem ad ea rerum genera pertinere benedictionem hanc,',
        'Quid igitur dicam, lumen meum, veritas?',
        'Itaque si naturas ipsas rerum non allegorice, sed proprie cogitemus,',
    ],
    (13, 38): [
        'Non itaque ista quae fecisti videmus, quia sunt,',
        'et hoc intellegere quis hominum dabit homini?',
    ],
    (1, 2): [
        'Et quomodo invocabo deum meum, deum et dominum meum,',
        'an quia sine te non esset quidquid est,',
        'non ergo essem, deus meus, non omnino essem, nisi esses in me.',
    ],
}


def split_at_markers(value: str, markers: list[str]) -> list[str]:
    if not markers or not value.startswith(markers[0]):
        raise RuntimeError('Le premier marqueur manuel ne correspond pas au début du chapitre')
    offsets = []
    cursor = 0
    for marker in markers:
        offset = value.find(marker, cursor)
        if offset < 0:
            raise RuntimeError(f'Marqueur latin manuel introuvable : {marker}')
        offsets.append(offset)
        cursor = offset + len(marker)
    parts = [
        value[offsets[index]: offsets[index + 1] if index + 1 < len(offsets) else len(value)].strip()
        for index in range(len(offsets))
    ]
    if ' '.join(parts) != value:
        raise RuntimeError('Les frontières manuelles ne recomposent pas le chapitre latin')
    return parts


def align_chapter(chapter: dict, french_paragraphs: list[dict]) -> tuple[list[dict], dict]:
    manual_markers = MANUAL_BOUNDARY_MARKERS.get((chapter['book_number'], chapter['chapter_number']))
    if manual_markers:
        latin_parts = split_at_markers(chapter['text'], manual_markers)
        if len(latin_parts) != len(french_paragraphs):
            raise RuntimeError('Le nombre de frontières manuelles ne correspond pas aux paragraphes français')
        chapter_ratio = sum(measure(part) for part in latin_parts) / max(
            1, sum(measure(item['source_clean']) for item in french_paragraphs)
        )
        aligned = []
        for index, (french, latin) in enumerate(zip(french_paragraphs, latin_parts, strict=True)):
            expected = max(1.0, measure(french['source_clean']) * chapter_ratio)
            aligned.append({
                **french,
                'latin_text': latin,
                'latin_chunk_start': index + 1,
                'latin_chunk_end': index + 1,
                'latin_letters': measure(latin),
                'french_letters': measure(french['source_clean']),
                'length_ratio_vs_chapter': round((measure(latin) + 1) / (expected + 1), 4),
                'shared_cognate_stems': len(normalized_tokens(latin) & normalized_tokens(french['source_clean'])),
                'alignment_method': 'manual_semantic_boundary',
            })
        return aligned, {
            'chapter_order': chapter['order'],
            'book_number': chapter['book_number'],
            'chapter_number': chapter['chapter_number'],
            'french_paragraphs': len(french_paragraphs),
            'latin_chunks': len(latin_parts),
            'chapter_length_ratio': round(chapter_ratio, 4),
            'alignment_cost': None,
            'minimum_boundary_margin': None,
            'extreme_length_ratios': sum(
                1 for item in aligned if not 0.5 <= item['length_ratio_vs_chapter'] <= 1.8
            ),
            'alignment_method': 'manual_semantic_boundary',
        }
    chunks = split_latin(chapter['text'], len(french_paragraphs))
    n, p = len(chunks), len(french_paragraphs)
    latin_lengths = [measure(chunk) for chunk in chunks]
    french_lengths = [measure(item['source_clean']) for item in french_paragraphs]
    ratio = sum(latin_lengths) / max(1, sum(french_lengths))
    latin_tokens = [normalized_tokens(chunk) for chunk in chunks]
    french_tokens = [normalized_tokens(item['source_clean']) for item in french_paragraphs]

    prefix_lengths = [0]
    for length in latin_lengths:
        prefix_lengths.append(prefix_lengths[-1] + length)

    def group_cost(paragraph_index: int, start: int, end: int) -> float:
        latin_length = prefix_lengths[end] - prefix_lengths[start]
        expected = max(1.0, french_lengths[paragraph_index] * ratio)
        length_cost = 4.0 * math.log((latin_length + 1) / (expected + 1)) ** 2
        group_tokens = set().union(*latin_tokens[start:end])
        shared = len(group_tokens & french_tokens[paragraph_index])
        # Les cognats ne décident jamais seuls ; ils servent seulement à départager
        # deux bornes de longueur comparable.
        lexical_bonus = min(shared, 8) * 0.035
        return length_cost - lexical_bonus

    infinity = float('inf')
    dp = [[infinity] * (n + 1) for _ in range(p + 1)]
    previous = [[None] * (n + 1) for _ in range(p + 1)]
    dp[0][0] = 0.0
    for paragraph_index in range(1, p + 1):
        minimum_end = paragraph_index
        maximum_end = n - (p - paragraph_index)
        for end in range(minimum_end, maximum_end + 1):
            for start in range(paragraph_index - 1, end):
                if dp[paragraph_index - 1][start] == infinity:
                    continue
                value = dp[paragraph_index - 1][start] + group_cost(paragraph_index - 1, start, end)
                if value < dp[paragraph_index][end]:
                    dp[paragraph_index][end] = value
                    previous[paragraph_index][end] = start

    bounds = [n]
    cursor = n
    for paragraph_index in range(p, 0, -1):
        cursor = previous[paragraph_index][cursor]
        if cursor is None:
            raise RuntimeError('Alignement dynamique impossible')
        bounds.append(cursor)
    bounds.reverse()

    aligned = []
    boundary_margins = []
    for index, french in enumerate(french_paragraphs):
        start, end = bounds[index], bounds[index + 1]
        latin = ' '.join(chunks[start:end])
        expected = max(1.0, french_lengths[index] * ratio)
        aligned.append({
            **french,
            'latin_text': latin,
            'latin_chunk_start': start + 1,
            'latin_chunk_end': end,
            'latin_letters': measure(latin),
            'french_letters': french_lengths[index],
            'length_ratio_vs_chapter': round((measure(latin) + 1) / (expected + 1), 4),
            'shared_cognate_stems': len(set().union(*latin_tokens[start:end]) & french_tokens[index]),
        })
        if index < p - 1:
            current = group_cost(index, start, end) + group_cost(index + 1, end, bounds[index + 2])
            alternatives = []
            for alternative in (end - 1, end + 1):
                if start < alternative < bounds[index + 2]:
                    alternatives.append(
                        group_cost(index, start, alternative)
                        + group_cost(index + 1, alternative, bounds[index + 2])
                    )
            margin = min(alternatives) - current if alternatives else 99.0
            boundary_margins.append(round(margin, 5))

    if ' '.join(item['latin_text'] for item in aligned) != chapter['text']:
        raise RuntimeError('Les paragraphes alignés ne recomposent pas le chapitre latin')
    diagnostics = {
        'chapter_order': chapter['order'],
        'book_number': chapter['book_number'],
        'chapter_number': chapter['chapter_number'],
        'french_paragraphs': p,
        'latin_chunks': n,
        'chapter_length_ratio': round(ratio, 4),
        'alignment_cost': round(dp[p][n], 5),
        'minimum_boundary_margin': min(boundary_margins) if boundary_margins else 99.0,
        'extreme_length_ratios': sum(1 for item in aligned if not 0.5 <= item['length_ratio_vs_chapter'] <= 1.8),
    }
    return aligned, diagnostics


latin_payload = json.loads((LATIN_ROOT / 'confessions-csel-chapters.json').read_text(encoding='utf-8'))

# Deux limites de chapitre diffèrent entre la numérotation de d'Andilly et
# celle du CSEL. On déplace ici les seuls fragments concernés avant d'aligner
# les paragraphes ; l'ordre et le texte latin restent strictement inchangés.
chapters_by_key = {
    (item['book_number'], item['chapter_number']): item
    for item in latin_payload['chapters']
}


def move_suffix_to_next(source_key: tuple[int, int], target_key: tuple[int, int], marker: str) -> None:
    source = chapters_by_key[source_key]
    target = chapters_by_key[target_key]
    offset = source['text'].find(marker)
    if offset < 0:
        raise RuntimeError(f'Fragment interchapitre introuvable : {source_key} / {marker}')
    suffix = source['text'][offset:]
    source['text'] = source['text'][:offset].rstrip()
    target['text'] = f'{suffix} {target["text"]}'


# La frontière française est située à l'intérieur du chapitre XIV du CSEL :
# on rend au chapitre XIII la première partie du passage.
chapter_10_14 = chapters_by_key[(10, 14)]
boundary_10_14 = chapter_10_14['text'].find('quod mirandum non est de corpore:')
if boundary_10_14 < 0:
    raise RuntimeError('Frontière X, 13/14 introuvable')
chapters_by_key[(10, 13)]['text'] += f' {chapter_10_14["text"][:boundary_10_14].rstrip()}'
chapter_10_14['text'] = chapter_10_14['text'][boundary_10_14:]

move_suffix_to_next(
    (10, 17),
    (10, 18),
    'si praeter memoriam meam te invenio, inmemor tui sum.',
)

chapter_10_38 = chapters_by_key[(10, 38)]
boundary_10_38 = chapter_10_38['text'].find('sermo autem ore procedens')
if boundary_10_38 < 0:
    raise RuntimeError('Frontière X, 37/38 introuvable')
chapters_by_key[(10, 37)]['text'] += f' {chapter_10_38["text"][:boundary_10_38].rstrip()}'
chapter_10_38['text'] = chapter_10_38['text'][boundary_10_38:]
source_map = json.loads((ROOT / 'confessions-source-map.json').read_text(encoding='utf-8'))
candidate = json.loads((ROOT / 'confessions-segments-candidate.json').read_text(encoding='utf-8'))
body_map = [item for item in source_map if item['nature'] == 'texte']

chapter_keys = []
paragraphs_by_chapter = defaultdict(list)
for item in body_map:
    key = (item['ref_niv1'], item['ref_niv2'])
    if key not in paragraphs_by_chapter:
        chapter_keys.append(key)
    paragraphs_by_chapter[key].append(item)
if len(chapter_keys) != 278 or len(latin_payload['chapters']) != 278:
    raise SystemExit('Les deux témoins ne portent pas 278 chapitres')

all_alignments = []
chapter_diagnostics = []
for chapter, key in zip(latin_payload['chapters'], chapter_keys, strict=True):
    paragraphs = paragraphs_by_chapter[key]
    if chapter['chapter_number'] != len([known for known in chapter_keys[:chapter['order']] if known[0] == key[0]]):
        raise SystemExit(f'Ordre de chapitre incohérent : {key} / {chapter}')
    aligned, diagnostics = align_chapter(chapter, paragraphs)
    for item in aligned:
        item.update({
            'latin_source_url': chapter['source_url'],
            'latin_division_id': chapter['division_id'],
            'book_number': chapter['book_number'],
            'chapter_number': chapter['chapter_number'],
        })
    all_alignments.extend(aligned)
    chapter_diagnostics.append(diagnostics)

if len(all_alignments) != 932:
    raise SystemExit(f'932 paragraphes français attendus, {len(all_alignments)} alignés')
if any(not item['latin_text'] for item in all_alignments):
    raise SystemExit('Un paragraphe français est privé de latin')

updates = []
first_numbers = set()
for item in all_alignments:
    number = item['first_segment_numero']
    if number in first_numbers:
        raise SystemExit(f'Premier segment dupliqué : {number}')
    first_numbers.add(number)
    updates.append({'segment_numero': number, 'texte_original': item['latin_text']})

candidate_by_number = {item['segment_numero']: item for item in candidate}
for row in candidate:
    if row['nature'] == 'texte':
        row['texte_original'] = None
for update in updates:
    candidate_by_number[update['segment_numero']]['texte_original'] = update['texte_original']

latin_characters_stored = sum(len(item['latin_text']) for item in all_alignments)
paragraph_boundaries_inside_chapters = len(all_alignments) - len(latin_payload['chapters'])
latin_characters_recomposed = latin_characters_stored + paragraph_boundaries_inside_chapters
if latin_characters_recomposed != latin_payload['counts']['characters']:
    raise SystemExit(f'Recomposition globale fautive : {latin_characters_recomposed}')

review_priority = sorted(
    all_alignments,
    key=lambda item: (
        0 if not 0.5 <= item['length_ratio_vs_chapter'] <= 1.8 else 1,
        item['shared_cognate_stems'],
        abs(math.log(item['length_ratio_vs_chapter'])),
    ),
)[:120]
randomish_review = [all_alignments[index] for index in range(0, len(all_alignments), 17)][:55]

report = {
    'method': 'Alignement monotone à l’intérieur de chacun des 278 chapitres communs ; bornes latines fortes, coût de longueur Gale-Church simplifié et cognats comme départage seulement.',
    'counts': {
        'books': 13,
        'chapters': 278,
        'french_paragraphs': len(all_alignments),
        'latin_characters_stored': latin_characters_stored,
        'latin_characters_recomposed': latin_characters_recomposed,
        'updates_first_segment_only': len(updates),
        'body_segments_left_without_duplicate_original': sum(1 for row in candidate if row['nature'] == 'texte' and row['segment_numero'] not in first_numbers),
    },
    'diagnostics': {
        'chapters_with_extreme_length_ratios': sum(1 for item in chapter_diagnostics if item['extreme_length_ratios']),
        'paragraphs_with_extreme_length_ratios': sum(1 for item in all_alignments if not 0.5 <= item['length_ratio_vs_chapter'] <= 1.8),
        'median_paragraph_length_ratio': round(statistics.median(item['length_ratio_vs_chapter'] for item in all_alignments), 4),
        'chapter_alignment': chapter_diagnostics,
    },
}

outputs = {
    'confessions-latin-alignments.json': all_alignments,
    'confessions-latin-updates.json': updates,
    'confessions-latin-alignment-report.json': report,
    'confessions-latin-review-priority.json': review_priority,
    'confessions-latin-review-stratified.json': randomish_review,
    'confessions-segments-with-latin-candidate.json': candidate,
}
for filename, value in outputs.items():
    body = stable_json(value)
    path = LATIN_ROOT / filename
    path.write_text(body, encoding='utf-8')
    (LATIN_ROOT / f'{filename}.sha256').write_text(
        f'{hashlib.sha256(body.encode("utf-8")).hexdigest().upper()}  {filename}\n', encoding='utf-8'
    )

print(json.dumps({'ok': True, **report['counts'], **{key: value for key, value in report['diagnostics'].items() if not isinstance(value, list)}}, ensure_ascii=False, indent=2))
