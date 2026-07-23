import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Toast from '../utils/notify';
import { Cart, RootStackParamList } from '../types/types';
import { AppBackground } from '../components/GlassUI';
import { colors, formatPrice, shadow } from '../theme';
import { getCart, getErrorMessage, removeCartItem } from '../utils/api';
import { FadeInView, ListSkeleton } from '../components/MotionUI';

type Navigation = StackNavigationProp<RootStackParamList, 'Cart'>;

export default function CartScreen() {
  const navigation = useNavigation<Navigation>();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setCart(await getCart());
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo cargar el carrito') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (id: number) => {
    setRemoving(id);
    try {
      await removeCartItem(id);
      await load();
      Toast.show({ type: 'success', text1: 'Producto eliminado' });
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo eliminar el producto') });
    } finally {
      setRemoving(null);
    }
  };
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Catalog');

  return <AppBackground><View style={styles.container}>
    <View style={styles.header}><TouchableOpacity style={styles.back} onPress={goBack}><Icon name="arrow-left" size={21} color={colors.ink}/></TouchableOpacity><Text style={styles.title}>Tu carrito</Text><View style={styles.back}/></View>
    {loading ? <ListSkeleton rows={3}/> :
      <ScrollView style={styles.itemsContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>}>
        {!cart?.items.length ? <View style={styles.emptyWrap}><Icon name="cart-outline" size={55} color={colors.muted}/><Text style={styles.emptyCart}>Tu carrito está vacío</Text><TouchableOpacity onPress={() => navigation.navigate('Catalog')}><Text style={styles.catalogLink}>Explorar el catálogo</Text></TouchableOpacity></View> :
          cart.items.map((item, index) => <FadeInView key={item.id} index={index}><View style={styles.cartItem}>
            <View style={styles.itemIcon}><Icon name="package-variant" size={25} color={colors.primary}/></View>
            <View style={styles.itemInfo}><Text style={styles.itemName}>{item.product_name_snapshot}</Text><Text style={styles.serviceName}>{item.delivery_time_snapshot?.description || 'Plazo elegido'} · Cant. {item.quantity}</Text>{item.piece_description && <Text style={styles.piece} numberOfLines={2}>{item.piece_description}</Text>}<Text style={styles.itemPrice}>{formatPrice(item.subtotal)}</Text></View>
            <TouchableOpacity style={styles.removeButton} onPress={() => remove(item.id)} disabled={removing === item.id}>{removing === item.id ? <ActivityIndicator size="small" color={colors.danger}/> : <Icon name="trash-can-outline" size={19} color={colors.danger}/>}</TouchableOpacity>
          </View></FadeInView>)}
      </ScrollView>}
    <View style={styles.totalContainer}><View><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalText}>{formatPrice(cart?.total || 0)}</Text></View><TouchableOpacity style={[styles.checkoutButton, !cart?.items.length && styles.disabledButton]} onPress={() => navigation.navigate('Checkout')} disabled={!cart?.items.length}><Text style={styles.checkoutButtonText}>Continuar</Text><Icon name="arrow-right" size={20} color="#fff"/></TouchableOpacity></View>
  </View></AppBackground>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, back: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 23, fontWeight: '900', color: colors.ink },
  loader: { flex: 1 }, itemsContainer: { flex: 1 }, emptyWrap: { alignItems: 'center', marginTop: 65 }, emptyCart: { textAlign: 'center', fontSize: 16, color: colors.muted, marginTop: 14 }, catalogLink: { color: colors.primary, fontWeight: '800', marginTop: 10 },
  cartItem: { backgroundColor: 'rgba(255,255,255,.76)', padding: 15, borderRadius: 22, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fff', ...shadow }, itemIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(147,197,253,.28)', alignItems: 'center', justifyContent: 'center' }, itemInfo: { flex: 1, marginLeft: 12 }, itemName: { fontSize: 16, fontWeight: '900', color: colors.ink, marginBottom: 5 }, serviceName: { color: colors.muted, fontSize: 12 }, piece: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 4 }, itemPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 8 }, removeButton: { backgroundColor: 'rgba(184,74,74,.1)', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  totalContainer: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 20, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, totalLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: .8 }, totalText: { fontSize: 20, fontWeight: 'bold', color: colors.ink }, checkoutButton: { backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 22, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center' }, checkoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }, disabledButton: { backgroundColor: '#95a5a6' },
});
