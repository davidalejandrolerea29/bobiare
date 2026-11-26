import { Platform } from 'react-native';

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}), { virtual: false });
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'raw-nonce',
  digestStringAsync: jest.fn(async () => 'hashed-nonce'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('../utils/api', () => ({ loginWithApple: jest.fn(async () => ({ id: 1 })) }));

const apple = jest.requireMock('expo-apple-authentication');
const api = jest.requireMock('../utils/api');

describe('signInWithApple', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });
  afterAll(() => Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true }));

  test('sends the hashed nonce to Apple and the raw nonce to Bobiare', async () => {
    const { signInWithApple } = require('../utils/appleSignIn');
    apple.signInAsync.mockResolvedValue({ identityToken: 'apple-jwt', fullName: { givenName: 'Ana', familyName: 'Apple' } });
    expect(await signInWithApple()).toEqual({ id: 1 });
    expect(apple.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1], nonce: 'hashed-nonce' });
    expect(api.loginWithApple).toHaveBeenCalledWith('apple-jwt', 'raw-nonce', 'Ana Apple');
  });

  test('returns null when the user cancels', async () => {
    const { signInWithApple } = require('../utils/appleSignIn');
    apple.signInAsync.mockRejectedValue(Object.assign(new Error('cancel'), { code: 'ERR_REQUEST_CANCELED' }));
    expect(await signInWithApple()).toBeNull();
    expect(api.loginWithApple).not.toHaveBeenCalled();
  });

  test('is unavailable outside iOS', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const { isAppleSignInAvailable } = require('../utils/appleSignIn');
    expect(await isAppleSignInAvailable()).toBe(false);
  });
});
