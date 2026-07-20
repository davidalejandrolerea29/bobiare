import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Toast from '../utils/notify';
import { RootStackParamList } from '../types/types';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppBackground } from '../components/GlassUI';
import { colors, formatPrice, shadow } from '../theme';
import { checkout, getCart, getErrorMessage, getStatusCode, isAuthenticated } from '../utils/api';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<Navigation>();
  const [authenticated, setAuthenticated] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', recipientName: '', phone: '', street: '',
    city: '', province: '', postalCode: '', notes: '',
  });

  useEffect(() => {
    Promise.all([isAuthenticated(), getCart()])
      .then(([logged, cart]) => { setAuthenticated(logged); setTotal(cart.total); })
      .catch(error => Toast.show({ type: 'error', text1: getErrorMessage(error) }));
  }, []);

  const field = (key: keyof typeof form, placeholder: string, props: any = {}) =>
    <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#8C999E" value={form[key]} onChangeText={text => setForm(current => ({ ...current, [key]: text }))} {...props}/>;
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Cart');

  const submit = async () => {
    Keyboard.dismiss();
    const addressFields = [form.recipientName, form.phone, form.street, form.city, form.province, form.postalCode];
    if (addressFields.some(value => !value.trim()) || (!authenticated && (!form.name.trim() || !form.email.trim() || !form.password))) {
      Toast.show({ type: 'error', text1: 'Completá todos los campos obligatorios' });
      return;
    }
    if (!authenticated && form.password.length < 8) {
      Toast.show({ type: 'error', text1: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    setLoading(true);
    try {
      const order = await checkout({
        shipping_address: {
          recipient_name: form.recipientName.trim(),
          phone: form.phone.trim(),
          street: form.street.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          postal_code: form.postalCode.trim(),
        },
        notes: form.notes.trim() || undefined,
        ...(!authenticated ? { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password } : {}),
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'ThankYou', params: { orderDetails: { orderId: order.id, status: order.status, total: order.total, email: form.email || undefined } } }],
      });
    } catch (error) {
      if (getStatusCode(error) === 409) {
        Toast.show({ type: 'info', text1: 'Ese email ya tiene cuenta. Iniciá sesión para continuar.' });
        navigation.navigate('Login', { returnToCheckout: true });
      } else {
        Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo confirmar el pedido') });
      }
    } finally {
      setLoading(false);
    }
  };

  return <AppBackground><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><TouchableOpacity style={styles.back} onPress={goBack}><Icon name="arrow-left" size={21} color={colors.ink}/></TouchableOpacity><Text style={styles.title}>Finalizar pedido</Text><View style={styles.back}/></View>
      {!authenticated && <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identificate para continuar</Text>
        <Text style={styles.help}>Podés crear una cuenta con este pedido o iniciar sesión si ya sos cliente.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login', { returnToCheckout: true })}>
          <Icon name="login" size={19} color={colors.primary}/>
          <View style={styles.loginCopy}><Text style={styles.loginTitle}>Ya tengo una cuenta</Text><Text style={styles.loginNote}>Iniciar sesión y conservar este carrito</Text></View>
          <Icon name="chevron-right" size={20} color={colors.primary}/>
        </TouchableOpacity>
        <View style={styles.divider}><View style={styles.line}/><Text style={styles.dividerText}>O CREÁ TU CUENTA</Text><View style={styles.line}/></View>
        {field('name', 'Nombre completo')}
        {field('email', 'Correo electrónico', { keyboardType: 'email-address', autoCapitalize: 'none' })}
        {field('password', 'Contraseña (mínimo 8 caracteres)', { secureTextEntry: true })}
        <Text style={styles.help}>La cuenta se crea automáticamente cuando confirmás el pedido.</Text>
      </View>}
      <View style={styles.section}><Text style={styles.sectionTitle}>Dirección de envío</Text>{field('recipientName', 'Nombre de quien recibe')}{field('phone', 'Teléfono', { keyboardType: 'phone-pad' })}{field('street', 'Calle y número')}{field('city', 'Ciudad')}{field('province', 'Provincia')}{field('postalCode', 'Código postal')}{field('notes', 'Notas para el pedido (opcional)', { multiline: true })}</View>
      <View style={styles.totalContainer}><Text style={styles.totalLabel}>TOTAL CALCULADO POR EL SERVIDOR</Text><Text style={styles.totalText}>{formatPrice(total)}</Text><Text style={styles.help}>La seña se registra manualmente cuando Finanzas confirma el pago.</Text></View>
      <TouchableOpacity style={[styles.paymentButton, loading && styles.disabled]} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#fff"/> : <><Icon name="check-circle-outline" size={20} color="#fff"/><Text style={styles.paymentButtonText}>Confirmar pedido</Text></>}</TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView></AppBackground>;
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 }, container: { flex: 1, backgroundColor: 'transparent', padding: 20 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 }, back: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 21, fontWeight: '900', color: colors.ink },
  section: { marginBottom: 25 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 7, color: colors.ink }, help: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 12 }, input: { backgroundColor: 'rgba(255,255,255,.76)', padding: 15, borderRadius: 17, marginBottom: 10, borderWidth: 1, borderColor: '#fff', color: colors.ink },
  loginButton: { minHeight: 64, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(18,103,233,.28)', backgroundColor: 'rgba(255,255,255,.62)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, loginCopy: { flex: 1 }, loginTitle: { color: colors.primary, fontWeight: '900' }, loginNote: { color: colors.muted, fontSize: 11, marginTop: 2 }, divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 17 }, line: { flex: 1, height: 1, backgroundColor: colors.line }, dividerText: { color: colors.muted, fontSize: 9, fontWeight: '800', marginHorizontal: 9 },
  totalContainer: { marginVertical: 8, padding: 17, backgroundColor: 'rgba(255,255,255,.8)', borderRadius: 20, borderWidth: 1, borderColor: '#fff', ...shadow }, totalLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: .7 }, totalText: { fontSize: 24, fontWeight: 'bold', color: colors.ink, marginVertical: 5 }, paymentButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 18, alignItems: 'center', marginVertical: 20, flexDirection: 'row', justifyContent: 'center', gap: 8 }, paymentButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }, disabled: { opacity: .65 },
});
