import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import Toast from '../utils/notify';
import { AppBackground } from '../components/GlassUI';
import { colors, shadow } from '../theme';
import { getErrorMessage, register } from '../utils/api';
import { FadeInView, SoftAppear } from '../components/MotionUI';
import GoogleSignInButton from '../components/GoogleSignInButton';
import AppleSignInButton from '../components/AppleSignInButton';
import { LEGAL_URLS, openExternalUrl } from '../utils/legal';
import { finishLogin } from '../utils/authNavigation';
import type { RootStackParamList } from '../types/types';

function RegistrationField({ label, ...inputProps }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          style={styles.input}
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation, route }: {
  navigation: NavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'Register'>;
}) {

  const [name, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  const clearFields = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setConfirmPassword('');
  };

  const handleRegister = async () => {
    if (pending.current) return;
    if (!email || !password || !name || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Por favor complete todos los campos' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden' });
      return;
    }

    pending.current = true;
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      Toast.show({
        type: 'success',
        text1: 'Cuenta creada. Ya podés iniciar sesión.',
        autoHide: true,
        visibilityTime: 3000,
        onPress: () => Toast.hide(),
      });
      clearFields();
      navigation.navigate('Login', route.params);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'No se pudo crear la cuenta',
        text2: getErrorMessage(error, 'El servidor no devolvió detalles.'),
        visibilityTime: 5000,
      });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return (
    <AppBackground>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <SoftAppear style={styles.heading}>
            <Text style={styles.eyebrow}>EMPEZÁ CON BOBIARE</Text><Text style={styles.title}>Crear una cuenta</Text><Text style={styles.subtitle}>Cotizá y seguí tus trabajos desde un solo lugar.</Text>
          </SoftAppear>

          <FadeInView style={styles.form}>
            <AppleSignInButton mode="signUp" disabled={loading} pendingRef={pending} onLoadingChange={setLoading} onAuthenticated={user => finishLogin(navigation, user, route.params?.returnToCheckout)} />
            <GoogleSignInButton disabled={loading} pendingRef={pending} onLoadingChange={setLoading} onAuthenticated={user => finishLogin(navigation, user, route.params?.returnToCheckout)} />
            <Text style={styles.separator}>O registrate con tu correo</Text>
            <RegistrationField
              label="Nombre completo"
              placeholder="Nombre completo"
              value={name}
              onChangeText={setNombre}
              returnKeyType="next"
            />

            <RegistrationField
              label="Correo electrónico"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <RegistrationField
              label="Contraseña"
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <RegistrationField
              label="Confirmar contraseña"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
            </TouchableOpacity>

            <Text style={styles.legal}>
              Al crear tu cuenta aceptás los{' '}
              <Text style={styles.legalLink} accessibilityRole="link" onPress={() => openExternalUrl(LEGAL_URLS.terms)}>Términos y condiciones</Text>
              {' '}y la{' '}
              <Text style={styles.legalLink} accessibilityRole="link" onPress={() => openExternalUrl(LEGAL_URLS.privacy)}>Política de privacidad</Text>.
            </Text>

            <TouchableOpacity style={styles.linkButton} disabled={loading} onPress={() => navigation.navigate('Login', route.params)}>
              <Text style={styles.linkText}>¿Ya tenés cuenta? Iniciá sesión</Text>
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  legal: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 },
  legalLink: { color: colors.primary, fontWeight: '700' },
  keyboard: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    padding: 20,
    justifyContent: 'center',
    paddingVertical: 34,
  },
  heading: { flexShrink: 0 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  form: {
    marginTop: 22,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#C7D7EB',
    ...shadow,
  },
  separator: { color: colors.muted, fontSize: 12, textAlign: 'center', marginVertical: 18 },
  field: {
    marginBottom: 18,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 56,
    backgroundColor: '#EDF3FB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.muted,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: '#E3EEFF',
  },
  input: {
    backgroundColor: 'transparent',
    color: colors.ink,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 17,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
