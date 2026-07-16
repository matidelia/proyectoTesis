# Avances — Sesión 16 de julio de 2026

Continúa de `AVANCES_SESION_20260714.md`. Sesión de cierre del Hito 50%.

## ✅ Completado hoy

1. **Post-reinicio**: PC sana, docx destrabado, diagramas estilo simple reinsertados en el documento.
2. **Requerimientos corregidos en el docx**: RNF02 (índices reales, sin cifra inverificable), RNF03 (Render, sin contenedores), RNF05 (tokens server-side, sin "funciones administrativas"), HU05 (frecuencia vía tareas programadas).
3. **Causa raíz de la automatización muerta**: las tareas tenían defaults de desktop (`StopIfGoingOnBatteries` mataba las corridas al desenchufar; `DisallowStartIfOnBatteries` rechazaba a batería). Corregidas las 3 con `AllowStartIfOnBatteries + DontStopIfGoingOnBatteries + StartWhenAvailable` (Matías las re-registró desde PowerShell admin). Script actualizado.
4. **Cadena completa verificada por primera vez sin supervisión**: minería → backup automático (`backups/db/backup_2026-07-16_2228.json`) → RNF04 de punta a punta. Base: 58 productos, 44 snapshots, 106 precios.
5. **Score en el dashboard** (RF02/RF03/RF06): `/api/trend-scores` + `TrendScoreTable` (KPIs del wireframe, filtro por categoría, orden, export CSV). Build y runtime verificados.
6. **Dos bugs de token cazados y corregidos**: probe corría antes del refresh (falsos 401 en EndpointHealthLog) y `/api/trends` llamaba sin auth (ML ahora la exige — las tendencias del dashboard estaban vacías). Probe además usa URL dinámica para items.
7. **Scores madurando como diseña la fórmula**: productos con presencia en 2 días saltaron de ~50 a ~82/100.
8. **Demo completa en el documento**: 5 capturas insertadas (dashboard completo, panel de APIs, ranking score, Supabase TrendScore, endpoint JSON) reemplazando el bloque [PENDIENTE]. Criterio de rúbrica ✅.
9. **PRODUCCIÓN EN RENDER FUNCIONANDO**: https://proyectotesis-e4et.onrender.com/dashboard
   - Deploy automático vía push OK.
   - Fix clave: Render no tiene IPv6 y la conexión directa de Supabase es solo IPv6 → `DATABASE_URL`/`DIRECT_URL` en Render ahora usan el **Session Pooler IPv4**: `postgresql://postgres.<ref>:<pass>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`.
   - El panel web de Render tiraba "Internal Server Error" al guardar/deployar: se esquivó disparando deploys con commits vacíos + push.
10. **Limpieza final del documento**: nota roja inicial eliminada, 83 fragmentos rojos → negro, 0 rojos restantes, estilos verificados. `PFI_50_completado_CORREGIDO.docx` listo para revisión final de Matías.

## 📋 Pendientes

1. **Verificar corridas automáticas** de las 23:30 (16/7) y 08:00 (17/7) en `mining_log.txt` — primera prueba real de las tareas corregidas.
2. **Revisión final de Matías** del documento completo → entrega.
3. Decisiones abiertas: **GitHub Actions** para minería en la nube (recomendado) / **alertas HU02** (implementar simple o justificar como 75%) / **buscador en vivo** (justificar en doc o bajar protagonismo).
4. **Post-entrega (seguridad)**: rotar la contraseña de la base en Supabase (quedó expuesta en capturas de pantalla compartidas) y actualizar `.env` local + env vars de Render con la nueva.
5. Commits pendientes de push cuando se acumulen (la app en producción ya está al día).

## Estado final del sistema

| Componente | Estado |
|---|---|
| Documento PFI (`PFI_50_completado_CORREGIDO.docx`) | ✅ 8/8 criterios de rúbrica, limpio, listo para revisión final |
| Producción (Render) | ✅ Online con base conectada vía pooler IPv4 |
| Automatización local | ✅ 3 tareas diarias blindadas para notebook + backup automático |
| Base de datos | ✅ 58 productos, 44 snapshots, 23 scores, creciendo 3x/día |
| Git ↔ GitHub ↔ Render | ✅ Sincronizados |
