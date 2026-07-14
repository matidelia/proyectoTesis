# Análisis de Alineación: Tesis (Hito 50%) vs. Código

**Fecha:** 13 de julio de 2026
**Documento de referencia:** `PFI_50_completado.docx` (versión con agregados en rojo para el Hito 50%)
**Dato clave:** el 25% ya entregado = el mismo documento **sin** el texto rojo. El texto rojo es nuevo y el tribunal nunca lo vio.

---

## 1. Comparación Tesis vs. Código

### ✅ Lo que ya coincide

| Tesis | Código |
|---|---|
| RF01: Captura periódica vía API oficial | `scripts/mine_carril1.js` + Windows Task Scheduler, 3x/día |
| Persistencia PostgreSQL con histórico | Supabase + Prisma: `Product`, `PriceHistory` |
| Monitoreo de endpoints (Alcance) | `EndpointHealthLog` + `EndpointHealthDashboard.tsx` |
| Dashboard web con gráficos | `src/app/dashboard/page.tsx` + `PriceChartClient.tsx` + `TrendsDashboard.tsx` |
| Sin scraping, solo endpoints oficiales | Correcto: solo `api.mercadolibre.com` con OAuth2 |

### ❌ Lo que la tesis promete y el código NO tiene

1. **RF02 — Score de tendencia por producto**: no existe (cero menciones a "score" en `src/`). Es el corazón del sistema según la tesis (clase `MetricaTendencia`, wireframe con "Score de tendencia: 87/100").
2. **Categorías**: el modelo `Product` de Prisma no guarda categoría. La tesis la usa en el UML, el ER, los filtros (RF03) y el KPI "Categoría top".
3. **RegistroTemporal / frecuencia de aparición**: las métricas principales de la tesis (frecuencia, permanencia, crecimiento porcentual, variación de publicaciones). Hoy solo se guarda evolución de precio.
4. **RF03 — Filtros por categoría, score y variación**: imposible sin score ni categoría.
5. **RF06 — Exportar CSV**: no existe.
6. **HU02 — Alertas de productos en crecimiento**: no existe.
7. **Sección DEMO del documento**: pendiente de capturas reales.

### ⚠️ Conflicto de stack

| El documento dice | El código real es |
|---|---|
| Backend: Python + FastAPI | Next.js API Routes (TypeScript) |
| Captura: Python | Node.js (`scripts/mine_carril1.js`) |
| Análisis: Pandas + Scikit-Learn | No hay motor analítico todavía |
| Frontend: React + TypeScript | ✅ Coincide (Next.js **es** React + TS) |
| PostgreSQL | ✅ Coincide (Supabase es PostgreSQL) |

### ➕ Lo que el código tiene "de más" (no está en la tesis)

- **Buscador en vivo del dashboard** (Carril 2, `/api/search`): defendible vía HU03/HU04, pero decidir si se justifica en el doc o se baja de protagonismo.
- `SearchHistory`, minería de watchlist (`mine_watchlist.js`), flujo OAuth (justificable como parte del pipeline).

---

## 2. Pasajes marcados en verde (stack divergente)

Se generó **`C:\Users\usuario\Downloads\PFI_50_completado_STACK_MARCADO.docx`** con 8 pasajes resaltados:

| # | Dónde | Dice | ¿Estaba en el 25%? |
|---|---|---|---|
| 1 | Tabla stack — Backend | Python + FastAPI | ✅ Sí (negro) |
| 2 | Tabla stack — Captura | Python + consultas a API | ✅ Sí (negro) |
| 3 | Tabla stack — Análisis | Pandas + Scikit-Learn | ✅ Sí (negro) |
| 4 | Diagrama de componentes | "CAPTURA... (Python...)" | ✅ Sí (negro) |
| 5 | Diagrama de componentes | "BACKEND API (FastAPI...)" | ✅ Sí (negro) |
| 6 | RF04 | "API REST (FastAPI)" | ❌ No (rojo, nuevo) |
| 7 | Sección DEMO | "FastAPI... Swagger/Postman" | ❌ No (rojo, nuevo) |
| 8 | Gantt | "Desarrollo del backend con FastAPI" | ✅ Sí (negro) |

**Implicancia:** los pasajes nuevos (6 y 7) se escriben directamente con el stack real, sin nada que justificar. Solo los pasajes del 25% (tabla, componentes, Gantt) requieren justificación del cambio.

---

## 3. Evaluación contra la rúbrica del 50%

| # | Criterio | Estado | Detalle |
|---|---|---|---|
| 1 | Requerimientos | ✅ Cumple | HU01–HU05 + RF01–RF06 + RNF01–RNF05 completos |
| 2 | Mockups | ✅ Cumple (con tarea) | 2 wireframes; adoptarlos como propios o rehacerlos |
| 3 | Diagramas | ⚠️ Riesgo menor | UML de clases OK; el de componentes es una tabla con flechas ↓ — conviene rehacerlo como diagrama gráfico con sintaxis clara |
| 4 | Competencias | ✅ Cumple | FODA + Cruz de Porter + Triple P |
| 5 | Tecnologías | ⚠️ Riesgo de coherencia | Stack explicado, pero difiere del real |
| 6 | Modelo de datos | ⚠️ Riesgo de coherencia | ER existe, pero la rúbrica exige que refleje "fielmente la implementación" y el ER no coincide con el schema de Prisma |
| 7 | **Demo** | ❌ **NO cumple hoy** | Sección `[PENDIENTE DE COMPLETAR CON CAPTURAS REALES]`. Un criterio incumplido puede comprometer la aprobación |
| 8 | Tabla comparativa | ✅ Cumple | Google Trends / Keepa / Insights internos / propuesta |

**Prioridad #1: la Demo.** El sistema ya funciona (minería 3x/día, Supabase con datos, dashboard operativo); solo falta capturarlo.

**Riesgo de coherencia:** si la Demo muestra capturas de Next.js/Prisma pero el texto dice FastAPI/Python y el ER muestra tablas inexistentes (`REGISTRO_TEMPORAL`, `METRICA_TENDENCIA`), un evaluador atento lo nota. Actualizar el stack en el documento es casi obligatorio, no opcional.

---

## 4. Decisión de stack: recomendación

**Adaptar el documento al stack real, NO el código al documento.**

### Por qué NO migrar el código a FastAPI/Python

1. **Costo enorme, ganancia nula**: el sistema funciona (OAuth2 con refresco, minería automática, dashboard con datos). Reescribirlo son semanas para terminar donde ya estás, con riesgo de romper la demo antes de la entrega.
2. **Se pierde el activo más valioso**: el dataset histórico crece con el tiempo. Frenar el pipeline para reescribir va contra la tesis misma (el propio doc dice que "el valor del dataset aumentará a medida que el sistema acumule registros").
3. **La rúbrica no pide un stack en particular**: pide *justificar* la elección. Evalúa la justificación, no la tecnología.

### Por qué el cambio es defendible

1. **La cláusula de escape ya estaba en el 25% (texto negro)**: *"El stack tecnológico se define de manera **preliminar**... sin cerrar completamente futuras modificaciones de implementación"*. El tribunal ya leyó y aceptó que el stack podía cambiar. No es una contradicción: es ejercer una cláusula que ellos ya vieron.
2. **Cambiar de stack entre el 25% y el 50% es normal y bien visto si está justificado.** La arquitectura conceptual (captura → base histórica → motor analítico → API → dashboard) NO cambió; cambió la herramienta, no el diseño.
3. **Python no desaparece del plan**: Pandas/Scikit-Learn quedan reservados para el motor de ML (hito 75–100%) como módulo Python que lee de la misma base PostgreSQL. Patrón profesional real: app web en un lenguaje, ciencia de datos en otro, conectados por la DB. Así el 25% ni siquiera estuvo "equivocado".

### Justificación sugerida (para el documento y la defensa)

> "Al implementar, se optó por Next.js full-stack porque unifica frontend y backend en un solo lenguaje (TypeScript) y un solo despliegue, lo que reduce la complejidad operativa para un proyecto individual. La capa de datos (PostgreSQL) y la arquitectura conceptual (captura → base histórica → motor analítico → API → dashboard) no cambiaron: cambió la herramienta, no el diseño. Python (Pandas/Scikit-Learn) queda reservado para el motor de Machine Learning de la etapa siguiente, donde es la mejor herramienta."

**Cómo blindarlo:** agregar 3-4 líneas tipo *"Evolución de las decisiones técnicas"* en el documento. Convierte la pregunta incómoda del tribunal en una pregunta que querés que te hagan: la respuesta ya está escrita y demuestra criterio de ingeniería (lo que la rúbrica de Tecnologías evalúa). Es la diferencia entre "me equivoqué y lo tapé" y "tomé una decisión de arquitectura documentada".

---

## 5. Plan de trabajo propuesto (pendiente de ejecución)

1. **Generar la Demo**: levantar la app, correr una pasada de minería, capturar: consola del pipeline, tablas en Supabase, endpoint `/api/trends` respondiendo JSON, dashboard. → Destraba el único criterio en rojo de la rúbrica.
2. **Corregir los 8 pasajes verdes** al stack real (Next.js API Routes + Node.js) + agregar el párrafo "Evolución de las decisiones técnicas".
3. **Alinear el ER/UML con Prisma** — dos caminos:
   - (a) Ajustar el diagrama a lo que existe, o
   - (b) *Mejor*: agregar al código lo que falta del diagrama (categoría + registro temporal + score de tendencia), así el modelo del doc queda válido Y el sistema gana las features que la tesis promete (resuelve también RF02/RF03).
4. **Limpieza final**: quitar la nota roja inicial, pasar texto rojo a negro, rehacer el diagrama de componentes con sintaxis gráfica correcta.

### Decisiones aún pendientes del usuario

- Confirmar dirección del stack (recomendado: documento → stack real).
- Qué features faltantes implementar en código: score de tendencia + métricas temporales / export CSV / alertas / ninguna por ahora.
- Qué hacer con el buscador en vivo (Carril 2): justificarlo en el doc o bajarle protagonismo.

---

## Archivos generados en esta sesión

- `C:\Users\usuario\Downloads\PFI_50_completado_STACK_MARCADO.docx` — copia del documento con los 8 pasajes de stack resaltados en verde (el original queda intacto).
- Este archivo de análisis.
