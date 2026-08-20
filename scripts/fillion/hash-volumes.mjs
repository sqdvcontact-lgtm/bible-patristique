// Empreinte SHA-256 des huit fac-similés Fillion, sans les conserver sur disque.
//
// Chaque PDF est téléchargé en flux, haché au passage, puis jeté : la charte
// demande une empreinte, pas une copie de 536 Mo. Le MD5 déclaré par Internet
// Archive est recalculé dans le même passage et confronté au sien : c'est ce
// qui atteste que le fichier haché EST celui que la notice décrit, et non un
// transfert tronqué.
//
//   node scripts/fillion/hash-volumes.mjs [> work/fillion/empreintes.json]

import { createHash } from 'node:crypto'

const VOLUMES = [
  { tome: 1, id: 'lasaintebibletex01fill', md5: 'bf5ef6962526024cdea4e4d094da6ed7' },
  { tome: 2, id: 'lasaintebibletex02fill', md5: '2ae0e8ee1ce54b6c58bbb605c566dc4f' },
  { tome: 3, id: 'lasaintebibletex03fill', md5: '9dbc82887487a56569ab56283a4a65ad' },
  { tome: 4, id: 'lasaintebibletex04fill', md5: '3377cf1a7c3c4ad220355f97cc14eea4' },
  { tome: 5, id: 'lasaintebibletex05fill', md5: 'a0f88e2dad3560d161ea0b139cd354c8' },
  { tome: 6, id: 'lasaintebibletex06fill', md5: '0c9260013da6d5485c6fa1d39169a31d' },
  { tome: 7, id: 'lasaintebibletex07fill', md5: '269b56b69d1aa5d98128452ef683979f' },
  { tome: 8, id: 'lasaintebibletex08fill', md5: 'bef5ed681b06c5fdcbee66df6db24148' },
]

const resultats = []
for (const volume of VOLUMES) {
  const url = `https://archive.org/download/${volume.id}/${volume.id}.pdf`
  const debut = process.hrtime.bigint()
  const reponse = await fetch(url, { redirect: 'follow' })
  if (!reponse.ok || !reponse.body) {
    resultats.push({ ...volume, erreur: `HTTP ${reponse.status}` })
    console.error(`tome ${volume.tome} : HTTP ${reponse.status}`)
    continue
  }
  const sha256 = createHash('sha256')
  const md5 = createHash('md5')
  let octets = 0
  for await (const morceau of reponse.body) {
    sha256.update(morceau)
    md5.update(morceau)
    octets += morceau.length
  }
  const md5Calcule = md5.digest('hex')
  const secondes = Number(process.hrtime.bigint() - debut) / 1e9
  const resultat = {
    tome: volume.tome,
    id: volume.id,
    url,
    octets,
    sha256: sha256.digest('hex'),
    md5_calcule: md5Calcule,
    md5_declare: volume.md5,
    // ⚠️ Un MD5 discordant signifie un transfert tronqué ou un fichier remplacé :
    // l'empreinte SHA-256 ne doit alors PAS être inscrite en provenance.
    md5_concordant: md5Calcule === volume.md5,
    secondes: Number(secondes.toFixed(1)),
  }
  resultats.push(resultat)
  console.error(
    `tome ${volume.tome} : ${(octets / 1048576).toFixed(1)} Mo en ${resultat.secondes} s, `
    + `MD5 ${resultat.md5_concordant ? 'concordant' : 'DISCORDANT'}`,
  )
}

console.log(JSON.stringify(resultats, null, 2))
