import { createNavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import { RootStackParamList } from '../types/types';
import { getAuthState } from './authState';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingOrderId: number | null = null;

export function openOrderFromPush(value: unknown) {
  if (getAuthState() === false) return;
  const orderId = Number(value);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return;
  pendingOrderId = orderId;
  flushPushNavigation();
}

export function clearPendingPushNavigation() {
  pendingOrderId = null;
}

export function flushPushNavigation() {
  if (!pendingOrderId || !navigationRef.isReady() || getAuthState() !== true ||
      navigationRef.getCurrentRoute()?.name === 'Launch') return;
  const orderId = pendingOrderId;
  pendingOrderId = null;
  if (Platform.OS === 'ios') {
    navigationRef.navigate('MainTabs', { screen: 'Orders', params: { orderId } });
  } else {
    navigationRef.navigate('Orders', { orderId });
  }
}
