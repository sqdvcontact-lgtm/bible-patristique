'use client'

// Liste de tâches éditable du centre de contrôle.
// Rendu identique au repos ; au survol de chaque ligne, deux actions discrètes
// apparaissent (modifier, supprimer). On peut cocher/décocher, éditer en place
// (double-clic ou crayon) et ajouter une tâche. Chaque changement est optimiste
// puis persisté via /api/admin/controle-todos ; en cas d'échec, on revient en arrière.
import { useState } from 'react'

export type Todo = { texte: string; fait: boolean }

export default function TodosControle({ cle, initial }: { cle: string; initial: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initial ?? [])
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [brouillon, setBrouillon] = useState('')
  const [ajout, setAjout] = useState(false)
  const [nouveau, setNouveau] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const faits = todos.filter((t) => t.fait).length

  async function persister(suivant: Todo[]) {
    const avant = todos
    setTodos(suivant)
    setErreur(null)
    setEnvoi(true)
    try {
      const r = await fetch('/api/admin/controle-todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cle, todos: suivant }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || 'Échec de l’enregistrement.')
      }
    } catch (e) {
      setTodos(avant)
      setErreur(e instanceof Error ? e.message : 'Erreur d’enregistrement.')
    } finally {
      setEnvoi(false)
    }
  }

  const basculer = (i: number) => persister(todos.map((t, k) => (k === i ? { ...t, fait: !t.fait } : t)))
  const supprimer = (i: number) => persister(todos.filter((_, k) => k !== i))

  function ouvrirEdition(i: number) {
    setBrouillon(todos[i].texte)
    setEditIndex(i)
  }
  function validerEdition() {
    if (editIndex === null) return
    const i = editIndex
    const t = brouillon.trim()
    setEditIndex(null)
    if (!t) return supprimer(i)
    if (t === todos[i].texte) return
    persister(todos.map((td, k) => (k === i ? { ...td, texte: t } : td)))
  }
  function ajouter() {
    const t = nouveau.trim()
    setNouveau('')
    setAjout(false)
    if (t) persister([...todos, { texte: t, fait: false }])
  }

  return (
    <div className="cc-todos">
      <div className="cc-todos-tete">
        À faire <span className="cc-todos-compte">{faits}/{todos.length}</span>
      </div>

      <ul className="cc-todos-liste">
        {todos.map((t, i) => (
          <li key={i} className={t.fait ? 'cc-todo cc-todo-fait' : 'cc-todo'}>
            <button
              type="button"
              className="cc-todo-case"
              onClick={() => basculer(i)}
              disabled={envoi}
              aria-label={t.fait ? 'Marquer à faire' : 'Marquer comme fait'}
              title={t.fait ? 'Marquer à faire' : 'Marquer comme fait'}
            >
              {t.fait ? '✓' : ''}
            </button>

            {editIndex === i ? (
              <textarea
                className="cc-todo-input"
                autoFocus
                rows={2}
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                onBlur={validerEdition}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    validerEdition()
                  } else if (e.key === 'Escape') {
                    setEditIndex(null)
                  }
                }}
              />
            ) : (
              <>
                <span className="cc-todo-txt" onDoubleClick={() => ouvrirEdition(i)}>
                  {t.texte}
                </span>
                <span className="cc-todo-actions">
                  <button type="button" className="cc-todo-btn" onClick={() => ouvrirEdition(i)} aria-label="Modifier" title="Modifier">✎</button>
                  <button type="button" className="cc-todo-btn cc-todo-btn-suppr" onClick={() => supprimer(i)} aria-label="Supprimer" title="Supprimer">×</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="cc-todo-ajout">
        {ajout ? (
          <textarea
            className="cc-todo-input"
            autoFocus
            rows={2}
            placeholder="Nouvelle tâche…"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            onBlur={ajouter}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ajouter()
              } else if (e.key === 'Escape') {
                setNouveau('')
                setAjout(false)
              }
            }}
          />
        ) : (
          <button type="button" className="cc-todo-ajout-btn" onClick={() => setAjout(true)}>+ Ajouter une tâche</button>
        )}
      </div>

      {erreur && <div className="cc-todo-erreur">{erreur}</div>}
    </div>
  )
}
