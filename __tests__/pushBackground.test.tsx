import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus } from 'react-native';
import { registerRootComponent } from 'expo';
import { setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import '../index';

jest.mock('../App', () => 'BobiareApp');
jest.mock('expo', () => ({ registerRootComponent: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: () => ({}),
  getIsHeadless: jest.fn(async () => true),
  setBackgroundMessageHandler: jest.fn(),
}));
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  native.Platform.OS = 'ios';
  native.AppState.currentState = 'background';
  native.AppState.addEventListener = jest.fn();
  return native;
});

test('iOS background delivery skips the app UI until the user brings it to the foreground', async () => {
  let stateChanged!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.mocked(AppState.addEventListener).mockImplementation((_event, callback) => {
    stateChanged = callback;
    return { remove };
  });
  const Root = jest.mocked(registerRootComponent).mock.calls[0][0];
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => { renderer = ReactTestRenderer.create(<Root />); });
  expect(setBackgroundMessageHandler).toHaveBeenCalledTimes(1);
  expect(renderer.toJSON()).toBeNull();

  await act(async () => { stateChanged('active'); });
  expect(renderer.toJSON()).toMatchObject({ type: 'BobiareApp' });
  await act(async () => { renderer.unmount(); });
  expect(remove).toHaveBeenCalledTimes(1);
});
