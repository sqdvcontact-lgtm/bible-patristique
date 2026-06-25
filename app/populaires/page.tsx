import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Versets les plus lus — La Bible des Pères',
}

const NOM_LIVRE: Record<string, string> = {
  GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',JOS:'Josué',JDG:'Juges',RUT:'Ruth',
  '1SA':'1 Samuel','2SA':'2 Samuel','1KI':'1 Rois','2KI':'2 Rois','1CH':'1 Chroniques','2CH':'2 Chroniques',
  EZR:'Esdras',NEH:'Néhémie',EST:'Esther',JOB:'Job',PSA:'Psaumes',PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique des cantiques',
  ISA:'Isaïe',JER:'Jérémie',LAM:'Lamentations',EZK:'Ézéchiel',DAN:'Daniel',HOS:'Osée',JOL:'Joël',AMO:'Amos',
  OBA:'Abdias',JON:'Jonas',MIC:'Michée',NAM:'Nahum',HAB:'Habacuc',ZEP:'Sophonie',HAG:'Aggée',ZEC:'Zacharie',MAL:'Malachie',
  MAT:'Matthieu',MRK:'Marc',LUK:'Luc',JHN:'Jean',ACT:'Actes',ROM:'Romains','1CO':'1 Corinthiens','2CO':'2 Corinthiens',
  GAL:'Galates',EPH:'Éphésiens',PHP:'Philippiens',COL:'Colossiens','1TH':'1 Thessaloniciens','2TH':'2 Thessaloniciens',
  '1TI':'1 Timothée','2TI':'2 Timothée',TIT:'Tite',PHM:'Philémon',HEB:'Hébreux',JAS:'Jacques','1PE':'1 Pierre','2PE':'2 Pierre',
  '1JN':'1 Jean','2JN':'2 Jean','3JN':'3 Jean',JUD:'Jude',REV:'Apocalypse',
}

export default async function PopulairesPage() {
  const { data } = await supabase
    .from('versets_plus_lus')
    .select('id_verset, livre, chapitre, verset, TR0002, nb_lectures')
    .limit(50)

  const versets = data ?? []

  return (
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 'normal', color: '#1e2e24', marginBottom: '8px', textAlign: 'center' }}>
          Versets les plus lus
        </h1>
        <p style={{ fontSize: '11.5px', color: '#9a958d', textAlign: 'center', marginBottom: '32px', fontStyle: 'italic' }}>
          Classement établi à partir des consultations sur le site.
        </p>

        {versets.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>
            Aucune donnée pour l'instant.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {versets.map((v: any, i: number) => (
              <Link key={v.id_verset} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: '12px', padding: '10px 14px',
                  background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', textDecoration: 'none',
                }}>
                <span style={{ fontSize: '11px', color: '#b0a89e', fontWeight: 600, width: '20px', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#2a3d30', margin: '0 0 2px' }}>
                    {NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}
                  </p>
                  <p style={{ fontSize: '12px', color: '#5a5450', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.TR0002}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: '#9a958d', flexShrink: 0 }}>{v.nb_lectures} lecture{v.nb_lectures > 1 ? 's' : ''}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}