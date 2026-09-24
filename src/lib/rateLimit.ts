// Rate limiting en memoria para /api/account/*. Alcanza porque el servicio
// corre en una sola instancia (Render free tier, sin escalado horizontal);
// si en algún momento se agregan más instancias, esto debería migrar a un
// store compartido (ej. Redis) porque cada instancia tendría su propio mapa.
const attempts = new Map<string, { count: number; resetAt: number }>();

// Limpieza periódica para no acumular memoria indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

/**
 * Devuelve true si la acción está permitida (y la registra), false si se
 * superó el límite dentro de la ventana de tiempo.
 */
export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
