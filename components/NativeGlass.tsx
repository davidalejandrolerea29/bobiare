import React, { ReactNode } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

const hasNativeLiquidGlass = (() => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    // Test runners and older custom clients may not contain the native module.
    return false;
  }
})();

type NativeGlassProps = Omit<ViewProps, 'children' | 'style'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
  tintColor?: string;
  interactive?: boolean;
};

/**
 * Native Liquid Glass on supported iOS 26 devices, with a visually equivalent
 * surface everywhere else. Keeping the fallback here avoids platform checks in
 * each screen and prevents mounting GlassView when the runtime API is missing.
 */
export function NativeGlass({
  children,
  style,
  fallbackColor = 'rgba(255,255,255,0.68)',
  tintColor = 'rgba(234,244,255,0.16)',
  interactive = false,
  ...viewProps
}: NativeGlassProps) {
  return (
    <View {...viewProps} style={style}>
      {hasNativeLiquidGlass ? (
        <GlassView
          pointerEvents={interactive ? 'auto' : 'none'}
          glassEffectStyle="regular"
          isInteractive={interactive}
          tintColor={tintColor}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor }]}
        />
      )}
      {children}
    </View>
  );
}

export const isNativeLiquidGlassAvailable = () => hasNativeLiquidGlass;
