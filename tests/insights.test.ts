import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { classifySignal, deltaOverHours, freshness, ML_LEVELS, mlLevel, sellerTrend } from '@/lib/insights';

describe('mlLevel', () => {
  it('usa los mismos cortes que el modelo entrenado (ml/model_card.json)', () => {
    const card = JSON.parse(readFileSync(path.join(__dirname, '..', 'ml', 'model_card.json'), 'utf-8'));
    expect(ML_LEVELS).toEqual(card.levels);
  });

  it('clasifica el índice en alto, medio y bajo', () => {
    expect(mlLevel(ML_LEVELS.alto)).toBe('alto');
    expect(mlLevel(ML_LEVELS.alto - 0.01)).toBe('medio');
    expect(mlLevel(ML_LEVELS.medio)).toBe('medio');
    expect(mlLevel(0.05)).toBe('bajo');
    expect(mlLevel(null)).toBeNull();
  });
});

describe('freshness', () => {
  const h = 3600_000;
  const run = 1_000 * h;

  it('activo si apareció en las últimas 48 h respecto de la última captura', () => {
    expect(freshness(run, run)).toBe('activo');
    expect(freshness(run - 48 * h, run)).toBe('activo');
  });

  it('reciente si dejó de aparecer dentro de la ventana de 7 días', () => {
    expect(freshness(run - 49 * h, run)).toBe('reciente');
    expect(freshness(run - 168 * h, run)).toBe('reciente');
  });

  it('histórico pasados los 7 días', () => {
    expect(freshness(run - 169 * h, run)).toBe('historico');
  });
});

describe('sellerTrend', () => {
  it('detecta vendedores saliendo aunque el promedio de la ventana sea alto', () => {
    expect(sellerTrend(1, 5)).toBe('saliendo');
  });

  it('detecta vendedores entrando', () => {
    expect(sellerTrend(4, 1)).toBe('entrando');
  });

  it('estable si no cambió', () => {
    expect(sellerTrend(2, 2)).toBe('estable');
  });

  it('sin dato si falta alguna de las dos capturas', () => {
    expect(sellerTrend(null, 3)).toBeNull();
    expect(sellerTrend(3, null)).toBeNull();
  });
});

describe('classifySignal', () => {
  const base = { probability: null, sellers: null, delta72h: null };

  it('marca como saturado con 4 o más vendedores, aunque el score sea alto', () => {
    expect(classifySignal({ ...base, score: 95, sellers: 4 })).toBe('saturado');
    expect(classifySignal({ ...base, score: 95, sellers: 5 })).toBe('saturado');
  });

  it('recomienda entrar con score alto y poca competencia', () => {
    expect(classifySignal({ ...base, score: 80, sellers: 1 })).toBe('entrar');
    expect(classifySignal({ ...base, score: 70, sellers: 3 })).toBe('entrar');
  });

  it('no usa una probabilidad de ML baja como veto de un score alto', () => {
    expect(classifySignal({ ...base, score: 94, probability: 0.04, sellers: 1 })).toBe('entrar');
  });

  it('sin dato de vendedores no lo marca como saturado', () => {
    expect(classifySignal({ ...base, score: 75 })).toBe('entrar');
  });

  it('vigila scores medios', () => {
    expect(classifySignal({ ...base, score: 55 })).toBe('vigilar');
  });

  it('vigila scores bajos solo si el modelo y el movimiento reciente coinciden', () => {
    expect(classifySignal({ ...base, score: 30, probability: 0.6, delta72h: 8 })).toBe('vigilar');
    expect(classifySignal({ ...base, score: 30, probability: 0.6, delta72h: -20 })).toBe('debil');
    expect(classifySignal({ ...base, score: 30, probability: 0.2, delta72h: 8 })).toBe('debil');
  });

  it('señal débil para score bajo sin datos adicionales', () => {
    expect(classifySignal({ ...base, score: 30 })).toBe('debil');
  });
});

describe('deltaOverHours', () => {
  const h = 3600_000;

  it('devuelve null con menos de dos puntos', () => {
    expect(deltaOverHours([], 72)).toBeNull();
    expect(deltaOverHours([{ t: 0, score: 50 }], 72)).toBeNull();
  });

  it('compara contra el último punto con la antigüedad pedida', () => {
    const points = [
      { t: 0, score: 40 },
      { t: 10 * h, score: 50 },
      { t: 80 * h, score: 70 },
    ];
    // corte = 80h - 72h = 8h → referencia: punto en 0h
    expect(deltaOverHours(points, 72)).toBe(30);
    // corte = 80h - 24h = 56h → referencia: punto en 10h
    expect(deltaOverHours(points, 24)).toBe(20);
  });

  it('usa el punto más viejo si la serie no cubre la ventana', () => {
    const points = [
      { t: 0, score: 60 },
      { t: 5 * h, score: 55.55 },
    ];
    expect(deltaOverHours(points, 72)).toBe(-4.5);
  });
});
