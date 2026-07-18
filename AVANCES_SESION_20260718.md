# Avances — Sesión 18 de julio de 2026

Continúa de `AVANCES_SESION_20260716.md`.

## ✅ Completado

### Documento PFI (cerrado, pendiente solo lectura final de Matías)
1. **Encuesta ampliada a 120 respuestas**: texto y análisis actualizados (15 datos nuevos verificados, 10 viejos eliminados) + 4 capturas nuevas del Forms reemplazando las viejas. Hallazgos que cambiaron la interpretación: recomendaciones+redes desplazan al precio (compradores), percepción ALTA de repetición de destacados (3,8/5), detección tardía 88,9% combinado. User persona Luciana actualizada en coherencia.
2. **Entrevistas en profundidad diseñadas** (subsección nueva post-encuesta): 2 vendedores (una guía enfocada en la problemática, otra en validar la solución mostrando el dashboard) + 1 comprador (señales sociales). 10 preguntas exactas c/u, usuarios comunes. Kit de campo aparte: `Entrevistas_UserResearch_MercadoLibre.docx` (con renglones para notas). **PENDIENTE: realizarlas e integrar hallazgos.**
3. **Índice actualizado**: es un campo TOC automático; Matías lo actualizó en Word (todas las secciones nuevas verificadas dentro del campo). Incidente: mi intento de updateFields automático corrompió el archivo (orden del esquema XML) — revertido y resuelto con actualización manual. El doc abre y guarda perfecto.
4. **Párrafo de los dos carriles** agregado en Arquitectura General (justifica el buscador en vivo como decisión de diseño).
5. Verificación de integridad completa post-Word: 12 tablas correctas (la "13ª" era un residuo vacío que Word limpió), 15 imágenes, 30 preguntas de entrevistas, cero rojos.

### Sistema
6. **Alertas HU02 implementadas**: la API devuelve score anterior + delta + flag `growing` (umbral +5 puntos); badge 🔥 con tooltip en la tabla + KPI "En crecimiento". Probado: 19 productos en crecimiento detectados. Pusheado y desplegado.
7. **MINERÍA EN LA NUBE (GitHub Actions) FUNCIONANDO**:
   - Workflow `.github/workflows/mineria.yml`: 3 crons diarios (11:00/19:00/02:30 UTC = 08:00/16:00/23:30 ART) + workflow_dispatch. Cadena completa: minería → scores → backup → artefacto (retención 30 días).
   - 4 secrets cargados por Matías (DATABASE_URL/DIRECT_URL con **pooler IPv4**, ML_APP_ID, ML_CLIENT_SECRET).
   - Corrida #1 falló: **`dotenv` no estaba declarado como dependencia** — localmente se resolvía de casualidad desde un `node_modules` suelto en `Downloads/`. Fix: `npm install dotenv` + commit.
   - Corrida #2: **SUCCESS en ~54 min**. Verificado: +23 snapshots en Supabase, scores recalculados por la nube, artefacto de backup publicado.
   - Repo es público → minutos de Actions ilimitados y gratis.

## 📋 Pendientes

1. **Matías (admin PowerShell): borrar las 3 tareas locales** para no duplicar datos con la nube:
   `schtasks /delete /tn "MercadoLibre_Mining_0800" /f` (y _1600, _2330).
2. **Matías: realizar las 3 entrevistas** → traer respuestas → integrar hallazgos en la subsección del PFI.
3. **Matías: lectura final del documento completo** → entrega del 50%.
4. Commitear/pushear esta bitácora y verificar mañana la primera corrida programada de la nube (08:00 ART = corre sola, ver pestaña Actions).
5. Post-entrega: **rotar la contraseña de Supabase** (expuesta en capturas) → actualizar `.env` local, secrets de GitHub y env vars de Render.
6. Idea para el 75%: monitorear fallos del workflow (GitHub avisa por mail al dueño del repo si un cron falla — verificar que las notificaciones estén activas).

## Arquitectura final desplegada (para el diagrama de despliegue del 75%)

- **GitHub Actions**: captura automatizada 3x/día + cálculo de scores + backup como artefacto.
- **Supabase (PostgreSQL)**: base histórica, accesible por pooler IPv4 desde las nubes y por conexión directa desde local.
- **Render**: aplicación web (dashboard + API REST) con auto-deploy desde GitHub.
- **Local**: desarrollo + minería manual opcional + backups JSON locales.
