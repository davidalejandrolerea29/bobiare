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
