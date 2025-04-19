// CatalogScreen.tsx
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Image } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Product } from '../types/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

const mockProducts: Product[] = [
 
    {
      id: '1',
      name: 'Llanta Moto 50cc - 125cc',
      description: 'Granallado + Pintado',
      price: 25000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=motorcycle%20wheel%20125cc%20restoration%20professional%20metallic%20finish&aspect=1:1'
    },
    {
      id: '2',
      name: 'Llanta Moto 125cc - 300cc',
      description: 'Granallado + Pintado',
      price: 40000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=motorcycle%20wheel%20300cc%20black%20metallic%20restored&aspect=1:1'
    },
    {
      id: '3',
      name: 'Llanta Moto 300cc - 600cc',
      description: 'Granallado + Pintado',
      price: 60000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=large%20motorcycle%20wheel%20600cc%20professional%20finish&aspect=1:1'
    },
    {
      id: '4',
      name: 'Llanta Moto 600cc+',
      description: 'Granallado + Pintado',
      price: 80000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=sports%20motorcycle%20wheel%20premium%20finish%20metallic&aspect=1:1'
    },
    {
      id: '5',
      name: 'Llanta Auto Rod. 17',
      description: 'Granallado + Pintado',
      price: 60000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=17%20inch%20car%20wheel%20alloy%20restored%20shine&aspect=1:1'
    },
    {
      id: '6',
      name: 'Cuadro Moto 50cc - 125cc',
      description: 'Granallado + Pintado',
      price: 74000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=motorcycle%20frame%20125cc%20restored%20painted&aspect=1:1'
    },
    {
      id: '7',
      name: 'Puerta de Madera',
      description: 'Granallado',
      price: 45000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=wooden%20door%20sandblasted%20restored%20premium&aspect=1:1'
    },
    {
      id: '8',
      name: 'Celosía de chapa sin reparar',
      description: 'Granallado + Pintado',
      price: 39000,
      timeEstimate: '12 a 16 días hábiles',
      image: 'https://api.a0.dev/assets/image?text=metal%20lattice%20sheet%20sandblasted%20painted&aspect=1:1'
    }
];

export default function CatalogScreen() {
  const navigation = useNavigation<NavigationProp>();

  const viewProductDetails = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const openWhatsApp = () => {
    Linking.openURL('https://wa.me/TUNUMERO?text=Hola,%20no%20encuentro%20mi%20producto');
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      {item.image && <Image source={{ uri: item.image }}style={styles.productImage} />}
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productDescription}>{item.description}</Text>
      <Text style={styles.productPrice}>${item.price.toLocaleString('es-AR')}</Text>
      <Text style={styles.timeEstimate}>Tiempo estimado: {item.timeEstimate}</Text>
      <TouchableOpacity style={styles.addButton} onPress={() => viewProductDetails(item)}>
        <Text style={styles.addButtonText}>Ver Detalles</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo de Servicios</Text>
      <FlatList
        data={mockProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.productList}
      />
      <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
        <Text style={styles.whatsappButtonText}>¿No encuentras tu producto?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  productList: { paddingBottom: 80 },
  productCard: {
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
  productImage: { width: '100%', height: 150, resizeMode: 'contain', marginBottom: 10 },
  productName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  productDescription: { color: '#666', marginBottom: 10 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  timeEstimate: { color: '#666', fontSize: 14, marginBottom: 10 },
  addButton: {
    backgroundColor: '#2c3e50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  whatsappButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  whatsappButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
