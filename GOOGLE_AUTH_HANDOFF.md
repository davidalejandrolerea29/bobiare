# Login con Google en la app móvil BOBIARE

Guía para David. Estado revisado el 5 de noviembre de 2026 en este repositorio (`Expo SDK 54`, Android e iOS `com.bobiare`). El objetivo es que **Continuar con Google** abra la misma cuenta de cliente BOBIARE que usa la web y que pedidos, carrito y notificaciones sigan usando la sesión de la API.

## Estado actual y contrato

- Proyecto Firebase: [`bobiare-push-n7`](https://console.firebase.google.com/project/bobiare-push-n7/overview). Google ya figura habilitado como proveedor de Firebase Authentication; el login web se probó correctamente. Android e iOS están registrados como `com.bobiare`.
- La app móvil **todavía no implementa** Google: `screens/HomeScreen.tsx` solo llama a `login(email, password)` de `utils/api.ts`. Ya usa `@react-native-firebase/app` y `@react-native-firebase/messaging` para push.
- Los `google-services.json` y `GoogleService-Info.plist` actuales son válidos como configuración base de Firebase, pero el Android **no contiene clientes OAuth** y el plist iOS **no contiene `CLIENT_ID` ni `REVERSED_CLIENT_ID`**. Hay que completar la configuración de Google para cada plataforma y descargar de nuevo ambos archivos antes de compilar el login.
- La API existente recibe `POST https://bobiare.n7softwares.com/api/v1/auth/google` con JSON `{ "id_token": "<Firebase Auth ID token>" }`. Devuelve `200` con `{ "access_token": "<JWT BOBIARE>", "token_type": "bearer", "expires_in": <segundos>, "user": { ... } }`.
- El backend verifica firma, proyecto, vencimiento, correo verificado y proveedor `google.com`. Busca al cliente por UID de Firebase o email verificado; si existe, lo vincula, y si no, crea un **Cliente**. Las cuentas de personal reciben `403` y mantienen su login con contraseña.

```text
Botón Google → Google nativo → Firebase Authentication
             → getIdToken(usuarioFirebase, true)
             → POST /auth/google { id_token }
             → JWT + usuario BOBIARE → persistSession() → navegación normal
```

El token que recibe `/auth/google` es **el ID token de Firebase Authentication**, obtenido *después* de `signInWithCredential`. El ID token inicial de Google, el access token de Google y el token FCM de push son distintos y no sirven para ese endpoint.

## 1. Completar Firebase y los builds nativos

1. En [Firebase Authentication → Sign-in method](https://console.firebase.google.com/project/bobiare-push-n7/authentication/providers), confirmar que **Google** continúa habilitado. Ya se hizo para la web; no hay que crear otro proyecto.
2. En [Project settings → Your apps](https://console.firebase.google.com/project/bobiare-push-n7/settings/general), abrir la app Android `com.bobiare`. Agregar **SHA-1** de la firma del APK de desarrollo/EAS y, cuando se publique en Play, la SHA-1 de **Play App Signing**. Agregar SHA-256 si la consola lo solicita. El package debe seguir siendo `com.bobiare`. Las huellas se obtienen de las credenciales EAS/keystore o de Play Console; una huella de otra firma no funciona.
3. Descargar otra vez `google-services.json` de esa app Android y reemplazar el archivo de la raíz del repo. Comprobar que `client[].oauth_client` contiene al menos un cliente `client_type: 3` (OAuth **Web**) y el cliente Android correspondiente. Usar el ID del cliente Web como `webClientId` público de la librería de Google. Si sigue vacío, revisar Google habilitado, SHA-1 y clientes OAuth del proyecto antes de compilar.
4. Abrir la app iOS `com.bobiare` en Firebase y descargar otra vez `GoogleService-Info.plist`. Comprobar que incluya `CLIENT_ID` y `REVERSED_CLIENT_ID` del cliente OAuth iOS. Si faltan, revisar la configuración OAuth iOS para el mismo bundle ID en Firebase/Google Cloud. El plugin Expo configura el URL scheme del plist.
5. `app.json` ya apunta a esos dos archivos. Tras actualizar los archivos y agregar módulos nativos, generar e instalar **builds nuevos**. Expo Go, una recarga de Metro o una actualización OTA no agregan módulos nativos al binario ya instalado.

Referencias: [Firebase Android Google Sign-In](https://firebase.google.com/docs/auth/android/google-signin), [Expo Google Authentication](https://docs.expo.dev/guides/google-authentication/), [configuración Expo de Google Sign-In](https://react-native-google-signin.github.io/docs/setting-up/expo).

## 2. Integración sugerida en el código

Se puede usar la librería pública `@react-native-google-signin/google-signin` junto con React Native Firebase Auth. La edición gratuita funciona con el SDK clásico de Google en Android; Google lo marcó como obsoleto, así que antes de publicar conviene reevaluar la opción con Credential Manager. Para cerrar el flujo actual, esta combinación está documentada por [React Native Firebase](https://rnfirebase.io/auth/social-auth).

```sh
npm install @react-native-firebase/auth@^26.4.0 @react-native-google-signin/google-signin
npx expo install --check
```

Mantener `@react-native-firebase/auth` en la misma línea `26.x` que `@react-native-firebase/app` y `messaging` de este repo. Revisar el lockfile y la compatibilidad indicada por Expo antes del build.

Agregar `@react-native-firebase/auth` y `@react-native-google-signin/google-signin` a `plugins` de `app.json`, conservando los plugins existentes y las rutas `googleServicesFile`. **En iOS, los plugins de Google y Firebase deben usar el mismo gestor de dependencias.** Este repo tiene RNFirebase 26; seguir la [nota de compatibilidad RNFirebase 26/Expo](https://react-native-google-signin.github.io/docs/setting-up/expo) para CocoaPods (`iosDependencyManager: "cocoapods"` en Google y `ios.disableSPM: true` en Firebase App) antes del prebuild.

Configurar Google una sola vez al iniciar la app con el OAuth client ID **Web** del `google-services.json` actualizado (es configuración pública, no una clave privada):

```ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({ webClientId: '<CLIENT_ID_WEB_DE_FIREBASE>' });
```

En `utils/api.ts`, agregar una función que use `authApi`, el cliente Axios sin el JWT anterior. Reutilizar la persistencia de `login()` y su tratamiento del carrito invitado; extraer esa lógica a una función común para que ambas formas de acceso se comporten igual:

```ts
export async function loginWithGoogle(firebaseIdToken: string): Promise<ApiUser> {
  const { data } = await authApi.post('/auth/google', { id_token: firebaseIdToken });
  await persistSession(data, data.user);
  // Reutilizar aquí el mismo traspaso de carrito invitado que hace login().
  return data.user as ApiUser;
}
```

En un helper de autenticación nativa, obtener primero el ID token de Google para iniciar sesión **en Firebase** y luego obtener el ID token **de Firebase** para BOBIARE:

```ts
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider, getAuth, getIdToken, signInWithCredential, signOut,
} from '@react-native-firebase/auth';
import { loginWithGoogle } from './api';

export async function signInWithGoogleForBobiare() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const googleResult = await GoogleSignin.signIn();
  if (!isSuccessResponse(googleResult)) return null; // El usuario canceló.

  const googleIdToken = googleResult.data.idToken;
  if (!googleIdToken) throw new Error('Google no devolvió un ID token.');

  try {
    const credential = GoogleAuthProvider.credential(googleIdToken);
    const firebaseResult = await signInWithCredential(getAuth(), credential);
    const firebaseIdToken = await getIdToken(firebaseResult.user, true);
    return await loginWithGoogle(firebaseIdToken);
  } finally {
    // La sesión de negocio es el JWT BOBIARE. Permite elegir otra cuenta
    // Google en el siguiente ingreso y evita una sesión Firebase residual.
    await signOut(getAuth()).catch(() => {});
    await GoogleSignin.signOut().catch(() => {});
  }
}
```

Añadir un botón **Continuar con Google** en `screens/HomeScreen.tsx` que invoque ese helper. Si devuelve `null`, no mostrar error. Si devuelve usuario, usar la **misma navegación** de `handleLogin`: respetar `returnToCheckout` y llevar al cliente a `MainTabs` en iOS o `ClientHome` en Android. Mantener el login de email/contraseña para el personal. Mostrar errores de API con `getErrorMessage`; no mostrar ni registrar tokens en logs.

El backend devuelve el JWT BOBIARE que `persistSession()` guarda en `bobiare.access_token`, junto con `bobiare.user` y expiración. Así `utils/api.ts` sigue agregando `Authorization: Bearer <JWT BOBIARE>` a pedidos, carrito y `POST /push/installations`; `PushCoordinator` puede registrar el dispositivo después de que `setAuthState(true)` se emita. Al cerrar sesión, conservar `logout()` de `utils/api.ts`, que retira la instalación push, invalida la sesión y borra el estado local.

## 3. Validación antes de darlo por terminado

- Instalar **build Android nuevo** con Google Play Services y **build iOS nuevo** en un iPhone. Probar con cuenta Google nueva: se crea Cliente, aparecen catálogo/pedidos y persiste sesión al reabrir.
- Probar con el correo verificado de un Cliente existente: ingresa al **mismo usuario y pedidos**, sin duplicar cuenta. Probar acceso desde la web con esa cuenta.
- Probar cancelación del selector, red caída/error del backend, sesión vencida y cierre de sesión. El botón no debe quedar bloqueado, ni deben quedar credenciales Google/Firebase residuales que cambien de usuario silenciosamente.
- Comprobar que el carrito invitado llega a la cuenta al usar Google igual que con contraseña, que `returnToCheckout` vuelve al checkout y que push se registra para ese cliente.
- Una cuenta administrativa debe recibir `403` y seguir entrando solo por el login existente. `400` indica `id_token` ausente; `401`, token inválido; `503`, verificación temporalmente no disponible. Mostrar mensajes de error sin imprimir el token.
- Si Android devuelve `DEVELOPER_ERROR`, verificar package `com.bobiare`, SHA-1 de **la firma del build instalado** y cliente Web usado en `GoogleSignin.configure`. Si iOS no vuelve a la app, verificar `REVERSED_CLIENT_ID` y el URL scheme del build.
- Para publicar en App Store, revisar la [regla 4.8 de Apple sobre servicios de login](https://developer.apple.com/app-store/review/guidelines/): si Google autentica la cuenta principal, Apple exige una alternativa equivalente con protección de privacidad (por ejemplo, Iniciar sesión con Apple, salvo que aplique una excepción de la regla). El login actual con email y contraseña por sí solo no garantiza cumplir esas condiciones.

**No incluir en la app ni en Git** claves de cuenta de servicio, Firebase Admin JSON, secretos OAuth, contraseñas o tokens reales. Los dos archivos de configuración de cliente Firebase son públicos y ya forman parte de este repo.
