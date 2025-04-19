import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';

import { RootStackParamList } from '../types/types';

type Props = {
  navigation: NavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const API_URL = 'https://lightpink-guanaco-543467.hostingersite.com/api/v1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Estado para el loader

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Por favor complete todos los campos' });
      return;
    }

    setLoading(true); // Mostrar loader

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token } = response.data;

      const { data: userData } = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', access_token);

      Toast.show({ type: 'success', text1: `Bienvenido, ${userData.name} 👋 ` });

      navigation.navigate(userData.rol_id === 1 ? 'AdminDashboard' : 'Catalog');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Error al iniciar sesión';
      Toast.show({
        type: 'error',
        text1: typeof msg === 'string' ? msg : 'Error inesperado',
      });
    } finally {
      setLoading(false); // Ocultar loader
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo1.png')} style={styles.logo} />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    opacity: 1,
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
    color: '#007aff',
    fontSize: 14,
  },
});
