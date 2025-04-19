import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RootStackParamList } from '../types/types';
import { NavigationProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import axios from 'axios';

type Props = {
  navigation: NavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: any) {

  const API_URL = 'https://lightpink-guanaco-543467.hostingersite.com/api/v1';
  const [name, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const clearFields = () => {
    setEmail('');
    setPassword('');
    setNombre('');
    setConfirmPassword('');
  };

  const handleRegister = async () => {
    console.log('Botón de registro presionado');
    if (!email || !password || !name || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Por favor complete todos los campos' });
      return;
    }
    console.log('aca paso la validacion de confirm password');
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden' });
      return;
    }

    try {
        await axios.post(`${API_URL}/auth/register`, {
            name,
            email,
            password,
          }, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          
      console.log('aca paso la validacion en el backend');
      Toast.show({ type: 'success', text1: 'Registro exitoso' });
      clearFields();
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
          console.log('Axios error message:', error.message);
          console.log('Axios error response:', error.response);
          console.log('Axios error request:', error.request);
        } else {
          console.log('Error inesperado:', error);
        }
      
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Cuenta</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={name}
          onChangeText={setNombre}
        />

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

        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007aff',
    marginBottom: 40,
    textAlign: 'center',
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
  button: {
    backgroundColor: '#007aff',
    padding: 15,
    borderRadius: 8,
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
    color: '#007aff',
    fontSize: 14,
  },
});