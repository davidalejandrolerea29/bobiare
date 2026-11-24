import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthState } from '../utils/authState';
import { attachPushListeners, retryPendingPushRemoval, syncGrantedPush } from '../utils/pushNotifications';
import { clearPendingPushNavigation, flushPushNavigation, openOrderFromPush } from '../utils/pushNavigation';
import { getAuthState } from '../utils/authState';
import Toast from '../utils/notify';

export default function PushCoordinator() {
  const authenticated = useAuthState();

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    void attachPushListeners(
      message => {
        if (cancelled || getAuthState() !== true) return;
        const orderId = message.data?.order_id;
        Toast.show({
          type: 'info',
          text1: message.notification?.title || 'BOBIARE',
          text2: message.notification?.body || 'Tenés una novedad en tu pedido.',
          visibilityTime: 6000,
          onPress: () => openOrderFromPush(orderId),
        });
      },
      message => { if (!cancelled) openOrderFromPush(message.data?.order_id); },
    ).then(unsubscribe => {
      if (cancelled) unsubscribe(); else stop = unsubscribe;
    }).catch(() => {});
    return () => { cancelled = true; stop?.(); };
  }, []);

  useEffect(() => {
    if (authenticated === false) {
      clearPendingPushNavigation();
      void retryPendingPushRemoval().catch(() => {});
    }
    if (authenticated === true) {
      void syncGrantedPush().catch(() => {});
      // El reset de Launch/Login puede terminar un instante después de autenticar.
      const timer = setTimeout(flushPushNavigation, 0);
      return () => clearTimeout(timer);
    }
  }, [authenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      if (getAuthState() === true) void syncGrantedPush().catch(() => {});
      else void retryPendingPushRemoval().catch(() => {});
      flushPushNavigation();
    });
    return () => subscription.remove();
  }, []);

  return null;
}
