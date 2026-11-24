import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { ApiUser } from '../types/types';
import { getGoogleSignInUnavailableReason, signInWithGoogle } from '../utils/googleSignIn';
import { getErrorMessage } from '../utils/api';
import Toast from '../utils/notify';
import { colors } from '../theme';

type Props = {
  onAuthenticated: (user: ApiUser) => void;
  disabled?: boolean;
  pendingRef: React.MutableRefObject<boolean>;
  onLoadingChange: (loading: boolean) => void;
};

export default function GoogleSignInButton({ onAuthenticated, disabled, pendingRef, onLoadingChange }: Props) {
  const [loading, setLoading] = useState(false);
  const unavailableReason = getGoogleSignInUnavailableReason();
  const isDisabled = disabled || loading || Boolean(unavailableReason);

  const handlePress = async () => {
    if (pendingRef.current || isDisabled) return;
    pendingRef.current = true;
    setLoading(true);
    onLoadingChange(true);
    try {
      const user = await signInWithGoogle();
      if (user) onAuthenticated(user);
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo continuar con Google') });
    } finally {
      pendingRef.current = false;
      setLoading(false);
      onLoadingChange(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
        style={[styles.button, isDisabled && styles.disabled]}
        disabled={isDisabled}
        onPress={handlePress}>
        {loading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            <Svg width={20} height={20} viewBox="0 0 48 48" accessible={false}>
              <Path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.82Z" />
              <Path fill="#34A853" d="M24 44c5.5 0 10.11-1.82 13.48-4.93l-6.61-5.14c-1.83 1.23-4.17 1.96-6.87 1.96-5.32 0-9.83-3.59-11.44-8.42H5.73v5.3A20 20 0 0 0 24 44Z" />
              <Path fill="#FBBC05" d="M12.56 27.47a12 12 0 0 1 0-6.94v-5.3H5.73a20 20 0 0 0 0 17.54l6.83-5.3Z" />
              <Path fill="#EA4335" d="M24 12.11c2.99 0 5.67 1.03 7.78 3.04l5.84-5.84A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.73 15.23l6.83 5.3C14.17 15.7 18.68 12.11 24 12.11Z" />
            </Svg>
            <Text style={styles.text}>Continuar con Google</Text>
          </>
        )}
      </TouchableOpacity>
      {unavailableReason ? <Text style={styles.note}>{unavailableReason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  button: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: '#747775', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  text: { color: '#1F1F1F', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
