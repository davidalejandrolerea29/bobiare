import Constants, {ExecutionEnvironment} from 'expo-constants';
import {Platform} from 'react-native';
import type {OneTapResponse} from 'react-native-nitro-google-signin';
import type {ApiUser} from '../types/types';
import {loginWithGoogle} from './api';

const clientIdPattern = /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
let configuredClientIds: string | null = null;

type FirebaseAuthModule = typeof import('@react-native-firebase/auth');
type FirebaseAuth = ReturnType<FirebaseAuthModule['getAuth']>;

function getGoogleClientIds() {
  const publicConfig = Constants.expoConfig?.extra?.googleSignIn;
  return {
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
      (typeof publicConfig?.webClientId === 'string'
        ? publicConfig.webClientId.trim()
        : ''),
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
      (typeof publicConfig?.iosClientId === 'string'
        ? publicConfig.iosClientId.trim()
        : ''),
  };
}

function firebaseErrorMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? error.code
      : undefined;
  switch (code) {
    case 'auth/network-request-failed':
      return 'Revisá tu conexión y volvé a ingresar con Google.';
    case 'auth/account-exists-with-different-credential':
      return 'Esta cuenta ya usa otro método de acceso. Ingresá con ese método.';
    case 'auth/user-disabled':
      return 'Esta cuenta no está habilitada.';
    case 'auth/operation-not-allowed':
    case 'auth/app-not-authorized':
      return 'El acceso con Google todavía no está habilitado para esta versión de la app.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Esperá unos minutos y volvé a intentar.';
    default:
      return 'No se pudo verificar tu cuenta de Google. Volvé a intentar.';
  }
}

export function getGoogleSignInUnavailableReason(): string | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'Google está disponible en la app instalada.';
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'Google está disponible en la app instalada.';
  }
  const {webClientId, iosClientId} = getGoogleClientIds();
  if (
    !clientIdPattern.test(webClientId) ||
    (Platform.OS === 'ios' && !clientIdPattern.test(iosClientId))
  ) {
    return 'El acceso con Google todavía no está habilitado.';
  }
  return null;
}

export async function signInWithGoogle(): Promise<ApiUser | null> {
  const unavailableReason = getGoogleSignInUnavailableReason();
  if (unavailableReason) {
    throw new Error(unavailableReason);
  }

  let google: typeof import('react-native-nitro-google-signin');
  try {
    // Expo Go y los builds anteriores pueden abrir la app sin este módulo nativo.
    google = require('react-native-nitro-google-signin');
  } catch {
    throw new Error('Para ingresar con Google, actualizá la app instalada.');
  }

  let firebase: FirebaseAuthModule | undefined;
  let firebaseAuth: FirebaseAuth | undefined;
  try {
    let response: OneTapResponse;
    try {
      const clientIdsConfig = getGoogleClientIds();
      const webClientId = clientIdsConfig.webClientId;
      const iosClientId =
        Platform.OS === 'ios' ? clientIdsConfig.iosClientId : undefined;
      const clientIds = `${webClientId}|${iosClientId || ''}`;
      if (configuredClientIds !== clientIds) {
        google.GoogleOneTapSignIn.configure({
          webClientId,
          ...(iosClientId ? {iosClientId} : {}),
          offlineAccess: false,
        });
        configuredClientIds = clientIds;
      }
      if (Platform.OS === 'android') {
        await google.GoogleOneTapSignIn.checkPlayServices();
      }
      // Mostrar el selector explícito permite elegir otra cuenta después de salir.
      response = await google.GoogleOneTapSignIn.presentExplicitSignIn();
    } catch (error) {
      if (google.isErrorWithCode(error)) {
        if (error.code === google.statusCodes.SIGN_IN_CANCELLED) {
          return null;
        }
        if (error.code === google.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error(
            'Actualizá los Servicios de Google Play para ingresar con Google.',
          );
        }
        if (error.code === google.statusCodes.DEVELOPER_ERROR) {
          throw new Error(
            'El acceso con Google todavía no está habilitado para esta versión de la app.',
          );
        }
        if (error.code === google.statusCodes.IN_PROGRESS) {
          throw new Error(
            'Esperá a que termine el ingreso con Google y volvé a intentar.',
          );
        }
      }
      throw new Error('No se pudo conectar con Google. Volvé a intentar.');
    }

    if (google.isCancelledResponse(response)) {
      return null;
    }
    if (!google.isSuccessResponse(response) || !response.data.idToken?.trim()) {
      throw new Error('Google no pudo confirmar tu cuenta. Volvé a intentar.');
    }

    let firebaseModule: FirebaseAuthModule;
    try {
      firebaseModule = require('@react-native-firebase/auth');
      firebase = firebaseModule;
      firebaseAuth = firebaseModule.getAuth();
    } catch {
      throw new Error('Para ingresar con Google, actualizá la app instalada.');
    }

    let firebaseIdToken: string;
    try {
      const credential = firebaseModule.GoogleAuthProvider.credential(
        response.data.idToken,
      );
      const result = await firebaseModule.signInWithCredential(
        firebaseAuth,
        credential,
      );
      firebaseIdToken = await firebaseModule.getIdToken(result.user, true);
    } catch (error) {
      throw new Error(firebaseErrorMessage(error));
    }
    if (typeof firebaseIdToken !== 'string' || !firebaseIdToken.trim()) {
      throw new Error(
        'No se pudo verificar tu cuenta de Google. Volvé a intentar.',
      );
    }

    // El backend verifica un Firebase Auth ID token y devuelve el JWT de Bobiare.
    // await mantiene la limpieza posterior incluso si el servidor rechaza la cuenta.
    return await loginWithGoogle(firebaseIdToken);
  } finally {
    if (firebase && firebaseAuth) {
      try {
        await firebase.signOut(firebaseAuth);
      } catch {
        // La sesión de Bobiare es independiente; la limpieza no altera su resultado.
      }
    }
    try {
      await google.GoogleOneTapSignIn.signOut();
    } catch {
      // Intentar ambas limpiezas aunque una falle, también al cancelar el selector.
    }
  }
}
