import Constants, {ExecutionEnvironment} from 'expo-constants';
import {Platform} from 'react-native';
import {loginWithGoogle} from '../utils/api';
import {
  getGoogleSignInUnavailableReason,
  signInWithGoogle,
} from '../utils/googleSignIn';

const mockNativeLoaded = jest.fn();
const mockFirebaseLoaded = jest.fn();
const mockGoogle = {
  configure: jest.fn(),
  checkPlayServices: jest.fn(),
  presentExplicitSignIn: jest.fn(),
  signOut: jest.fn(),
};
const mockFirebaseAuth = {name: 'default-auth'};
const mockFirebaseUser = {uid: 'firebase-user'};
const mockCredential = {providerId: 'google.com'};
const mockFirebase = {
  getAuth: jest.fn(),
  GoogleAuthProvider: {credential: jest.fn()},
  signInWithCredential: jest.fn(),
  getIdToken: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../utils/api', () => ({loginWithGoogle: jest.fn()}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {executionEnvironment: 'bare', expoConfig: null},
  ExecutionEnvironment: {Bare: 'bare', StoreClient: 'storeClient'},
}));
jest.mock('@react-native-firebase/auth', () => {
  mockFirebaseLoaded();
  return mockFirebase;
});
jest.mock('react-native-nitro-google-signin', () => {
  mockNativeLoaded();
  return {
    GoogleOneTapSignIn: mockGoogle,
    isCancelledResponse: (response: {type: string}) =>
      response.type === 'cancelled',
    isSuccessResponse: (response: {type: string; data?: unknown}) =>
      response.type === 'success' && !!response.data,
    isErrorWithCode: (error: {code?: unknown}) =>
      typeof error?.code === 'string',
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
      DEVELOPER_ERROR: 'DEVELOPER_ERROR',
      IN_PROGRESS: 'IN_PROGRESS',
    },
  };
});

const user = {id: 11, name: 'Cliente', email: 'cliente@example.test'};
const originalPlatform = Platform.OS;
const originalWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const originalIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'android'});
  Constants.executionEnvironment = ExecutionEnvironment.Bare;
  Constants.expoConfig = null;
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
    '123-web.apps.googleusercontent.com';
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  mockGoogle.configure.mockImplementation(() => undefined);
  mockGoogle.checkPlayServices.mockResolvedValue(undefined);
  mockGoogle.presentExplicitSignIn.mockResolvedValue({
    type: 'success',
    data: {idToken: 'google-id-token'},
  });
  mockGoogle.signOut.mockResolvedValue(undefined);
  mockFirebase.getAuth.mockReturnValue(mockFirebaseAuth);
  mockFirebase.GoogleAuthProvider.credential.mockReturnValue(mockCredential);
  mockFirebase.signInWithCredential.mockResolvedValue({user: mockFirebaseUser});
  mockFirebase.getIdToken.mockResolvedValue('firebase-auth-id-token');
  mockFirebase.signOut.mockResolvedValue(undefined);
  jest.mocked(loginWithGoogle).mockResolvedValue(user);
});

afterAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalPlatform,
  });
  if (originalWebClientId === undefined) {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebClientId;
  }
  if (originalIosClientId === undefined) {
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIosClientId;
  }
});

test('Expo Go rejects before loading the native SDK', async () => {
  Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
  expect(getGoogleSignInUnavailableReason()).toBe(
    'Google está disponible en la app instalada.',
  );
  await expect(signInWithGoogle()).rejects.toThrow(
    'Google está disponible en la app instalada.',
  );
  expect(mockNativeLoaded).not.toHaveBeenCalled();
  expect(mockFirebaseLoaded).not.toHaveBeenCalled();
  expect(loginWithGoogle).not.toHaveBeenCalled();
});

test('exchanges Google credentials through Firebase and sends only its fresh Auth ID token to Bobiare', async () => {
  expect(getGoogleSignInUnavailableReason()).toBeNull();
  await expect(signInWithGoogle()).resolves.toEqual(user);
  expect(mockGoogle.configure).toHaveBeenCalledWith({
    webClientId: '123-web.apps.googleusercontent.com',
    offlineAccess: false,
  });
  expect(mockGoogle.checkPlayServices).toHaveBeenCalledTimes(1);
  expect(mockGoogle.presentExplicitSignIn).toHaveBeenCalledTimes(1);
  expect(mockFirebase.GoogleAuthProvider.credential).toHaveBeenCalledWith(
    'google-id-token',
  );
  expect(mockFirebase.signInWithCredential).toHaveBeenCalledWith(
    mockFirebaseAuth,
    mockCredential,
  );
  expect(mockFirebase.getIdToken).toHaveBeenCalledWith(mockFirebaseUser, true);
  expect(loginWithGoogle).toHaveBeenCalledWith('firebase-auth-id-token');
  expect(loginWithGoogle).not.toHaveBeenCalledWith('google-id-token');
  expect(mockFirebase.signOut).toHaveBeenCalledWith(mockFirebaseAuth);
  expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  expect(mockFirebase.getIdToken.mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(loginWithGoogle).mock.invocationCallOrder[0],
  );
  expect(jest.mocked(loginWithGoogle).mock.invocationCallOrder[0]).toBeLessThan(
    mockFirebase.signOut.mock.invocationCallOrder[0],
  );
});

test.each(['cancelled', 'SIGN_IN_CANCELLED'])(
  'cancelled sign-in (%s) never calls the backend',
  async result => {
    if (result === 'cancelled') {
      mockGoogle.presentExplicitSignIn.mockResolvedValue({type: result});
    } else {
      mockGoogle.presentExplicitSignIn.mockRejectedValue({
        code: result,
        message: 'Cancelled',
      });
    }
    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockFirebase.signInWithCredential).not.toHaveBeenCalled();
    expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  },
);

test.each([null, '', '   '])(
  'missing ID token (%s) never creates a backend session',
  async idToken => {
    mockGoogle.presentExplicitSignIn.mockResolvedValue({
      type: 'success',
      data: {idToken},
    });
    await expect(signInWithGoogle()).rejects.toThrow(
      'Google no pudo confirmar tu cuenta.',
    );
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockFirebase.signInWithCredential).not.toHaveBeenCalled();
    expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  },
);

test.each([401, 403])(
  'keeps backend %s errors intact and cleans both provider sessions',
  async status => {
    const error = {
      response: {status, data: {message: 'Cuenta no habilitada.'}},
    };
    jest.mocked(loginWithGoogle).mockRejectedValue(error);
    await expect(signInWithGoogle()).rejects.toBe(error);
    expect(mockFirebase.signOut).toHaveBeenCalledWith(mockFirebaseAuth);
    expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  },
);

test.each([null, '', '   '])(
  'missing Firebase Auth token (%s) never reaches the backend and cleans provider sessions',
  async firebaseToken => {
    mockFirebase.getIdToken.mockResolvedValue(firebaseToken);
    await expect(signInWithGoogle()).rejects.toThrow(
      'No se pudo verificar tu cuenta de Google.',
    );
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockFirebase.signOut).toHaveBeenCalledWith(mockFirebaseAuth);
    expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  },
);

test.each(['signInWithCredential', 'getIdToken'] as const)(
  'Firebase failure in %s cleans both sessions without sending a Google token to the backend',
  async method => {
    mockFirebase[method].mockRejectedValue({
      code: 'auth/network-request-failed',
      message: 'Native detail that must not be shown',
    });
    await expect(signInWithGoogle()).rejects.toThrow(
      'Revisá tu conexión y volvé a ingresar con Google.',
    );
    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockFirebase.signOut).toHaveBeenCalledWith(mockFirebaseAuth);
    expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
  },
);

test('cleanup failures do not override successful Bobiare authentication', async () => {
  mockFirebase.signOut.mockRejectedValue(new Error('Firebase cleanup failed'));
  mockGoogle.signOut.mockRejectedValue(new Error('Google cleanup failed'));
  await expect(signInWithGoogle()).resolves.toEqual(user);
  expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
});

test('cleanup failures do not override a backend rejection', async () => {
  const error = {
    response: {status: 403, data: {message: 'Cuenta no habilitada.'}},
  };
  jest.mocked(loginWithGoogle).mockRejectedValue(error);
  mockFirebase.signOut.mockRejectedValue(new Error('Firebase cleanup failed'));
  mockGoogle.signOut.mockRejectedValue(new Error('Google cleanup failed'));
  await expect(signInWithGoogle()).rejects.toBe(error);
  expect(mockGoogle.signOut).toHaveBeenCalledTimes(1);
});

test('a Google cleanup failure does not turn cancellation into an error', async () => {
  mockGoogle.presentExplicitSignIn.mockResolvedValue({type: 'cancelled'});
  mockGoogle.signOut.mockRejectedValue(new Error('Google cleanup failed'));
  await expect(signInWithGoogle()).resolves.toBeNull();
  expect(loginWithGoogle).not.toHaveBeenCalled();
});

test.each([undefined, '', 'invalid-client-id'])(
  'invalid Web OAuth configuration (%s) fails before opening Google',
  async clientId => {
    if (clientId === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = clientId;
    }
    await expect(signInWithGoogle()).rejects.toThrow(
      'El acceso con Google todavía no está habilitado.',
    );
    expect(mockGoogle.configure).not.toHaveBeenCalled();
    expect(mockFirebase.signInWithCredential).not.toHaveBeenCalled();
    expect(loginWithGoogle).not.toHaveBeenCalled();
  },
);

test('iOS requires its OAuth client ID and skips the Android Play Services check', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  await expect(signInWithGoogle()).rejects.toThrow(
    'El acceso con Google todavía no está habilitado.',
  );
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID =
    '123-ios.apps.googleusercontent.com';
  await expect(signInWithGoogle()).resolves.toEqual(user);
  expect(mockGoogle.configure).toHaveBeenCalledWith({
    webClientId: '123-web.apps.googleusercontent.com',
    iosClientId: '123-ios.apps.googleusercontent.com',
    offlineAccess: false,
  });
  expect(mockGoogle.checkPlayServices).not.toHaveBeenCalled();
});

test('reads public OAuth IDs generated from Firebase files when environment overrides are absent', async () => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  Constants.expoConfig = {
    name: 'Bobiare',
    slug: 'bobiare',
    extra: {
      googleSignIn: {
        webClientId: '123-public-web.apps.googleusercontent.com',
        iosClientId: '123-public-ios.apps.googleusercontent.com',
      },
    },
  };
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'ios'});
  expect(getGoogleSignInUnavailableReason()).toBeNull();
  await expect(signInWithGoogle()).resolves.toEqual(user);
  expect(mockGoogle.configure).toHaveBeenCalledWith({
    webClientId: '123-public-web.apps.googleusercontent.com',
    iosClientId: '123-public-ios.apps.googleusercontent.com',
    offlineAccess: false,
  });
});

test('environment OAuth IDs override public configuration', async () => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
    '123-override.apps.googleusercontent.com';
  Constants.expoConfig = {
    name: 'Bobiare',
    slug: 'bobiare',
    extra: {
      googleSignIn: {webClientId: '123-public-web.apps.googleusercontent.com'},
    },
  };
  await expect(signInWithGoogle()).resolves.toEqual(user);
  expect(mockGoogle.configure).toHaveBeenCalledWith({
    webClientId: '123-override.apps.googleusercontent.com',
    offlineAccess: false,
  });
});

test('configures Google once for repeated attempts with the same OAuth client IDs', async () => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
    '123-configured-once.apps.googleusercontent.com';
  await signInWithGoogle();
  await signInWithGoogle();
  expect(mockGoogle.configure).toHaveBeenCalledTimes(1);
  expect(mockGoogle.presentExplicitSignIn).toHaveBeenCalledTimes(2);
});

test('unavailable Play Services gives a useful error without calling the backend', async () => {
  mockGoogle.checkPlayServices.mockRejectedValue({
    code: 'PLAY_SERVICES_NOT_AVAILABLE',
    message: 'Unavailable',
  });
  await expect(signInWithGoogle()).rejects.toThrow(
    'Actualizá los Servicios de Google Play',
  );
  expect(mockGoogle.presentExplicitSignIn).not.toHaveBeenCalled();
  expect(loginWithGoogle).not.toHaveBeenCalled();
});

test('unsupported platforms do not open native Google sign-in', async () => {
  Object.defineProperty(Platform, 'OS', {configurable: true, value: 'web'});
  await expect(signInWithGoogle()).rejects.toThrow(
    'Google está disponible en la app instalada.',
  );
  expect(mockGoogle.configure).not.toHaveBeenCalled();
});
