import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../types/types';
import { AppBackground } from '../components/GlassUI';
import { colors, formatPrice, shadow } from '../theme';
import Toast from '../utils/notify';
import { createMercadoPagoCheckout, getErrorMessage, getOrder } from '../utils/api';

type ThankYouRoute = RouteProp<RootStackParamList, 'ThankYou'>;
type Navigation = StackNavigationProp<RootStackParamList, 'ThankYou'>;

export default function ThankYouScreen() {
  const { orderDetails } = useRoute<ThankYouRoute>().params;
  const navigation = useNavigation<Navigation>();
  const [status, setStatus] = useState(orderDetails.status);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const order = await getOrder(orderDetails.orderId);
      setStatus(order.status);
    } catch {
      // El resumen del checkout sigue siendo válido si falla esta actualización.
    }
  }, [orderDetails.orderId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const pay = async () => {
    setPaying(true);
    try {
      const preference = await createMercadoPagoCheckout(orderDetails.orderId);
      await Linking.openURL(preference.init_point);
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo abrir Mercado Pago') });
    } finally {
      setPaying(false);
    }
  };

  const paid = ['paid', 'shipped_by_customer', 'received', 'in_process', 'ready_to_return', 'shipped_to_customer'].includes(status);

  return <AppBackground><ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      <View style={styles.check}><Icon name={paid ? 'check' : 'cart-check'} size={42} color="#fff"/></View>
      <Text style={styles.kicker}>{paid ? 'PAGO ACREDITADO' : 'PEDIDO CONFIRMADO'}</Text><Text style={styles.title}>{paid ? '¡Tu pago fue confirmado!' : '¡Tu pedido ya está creado!'}</Text>
      <Text style={styles.message}>{paid ? 'Ya podés preparar la pieza para enviarla al taller.' : 'Para continuar, aboná el total de forma segura con Mercado Pago.'}</Text>
      <View style={styles.orderSummary}><Text style={styles.summaryTitle}>Resumen del pedido</Text><Text style={styles.orderNumber}>Orden #{orderDetails.orderId}</Text>{orderDetails.email && <Text style={styles.detail}>Email: {orderDetails.email}</Text>}<Text style={styles.status}>Estado: {paid ? 'pago acreditado' : 'pendiente de pago'}</Text><Text style={styles.total}>Total: {formatPrice(orderDetails.total)}</Text></View>
      {!paid && <TouchableOpacity style={styles.payButton} onPress={pay} disabled={paying}>{paying ? <ActivityIndicator color="#fff"/> : <><Icon name="credit-card-outline" size={21} color="#fff"/><Text style={styles.buttonText}>Pagar con Mercado Pago</Text></>}</TouchableOpacity>}
      <View style={styles.instructionsContainer}><Text style={styles.instructionsTitle}>Próximos pasos</Text><Text style={styles.instruction}>1. Aboná el total con Mercado Pago.</Text><Text style={styles.instruction}>2. Al volver, verificaremos la acreditación del pago.</Text><Text style={styles.instruction}>3. Con el pedido pagado, despachá la pieza y cargá el tracking en “Mis pedidos”.</Text></View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Orders' }] })}><Text style={styles.buttonText}>Ver mis pedidos</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('Catalog')}><Text style={styles.secondaryText}>Volver al catálogo</Text></TouchableOpacity>
    </View>
  </ScrollView></AppBackground>;
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, backgroundColor: 'transparent', flexGrow: 1, justifyContent: 'center' }, container: { alignItems: 'center' }, check: { width: 82, height: 82, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 15, ...shadow }, kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 }, title: { fontSize: 28, fontWeight: 'bold', color: colors.ink, marginBottom: 14, textAlign: 'center' }, message: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  orderSummary: { backgroundColor: 'rgba(255,255,255,.78)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#fff', width: '100%', marginBottom: 25, ...shadow }, summaryTitle: { fontSize: 20, fontWeight: 'bold', color: colors.ink, marginBottom: 15 }, orderNumber: { fontSize: 16, color: colors.ink, fontWeight: '800', marginBottom: 9 }, detail: { fontSize: 14, color: colors.muted, marginBottom: 8 }, status: { fontSize: 14, color: colors.primaryDark, fontWeight: '700', marginBottom: 8 }, total: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  instructionsContainer: { width: '100%', marginBottom: 25 }, instructionsTitle: { fontSize: 19, fontWeight: 'bold', color: colors.ink, marginBottom: 12 }, instruction: { fontSize: 14, color: colors.muted, marginBottom: 8, lineHeight: 21 }, payButton: { backgroundColor: '#009EE3', padding: 15, borderRadius: 18, width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 22 }, button: { backgroundColor: colors.primary, padding: 15, borderRadius: 18, width: '100%', alignItems: 'center' }, buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }, secondary: { padding: 15 }, secondaryText: { color: colors.primary, fontWeight: '800' },
});
