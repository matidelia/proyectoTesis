# Avances y Estado Actual — Sesión 14 de julio de 2026

Continúa de `AVANCES_SESION_20260713.md`. Contexto general en `ANALISIS_ALINEACION_TESIS_CODIGO.md`.

---

## ✅ Completado hoy

### 1. Recuperación total de Supabase (mejor de lo esperado)
- La restauración del proyecto tardó en completarse: ayer la base parecía vacía, hoy **volvieron TODOS los datos de mayo** (42 productos, 62 precios, health logs, token).
- **Token OAuth: refrescado con el refresh token de mayo** (`scratch/refresh_and_save_token.js`). NO hizo falta ngrok ni tocar el Developer Center. El refresh automático de la minería lo mantiene vivo de ahora en más.
- Schema nuevo reaplicado (`prisma db push`) sobre los datos restaurados, sin pérdidas.

### 2. Minería verificada de punta a punta con los modelos nuevos
- Corrida completa: **22 productos guardados**, las 6 categorías registradas en `Category`, 22 `TrendSnapshot` con keyword + posición, permalinks guardados.
- Detalle valioso: se capturaron productos vía keywords de tendencia dinámicas (ej. Infinix GT 30 Pro por "infinix gt 50 pro" del endpoint /trends).
- Base actual: 56 productos, 84 precios, 22 snapshots, 6 categorías.

### 3. Primer cálculo de score real (RF02 ✔)
- `node scripts/compute_trend_scores.js --days=7` → 21 scores guardados con desglose en `components`.
- Top: Café Dolca 1kg (69.8), RAM gamer (51.1), etc. Valores conservadores por tener 1 solo día de datos en la ventana — subirán con las corridas programadas.

### 4. Tareas programadas REGISTRADAS (Matías las corrió)
- `MercadoLibre_Mining_0800 / _1600 / _2330` — verificadas creadas.
- El script `create_scheduler_task.ps1` tenía 2 bugs (interpolación `${Time.Replace(...)}` inválida y `/ru SYSTEM` que exigía admin): corregidos.
- **VERIFICAR MAÑANA**: que la corrida de las 08:00 haya quedado en `mining_log.txt`.

### 5. Backup local (RNF04 ✔)
- Nuevo `scripts/backup_db.js`: dump completo a `backups/db/backup_*.json`, retención 30, integrado al final de `run_mining_task.bat`. Primer backup hecho.

### 6. Git al día + auditoría de seguridad
- 5 commits: dashboard/OAuth (trabajo previo), modelo de tendencias + RNF04 + scheduler, docs/bitácoras, diagramas x2.
- `.gitignore` reescrito (tenía basura UTF-16): excluye `backups/` (contienen tokens), logs, `test_ml_api.js` y `analisisAntiGravityApi.txt` (¡tienen tokens hardcodeados — NUNCA commitearlos!), `*.docx`, `scratch/`.

### 7. Los 3 diagramas rehechos en estilo académico simple
- A pedido de Matías: estilo de su UML original (cajas simples, borde negro fino, relleno lavanda claro, tipografía chica) en vez del estilo "corporativo". Los 3 unificados y consistentes con los wireframes.
- PNGs en `diagramas/` (componentes, clases UML, ER), verificados visualmente y commiteados.
- Durante la regeneración se corrigió un error de tipo: `categoryId` es **string** (cuid), no int.
- Scripts generadores en el scratchpad de la sesión; recrear con matplotlib si hace falta retocar.

---

## 🔴 BLOQUEO ACTIVO: archivo docx con handle zombi + sistema lento

1. `PFI_50_completado_CORREGIDO.docx` quedó con un **handle zombi a nivel kernel** tras cerrar Word: cualquier `open()` sobre ese archivo se cuelga (ni lectura). El archivo está INTACTO (1.217.233 bytes, con los diagramas estilo corporativo insertados y el stack corregido).
2. Además el filesystem quedó degradado: todo lo que enumera `node_modules` se cuelga (antivirus/disco saturado).

**SOLUCIÓN: REINICIAR WINDOWS.** Después del reinicio:
- Ejecutar: `py -3 <scratchpad>/reinsertar_diagramas.py` (reemplaza los 3 diagramas del docx por las versiones estilo simple — guarda vía archivo temporal, es seguro). Si el scratchpad de la sesión cambió, regenerar los diagramas con los scripts o pedirle a Claude que lo rehaga: la lógica es reemplazar los `w:drawing` cerca de los 3 epígrafes.
- Si el archivo siguiera bloqueado: regenerar TODO desde `PFI_50_completado.docx` (original intacto) → los scripts de la cadena completa son `corregir_stack.py` + `insertar_diagramas.py` del scratchpad.

---

## 📝 Auditoría de coherencia — Propuestas de redacción (listas para aplicar al docx)

Requerimientos cuya redacción actual NO coincide con la implementación real. Cambiarlos evita observaciones en la defensa:

### RNF02 (performance)
- **Dice**: "El dashboard debe responder consultas en menos de 3 segundos con hasta 10.000 productos."
- **Propuesta**: "El dashboard debe responder consultas en menos de 3 segundos sobre el dataset histórico. El modelo de datos incluye índices en PostgreSQL (productId, timestamp, categoryId) diseñados para sostener ese tiempo de respuesta a medida que el histórico escala."
- **Por qué**: la cifra "10.000 productos" es una promesa no verificable hoy; los índices sí existen en `schema.prisma` y son mostrables.

### RNF03 (escalabilidad)
- **Dice**: "El sistema debe ser escalable horizontalmente a nivel de backend (contenedores)."
- **Propuesta**: "El backend debe poder desplegarse en plataformas cloud con escalado gestionado. Actualmente se despliega en Render con build reproducible (generación de Prisma Client en postinstall)."
- **Por qué**: no hay contenedores; el deploy en Render es real (está en el historial de git).

### RNF05 (seguridad)
- **Dice**: "El acceso a funciones administrativas debe estar protegido por autenticación."
- **Propuesta**: "Las credenciales y tokens de acceso (OAuth2 de Mercado Libre) deben gestionarse exclusivamente del lado servidor, sin exponerse nunca al cliente, con renovación automática de tokens."
- **Por qué**: no existen "funciones administrativas" en el sistema (se quitó `Usuario` del modelo); lo que sí existe y es defendible es la gestión server-side de tokens con refresh automático.

### HU05 (configuración de frecuencia)
- **Dice**: "Como administrador, quiero configurar la frecuencia de captura de datos desde la API de Mercado Libre."
- **Propuesta**: mantener la HU pero aclarar en el texto que la frecuencia se configura mediante las tareas programadas del sistema operativo (3 corridas diarias, parametrizables en `create_scheduler_task.ps1`), no desde una pantalla de la aplicación.
- **Por qué**: la HU se cumple, pero por consola/scheduler; decirlo explícito evita que parezca una pantalla faltante.

### Gantt
- Marcar "Implementación del motor analítico" como iniciada (existe `compute_trend_scores.js` funcionando) y "Desarrollo del backend" como avanzada (ya corregido a Next.js).

---

## 📋 Pendientes (en orden) para la próxima sesión

1. **REINICIAR la PC** (destraba docx + filesystem).
2. Verificar que la tarea de las 08:00 corrió sola (`mining_log.txt` + backup nuevo en `backups/db/`).
3. Reinsertar los 3 diagramas estilo simple en el docx (script listo).
4. Aplicar las propuestas de RNF02/RNF03/RNF05/HU05 y Gantt al documento.
5. **Score en el dashboard** (RF03/HU01): endpoint que devuelva productos rankeados por último `TrendScore` con categoría y variación; sección nueva en el dashboard con tabla Nombre | Categoría | Score | Variación (el wireframe hecho realidad). ⚠️ Antes de escribir código Next.js: leer `node_modules/next/dist/docs/` (advertencia de AGENTS.md sobre breaking changes).
6. Demo: capturas (minería, Supabase, endpoint JSON, dashboard con score).
7. Decisiones abiertas: CSV (RF06) sí/no, alertas (HU02) sí/no, justificación del buscador en vivo.
8. Limpieza final del docx: nota roja inicial afuera, texto rojo a negro, wireframes propios.
9. **Actualizar Render (paso a paso, en este orden)**:
   - (a) Tras el reinicio: `npm run build` local para verificar que el código nuevo compila.
   - (b) Solo si el build pasa: `git push` → Render auto-despliega el dashboard nuevo (local está 7 commits ahead de `origin/main`).
   - Contexto: Render solo hostea la app web; la minería corre en la PC local vía Task Scheduler. El schema nuevo en Supabase es aditivo, así que la app vieja de Render sigue funcionando mientras tanto — sin apuro.
10. **Evaluar migrar la minería a GitHub Actions (schedule 3x/día, gratis)**:
   - Elimina la dependencia de la PC prendida (la debilidad que causó la pausa de Supabase en mayo-julio).
   - Requiere: workflow YAML con cron + pasar DATABASE_URL/DIRECT_URL/ML_APP_ID/ML_CLIENT_SECRET a GitHub Secrets (~1 hora).
   - Argumento de disponibilidad para la defensa: recolección en la nube vs. "corre en mi notebook".

## 🔚 Cierre de sesión (estado final)

- La sesión terminó con el sistema operativo degradado (handle zombi en el docx + filesystem lento). **Primer paso de la próxima sesión: REINICIAR LA PC antes que nada.**
- Todo el trabajo del día está commiteado en git (working tree limpio). Nada pendiente de guardar.
- Los diagramas definitivos (estilo simple) están en `diagramas/` — solo falta reinsertarlos en el docx tras el reinicio.
- Las propuestas de redacción de RNF02/RNF03/RNF05/HU05 (sección anterior) quedaron listas para copiar al documento.
- La minería automática queda corriendo sola 3x/día: cada día que pasa el dataset y los scores mejoran sin intervención.

## Estado de archivos clave

| Archivo | Estado |
|---|---|
| `PFI_50_completado_CORREGIDO.docx` | ⚠️ Intacto pero bloqueado (handle zombi). Tiene: stack corregido + evolución + diagramas estilo corporativo. Falta: diagramas estilo simple |
| `diagramas/*.png` | ✅ Estilo simple final, commiteados |
| Base Supabase | ✅ 56 productos, 84 precios, 22 snapshots, 21 scores, 6 categorías, token activo |
| Tareas programadas | ✅ Registradas (verificar 1ra corrida mañana) |
| Git | ✅ Working tree limpio, 5 commits nuevos |
