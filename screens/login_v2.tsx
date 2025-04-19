import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../types/types';
import axios from 'axios';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const API_URL = 'http://127.0.0.1:8000/api/v1';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const clearFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Por favor complete todos los campos' });
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token } = response.data;

      const meResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const userData = meResponse.data;

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', access_token);

      Toast.show({ type: 'success', text1: `Bienvenido, ${userData.name} 👋` });

      navigation.navigate(userData.rol_id === 1 ? 'AdminDashboard' : 'Catalog');
    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      const msg = error.response?.data?.error || 'Error al iniciar sesión';
      Toast.show({
        type: 'error',
        text1: typeof msg === 'string' ? msg : 'Error inesperado',
      });
    }
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
      await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      });

      Toast.show({ type: 'success', text1: 'Registro exitoso' });
      setIsLogin(true);
      clearFields();
    } catch (error: any) {
      console.log('Register error:', error.response?.data || error.message);
      const msg = error.response?.data?.error || 'Error al registrarse';
      Toast.show({
        type: 'error',
        text1:
          typeof msg === 'string'
            ? msg
            : Object.values(msg as { [key: string]: string[] })[0][0],
      });
    }
  };

  const handleSubmit = () => {
    isLogin ? handleLogin() : handleRegister();
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.logo}>Bobiare</Text>

        <View style={styles.inputContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Registrarse</Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={24} color="#555" />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <MaterialIcons name="email" size={24} color="#555" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <MaterialIcons name="lock" size={24} color="#555" />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color="#555"
              />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.inputWrapper}>
              <MaterialIcons name="lock" size={24} color="#555" />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <Pressable style={styles.loginButton} onPress={handleSubmit}>
            <Text style={styles.loginButtonText}>
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#2c3e50',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2c3e50',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  activeTab: {
    backgroundColor: '#2c3e50',
  },
  tabText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: 'white',
  },
});
