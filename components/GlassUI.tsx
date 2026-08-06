import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

type IconName = React.ComponentProps<typeof Icon>['name'];

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 overflow-hidden bg-mist">
      <View
        pointerEvents="none"
        className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-blue-300/40"
      />
      <View
        pointerEvents="none"
        className="absolute -left-24 top-1/3 h-56 w-56 rounded-full bg-sky-200/35"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-28 right-4 h-72 w-72 rounded-full bg-blue-400/20"
      />
      <View
        pointerEvents="none"
        className="absolute right-10 top-20 h-2 w-2 rounded-full bg-white"
      />
      <View
        pointerEvents="none"
        className="absolute right-20 top-28 h-1.5 w-1.5 rounded-full bg-blue-400/70"
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      className="overflow-hidden rounded-3xl border border-white/90 bg-white/65"
      style={[shadow, style]}>
      <View
        pointerEvents="none"
        className="absolute left-5 right-5 top-0 h-px bg-white"
      />
      <View
        pointerEvents="none"
        className="absolute -right-12 -top-16 h-32 w-32 rounded-full bg-white/35"
      />
      {children}
    </View>
  );
}

export function PrimaryButton({
  title,
  icon,
  onPress,
  disabled,
  secondary,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[54px] flex-row items-center justify-center gap-2 rounded-2xl px-6 ${
        secondary
          ? 'border border-white/90 bg-white/70'
          : 'bg-brand-600'
      } ${disabled ? 'opacity-40' : ''}`}
      style={shadow}>
      {icon ? (
        <Icon
          name={icon}
          size={20}
          color={secondary ? colors.primary : '#FFFFFF'}
        />
      ) : null}
      <Text
        className={`text-base font-extrabold ${
          secondary ? 'text-brand-700' : 'text-white'
        }`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-3.5 flex-row items-center justify-between">
      <Text className="text-xl font-black tracking-tight text-ink">{title}</Text>
      {action ? (
        <TouchableOpacity
          onPress={onAction}
          className="rounded-full border border-blue-200/70 bg-white/55 px-3 py-1.5">
          <Text className="text-xs font-extrabold text-brand-600">{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
