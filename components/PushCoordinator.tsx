import { useEffect } from 'react';
import { useAuthState } from '../utils/authState';
import { attachPushListeners, syncGrantedPush } from '../utils/pushNotifications';
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
        if (getAuthState() !== true) return;
        const orderId = message.data?.order_id;
        Toast.show({
          type: 'info',
          text1: message.notification?.title || 'BOBIARE',
          text2: message.notification?.body || 'Tenés una novedad en tu pedido.',
          onPress: () => openOrderFromPush(orderId),
        });
      },
      message => openOrderFromPush(message.data?.order_id),
    ).then(unsubscribe => {
      if (cancelled) unsubscribe(); else stop = unsubscribe;
    }).catch(() => {});
    return () => { cancelled = true; stop?.(); };
  }, []);

  useEffect(() => {
    if (authenticated === false) clearPendingPushNavigation();
    if (authenticated === true) {
      void syncGrantedPush().catch(() => {});
      // El reset de Launch/Login puede terminar un instante después de autenticar.
      const timer = setTimeout(flushPushNavigation, 0);
      return () => clearTimeout(timer);
    }
  }, [authenticated]);

  return null;
}
