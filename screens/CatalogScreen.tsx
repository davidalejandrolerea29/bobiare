import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from '../utils/notify';
import { Product, RootStackParamList } from '../types/types';
import { AppBackground } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors, formatPrice, shadow } from '../theme';
import { getCart, getErrorMessage, getProducts, isAuthenticated } from '../utils/api';

type Navigation = StackNavigationProp<RootStackParamList, 'Catalog'>;

export default function CatalogScreen() {
  const navigation = useNavigation<Navigation>();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cartCount, setCartCount] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [catalog, cart, loggedIn] = await Promise.all([getProducts(), getCart(), isAuthenticated()]);
      setProducts(catalog);
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
      setAuthenticated(loggedIn);
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No pudimos cargar el catálogo') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))],
    [products],
  );
  const filtered = useMemo(
    () => products.filter(p =>
      (category === 'Todos' || p.category === category) &&
      `${p.name} ${p.description}`.toLowerCase().includes(query.trim().toLowerCase())),
    [products, category, query],
  );

  return <AppBackground>
    <View style={styles.header}>
      <View style={styles.brandCrop}><Image source={require('../assets/logo1.png')} style={styles.brandLogo}/></View>
      <TouchableOpacity style={styles.cart} onPress={() => navigation.navigate('Cart')}><Icon name="cart-outline" size={23} color={colors.ink}/>{cartCount > 0 && <View style={styles.cartDot}><Text style={styles.cartCount}>{cartCount}</Text></View>}</TouchableOpacity>
    </View>
    <View style={styles.intro}><Text style={styles.eyebrow}>CATÁLOGO DE SERVICIOS</Text><Text style={styles.title}>Renová tus piezas</Text><Text style={styles.subtitle}>Elegí el servicio ideal, contanos qué necesitás y prepará tu pedido en pocos pasos.</Text></View>
    <View style={styles.search}><Icon name="magnify" size={22} color={colors.muted}/><TextInput style={styles.searchInput} placeholder="Buscar piezas o servicios" placeholderTextColor="#8C999E" value={query} onChangeText={setQuery}/></View>
    {authenticated === false && <View style={styles.authBox}>
      <View style={styles.authTop}><View style={styles.authIcon}><Icon name="account-outline" size={20} color={colors.primary}/></View><View style={styles.authCopy}><Text style={styles.authTitle}>Tu cuenta Bobiare</Text><Text style={styles.authNote}>Ingresá para seguir pedidos o registrate gratis.</Text></View></View>
      <View style={styles.authActions}><TouchableOpacity style={styles.loginAction} onPress={() => navigation.navigate('Login')}><Text style={styles.loginActionText}>Iniciar sesión</Text></TouchableOpacity><TouchableOpacity style={styles.registerAction} onPress={() => navigation.navigate('Register')}><Text style={styles.registerActionText}>Crear cuenta</Text><Icon name="arrow-right" size={15} color="#fff"/></TouchableOpacity></View>
    </View>}
    {categories.length > 1 && <View style={styles.categoryBar}>
      <FlatList horizontal data={categories} keyExtractor={x => x} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} renderItem={({ item }) => <TouchableOpacity onPress={() => setCategory(item)} style={[styles.category, category === item && styles.categoryActive]}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></TouchableOpacity>}/>
    </View>}
    {loading ? <ActivityIndicator style={styles.loader} size="large" color={colors.primary}/> :
      <FlatList data={filtered} numColumns={2} keyExtractor={p => String(p.id)} columnWrapperStyle={styles.row} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>} ListEmptyComponent={<View style={styles.emptyCard}><View style={styles.emptyIcon}><Icon name={query ? 'magnify-close' : 'package-variant-closed'} size={31} color={colors.primary}/></View><Text style={styles.emptyTitle}>{query ? 'No encontramos coincidencias' : 'Próximamente más servicios'}</Text><Text style={styles.empty}>{query ? 'Probá con otra palabra o limpiá la búsqueda.' : 'Estamos preparando el catálogo. Deslizá hacia abajo para actualizar.'}</Text>{!!query && <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}><Text style={styles.clearButtonText}>Limpiar búsqueda</Text></TouchableOpacity>}</View>} renderItem={({ item }) => <TouchableOpacity activeOpacity={.84} style={styles.card} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
        {item.image ? <Image source={{ uri: item.image }} style={styles.image}/> : <View style={[styles.image, styles.placeholder]}><Icon name="image-outline" size={35} color={colors.muted}/></View>}
        <View style={styles.cardBody}>{item.category && <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{item.category}</Text></View>}<Text style={styles.name} numberOfLines={2}>{item.name}</Text><Text style={styles.description} numberOfLines={2}>{item.description}</Text><View style={styles.cardBottom}><View><Text style={styles.from}>{item.offerPrice ? 'OFERTA' : 'DESDE'}</Text><Text style={styles.price}>{formatPrice(item.offerPrice ?? item.price)}</Text></View><View style={styles.arrow}><Icon name="arrow-right" size={18} color="#fff"/></View></View><Text style={styles.time}><Icon name="clock-outline" size={11} color={colors.muted}/> {item.timeEstimate}</Text></View>
      </TouchableOpacity>}/>}
    <BottomNav active="Catalog" />
  </AppBackground>;
}

const styles = StyleSheet.create({
  header: { height: 68, paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandCrop: { width: 172, height: 48, overflow: 'hidden' }, brandLogo: { position: 'absolute', width: 172, height: 194, top: -58, left: 0, resizeMode: 'contain' }, intro: { paddingHorizontal: 20, paddingTop: 9 }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 }, title: { fontSize: 31, color: colors.ink, fontWeight: '900', letterSpacing: -1, marginTop: 4 }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, maxWidth: 360 },
  cart: { width: 47, height: 47, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.7)', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, cartDot: { position: 'absolute', minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, right: -2, top: -3, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, cartCount: { color: '#fff', fontSize: 9, fontWeight: '900' },
  search: { marginHorizontal: 20, marginTop: 16, height: 54, borderRadius: 18, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,.82)', borderWidth: 1, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', ...shadow }, searchInput: { flex: 1, marginHorizontal: 10, color: colors.ink },
  authBox: { marginHorizontal: 20, marginTop: 12, padding: 13, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.70)', borderWidth: 1, borderColor: '#fff' }, authTop: { flexDirection: 'row', alignItems: 'center' }, authIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(18,103,233,.10)', alignItems: 'center', justifyContent: 'center' }, authCopy: { flex: 1, marginLeft: 10 }, authTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, authNote: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, authActions: { flexDirection: 'row', gap: 9, marginTop: 11 }, loginAction: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(255,255,255,.55)' }, loginActionText: { color: colors.primary, fontSize: 11, fontWeight: '900' }, registerAction: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: colors.primary }, registerActionText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  categoryBar: { height: 62, flexGrow: 0, flexShrink: 0 }, categories: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignItems: 'center' }, category: { height: 38, borderRadius: 13, paddingHorizontal: 15, backgroundColor: 'rgba(255,255,255,.56)', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary }, categoryText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, categoryTextActive: { color: '#fff' },
  loader: { flex: 1 }, list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110, flexGrow: 1 }, row: { gap: 12 }, card: { flex: 1, marginBottom: 13, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.76)', overflow: 'hidden', borderWidth: 1, borderColor: '#fff', ...shadow }, image: { width: '100%', height: 127, backgroundColor: '#E5F1FF' }, placeholder: { alignItems: 'center', justifyContent: 'center' }, cardBody: { padding: 12 }, categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(147,197,253,.30)' }, categoryPillText: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: .5 }, name: { fontSize: 14, color: colors.ink, fontWeight: '900', marginTop: 7, minHeight: 34 }, description: { color: colors.muted, fontSize: 10, marginTop: 2, minHeight: 24 }, cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }, from: { color: colors.muted, fontSize: 8, fontWeight: '800' }, price: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 1 }, arrow: { width: 31, height: 31, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, time: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 10, paddingTop: 8, color: colors.muted, fontSize: 9 },
  emptyCard: { marginTop: 18, padding: 24, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.55)', borderWidth: 1, borderColor: '#fff', alignItems: 'center' }, emptyIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: 'rgba(18,103,233,.10)', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 13 }, empty: { textAlign: 'center', color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, maxWidth: 260 }, clearButton: { marginTop: 14, paddingHorizontal: 16, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, clearButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
