import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, AppState, AppStateStatus, Linking, Switch } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import Toast from '../utils/notify';
import { activatePush, deactivatePush, pushStatus, subscribePushStatus } from '../utils/pushNotifications';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../components/GlassUI', () => ({ AppBackground: 'Background', GlassCard: 'Card' }));
jest.mock('../components/MotionUI', () => ({ FadeInView: 'FadeIn', ListSkeleton: 'Skeleton' }));
jest.mock('../components/BottomNav', () => 'BottomNav');
jest.mock('../utils/notify', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('../utils/api', () => ({
  getStoredUser: jest.fn(async () => ({ id: 1, name: 'Cliente', email: 'cliente@example.test' })),
  getCurrentUser: jest.fn(async () => ({ id: 1, name: 'Cliente', email: 'cliente@example.test' })),
  getErrorMessage: (error: Error) => error.message,
  logout: jest.fn(),
}));
jest.mock('../utils/pushNotifications', () => ({
  activatePush: jest.fn(),
  deactivatePush: jest.fn(),
  pushStatus: jest.fn(),
  subscribePushStatus: jest.fn(),
}));

let renderer: ReactTestRenderer.ReactTestRenderer;
let notifyStatusChanged: (() => void) | undefined;
let appStateChanged: ((state: AppStateStatus) => void) | undefined;
const removeAppState = jest.fn();
const unsubscribe = jest.fn();
const enabledStatus = { available: true, enabled: true, permissionGranted: true };
const disabledStatus = { available: true, enabled: false, permissionGranted: false };

async function renderProfile() {
  await act(async () => {
    renderer = ReactTestRenderer.create(<ProfileScreen navigation={{ reset: jest.fn() }}/>);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pushStatus).mockResolvedValue(disabledStatus);
  jest.mocked(activatePush).mockResolvedValue(false);
  jest.mocked(deactivatePush).mockResolvedValue(undefined);
  jest.mocked(subscribePushStatus).mockImplementation(listener => {
    notifyStatusChanged = listener;
    return unsubscribe;
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    appStateChanged = callback;
    return { remove: removeAppState };
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

afterEach(async () => {
  if (renderer) await act(async () => { renderer.unmount(); });
  jest.restoreAllMocks();
});

test('disables the notification control when native push is unavailable', async () => {
  jest.mocked(pushStatus).mockResolvedValue({ available: false, enabled: false, permissionGranted: false });
  await renderProfile();

  expect(renderer.root.findByType(Switch).props.disabled).toBe(true);
  expect(renderer.root.findByProps({ children: 'Requiere la app instalada' })).toBeTruthy();
  expect(activatePush).not.toHaveBeenCalled();
});

test('offers system settings when activation is denied without showing success', async () => {
  await renderProfile();
  await act(async () => {
    renderer.root.findByType(Switch).props.onValueChange(true);
  });

  expect(activatePush).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(Switch).props.value).toBe(false);
  expect(Toast.show).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  expect(Alert.alert).toHaveBeenCalledWith('Permití las notificaciones', expect.any(String), expect.any(Array));
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
  buttons?.find(button => button.text === 'Abrir ajustes')?.onPress?.();
  expect(Linking.openSettings).toHaveBeenCalledTimes(1);
});

test('refreshes the switch after synchronization and returning from settings', async () => {
  await renderProfile();
  jest.mocked(pushStatus).mockResolvedValue(enabledStatus);
  await act(async () => { notifyStatusChanged?.(); });
  expect(renderer.root.findByType(Switch).props.value).toBe(true);

  jest.mocked(pushStatus).mockResolvedValue(disabledStatus);
  await act(async () => { appStateChanged?.('active'); });
  expect(renderer.root.findByType(Switch).props.value).toBe(false);

  await act(async () => { renderer.unmount(); });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(removeAppState).toHaveBeenCalledTimes(1);
});

test('keeps the actual enabled state and reports a failed deactivation', async () => {
  jest.mocked(pushStatus).mockResolvedValue(enabledStatus);
  jest.mocked(deactivatePush).mockRejectedValue(new Error('Sin conexión'));
  await renderProfile();
  await act(async () => {
    renderer.root.findByType(Switch).props.onValueChange(false);
  });

  expect(renderer.root.findByType(Switch).props.value).toBe(true);
  expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', text2: 'Sin conexión' }));
  expect(Toast.show).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});
