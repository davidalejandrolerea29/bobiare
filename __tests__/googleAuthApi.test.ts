import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosAdapter, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getAuthState, setAuthState } from '../utils/authState';
import { GOOGLE_AUTH_PATH, login, loginWithGoogle, STORAGE_KEYS } from '../utils/api';

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

const adapter = jest.requireMock('axios').adapter as jest.MockedFunction<AxiosAdapter>;
const user = { id: 12, name: 'Cliente Bobiare', email: 'cliente@example.test', role_id: 5 };

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}

beforeEach(async () => {
  jest.clearAllMocks();
  adapter.mockReset();
  await AsyncStorage.clear();
  setAuthState(false);
});

test('exchanges the Firebase Auth ID token and persists only the Bobiare session and user', async () => {
  const now = Date.now();
  adapter.mockImplementation(async config => {
    expect(config.method).toBe('post');
    expect(config.url).toBe(GOOGLE_AUTH_PATH);
    expect(JSON.parse(config.data)).toEqual({ id_token: 'firebase-auth-id-token' });
    expect(config.headers.Authorization).toBeUndefined();
    return response(config, { access_token: 'bobiare-jwt', expires_in: 1800, user });
  });

  expect(await loginWithGoogle('firebase-auth-id-token')).toEqual(user);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('bobiare-jwt');
  expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.user))!)).toEqual(user);
  expect(Number(await AsyncStorage.getItem(STORAGE_KEYS.tokenExpiresAt))).toBeGreaterThanOrEqual(now + 1800_000);
  expect(getAuthState()).toBe(true);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('exchanges a Firebase credential without sending or refreshing an expired Bobiare JWT', async () => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, 'expired-bobiare-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() - 60_000)],
  ]);
  setAuthState(true);
  adapter.mockImplementation(async config => {
    expect(config.url).toBe(GOOGLE_AUTH_PATH);
    expect(config.headers.Authorization).toBeUndefined();
    expect(JSON.parse(config.data)).toEqual({ id_token: 'firebase-auth-id-token' });
    return response(config, { access_token: 'new-bobiare-jwt', expires_in: 3600, user });
  });

  await expect(loginWithGoogle('firebase-auth-id-token')).resolves.toEqual(user);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('new-bobiare-jwt');
  expect(adapter).toHaveBeenCalledTimes(1);
});

test('sends the guest cart token and migrates only items not associated by the backend', async () => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.guestToken, 'guest-cart-token'],
    [STORAGE_KEYS.accessToken, 'expired-bobiare-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() - 60_000)],
  ]);
  const attributes = [{ attribute_type_id: 3, attribute_id: 8, description: 'Azul' }];
  const existingItem = { id: 40, product_id: 2, delivery_time_id: 1, quantity: 1 };
  const migratingItem = {
    id: 41, product_id: 7, delivery_time_id: 2, quantity: 3,
    piece_description: 'Tanque', selected_attributes: attributes,
  };
  adapter.mockImplementation(async config => {
    expect(config.headers['X-Guest-Token']).toBe('guest-cart-token');
    if (config.url === GOOGLE_AUTH_PATH) {
      expect(config.headers.Authorization).toBeUndefined();
      return response(config, { access_token: 'bobiare-jwt', expires_in: 3600, user });
    }
    if (config.url === '/cart') {
      expect(config.headers.Authorization).not.toBe('Bearer expired-bobiare-jwt');
      return response(config, {
        items: config.headers.Authorization ? [existingItem] : [existingItem, migratingItem],
      });
    }
    if (config.url === '/cart/items') {
      expect(config.headers.Authorization).toBe('Bearer bobiare-jwt');
      expect(JSON.parse(config.data)).toEqual({
        product_id: 7, delivery_time_id: 2, quantity: 3,
        piece_description: 'Tanque', selected_attributes: attributes,
      });
      return response(config, { item: { ...migratingItem, id: 50 } });
    }
    throw new Error(`Unexpected API request: ${config.url}`);
  });

  await expect(loginWithGoogle('firebase-auth-id-token')).resolves.toEqual(user);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.guestToken)).toBeNull();
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/cart'], ['post', GOOGLE_AUTH_PATH], ['get', '/cart'], ['post', '/cart/items'],
  ]);
});

test('loads the backend user when the exchange response contains only a JWT', async () => {
  adapter.mockImplementation(async config => {
    if (config.url === GOOGLE_AUTH_PATH) {
      return response(config, { access_token: 'bobiare-jwt', expires_in: 3600 });
    }
    expect(config.url).toBe('/auth/me');
    expect(config.headers.Authorization).toBe('Bearer bobiare-jwt');
    return response(config, { user });
  });

  await expect(loginWithGoogle('firebase-auth-id-token')).resolves.toEqual(user);
  expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.user))!)).toEqual(user);
  expect(getAuthState()).toBe(true);
});

test.each(['', '   '])('rejects an empty Google credential before storage or network I/O (%j)', async idToken => {
  await expect(loginWithGoogle(idToken)).rejects.toThrow('Google no devolvió una credencial válida');
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(adapter).not.toHaveBeenCalled();
  expect(getAuthState()).toBe(false);
});

test.each([401, 403, 503])('exchange error %s preserves the guest cart and the previous Bobiare session', async status => {
  const previousUser = { id: 8, name: 'Anterior', email: 'anterior@example.test' };
  const previousExpiry = String(Date.now() - 60_000);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.guestToken, 'guest-cart-token'],
    [STORAGE_KEYS.accessToken, 'expired-bobiare-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, previousExpiry],
    [STORAGE_KEYS.user, JSON.stringify(previousUser)],
  ]);
  setAuthState(true);
  jest.clearAllMocks();
  adapter.mockImplementation(async config => {
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers['X-Guest-Token']).toBe('guest-cart-token');
    if (config.url === '/cart') return response(config, { items: [] });
    expect(config.url).toBe(GOOGLE_AUTH_PATH);
    throw new AxiosError('Firebase credential exchange failed', 'ERR_BAD_REQUEST', config, undefined, {
      ...response(config, { message: status === 403 ? 'El acceso con Google es solo para clientes.' : 'Error de autenticación.' }),
      status,
    });
  });

  await expect(loginWithGoogle('rejected-firebase-token')).rejects.toThrow('Firebase credential exchange failed');
  expect(await AsyncStorage.getItem(STORAGE_KEYS.guestToken)).toBe('guest-cart-token');
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('expired-bobiare-jwt');
  expect(await AsyncStorage.getItem(STORAGE_KEYS.tokenExpiresAt)).toBe(previousExpiry);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBe(JSON.stringify(previousUser));
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(getAuthState()).toBe(true);
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/cart'], ['post', GOOGLE_AUTH_PATH],
  ]);
});

test('a rejected Firebase credential keeps a guest unauthenticated', async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.guestToken, 'guest-cart-token');
  adapter.mockImplementation(async config => {
    if (config.url === '/cart') return response(config, { items: [] });
    throw new AxiosError('Invalid Firebase credential', 'ERR_BAD_REQUEST', config, undefined, {
      ...response(config, { message: 'La credencial Firebase no es válida.' }), status: 401,
    });
  });

  await expect(loginWithGoogle('rejected-firebase-token')).rejects.toThrow('Invalid Firebase credential');
  expect(await AsyncStorage.getItem(STORAGE_KEYS.guestToken)).toBe('guest-cart-token');
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  expect(getAuthState()).toBe(false);
});

test.each([null, {}, { access_token: '' }, { access_token: '   ' }, { access_token: 123 }])(
  'a malformed exchange response does not establish a session or discard the guest cart (%j)',
  async data => {
    await AsyncStorage.setItem(STORAGE_KEYS.guestToken, 'guest-cart-token');
    jest.mocked(AsyncStorage.multiSet).mockClear();
    adapter.mockImplementation(async config => response(config, config.url === '/cart' ? { items: [] } : data));

    await expect(loginWithGoogle('firebase-auth-id-token')).rejects.toThrow('El servidor no devolvió una sesión válida');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.guestToken)).toBe('guest-cart-token');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(getAuthState()).toBe(false);
  },
);

test('password login continues using its original endpoint and the shared session completion', async () => {
  adapter.mockImplementation(async config => {
    expect(config.url).toBe('/auth/login');
    expect(JSON.parse(config.data)).toEqual({ email: user.email, password: 'password' });
    return response(config, { access_token: 'password-session-jwt', expires_in: 3600, user });
  });

  await expect(login(user.email, 'password')).resolves.toEqual(user);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBe('password-session-jwt');
  expect(getAuthState()).toBe(true);
});
