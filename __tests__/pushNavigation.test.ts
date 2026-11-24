import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getAuthState } from '../utils/authState';
import { getOrderDetails, getOrders } from '../utils/api';
import {
  clearPendingPushNavigation,
  flushPushNavigation,
  navigationRef,
  openOrderFromPush,
} from '../utils/pushNavigation';
import OrdersScreen from '../screens/OrdersScreen';

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: jest.fn(),
    getCurrentRoute: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn(),
  useIsFocused: () => true,
}));

jest.mock('../utils/authState', () => ({ getAuthState: jest.fn() }));
jest.mock('../utils/api', () => ({
  getOrders: jest.fn(),
  getOrderDetails: jest.fn(),
  getErrorMessage: jest.fn(),
  createMercadoPagoCheckout: jest.fn(),
  createShipment: jest.fn(),
}));
jest.mock('../utils/invoicePdf', () => ({ shareInvoicePdf: jest.fn() }));
jest.mock('../utils/notify', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('../components/BottomNav', () => () => null);
jest.mock('../components/GlassUI', () => {
  const { View } = require('react-native');
  return { AppBackground: View, GlassCard: View };
});
jest.mock('../components/MotionUI', () => {
  const { View } = require('react-native');
  return { FadeInView: View, ListSkeleton: View };
});

const auth = jest.mocked(getAuthState);
const isReady = jest.mocked(navigationRef.isReady);
const getCurrentRoute = jest.mocked(navigationRef.getCurrentRoute);
const navigate = jest.mocked(navigationRef.navigate);
const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  clearPendingPushNavigation();
  Platform.OS = 'android';
  auth.mockReturnValue(true);
  isReady.mockReturnValue(true);
  getCurrentRoute.mockReturnValue({ key: 'client-home', name: 'ClientHome' });
});

afterAll(() => { Platform.OS = originalOS; });

test('opens an order on Android and consumes its pending navigation once', () => {
  openOrderFromPush('42');
  flushPushNavigation();

  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('Orders', {
    orderId: 42,
    pushRequestId: expect.any(Number),
  });
});

test('opens the Orders tab on iOS', () => {
  Platform.OS = 'ios';
  openOrderFromPush(42);

  expect(navigate).toHaveBeenCalledWith('MainTabs', {
    screen: 'Orders',
    params: { orderId: 42, pushRequestId: expect.any(Number) },
  });
});

test.each([
  undefined, null, '', ' ', '1.5', 1.5, 0, -1, '-1', '1e2', '0x10',
  ' 42 ', '42 ', '42oops', true, false, {}, [1], NaN, Infinity,
  Number.MAX_SAFE_INTEGER + 1, '9007199254740992',
])('ignores invalid order IDs (%p)', value => {
  openOrderFromPush(value);
  expect(navigate).not.toHaveBeenCalled();
});

test('waits for both authentication and navigation readiness', () => {
  auth.mockReturnValue(null);
  isReady.mockReturnValue(false);
  openOrderFromPush('42');
  auth.mockReturnValue(true);
  flushPushNavigation();
  expect(navigate).not.toHaveBeenCalled();

  isReady.mockReturnValue(true);
  flushPushNavigation();
  expect(navigate).toHaveBeenCalledWith('Orders', expect.objectContaining({ orderId: 42 }));
});

test.each(['Launch', 'Login', 'Register', 'ForgotPassword'] as const)(
  'waits for the reset from %s before opening the pending order', routeName => {
    getCurrentRoute.mockReturnValue({ key: 'auth', name: routeName });
    openOrderFromPush('42');
    flushPushNavigation();
    expect(navigate).not.toHaveBeenCalled();

    getCurrentRoute.mockReturnValue({ key: 'home', name: 'ClientHome' });
    flushPushNavigation();
    expect(navigate).toHaveBeenCalledWith('Orders', expect.objectContaining({ orderId: 42 }));
  },
);

test('does not queue notifications for a signed-out user', () => {
  auth.mockReturnValue(false);
  openOrderFromPush('42');
  auth.mockReturnValue(true);
  flushPushNavigation();
  expect(navigate).not.toHaveBeenCalled();
});

test('clears a pending order when the session ends', () => {
  auth.mockReturnValue(null);
  openOrderFromPush('42');
  clearPendingPushNavigation();
  auth.mockReturnValue(true);
  flushPushNavigation();
  expect(navigate).not.toHaveBeenCalled();
});

test('gives repeated openings of the same order a new request ID', () => {
  getCurrentRoute.mockReturnValue({ key: 'orders', name: 'Orders' });
  openOrderFromPush('42');
  openOrderFromPush('42');

  const calls = navigate.mock.calls as unknown as Array<[string, { pushRequestId: number }]>;
  const first = calls[0][1];
  const second = calls[1][1];
  expect(second.pushRequestId).toBeGreaterThan(first.pushRequestId);
});

test('reloads the order when another push opens it while Orders remains focused', async () => {
  const order = { id: 42, status: 'paid', total: 100, items: [], shipments: [], payments: [] };
  jest.mocked(getOrders).mockResolvedValue([order]);
  jest.mocked(getOrderDetails).mockResolvedValue(order);
  jest.mocked(useRoute).mockReturnValue({
    key: 'orders', name: 'Orders', params: { orderId: 42, pushRequestId: 1 },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => { renderer = ReactTestRenderer.create(React.createElement(OrdersScreen)); });
  expect(getOrderDetails).toHaveBeenCalledTimes(1);

  jest.mocked(useRoute).mockReturnValue({
    key: 'orders', name: 'Orders', params: { orderId: 42, pushRequestId: 2 },
  });
  await act(async () => { renderer.update(React.createElement(OrdersScreen)); });
  expect(getOrderDetails).toHaveBeenCalledTimes(2);
  await act(async () => { renderer.unmount(); });
});
