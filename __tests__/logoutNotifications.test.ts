import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getAuthState, setAuthState } from '../utils/authState';
import { getCurrentUser, isAuthenticated, login, logout, STORAGE_KEYS, unregisterPushToken } from '../utils/api';
import { removePushRegistrationForLogout } from '../utils/pushNotifications';

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
jest.mock('../utils/pushNotifications', () => ({ removePushRegistrationForLogout: jest.fn() }));
jest.mock('../utils/pushNavigation', () => ({ clearPendingPushNavigation: jest.fn() }));

const adapter = jest.requireMock('axios').adapter as jest.MockedFunction<AxiosAdapter>;

function response(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, 'expiring-jwt'],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() + 10_000)],
  ]);
  setAuthState(true);
});

test('refreshing a near-expiry JWT for push withdrawal keeps logout unauthenticated', async () => {
  const observedStates: (boolean | null)[] = [];
  let releaseRefresh!: () => void;
  const refreshPending = new Promise<void>(resolve => { releaseRefresh = resolve; });
  let markRefreshStarted!: () => void;
  const refreshStarted = new Promise<void>(resolve => { markRefreshStarted = resolve; });
  adapter.mockImplementation(async config => {
    observedStates.push(getAuthState());
    if (config.url === '/auth/refresh') {
      markRefreshStarted();
      await refreshPending;
      return response(config, { access_token: 'renewed-jwt', expires_in: 3600 });
    }
    if (config.url === '/push/installations' || config.url === '/auth/logout') {
      expect(config.headers.Authorization).toBe('Bearer renewed-jwt');
      return response(config, {});
    }
    throw new Error(`Unexpected API request: ${config.url}`);
  });
  jest.mocked(removePushRegistrationForLogout).mockImplementation(async () => {
    expect(getAuthState()).toBe(false);
    await unregisterPushToken('fcm-current');
    expect(getAuthState()).toBe(false);
  });

  const loggingOut = logout();
  await refreshStarted;
  expect(getAuthState()).toBe(false);
  releaseRefresh();
  await loggingOut;

  expect(getAuthState()).toBe(false);
  expect(observedStates).toEqual([false, false, false]);
  expect(await AsyncStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['post', '/auth/refresh'],
    ['delete', '/push/installations'],
    ['get', '/auth/logout'],
  ]);

  // La protección termina con logout; un login posterior puede publicar su sesión.
  adapter.mockImplementation(async config => response(config, {
    access_token: 'next-session', expires_in: 3600,
    user: { id: 2, name: 'Cliente', email: 'cliente@example.test' },
  }));
  await login('cliente@example.test', 'password');
  expect(getAuthState()).toBe(true);
});

test('late profile and authentication responses do not reopen the session during logout', async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.tokenExpiresAt, String(Date.now() + 3600_000));
  let releaseUserResponses!: () => void;
  const userResponsesPending = new Promise<void>(resolve => { releaseUserResponses = resolve; });
  let markUserRequestsStarted!: () => void;
  const userRequestsStarted = new Promise<void>(resolve => { markUserRequestsStarted = resolve; });
  let userRequestCount = 0;
  let releaseRemoval!: () => void;
  const removalPending = new Promise<void>(resolve => { releaseRemoval = resolve; });
  jest.mocked(removePushRegistrationForLogout).mockImplementation(() => removalPending);
  adapter.mockImplementation(async config => {
    if (config.url === '/auth/me') {
      userRequestCount++;
      if (userRequestCount === 2) {
        markUserRequestsStarted();
      }
      await userResponsesPending;
      return response(config, { user: { id: 1, name: 'Cliente', email: 'cliente@example.test' } });
    }
    if (config.url === '/auth/logout') {
      expect(getAuthState()).toBe(false);
      return response(config, {});
    }
    throw new Error(`Unexpected API request: ${config.url}`);
  });

  const profileLoading = getCurrentUser();
  const checkingSession = isAuthenticated();
  await userRequestsStarted;
  const loggingOut = logout();
  expect(getAuthState()).toBe(false);
  releaseUserResponses();
  await profileLoading;
  expect(await checkingSession).toBe(false);
  expect(getAuthState()).toBe(false);
  releaseRemoval();
  await loggingOut;
  expect(getAuthState()).toBe(false);
});
