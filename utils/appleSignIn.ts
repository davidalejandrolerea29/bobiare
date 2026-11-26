import { Platform } from 'react-native';
import type { ApiUser } from '../types/types';
import { loginWithApple } from './api';

type AppleAuthModule = typeof import('expo-apple-authentication');
type CryptoModule = typeof import('expo-crypto');

const loadAppleModule = (): AppleAuthModule | null => {
  if (Platform.OS !== 'ios') return null;
  try {
    // Builds anteriores pueden no tener el módulo nativo.
    return require('expo-apple-authentication') as AppleAuthModule;
  } catch {
    return null;
  }
};

export async function isAppleSignInAvailable(): Promise<boolean> {
  const apple = loadAppleModule();
  if (!apple) return false;
  try {
    return await apple.isAvailableAsync();
  } catch {
    return false;
  }
}

const isCancel = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error &&
    ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED' || (error as { code?: string }).code === 'ERR_CANCELED'));

export async function signInWithApple(): Promise<ApiUser | null> {
  const apple = loadAppleModule();
  if (!apple) throw new Error('Iniciar sesión con Apple está disponible en iPhone.');
  const crypto = require('expo-crypto') as CryptoModule;

  // Apple firma el SHA-256 del nonce; el backend recibe el valor crudo y lo compara.
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: Awaited<ReturnType<AppleAuthModule['signInAsync']>>;
  try {
    credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isCancel(error)) return null;
    throw new Error('No se pudo conectar con Apple. Volvé a intentar.');
  }

  if (!credential.identityToken) {
    throw new Error('Apple no pudo confirmar tu cuenta. Volvé a intentar.');
  }

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return loginWithApple(credential.identityToken, rawNonce, fullName || undefined);
}
