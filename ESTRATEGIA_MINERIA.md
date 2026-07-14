# Estrategia de Minería de Datos - Protocolo Anti-Bloqueo

## Contexto del Problema
Durante eventos masivos como el **Hot Sale**, Mercado Libre activa medidas anti-bot extremas en sus endpoints más populares (especialmente `/sites/MLA/search`). El PolicyAgent de ML bloquea con **403 Forbidden** incluso peticiones desde navegadores sin autenticación.

---

## Carril 1 – Inmediato: Endpoints Alternativos

Estos endpoints están **menos monitoreados** y tienen mayor tolerancia al acceso programático:

| Endpoint | Descripción | Uso |
| :--- | :--- | :--- |
| `GET /trends/MLA` | Términos más buscados en tiempo real | Detectar qué busca la gente HOY |
| `GET /highlights/MLA/category/{catId}` | Productos destacados por categoría | Obtener items reales sin pasar por el buscador |
| `GET /sites/MLA/search?q={término}` | Búsqueda por término específico | Menos bloqueada que búsqueda por categoría |
| `GET /items/{itemId}` | Detalle de un producto | Enriquecer un producto ya conocido |
| `GET /sites/MLA/search?seller_id={id}` | Productos de un vendedor específico | Monitorear vendedores clave |

### Reglas del Carril 1
- Siempre usar el **token OAuth2 de usuario** (ya guardado en Supabase).
- Headers de navegador en todas las peticiones:
  - `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124`
  - `Accept-Language: es-AR,es;q=0.9`
  - `Accept: application/json`
- **Máximo 1 petición a la vez** (no en paralelo).

---

## Carril 2 – Largo Plazo: Scheduler Cauteloso

Para construir el **dataset histórico de series de tiempo** que requiere la tesis, el script de minería debe comportarse como un usuario real.

### Reglas del Carril 2
1. **1 búsqueda por ciclo**: procesar solo 1 categoría o término por ejecución.
2. **Delay aleatorio**: esperar entre 30 y 90 segundos entre cada petición dentro del script.
3. **Frecuencia**: programar el script 3 veces por día (9:00, 14:00, 20:00) usando el Programador de Tareas de Windows.
4. **Rotación de términos**: alternar entre categorías y términos en cada ejecución para no generar un patrón repetitivo.
5. **Límite diario**: máximo 150 peticiones/día (muy por debajo del límite de 1000/min de la API).

### Horario Sugerido
```
9:00  → Tecnología (Computación + Celulares)
14:00 → Ropa y Alimentos
20:00 → Limpieza + Electrónica
```

---

## Timing Recomendado

> [!IMPORTANT]
> El **Hot Sale 2026** termina aproximadamente el 16-17 de Mayo.
> Se recomienda activar el Carril 2 a partir del **18 de Mayo** cuando los bloqueos se relajen.
> Mientras tanto, usar el **Carril 1** para poblar datos iniciales.

---

## Estado Actual del Proyecto
- ✅ OAuth2 completado: token guardado en Supabase.
- ✅ Script `mine_data.js` base creado.
- ✅ Endpoints alternativos identificados.
- 🟡 En prueba: Carril 1 con endpoints de trends/highlights.
- ⬜ Pendiente: Scheduler automático (Carril 2).

---
*Documento generado el 15 de Mayo de 2026 - Proyecto Tesis de Inteligencia de Mercado*
