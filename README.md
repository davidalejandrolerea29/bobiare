# Bobiare

Aplicación móvil Expo SDK 54. Android puede ejecutarse con Expo Go. La
navegación Liquid Glass nativa de iOS y las notificaciones push requieren un
development build.

## Ejecutar con Expo Go

Requiere Node.js 20.19 o superior y Expo Go para SDK 54.

```sh
npm install
npm start
```

Escaneá el QR desde Expo Go. Este comando fuerza el runtime de Expo Go aunque
`expo-dev-client` esté instalado. Expo Go sirve para revisar la interfaz, pero
no incluye los módulos nativos Firebase: la opción «Notificaciones» aparece
como no disponible.

Para abrir Android:

```sh
npm run android
```

Si Metro conserva datos de una ejecución anterior:

```sh
npm run start:clear
```

## Ejecutar con Development Build

Generá e instalá la APK una vez:

```sh
npm run build:dev:android
```

Después iniciá Metro para el cliente de desarrollo:

```sh
npm run start:dev
```

El QR abrirá la APK de Bobiare instalada. No es necesario reconstruir la APK
por cambios de JavaScript o TypeScript; solo cuando cambian módulos o
configuraciones nativas.

**Después de integrar Firebase hay que generar una APK nueva:** actualizar
solo Metro no añade los módulos nativos a una APK anterior.

### iOS 26 y Liquid Glass

Expo Go no incluye la versión de `react-native-screens` que necesita la barra
de pestañas UIKit de esta app. Generá e instalá un development build de iOS:

```sh
npm run build:dev:ios
```

Después de instalarlo en el dispositivo, iniciá Metro con:

```sh
npm run ios
```

Si ya había un development build instalado antes de agregar o actualizar los
módulos nativos, desinstalalo primero. Una recarga de Metro u OTA no reemplaza
los módulos compilados dentro de la aplicación.

## API de Bobiare

La app usa por defecto `https://bobiare.n7softwares.com/api/v1`. Para apuntar
a otro ambiente:

```sh
EXPO_PUBLIC_API_URL=https://tu-host/api/v1 npm start
```

Todas las solicitudes incluyen `Accept: application/json`. El JWT y el
`guest_token` del carrito se guardan en AsyncStorage y se adjuntan
automáticamente como `Authorization: Bearer ...` y `X-Guest-Token`.

## Acceso con Google

Ingreso y registro incluyen «Continuar con Google» con este flujo:

```text
Google nativo → Firebase Authentication → getIdToken(usuario, true)
             → POST /auth/google { id_token: tokenFirebase }
             → JWT y usuario BOBIARE
```

La API recibe el **ID token de Firebase Authentication**, obtenido después
de `signInWithCredential`; el token inicial de Google y el token FCM son
credenciales distintas. Solo el JWT BOBIARE se guarda como sesión de negocio.
Se reutilizan la migración del carrito invitado y la navegación del login
habitual. Si el acceso empezó desde el checkout, vuelve allí al terminar.
Las sesiones auxiliares de Google y Firebase se cierran al finalizar el
intento, incluso cuando falla el intercambio con la API.

### Configuración OAuth

Usar el proyecto Firebase existente **`bobiare-push-n7`**. Según la guía del
backend, Google ya está habilitado como proveedor y el login web está probado.
El JSON Android actual ya incluye los clientes OAuth Web y Android; el
certificado Android coincide con la SHA-1 de EAS indicada abajo y la app
detecta automáticamente el cliente Web. La captura de Firebase compartida
el 5 de noviembre de 2026 confirma el registro de ambas huellas. El plist iOS actual
todavía no incluye los IDs OAuth. Para completar o actualizar la configuración:

Huellas de la firma Android EAS para `com.bobiare`, coincidentes con las
registradas en Firebase según la captura compartida:

```text
SHA-1: 20:83:6D:F2:72:DA:4C:BD:3E:51:C2:81:40:88:90:C4:1F:C0:BE:2F
SHA-256: 77:94:6B:AF:FF:32:61:6A:38:D3:E8:B9:C6:DF:CB:17:E5:C5:D4:4D:95:5E:12:0C:1A:41:B6:ED:6E:62:C0:20
```

Estas huellas se registran en Firebase; agregarlas manualmente al JSON no
registra el certificado ni crea el cliente OAuth Android.

1. En Firebase, agregar la **SHA-1 de la firma del build instalado** a Android
   `com.bobiare`. Registrar también la de Play App Signing si se distribuye
   por Google Play, y SHA-256 si la consola lo solicita.
2. Descargar nuevamente `google-services.json` de esa app y reemplazar el
   archivo de la raíz. Debe incluir clientes OAuth Android y Web
   (`client_type: 3`).
3. Descargar nuevamente `GoogleService-Info.plist` para iOS `com.bobiare`.
   Debe incluir `CLIENT_ID` y `REVERSED_CLIENT_ID`.

`app.config.js` lee el cliente Web del JSON y el ID iOS del esquema invertido
del plist y los publica como configuración de la app. El plugin registra
el esquema de retorno iOS. Al reemplazar los archivos, reiniciar Metro y
generar builds nuevos. Si es necesario sobrescribir los IDs, configurar en
`.env` local y en el ambiente EAS que se usa para compilar:

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=TU_CLIENTE_WEB.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=TU_CLIENTE_IOS.apps.googleusercontent.com
# Opcional, relativo a EXPO_PUBLIC_API_URL:
EXPO_PUBLIC_GOOGLE_AUTH_PATH=/auth/google
```

Android requiere el ID Web; iOS requiere ambos IDs. Estas variables son
opcionales cuando los archivos actualizados ya incluyen los IDs. Son
identificadores públicos; las claves de Firebase Admin y los secretos OAuth
permanecen fuera de la app. Revisar también consentimiento y usuarios de
prueba en el proyecto OAuth.

### Contrato del backend

El endpoint por defecto es `POST /api/v1/auth/google` y recibe:

```json
{ "id_token": "ID_TOKEN_DE_FIREBASE_AUTHENTICATION" }
```

El intercambio usa el cliente HTTP de autenticación sin adjuntar ni renovar
un JWT anterior. Envía `X-Guest-Token` si existe un carrito invitado.
Según la guía del backend, el servidor verifica firma, proyecto, vencimiento,
correo verificado y proveedor `google.com`; busca al cliente por UID Firebase
o correo verificado, vincula la cuenta o crea un Cliente y devuelve:

```json
{
  "access_token": "JWT_DE_BOBIARE",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": 123, "name": "Cliente", "email": "cliente@example.com", "role_id": 5 }
}
```

El personal recibe **403** y sigue entrando por email y contraseña. La app
muestra el mensaje del backend sin crear una sesión. Los errores 401 y 503
tampoco reemplazan una sesión previa ni eliminan el carrito invitado.
Si el servidor omite `user`, la app lo consulta en `GET /auth/me`.

### Compilar y probar

La app usa `react-native-nitro-google-signin` con Credential Manager en
Android y `@react-native-firebase/auth` **26.4.0**, de la misma versión que
Firebase App y Messaging. Se conserva el SDK moderno de Google ya integrado;
el intercambio con Firebase usa su credencial Google estándar.
En iOS, Firebase y Google usan CocoaPods: el plugin Firebase App incluye
`ios.disableSPM: true` y el plugin Nitro configura sus pods.

Se necesita un **development build o build de distribución nuevo**;
Google no funciona en Expo Go. Sin IDs OAuth, la app muestra la opción
deshabilitada. El resto de la interfaz puede revisarse con Expo Go.

Después de configurar los IDs, ejecutar `npm run build:dev:android` o
`npm run build:dev:ios`, instalar el build y ejecutar `npm run start:dev`.
Los cambios del ID iOS requieren recompilar para actualizar el esquema de
retorno. Probar en Android e iPhone: cliente nuevo, cliente existente con
los mismos pedidos de la web, cancelación, errores de red/backend, cierre y
cambio de cuenta, sesión al reabrir, carrito, checkout y registro push.
Comprobar también que personal recibe 403 con Google y puede entrar por
contraseña. Estos casos requieren builds instalados y cuentas de prueba;
las pruebas automáticas no verifican la configuración real de Firebase.

Referencias: [Google en Expo](https://docs.expo.dev/guides/google-authentication/),
[configuración del SDK](https://react-native-nitro-google-sign-in.github.io/docs/setup/expo/),
[Google con Firebase Auth](https://rnfirebase.io/auth/social-auth)
y [verificación de tokens Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Notificaciones Firebase y facturas

Las apps Firebase Android e iOS de `com.bobiare` están registradas en el
proyecto `bobiare-push-n7`. Los archivos públicos `google-services.json` y
`GoogleService-Info.plist` están en este repositorio y `app.json` los incluye.
La clave privada de envío vive únicamente en el backend; no debe copiarse a
este repo ni a la app.

Con un development build o una app de distribución instalada, el cliente
inicia sesión y activa «Notificaciones» en Perfil. La app pide el permiso,
registra el token FCM contra `POST /api/v1/push/installations` y renueva el
registro al volver a abrirse o cambiar el token. Al desactivar o cerrar
sesión, retira ese registro. Los avisos de estado y factura abren el pedido
correspondiente en «Mis pedidos». La factura real autorizada muestra allí
«Abrir factura PDF» y usa la API autenticada; una factura de prueba no se
muestra al cliente.

Perfil muestra el estado de los avisos con un interruptor y permite abrir
los ajustes si el sistema rechazó el permiso. Al regresar a la app se revisan
los permisos y se sincroniza el registro sin volver a pedir autorización.
Al tocar un aviso se actualiza el pedido, incluso si ya estaba abierto.
Las altas y bajas se procesan en orden para evitar que una renovación del
token reactive los avisos durante una desactivación o un cierre de sesión.
Si fallan tanto la baja del servidor como la invalidación en Firebase, la app
conserva el registro para reintentar y muestra el error al desactivar. Una
baja pendiente por cierre de sesión se reintenta al volver a la app, incluso
sin una sesión iniciada.

Para Android, instalar una APK nueva en un dispositivo, aceptar avisos y
probar una transición de **pedido de prueba** con la app abierta, en segundo
plano y cerrada. Para iOS, falta subir a Firebase la clave APNs del equipo
Apple que firma `com.bobiare`; luego probar en un iPhone físico con un build
firmado. El envío de factura requiere que ARCA se habilite con los datos
fiscales reales del emisor.

La API mantiene compatibilidad con tokens FCM; su nuevo contrato también
acepta Firebase Installation ID (`fid`) para una futura versión del SDK
móvil. La guía de backend está en
`backend_bobiare/mds/2026-10-15-integracion-push-app-movil.md` del proyecto
BOBIARE. Si el build se hace desde CI, configurar `EXPO_TOKEN` como secreto
del entorno; `.env` es local y está ignorado por Git.
