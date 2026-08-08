#!/usr/bin/env node
// La Gueule — atelier d'océrisation local de Corpus Scriptura.
// L'atelier de relecture (serve) est LE produit ; ce CLI ne fait que le lancer et
// diagnostiquer l'environnement. Brouillons candidats uniquement (charte §14).

import { parseArgs } from 'node:util'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

import { demarrer, diagnostic } from '../src/serve.mjs'

const AIDE = `La Gueule — atelier d'océrisation local (charte §14). Candidats uniquement.

Usage :
  gueule serve [--open] [--port N]   Lance l'atelier de relecture (fenêtre d'application)
  gueule doctor                      Diagnostique l'environnement (WSL, Kraken, Tesseract)

L'océrisation se fait dans l'atelier : http://127.0.0.1:4599/atelier.html
`

function opts() {
  return parseArgs({
    allowPositionals: true,
    options: { port: { type: 'string' }, open: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  })
}

function ouvrirFenetre(url) {
  const chromes = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ]
  const chrome = chromes.find((c) => c && existsSync(c))
  if (chrome) spawn(chrome, [`--app=${url}`, '--window-size=1024,760'], { detached: true, stdio: 'ignore' }).unref()
  else spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref() // repli navigateur système
}

async function cmdServe(values) {
  const port = values.port ? Number(values.port) : 4599
  const { url, dejaEnEcoute } = await demarrer({ port })
  if (values.open) ouvrirFenetre(url + 'atelier.html')
  if (dejaEnEcoute) { console.log(`La Gueule tournait déjà : ${url}${values.open ? ' — fenêtre ouverte.' : ''}`); return }
  console.log(`La Gueule est en écoute : ${url}`)
  console.log(values.open ? "Fenêtre de l'application ouverte." : 'Ajoute --open pour ouvrir la fenêtre.')
  console.log('(Ctrl+C pour arrêter.)')
}

async function cmdDoctor() {
  console.log("La Gueule — diagnostic d'environnement\n")
  const d = await diagnostic() // MÊME sonde que le serveur : Kraken/Tesseract cherchés DANS WSL
  console.log(`  node       ✓ ${d.node}`)
  for (const [nom, o] of Object.entries(d.outils)) {
    console.log(`  ${nom.padEnd(10)} ${o.present ? '✓' : '✗'} ${o.present ? o.detail : '(absent)'}`)
  }
  const manque = ['wsl', 'kraken', 'tesseract'].filter((n) => !d.outils[n]?.present)
  console.log(manque.length ? `\n⚠ Manquant(s) : ${manque.join(', ')} — voir scripts/installer-wsl.sh` : '\nTout est prêt pour océriser.')
}

async function main() {
  const { values, positionals } = opts()
  const cmd = positionals[0]
  if (values.help || !cmd || cmd === 'help') { console.log(AIDE); return }
  if (cmd === 'serve') return cmdServe(values)
  if (cmd === 'doctor') return cmdDoctor()
  throw new Error(`commande inconnue : « ${cmd} ». Voir : gueule --help`)
}

main().catch((e) => { console.error('Erreur : ' + (e?.message ?? e)); process.exitCode = 1 })
