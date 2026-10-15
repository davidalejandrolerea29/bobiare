import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { getAuthState } from './authState';
import { registerPushToken, unregisterPushToken } from './api';

const TOKEN_KEY = 'bobiare.push.fcm_token';
const OPT_OUT_KEY = 'bobiare.push.opt_out';
let generation = 0;

type PushMessage = {
  notification?: { title?: string; body?: string };
  data?: { [key: string]: string | object };
};

async function firebaseMessaging() {
  // React Native Firebase necesita un build nativo; Expo Go sigue usable para UI.
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  return import('@react-native-firebase/messaging');
}

async function hasPushPermission(firebase: NonNullable<Awaited<ReturnType<typeof firebaseMessaging>>>) {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) < 33 ||
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const status = await firebase.hasPermission(firebase.getMessaging());
  return status === firebase.AuthorizationStatus.AUTHORIZED ||
    status === firebase.AuthorizationStatus.PROVISIONAL;
}

async function requestPushPermission(firebase: NonNullable<Awaited<ReturnType<typeof firebaseMessaging>>>) {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) < 33 ||
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) ===
        PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await firebase.requestPermission(firebase.getMessaging());
  return status === firebase.AuthorizationStatus.AUTHORIZED ||
    status === firebase.AuthorizationStatus.PROVISIONAL;
}

async function getDeviceToken(firebase: NonNullable<Awaited<ReturnType<typeof firebaseMessaging>>>) {
  const messaging = firebase.getMessaging();
  if (Platform.OS === 'ios') {
    await firebase.registerDeviceForRemoteMessages(messaging);
    // En iOS el SDK no puede solicitar el token FCM antes de recibir APNs.
    for (let attempt = 0; attempt < 5; attempt++) {
      if (await firebase.getAPNSToken(messaging)) break;
      if (attempt === 4) throw new Error('El dispositivo todavía no obtuvo un token APNs.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return firebase.getToken(messaging);
}

async function syncToken(token: string, startedAt: number) {
  if (generation !== startedAt || getAuthState() !== true ||
      await AsyncStorage.getItem(OPT_OUT_KEY) === 'true') return false;

  const previous = await AsyncStorage.getItem(TOKEN_KEY);
  await registerPushToken(token);
  if (generation !== startedAt || getAuthState() !== true) {
    await unregisterPushToken(token).catch(() => {});
    return false;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (previous && previous !== token) await unregisterPushToken(previous).catch(() => {});
  return true;
}

export async function syncGrantedPush() {
  const firebase = await firebaseMessaging();
  if (!firebase || getAuthState() !== true ||
      await AsyncStorage.getItem(OPT_OUT_KEY) === 'true') return false;
  if (!await hasPushPermission(firebase)) {
    await removePushRegistration(false);
    return false;
  }
  const startedAt = generation;
  return syncToken(await getDeviceToken(firebase), startedAt);
}

export async function activatePush() {
  const firebase = await firebaseMessaging();
  if (!firebase || getAuthState() !== true) return false;
  if (!await requestPushPermission(firebase)) return false;
  await AsyncStorage.removeItem(OPT_OUT_KEY);
  const startedAt = generation;
  return syncToken(await getDeviceToken(firebase), startedAt);
}

async function removePushRegistration(optOut: boolean) {
  generation++;
  if (optOut) await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    await unregisterPushToken(token).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  const firebase = await firebaseMessaging();
  if (firebase) await firebase.deleteToken(firebase.getMessaging()).catch(() => {});
}

export async function deactivatePush() {
  await removePushRegistration(true);
}

export async function removePushRegistrationForLogout() {
  await removePushRegistration(false);
}

export async function pushStatus() {
  const firebase = await firebaseMessaging();
  if (!firebase) return { available: false, enabled: false };
  const [token, optedOut, permitted] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(OPT_OUT_KEY),
    hasPushPermission(firebase),
  ]);
  return { available: true, enabled: Boolean(token && optedOut !== 'true' && permitted) };
}

export async function attachPushListeners(
  onForeground: (message: PushMessage) => void,
  onOpen: (message: PushMessage) => void,
) {
  const firebase = await firebaseMessaging();
  if (!firebase) return () => {};
  const messaging = firebase.getMessaging();
  const stopForeground = firebase.onMessage(messaging, onForeground);
  const stopOpen = firebase.onNotificationOpenedApp(messaging, onOpen);
  const stopToken = firebase.onTokenRefresh(messaging, token => {
    void syncToken(token, generation).catch(() => {});
  });
  void firebase.getInitialNotification(messaging).then(message => {
    if (message) onOpen(message);
  }).catch(() => {});
  return () => { stopForeground(); stopOpen(); stopToken(); };
}
