// Écriture d'une archive ZIP minimale (méthode STORE, sans compression) — de quoi emballer
// un .docx (OOXML) SANS aucune dépendance. STORE est universellement lisible (Word, unzip…).
// Un .docx n'est qu'un ZIP contenant des fichiers XML à des chemins conventionnels.

import { Buffer } from 'node:buffer'

// Table CRC-32 (polynôme 0xEDB88320), calculée une fois.
const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/**
 * Crée un ZIP (méthode STORE) à partir d'entrées { nom, data }. `data` : Buffer ou string UTF-8.
 * Renvoie un Buffer (l'archive complète). Date DOS fixe (1980-01-01) → sortie déterministe.
 */
export function creerZip(entrees) {
  const items = entrees.map((e) => ({
    nom: Buffer.from(e.nom, 'utf8'),
    data: Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8'),
  }))
  const morceaux = []
  const central = []
  let offset = 0
  const DATE = 0x21 // 1980-01-01 (année 0, mois 1, jour 1) — date DOS valide
  for (const it of items) {
    const crc = crc32(it.data)
    const taille = it.data.length
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0) // signature en-tête local
    lh.writeUInt16LE(20, 4)         // version nécessaire
    lh.writeUInt16LE(0, 6)          // drapeaux
    lh.writeUInt16LE(0, 8)          // méthode 0 = STORE
    lh.writeUInt16LE(0, 10)         // heure
    lh.writeUInt16LE(DATE, 12)      // date
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(taille, 18)    // taille compressée
    lh.writeUInt32LE(taille, 22)    // taille réelle
    lh.writeUInt16LE(it.nom.length, 26)
    lh.writeUInt16LE(0, 28)         // longueur extra
    morceaux.push(lh, it.nom, it.data)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0) // signature répertoire central
    ch.writeUInt16LE(20, 4)         // version créatrice
    ch.writeUInt16LE(20, 6)         // version nécessaire
    ch.writeUInt16LE(0, 8)
    ch.writeUInt16LE(0, 10)
    ch.writeUInt16LE(0, 12)         // heure
    ch.writeUInt16LE(DATE, 14)      // date
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(taille, 20)
    ch.writeUInt32LE(taille, 24)
    ch.writeUInt16LE(it.nom.length, 28)
    ch.writeUInt16LE(0, 30)         // extra
    ch.writeUInt16LE(0, 32)         // commentaire
    ch.writeUInt16LE(0, 34)         // n° disque
    ch.writeUInt16LE(0, 36)         // attrs internes
    ch.writeUInt32LE(0, 38)         // attrs externes
    ch.writeUInt32LE(offset, 42)    // décalage de l'en-tête local
    central.push(ch, it.nom)

    offset += lh.length + it.nom.length + it.data.length
  }
  const centralBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // End Of Central Directory
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(items.length, 8)
  eocd.writeUInt16LE(items.length, 10)
  eocd.writeUInt32LE(centralBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)    // décalage du début du répertoire central
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...morceaux, centralBuf, eocd])
}
