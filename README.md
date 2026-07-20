# Bobiare

Aplicación móvil Expo SDK 54 compatible con Expo Go.

## Ejecutar con Expo Go

Requiere Node.js 20.19 o superior y Expo Go para SDK 54.

```sh
npm install
npm start
```

Escaneá el QR desde Expo Go. Este comando fuerza el runtime de Expo Go aunque
`expo-dev-client` esté instalado.

Para abrir un emulador:

```sh
npm run android
npm run ios
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

## API de Bobiare

La app usa por defecto `https://bobiare.n7softwares.com/api/v1`. Para apuntar
a otro ambiente:

```sh
EXPO_PUBLIC_API_URL=https://tu-host/api/v1 npm start
```

Todas las solicitudes incluyen `Accept: application/json`. El JWT y el
`guest_token` del carrito se guardan en AsyncStorage y se adjuntan
automáticamente como `Authorization: Bearer ...` y `X-Guest-Token`.
