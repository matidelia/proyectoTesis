# Avances y Estado Actual — Sesión 13 de julio de 2026

Archivo para retomar el trabajo. Contexto general previo en `ANALISIS_ALINEACION_TESIS_CODIGO.md`.

---

## ✅ Lo que se completó hoy

### 1. Documento de tesis corregido (stack alineado al código real)

**Archivo generado: `C:\Users\usuario\Downloads\PFI_50_completado_CORREGIDO.docx`** (el original quedó intacto; también existe `PFI_50_completado_STACK_MARCADO.docx` con los pasajes resaltados en verde para comparar).

- 10 reemplazos: FastAPI/Python → Next.js (API Routes) + TypeScript / Node.js en: tabla de stack (5 filas), diagrama de componentes (2), RF04, sección DEMO, Gantt.
- Se agregó la subsección **"Evolución de las decisiones técnicas"** (después de la tabla de stack): justifica el cambio ante el tribunal — unificación de lenguaje/despliegue, la arquitectura y PostgreSQL no cambiaron, Python queda reservado para el módulo de ML del hito 75%.
- Verificado: 0 menciones a FastAPI; las únicas menciones a Python que quedan son las legítimas (párrafo de evolución + fila de análisis/ML).
- **Pendiente de revisión visual por Matías**: formato de la subsección nueva y alineación de celdas.

### 2. Modelo de datos implementado en código (alineación con el ER/UML de la tesis)

**`prisma/schema.prisma`** — cambios aplicados y pusheados a Supabase (`prisma db push` OK):

- 🆕 `Category` (id, mlId oficial ej. "MLA1648", name) — 1:N con Product
- 🆕 `TrendSnapshot` (= RegistroTemporal del diagrama): productId, keyword, rankPosition (1-8), capturedAt. Frecuencia y permanencia se derivan contando snapshots por ventana.
- 🆕 `TrendScore` (= MetricaTendencia): productId, score 0-100, period ("7d"), components (JSON con desglose de la fórmula), computedAt
- ✏️ `Product`: + `categoryId` (FK), + `permalink`

Equivalencias del diagrama: `PriceHistory` = Publicación; `Usuario` se decidió **sacarlo del diagrama** (no hay gestión de usuarios propios y la rúbrica exige fidelidad a la implementación). Falta redibujar ER/UML del documento (ver pendientes).

### 3. Minería actualizada — `scripts/mine_carril1.js`

En cada pasada ahora: registra la categoría (`ensureCategory`), guarda permalink del producto de catálogo (`https://www.mercadolibre.com.ar/p/{id}`), y crea un `TrendSnapshot` por cada producto guardado (keyword + posición). Sintaxis verificada.

### 4. 🆕 Score de tendencia (RF02) — `scripts/compute_trend_scores.js`

Implementa el "indicador compuesto" de la tabla "Métricas preliminares":

```
score = 100 × (0.35·frecuencia + 0.25·permanencia + 0.20·ranking + 0.20·estabilidad_precio)
```

- Ventana configurable: `node scripts/compute_trend_scores.js --days=7`
- Guarda `TrendScore` por producto con el desglose en `components` (trazabilidad académica)
- Cada componente justificado en comentarios del script
- Sintaxis y cliente Prisma verificados

---

## 🔴 INCIDENTE DESCUBIERTO: pérdida de datos de Supabase

**Cronología:**
1. La última minería exitosa fue el **21 de mayo de 2026** (fecha de `mining_log.txt`).
2. **La tarea programada de Windows no existe** (verificado con Get-ScheduledTask — nunca quedó registrada o se borró).
3. Sin conexiones, **Supabase (plan gratuito) pausó el proyecto** (~1 semana de inactividad). El host dejó de resolver en DNS.
4. Matías restauró el proyecto el 13/7, pero **la base volvió VACÍA**: se perdieron los ~15-45 productos, el histórico de precios de mayo, los 18 registros de EndpointHealthLog **y el token OAuth**.
5. Se revisaron los backups locales (`backups/`, zips `ProyectoTesis_Backup_Session_*`): son solo código, **no hay dump de la base**. Los datos de mayo no son recuperables localmente.

**Evaluación del daño:** moderado. Era ~1 semana de datos de mayo. Si la minería se reactiva YA, para la entrega habrá semanas de datos frescos y continuos. Pero cada día cuenta.

**Lección → convertirla en feature:** RNF04 de la propia tesis exige "respaldo (backup) periódico". Hay que crear un script de dump local (ver pendientes) — resuelve el RNF04 y evita repetir esto.

---

## 📋 PENDIENTES para retomar (en orden)

### Paso 1 — Regenerar el token OAuth (BLOQUEANTE, requiere acción de Matías)

La base restaurada no tiene token y el refresh token también se perdió. Hay que rehacer el flujo de login una vez:

1. Levantar la app: `npm run dev` (puerto 3000)
2. Levantar ngrok: `ngrok http 3000` → copiar la URL nueva (la anterior `turkey-curtly-flinch.ngrok-free.dev` ya no sirve)
3. Actualizar `NEXT_PUBLIC_BASE_URL` en `.env.local` con la URL nueva de ngrok
4. Actualizar la Redirect URI en el Developer Center de Mercado Libre (`https://<ngrok>.ngrok-free.dev/api/auth/callback`)
5. Visitar `https://<ngrok>.ngrok-free.dev/api/auth/login` y autorizar con la cuenta de ML
6. Verificar que el token quedó en la tabla `OAuthToken`

### Paso 2 — Correr minería de prueba y verificar los modelos nuevos

```
node scripts/mine_carril1.js
```
Verificar que se crean registros en `Category`, `TrendSnapshot`, `Product` (con categoryId y permalink) y `PriceHistory`. Después correr:
```
node scripts/compute_trend_scores.js --days=7
```

### Paso 3 — Recrear la tarea programada (para que no se repita la pausa)

Existe `scripts/create_scheduler_task.ps1` — revisarlo y registrar la tarea 3x/día. Verificar con `Get-ScheduledTask` que quede activa.

### Paso 4 — Script de backup periódico (RNF04 + prevención)

Crear script que haga dump de las tablas a JSON/SQL local (puede agregarse al final de cada corrida de minería). Justificación: RNF04 de la tesis.

### Paso 5 — Redibujar ER y UML del documento

Con los nombres reales: Category, Product, PriceHistory (= Publicación), TrendSnapshot (= RegistroTemporal), TrendScore (= MetricaTendencia) + tablas de soporte (OAuthToken, SearchHistory, EndpointHealthLog — esta última es diferenciador vs. competencia, merece estar dibujada). Sacar `Usuario`. También rehacer el diagrama de componentes con sintaxis gráfica correcta (observación de la rúbrica).

### Paso 6 — Demo (criterio ❌ de la rúbrica)

Cuando haya datos frescos: capturas de (a) consola de minería corriendo, (b) tablas en Supabase con registros, (c) endpoint API respondiendo JSON, (d) dashboard operativo. Pegarlas en la sección DEMO del documento.

### Decisiones que siguen abiertas

- Export CSV (RF06) y alertas (HU02): ¿implementar para el 50% o dejarlas para el 75%?
- Buscador en vivo (Carril 2): ¿justificarlo en el documento o bajarle protagonismo?
- Integrar el score de tendencia al dashboard (mostrar TrendScore en la UI) — natural para la demo pero no imprescindible.

---

## Estado de archivos clave

| Archivo | Estado |
|---|---|
| `PFI_50_completado_CORREGIDO.docx` (Downloads) | ✅ Stack corregido + párrafo de evolución. Falta revisión visual |
| `prisma/schema.prisma` | ✅ Modelos nuevos, aplicado a Supabase |
| `scripts/mine_carril1.js` | ✅ Guarda categoría + permalink + snapshots. Sin probar contra la base (falta token) |
| `scripts/compute_trend_scores.js` | ✅ Nuevo. Sin probar contra la base (faltan datos) |
| Base Supabase | ⚠️ Restaurada pero vacía. Tablas creadas, sin datos ni token |
| Tarea programada Windows | ❌ No existe, hay que recrearla |
| `ANALISIS_ALINEACION_TESIS_CODIGO.md` | Análisis completo de la sesión anterior (rúbrica, gaps, decisión de stack) |
