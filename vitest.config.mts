import { defineConfig } from 'vitest/config';
import path from 'path';

// Alcance de la suite (Seccion "Validacion del sistema" de la tesis, RNF
// cobertura de tests): se cubre el nucleo de logica pura y testeable sin
// mocks pesados de base de datos o de la API externa de Mercado Libre --
// reglas de negocio (score de tendencia, rate limiting, validacion,
// sesiones), no los scripts de mineria que dependen de la red real ni las
// rutas de Next.js que dependen de Prisma en tiempo de ejecucion. Cubrir
// esos con la misma vara infla la cobertura con mocks que no prueban nada
// real; se prefiere menos superficie, bien probada, declarada explicitamente.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/rateLimit.ts',
        'src/lib/validation.ts',
        'src/lib/auth.ts',
        'scripts/compute_trend_scores.js',
      ],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
});
