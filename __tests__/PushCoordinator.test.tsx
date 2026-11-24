import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus } from 'react-native';
import PushCoordinator from '../components/PushCoordinator';
import { getAuthState, useAuthState } from '../utils/authState';
import { attachPushListeners, PushMessage, retryPendingPushRemoval, syncGrantedPush } from '../utils/pushNotifications';
import { clearPendingPushNavigation, openOrderFromPush } from '../utils/pushNavigation';
import Toast from '../utils/notify';

jest.mock('../utils/authState', () => ({ getAuthState: jest.fn(), useAuthState: jest.fn() }));
jest.mock('../utils/pushNotifications', () => ({
  attachPushListeners: jest.fn(), retryPendingPushRemoval: jest.fn(), syncGrantedPush: jest.fn(),
}));
jest.mock('../utils/pushNavigation', () => ({
  clearPendingPushNavigation: jest.fn(), flushPushNavigation: jest.fn(), openOrderFromPush: jest.fn(),
}));
jest.mock('../utils/notify', () => ({ __esModule: true, default: { show: jest.fn() } }));

let renderer: ReactTestRenderer.ReactTestRenderer;
let foreground: (message: PushMessage) => void;
let opened: (message: PushMessage) => void;
let appStateChanged: (state: AppStateStatus) => void;
const unsubscribe = jest.fn();
const removeAppState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.mocked(getAuthState).mockReturnValue(true);
  jest.mocked(useAuthState).mockReturnValue(true);
  jest.mocked(syncGrantedPush).mockResolvedValue(true);
  jest.mocked(retryPendingPushRemoval).mockResolvedValue(undefined);
  jest.mocked(attachPushListeners).mockImplementation(async (onForeground, onOpen) => {
    foreground = onForeground;
    opened = onOpen;
    return unsubscribe;
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    appStateChanged = callback;
    return { remove: removeAppState };
  });
});

afterEach(async () => {
  if (renderer) {
    await act(async () => { renderer.unmount(); });
  }
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderCoordinator() {
  await act(async () => { renderer = ReactTestRenderer.create(<PushCoordinator />); });
}

test('synchronizes the authenticated device on launch and on return to the foreground', async () => {
  await renderCoordinator();
  expect(syncGrantedPush).toHaveBeenCalledTimes(1);
  await act(async () => { appStateChanged('background'); });
  expect(syncGrantedPush).toHaveBeenCalledTimes(1);
  await act(async () => { appStateChanged('active'); });
  expect(syncGrantedPush).toHaveBeenCalledTimes(2);

  await act(async () => { renderer.unmount(); });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(removeAppState).toHaveBeenCalledTimes(1);
});

test('a foreground invoice notice and a background notice open the associated order', async () => {
  await renderCoordinator();
  const message = {
    data: { type: 'invoice', order_id: '42' },
    notification: { title: 'Factura disponible', body: 'Ya podés consultar tu factura.' },
  };
  foreground(message);
  expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
    type: 'info', text1: 'Factura disponible', text2: 'Ya podés consultar tu factura.',
  }));
  jest.mocked(Toast.show).mock.calls[0][0].onPress?.();
  expect(openOrderFromPush).toHaveBeenLastCalledWith('42');
  opened({ data: { type: 'order_status', order_id: '43' } });
  expect(openOrderFromPush).toHaveBeenLastCalledWith('43');
});

test('session end clears navigation and retries pending withdrawal without registering again', async () => {
  await renderCoordinator();
  jest.mocked(getAuthState).mockReturnValue(false);
  jest.mocked(useAuthState).mockReturnValue(false);
  await act(async () => { renderer.update(<PushCoordinator />); });
  expect(clearPendingPushNavigation).toHaveBeenCalledTimes(1);
  expect(retryPendingPushRemoval).toHaveBeenCalledTimes(1);
  await act(async () => { appStateChanged('active'); });
  expect(retryPendingPushRemoval).toHaveBeenCalledTimes(2);
  expect(syncGrantedPush).toHaveBeenCalledTimes(1);
  foreground({ notification: { title: 'Aviso anterior' } });
  expect(Toast.show).not.toHaveBeenCalled();
});

test('unmount cancels callbacks even when listener setup finishes later', async () => {
  let resolveSetup!: (stop: () => void) => void;
  jest.mocked(attachPushListeners).mockImplementation((onForeground, onOpen) => {
    foreground = onForeground;
    opened = onOpen;
    return new Promise(resolve => { resolveSetup = resolve; });
  });
  await renderCoordinator();
  await act(async () => { renderer.unmount(); });
  await act(async () => { resolveSetup(unsubscribe); });
  foreground({ data: { order_id: '42' } });
  opened({ data: { order_id: '42' } });
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(Toast.show).not.toHaveBeenCalled();
  expect(openOrderFromPush).not.toHaveBeenCalled();
});
