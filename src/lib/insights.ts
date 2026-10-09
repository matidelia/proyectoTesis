export type Signal = 'entrar' | 'vigilar' | 'saturado' | 'debil' | 'inactivo';

export type Freshness = 'activo' | 'reciente' | 'historico';

// Se mide por la última aparición en las capturas, no por el último score: el
// score se sigue calculando hasta 7 días después de que el producto deja de
// aparecer. Y se compara contra la última captura (no contra el reloj) para
// que una corrida fallida no vuelva "inactivo" a todo el catálogo.
export const FRESHNESS_HOURS = { active: 48, recent: 7 * 24 };

export function freshness(lastSeenAt: number, latestCaptureAt: number): Freshness {
  const hours = (latestCaptureAt - lastSeenAt) / 3600_000;
  if (hours <= FRESHNESS_HOURS.active) return 'activo';
  if (hours <= FRESHNESS_HOURS.recent) return 'reciente';
  return 'historico';
}

export const SIGNAL_RULES = {
  enterScore: 70,
  watchScore: 50,
  minRise: 5,
  saturatedSellers: 4,
};

// Cortes del índice del modelo de ML (salida 0-1 sin calibrar: no es una
// probabilidad). "alto" = umbral que en validación alcanza recall >= 0,70;
// "medio" = umbral con recall ~0,95. Deben coincidir con levels de
// ml/model_card.json (lo verifica tests/insights.test.ts).
export const ML_LEVELS = { alto: 0.4119, medio: 0.2 };

export type MlLevel = 'alto' | 'medio' | 'bajo';

export function mlLevel(index: number | null): MlLevel | null {
  if (index == null) return null;
  if (index >= ML_LEVELS.alto) return 'alto';
  if (index >= ML_LEVELS.medio) return 'medio';
  return 'bajo';
}

export type SellerTrend = 'entrando' | 'saliendo' | 'estable';

// Compara los vendedores de hoy con los del inicio de la ventana: un promedio
// esconde si la competencia está creciendo o desapareciendo.
export function sellerTrend(current: number | null, start: number | null): SellerTrend | null {
  if (current == null || start == null) return null;
  if (current > start) return 'entrando';
  if (current < start) return 'saliendo';
  return 'estable';
}

// El índice del modelo de ML prioriza productos cuyo score puede subir >= 5
// puntos en la próxima corrida: un producto que ya está arriba casi no tiene
// margen para subir, así que no se usa como veto de los scores altos, solo
// para destacar productos todavía bajos en los que el modelo y el movimiento
// reciente coinciden.
export function classifySignal({
  score,
  probability,
  sellers,
  delta72h,
}: {
  score: number;
  probability: number | null;
  sellers: number | null;
  delta72h: number | null;
}): Signal {
  if (sellers != null && sellers >= SIGNAL_RULES.saturatedSellers) return 'saturado';
  if (score >= SIGNAL_RULES.enterScore) return 'entrar';
  if (score >= SIGNAL_RULES.watchScore) return 'vigilar';
  const modelSaysUp = mlLevel(probability) === 'alto';
  const rising = delta72h != null && delta72h >= SIGNAL_RULES.minRise;
  if (modelSaysUp && rising) return 'vigilar';
  return 'debil';
}

// Diferencia entre el último score y el último punto con al menos `hours` de
// antigüedad; si la serie no llega tan atrás, se compara contra el más viejo.
export function deltaOverHours(points: { t: number; score: number }[], hours: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const cutoff = last.t - hours * 3600_000;
  let ref = points[0];
  for (const p of points) {
    if (p.t <= cutoff) ref = p;
    else break;
  }
  return Math.round((last.score - ref.score) * 10) / 10;
}
