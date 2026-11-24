import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from '../utils/api';
import { getAuthState } from '../utils/authState';
import {
  activatePush,
  attachPushListeners,
  deactivatePush,
  pushStatus,
  removePushRegistrationForLogout,
  retryPendingPushRemoval,
  subscribePushStatus,
  syncGrantedPush,
} from '../utils/pushNotifications';

jest.mock('../utils/api', () => ({
  registerPushToken: jest.fn(),
  unregisterPushToken: jest.fn(),
}));
jest.mock('../utils/authState', () => ({ getAuthState: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@react-native-firebase/messaging', () => {
  const callbacks: Record<string, (...args: any[]) => void> = {};
  const messaging = { isDeviceRegisteredForRemoteMessages: true };
  return {
    __esModule: true,
    callbacks,
    messaging,
    AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
    getMessaging: jest.fn(() => messaging),
    getToken: jest.fn(),
    deleteToken: jest.fn(),
    getAPNSToken: jest.fn(),
    hasPermission: jest.fn(),
    requestPermission: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(),
    getInitialNotification: jest.fn(),
    onMessage: jest.fn((_, callback) => { callbacks.foreground = callback; return jest.fn(); }),
    onNotificationOpenedApp: jest.fn((_, callback) => { callbacks.open = callback; return jest.fn(); }),
    onTokenRefresh: jest.fn((_, callback) => { callbacks.token = callback; return jest.fn(); }),
  };
});

const firebase = jest.requireMock('@react-native-firebase/messaging');
const register = jest.mocked(registerPushToken);
const unregister = jest.mocked(unregisterPushToken);
const auth = jest.mocked(getAuthState);
const TOKEN_KEY = 'bobiare.push.fcm_token';
const OPT_OUT_KEY = 'bobiare.push.opt_out';
const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version')!;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function flushTasks() {
  for (let step = 0; step < 30; step++) {
    await Promise.resolve();
  }
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 33 });
  (Constants as { executionEnvironment: string }).executionEnvironment = 'bare';
  auth.mockReturnValue(true);
  register.mockResolvedValue(undefined);
  unregister.mockResolvedValue(undefined);
  firebase.getToken.mockResolvedValue('fcm-current');
  firebase.deleteToken.mockResolvedValue(undefined);
  firebase.getAPNSToken.mockResolvedValue('apns-current');
  firebase.requestPermission.mockResolvedValue(1);
  firebase.hasPermission.mockResolvedValue(1);
  firebase.registerDeviceForRemoteMessages.mockResolvedValue(undefined);
  firebase.getInitialNotification.mockResolvedValue(null);
  firebase.messaging.isDeviceRegisteredForRemoteMessages = true;
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
});

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', originalOS);
  Object.defineProperty(Platform, 'Version', originalVersion);
});

test('Expo Go reports push unavailable and avoids native Firebase calls', async () => {
  (Constants as { executionEnvironment: string }).executionEnvironment = 'storeClient';
  expect(await pushStatus()).toEqual({ available: false, enabled: false, permissionGranted: false });
  expect(await activatePush()).toBe(false);
  const stop = await attachPushListeners(jest.fn(), jest.fn());
  stop();
  expect(firebase.getMessaging).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
});

test('Android 13 does not register after notification permission is denied', async () => {
  jest.mocked(PermissionsAndroid.request).mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  expect(await activatePush()).toBe(false);
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  expect(firebase.getToken).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
});

test('older Android activates without requesting runtime notification permission', async () => {
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 32 });
  expect(await activatePush()).toBe(true);
  expect(PermissionsAndroid.request).not.toHaveBeenCalled();
  expect(register).toHaveBeenCalledWith('fcm-current');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe('fcm-current');
});

test.each([1, 2])('iOS permission status %s registers APNs before obtaining the FCM token', async status => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  firebase.messaging.isDeviceRegisteredForRemoteMessages = false;
  firebase.requestPermission.mockResolvedValue(status);
  expect(await activatePush()).toBe(true);
  expect(firebase.registerDeviceForRemoteMessages).toHaveBeenCalledWith(firebase.messaging);
  expect(firebase.getAPNSToken).toHaveBeenCalledWith(firebase.messaging);
  expect(firebase.registerDeviceForRemoteMessages.mock.invocationCallOrder[0])
    .toBeLessThan(firebase.getAPNSToken.mock.invocationCallOrder[0]);
  expect(firebase.getAPNSToken.mock.invocationCallOrder[0])
    .toBeLessThan(firebase.getToken.mock.invocationCallOrder[0]);
});

test('simultaneous synchronization requests share a single registration', async () => {
  const first = syncGrantedPush();
  const second = syncGrantedPush();
  expect(first).toBe(second);
  expect(await first).toBe(true);
  expect(register).toHaveBeenCalledTimes(1);
});

test('disabling during an in-flight registration removes the newly registered token', async () => {
  const registering = deferred<void>();
  const started = deferred<void>();
  register.mockImplementationOnce(() => { started.resolve(); return registering.promise; });
  const activation = activatePush();
  await started.promise;
  const disabling = deactivatePush();
  registering.resolve();
  expect(await activation).toBe(false);
  await disabling;
  expect(unregister).toHaveBeenCalledWith('fcm-current');
  expect(firebase.deleteToken).toHaveBeenCalledTimes(1);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(await AsyncStorage.getItem(OPT_OUT_KEY)).toBe('true');
});

test('failed backend and FCM removal preserves the token and retries without re-enabling', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-current');
  unregister.mockRejectedValueOnce(new Error('offline'));
  firebase.deleteToken.mockRejectedValueOnce(new Error('offline'));
  await expect(deactivatePush()).rejects.toThrow('No pudimos desactivar');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe('fcm-current');
  expect((await pushStatus()).enabled).toBe(true);
  expect(await syncGrantedPush()).toBe(false);
  expect(unregister).toHaveBeenCalledTimes(2);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(register).not.toHaveBeenCalled();
});

test('successful Firebase invalidation completes removal when the API is offline', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-current');
  unregister.mockRejectedValueOnce(new Error('offline'));
  await expect(deactivatePush()).resolves.toBeUndefined();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect((await pushStatus()).enabled).toBe(false);
});

test('revoked notification permission withdraws registration on synchronization', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-current');
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  expect(await syncGrantedPush()).toBe(false);
  expect(unregister).toHaveBeenCalledWith('fcm-current');
  expect(register).not.toHaveBeenCalled();
  expect(await pushStatus()).toMatchObject({ enabled: false, permissionGranted: false });
});

test('token refresh respects opt-out, revoked permissions and logged-out state', async () => {
  const stop = await attachPushListeners(jest.fn(), jest.fn());
  await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
  firebase.callbacks.token('opted-out-token');
  await flushTasks();
  expect(register).not.toHaveBeenCalled();
  await AsyncStorage.removeItem(OPT_OUT_KEY);
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  firebase.callbacks.token('revoked-token');
  await flushTasks();
  expect(register).not.toHaveBeenCalled();
  auth.mockReturnValue(false);
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  firebase.callbacks.token('logged-out-token');
  await flushTasks();
  expect(register).not.toHaveBeenCalled();
  stop();
});

test('logout invalidates in-flight registration before withdrawing the token', async () => {
  const registering = deferred<void>();
  const started = deferred<void>();
  register.mockImplementationOnce(() => { started.resolve(); return registering.promise; });
  const activation = activatePush();
  await started.promise;
  auth.mockReturnValue(false);
  const loggingOut = removePushRegistrationForLogout();
  registering.resolve();
  expect(await activation).toBe(false);
  await loggingOut;
  expect(await syncGrantedPush()).toBe(false);
  expect(unregister).toHaveBeenCalledWith('fcm-current');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('offline logout retries Firebase invalidation after the session is gone', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-current');
  unregister.mockRejectedValueOnce(new Error('offline'));
  firebase.deleteToken.mockRejectedValueOnce(new Error('offline'));
  await expect(removePushRegistrationForLogout()).rejects.toThrow('No pudimos desactivar');
  expect(await AsyncStorage.getItem('bobiare.push.logout_pending')).toBe('true');
  auth.mockReturnValue(false);
  await retryPendingPushRemoval();
  expect(unregister).toHaveBeenCalledTimes(1);
  expect(firebase.deleteToken).toHaveBeenCalledTimes(2);
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(await AsyncStorage.getItem('bobiare.push.logout_pending')).toBeNull();
  expect(register).not.toHaveBeenCalled();
});

test('logout invalidates FCM after a registration response is lost before local persistence', async () => {
  register.mockRejectedValueOnce(new Error('request timed out'));
  await expect(activatePush()).rejects.toThrow('request timed out');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  await removePushRegistrationForLogout();
  expect(firebase.deleteToken).toHaveBeenCalledWith(firebase.messaging);
  expect(unregister).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('bobiare.push.logout_pending')).toBeNull();
});

test('failed FCM invalidation without a saved registration remains pending until a logged-out retry', async () => {
  register.mockRejectedValueOnce(new Error('request timed out'));
  await expect(activatePush()).rejects.toThrow('request timed out');
  firebase.deleteToken.mockRejectedValueOnce(new Error('offline'));
  await expect(removePushRegistrationForLogout()).rejects.toThrow('No pudimos desactivar');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(await AsyncStorage.getItem('bobiare.push.logout_pending')).toBe('true');
  auth.mockReturnValue(false);
  await retryPendingPushRemoval();
  expect(firebase.deleteToken).toHaveBeenCalledTimes(2);
  expect(unregister).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem('bobiare.push.logout_pending')).toBeNull();
});

test('expired sessions invalidate the saved token without calling the authenticated API', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-current');
  auth.mockReturnValue(false);
  await retryPendingPushRemoval();
  expect(firebase.deleteToken).toHaveBeenCalledTimes(1);
  expect(unregister).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('token rotation registers the replacement and withdraws the previous token', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, 'fcm-previous');
  const stop = await attachPushListeners(jest.fn(), jest.fn());
  firebase.callbacks.token('fcm-replacement');
  await flushTasks();
  expect(register).toHaveBeenCalledWith('fcm-replacement');
  expect(unregister).toHaveBeenCalledWith('fcm-previous');
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe('fcm-replacement');
  stop();
});

test('foreground delivery respects notification permissions and the device opt-out', async () => {
  const foreground = jest.fn();
  const stop = await attachPushListeners(foreground, jest.fn());
  const message = { notification: { title: 'Pedido actualizado' }, data: { order_id: '17' } };
  firebase.callbacks.foreground(message);
  await flushTasks();
  expect(foreground).toHaveBeenCalledWith(message);
  foreground.mockClear();
  await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
  firebase.callbacks.foreground(message);
  await flushTasks();
  expect(foreground).not.toHaveBeenCalled();
  await AsyncStorage.removeItem(OPT_OUT_KEY);
  jest.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  firebase.callbacks.foreground(message);
  await flushTasks();
  expect(foreground).not.toHaveBeenCalled();
  stop();
});

test('unsubscribing suppresses late initial notifications and removes every listener', async () => {
  const initial = deferred<{ data: { order_id: string } }>();
  firebase.getInitialNotification.mockReturnValueOnce(initial.promise);
  const foreground = jest.fn();
  const opened = jest.fn();
  const stop = await attachPushListeners(foreground, opened);
  stop();
  initial.resolve({ data: { order_id: '17' } });
  await flushTasks();
  expect(opened).not.toHaveBeenCalled();
  for (const subscribe of [firebase.onMessage, firebase.onNotificationOpenedApp, firebase.onTokenRefresh]) {
    expect(subscribe.mock.results[0].value).toHaveBeenCalledTimes(1);
  }
});

test('status subscribers update after registration and can unsubscribe', async () => {
  const changed = jest.fn();
  const unsubscribeStatus = subscribePushStatus(changed);
  expect(await activatePush()).toBe(true);
  expect(changed).toHaveBeenCalledTimes(1);
  unsubscribeStatus();
  await deactivatePush();
  expect(changed).toHaveBeenCalledTimes(1);
});
