import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'; // Asegúrate de importar useNavigation
import { RootStackParamList } from '../types/types'; // Asegúrate de importar RootStackParamList
import { StackNavigationProp } from '@react-navigation/stack'; // Para tipar la navegación

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>(); // Definir el tipo de navigation

  const { product } = route.params;

  const [isExpress, setIsExpress] = useState(false);
  const [selectedColor, setSelectedColor] = useState('Negro Brillante');

  const colorOptions = [
    'Negro Brillante', 'Blanco Mate', 'Rojo Ferrari', 'Azul Eléctrico', 'Gris Plomo',
    'Dorado', 'Naranja', 'Verde Lima', 'Rosa Pastel', 'Cromado', 'Gris Grafito',
    'Amarillo Fluor', 'Azul Marino', 'Violeta', 'Turquesa', 'Verde Militar',
    'Beige Arena', 'Borgoña', 'Cobre', 'Celeste', 'Rosa Fucsia', 'Marrón Óxido',
    'Azul Cielo', 'Rojo Oscuro', 'Gris Cemento', 'Champagne', 'Verde Oscuro',
    'Blanco Perlado', 'Negro Satinado', 'Azul Pastel', 'Naranja Fluor', 'Violeta Pastel',
    'Dorado Oscuro', 'Rojo Cereza', 'Azul Petróleo', 'Verde Esmeralda', 'Terracota',
    'Verde Menta', 'Gris Acero', 'Lila', 'Negro Mate', 'Transparente'
  ];

  const toggleExpress = () => {
    setIsExpress(!isExpress);
  };

  const finalPrice = isExpress ? product.price * 1.3 : product.price;

  const handleAddToCart = () => {
    const cartItem = {
      id: product.id,
      name: product.name,
      image: product.image,
      selectedColor,
      isExpress,
      selectedService: {
        name: isExpress ? 'Servicio Express (30% extra)' : 'Servicio Estándar',
        price: finalPrice,
      }
    };
  /*
    Alert.alert(
      'Agregado al carrito',
      `Producto: ${product.name}\nColor: ${selectedColor}\nPrecio: $${finalPrice.toLocaleString('es-AR')}`
    );
  */
    navigation.navigate('Cart', { cartItems: [cartItem] });
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {product.image && <Image source={{ uri: product.image }} style={styles.image} />}
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={styles.price}>${product.price.toLocaleString('es-AR')}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Tiempo estimado:</Text>
        <Text>{product.timeEstimate} (opción Express disponible)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>¿Servicio Express?</Text>
        <TouchableOpacity style={[styles.expressButton, isExpress && styles.expressActive]} onPress={toggleExpress}>
          <Text style={styles.expressText}>{isExpress ? 'Sí (30% extra)' : 'No'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Color seleccionado:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
          {colorOptions.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorOption, selectedColor === color && styles.selectedColor]}
              onPress={() => setSelectedColor(color)}
            >
              <Text style={styles.colorText}>{color}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Método de entrega:</Text>
        <Text>Correo Argentino</Text>
      </View>

      <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
        <Text style={styles.cartButtonText}>Añadir al carrito</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff' },
  image: { width: '100%', height: 200, resizeMode: 'contain', marginBottom: 20 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  description: { fontSize: 16, color: '#555', marginBottom: 5 },
  price: { fontSize: 20, fontWeight: 'bold', color: '#27ae60', marginBottom: 15 },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 5 },
  expressButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#bdc3c7',
    alignItems: 'center',
    width: 150,
  },
  expressActive: { backgroundColor: '#f39c12' },
  expressText: { color: '#fff', fontWeight: 'bold' },
  colorScroll: { flexDirection: 'row' },
  colorOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedColor: {
    backgroundColor: '#3498db',
  },
  colorText: { color: '#2c3e50', fontSize: 14 },
  cartButton: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cartButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
