import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Platform, Text, TextInput, TouchableOpacity } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import LoginScreen from '../screens/HomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { getGoogleSignInUnavailableReason, signInWithGoogle } from '../utils/googleSignIn';
import { login, register } from '../utils/api';
import Toast from '../utils/notify';
import type { ApiUser, RootStackParamList } from '../types/types';

jest.mock('../components/GlassUI', () => ({ AppBackground: 'Background', GlassCard: 'Card' }));
jest.mock('../components/MotionUI', () => ({ FadeInView: 'FadeIn', SoftAppear: 'SoftAppear' }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));
jest.mock('../utils/notify', () => ({ __esModule: true, default: { show: jest.fn(), hide: jest.fn() } }));
jest.mock('../utils/googleSignIn', () => ({
  getGoogleSignInUnavailableReason: jest.fn(),
  signInWithGoogle: jest.fn(),
}));
jest.mock('../utils/api', () => ({
  login: jest.fn(),
  register: jest.fn(),
  getErrorMessage: jest.requireActual('../utils/api').getErrorMessage,
}));

const user: ApiUser = { id: 12, name: 'Cliente', email: 'cliente@example.test', role_id: 5 };
const navigation = { reset: jest.fn(), navigate: jest.fn() };
const typedNavigation = navigation as unknown as NavigationProp<RootStackParamList>;
const originalOS = Platform.OS;
let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

async function renderLogin(params?: RootStackParamList['Login']) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen navigation={typedNavigation} route={{ key: 'login', name: 'Login', params }} />,
    );
  });
}

async function renderRegister(params?: RootStackParamList['Register']) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <RegisterScreen navigation={typedNavigation} route={{ key: 'register', name: 'Register', params }} />,
    );
  });
}

function googleButton() {
  return renderer!.root.findAllByType(TouchableOpacity).find(
    button => button.props.accessibilityLabel === 'Continuar con Google',
  )!;
}

function buttonWithText(text: string) {
  const result = renderer!.root.findAllByType(TouchableOpacity).find(
    button => button.findAllByType(Text).some(node => node.props.children === text),
  );
  if (!result) throw new Error(`Button not found: ${text}`);
  return result;
}

function field(placeholder: string) {
  return renderer!.root.findAllByType(TextInput).find(input => input.props.placeholder === placeholder)!;
}

function pendingResult<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  jest.mocked(getGoogleSignInUnavailableReason).mockReturnValue(null);
  jest.mocked(signInWithGoogle).mockReset().mockResolvedValue(user);
  jest.mocked(login).mockReset().mockResolvedValue(user);
  jest.mocked(register).mockReset().mockResolvedValue({});
});

afterEach(async () => {
  if (renderer) await act(async () => { renderer!.unmount(); });
  renderer = undefined;
});

afterAll(() => { Platform.OS = originalOS; });

test.each([
  ['android', 'ClientHome'],
  ['ios', 'MainTabs'],
] as const)('Google login opens the customer destination on %s', async (os, destination) => {
  Platform.OS = os;
  await renderLogin();
  await act(async () => { await googleButton().props.onPress(); });

  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: destination }] });
  expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', text1: 'Bienvenido, Cliente' }));
  expect(login).not.toHaveBeenCalled();
});

test.each([
  { role_id: 1 },
  { rol_id: 4 },
  { role: { id: 2, name: 'Gerente General' } },
  { role: 'Finanzas' },
])('staff continue signing in with their password (%j)', async role => {
  jest.mocked(login).mockResolvedValue({ ...user, role_id: undefined, ...role });
  await renderLogin();
  await act(async () => {
    field('tu@email.com').props.onChangeText('personal@example.test');
    field('Tu contraseña').props.onChangeText('password');
  });
  await act(async () => { await buttonWithText('Ingresar').props.onPress(); });

  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'AdminDashboard' }] });
  expect(login).toHaveBeenCalledWith('personal@example.test', 'password');
  expect(signInWithGoogle).not.toHaveBeenCalled();
});

test.each(['Login', 'Register'] as const)('Google authentication returns to checkout from %s', async screen => {
  if (screen === 'Login') await renderLogin({ returnToCheckout: true });
  else await renderRegister({ returnToCheckout: true });
  await act(async () => { await googleButton().props.onPress(); });

  expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Cart' }, { name: 'Checkout' }] });
});

test('cancelling Google leaves login open without notifications and allows retry', async () => {
  jest.mocked(signInWithGoogle).mockResolvedValue(null);
  await renderLogin();
  await act(async () => { await googleButton().props.onPress(); });

  expect(navigation.reset).not.toHaveBeenCalled();
  expect(Toast.show).not.toHaveBeenCalled();
  expect(googleButton().props.disabled).toBe(false);
  expect(buttonWithText('Ingresar').props.disabled).toBe(false);

  jest.mocked(signInWithGoogle).mockResolvedValue(user);
  await act(async () => { await googleButton().props.onPress(); });
  expect(navigation.reset).toHaveBeenCalledTimes(1);
});

test('shows the authentication error and keeps the form available for retry', async () => {
  jest.mocked(signInWithGoogle).mockRejectedValue(new Error('La cuenta está deshabilitada.'));
  await renderLogin();
  await act(async () => { await googleButton().props.onPress(); });

  expect(Toast.show).toHaveBeenCalledWith({ type: 'error', text1: 'La cuenta está deshabilitada.' });
  expect(navigation.reset).not.toHaveBeenCalled();
  expect(googleButton().props.disabled).toBe(false);
  expect(buttonWithText('Ingresar').props.disabled).toBe(false);
});

test.each([
  ['Login', 403, 'El personal debe ingresar con email y contraseña.'],
  ['Register', 403, 'El personal debe ingresar con email y contraseña.'],
  ['Login', 401, 'La credencial Firebase no es válida.'],
  ['Register', 401, 'La credencial Firebase no es válida.'],
  ['Login', 503, 'La verificación de Google no está disponible temporalmente.'],
  ['Register', 503, 'La verificación de Google no está disponible temporalmente.'],
] as const)('%s shows the backend message for Google HTTP %i and permits retry', async (screen, status, message) => {
  jest.mocked(signInWithGoogle).mockRejectedValue({
    message: `Request failed with status code ${status}`,
    response: { status, data: { message } },
  });
  if (screen === 'Login') await renderLogin();
  else await renderRegister();
  await act(async () => { await googleButton().props.onPress(); });

  expect(Toast.show).toHaveBeenCalledWith({ type: 'error', text1: message });
  expect(navigation.reset).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(googleButton().props.disabled).toBe(false);
  expect(buttonWithText(screen === 'Login' ? 'Ingresar' : 'Crear cuenta').props.disabled).toBe(false);

  jest.mocked(signInWithGoogle).mockResolvedValue(user);
  await act(async () => { await googleButton().props.onPress(); });
  expect(signInWithGoogle).toHaveBeenCalledTimes(2);
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'ClientHome' }] });
});

test('staff rejected by Google can still sign in with their password', async () => {
  jest.mocked(signInWithGoogle).mockRejectedValue({
    response: { status: 403, data: { message: 'El personal debe ingresar con email y contraseña.' } },
  });
  jest.mocked(login).mockResolvedValue({ ...user, role_id: 1 });
  await renderLogin();
  await act(async () => { await googleButton().props.onPress(); });
  expect(navigation.reset).not.toHaveBeenCalled();

  await act(async () => {
    field('tu@email.com').props.onChangeText('personal@example.test');
    field('Tu contraseña').props.onChangeText('password');
  });
  await act(async () => { await buttonWithText('Ingresar').props.onPress(); });
  expect(login).toHaveBeenCalledWith('personal@example.test', 'password');
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'AdminDashboard' }] });
});

test('disables unavailable Google authentication and explains why', async () => {
  jest.mocked(getGoogleSignInUnavailableReason).mockReturnValue('Google está disponible en la app instalada.');
  await renderLogin();
  await act(async () => { await googleButton().props.onPress(); });

  expect(googleButton().props.disabled).toBe(true);
  expect(renderer!.root.findByProps({ children: 'Google está disponible en la app instalada.' })).toBeTruthy();
  expect(signInWithGoogle).not.toHaveBeenCalled();
});

test('coalesces repeated Google presses and blocks password login while Google is pending', async () => {
  const pending = pendingResult<ApiUser | null>();
  jest.mocked(signInWithGoogle).mockReturnValue(pending.promise);
  await renderLogin();
  await act(async () => {
    field('tu@email.com').props.onChangeText('cliente@example.test');
    field('Tu contraseña').props.onChangeText('password');
  });
  const googlePress = googleButton().props.onPress;
  const passwordButton = buttonWithText('Ingresar');

  await act(async () => {
    void googlePress();
    void googlePress();
  });

  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  expect(googleButton().props.disabled).toBe(true);
  expect(passwordButton.props.disabled).toBe(true);
  await act(async () => { await passwordButton.props.onPress(); });
  expect(login).not.toHaveBeenCalled();

  await act(async () => { pending.resolve(user); });
  expect(navigation.reset).toHaveBeenCalledTimes(1);
});

test('blocks Google while password authentication is pending', async () => {
  const pending = pendingResult<ApiUser>();
  jest.mocked(login).mockReturnValue(pending.promise);
  await renderLogin();
  await act(async () => {
    field('tu@email.com').props.onChangeText(' Cliente@Example.Test ');
    field('Tu contraseña').props.onChangeText('password');
  });
  await act(async () => { void buttonWithText('Ingresar').props.onPress(); });

  expect(googleButton().props.disabled).toBe(true);
  await act(async () => { await googleButton().props.onPress(); });
  expect(signInWithGoogle).not.toHaveBeenCalled();
  expect(login).toHaveBeenCalledWith('cliente@example.test', 'password');

  await act(async () => { pending.resolve(user); });
  expect(navigation.reset).toHaveBeenCalledTimes(1);
});

test.each([
  ['Login', 'Google'],
  ['Login', 'password'],
  ['Register', 'Google'],
  ['Register', 'password'],
] as const)('keeps %s authentication exclusive when %s starts before the next render', async (screen, firstProvider) => {
  const googlePending = pendingResult<ApiUser | null>();
  const passwordPending = pendingResult<ApiUser>();
  jest.mocked(signInWithGoogle).mockReturnValue(googlePending.promise);
  jest.mocked(login).mockReturnValue(passwordPending.promise);
  jest.mocked(register).mockReturnValue(passwordPending.promise);
  if (screen === 'Login') await renderLogin();
  else await renderRegister();
  await act(async () => {
    if (screen === 'Login') {
      field('tu@email.com').props.onChangeText('cliente@example.test');
      field('Tu contraseña').props.onChangeText('password');
    } else {
      field('Nombre completo').props.onChangeText('Cliente');
      field('Correo electrónico').props.onChangeText('cliente@example.test');
      field('Contraseña').props.onChangeText('password');
      field('Confirmar contraseña').props.onChangeText('password');
    }
  });
  const googlePress = googleButton().props.onPress;
  const passwordPress = buttonWithText(screen === 'Login' ? 'Ingresar' : 'Crear cuenta').props.onPress;
  await act(async () => {
    if (firstProvider === 'Google') {
      void googlePress();
      void passwordPress();
    } else {
      void passwordPress();
      void googlePress();
      void passwordPress();
    }
  });

  expect(signInWithGoogle).toHaveBeenCalledTimes(firstProvider === 'Google' ? 1 : 0);
  expect(login).toHaveBeenCalledTimes(firstProvider === 'password' && screen === 'Login' ? 1 : 0);
  expect(register).toHaveBeenCalledTimes(firstProvider === 'password' && screen === 'Register' ? 1 : 0);
  await act(async () => {
    googlePending.resolve(user);
    passwordPending.resolve(user);
  });
  expect(navigation.reset.mock.calls.length + navigation.navigate.mock.calls.length).toBe(1);
});

test('preserves checkout context when switching from login to registration and back', async () => {
  await renderLogin({ returnToCheckout: true });
  await act(async () => { buttonWithText('Crear una cuenta').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('Register', { returnToCheckout: true });

  await act(async () => { renderer!.unmount(); });
  await renderRegister({ returnToCheckout: true });
  await act(async () => { buttonWithText('¿Ya tenés cuenta? Iniciá sesión').props.onPress(); });
  expect(navigation.navigate).toHaveBeenCalledWith('Login', { returnToCheckout: true });
});

test('preserves checkout context after creating an account with a password', async () => {
  await renderRegister({ returnToCheckout: true });
  await act(async () => {
    field('Nombre completo').props.onChangeText('Cliente');
    field('Correo electrónico').props.onChangeText('cliente@example.test');
    field('Contraseña').props.onChangeText('password');
    field('Confirmar contraseña').props.onChangeText('password');
  });
  await act(async () => { await buttonWithText('Crear cuenta').props.onPress(); });

  expect(register).toHaveBeenCalledWith('Cliente', 'cliente@example.test', 'password');
  expect(navigation.navigate).toHaveBeenCalledWith('Login', { returnToCheckout: true });
});
