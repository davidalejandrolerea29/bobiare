import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { getAuthState } from './authState';
import { registerPushToken, unregisterPushToken } from './api';

const TOKEN_KEY = 'bobiare.push.fcm_token';
const OPT_OUT_KEY = 'bobiare.push.opt_out';
const LOGOUT_REMOVAL_KEY = 'bobiare.push.logout_pending';
let generation = 0;
let operations: Promise<unknown> = Promise.resolve();
let syncInFlight: { generation: number; promise: Promise<boolean> } | null = null;
const statusListeners = new Set<() => void>();

export type PushMessage = {
  messageId?: string;
  notification?: { title?: string; body?: string };
  data?: { [key: string]: string | object };
};

export function subscribePushStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

// Serializar también FCM evita que deleteToken borre un registro recién activado.
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.catch(() => {});
  return result.finally(() => statusListeners.forEach(listener => listener()));
}

async function firebaseMessaging() {
  // Expo Go permite revisar la interfaz sin cargar módulos nativos de Firebase.
  if (!['android', 'ios'].includes(Platform.OS) ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  return require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
}

type Firebase = NonNullable<Awaited<ReturnType<typeof firebaseMessaging>>>;

async function hasPushPermission(firebase: Firebase) {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) < 33 ||
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const status = await firebase.hasPermission(firebase.getMessaging());
  return status === firebase.AuthorizationStatus.AUTHORIZED ||
    status === firebase.AuthorizationStatus.PROVISIONAL;
}

async function requestPushPermission(firebase: Firebase) {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) < 33 ||
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) ===
        PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await firebase.requestPermission(firebase.getMessaging());
  return status === firebase.AuthorizationStatus.AUTHORIZED ||
    status === firebase.AuthorizationStatus.PROVISIONAL;
}

async function getDeviceToken(firebase: Firebase) {
  const messaging = firebase.getMessaging();
  if (Platform.OS === 'ios') {
    if (!messaging.isDeviceRegisteredForRemoteMessages) {
      await firebase.registerDeviceForRemoteMessages(messaging);
    }
    // En iOS el SDK necesita recibir APNs antes de solicitar el token FCM.
    for (let attempt = 0; attempt < 5; attempt++) {
      if (await firebase.getAPNSToken(messaging)) break;
      if (attempt === 4) throw new Error('El dispositivo todavía no obtuvo un token APNs. Intentá nuevamente en unos segundos.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return firebase.getToken(messaging);
}

const isCurrent = (startedAt: number) =>
  generation === startedAt && getAuthState() === true;

async function syncToken(token: string, startedAt: number) {
  if (!isCurrent(startedAt) || await AsyncStorage.getItem(OPT_OUT_KEY) === 'true') return false;
  const previous = await AsyncStorage.getItem(TOKEN_KEY);
  if (!isCurrent(startedAt)) return false;
  await registerPushToken(token);
  if (!isCurrent(startedAt)) {
    // Conservarlo hasta la baja: si falla la red, la siguiente operación reintenta.
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return false;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (previous && previous !== token) await unregisterPushToken(previous).catch(() => {});
  return isCurrent(startedAt);
}

async function removeRegistration(firebase: Firebase | null, useBackend = true, invalidateUnknown = false) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token && (!invalidateUnknown || !firebase)) return;
  const [backend, device] = await Promise.allSettled([
    useBackend && token ? unregisterPushToken(token) : Promise.reject(new Error('Sin registro autenticado')),
    firebase ? firebase.deleteToken(firebase.getMessaging()) : Promise.reject(new Error('FCM no disponible')),
  ]);
  // Basta retirar el destinatario o invalidar su token para detener el envío.
  if (backend.status === 'rejected' && device.status === 'rejected') {
    throw new Error('No pudimos desactivar los avisos. Revisá tu conexión e intentá nuevamente.');
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function syncGrantedPush(): Promise<boolean> {
  if (getAuthState() !== true) return Promise.resolve(false);
  const startedAt = generation;
  if (syncInFlight?.generation === startedAt) return syncInFlight.promise;
  const promise = serialize(async () => {
    if (!isCurrent(startedAt)) return false;
    const firebase = await firebaseMessaging();
    if (!firebase || !isCurrent(startedAt)) return false;
    if (await AsyncStorage.getItem(LOGOUT_REMOVAL_KEY) === 'true') {
      await removeRegistration(firebase, true, true);
      await AsyncStorage.removeItem(LOGOUT_REMOVAL_KEY);
    }
    if (await AsyncStorage.getItem(OPT_OUT_KEY) === 'true' || !await hasPushPermission(firebase)) {
      await removeRegistration(firebase);
      return false;
    }
    return syncToken(await getDeviceToken(firebase), startedAt);
  });
  syncInFlight = { generation: startedAt, promise };
  void promise.finally(() => {
    if (syncInFlight?.promise === promise) syncInFlight = null;
  }).catch(() => {});
  return promise;
}

export function activatePush(): Promise<boolean> {
  const startedAt = ++generation;
  return serialize(async () => {
    const firebase = await firebaseMessaging();
    if (!firebase || !isCurrent(startedAt)) return false;
    if (await AsyncStorage.getItem(LOGOUT_REMOVAL_KEY) === 'true') {
      await removeRegistration(firebase, true, true);
      await AsyncStorage.removeItem(LOGOUT_REMOVAL_KEY);
    }
    if (!await requestPushPermission(firebase) || !isCurrent(startedAt)) return false;
    await AsyncStorage.removeItem(OPT_OUT_KEY);
    return syncToken(await getDeviceToken(firebase), startedAt);
  });
}

export function deactivatePush() {
  generation++;
  return serialize(async () => {
    await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
    await removeRegistration(await firebaseMessaging(), true, true);
  });
}

export function removePushRegistrationForLogout() {
  generation++;
  return serialize(async () => {
    await AsyncStorage.setItem(LOGOUT_REMOVAL_KEY, 'true');
    // El servidor pudo aceptar un POST cuya respuesta se perdió antes de guardar
    // TOKEN_KEY. Invalidar FCM también cuando no hay registro local confirmado.
    await removeRegistration(await firebaseMessaging(), true, true);
    await AsyncStorage.removeItem(LOGOUT_REMOVAL_KEY);
  });
}

export function retryPendingPushRemoval() {
  return serialize(async () => {
    if (await AsyncStorage.getItem(LOGOUT_REMOVAL_KEY) !== 'true' && getAuthState() !== false) return;
    // También invalidar el token si la sesión venció o fue rechazada por la API.
    await AsyncStorage.setItem(LOGOUT_REMOVAL_KEY, 'true');
    await removeRegistration(await firebaseMessaging(), getAuthState() === true, true);
    await AsyncStorage.removeItem(LOGOUT_REMOVAL_KEY);
  });
}

export async function pushStatus() {
  const firebase = await firebaseMessaging();
  if (!firebase) return { available: false, enabled: false, permissionGranted: false };
  const [token, permissionGranted] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    hasPushPermission(firebase),
  ]);
  // Si ambas bajas fallaron conservamos el token y mostramos que sigue activo.
  return { available: true, enabled: Boolean(token && permissionGranted), permissionGranted };
}

export async function attachPushListeners(
  onForeground: (message: PushMessage) => void,
  onOpen: (message: PushMessage) => void,
) {
  const firebase = await firebaseMessaging();
  if (!firebase) return () => {};
  const messaging = firebase.getMessaging();
  let active = true;
  const stops: (() => void)[] = [];
  const deliver = async (message: PushMessage, foreground: boolean) => {
    const startedAt = generation;
    if (await AsyncStorage.getItem(OPT_OUT_KEY) === 'true' || !active || generation !== startedAt) return;
    if (foreground) {
      if (getAuthState() === true && await hasPushPermission(firebase) && active && isCurrent(startedAt)) {
        onForeground(message);
      }
    } else if (getAuthState() !== false) {
      onOpen(message);
    }
  };
  const stop = () => {
    active = false;
    stops.forEach(unsubscribe => unsubscribe());
  };
  try {
    stops.push(firebase.onMessage(messaging, message => { void deliver(message, true).catch(() => {}); }));
    stops.push(firebase.onNotificationOpenedApp(messaging, message => { void deliver(message, false).catch(() => {}); }));
    stops.push(firebase.onTokenRefresh(messaging, token => {
      const startedAt = generation;
      void serialize(async () => {
        if (!active || !isCurrent(startedAt) ||
            await AsyncStorage.getItem(LOGOUT_REMOVAL_KEY) === 'true' ||
            !await hasPushPermission(firebase)) return false;
        return syncToken(token, startedAt);
      }).catch(() => {});
    }));
    void firebase.getInitialNotification(messaging).then(message => {
      if (message) return deliver(message, false);
    }).catch(() => {});
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
