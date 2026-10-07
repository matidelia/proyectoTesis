export type Signal = 'entrar' | 'vigilar' | 'saturado' | 'sin-senal';

export const SIGNAL_RULES = {
  enterScore: 70,
  watchScore: 50,
  minProbability: 0.5,
  minRise: 5,
  saturatedSellers: 4,
};

export type SellerTrend = 'entrando' | 'saliendo' | 'estable';

// Compara los vendedores de hoy con los del inicio de la ventana: un promedio
// esconde si la competencia está creciendo o desapareciendo.
export function sellerTrend(current: number | null, start: number | null): SellerTrend | null {
  if (current == null || start == null) return null;
  if (current > start) return 'entrando';
  if (current < start) return 'saliendo';
  return 'estable';
}

// La probabilidad del modelo de ML estima si el score va a subir >= 5 puntos
// más: un producto que ya está arriba casi no tiene margen para subir, así
// que no se usa como veto de los scores altos, solo para destacar productos
// todavía bajos que el modelo y el movimiento reciente coinciden en ver subir.
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
  const modelSaysUp = probability != null && probability >= SIGNAL_RULES.minProbability;
  const rising = delta72h != null && delta72h >= SIGNAL_RULES.minRise;
  if (modelSaysUp && rising) return 'vigilar';
  return 'sin-senal';
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
