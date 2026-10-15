# Bobiare

Aplicación móvil Expo SDK 54. Android puede ejecutarse con Expo Go. La
navegación Liquid Glass nativa de iOS requiere un development build.

## Ejecutar con Expo Go

Requiere Node.js 20.19 o superior y Expo Go para SDK 54.

```sh
npm install
npm start
```

Escaneá el QR desde Expo Go. Este comando fuerza el runtime de Expo Go aunque
`expo-dev-client` esté instalado.

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
