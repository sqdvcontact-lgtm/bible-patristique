'use server'
import { revalidatePath } from 'next/cache'
import { estAdmin } from '@/app/lib/verifAdmin'

// Réservé à l’administrateur : une action serveur est appelable par tout compte,
// et vider le cache en boucle coûterait du calcul.

export async function revaliderTraductions() {
  if (!(await estAdmin())) return
  revalidatePath('/traductions')
}

export async function revaliderBibliotheque() {
  if (!(await estAdmin())) return
  revalidatePath('/bibliotheque')
}
