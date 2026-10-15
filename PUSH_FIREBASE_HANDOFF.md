# Entrega de push Firebase para la app BOBIARE

Estado al 15 de octubre de 2026. Esta guía es para quien mantiene la app móvil. Repo: `git@github.com:davidalejandrolerea29/bobiare.git`.

## Qué quedó preparado

- La app usa Expo SDK 54 y React Native Firebase Messaging. Firebase: proyecto [`bobiare-push-n7`](https://console.firebase.google.com/project/bobiare-push-n7/overview), número `57684984879`. Android y iOS están registrados con identificador `com.bobiare`.
- `google-services.json` y `GoogleService-Info.plist` están en este repo y referenciados por `app.json`. Son configuración de cliente. La clave privada de la cuenta de servicio que envía push está solo en el servidor de BOBIARE; nunca debe incluirse en una app.
- En **Perfil → Notificaciones** se solicita permiso y se registra el token FCM mediante la sesión BOBIARE. Se actualiza si cambia, se retira al desactivar avisos y al cerrar sesión. Al tocar un aviso de pedido, se abre **Mis pedidos** en ese pedido. En primer plano se muestra un aviso dentro de la app.
- El backend y el worker de BOBIARE están desplegados para enviar avisos por cambios de estado de pedidos y por factura autorizada. La API es `https://bobiare.n7softwares.com/api/v1`. La web usa el mismo proyecto Firebase.
- En **Mis pedidos** se ofrece **Abrir factura PDF** solo cuando la API informa una factura autorizada en producción. La app descarga el PDF con la sesión del cliente y abre la hoja de compartir del dispositivo.

Los cambios se revisaron con TypeScript, Jest, exportación Android/iOS y prebuild Android. **Todavía falta probar la recepción de push en un dispositivo con un build nativo nuevo.** Expo Go no incluye React Native Firebase y no sirve para esa prueba.

## Lo que falta para iPhone: clave APNs

La persona con acceso al equipo de Apple Developer que firma `com.bobiare` debe:

1. En [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list), crear o localizar una **APNs Auth Key** habilitada para Apple Push Notifications service. Guardar el archivo `.p8` cuando se genera: Apple permite descargarlo una sola vez. Anotar el **Key ID** y el **Team ID** del mismo equipo. Verificar que corresponde al equipo usado para firmar la app.
2. En [Firebase → BOBIARE Push → Configuración → Cloud Messaging](https://console.firebase.google.com/project/bobiare-push-n7/settings/cloudmessaging), buscar la aplicación iOS `com.bobiare` y cargar el `.p8` en **APNs authentication key** junto con Key ID y Team ID. Si hay campos separados para development y production, configurarlos según los builds que se vayan a probar.
3. En EAS, confirmar que el perfil iOS usa ese equipo de Apple, que `com.bobiare` tiene capacidad **Push Notifications** y que el perfil de firma incluye el entitlement `aps-environment`. `app.json` ya declara `aps-environment: production`; revisar ese valor y la firma si se utiliza un build de desarrollo.
4. Crear un **build iOS nuevo** e instalarlo en un iPhone físico. Comprobar que el dispositivo recibe el token APNs y después el token FCM. Un simulador o un build viejo no valida el flujo de entrega real.

El `.p8`, credenciales de Apple y tokens de dispositivos **no se suben a Git ni se pegan en un chat**. El socio puede cargar el `.p8` directamente en Firebase. Documentación oficial: [Firebase Cloud Messaging para iOS](https://firebase.google.com/docs/cloud-messaging/ios/get-started), [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage), [Firebase con Expo](https://docs.expo.dev/guides/using-firebase/).

## Build Android y prueba integral

1. Tener acceso al proyecto EAS `5df60eb5-8be8-4df5-99c8-0334beeeb83d` de la cuenta `n7softwares`. Instalar dependencias con `npm ci` y autenticarse con `eas login` o con un `EXPO_TOKEN` guardado como secreto del entorno. No incorporar el token a `.env` versionado.
2. Generar una APK **nueva** con `npx eas-cli build --profile development --platform android` o `npx eas-cli build --profile preview --platform android`. El perfil `production` genera AAB para Google Play. Instalar el build en un teléfono Android con Google Play Services.
3. Iniciar sesión como **cliente de prueba** en la app, entrar a **Perfil → Notificaciones**, activar y conceder permiso. La API debe aceptar `POST /push/installations` con HTTP 200. El cuerpo que manda esta app es `{"token":"<FCM registration token>"}` y usa `Authorization: Bearer <JWT BOBIARE>`; no es un token APNs ni una credencial de Firebase de servidor.
4. Cambiar el estado de un **pedido de prueba** desde el flujo administrativo. Comprobar entrega con la app abierta, en segundo plano y cerrada; tocar el aviso y confirmar que abre el pedido correcto. Repetir al cambiar de usuario en el mismo teléfono y al desactivar avisos/cerrar sesión; el usuario anterior no debe recibir avisos.
5. Repetir la prueba en iPhone tras cargar APNs y generar el build iOS. Si falla, revisar el registro del token en API, los jobs de la cola `push` del backend y la configuración APNs/Firebase antes de cambiar código.

El backend envía `data.type` (`order_status` o `invoice`), `data.order_id` y `data.status`, además del título y texto. La app vuelve a consultar el pedido por API autenticada; el push no transporta un PDF ni datos fiscales completos. Contrato detallado: [guía de integración del backend](https://github.com/N7Softwares/backend_bobiare/blob/main/mds/2026-10-15-integracion-push-app-movil.md).

## Otros pendientes que afectan la prueba

- **Factura real ARCA:** el certificado disponible corresponde al CUIT personal `20-37027526-3`, no al de BOBIARE S.A. Aunque WSFE y el punto de venta 6 respondieron, falta confirmar nombre legal, domicilio fiscal y condición ante IVA con la constancia del titular. Hasta entonces la emisión real sigue bloqueada y no habrá push de factura autorizada ni PDF real para probar. Ver [pendientes ARCA y despliegue](https://github.com/N7Softwares/backend_bobiare/blob/main/mds/2026-10-15-pendientes-arca-y-deploy.md).
- **Correo:** el servidor todavía registra los mensajes en log; falta configurar un proveedor para entregar emails reales al cliente.
- **Seguridad Expo:** este repo tenía un `EXPO_TOKEN` en un `.env` versionado. El archivo se quitó del índice Git, pero el valor sigue en el historial: **revocar/rotar el token en Expo** y guardar el nuevo solo en el gestor de secretos del entorno/CI. No copiar el token viejo a nuevos builds ni mensajes.
- La autenticación actual de clientes es la de BOBIARE; las notificaciones FCM no requieren iniciar sesión con Google.
