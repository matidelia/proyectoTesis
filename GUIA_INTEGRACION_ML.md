# Guía Definitiva: Integración Segura con la API de Mercado Libre

Este documento resume la arquitectura, los avances logrados y las configuraciones necesarias para integrar exitosamente la API de Mercado Libre en una aplicación web moderna. Esta guía está diseñada para servir como base documental para la Tesis actual y como plantilla para cualquier proyecto futuro.

---

## 1. Arquitectura de la Aplicación

Para consumir la API de Mercado Libre de forma segura, **nunca se deben realizar peticiones directamente desde el frontend (navegador)**. Hacerlo expondría las credenciales secretas al público.

**Solución Implementada:**
Se utilizó un enfoque *Full-Stack* con **Next.js (App Router)**.
- **Frontend (Cliente):** Interfaz de usuario (UI) construida con React y CSS puro. Se encarga de capturar la entrada del usuario y mostrar los resultados.
- **Backend (Servidor - API Routes):** Rutas internas (`/api/search` y `/api/status`) que actúan como un puente seguro. Este servidor interno lee las variables de entorno, solicita los tokens a Mercado Libre y realiza las búsquedas, devolviendo solo los resultados limpios al frontend.

---

## 2. Configuración y Credenciales

### Obtención de Credenciales
Para cualquier proyecto, se debe registrar una aplicación en el [Developer Center de Mercado Libre](https://developers.mercadolibre.com.ar/devcenter/).
Se obtendrán dos datos fundamentales:
- `App ID` (Identificador público)
- `Client Secret` (Clave privada)

### Variables de Entorno
En el entorno de desarrollo local, estas credenciales deben almacenarse en un archivo llamado `.env.local` ubicado en la raíz del proyecto. **Este archivo jamás debe subirse a GitHub.**

```env
ML_APP_ID=tu_app_id_aqui
ML_CLIENT_SECRET=tu_client_secret_aqui
```

En entornos de producción (como Render o Vercel), estas variables se configuran manualmente en el panel de control del servicio (sección *Environment Variables*).

---

## 3. Flujo de Autenticación (OAuth 2.0)

Mercado Libre requiere un token de acceso (`access_token`) para casi todas sus operaciones.

Para aplicaciones que solo necesitan leer datos generales (como realizar búsquedas genéricas sin actuar en nombre de un comprador o vendedor específico), se utiliza el flujo de **Client Credentials** (Server-to-Server).

**Endpoint para obtener el token:**
```http
POST https://api.mercadolibre.com/oauth/token
```
**Cuerpo de la petición (x-www-form-urlencoded):**
- `grant_type`: "client_credentials"
- `client_id`: (Tu App ID)
- `client_secret`: (Tu Client Secret)

---

## 4. Búsqueda de Productos y Solución al "Error 403 Forbidden"

### El Problema de las Políticas Anti-Scraping
Históricamente, los desarrolladores utilizaban el endpoint `/sites/{site_id}/search` para buscar publicaciones. Sin embargo, Mercado Libre ha implementado políticas estrictas de seguridad. Si se intenta acceder a este endpoint utilizando un token de servidor (`client_credentials`), la API rechazará la conexión con un error **`403 Forbidden`**. Este endpoint ahora está reservado exclusivamente para flujos donde un usuario real ha iniciado sesión (Authorization Code) o para partners comerciales autorizados.

### La Solución Implementada: Búsqueda de Catálogo
Para eludir esta restricción y mantener la aplicación funcional sin forzar a los usuarios a iniciar sesión, se debe utilizar la **API de Catálogo de Productos**.

**Endpoint seguro y permitido:**
```http
GET https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q={termino_de_busqueda}
```
**Headers:**
- `Authorization: Bearer {access_token}`

Este endpoint devuelve productos oficiales (ej. "iPhone 15") en lugar de publicaciones específicas de vendedores, lo cual es ideal para buscadores generales, comparadores o proyectos de investigación/tesis.

---

## 5. Control de Errores y Diagnóstico (Best Practices)

Para aplicaciones en producción, la visibilidad técnica es vital. Se implementaron las siguientes mejoras aplicables a cualquier proyecto:

1. **Endpoint de Diagnóstico (`/api/status`):**
   Una ruta independiente que intenta negociar un token con Mercado Libre sin realizar ninguna búsqueda. Si tiene éxito, devuelve un `200 OK`. Esto permite a los desarrolladores y sistemas de monitoreo saber si el problema es de red, de credenciales inválidas o del endpoint de destino.

2. **Indicadores de Interfaz:**
   El frontend consume el endpoint de estado al cargar la página y muestra un indicador visual (ej. "🟢 API Conectada"). Esto mejora la experiencia del usuario y facilita el soporte técnico.

3. **Logs Detallados en el Servidor:**
   Antes, durante y después de cada llamada a la API de terceros, se deben registrar logs (`console.log`, `console.error`) indicando el inicio del proceso, los parámetros recibidos, y el volcado exacto del error (JSON) devuelto por la API externa. Esto es crucial para revisar los registros (logs) en plataformas como Render.

4. **Propagación del Error al Cliente:**
   En lugar de atrapar el error en el servidor y devolver un mensaje genérico ("Error 500"), el servidor envía el payload del error original de Mercado Libre al frontend. El frontend renderiza un panel de "Detalles Técnicos", permitiendo al desarrollador ver exactamente qué regla de la API se rompió sin necesidad de acceder a los logs del servidor.

---

## 6. Despliegue en Producción (Deployment)

1. **Plataforma Recomendada:** Render, Vercel o Railway.
2. **Requisito de Mercado Libre:** La plataforma elegida generará una URL segura (HTTPS). Esta URL debe ser copiada e ingresada en el campo **"URI de redirección" (Redirect URI)** dentro del panel de configuración de la aplicación en *Mercado Libre Developers*. Aunque la aplicación no use redirección de usuarios, es un campo obligatorio para validar el dominio.
3. **Comando de Construcción (Build Command):** `npm run build`
4. **Comando de Inicio (Start Command):** `npm start` (o definido automáticamente en Vercel).
