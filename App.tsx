import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
import PaymentConfirmationScreen from './screens/PaymentConfirmationScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ClientHomeScreen from './screens/ClientHomeScreen';
import IdentifyScreen from './screens/IdentifyScreen';
import OrdersScreen from './screens/OrdersScreen';
import ProfileScreen from './screens/ProfileScreen';
import { colors } from './theme';
import { withAuthentication } from './components/ProtectedScreen';
import { NotificationHost } from './utils/notify';
import { AppLoading } from './components/MotionUI';
import NativeMainTabs from './components/NativeMainTabs';
import LaunchScreen from './screens/LaunchScreen';

const Stack = createNativeStackNavigator();
const AuthenticatedHome = withAuthentication(ClientHomeScreen);
const AuthenticatedIdentify = withAuthentication(IdentifyScreen);
const AuthenticatedOrders = withAuthentication(OrdersScreen);
const AuthenticatedProfile = withAuthentication(ProfileScreen);
const AuthenticatedAdmin = withAuthentication(AdminDashboardScreen, 'Login');
const AuthenticatedNativeTabs = withAuthentication(NativeMainTabs);

function RootStack() {
  return (
    <Stack.Navigator initialRouteName="Launch" screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="Launch" component={LaunchScreen} />
      <Stack.Screen name="Catalog" component={CatalogScreen} />
      <Stack.Screen name="Login" component={HomeScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      {Platform.OS === 'ios' ? (
        <Stack.Screen name="MainTabs" component={AuthenticatedNativeTabs} />
      ) : null}
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
      <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
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
    return <AppLoading />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <NavigationContainer linking={{
          prefixes: ['bobiare://', 'https://bobiare.n7softwares.com'],
          config: { screens: { PaymentConfirmation: 'confirmacion/:orderId' } },
        }}>
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
