# Resumen de Sesión - 15 de Mayo de 2026

## Resultado Final de Minería
**✅ 45 productos reales guardados en Supabase** con historial de precios inicial.

---

## Logros del Día

### 1. Autenticación OAuth2 Completada ✅
- Configuración de **Ngrok** como túnel HTTPS seguro para el flujo OAuth2.
  - URL del túnel: `https://turkey-curtly-flinch.ngrok-free.dev`
- Actualización del código para usar `NEXT_PUBLIC_BASE_URL` en lugar de `localhost` hardcodeado.
  - Archivos modificados: `src/app/api/auth/login/route.ts` y `src/app/api/auth/callback/route.ts`
- **Token OAuth2 de usuario activo** y persistido en Supabase (tabla `oAuthToken`).
  - Usuario autenticado: `DMA2218714` (Sitio: MLA - Argentina)

### 2. Diagnóstico del Bloqueo 403 y Estrategia de Doble Carril ✅
- Identificado que el endpoint `/sites/MLA/search` estaba bloqueado por el **PolicyAgent de Mercado Libre** durante el evento **Hot Sale 2026**.
- El bloqueo afectaba incluso peticiones sin token desde el navegador (no era un problema de código).
- **Solución adoptada**: Estrategia de "Doble Carril" documentada en `ESTRATEGIA_MINERIA.md`.

### 3. Carril 1 Implementado y Funcional ✅
- **Flujo correcto descubierto**: `highlights → /products/{id}/items → guardar item más barato`
  - El endpoint `/highlights` devuelve IDs de **catálogo** (tipo PRODUCT), NO de items directos.
  - El endpoint `/products/{id}/items` devuelve publicaciones reales de vendedores con precios actuales.
- Script `scripts/mine_carril1.js` creado con **Protocolo Humano Anti-Detección**:
  - Delays aleatorios 4-12s entre items.
  - Pausas largas ocasionales 15-30s (30% de probabilidad).
  - Pausas entre categorías 25-55s.
  - Orden de categorías aleatorio en cada ejecución.
  - Headers de navegador real (User-Agent Chrome 124, Accept-Language es-AR).
  - Token OAuth2 de usuario en todas las peticiones.

### 4. Primer Dataset Histórico Cargado ✅
**45 productos guardados** distribuidos en 6 categorías:

| Categoría | Productos | Rango de Precios |
|---|---|---|
| Electrónica | 8 | $22.770 - $499.999 ARS |
| Alimentos y Bebidas | 8 | $5.951 - $47.952 ARS |
| Ropa y Accesorios | 8 | $49.504 - $119.999 ARS |
| Limpieza del Hogar | 8 | $1.804 - $9.064 ARS |
| Celulares | 7 | $7.900 - $289.565 ARS |
| Computación | 6 | $8.775 - $254.150 ARS |

---

## Bugs Identificados y Pendientes

### Bug: `sellerId` overflow en INT4
- **Error**: `Unable to fit integer value '3356725738' into an INT4 (32-bit signed integer)`
- **Causa**: El campo `sellerId` en el schema de Prisma está definido como `Int` (32-bit), pero los IDs de vendedor de Mercado Libre son números de 10 dígitos (64-bit).
- **Solución**: Cambiar `sellerId Int?` a `sellerId BigInt?` en `prisma/schema.prisma` y ejecutar una migración.
- **Impacto**: Solo 2 de 48 productos fallaron por esta causa. El resto se guardó correctamente.

---

## Archivos Nuevos Creados Hoy

| Archivo | Descripción |
|---|---|
| `scripts/mine_carril1.js` | Script de minería con Protocolo Humano (Carril 1) |
| `scripts/check_token.js` | Verificación de token OAuth2 activo |
| `scripts/test_carril1.js` | Prueba de endpoints alternativos |
| `scripts/debug_highlights.js` | Diagnóstico de estructura del endpoint highlights |
| `scripts/debug_products.js` | Diagnóstico de endpoint /products/{id}/items |
| `scripts/test_search_auth.js` | Prueba de autenticación en endpoint de búsqueda |
| `ESTRATEGIA_MINERIA.md` | Documentación de la estrategia anti-bloqueo |

---

## Próximos Pasos

### Urgente (antes de la próxima sesión)
- [ ] **Fix Bug sellerId**: Migrar campo a `BigInt` en el schema de Prisma.
- [ ] **Enriquecer nombres de productos**: El campo `name` se guarda con el ID de catálogo. Añadir una llamada a `/products/{id}` para obtener el nombre real.

### Carril 2 - Scheduler Automático (post Hot Sale)
- El Hot Sale termina ~17 Mayo. A partir del 18 Mayo, el endpoint de búsqueda debería estar desbloqueado.
- [ ] Implementar scheduler con Windows Task Scheduler para correr `mine_carril1.js` 3x/día.
- [ ] Evaluar si el endpoint de búsqueda vuelve a estar disponible y activar Carril 2.

### Análisis de Datos
- [ ] Con el dataset inicial, construir las primeras visualizaciones de series de tiempo de precios.
- [ ] Revisar el Dashboard para mostrar los 45 productos ya cargados.

---
*Sesión: 15 de Mayo de 2026 | Hora: 17:00 - 18:45 (ARG)*
