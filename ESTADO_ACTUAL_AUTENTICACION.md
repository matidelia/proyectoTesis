# Estado Actual: Desafío de Autenticación y Solución

Este documento registra el progreso y los obstáculos encontrados durante la implementación del flujo de OAuth2 para la Tesis, junto con la hoja de ruta para resolverlos.

## 1. Situación Actual
*   **Logro**: Se implementaron las rutas de `/api/auth/login` y `/api/auth/callback` con éxito en el código.
*   **Logro**: La base de datos (Supabase) está sincronizada y lista para recibir los tokens.
*   **Obstáculo**: Mercado Libre ha incrementado sus políticas de seguridad, exigiendo **HTTPS** obligatorio para todas las URIs de redirección.
*   **Problema Técnico**: Mercado Libre rechaza `https://localhost` como una URI válida en su consola de desarrolladores, lo que impide completar el apretón de manos (handshake) de seguridad.

## 2. Solución Propuesta (Túnel Seguro)
Para cumplir con los requisitos de la API oficial y avanzar con la minería de datos, se ha decidido implementar **Ngrok**.

### Beneficios de esta solución:
1.  **HTTPS Real**: Proporciona un certificado SSL válido que Mercado Libre acepta sin errores.
2.  **Accesibilidad**: Permite que el sistema de autenticación funcione desde el servidor local sin necesidad de desplegar a producción todavía.
3.  **Preparación para la Defensa**: Esta configuración permite mostrar la aplicación funcionando en tiempo real desde cualquier dispositivo durante la presentación de la tesis.

## 3. Próximos Pasos Técnicos
1.  **Instalación de Ngrok**: El usuario proporcionará la URL de túnel generada por `ngrok http 3000`.
2.  **Configuración de Redirect URI**: Se actualizará la consola de Mercado Libre con la nueva URL (ej: `https://xxxx.ngrok-free.app/api/auth/callback`).
3.  **Actualización de .env**: Se modificará el archivo de configuración para que la aplicación reconozca la nueva dirección de retorno.
4.  **Ejecución de Minería**: Una vez autenticado, se procederá a ejecutar el script `scripts/mine_data.js` para poblar el dataset histórico.

---
**Documentación de soporte para el desarrollo de la Tesis.**
*Fecha: 14 de Mayo de 2026*
