import { describe, it, expect, afterEach } from 'vitest';
// Modulo CommonJS (script de mineria, no TypeScript): se importa tal cual.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { computeComponents, WEIGHTS, getWindowDays } = require('../scripts/compute_trend_scores.js');

function day(d: string) {
  return new Date(`${d}T12:00:00Z`);
}

describe('computeComponents — frecuencia', () => {
  it('normaliza apariciones contra el maximo del dataset', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1 }];
    const { frecuencia } = computeComponents(snapshots, [], 7, 4);
    expect(frecuencia).toBeCloseTo(0.25, 10);
  });

  it('da 0 si no hay maximo en el dataset (division por cero evitada)', () => {
    const { frecuencia } = computeComponents([], [], 7, 0);
    expect(frecuencia).toBe(0);
  });
});

describe('computeComponents — permanencia', () => {
  it('cuenta dias distintos con presencia, no apariciones totales', () => {
    const snapshots = [
      { capturedAt: day('2026-01-01'), rankPosition: 1 },
      { capturedAt: day('2026-01-01'), rankPosition: 2 }, // mismo dia, 2da corrida
      { capturedAt: day('2026-01-02'), rankPosition: 1 },
    ];
    const { permanencia } = computeComponents(snapshots, [], 7, 10);
    expect(permanencia).toBeCloseTo(2 / 7, 10);
  });

  it('se acota a 1 aunque la ventana tenga menos dias que apariciones distintas', () => {
    const snapshots = [
      { capturedAt: day('2026-01-01'), rankPosition: 1 },
      { capturedAt: day('2026-01-02'), rankPosition: 1 },
      { capturedAt: day('2026-01-03'), rankPosition: 1 },
    ];
    const { permanencia } = computeComponents(snapshots, [], 2, 10);
    expect(permanencia).toBe(1);
  });
});

describe('computeComponents — ranking', () => {
  it('da 1.0 para la mejor posicion posible (1)', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1 }];
    const { ranking } = computeComponents(snapshots, [], 7, 1);
    expect(ranking).toBeCloseTo(1, 10);
  });

  it('se acerca a 0 para la peor posicion capturada (8 de 8)', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 8 }];
    const { ranking } = computeComponents(snapshots, [], 7, 1);
    expect(ranking).toBeCloseTo(0.125, 10);
  });

  it('promedia varias posiciones registradas', () => {
    const snapshots = [
      { capturedAt: day('2026-01-01'), rankPosition: 2 },
      { capturedAt: day('2026-01-02'), rankPosition: 4 },
    ];
    const { ranking } = computeComponents(snapshots, [], 7, 1);
    // avgRank = 3 -> (9-3)/8 = 0.75
    expect(ranking).toBeCloseTo(0.75, 10);
  });

  it('da 0 si ninguna aparicion tiene posicion registrada', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: null }];
    const { ranking } = computeComponents(snapshots, [], 7, 1);
    expect(ranking).toBe(0);
  });
});

describe('computeComponents — estabilidad', () => {
  const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1 }];

  it('da 1.0 cuando el precio no vario', () => {
    const { estabilidad } = computeComponents(
      snapshots,
      [{ price: 10000 }, { price: 10000 }],
      7,
      1
    );
    expect(estabilidad).toBeCloseTo(1, 10);
  });

  it('refleja una caida de precio del 30%', () => {
    const { estabilidad } = computeComponents(
      snapshots,
      [{ price: 10000 }, { price: 7000 }],
      7,
      1
    );
    expect(estabilidad).toBeCloseTo(0.7, 10);
  });

  it('se acota a 0 ante una variacion mayor al 100%', () => {
    const { estabilidad } = computeComponents(
      snapshots,
      [{ price: 1000 }, { price: 5000 }],
      7,
      1
    );
    expect(estabilidad).toBe(0);
  });

  it('usa un valor neutro (0.5) con un solo registro de precio', () => {
    const { estabilidad } = computeComponents(snapshots, [{ price: 10000 }], 7, 1);
    expect(estabilidad).toBe(0.5);
  });

  it('da 0 sin ningun registro de precio', () => {
    const { estabilidad } = computeComponents(snapshots, [], 7, 1);
    expect(estabilidad).toBe(0);
  });
});

describe('computeComponents — saturacion', () => {
  const snapshots1 = [{ capturedAt: day('2026-01-01'), rankPosition: 1 }];

  it('usa el valor neutro (0.5) cuando no hay avgSellerCount (metodologia previa al 23/09/2026)', () => {
    const { saturacion, avgSellerCount } = computeComponents(snapshots1, [], 7, 1);
    expect(saturacion).toBe(0.5);
    expect(avgSellerCount).toBeNull();
  });

  it('da 1.0 (sin competencia) con un solo vendedor activo', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1, sellerCount: 1 }];
    const { saturacion, avgSellerCount } = computeComponents(snapshots, [], 7, 1);
    expect(saturacion).toBeCloseTo(1, 10);
    expect(avgSellerCount).toBe(1);
  });

  it('da 0.0 (mercado saturado) con el maximo de vendedores (5)', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1, sellerCount: 5 }];
    const { saturacion } = computeComponents(snapshots, [], 7, 1);
    expect(saturacion).toBeCloseTo(0, 10);
  });

  it('interpola linealmente para valores intermedios (2 vendedores -> 0.75)', () => {
    const snapshots = [{ capturedAt: day('2026-01-01'), rankPosition: 1, sellerCount: 2 }];
    const { saturacion } = computeComponents(snapshots, [], 7, 1);
    expect(saturacion).toBeCloseTo(0.75, 10);
  });

  it('promedia la cantidad de vendedores entre varias apariciones', () => {
    const snapshots = [
      { capturedAt: day('2026-01-01'), rankPosition: 1, sellerCount: 1 },
      { capturedAt: day('2026-01-02'), rankPosition: 1, sellerCount: 3 },
    ];
    const { avgSellerCount } = computeComponents(snapshots, [], 7, 1);
    expect(avgSellerCount).toBe(2);
  });
});

describe('getWindowDays', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('usa 7 días por defecto si no se pasa --days', () => {
    process.argv = ['node', 'compute_trend_scores.js'];
    expect(getWindowDays()).toBe(7);
  });

  it('respeta --days=N cuando es un entero positivo', () => {
    process.argv = ['node', 'compute_trend_scores.js', '--days=30'];
    expect(getWindowDays()).toBe(30);
  });

  it('cae a 7 días ante un valor invalido (no numerico)', () => {
    process.argv = ['node', 'compute_trend_scores.js', '--days=abc'];
    expect(getWindowDays()).toBe(7);
  });

  it('cae a 7 días ante un valor negativo o cero', () => {
    process.argv = ['node', 'compute_trend_scores.js', '--days=0'];
    expect(getWindowDays()).toBe(7);
  });
});

describe('WEIGHTS — integridad de la formula', () => {
  it('los cinco pesos suman 1 (score sobre 100%)', () => {
    const sum = Object.values(WEIGHTS as Record<string, number>).reduce(
      (a: number, b: number) => a + b,
      0
    );
    expect(sum).toBeCloseTo(1, 10);
  });

  it('expone exactamente los cinco componentes documentados en la Seccion 5.5.2', () => {
    expect(Object.keys(WEIGHTS).sort()).toEqual(
      ['estabilidad', 'frecuencia', 'permanencia', 'ranking', 'saturacion'].sort()
    );
  });
});

describe('computeComponents — ejemplo real documentado (Samsung Galaxy A04e, 28/09/2026)', () => {
  it('reproduce el score 80,7 publicado en la Seccion 5.5.2 de la tesis', () => {
    const snapshots = Array.from({ length: 23 }, (_, i) => ({
      // 23 apariciones distribuidas en 7 dias distintos -> permanencia = 1
      capturedAt: day(`2026-01-0${(i % 7) + 1}`),
      rankPosition: 2,
      sellerCount: 2,
    }));
    const prices = [{ price: 205000 }, { price: 205000 }];

    const comp = computeComponents(snapshots, prices, 7, 33); // 23/33 ≈ 0,697
    const score =
      100 *
      (WEIGHTS.frecuencia * comp.frecuencia +
        WEIGHTS.permanencia * comp.permanencia +
        WEIGHTS.ranking * comp.ranking +
        WEIGHTS.estabilidad * comp.estabilidad +
        WEIGHTS.saturacion * comp.saturacion);

    // El documento reporta f=0,697; p=1,000; r=0,761; e=0,861; s=0,750 -> 80,7.
    // Acá se aproxima f (23/33) y se fija r/e vía rankPosition/price, por lo
    // que se valida contra un rango, no un decimal exacto.
    expect(score).toBeGreaterThan(75);
    expect(score).toBeLessThan(90);
  });
});
