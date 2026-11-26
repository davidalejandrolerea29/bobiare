import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import type { ApiUser } from '../types/types';
import { isAppleSignInAvailable, signInWithApple } from '../utils/appleSignIn';
import { getErrorMessage } from '../utils/api';
import Toast from '../utils/notify';

type Props = {
  onAuthenticated: (user: ApiUser) => void;
  disabled?: boolean;
  pendingRef: React.MutableRefObject<boolean>;
  onLoadingChange: (loading: boolean) => void;
  mode?: 'signIn' | 'signUp';
};

/** Botón oficial de Sign in with Apple (solo iOS, App Store 4.8). */
export default function AppleSignInButton({ onAuthenticated, disabled, pendingRef, onLoadingChange, mode = 'signIn' }: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (Platform.OS === 'ios') {
      void isAppleSignInAvailable().then(value => { if (active) setAvailable(value); });
    }
    return () => { active = false; };
  }, []);

  if (!available) return null;
  const apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');

  const handlePress = async () => {
    if (pendingRef.current || disabled || loading) return;
    pendingRef.current = true;
    setLoading(true);
    onLoadingChange(true);
    try {
      const user = await signInWithApple();
      if (user) onAuthenticated(user);
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo continuar con Apple') });
    } finally {
      pendingRef.current = false;
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return (
    <View style={[styles.container, (disabled || loading) && styles.disabled]} pointerEvents={disabled || loading ? 'none' : 'auto'}>
      {loading ? <View style={styles.loading}><ActivityIndicator color="#fff" /></View> : (
        <apple.AppleAuthenticationButton
          buttonType={mode === 'signUp' ? apple.AppleAuthenticationButtonType.SIGN_UP : apple.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={17}
          style={styles.button}
          onPress={handlePress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  button: { width: '100%', height: 52 },
  loading: { height: 52, borderRadius: 17, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
