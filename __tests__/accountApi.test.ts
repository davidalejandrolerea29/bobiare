import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getAuthState, setAuthState } from '../utils/authState';
import { deleteAccount, loginWithApple, requestPasswordReset, resetPassword, STORAGE_KEYS } from '../utils/api';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const adapter = jest.fn();
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      create: (config: object) => actual.default.create({ ...config, adapter }),
    },
    adapter,
  };
});

jest.mock('../utils/pushNotifications', () => ({
  removePushRegistrationForLogout: jest.fn(async () => undefined),
}));

const adapter = jest.requireMock('axios').adapter as jest.MockedFunction<AxiosAdapter>;
const user = { id: 7, name: 'Ana', email: 'ana@privaterelay.appleid.com', role_id: 5 };
const response = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse =>
  ({ config, data, status: 200, statusText: 'OK', headers: {} });

beforeEach(async () => {
  adapter.mockReset();
  await AsyncStorage.clear();
  setAuthState(false);
});

test('exchanges the Apple identity token with the raw nonce and persists the session', async () => {
  adapter.mockImplementation(async config => {
    expect(config.url).toBe('/auth/apple');
    expect(JSON.parse(config.data)).toEqual({ identity_token: 'apple-jwt', nonce: 'raw', full_name: 'Ana Apple' });
    return response(config, { access_token: 'bobiare-jwt', expires_in: 3600, user });
  });
  expect(await loginWithApple('apple-jwt', 'raw', 'Ana Apple')).toEqual(user);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('bobiare-jwt');
  expect(getAuthState()).toBe(true);
});

test('requests and confirms a password reset code', async () => {
  const calls: Array<{ url?: string; body: any }> = [];
  adapter.mockImplementation(async config => {
    calls.push({ url: config.url, body: JSON.parse(config.data) });
    return response(config, { message: 'ok' });
  });
  await requestPasswordReset(' Ana@Example.com ');
  await resetPassword('ana@example.com', '123456', 'nueva123');
  expect(calls).toEqual([
    { url: '/auth/password/forgot', body: { email: 'ana@example.com' } },
    { url: '/auth/password/reset', body: { email: 'ana@example.com', code: '123456', password: 'nueva123', password_confirmation: 'nueva123' } },
  ]);
});

test('deletes the account on the server and clears the local session', async () => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, 'bobiare-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() + 3600_000)],
    [STORAGE_KEYS.user, JSON.stringify(user)],
  ]);
  setAuthState(true);
  adapter.mockImplementation(async config => {
    expect(config.method).toBe('delete');
    expect(config.url).toBe('/auth/account');
    expect(config.headers.Authorization).toBe('Bearer bobiare-jwt');
    return response(config, { message: 'Tu cuenta fue eliminada.' });
  });
  await deleteAccount();
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBeNull();
  expect(getAuthState()).toBe(false);
  expect(jest.requireMock('../utils/pushNotifications').removePushRegistrationForLogout).toHaveBeenCalled();
});

test('keeps the session when the server rejects the deletion', async () => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, 'bobiare-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() + 3600_000)],
  ]);
  setAuthState(true);
  adapter.mockImplementation(async config => {
    const error: any = new Error('Forbidden');
    error.config = config;
    error.response = { status: 403, data: { error: 'No' }, config, headers: {}, statusText: 'Forbidden' };
    error.isAxiosError = true;
    throw error;
  });
  await expect(deleteAccount()).rejects.toBeTruthy();
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('bobiare-jwt');
});
