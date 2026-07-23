import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Toast from '../utils/notify';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/types';
import { AppBackground, GlassCard } from '../components/GlassUI';
import { colors, shadow } from '../theme';
import { getErrorMessage, login } from '../utils/api';
import { FadeInView, SoftAppear } from '../components/MotionUI';

export default function LoginScreen({ navigation, route }: { navigation: NavigationProp<RootStackParamList>; route: RouteProp<RootStackParamList, 'Login'> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Ingresá tu email y contraseña' });
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      Toast.show({
        type: 'success',
        text1: `Bienvenido${user?.name ? `, ${user.name}` : ''}`,
        autoHide: true,
        visibilityTime: 3000,
        onPress: () => Toast.hide(),
      });
      if (route.params?.returnToCheckout) {
        navigation.reset({ index: 1, routes: [{ name: 'Cart' }, { name: 'Checkout' }] });
        return;
      }
      const roleObject = typeof user?.role === 'object' ? user.role : undefined;
      const role = user?.rol_id ?? user?.role_id ?? roleObject?.id;
      const roleName = String(roleObject?.name ?? user?.role ?? '').toLowerCase();
      const isStaff = [1, 2, 3, 4].includes(role ?? -1) || ['admin', 'administrator', 'administrador', 'gerente general', 'stock', 'finanzas'].includes(roleName);
      navigation.reset({ index: 0, routes: [{ name: isStaff ? 'AdminDashboard' : 'ClientHome' }] });
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo iniciar sesión') });
    } finally {
      setLoading(false);
    }
  };

  return <AppBackground><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <SoftAppear style={styles.brand}><Image source={require('../assets/logo1.png')} style={styles.logo}/><Text style={styles.tagline}>RENOVAMOS LO QUE IMPORTA</Text></SoftAppear>
    <FadeInView><GlassCard style={styles.card}>
      <Text style={styles.welcome}>Bienvenido</Text><Text style={styles.subtitle}>Ingresá para gestionar y seguir tus trabajos.</Text>
      <Text style={styles.label}>Correo electrónico</Text><View style={styles.inputWrap}><Icon name="email-outline" size={20} color={colors.muted}/><TextInput style={styles.input} placeholder="tu@email.com" placeholderTextColor="#93A09F" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/></View>
      <Text style={styles.label}>Contraseña</Text><View style={styles.inputWrap}><Icon name="lock-outline" size={20} color={colors.muted}/><TextInput style={styles.input} placeholder="Tu contraseña" placeholderTextColor="#93A09F" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}/><TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted}/></TouchableOpacity></View>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>{loading ? <ActivityIndicator color="#fff"/> : <><Text style={styles.buttonText}>Ingresar</Text><Icon name="arrow-right" size={20} color="#fff"/></>}</TouchableOpacity>
      <View style={styles.divider}><View style={styles.line}/><Text style={styles.or}>O</Text><View style={styles.line}/></View>
      <TouchableOpacity style={styles.register} onPress={() => navigation.navigate('Register')}><Text style={styles.registerText}>Crear una cuenta</Text></TouchableOpacity>
      <TouchableOpacity style={styles.adminDemo} onPress={() => navigation.navigate('Catalog')}><Icon name="view-grid-outline" size={16} color={colors.muted}/><Text style={styles.adminDemoText}>Ver catálogo sin iniciar sesión</Text></TouchableOpacity>
    </GlassCard></FadeInView>
    <FadeInView index={1} style={styles.trust}><Icon name="shield-check-outline" size={17} color={colors.primary}/><Text style={styles.trustText}>Tus datos y pedidos están protegidos</Text></FadeInView>
  </ScrollView></KeyboardAvoidingView></AppBackground>;
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 38 },
  brand: { alignItems: 'center', marginBottom: 10 }, logo: { width: 245, height: 105, resizeMode: 'contain' },
  tagline: { color: colors.primary, fontWeight: '900', letterSpacing: 2.1, fontSize: 9, marginTop: -13 },
  card: { padding: 22 }, welcome: { fontSize: 28, color: colors.ink, fontWeight: '900', letterSpacing: -.7 },
  demoPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(147,197,253,.28)', marginBottom: 10 },
  demoPillText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 5, marginBottom: 21 }, label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  inputWrap: { height: 55, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: colors.border, borderRadius: 17, paddingHorizontal: 15, marginBottom: 14 },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: colors.ink }, forgot: { alignSelf: 'flex-end', color: colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 18 },
  button: { height: 55, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, ...shadow },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 }, divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: colors.line }, or: { color: colors.muted, fontSize: 10, marginHorizontal: 11, fontWeight: '700' },
  register: { height: 53, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(18,103,233,.25)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.52)' }, registerText: { color: colors.primary, fontWeight: '900' },
  adminDemo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 }, adminDemoText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  trust: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 18 }, trustText: { color: colors.muted, fontSize: 11 },
});
