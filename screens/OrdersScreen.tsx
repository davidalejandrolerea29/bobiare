import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from '../utils/notify';
import { AppBackground, GlassCard } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors, formatPrice } from '../theme';
import { Order } from '../types/types';
import { createShipment, getErrorMessage, getOrder, getOrders } from '../utils/api';

const statusLabels: Record<string, string> = {
  pending_payment: 'Esperando seña',
  deposit_paid: 'Seña acreditada',
  shipped_by_customer: 'En camino al taller',
  received: 'Recibido en taller',
  in_progress: 'En proceso',
  completed: 'Finalizado',
};
const statusOrder = ['pending_payment', 'deposit_paid', 'shipped_by_customer', 'received', 'in_progress', 'completed'];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setOrders(await getOrders());
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No pudimos cargar tus pedidos') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ship = async (order: Order) => {
    const value = tracking[order.id]?.trim();
    if (!value) {
      Toast.show({ type: 'error', text1: 'Ingresá el número de seguimiento' });
      return;
    }
    setSending(order.id);
    try {
      await createShipment(order.id, value);
      const updated = await getOrder(order.id);
      setOrders(current => current.map(item => item.id === order.id ? updated : item));
      Toast.show({ type: 'success', text1: 'Seguimiento informado correctamente' });
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo informar el seguimiento') });
    } finally {
      setSending(null);
    }
  };

  const visible = orders.filter(order =>
    filter === 'all' || (filter === 'completed' ? order.status === 'completed' : order.status !== 'completed'));

  return <AppBackground>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>}>
      <Text style={styles.eyebrow}>TRAZABILIDAD</Text><Text style={styles.title}>Mis pedidos</Text>
      <View style={styles.filters}>{([['active', 'En curso'], ['completed', 'Finalizados'], ['all', 'Todos']] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterActive]}><Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</View>
      {loading ? <ActivityIndicator size="large" color={colors.primary}/> : !visible.length ? <Text style={styles.empty}>Todavía no hay pedidos para mostrar.</Text> : visible.map(order => {
        const step = Math.max(0, statusOrder.indexOf(order.status));
        return <GlassCard key={order.id} style={styles.card}>
          <View style={styles.cardTop}><View style={styles.orderCopy}><Text style={styles.orderId}>PEDIDO #{order.id}</Text><Text style={styles.item}>{order.items?.[0]?.product_name_snapshot || 'Pedido Bobiare'}</Text><Text style={styles.service}>{order.items?.length || 0} ítem(s) · {formatPrice(order.total)}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{statusLabels[order.status] || order.status}</Text></View></View>
          <View style={styles.timeline}>{statusOrder.slice(0, 4).map((status, index) => <View key={status} style={styles.step}><View style={[styles.stepDot, index <= step && styles.stepDotActive]}>{index < step && <Icon name="check" size={11} color="#fff"/>}</View>{index < 3 && <View style={[styles.stepLine, index < step && styles.stepLineActive]}/>}</View>)}</View>
          {order.status === 'deposit_paid' && <View style={styles.trackingBox}><Text style={styles.trackingTitle}>Ya podés despachar tu pieza</Text><Text style={styles.trackingHelp}>Enviá el paquete por tu cuenta y cargá el tracking del correo.</Text><TextInput style={styles.trackingInput} placeholder="Ej.: CA987654321AR" autoCapitalize="characters" value={tracking[order.id] || ''} onChangeText={value => setTracking(current => ({ ...current, [order.id]: value }))}/><TouchableOpacity style={styles.shipButton} onPress={() => ship(order)} disabled={sending === order.id}>{sending === order.id ? <ActivityIndicator color="#fff"/> : <><Icon name="truck-delivery-outline" size={18} color="#fff"/><Text style={styles.shipButtonText}>Informar despacho</Text></>}</TouchableOpacity></View>}
          {!!order.shipments?.[0]?.tracking_number && <Text style={styles.trackingValue}>Tracking: {order.shipments[0].tracking_number}</Text>}
          {!!order.status_histories?.length && <View style={styles.history}>{order.status_histories.map((history, index) => <View key={`${history.status}-${index}`} style={styles.historyItem}><View style={styles.historyDot}/><View style={styles.historyCopy}><Text style={styles.historyStatus}>{statusLabels[history.status] || history.status}</Text>{history.note && <Text style={styles.historyNote}>{history.note}</Text>}</View></View>)}</View>}
        </GlassCard>;
      })}
    </ScrollView>
    <BottomNav active="Orders"/>
  </AppBackground>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 110 }, eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 4 }, filters: { flexDirection: 'row', padding: 5, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.55)', marginVertical: 22 }, filter: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14 }, filterActive: { backgroundColor: colors.primary }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: '#fff' }, empty: { color: colors.muted, textAlign: 'center', marginTop: 35 },
  card: { padding: 18, marginBottom: 16 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, orderCopy: { flex: 1 }, orderId: { fontSize: 10, color: colors.primary, fontWeight: '900', letterSpacing: .7 }, item: { color: colors.ink, fontWeight: '900', fontSize: 16, marginTop: 5 }, service: { color: colors.muted, fontSize: 12, marginTop: 3 }, badge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: 'rgba(56,189,248,.16)', maxWidth: 120 }, badgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  timeline: { flexDirection: 'row', alignItems: 'center', marginTop: 23 }, step: { flex: 1, flexDirection: 'row', alignItems: 'center' }, stepDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#CFD7D5', alignItems: 'center', justifyContent: 'center' }, stepDotActive: { backgroundColor: colors.primary }, stepLine: { flex: 1, height: 3, backgroundColor: '#CFD7D5' }, stepLineActive: { backgroundColor: colors.primary },
  trackingBox: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: 'rgba(147,197,253,.16)' }, trackingTitle: { color: colors.ink, fontWeight: '900' }, trackingHelp: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, trackingInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 11, color: colors.ink }, shipButton: { backgroundColor: colors.primary, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 9 }, shipButtonText: { color: '#fff', fontWeight: '800' }, trackingValue: { color: colors.primaryDark, fontWeight: '800', marginTop: 15 },
  history: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 16, paddingTop: 13, gap: 10 }, historyItem: { flexDirection: 'row', gap: 9 }, historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 }, historyCopy: { flex: 1 }, historyStatus: { color: colors.ink, fontSize: 11, fontWeight: '800' }, historyNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
});
