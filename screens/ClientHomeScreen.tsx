import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { ApiUser, Order, RootStackParamList } from '../types/types';
import { AppBackground, GlassCard, SectionHeader } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';
import { FadeInView, SoftAppear } from '../components/MotionUI';
import { getTimeGreeting } from '../utils/greeting';
import { getCurrentUser, getErrorMessage, getOrderDetails, getOrders, getStoredUser } from '../utils/api';

const statusLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pago acreditado',
  shipped_by_customer: 'En camino al taller',
  received: 'Recibido en taller',
  in_process: 'En proceso',
  ready_to_return: 'Listo para volver',
  shipped_to_customer: 'En camino a tu domicilio',
};

const statusStages: Record<string, number> = {
  pending_payment: 0,
  paid: 0,
  shipped_by_customer: 1,
  received: 2,
  in_process: 2,
  ready_to_return: 3,
  shipped_to_customer: 3,
};

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' }).format(date);
};

export default function ClientHomeScreen({ navigation }: { navigation: NavigationProp<RootStackParamList> }) {
  const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
  const [user, setUser] = useState<ApiUser | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    const updateGreeting = () => setTimeGreeting(getTimeGreeting());
    updateGreeting();
    const timer = setInterval(updateGreeting, 60_000);
    setOrderLoading(true);
    setOrderError(null);

    void getStoredUser().then(stored => {
      if (active && stored) setUser(stored);
    });
    void Promise.all([getCurrentUser(), getOrders()])
      .then(async ([currentUser, orders]) => {
        if (!active) return;
        setUser(currentUser);
        const latest = [...orders]
          .filter(order => order.status !== 'shipped_to_customer')
          .sort((a, b) => {
            const byDate = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            return byDate || b.id - a.id;
          })[0];
        if (!latest) {
          setActiveOrder(null);
          return;
        }
        const detail = await getOrderDetails(latest.id);
        if (active) setActiveOrder(detail);
      })
      .catch(error => {
        if (active) setOrderError(getErrorMessage(error, 'No pudimos cargar tu pedido.'));
      })
      .finally(() => {
        if (active) setOrderLoading(false);
      });

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []));

  const stage = activeOrder ? (statusStages[activeOrder.status] ?? 0) : 0;
  const progressWidth = `${[8, 34, 67, 100][stage]}%` as `${number}%`;
  const primaryItem = activeOrder?.items?.[0];
  const latestUpdate = activeOrder?.status_histories?.at(-1)?.created_at || activeOrder?.created_at;

  const shortcuts = [
    { label: 'Identificar pieza', note: 'Con una foto', icon: 'camera-outline', route: 'Identify' },
    { label: 'Ver catálogo', note: 'Servicios y precios', icon: 'view-grid-outline', route: 'Catalog' },
    { label: 'Mis pedidos', note: 'Seguí el proceso', icon: 'package-variant', route: 'Orders' },
  ] as const;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SoftAppear style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{timeGreeting.toLocaleUpperCase('es-AR')}</Text>
            <Text style={styles.greeting}>Hola{user?.name ? `, ${user.name.split(/\s+/)[0]}` : ''}</Text>
          </View>
          <TouchableOpacity style={styles.bell}><Icon name="bell-outline" size={23} color={colors.ink} /><View style={styles.dot} /></TouchableOpacity>
        </SoftAppear>

        <FadeInView><GlassCard style={styles.hero}>
          <View style={styles.heroCopy}>
            <View style={styles.aiPill}><Icon name="creation" color={colors.primary} size={14} /><Text style={styles.aiPillText}>NUEVO · ASISTENTE IA</Text></View>
            <Text style={styles.heroTitle}>¿No sabés qué servicio necesitás?</Text>
            <Text style={styles.heroText}>Sacale una foto a tu pieza y te ayudamos a identificarla.</Text>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Identify')}>
              <Icon name="camera" color="#fff" size={19} /><Text style={styles.heroButtonText}>Analizar una foto</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroIcon}><Icon name="auto-fix" size={55} color={colors.primary} /></View>
        </GlassCard></FadeInView>

        <SectionHeader title="¿Qué querés hacer?" />
        <View style={styles.shortcutRow}>
          {shortcuts.map((item, index) => (
            <FadeInView key={item.label} index={index + 1} style={styles.shortcutSlot}><TouchableOpacity style={styles.shortcut} onPress={() => navigation.navigate(item.route as never)}>
              <View style={styles.shortcutIcon}><Icon name={item.icon} size={23} color={colors.primary} /></View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
              <Text style={styles.shortcutNote}>{item.note}</Text>
            </TouchableOpacity></FadeInView>
          ))}
        </View>

        <SectionHeader title="Pedido en curso" action={activeOrder ? 'Ver detalle' : undefined} onAction={activeOrder ? () => navigation.navigate('Orders') : undefined} />
        {orderLoading ? <GlassCard style={styles.orderLoading}><ActivityIndicator color={colors.primary}/><Text style={styles.loadingText}>Cargando tu pedido…</Text></GlassCard> : orderError ? <GlassCard style={styles.emptyOrder}><Icon name="cloud-alert-outline" size={29} color={colors.muted}/><Text style={styles.emptyTitle}>No pudimos cargar el pedido</Text><Text style={styles.emptyText}>{orderError}</Text></GlassCard> : !activeOrder ? <GlassCard style={styles.emptyOrder}><Icon name="package-variant-closed" size={31} color={colors.primary}/><Text style={styles.emptyTitle}>No tenés pedidos en curso</Text><Text style={styles.emptyText}>Cuando confirmes una compra vas a poder seguirla desde acá.</Text><TouchableOpacity style={styles.catalogButton} onPress={() => navigation.navigate('Catalog')}><Text style={styles.catalogButtonText}>Explorar catálogo</Text></TouchableOpacity></GlassCard> : <FadeInView index={4}><GlassCard style={styles.orderCard}>
          <View style={styles.orderTop}>
            <View style={styles.orderImage}><Icon name="package-variant" color={colors.primary} size={32} /></View>
            <View style={styles.orderInfo}><Text style={styles.orderId}>PEDIDO #{activeOrder.id}</Text><Text style={styles.orderName} numberOfLines={2}>{primaryItem?.product_name_snapshot || 'Pedido Bobiare'}</Text><Text style={styles.orderMeta} numberOfLines={2}>{primaryItem?.delivery_time_snapshot?.description || `${activeOrder.items.length} ítem(s)`}</Text></View>
            <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>{statusLabels[activeOrder.status] || activeOrder.status}</Text></View>
          </View>
          <View style={styles.progress}><View style={[styles.progressDone, { width: progressWidth }]} /></View>
          <View style={styles.progressLabels}>{['Pago', 'Envío', 'Taller', 'Devolución'].map((label, index) => <Text key={label} style={index <= stage ? styles.progressActive : styles.progressOff}>{label}</Text>)}</View>
          <Text style={styles.estimate}><Icon name="clock-outline" size={14} color={colors.muted} />  {primaryItem?.delivery_time_snapshot?.business_days ? `Plazo contratado: ${primaryItem.delivery_time_snapshot.business_days} días hábiles` : latestUpdate ? `Última actualización: ${formatDate(latestUpdate)}` : 'Seguimiento actualizado desde el servidor'}</Text>
        </GlassCard></FadeInView>}
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
  shortcutSlot: { flex: 1 },
  shortcut: { flex: 1, minHeight: 135, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: '#fff' },
  shortcutIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(147,197,253,.28)', justifyContent: 'center', alignItems: 'center', marginBottom: 11 },
  shortcutLabel: { fontWeight: '800', color: colors.ink, fontSize: 13, lineHeight: 16 },
  shortcutNote: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 14 },
  orderCard: { padding: 16 },
  orderLoading: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontSize: 12 },
  emptyOrder: { padding: 22, alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 9 },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  catalogButton: { backgroundColor: colors.primary, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 10, marginTop: 13 },
  catalogButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
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
  progressDone: { height: 5, backgroundColor: colors.primary, borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressActive: { fontSize: 9, color: colors.primary, fontWeight: '700' },
  progressOff: { fontSize: 9, color: '#9CA7AE' },
  estimate: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.line, color: colors.muted, fontSize: 12 },
});
