import React, { ComponentType, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';
import { isAuthenticated } from '../utils/api';
import { useAuthState } from '../utils/authState';

export function withAuthentication<P extends object>(
  Screen: ComponentType<P>,
  redirectTo: 'Catalog' | 'Login' = 'Catalog',
) {
  return function ProtectedScreen(props: P & { navigation: any }) {
    const authenticated = useAuthState();

    useFocusEffect(useCallback(() => {
      let active = true;
      if (authenticated === null) {
        isAuthenticated().then(allowed => {
          if (active && !allowed) {
            props.navigation.reset({ index: 0, routes: [{ name: redirectTo }] });
          }
        });
      } else if (!authenticated) {
        props.navigation.reset({ index: 0, routes: [{ name: redirectTo }] });
      }
      return () => { active = false; };
    }, [authenticated, props.navigation]));

    if (authenticated !== true) {
      return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary}/></View>;
    }
    return <Screen {...props}/>;
  };
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
