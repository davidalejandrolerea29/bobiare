import React from 'react';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import ClientHomeScreen from '../screens/ClientHomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import IdentifyScreen from '../screens/IdentifyScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { ClientTabsParamList } from '../types/types';
import { colors } from '../theme';

const Tab = createNativeBottomTabNavigator<ClientTabsParamList>();

// The screens also work in the root stack on Android, so their public prop
// types are intentionally broader than this native tab navigator's props.
const HomeTab = ClientHomeScreen as React.ComponentType<any>;
const CatalogTab = CatalogScreen as React.ComponentType<any>;
const IdentifyTab = IdentifyScreen as React.ComponentType<any>;
const OrdersTab = OrdersScreen as React.ComponentType<any>;
const ProfileTab = ProfileScreen as React.ComponentType<any>;

export default function NativeMainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="ClientHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarBlurEffect: 'systemDefault',
        tabBarControllerMode: 'tabBar',
        tabBarMinimizeBehavior: 'onScrollDown',
      }}>
      <Tab.Screen
        name="ClientHome"
        component={HomeTab}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'house.fill' : 'house',
          }),
        }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogTab}
        options={{
          tabBarLabel: 'Catálogo',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2',
          }),
        }}
      />
      <Tab.Screen
        name="Identify"
        component={IdentifyTab}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'camera.fill' : 'camera',
          }),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersTab}
        options={{
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'shippingbox.fill' : 'shippingbox',
          }),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'person.crop.circle.fill' : 'person.crop.circle',
          }),
        }}
      />
    </Tab.Navigator>
  );
}
