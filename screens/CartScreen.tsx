import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { RootStackParamList } from '../types/types';
import { CartItem } from '../types/types';
import { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

// Tipos de navegación y ruta
type CartScreenRouteProp = RouteProp<RootStackParamList, 'Cart'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Cart'>;

export default function CartScreen() {
  const route = useRoute<CartScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  const { cartItems: initialCartItems } = route.params;

  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => {
      return item.selectedService ? sum + item.selectedService.price : sum;
    }, 0);
    setTotal(newTotal);
  }, [cartItems]);

  const removeFromCart = (index: number) => {
    const newCart = cartItems.filter((_, i) => i !== index);
    setCartItems(newCart);
  };

  const proceedToCheckout = () => {
    navigation.navigate('Checkout', { cartItems, total });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carrito de Compras</Text>

      <ScrollView style={styles.itemsContainer}>
        {cartItems.length === 0 ? (
          <Text style={styles.emptyCart}>Tu carrito está vacío</Text>
        ) : (
          cartItems.map((item, index) => (
            <View key={index} style={styles.cartItem}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.selectedService ? (
                <>
                  <Text style={styles.serviceName}>{item.selectedService.name}</Text>
                  <Text style={styles.itemPrice}>${item.selectedService.price.toFixed(2)}</Text>
                </>
              ) : (
                <Text style={styles.serviceName}>Servicio no disponible</Text>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(index)}
              >
                <Text style={styles.removeButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
        <TouchableOpacity
          style={[styles.checkoutButton, cartItems.length === 0 && styles.disabledButton]}
          onPress={proceedToCheckout}
          disabled={cartItems.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Proceder al Pago</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  itemsContainer: {
    flex: 1,
  },
  emptyCart: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  cartItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  serviceName: {
    color: '#666',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 20,
    marginTop: 20,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  checkoutButton: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
});
