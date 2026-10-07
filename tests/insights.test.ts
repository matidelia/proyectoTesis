import { describe, it, expect } from 'vitest';
import { classifySignal, deltaOverHours } from '@/lib/insights';

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
    expect(classifySignal({ ...base, score: 30, probability: 0.6, delta72h: -20 })).toBe('sin-senal');
    expect(classifySignal({ ...base, score: 30, probability: 0.2, delta72h: 8 })).toBe('sin-senal');
  });

  it('sin señal para score bajo sin datos adicionales', () => {
    expect(classifySignal({ ...base, score: 30 })).toBe('sin-senal');
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
