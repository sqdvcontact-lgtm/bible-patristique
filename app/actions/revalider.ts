'use server'
import { revalidatePath } from 'next/cache'

export async function revaliderTraductions() {
  revalidatePath('/traductions')
}
