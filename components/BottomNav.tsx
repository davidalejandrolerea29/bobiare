import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/types';
import { colors, shadow } from '../theme';
import { isAuthenticated } from '../utils/api';
import { useAuthState } from '../utils/authState';

type IconName = React.ComponentProps<typeof Icon>['name'];

const items: Array<{
  route: keyof RootStackParamList;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  featured?: boolean;
}> = [
  { route: 'ClientHome', label: 'Inicio', icon: 'home-outline', activeIcon: 'home-variant' },
  { route: 'Catalog', label: 'Catálogo', icon: 'view-grid-outline', activeIcon: 'view-grid' },
  { route: 'Identify', label: 'Escanear', icon: 'camera-plus-outline', activeIcon: 'camera-plus', featured: true },
  { route: 'Orders', label: 'Pedidos', icon: 'package-variant-closed', activeIcon: 'package-variant' },
  { route: 'Profile', label: 'Perfil', icon: 'account-circle-outline', activeIcon: 'account-circle' },
];

export default function BottomNav({ active }: { active: string }) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const authenticated = useAuthState();

  useFocusEffect(useCallback(() => {
    if (authenticated === null) isAuthenticated();
  }, [authenticated]));

  if (authenticated !== true) return null;

  return (
    <View
      className="absolute bottom-2.5 left-3.5 right-3.5 h-[74px] flex-row items-center rounded-[26px] border border-white bg-white/90 px-1.5"
      style={shadow}>
      <View
        pointerEvents="none"
        className="absolute left-6 right-6 top-0 h-px bg-white"
      />
      {items.map(item => {
        const selected = active === item.route;
        return (
          <TouchableOpacity
            key={item.route}
            className={`flex-1 items-center justify-center gap-0.5 ${item.featured ? '-translate-y-3' : ''}`}
            activeOpacity={0.76}
            onPress={() => navigation.navigate(item.route as never)}>
            <View
              className={`items-center justify-center ${
                item.featured
                  ? 'h-14 w-14 rounded-[20px] border border-blue-300 bg-brand-600'
                  : selected
                    ? 'h-9 w-10 rounded-xl bg-brand-600'
                    : 'h-9 w-10 rounded-xl'
              }`}
              style={item.featured ? shadow : undefined}>
              <Icon
                name={selected ? item.activeIcon : item.icon}
                size={item.featured ? 26 : 21}
                color={item.featured || selected ? '#FFFFFF' : colors.muted}
              />
            </View>
            {!item.featured ? (
              <Text
                className={`text-[10px] font-bold ${
                  selected ? 'text-brand-600' : 'text-slate-500'
                }`}>
                {item.label}
              </Text>
            ) : (
              <Text className="mt-0.5 text-[9px] font-extrabold text-brand-700">
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
