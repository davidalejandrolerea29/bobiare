import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/types';
import { AppBackground, GlassCard, SectionHeader } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';

export default function ClientHomeScreen({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const shortcuts = [
    { label: 'Identificar pieza', note: 'Con una foto', icon: 'camera-outline', route: 'Identify' },
    { label: 'Ver catálogo', note: 'Servicios y precios', icon: 'view-grid-outline', route: 'Catalog' },
    { label: 'Mis pedidos', note: 'Seguí el proceso', icon: 'package-variant', route: 'Orders' },
  ] as const;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>BUEN DÍA</Text>
            <Text style={styles.greeting}>Hola, David</Text>
          </View>
          <TouchableOpacity style={styles.bell}><Icon name="bell-outline" size={23} color={colors.ink} /><View style={styles.dot} /></TouchableOpacity>
        </View>

        <GlassCard style={styles.hero}>
          <View style={styles.heroCopy}>
            <View style={styles.aiPill}><Icon name="creation" color={colors.primary} size={14} /><Text style={styles.aiPillText}>NUEVO · ASISTENTE IA</Text></View>
            <Text style={styles.heroTitle}>¿No sabés qué servicio necesitás?</Text>
            <Text style={styles.heroText}>Sacale una foto a tu pieza y te ayudamos a identificarla.</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Identify')}>
              <Icon name="camera" color="#fff" size={19} /><Text style={styles.heroButtonText}>Analizar una foto</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroIcon}><Icon name="auto-fix" size={55} color={colors.primary} /></View>
        </GlassCard>

        <SectionHeader title="¿Qué querés hacer?" />
        <View style={styles.shortcutRow}>
          {shortcuts.map(item => (
            <TouchableOpacity key={item.label} style={styles.shortcut} onPress={() => navigation.navigate(item.route as never)}>
              <View style={styles.shortcutIcon}><Icon name={item.icon} size={23} color={colors.primary} /></View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Text style={styles.shortcutNote}>{item.note}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Pedido en curso" action="Ver detalle" onAction={() => navigation.navigate('Orders')} />
        <GlassCard style={styles.orderCard}>
          <View style={styles.orderTop}>
            <View style={styles.orderImage}><Icon name="motorbike" color={colors.primary} size={32} /></View>
            <View style={styles.orderInfo}><Text style={styles.orderId}>PEDIDO #B-2048</Text><Text style={styles.orderName}>Llanta de moto · Rod. 17</Text><Text style={styles.orderMeta}>Granallado + pintura</Text></View>
            <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>En proceso</Text></View>
          </View>
          <View style={styles.progress}><View style={styles.progressDone} /></View>
          <View style={styles.progressLabels}><Text style={styles.progressActive}>Recibido</Text><Text style={styles.progressActive}>Evaluación</Text><Text style={styles.progressActive}>Proceso</Text><Text style={styles.progressOff}>Finalizado</Text></View>
          <Text style={styles.estimate}><Icon name="clock-outline" size={14} color={colors.muted} />  Finalización estimada: 24 de julio</Text>
        </GlassCard>
      </ScrollView>
      <BottomNav active="ClientHome" />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 28, paddingBottom: 110 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 },
  eyebrow: { fontSize: 11, letterSpacing: 1.7, fontWeight: '800', color: colors.primary },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  bell: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.66)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, top: 10, right: 11, borderWidth: 1, borderColor: '#fff' },
  hero: { padding: 20, minHeight: 205, marginBottom: 27, overflow: 'hidden', flexDirection: 'row' },
  heroCopy: { flex: 1, zIndex: 2 },
  aiPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(147,197,253,0.35)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, marginBottom: 12 },
  aiPillText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  heroTitle: { fontSize: 24, lineHeight: 28, fontWeight: '900', color: colors.ink, letterSpacing: -.7, maxWidth: 270 },
  heroText: { marginTop: 8, color: colors.muted, lineHeight: 20, maxWidth: 250 },
  heroButton: { alignSelf: 'flex-start', marginTop: 16, borderRadius: 14, paddingHorizontal: 16, height: 44, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { color: '#fff', fontWeight: '800' },
  heroIcon: { position: 'absolute', right: -5, bottom: -8, width: 115, height: 115, borderRadius: 58, backgroundColor: 'rgba(147,197,253,.28)', alignItems: 'center', justifyContent: 'center' },
  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  shortcut: { flex: 1, minHeight: 135, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: '#fff' },
  shortcutIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(147,197,253,.28)', justifyContent: 'center', alignItems: 'center', marginBottom: 11 },
  shortcutLabel: { fontWeight: '800', color: colors.ink, fontSize: 13, lineHeight: 16 },
  shortcutNote: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 14 },
  orderCard: { padding: 16 },
  orderTop: { flexDirection: 'row', alignItems: 'center' },
  orderImage: { width: 54, height: 54, borderRadius: 17, backgroundColor: 'rgba(147,197,253,.25)', alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1, marginLeft: 12 },
  orderId: { fontSize: 10, color: colors.primary, fontWeight: '900', letterSpacing: .6 },
  orderName: { fontSize: 14, color: colors.ink, fontWeight: '800', marginTop: 3 },
  orderMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  status: { flexDirection: 'row', backgroundColor: 'rgba(56,189,248,.16)', padding: 7, borderRadius: 10, alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  statusText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800' },
  progress: { height: 5, backgroundColor: 'rgba(23,33,43,.08)', borderRadius: 5, marginTop: 18, overflow: 'hidden' },
  progressDone: { width: '68%', height: 5, backgroundColor: colors.primary, borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressActive: { fontSize: 9, color: colors.primary, fontWeight: '700' },
  progressOff: { fontSize: 9, color: '#9CA7AE' },
  estimate: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.line, color: colors.muted, fontSize: 12 },
});
