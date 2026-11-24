import type {NavigationProp} from '@react-navigation/native';
import {Platform} from 'react-native';
import type {ApiUser, RootStackParamList} from '../types/types';
import Toast from './notify';

export function finishLogin(
  navigation: NavigationProp<RootStackParamList>,
  user: ApiUser,
  returnToCheckout = false,
) {
  Toast.show({
    type: 'success',
    text1: `Bienvenido${user.name ? `, ${user.name}` : ''}`,
    visibilityTime: 3000,
  });

  if (returnToCheckout) {
    navigation.reset({index: 1, routes: [{name: 'Cart'}, {name: 'Checkout'}]});
    return;
  }

  const roleObject = typeof user.role === 'object' ? user.role : undefined;
  const role = user.rol_id ?? user.role_id ?? roleObject?.id;
  const roleName = String(roleObject?.name ?? user.role ?? '').toLowerCase();
  const isStaff =
    [1, 2, 3, 4].includes(role ?? -1) ||
    [
      'admin',
      'administrator',
      'administrador',
      'gerente general',
      'stock',
      'finanzas',
    ].includes(roleName);
  navigation.reset({
    index: 0,
    routes: [
      {
        name: isStaff
          ? 'AdminDashboard'
          : Platform.OS === 'ios'
          ? 'MainTabs'
          : 'ClientHome',
      },
    ],
  });
}
