// Rate limiter en mémoire — adapté aux routes à fort volume sans état partagé.
// Réinitialise la fenêtre glissante à chaque dépassement.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= maxRequests) return false

  bucket.count++
  return true
}
