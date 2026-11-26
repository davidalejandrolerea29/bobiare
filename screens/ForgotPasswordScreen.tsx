import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppBackground, GlassCard, PrimaryButton } from '../components/GlassUI';
import { colors } from '../theme';
import { getErrorMessage, requestPasswordReset, resetPassword } from '../utils/api';
import Toast from '../utils/notify';

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const returnToLogin = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');

  const run = async (task: () => Promise<void>, fallback: string) => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    try {
      await task();
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, fallback) });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const sendCode = () => run(async () => {
    await requestPasswordReset(email);
    setStep('code');
    Toast.show({ type: 'success', text1: 'Si el correo está registrado, te enviamos un código' });
  }, 'No pudimos enviar el código');

  const submitReset = () => {
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    if (password !== confirm) {
      Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden' });
      return;
    }
    return run(async () => {
      await resetPassword(email, code, password);
      setStep('done');
    }, 'No pudimos cambiar la contraseña');
  };

  const title = step === 'email' ? 'Recuperá tu acceso' : step === 'code' ? 'Ingresá el código' : 'Contraseña actualizada';
  const text = step === 'email'
    ? 'Ingresá el correo asociado a tu cuenta y te enviaremos un código de 6 dígitos.'
    : step === 'code'
      ? `Si ${email.trim()} tiene una cuenta, le enviamos un código válido por 30 minutos. Revisá también la carpeta de spam.`
      : 'Ya podés iniciar sesión con tu nueva contraseña.';

  return <AppBackground><KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <GlassCard style={styles.card}>
        <View style={styles.icon}><Icon name={step === 'done' ? 'check-circle-outline' : step === 'code' ? 'email-check-outline' : 'lock-reset'} size={38} color={colors.primary}/></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>

        {step === 'email' && <>
          <View style={styles.inputWrap}><Icon name="email-outline" size={20} color={colors.muted}/><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="tu@email.com" placeholderTextColor="#93A09F" keyboardType="email-address" autoCapitalize="none" autoComplete="email"/></View>
          <PrimaryButton title={loading ? 'Enviando…' : 'Enviar código'} icon="send-outline" disabled={loading || !email.includes('@')} onPress={sendCode}/>
        </>}

        {step === 'code' && <>
          <View style={styles.inputWrap}><Icon name="numeric" size={20} color={colors.muted}/><TextInput style={styles.input} value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="Código de 6 dígitos" placeholderTextColor="#93A09F" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6}/></View>
          <View style={styles.inputWrap}><Icon name="lock-outline" size={20} color={colors.muted}/><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Nueva contraseña" placeholderTextColor="#93A09F" secureTextEntry textContentType="newPassword"/></View>
          <View style={styles.inputWrap}><Icon name="lock-check-outline" size={20} color={colors.muted}/><TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Repetir contraseña" placeholderTextColor="#93A09F" secureTextEntry textContentType="newPassword"/></View>
          <PrimaryButton title={loading ? 'Guardando…' : 'Cambiar contraseña'} icon="check" disabled={loading || code.length !== 6 || !password || !confirm} onPress={() => { void submitReset(); }}/>
          <TouchableOpacity style={styles.secondary} disabled={loading} onPress={() => { void sendCode(); }}><Text style={styles.secondaryText}>Reenviar código</Text></TouchableOpacity>
        </>}

        {step === 'done' && <PrimaryButton title="Volver a iniciar sesión" icon="arrow-left" onPress={returnToLogin}/>}
      </GlassCard>
    </ScrollView>
  </KeyboardAvoidingView></AppBackground>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 }, card: { padding: 24 },
  icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(147,197,253,.28)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', textAlign: 'center', letterSpacing: -.7, marginTop: 18 },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 9, marginBottom: 22 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  input: { flex: 1, color: colors.ink, fontSize: 15, marginLeft: 10 },
  secondary: { alignSelf: 'center', marginTop: 16, padding: 6 }, secondaryText: { color: colors.primary, fontWeight: '800' },
});
