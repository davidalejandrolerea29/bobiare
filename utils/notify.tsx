import React, { useMemo, useRef, useSyncExternalStore } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

type NotificationParams = {
  type?: 'success' | 'error' | 'info';
  text1?: string;
  text2?: string;
  autoHide?: boolean;
  visibilityTime?: number;
  onPress?: () => void;
};

type NotificationState = NotificationParams & { id: number };

let current: NotificationState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const Notify = {
  show(params: NotificationParams) {
    if (timer) clearTimeout(timer);
    current = { ...params, type: params.type || 'success', id: nextId++ };
    emit();
    if (params.autoHide !== false) {
      const duration = params.visibilityTime ?? (params.type === 'error' ? 5000 : 3000);
      timer = setTimeout(() => Notify.hide(), duration);
    }
  },
  hide() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!current) return;
    current = null;
    emit();
  },
};

function Snackbar({ notification }: { notification: NotificationState }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
    onPanResponderMove: Animated.event([null, { dx: translateX }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 60) {
        Animated.timing(translateX, {
          toValue: gesture.dx > 0 ? 500 : -500,
          duration: 160,
          useNativeDriver: true,
        }).start(() => Notify.hide());
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  }), [translateX]);

  const isError = notification.type === 'error';
  const isInfo = notification.type === 'info';
  const close = () => {
    notification.onPress?.();
    Notify.hide();
  };

  return <Animated.View
    {...panResponder.panHandlers}
    style={[styles.animated, {
      transform: [{ translateX }],
      opacity: translateX.interpolate({ inputRange: [-250, 0, 250], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
    }]}>
    <Pressable onPress={close} style={[styles.snackbar, isError && styles.snackbarError]}>
      <View style={[styles.icon, isError && styles.iconError]}>
        <Icon name={isError ? 'alert-circle-outline' : isInfo ? 'information-outline' : 'check-circle-outline'} size={20} color="#fff"/>
      </View>
      <View style={styles.copy}>
        {!!notification.text1 && <Text style={styles.title} numberOfLines={2}>{notification.text1}</Text>}
        {!!notification.text2 && <Text style={styles.message} numberOfLines={3}>{notification.text2}</Text>}
      </View>
      <Icon name="close" size={18} color="rgba(255,255,255,.72)"/>
    </Pressable>
  </Animated.View>;
}

export function NotificationHost() {
  const notification = useSyncExternalStore(subscribe, () => current, () => null);
  if (!notification) return null;
  return <View pointerEvents="box-none" style={styles.host}><Snackbar key={notification.id} notification={notification}/></View>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 94, zIndex: 9999, alignItems: 'center' },
  animated: { width: '91%', maxWidth: 520 },
  snackbar: { width: '100%', minHeight: 54, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 17, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', ...shadow },
  snackbarError: { backgroundColor: '#A92D46' },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconError: { backgroundColor: 'rgba(255,255,255,.18)' },
  copy: { flex: 1, marginHorizontal: 10 },
  title: { color: '#fff', fontSize: 12, fontWeight: '900' },
  message: { color: 'rgba(255,255,255,.78)', fontSize: 10, lineHeight: 14, marginTop: 2 },
});

export default Notify;
