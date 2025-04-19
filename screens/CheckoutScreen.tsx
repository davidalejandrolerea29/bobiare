import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types/types';

export default function CheckoutScreen() {
  const navigation = useNavigation<NavigationProp>();
 
  type CheckoutScreenRouteProp = RouteProp<RootStackParamList, 'Checkout'>;
  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
  
const route = useRoute<CheckoutScreenRouteProp>();
  const { cartItems, total } = route.params;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    deliveryOption: 'standard', // 'standard' o 'express'
  });

  const deliveryOptions = [
    { id: 'standard', name: 'Entrega Estándar', price: 0, time: '3-5 días' },
    { id: 'express', name: 'Entrega Express', price: 10, time: '1-2 días' },
  ];

  const handlePayment = () => {
    // Aquí iría la integración con el sistema de pagos
    // Por ahora simulamos un pago exitoso
   
    Toast.show({
      type: 'success',
      text1: 'Pago procesado con éxito',
    });
    navigation.navigate('ThankYou', { 
      orderDetails: {
        ...formData,
        items: cartItems,
        total: total + (formData.deliveryOption === 'express' ? 10 : 0)
      }
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={formData.fullName}
          onChangeText={(text) => setFormData({...formData, fullName: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({...formData, email: text})}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          value={formData.phone}
          onChangeText={(text) => setFormData({...formData, phone: text})}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dirección de Envío</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección"
          value={formData.address}
          onChangeText={(text) => setFormData({...formData, address: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Ciudad"
          value={formData.city}
          onChangeText={(text) => setFormData({...formData, city: text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Código Postal"
          value={formData.postalCode}
          onChangeText={(text) => setFormData({...formData, postalCode: text})}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Opciones de Envío</Text>
        {deliveryOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.deliveryOption,
              formData.deliveryOption === option.id && styles.selectedDeliveryOption
            ]}
            onPress={() => setFormData({...formData, deliveryOption: option.id})}
          >
            <Text style={styles.deliveryOptionName}>{option.name}</Text>
            <Text style={styles.deliveryOptionTime}>{option.time}</Text>
            <Text style={styles.deliveryOptionPrice}>
              {option.price === 0 ? 'Gratis' : `$${option.price}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          Total: ${(total + (formData.deliveryOption === 'express' ? 10 : 0)).toFixed(2)}
        </Text>
      </View>

      <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
        <Text style={styles.paymentButtonText}>Realizar Pago</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deliveryOption: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDeliveryOption: {
    borderColor: '#2c3e50',
    borderWidth: 2,
  },
  deliveryOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deliveryOptionTime: {
    color: '#666',
    marginBottom: 5,
  },
  deliveryOptionPrice: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paymentButton: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});