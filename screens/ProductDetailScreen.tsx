import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from '../utils/notify';
import { DeliveryTime, RootStackParamList } from '../types/types';
import { AppBackground, GlassCard, PrimaryButton } from '../components/GlassUI';
import { colors, formatPrice } from '../theme';
import { addCartItem, getCatalogData, getErrorMessage, getProduct } from '../utils/api';

type DetailRoute = RouteProp<RootStackParamList, 'ProductDetail'>;
type Navigation = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const initial = useRoute<DetailRoute>().params.product;
  const navigation = useNavigation<Navigation>();
  const scrollRef = useRef<ScrollView>(null);
  const [product, setProduct] = useState(initial);
  const [deliveryTimes, setDeliveryTimes] = useState<DeliveryTime[]>(initial.deliveryTimes);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(initial.deliveryTimes[0]?.id ?? null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getProduct(initial.id), getCatalogData()])
      .then(([detail, data]) => {
        setProduct(detail);
        const options = detail.deliveryTimes.length ? detail.deliveryTimes : data.deliveryTimes;
        setDeliveryTimes(options);
        setSelectedDeliveryId(current => current ?? options[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, [initial.id]);

  const selectedDelivery = deliveryTimes.find(time => time.id === selectedDeliveryId);
  const basePrice = product.offerPrice ?? product.price;
  const finalPrice = useMemo(() => basePrice + (selectedDelivery?.extra_cost || 0), [basePrice, selectedDelivery]);

  const add = async () => {
    if (!selectedDeliveryId) {
      Toast.show({ type: 'error', text1: 'Elegí un plazo de entrega' });
      return;
    }
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Describí la pieza que vas a enviar' });
      return;
    }
    setLoading(true);
    try {
      await addCartItem({
        product_id: product.id,
        delivery_time_id: selectedDeliveryId,
        piece_description: description.trim(),
        quantity: 1,
      });
      Toast.show({ type: 'success', text1: 'Producto agregado al carrito' });
      navigation.navigate('Cart');
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No se pudo agregar al carrito') });
    } finally {
      setLoading(false);
    }
  };
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Catalog');

  return <AppBackground>
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.top}><TouchableOpacity style={styles.circle} onPress={goBack}><Icon name="arrow-left" size={22} color={colors.ink}/></TouchableOpacity><Text style={styles.topTitle}>Detalle del servicio</Text><TouchableOpacity style={styles.circle} onPress={() => navigation.navigate('Cart')}><Icon name="cart-outline" size={22} color={colors.ink}/></TouchableOpacity></View>
      <View style={styles.imageWrap}>{product.image ? <Image source={{ uri: product.image }} style={styles.image}/> : <View style={[styles.image, styles.placeholder]}><Icon name="image-outline" size={48} color={colors.muted}/></View>}{product.category && <View style={styles.tag}><Text style={styles.tagText}>{product.category}</Text></View>}</View>
      <Text style={styles.name}>{product.name}</Text><Text style={styles.description}>{product.description}</Text>
      <View style={styles.priceRow}><View><Text style={styles.from}>{product.offerPrice ? 'PRECIO DE OFERTA' : 'PRECIO DESDE'}</Text><Text style={styles.price}>{formatPrice(finalPrice)}</Text></View>{selectedDelivery && <View style={styles.time}><Icon name="clock-outline" size={19} color={colors.primary}/><View><Text style={styles.timeLabel}>TIEMPO ESTIMADO</Text><Text style={styles.timeValue}>{selectedDelivery.business_days} días hábiles</Text></View></View>}</View>
      <GlassCard style={styles.section}><Text style={styles.sectionTitle}>Plazo del servicio</Text><View style={styles.options}>{deliveryTimes.map(option => <TouchableOpacity key={option.id} onPress={() => setSelectedDeliveryId(option.id)} style={[styles.option, selectedDeliveryId === option.id && styles.optionActive]}><View style={[styles.radio, selectedDeliveryId === option.id && styles.radioActive]}>{selectedDeliveryId === option.id && <View style={styles.radioInner}/>}</View><View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.description}</Text><Text style={styles.optionNote}>{option.business_days} días hábiles</Text></View><Text style={styles.extra}>{option.extra_cost ? `+ ${formatPrice(option.extra_cost)}` : 'Sin adicional'}</Text></TouchableOpacity>)}</View>{!deliveryTimes.length && <Text style={styles.muted}>No hay plazos disponibles para este servicio.</Text>}</GlassCard>
      <Text style={styles.sectionTitleOutside}>Contanos sobre tu pieza</Text>
      <TextInput style={styles.textarea} multiline numberOfLines={4} textAlignVertical="top" placeholder="Ej.: tanque de Honda XR250, óxido leve y una abolladura..." placeholderTextColor="#8C999E" value={description} onChangeText={setDescription} onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}/>
      <GlassCard style={styles.notice}><Icon name="information-outline" size={22} color={colors.primary}/><Text style={styles.noticeText}>El precio final lo calcula el servidor usando el precio vigente y el adicional del plazo elegido.</Text></GlassCard>
      {loading ? <ActivityIndicator size="large" color={colors.primary}/> : <PrimaryButton title="Agregar al carrito" icon="cart-plus" onPress={add}/>}
    </ScrollView>
    </KeyboardAvoidingView>
  </AppBackground>;
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  content: { padding: 20, paddingTop: 24, paddingBottom: 35 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, circle: { width: 45, height: 45, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, topTitle: { color: colors.ink, fontWeight: '900' },
  imageWrap: { height: 290, borderRadius: 28, backgroundColor: '#DEE9E5', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, placeholder: { alignItems: 'center', justifyContent: 'center' }, tag: { position: 'absolute', left: 14, top: 14, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,.86)' }, tagText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  name: { fontSize: 27, color: colors.ink, fontWeight: '900', letterSpacing: -.8, marginTop: 19 }, description: { color: colors.muted, marginTop: 4, lineHeight: 20 }, priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 }, from: { color: colors.muted, fontSize: 9, letterSpacing: .8, fontWeight: '900' }, price: { fontSize: 23, color: colors.primary, fontWeight: '900', marginTop: 2 }, time: { flexDirection: 'row', gap: 8, alignItems: 'center' }, timeLabel: { color: colors.muted, fontSize: 8, fontWeight: '900' }, timeValue: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 2 },
  section: { padding: 17 }, sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginBottom: 13 }, options: { gap: 9 }, option: { minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 }, optionActive: { borderColor: colors.primary, backgroundColor: 'rgba(147,197,253,.20)' }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#A4AFB2', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, radioActive: { borderColor: colors.primary }, radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, optionCopy: { flex: 1 }, optionTitle: { color: colors.ink, fontWeight: '800' }, optionNote: { color: colors.muted, fontSize: 11, marginTop: 2 }, extra: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  sectionTitleOutside: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 21, marginBottom: 12 }, textarea: { minHeight: 110, padding: 15, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.76)', borderWidth: 1, borderColor: '#fff', color: colors.ink },
  notice: { flexDirection: 'row', gap: 10, padding: 14, marginVertical: 20, borderRadius: 17 }, noticeText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 }, muted: { color: colors.muted },
});
