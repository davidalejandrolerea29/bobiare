import { createNavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import { RootStackParamList } from '../types/types';
import { getAuthState } from './authState';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingOrderId: number | null = null;
let nextPushRequestId = 1;
const authenticationRoutes = new Set(['Launch', 'Login', 'Register', 'ForgotPassword']);

export function openOrderFromPush(value: unknown) {
  if (getAuthState() === false) {
    return;
  }
  if (typeof value !== 'number' &&
      (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) {
    return;
  }
  const orderId = Number(value);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return;
  }
  pendingOrderId = orderId;
  flushPushNavigation();
}

export function clearPendingPushNavigation() {
  pendingOrderId = null;
}

export function flushPushNavigation() {
  if (!pendingOrderId || !navigationRef.isReady() || getAuthState() !== true) {
    return;
  }
  const currentRoute = navigationRef.getCurrentRoute()?.name;
  // La sesión se publica antes de que Launch/Login terminen su reset de navegación.
  if (!currentRoute || authenticationRoutes.has(currentRoute)) {
    return;
  }
  const orderId = pendingOrderId;
  pendingOrderId = null;
  const params = { orderId, pushRequestId: nextPushRequestId++ };
  if (Platform.OS === 'ios') {
    navigationRef.navigate('MainTabs', { screen: 'Orders', params });
  } else {
    navigationRef.navigate('Orders', params);
  }
}
