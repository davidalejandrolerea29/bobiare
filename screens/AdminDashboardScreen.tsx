import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from '../utils/notify';
import { AppBackground, GlassCard } from '../components/GlassUI';
import { colors, formatPrice } from '../theme';
import { Order } from '../types/types';
import { getAdminOrders, getErrorMessage, logout, receiveOrder, registerDeposit } from '../utils/api';
import { FadeInView, ListSkeleton } from '../components/MotionUI';

const filters = [
  ['all', 'Todos'], ['pending_payment', 'Esperando seña'],
  ['deposit_paid', 'Seña paga'], ['shipped_by_customer', 'En camino'], ['received', 'Recibidos'],
] as const;

export default function AdminDashboardScreen({ navigation }: any) {
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [working, setWorking] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await getAdminOrders(status);
      setOrders(response.orders);
      setTotal(response.total);
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No pudimos cargar los pedidos') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const deposit = async (order: Order) => {
    setWorking(order.id);
    try {
      await registerDeposit(order.id, order.total / 2, 'transferencia');
      Toast.show({ type: 'success', text1: `Seña del pedido #${order.id} registrada` });
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo registrar la seña') });
    } finally {
      setWorking(null);
    }
  };

  const receive = async (order: Order) => {
    const note = notes[order.id]?.trim();
    if (!note) {
      Toast.show({ type: 'error', text1: 'Agregá una nota sobre la recepción' });
      return;
    }
    setWorking(order.id);
    try {
      await receiveOrder(order.id, note);
      Toast.show({ type: 'success', text1: `Pedido #${order.id} marcado como recibido` });
      await load();
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo recibir el pedido') });
    } finally {
      setWorking(null);
    }
  };

  const signOut = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return <AppBackground><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>OPERACIONES</Text><Text style={styles.title}>Pedidos</Text><Text style={styles.subtitle}>{total} pedido(s) en este filtro</Text></View><TouchableOpacity style={styles.logout} onPress={signOut}><Icon name="logout" size={21} color={colors.ink}/></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map(([key, label]) => <TouchableOpacity key={key} style={[styles.filter, status === key && styles.filterActive]} onPress={() => setStatus(key)}><Text style={[styles.filterText, status === key && styles.filterTextActive]}>{label}</Text></TouchableOpacity>)}</ScrollView>
    {loading ? <ListSkeleton rows={4}/> : !orders.length ? <Text style={styles.empty}>No hay pedidos con este estado.</Text> : orders.map((order, index) => <FadeInView key={order.id} index={index}><GlassCard style={styles.order}>
      <View style={styles.orderTop}><View style={styles.orderIcon}><Icon name="package-variant-closed" size={24} color={colors.primary}/></View><View style={styles.orderInfo}><Text style={styles.orderId}>PEDIDO #{order.id}</Text><Text style={styles.orderItem}>{order.items?.[0]?.product_name_snapshot || 'Pedido Bobiare'}</Text><Text style={styles.orderUser}>{order.user?.name || order.user?.email || 'Cliente'} · {formatPrice(order.total)}</Text></View><Text style={styles.orderState}>{order.status}</Text></View>
      {order.status === 'pending_payment' && <View style={styles.actionBox}><Text style={styles.actionTitle}>Registrar seña del 50%</Text><Text style={styles.actionHelp}>Transferencia por {formatPrice(order.total / 2)}</Text><TouchableOpacity style={styles.button} onPress={() => deposit(order)} disabled={working === order.id}>{working === order.id ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Confirmar seña</Text>}</TouchableOpacity></View>}
      {order.status === 'shipped_by_customer' && <View style={styles.actionBox}><Text style={styles.actionTitle}>Recepción en taller</Text>{order.shipments?.[0]?.tracking_number && <Text style={styles.actionHelp}>Tracking: {order.shipments[0].tracking_number}</Text>}<TextInput style={styles.noteInput} placeholder="Estado en que llegó la pieza" value={notes[order.id] || ''} onChangeText={value => setNotes(current => ({ ...current, [order.id]: value }))}/><TouchableOpacity style={styles.button} onPress={() => receive(order)} disabled={working === order.id}>{working === order.id ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Marcar como recibido</Text>}</TouchableOpacity></View>}
    </GlassCard></FadeInView>)}
  </ScrollView></AppBackground>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 35 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { fontSize: 29, color: colors.ink, fontWeight: '900', letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, logout: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.7)', borderWidth: 1, borderColor: '#fff' },
  filters: { gap: 8, paddingVertical: 22 }, filter: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.58)' }, filterActive: { backgroundColor: colors.primary }, filterText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, filterTextActive: { color: '#fff' }, empty: { textAlign: 'center', color: colors.muted, marginTop: 35 },
  order: { padding: 14, marginBottom: 12 }, orderTop: { flexDirection: 'row', alignItems: 'center' }, orderIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(147,197,253,.26)' }, orderInfo: { flex: 1, marginLeft: 12 }, orderId: { color: colors.primary, fontSize: 10, fontWeight: '900' }, orderItem: { color: colors.ink, fontWeight: '800', marginTop: 4 }, orderUser: { color: colors.muted, fontSize: 11, marginTop: 2 }, orderState: { color: colors.primaryDark, fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(147,197,253,.22)', padding: 6, borderRadius: 8, maxWidth: 100 },
  actionBox: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 13 }, actionTitle: { color: colors.ink, fontWeight: '900' }, actionHelp: { color: colors.muted, fontSize: 11, marginTop: 3 }, noteInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, color: colors.ink }, button: { backgroundColor: colors.primary, height: 43, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 10 }, buttonText: { color: '#fff', fontWeight: '800' },
});
