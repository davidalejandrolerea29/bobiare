import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppBackground, GlassCard, PrimaryButton } from '../components/GlassUI';
import { colors } from '../theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const returnToLogin = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');
  return <AppBackground><KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <GlassCard style={styles.card}>
      <View style={styles.icon}><Icon name={sent ? 'email-check-outline' : 'lock-reset'} size={38} color={colors.primary}/></View>
      <Text style={styles.title}>{sent ? 'Revisá tu correo' : 'Recuperá tu acceso'}</Text>
      <Text style={styles.text}>{sent ? `Enviamos las instrucciones a ${email}. El enlace será válido por 30 minutos.` : 'Ingresá el correo asociado a tu cuenta y te enviaremos un enlace seguro.'}</Text>
      {!sent && <View style={styles.inputWrap}><Icon name="email-outline" size={20} color={colors.muted}/><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="tu@email.com" placeholderTextColor="#93A09F" keyboardType="email-address" autoCapitalize="none"/></View>}
      <PrimaryButton title={sent ? 'Volver a iniciar sesión' : 'Enviar instrucciones'} icon={sent ? 'arrow-left' : 'send-outline'} disabled={!sent && !email.includes('@')} onPress={() => sent ? returnToLogin() : setSent(true)}/>
    </GlassCard>
  </KeyboardAvoidingView></AppBackground>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20 }, card: { padding: 24 },
  icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(147,197,253,.28)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', textAlign: 'center', letterSpacing: -.7, marginTop: 18 },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 9, marginBottom: 22 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  input: { flex: 1, color: colors.ink, fontSize: 15, marginLeft: 10 },
});
