# Resumen del Proyecto de Minería de Datos - Tesis Mercado Libre

Este documento sirve como bitácora y guía técnica para entender la arquitectura actual del sistema, la evaluación de los endpoints de la API de Mercado Libre, cómo superamos las restricciones y cómo está configurada la base de datos en Supabase.

---

## 1. Arquitectura del Sistema: Estrategia de Dos Carriles

Para evitar bloqueos y garantizar datos de alta calidad científica para la tesis, el sistema utiliza dos carriles independientes:

```mermaid
graph TD
    subgraph Carril 1: Minería en Segundo Plano (Histórico)
        A[Windows Task Scheduler] -->|Ejecuta 3x al día| B(run_mining_task.bat)
        B --> C[scripts/mine_carril1.js]
        C -->|Consulta Catálogo con Keywords| D[API /products/search]
        D -->|Busca Oferta Ganadora| E[API /products/{id}/items]
        E -->|Persiste con Jitter Humano| F[(Supabase PostgreSQL)]
    end

    subgraph Carril 2: Buscador en Tiempo Real (Frontend)
        G[Dashboard Next.js /dashboard] -->|Query de Usuario| H[API /api/search/route.ts]
        H -->|Búsqueda Inmune a Bloqueos| D
        H -->|Paraleliza Mapeo de Items| E
        H -->|Retorna Oferta y Guarda Top 5| F
    end
```

---

## 2. Evaluación de Endpoints de Mercado Libre

Tras intensivas pruebas post-Hot Sale 2026, evaluamos el comportamiento de los endpoints oficiales de Mercado Libre ante los filtros de seguridad de su `PolicyAgent`:

| Endpoint | Propósito | Estado | Comportamiento / Restricción | Solución Aplicada |
| :--- | :--- | :--- | :--- | :--- |
| `GET /users/me` | Validar Token OAuth2 | **Operativo** | Retorna 200 OK con token de usuario válido. | Autenticación robusta y refresco automático. |
| `GET /sites/MLA/search` | Buscador tradicional de publicaciones | ❌ **Bloqueado (403)** | Devuelve `403 Forbidden` desde `PolicyAgent` por reputación de IP de servidores cloud/locales. | Reemplazado por búsqueda en Catálogo. |
| `GET /highlights/MLA/category/{id}` | Productos destacados de categoría | ❌ **Bloqueado (403)** | Bloqueado con error `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`. | Reemplazado por consultas en Catálogo filtradas. |
| `GET /products/search` | Búsqueda en Catálogo oficial | **Operativo (Inmune)** | Devuelve productos normalizados y limpios. Requiere parámetros obligatorios. | Se consulta pasando `q={keyword}` y opcionalmente `category={catId}`. |
| `GET /products/{id}/items` | Mapear publicaciones de vendedores | **Operativo** | Devuelve los vendedores activos y los precios de la caja de compra. | Se utiliza para obtener la oferta más económica del mercado. |

---

## 3. Estrategia de Búsqueda y Qué Buscamos

Dado que no podemos listar directamente destacados ni usar el buscador abierto, consultamos el **Catálogo Oficial** (`/products/search`) bajo las siguientes reglas de términos semilla por categoría:

1. **Computación**: Término semilla `"notebook"`.
2. **Celulares**: Término semilla `"celular"`.
3. **Electrónica**: Término semilla `"auriculares jbl"`.
4. **Ropa y Accesorios**: Término semilla `"zapatillas"`.
5. **Alimentos y Bebidas**: Término semilla `"cafe dolca"`.
6. **Limpieza del Hogar**: Término semilla `"jabon liquido"`.

### Por qué esta búsqueda es superior para la Tesis:
* **Higiene de Datos**: La API de Catálogo devuelve nombres normalizados de fábrica (ej. *"Xiaomi Redmi Buds 6 Play Rosa"*). Esto nos evita lidiar con títulos mal escritos por vendedores particulares (ej. *"auris rosa barato liquidacion"*).
* **Consistencia**: Mapeamos siempre la **oferta ganadora** (el vendedor más barato en la buy-box de ese producto en ese instante), lo que nos da un índice preciso de dispersión y precio mínimo real de mercado.

---

## 4. Estructura de la Base de Datos (Supabase + Prisma)

La base de datos cuenta con una higiene estricta. Eliminamos falsos positivos y productos irrelevantes (juguetes de madera, manijas autoadhesivas, cuadernos de papel que hacían match con "notebook").

### Modelos de Datos Relevantes
* **Product**: Almacena el `mlId`, `name` limpio, `price` actual, `currency`, `condition` y el `sellerId` (soportado como `BigInt` en Prisma para evitar overflow de IDs de vendedores grandes de ML).
* **PriceHistory**: Almacena la relación histórica `productId`, `price` y `timestamp` para graficar curvas de precio en la tesis.

### Resumen de Datos Actuales en DB
Actualmente hay **13 productos perfectamente curados** de tecnología, alimentos y limpieza con sus respectivos registros históricos en la tabla `PriceHistory`.

---

## 5. Script de Minería y Automatización (`mine_carril1.js`)

El script cuenta con un estricto **Protocolo de Simulación Humana**:
* **Orden Aleatorio**: Mezcla el orden de las categorías en cada corrida.
* **Delays y Jitter**: Espera entre 4 y 12 segundos entre llamadas de productos.
* **Pausas de Distracción**: Hay un 30% de probabilidad de pausar 15-30 segundos simulando que el usuario se distrajo.
* **Pausas de Sección**: Espera entre 25 y 55 segundos al pasar de categoría.
* **Refresco de Token**: Lee el token OAuth2 desde Supabase y, si expira en menos de 5 minutos, lo refresca automáticamente con Mercado Libre y lo actualiza en DB.

---

## 6. Nueva Metodología: Cruzar Intención (Búsquedas) vs Conversión (Ventas)

Alineado con el enfoque metodológico propuesto para la tesis (Leading Indicators vs Lagging Indicators), podemos cruzar el embudo de madurez utilizando las APIs de Mercado Libre que **comprobamos que están 100% operativas**:

### Capa 1: Intención / Demanda (Búsquedas - Leading Indicator)
* **API de Tendencias**: El endpoint `GET /trends/MLA/{category_id}` está totalmente activo y libre de bloqueos. Nos dice qué palabras clave exactas están creciendo hoy en popularidad dentro de la plataforma (ej. *"lenovo"*, *"ryzen 7 5700g"*, *"samsung"*).
* **API de Descubrimiento de Dominios**: El endpoint `GET /sites/MLA/domain_discovery/search?q={query}` está activo y nos mapea cualquier término de búsqueda libre a la categoría oficial de Mercado Libre (ej. *"notebook gamer"* ➔ `MLA1652` Notebooks) para normalizar la taxonomía de la tesis.

### Capa 2: Conversión / Oferta (Ventas y Precios - Lagging Indicator)
* **API de Catálogo y Items**: Para cada término en alza de la Capa 1, consultamos `GET /products/search?q={keyword}` y luego `GET /products/{id}/items`. Esto nos permite obtener el producto real del catálogo y su precio mínimo en pesos argentinos.

### Estrategia de Análisis para la Defensa de la Tesis:
1. **Análisis de Discrepancia (Gap Analysis)**:
   * Si una palabra clave tiene un pico de búsqueda masivo en la Capa 1 (ej: *"Samsung S24"* en Trends), pero no encontramos publicaciones baratas ganadoras o el precio sube bruscamente en la Capa 2, identificamos un **gap de oferta o un factor de fricción** (falta de stock de los vendedores o inflación).
2. **Correlación de Estacionalidad**:
   * Podemos correlacionar las tendencias de búsqueda históricas (Google Trends / MELI Trends) con la fluctuación de los precios que guardamos diariamente en `PriceHistory`. Esto nos permite demostrar científicamente si un incremento en el volumen de búsqueda de una categoría (ej. *"estufa"* al comenzar el invierno) empuja el precio al alza en los días posteriores (desfase temporal de precios).

