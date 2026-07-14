# Diccionario de Datos: Inteligencia de Mercado vía API

Este documento actúa como la especificación técnica y funcional de los datos extraídos de Mercado Libre. Es la base sobre la cual se construye el análisis de datos, la persistencia en base de datos y la visualización en el dashboard de la Tesis.

## 1. Arquitectura de Extracción
Para garantizar la estabilidad y evitar bloqueos, se utiliza el endpoint de búsqueda por sitio con autenticación de nivel de usuario:
*   **Endpoint Principal**: `GET https://api.mercadolibre.com/sites/MLA/search?q={query}`
*   **Método de Acceso**: OAuth 2.0 (Authorization Code)
*   **Límite de Consumo**: 1,000 requerimientos por minuto (Safe Zone).

---

## 2. Definición de Campos (Dataset)

### A. Información de Identificación y Enlaces
| Campo API | Nombre Funcional | Descripción | Importancia Académica |
| :--- | :--- | :--- | :--- |
| `id` | ID Publicación | Identificador único (ej. MLA12345). | Garantiza la integridad referencial en la base de datos. |
| `title` | Título | Nombre público del producto. | Análisis semántico y categorización de productos. |
| `permalink` | Enlace Directo | URL oficial de la publicación. | Permite la auditoría manual de los datos extraídos. |

### B. Análisis de Precios y Finanzas
| Campo API | Nombre Funcional | Descripción | Importancia Académica |
| :--- | :--- | :--- | :--- |
| `price` | Precio Actual | Valor de venta en tiempo real. | Variable dependiente principal para análisis de mercado. |
| `base_price` | Precio Base | Precio antes de descuentos. | Permite calcular la tasa de descuento aplicada. |
| `original_price` | Precio Original | Precio histórico de referencia. | Análisis de veracidad de ofertas y promociones. |
| `currency_id` | Moneda | ARS, USD, etc. | Necesario para la normalización de valores (Conversión). |

### C. Métricas Comerciales y de Stock
| Campo API | Nombre Funcional | Descripción | Importancia Académica |
| :--- | :--- | :--- | :--- |
| `available_quantity` | Stock Disponible | Unidades que el vendedor tiene para entrega. | Análisis de escasez y capacidad logística. |
| `sold_quantity` | Unidades Vendidas | Histórico de ventas de la publicación. | Estimación de market share y éxito de producto. |
| `condition` | Condición | `new` (nuevo) o `used` (usado). | Diferenciación de nichos de mercado. |

### D. Inteligencia del Vendedor y Reputación
| Campo API | Nombre Funcional | Descripción | Importancia Académica |
| :--- | :--- | :--- | :--- |
| `seller.id` | ID Vendedor | Identificador del comerciante. | Permite rastrear la concentración del mercado. |
| `seller.nickname` | Nombre Vendedor | Alias o nombre de la tienda. | Identificación de "Top Players" o tiendas oficiales. |
| `seller.seller_reputation` | Reputación | Color (Verde/Rojo) y termómetro. | Correlación entre confianza del vendedor y precio. |

### E. Logística y Valor Agregado
| Campo API | Nombre Funcional | Descripción | Importancia Académica |
| :--- | :--- | :--- | :--- |
| `shipping.free_shipping` | Envío Gratis | Booleano (true/false). | Análisis de factores que incrementan la conversión. |
| `shipping.logistic_type` | Tipo de Logística | `fulfillment` (Full), `cross_docking`, etc. | Estudio de eficiencia en la cadena de suministro. |

---

## 3. Atributos Técnicos (Ficha Técnica)
A través del campo `attributes`, podemos extraer datos específicos según la categoría:
*   **Marca**: Clave para el análisis de lealtad de marca.
*   **Modelo**: Para comparativas exactas entre competidores.
*   **Especificaciones**: (ej. RAM, Almacenamiento, Talle) fundamentales para el análisis de valor por característica.

---

## 4. Estrategia de Persistencia (Timeline)
Dado que la API no entrega un "historial de precios" retroactivo, la aplicación implementa la técnica de **Snapshots Diarios**:
1.  **Captura**: La App consulta el precio actual.
2.  **Comparación**: Se verifica si el precio cambió respecto al último registro.
3.  **Almacenamiento**: Si hay cambio, se crea un nuevo registro en la tabla `PriceHistory`.
4.  **Visualización**: Generación de gráficos de tendencia (Time Series Analysis).

---
**Documento de referencia para el desarrollo de la Tesis.**
*Versión 1.1 - 2026*
