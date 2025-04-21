import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/types';

type ThankYouRouteProp = RouteProp<RootStackParamList, 'ThankYou'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'Catalog'>;

export default function ThankYouScreen() {
  const route = useRoute<ThankYouRouteProp>();
  const { orderDetails } = route.params;
  const navigation = useNavigation<NavigationProp>();

  const returnToCatalog = () => {
    navigation.navigate('Catalog');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>¡Gracias por tu compra!</Text>
        <Text style={styles.message}>
          Tu pedido ha sido procesado con éxito. Recibirás un correo electrónico con los detalles de tu compra.
        </Text>

        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Resumen del Pedido</Text>
          <Text style={styles.orderNumber}>Orden #{Math.random().toString(36).substr(2, 9)}</Text>
          <Text style={styles.email}>Email: {orderDetails.email}</Text>
          <Text style={styles.total}>Total: ${orderDetails.total.toFixed(2)}</Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Próximos Pasos:</Text>
          <Text style={styles.instruction}>1. Empaqueta tu producto de forma segura</Text>
          <Text style={styles.instruction}>2. Llévalo a nuestra dirección</Text>
          <Text style={styles.instruction}>3. Te notificaremos cuando lo recibamos</Text>
          <Text style={styles.instruction}>4. Te mantendremos informado del progreso</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={returnToCatalog}>
          <Text style={styles.buttonText}>Volver al Catálogo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  orderSummary: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  orderNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2c3e50',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
