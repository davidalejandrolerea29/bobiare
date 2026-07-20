import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import './global.css';

import HomeScreen from './screens/HomeScreen';
import CatalogScreen from './screens/CatalogScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import ThankYouScreen from './screens/ThankYouScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ClientHomeScreen from './screens/ClientHomeScreen';
import IdentifyScreen from './screens/IdentifyScreen';
import OrdersScreen from './screens/OrdersScreen';
import ProfileScreen from './screens/ProfileScreen';
import { colors } from './theme';
import { withAuthentication } from './components/ProtectedScreen';
import { NotificationHost } from './utils/notify';

const Stack = createNativeStackNavigator();
const AuthenticatedHome = withAuthentication(ClientHomeScreen);
const AuthenticatedIdentify = withAuthentication(IdentifyScreen);
const AuthenticatedOrders = withAuthentication(OrdersScreen);
const AuthenticatedProfile = withAuthentication(ProfileScreen);
const AuthenticatedAdmin = withAuthentication(AdminDashboardScreen, 'Login');

function RootStack() {
  return (
    <Stack.Navigator initialRouteName="Catalog" screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="Catalog" component={CatalogScreen} />
      <Stack.Screen name="Login" component={HomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ClientHome" component={AuthenticatedHome} />
      <Stack.Screen name="Identify" component={AuthenticatedIdentify} />
      <Stack.Screen name="Orders" component={AuthenticatedOrders} />
      <Stack.Screen name="Profile" component={AuthenticatedProfile} />
      <Stack.Screen name="AdminDashboard" component={AuthenticatedAdmin} />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="ThankYou" component={ThankYouScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  if (fontError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingError}>No se pudieron cargar los iconos.</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
        <NotificationHost />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingError: {
    color: colors.danger,
    fontWeight: '700',
  },
});
