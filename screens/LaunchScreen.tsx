import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { AppLoading } from '../components/MotionUI';
import { RootStackParamList } from '../types/types';
import { isAuthenticated } from '../utils/api';

export default function LaunchScreen({
  navigation,
}: {
  navigation: NavigationProp<RootStackParamList>;
}) {
  useEffect(() => {
    let active = true;

    isAuthenticated().then(authenticated => {
      if (!active) {
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{
          name: authenticated
            ? Platform.OS === 'ios'
              ? 'MainTabs'
              : 'ClientHome'
            : 'Catalog',
        }],
      });
    });

    return () => {
      active = false;
    };
  }, [navigation]);

  return <AppLoading />;
}
