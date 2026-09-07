/**
 * UN CONTENEUR ZIP, écrit à la main — le strict nécessaire pour un `.docx`.
 *
 * ⛔ POURQUOI PAS UNE BIBLIOTHÈQUE. `docx` (avec `jszip` et `pako`) pèse 4,5 Mo une
 * fois déballé. Les fonctions de ce projet montent déjà à quelque 240 Mo pour un
 * plafond Vercel de 250 : la marge est de dix mégaoctets, et le déploiement qui la
 * crève ÉCHOUE sans que le dépôt en dise rien (voir `next.config.ts`, et la charte
 * « Déploiement Vercel »). Un `.docx` n'est qu'une archive ZIP de fichiers XML :
 * l'écrire soi-même coûte deux cents lignes et ne pèse rien.
 *
 * ⚠️ Ce module ne sait faire qu'UNE chose : empaqueter des fichiers en mémoire, sans
 * dossier, sans chiffrement, sans Zip64. C'est assez pour un document Word, dont les
 * parties sont quelques dizaines de kilo-octets d'XML — et le corps d'une œuvre, même
 * la Somme théologique, reste très loin des quatre gigaoctets où Zip64 devient
 * obligatoire.
 *
 * ⚠️ L'HORODATAGE EST FIGÉ au 1er janvier 1980, la plus ancienne date que le format
 * MS-DOS sache écrire. Deux extractions de la même œuvre rendent ainsi le même octet :
 * une différence de fichier signale une différence de TEXTE, jamais l'heure qu'il
 * était. La date de l'extraction, elle, se lit dans le document (page de titre et
 * propriétés), là où un lecteur la cherche.
 */

import { deflateRawSync } from 'node:zlib'

/** Une entrée de l'archive : un chemin interne et son contenu. */
export type FichierZip = {
  /** Chemin dans l'archive, séparé par des barres obliques : `word/document.xml`. */
  chemin: string
  contenu: Buffer
}

const SIGNATURE_ENTREE = 0x04034b50
const SIGNATURE_CENTRALE = 0x02014b50
const SIGNATURE_FIN = 0x06054b50

/** 1980-01-01, 00:00:00, dans les deux mots de 16 bits du format MS-DOS. */
const DATE_MSDOS = (1 << 5) | 1
const HEURE_MSDOS = 0

/** `deflate` brut. Le zéro dit « stocké tel quel » ; le huit, « comprimé ». */
const METHODE_STOCKE = 0
const METHODE_DEFLATE = 8

/** Le drapeau « le nom de fichier est en UTF-8 » (bit 11). Nos chemins sont en ASCII
 *  pur, mais le poser ne coûte rien et met à l'abri d'un nom accentué. */
const DRAPEAU_UTF8 = 0x0800

const TABLE_CRC32 = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let valeur = i
    for (let bit = 0; bit < 8; bit++) {
      valeur = valeur & 1 ? 0xedb88320 ^ (valeur >>> 1) : valeur >>> 1
    }
    table[i] = valeur >>> 0
  }
  return table
})()

/** Le CRC-32 que le format ZIP attend (polynôme 0xEDB88320, réfléchi). */
export function crc32(donnees: Buffer): number {
  let reste = 0xffffffff
  for (let i = 0; i < donnees.length; i++) {
    reste = TABLE_CRC32[(reste ^ donnees[i]) & 0xff] ^ (reste >>> 8)
  }
  return (reste ^ 0xffffffff) >>> 0
}

/**
 * Assemble les fichiers en une archive ZIP.
 *
 * ⚠️ L'ORDRE DES ENTRÉES EST CELUI DU TABLEAU, et il compte pour un `.docx` :
 * `[Content_Types].xml` doit venir en tête, plusieurs lecteurs le supposant.
 * `construireDocx` s'en charge ; ce module ne réordonne rien.
 *
 * ⚠️ Une entrée n'est comprimée que si la compression FAIT GAGNER quelque chose : sur
 * quelques octets d'XML, `deflate` peut rendre plus gros que l'original, et un
 * `.docx` n'a rien à y gagner.
 */
export function construireZip(fichiers: readonly FichierZip[]): Buffer {
  const entrees: Buffer[] = []
  const centrales: Buffer[] = []
  let position = 0

  for (const fichier of fichiers) {
    const nom = Buffer.from(fichier.chemin, 'utf8')
    const brut = fichier.contenu
    const comprime = deflateRawSync(brut)
    const gagne = comprime.length < brut.length
    const donnees = gagne ? comprime : brut
    const methode = gagne ? METHODE_DEFLATE : METHODE_STOCKE
    const somme = crc32(brut)

    const enTete = Buffer.alloc(30)
    enTete.writeUInt32LE(SIGNATURE_ENTREE, 0)
    enTete.writeUInt16LE(20, 4) // version minimale pour déballer : 2.0
    enTete.writeUInt16LE(DRAPEAU_UTF8, 6)
    enTete.writeUInt16LE(methode, 8)
    enTete.writeUInt16LE(HEURE_MSDOS, 10)
    enTete.writeUInt16LE(DATE_MSDOS, 12)
    enTete.writeUInt32LE(somme, 14)
    enTete.writeUInt32LE(donnees.length, 18)
    enTete.writeUInt32LE(brut.length, 22)
    enTete.writeUInt16LE(nom.length, 26)
    enTete.writeUInt16LE(0, 28) // pas de champ « extra »
    entrees.push(enTete, nom, donnees)

    const centrale = Buffer.alloc(46)
    centrale.writeUInt32LE(SIGNATURE_CENTRALE, 0)
    centrale.writeUInt16LE(20, 4) // version de l'écrivain
    centrale.writeUInt16LE(20, 6) // version minimale pour déballer
    centrale.writeUInt16LE(DRAPEAU_UTF8, 8)
    centrale.writeUInt16LE(methode, 10)
    centrale.writeUInt16LE(HEURE_MSDOS, 12)
    centrale.writeUInt16LE(DATE_MSDOS, 14)
    centrale.writeUInt32LE(somme, 16)
    centrale.writeUInt32LE(donnees.length, 20)
    centrale.writeUInt32LE(brut.length, 24)
    centrale.writeUInt16LE(nom.length, 28)
    centrale.writeUInt16LE(0, 30) // extra
    centrale.writeUInt16LE(0, 32) // commentaire
    centrale.writeUInt16LE(0, 34) // disque de départ
    centrale.writeUInt16LE(0, 36) // attributs internes
    centrale.writeUInt32LE(0, 38) // attributs externes
    centrale.writeUInt32LE(position, 42)
    centrales.push(centrale, nom)

    position += enTete.length + nom.length + donnees.length
  }

  const repertoire = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(SIGNATURE_FIN, 0)
  fin.writeUInt16LE(0, 4) // numéro de ce disque
  fin.writeUInt16LE(0, 6) // disque où commence le répertoire
  fin.writeUInt16LE(fichiers.length, 8)
  fin.writeUInt16LE(fichiers.length, 10)
  fin.writeUInt32LE(repertoire.length, 12)
  fin.writeUInt32LE(position, 16)
  fin.writeUInt16LE(0, 20) // pas de commentaire d'archive

  return Buffer.concat([...entrees, repertoire, fin])
}
