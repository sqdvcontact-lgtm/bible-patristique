'use client'

// « MA CHAÎNE » — les versets que le lecteur a glosés, et ce qu'il en a dit.
//
// Le lecteur écrit sur les versets à DEUX endroits, et ne les revoyait jamais ensemble :
// une note dans la colonne de droite de la Polyglotte, un commentaire sous le verset de
// la page Bible. Il fallait retrouver le chapitre pour retrouver ce qu'on y avait pensé.
//
// La forme est celle d'une CHAÎNE EXÉGÉTIQUE : le lemme, puis les scholies qu'il a
// reçues. Les entrées se suivent dans l'ordre du canon, et le sommaire porte les livres
// comme le volet de la Bible porte les siens.
//
// ⛔ ELLE NE SE MODIFIE PAS D'ICI. Une note se reprend là où elle s'écrit, dans la
// Polyglotte ; un commentaire dans le fil où il a été posté. Deux surfaces qui écrivent
// la même donnée divergent au premier réglage, et celle-ci n'a rien à décider : elle
// rassemble.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { supabase } from '@/app/lib/supabase'
import { useEspace } from '@/app/compte/EspaceCompte'
import { BandeauLecteur, Section, SommaireEspace } from '@/app/compte/piecesEspace'
import { ancresChaine } from '@/app/lib/espaceLecteurNavigation'
import {
  accorder, composerChaine, compterChaine, versetsAResoudre,
  type EntreeChaine, type GloseLecteur, type GroupeChaine,
} from '@/app/lib/chaineExegetique'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import { lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { urlLectureBible } from '@/app/lib/bibleNavigation'
import { styleTexteVerset } from '@/app/lib/compositionBible'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { useEstMobile } from '@/app/lib/useEstMobile'

type Etat = {
  /** La DEMANDE que cet état satisfait. ⛔ L'attente se DÉDUIT de sa comparaison avec la
   *  demande courante : rien ne se remet à zéro dans le corps d'un effet, qui n'y
   *  déclencherait qu'un rendu en cascade (patron de la Polyglotte). */
  cle: string
  groupes: GroupeChaine[]
  /** canon_id → texte du verset dans la traduction du lecteur. */
  textes: Map<string, string>
  /** La bible dans laquelle les lemmes sont donnés. */
  trad: string
  nomTrad: string
}

/** Le blanc entre le lemme et ses scholies. ⚠️ Plus large que celui qui sépare deux
 *  scholies (11 px) : le texte biblique se cerne d'un blanc plus large que son apparat
 *  (charte, § 35.12), et les scholies d'un même verset se lisent en suite. */
const BLANC_SOUS_LEMME = '15px'

const dateLisible = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default function PageChaine() {
  const { user, profil } = useEspace()
  const [etat, setEtat] = useState<Etat | null>(null)
  /** La demande dont le chargement a échoué, s'il y en a une. */
  const [echec, setEchec] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)
  const cle = `${user.id}|${profil.traduction_defaut}|${essai}`
  // ⚠️ Le seuil est celui de la GRILLE de l'entrée, non celui du téléphone : sous 640 px
  // la référence passe au-dessus du lemme et la mesure devient trop étroite pour se
  // justifier sans lézarder (charte, § 41.4).
  const etroit = useEstMobile(640)

  useEffect(() => {
    let annule = false

    const charger = async () => {
      const [gloses, notes, lisibles, trads] = await Promise.all([
        supabase.from('commentaires')
          .select('id, id_verset, texte, created_at, valide, reponse_a, supprime')
          .eq('user_id', user.id),
        supabase.from('polyglotte_notes')
          .select('canon_id, texte, updated_at')
          .eq('user_id', user.id),
        // ⛔ Les colonnes RÉELLEMENT présentes dans `versets_lecture` : une bible déclarée
        // mais non matérialisée ferait échouer toute la requête des lemmes, en silence
        // (charte, « Traductions lisibles vs colonnes de versets_lecture »).
        codesTraductionsLecture(supabase),
        supabase.from('traductions').select('trad_id, nom').eq('est_biblique', true).order('ordre'),
      ])

      // ⚠️ Un panneau qui se rend vide sur une erreur qu'il n'a pas lue fait croire au
      // lecteur qu'il n'a rien écrit. On dit l'échec, et on le journalise.
      if (gloses.error || notes.error) {
        console.error('Ma chaîne : les gloses n’ont pas pu être lues.', gloses.error ?? notes.error)
        throw gloses.error ?? notes.error
      }
      if (trads.error) console.error('Ma chaîne : le catalogue des bibles n’a pas pu être lu.', trads.error)

      const groupes = composerChaine(gloses.data ?? [], notes.data ?? [])

      const codes = new Set(lisibles)
      const catalogue = (trads.data ?? []).filter(t => codes.has(t.trad_id as string))
      const trad = codes.has(profil.traduction_defaut)
        ? profil.traduction_defaut
        : (catalogue[0]?.trad_id as string | undefined) ?? 'TR0001'
      const nomTrad = (catalogue.find(t => t.trad_id === trad)?.nom as string | undefined) ?? ''

      const textes = new Map<string, string>()
      const ids = versetsAResoudre(groupes)
      if (ids.length) {
        const lots = await Promise.all(
          lotsPourClauseIn(ids).map(lot =>
            supabase.from('versets_lecture').select(`id_verset, "${trad}"`).in('id_verset', lot)),
        )
        for (const lot of lots) {
          if (lot.error) { console.error('Ma chaîne : un lemme n’a pas pu être lu.', lot.error); continue }
          for (const ligne of lot.data ?? []) {
            const texte = (ligne as Record<string, unknown>)[trad]
            if (typeof texte === 'string' && texte.trim()) textes.set(ligne.id_verset as string, texte)
          }
        }
      }

      if (!annule) setEtat({ cle, groupes, textes, trad, nomTrad })
    }

    charger().catch(e => {
      console.error('Ma chaîne : la page n’a pas pu être composée.', e)
      if (!annule) setEchec(cle)
    })

    return () => { annule = true }
  }, [cle, user.id, profil.traduction_defaut])

  // ⚠️ L'état d'une demande PÉRIMÉE ne se rend pas : la page attend, elle ne montre pas
  // la chaîne d'avant sous un titre qui a changé.
  const pret = etat && etat.cle === cle ? etat : null
  const enEchec = echec === cle

  const compte = useMemo(() => (pret ? compterChaine(pret.groupes) : null), [pret])

  const reperes = compte && compte.versets > 0
    ? [
      accorder(compte.versets, 'verset'),
      compte.notes > 0 ? accorder(compte.notes, 'note') : null,
      compte.commentaires > 0 ? accorder(compte.commentaires, 'commentaire') : null,
    ].filter(Boolean).join(' · ')
    : 'Votre chaîne'

  const lemme = useCallback((e: EntreeChaine) => pret?.textes.get(e.canonId), [pret])

  return (
    <div className="esp-cadre">
      <SommaireEspace page="chaine" groupes={ancresChaine(pret?.groupes ?? [])} />

      <div className="esp-page">
        <style>{FEUILLE_CHAINE}</style>
        <BandeauLecteur lecteur={profil} reperes={reperes} />

        {enEchec && (
          <p className="chn-erreur">
            Vos notes et vos commentaires n’ont pas pu être chargés.{' '}
            <button type="button" className="cs-lien-phrase" onClick={() => setEssai(n => n + 1)}>Réessayer</button>.
          </p>
        )}

        {!enEchec && !pret && <MotAttente />}

        {pret && pret.groupes.length === 0 && <ChaineVide />}

        {pret && pret.groupes.length > 0 && (
          <>
            <p className="chn-avis">
              Vos notes et vos commentaires, rangés dans l’ordre du canon.
              {pret.nomTrad && <> Les versets sont donnés dans la {pret.nomTrad}.</>}
            </p>

            {pret.groupes.map(groupe => (
              <Section key={groupe.ancre} id={groupe.ancre} titre={groupe.nom}>
                {groupe.entrees.map(entree => (
                  <Entree key={entree.canonId} entree={entree} lemme={lemme(entree)} trad={pret.trad} etroit={etroit} />
                ))}
              </Section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Une entrée : le lemme, puis ses scholies ─────────────────────────────────

function Entree({ entree, lemme, trad, etroit }: {
  entree: EntreeChaine
  lemme: string | undefined
  trad: string
  etroit: boolean
}) {
  // ⚠️ Un identifiant hérité ne désigne aucun passage : sa référence ne mène nulle part,
  // et le dire par un lien mort vaudrait moins que de ne rien promettre.
  const href = entree.livre && entree.chapitre != null
    ? urlLectureBible({ livre: entree.livre, chapitre: entree.chapitre, trad, verset: entree.verset ?? undefined })
    : null

  return (
    <div className="chn-entree">
      {href
        ? <Link className="chn-ref" href={href} title="Lire le passage">{entree.reference}</Link>
        : <span className="chn-ref chn-ref--morte">{entree.reference}</span>}

      <div>
        {entree.livre && (
          lemme
            // ⛔ Le blanc SOUS le lemme se pose EN LIGNE, jamais dans la feuille :
            // `styleTexteVerset` porte `margin: 0`, et un style en ligne bat toute règle
            // de feuille sans `!important`. Mesuré sur la page servie, le lemme touchait
            // sa première scholie (0 px) quand les scholies s'écartaient de 11.
            ? <p className="chn-lemme" style={{ ...styleTexteVerset({ mobile: etroit }), marginBottom: BLANC_SOUS_LEMME }}>
              {rendreTexteEnrichi(lemme)}
            </p>
            : <p className="chn-lemme chn-absent">Absent de cette traduction</p>
        )}
        {entree.gloses.map(glose => <Scholie key={glose.cle} glose={glose} />)}
      </div>
    </div>
  )
}

function Scholie({ glose }: { glose: GloseLecteur }) {
  // ⚠️ Le texte garde ses alinéas (`pre-line`) : il ne se justifie donc jamais, il se
  // ferre et se césure (charte, § 41.4).
  const repere = [
    dateLisible(glose.date),
    glose.enReponse ? 'en réponse' : null,
    glose.enRevision ? 'en révision' : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="chn-scholie">
      <p className="chn-texte">
        <span className="chn-nature">{glose.nature === 'note' ? 'Note.' : 'Commentaire.'}</span>{' '}
        {glose.nature === 'note' ? glose.texte : rendreTexteEnrichi(glose.texte)}
      </p>
      {repere && <p className="chn-repere">{repere}</p>}
    </div>
  )
}

// ── La chaîne encore vide ────────────────────────────────────────────────────

function ChaineVide() {
  return (
    <div className="chn-vide">
      <p>Vous n’avez encore glosé aucun verset.</p>
      <p>
        Une note se prend dans la colonne de droite de la Polyglotte, et ne regarde que vous.
        Un commentaire s’écrit sous le verset, dans la Bible, et s’adresse aux autres lecteurs.
        Les deux se retrouveront ici, rangés dans l’ordre du canon.
      </p>
      <p className="chn-portes">
        <Link href="/?livre=GEN&chapitre=1">Ouvrir la Bible</Link>
        <Link href="/polyglotte">Ouvrir la Polyglotte</Link>
      </p>
    </div>
  )
}

// ── La feuille de la chaîne ──────────────────────────────────────────────────
//
// ⚠️ Elle vit dans un littéral de gabarit : nommer les propriétés entre guillemets
// français, jamais entre accents graves, qui fermeraient la chaîne.
const FEUILLE_CHAINE = `
.chn-avis { font-size: 0.71875rem; font-style: italic; color: var(--cs-texte-doux);
  line-height: 1.5; margin: -14px 0 8px; }
.chn-erreur { font-size: 0.78125rem; color: var(--cs-danger-fonce); margin: 0 0 12px; }

/* ⛔ Rien ne sépare une entrée de la suivante qu'un BLANC : ni filet, ni fond. C'est la
   règle de la manchette (charte, § 35.9), et une chaîne imprimée ne fait pas autrement. */
.chn-entree { display: grid; grid-template-columns: 7rem 1fr; gap: 0 18px; padding: 4px 0 16px; }

/* La référence tient sa colonne, et sa largeur ne suit pas son texte : quand elle la
   suivait, le fer des scholies sautait d'une entrée à l'autre. */
/* ⚠️ Le fer en tête, jamais l'étirement : un item de grille prend toute la hauteur de sa
   rangée, et le lien couvrait les cent soixante-dix pixels d'une entrée entière. Un
   soulignement qui s'allume à deux centimètres du mot ne désigne plus rien. */
.chn-ref { align-self: start; font-family: var(--font-source-serif), Georgia, serif;
  font-size: 0.8125rem; font-weight: 600; line-height: 1.35; color: var(--cs-vert);
  text-decoration: none; padding-top: 2px; }
.chn-ref:hover, .chn-ref:focus-visible { text-decoration: underline; }
.chn-ref--morte { color: var(--cs-texte-second); font-weight: normal; }

/* ⚠️ La marge basse ne sert QUE la mention d’absence : le lemme, lui, la reçoit en
   ligne, son style en ligne écrasant toute règle de feuille. */
.chn-lemme { margin: 0 0 15px; }
.chn-absent { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.78125rem;
  font-style: italic; color: var(--cs-mention); }

.chn-scholie + .chn-scholie { margin-top: 10px; }
.chn-texte { font-size: 0.78125rem; line-height: 1.5; color: var(--cs-texte); margin: 0;
  white-space: pre-line; text-align: left; hyphens: auto; -webkit-hyphens: auto;
  overflow-wrap: break-word; }
/* La marque de la scholie, à la place où une chaîne imprimée nomme son glossateur. */
.chn-nature { font-family: var(--font-source-serif), Georgia, serif; font-style: italic;
  color: var(--cs-vert); }
.chn-repere { font-size: 0.625rem; color: var(--cs-texte-second); margin: 3px 0 0; }

.chn-vide { max-width: 30rem; }
.chn-vide p { font-size: 0.78125rem; line-height: 1.5; color: var(--cs-texte-second);
  margin: 0 0 10px; }
.chn-vide p:first-child { font-family: var(--font-source-serif), Georgia, serif;
  font-size: 0.875rem; color: var(--cs-texte-fort); }
.chn-portes { display: flex; gap: 18px; flex-wrap: wrap; }
.chn-portes a { font-size: 0.71875rem; color: var(--cs-vert); text-decoration: none; }
.chn-portes a:hover { text-decoration: underline; }

/* Sous 640 px la référence passe AU-DESSUS de ce qu'elle nomme, comme l'étiquette d'une
   rangée de réglage : une colonne de 7rem ne laisserait pas la mesure au texte. */
@media (max-width: 640px) {
  .chn-entree { grid-template-columns: 1fr; gap: 3px; }
  .chn-ref { padding-top: 0; }
}
`
