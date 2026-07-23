import React, { ReactNode, useEffect } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

export function FadeInView({ children, index = 0, style }: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <Animated.View
    entering={FadeInDown.duration(420).delay(Math.min(index, 8) * 55)}
    style={style}>
    {children}
  </Animated.View>;
}

export function SoftAppear({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeIn.duration(350)} style={style}>{children}</Animated.View>;
}

function Pulse({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.46);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 720 }), withTiming(0.46, { duration: 720 })),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.pulse, style, animatedStyle]}/>;
}

export function CatalogSkeleton() {
  return <SoftAppear style={styles.catalogList}>
    <View style={styles.grid}>{[0, 1, 2, 3].map(item => <View key={item} style={styles.productCard}>
      <Pulse style={styles.productImage}/><View style={styles.productBody}><Pulse style={styles.pill}/><Pulse style={styles.title}/><Pulse style={styles.copy}/><Pulse style={styles.price}/></View>
    </View>)}</View>
  </SoftAppear>;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return <SoftAppear style={styles.list}>{Array.from({ length: rows }, (_, index) => <View key={index} style={styles.row}>
    <Pulse style={styles.rowIcon}/><View style={styles.rowCopy}><Pulse style={styles.rowTitle}/><Pulse style={styles.rowText}/><Pulse style={styles.rowShort}/></View>
  </View>)}</SoftAppear>;
}

export function AppLoading() {
  return <View style={styles.appLoading}>
    <SoftAppear style={styles.loadingBrand}>
      <Image source={require('../assets/logo1.png')} style={styles.loadingLogo}/>
      <Text style={styles.loadingText}>PREPARANDO TU EXPERIENCIA</Text>
      <View style={styles.loadingTrack}><Pulse style={styles.loadingBar}/></View>
    </SoftAppear>
  </View>;
}

const styles = StyleSheet.create({
  pulse: { backgroundColor: 'rgba(96,119,146,.20)', borderRadius: 9 },
  catalogList: { paddingHorizontal: 20, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '48%', height: 278, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.60)', borderWidth: 1, borderColor: '#fff' },
  productImage: { height: 127, borderRadius: 0 },
  productBody: { padding: 12 }, pill: { width: 52, height: 15 }, title: { width: '88%', height: 17, marginTop: 12 }, copy: { width: '70%', height: 11, marginTop: 8 }, price: { width: 75, height: 20, marginTop: 24 },
  list: { paddingVertical: 6 }, row: { minHeight: 91, padding: 15, marginBottom: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,.62)', borderWidth: 1, borderColor: '#fff' },
  rowIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(18,103,233,.13)' }, rowCopy: { flex: 1, marginLeft: 13 }, rowTitle: { width: '72%', height: 15 }, rowText: { width: '54%', height: 11, marginTop: 9 }, rowShort: { width: 72, height: 13, marginTop: 10, backgroundColor: `${colors.primary}22` },
  appLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingBrand: { width: 260, alignItems: 'center' },
  loadingLogo: { width: 230, height: 100, resizeMode: 'contain' },
  loadingText: { marginTop: -10, color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  loadingTrack: { width: 118, height: 5, marginTop: 22, overflow: 'hidden', borderRadius: 5, backgroundColor: 'rgba(18,103,233,.10)' },
  loadingBar: { width: '100%', height: 5, borderRadius: 5, backgroundColor: colors.primary },
});
