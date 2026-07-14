import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Devuelve el historial de disponibilidad de endpoints de ML
// Útil para el dashboard de análisis de la tesis
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint'); // filtrar por endpoint específico
  const days = parseInt(searchParams.get('days') || '7'); // últimos N días

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Query raw porque el modelo usa executeRawUnsafe (tabla creada con SQL directo)
    let rows: any[];

    if (endpoint) {
      rows = await prisma.$queryRawUnsafe(
        `SELECT id, endpoint, label, "httpStatus", "isAvailable", "errorMsg", "latencyMs", timestamp
         FROM "EndpointHealthLog"
         WHERE endpoint = $1 AND timestamp >= $2
         ORDER BY timestamp DESC
         LIMIT 200`,
        endpoint,
        since
      );
    } else {
      rows = await prisma.$queryRawUnsafe(
        `SELECT id, endpoint, label, "httpStatus", "isAvailable", "errorMsg", "latencyMs", timestamp
         FROM "EndpointHealthLog"
         WHERE timestamp >= $1
         ORDER BY timestamp DESC
         LIMIT 500`,
        since
      );
    }

    // Agrupar por endpoint para mostrar estado actual y tendencia
    const grouped: Record<string, any> = {};
    for (const row of rows) {
      if (!grouped[row.endpoint]) {
        grouped[row.endpoint] = {
          endpoint: row.endpoint,
          label: row.label,
          checks: [],
        };
      }
      grouped[row.endpoint].checks.push({
        httpStatus: row.httpStatus,
        isAvailable: row.isAvailable,
        errorMsg: row.errorMsg,
        latencyMs: row.latencyMs,
        timestamp: row.timestamp,
      });
    }

    // Calcular estadísticas por endpoint
    const summary = Object.values(grouped).map((ep: any) => {
      const total = ep.checks.length;
      const available = ep.checks.filter((c: any) => c.isAvailable).length;
      const uptimePct = total > 0 ? ((available / total) * 100).toFixed(1) : null;
      const lastCheck = ep.checks[0] || null;
      const avgLatency =
        total > 0
          ? Math.round(
              ep.checks.reduce((sum: number, c: any) => sum + (c.latencyMs || 0), 0) / total
            )
          : null;

      return {
        endpoint: ep.endpoint,
        label: ep.label,
        currentStatus: lastCheck?.isAvailable ? 'available' : 'blocked',
        lastHttpStatus: lastCheck?.httpStatus,
        lastChecked: lastCheck?.timestamp,
        lastError: lastCheck?.errorMsg,
        uptimePct: uptimePct ? parseFloat(uptimePct) : null,
        totalChecks: total,
        avgLatencyMs: avgLatency,
        history: ep.checks.slice(0, 30), // últimas 30 lecturas para gráficos
      };
    });

    return NextResponse.json({
      since: since.toISOString(),
      days,
      endpoints: summary,
      totalLogs: rows.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error fetching health logs', details: error.message },
      { status: 500 }
    );
  }
}
