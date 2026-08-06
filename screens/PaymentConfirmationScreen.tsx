import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppBackground, GlassCard } from '../components/GlassUI';
import { RootStackParamList } from '../types/types';
import { colors, formatPrice } from '../theme';
import { getErrorMessage, getOrder } from '../utils/api';

type ConfirmationRoute = RouteProp<RootStackParamList, 'PaymentConfirmation'>;
type Navigation = StackNavigationProp<RootStackParamList, 'PaymentConfirmation'>;

export default function PaymentConfirmationScreen() {
  const { orderId } = useRoute<ConfirmationRoute>().params;
  const navigation = useNavigation<Navigation>();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending_payment');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const order = await getOrder(orderId);
      setStatus(order.status);
      setTotal(order.total);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'No pudimos verificar el pago.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void refresh(); }, [attempt, refresh]);
  useEffect(() => {
    if (status !== 'pending_payment' || error || attempt >= 3) return;
    const timer = setTimeout(() => setAttempt(current => current + 1), 2500);
    return () => clearTimeout(timer);
  }, [attempt, error, status]);

  const paid = ['paid', 'shipped_by_customer', 'received', 'in_process', 'ready_to_return', 'shipped_to_customer'].includes(status);

  return <AppBackground><View style={styles.container}>
    <View style={[styles.icon, paid && styles.iconPaid]}><Icon name={paid ? 'check' : 'clock-outline'} size={40} color="#fff"/></View>
    <Text style={styles.title}>{paid ? 'Pago acreditado' : 'Estamos verificando tu pago'}</Text>
    <Text style={styles.copy}>{paid ? 'Mercado Pago confirmó la operación. Ya podés enviar tu pieza.' : 'La confirmación puede tardar unos segundos. Podés volver a verificar sin realizar otro pago.'}</Text>
    <GlassCard style={styles.summary}><Text style={styles.order}>Pedido #{orderId}</Text>{total > 0 && <Text style={styles.total}>{formatPrice(total)}</Text>}<Text style={styles.status}>{paid ? 'Pagado' : 'Pendiente de confirmación'}</Text></GlassCard>
    {loading ? <ActivityIndicator color={colors.primary} size="large"/> : error ? <Text style={styles.error}>{error}</Text> : !paid && attempt < 3 ? <ActivityIndicator color={colors.primary}/> : null}
    {!paid && <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); setAttempt(current => current + 1); }}><Text style={styles.retryText}>Verificar nuevamente</Text></TouchableOpacity>}
    <TouchableOpacity style={styles.button} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Orders' }] })}><Text style={styles.buttonText}>Ir a mis pedidos</Text></TouchableOpacity>
  </View></AppBackground>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }, icon: { width: 78, height: 78, borderRadius: 27, backgroundColor: '#E0A800', alignItems: 'center', justifyContent: 'center' }, iconPaid: { backgroundColor: '#299E63' }, title: { color: colors.ink, fontSize: 27, fontWeight: '900', textAlign: 'center', marginTop: 20 }, copy: { color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 9, maxWidth: 360 }, summary: { width: '100%', padding: 19, alignItems: 'center', marginVertical: 23 }, order: { color: colors.ink, fontWeight: '900', fontSize: 16 }, total: { color: colors.primary, fontWeight: '900', fontSize: 22, marginTop: 5 }, status: { color: colors.muted, fontSize: 12, marginTop: 5 }, error: { color: colors.danger, textAlign: 'center' }, retry: { padding: 14 }, retryText: { color: colors.primary, fontWeight: '900' }, button: { width: '100%', backgroundColor: colors.primary, padding: 16, alignItems: 'center', borderRadius: 18, marginTop: 8 }, buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
