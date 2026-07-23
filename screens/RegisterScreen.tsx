import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from '../utils/notify';
import { AppBackground } from '../components/GlassUI';
import { colors, shadow } from '../theme';
import { getErrorMessage, register } from '../utils/api';
import { FadeInView, SoftAppear } from '../components/MotionUI';

export default function RegisterScreen({ navigation }: any) {

  const [name, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const clearFields = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setConfirmPassword('');
  };

  const handleRegister = async () => {
    if (!email || !password || !name || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Por favor complete todos los campos' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden' });
      return;
    }

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
      navigation.navigate('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'No se pudo crear la cuenta',
        text2: getErrorMessage(error, 'El servidor no devolvió detalles.'),
        visibilityTime: 5000,
      });
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
            <TextInput
              style={styles.input}
              placeholder="Nombre completo"
              value={name}
              onChangeText={setNombre}
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>¿Ya tenés cuenta? Iniciá sesión</Text>
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
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
    gap: 16,
    marginTop: 22, padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: '#fff', ...shadow,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,.78)',
    padding: 15,
    borderRadius: 16, borderWidth: 1, borderColor: '#fff',
    fontSize: 16,
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
    padding: 10,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
