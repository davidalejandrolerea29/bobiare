import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Toast from '../utils/notify';
import { AppBackground, GlassCard, PrimaryButton } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { FadeInView, SoftAppear } from '../components/MotionUI';
import { colors } from '../theme';
import { PhotoAnalysis, RootStackParamList } from '../types/types';
import { analyzePiecePhoto, getErrorMessage, getProduct, getStatusCode } from '../utils/api';

type PhotoSource = 'camera' | 'library';

export default function IdentifyScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [openingService, setOpeningService] = useState(false);

  const selectPhoto = async (source: PhotoSource) => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: 'error',
        text1: source === 'camera' ? 'Necesitamos permiso para usar la cámara' : 'Necesitamos permiso para acceder a tus fotos',
        text2: 'Podés habilitarlo desde la configuración del teléfono.',
      });
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: .78,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      setAnalysis(null);
    }
  };

  const choosePhoto = () => {
    Alert.alert('Agregar fotografía', 'Elegí cómo querés cargar la imagen', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: () => void selectPhoto('library') },
      { text: 'Cámara', onPress: () => void selectPhoto('camera') },
    ]);
  };

  const analyze = async () => {
    if (!photo || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      setAnalysis(await analyzePiecePhoto(photo));
    } catch (error) {
      const unavailable = [404, 405, 501].includes(getStatusCode(error) || 0);
      Toast.show({
        type: 'error',
        text1: unavailable ? 'El análisis con IA todavía no está habilitado en el servidor' : 'No pudimos analizar la fotografía',
        text2: unavailable
          ? 'La cámara ya funciona; falta publicar el endpoint de IA del backend.'
          : getErrorMessage(error, 'Probá nuevamente con otra fotografía.'),
        visibilityTime: 5000,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const openSuggestedService = async () => {
    if (!analysis?.suggestedProductId) {
      navigation.navigate('Catalog');
      return;
    }
    setOpeningService(true);
    try {
      const product = analysis.suggestedProduct?.name
        ? analysis.suggestedProduct
        : await getProduct(analysis.suggestedProductId);
      navigation.navigate('ProductDetail', { product });
    } catch (error) {
      Toast.show({ type: 'error', text1: getErrorMessage(error, 'No pudimos abrir el servicio sugerido') });
    } finally {
      setOpeningService(false);
    }
  };

  const photoSize = photo?.fileSize
    ? `${(photo.fileSize / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : null;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SoftAppear>
          <Text style={styles.eyebrow}>ASISTENTE INTELIGENTE</Text>
          <Text style={styles.title}>Identificá tu pieza</Text>
          <Text style={styles.subtitle}>Subí una foto clara y la IA buscará el servicio más adecuado. La recomendación siempre será validada por nuestro equipo.</Text>
        </SoftAppear>

        <TouchableOpacity activeOpacity={.86} onPress={choosePhoto} style={[styles.upload, photo && styles.uploadReady]}>
          {photo ? <>
            <Image source={{ uri: photo.uri }} style={styles.preview}/>
            <View style={styles.previewShade}/>
            <View style={styles.changePhoto}><Icon name="camera-retake-outline" size={18} color="#fff"/><Text style={styles.changePhotoText}>Cambiar foto</Text></View>
            <View style={styles.photoMeta}><Text style={styles.photoName} numberOfLines={1}>{photo.fileName || 'Fotografía de la pieza'}</Text>{photoSize && <Text style={styles.photoSize}>{photoSize}</Text>}</View>
          </> : <>
            <View style={styles.cameraCircle}><Icon name="camera-plus-outline" size={38} color={colors.primary}/></View>
            <Text style={styles.uploadTitle}>Tomá o subí una foto</Text>
            <Text style={styles.uploadText}>Usá buena luz y encuadrá la pieza completa</Text>
            <View style={styles.uploadPill}><Icon name="image-outline" size={16} color={colors.primary}/><Text style={styles.uploadPillText}>Elegir fotografía</Text></View>
          </>}
        </TouchableOpacity>

        <GlassCard style={styles.tips}>
          <Text style={styles.tipsTitle}><Icon name="lightbulb-outline" size={18} color={colors.accent}/>  Para un mejor resultado</Text>
          <Text style={styles.tip}>• Fondo neutro y sin otros objetos</Text>
          <Text style={styles.tip}>• La pieza completa debe quedar visible</Text>
          <Text style={styles.tip}>• Mostrá claramente daños, óxido o golpes</Text>
        </GlassCard>

        <PrimaryButton title={analyzing ? 'Analizando imagen…' : analysis ? 'Analizar nuevamente' : 'Analizar con IA'} icon="creation" disabled={!photo || analyzing} onPress={analyze}/>

        {analyzing && <FadeInView style={styles.processing}>
          <ActivityIndicator color={colors.primary}/><View><Text style={styles.processingTitle}>Interpretando la fotografía</Text><Text style={styles.processingText}>Esto puede tardar algunos segundos.</Text></View>
        </FadeInView>}

        {analysis && <FadeInView style={styles.resultWrap}><GlassCard style={styles.result}>
          <View style={styles.resultTop}><View style={styles.resultIcon}><Icon name="check-decagram" size={27} color={colors.primary}/></View><View style={styles.resultHeading}><Text style={styles.resultEyebrow}>COINCIDENCIA {analysis.confidence}%</Text><Text style={styles.resultTitle}>{analysis.pieceName}</Text></View></View>
          <Text style={styles.resultText}>{analysis.description}</Text>
          {!!analysis.detectedDamage.length && <View style={styles.damageList}>{analysis.detectedDamage.map(damage => <View key={damage} style={styles.damagePill}><Icon name="alert-circle-outline" size={14} color={colors.primary}/><Text style={styles.damageText}>{damage}</Text></View>)}</View>}
          <View style={styles.service}><Text style={styles.serviceLabel}>SERVICIO SUGERIDO</Text><Text style={styles.serviceTitle}>{analysis.suggestedService}</Text></View>
          <Text style={styles.disclaimer}>{analysis.disclaimer || 'Esta sugerencia es orientativa. Un especialista confirmará la clasificación antes de comenzar.'}</Text>
          <PrimaryButton title={openingService ? 'Abriendo servicio…' : analysis.suggestedProductId ? 'Ver servicio sugerido' : 'Explorar catálogo'} icon="arrow-right" disabled={openingService} onPress={openSuggestedService}/>
        </GlassCard></FadeInView>}
      </ScrollView>
      <BottomNav active="Identify"/>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 110 },
  eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 30, color: colors.ink, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 9, marginBottom: 24 },
  upload: { height: 260, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(18,103,233,.38)', backgroundColor: 'rgba(255,255,255,.62)', alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' },
  uploadReady: { padding: 0, borderStyle: 'solid', borderColor: '#fff' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,24,50,.15)' },
  changePhoto: { position: 'absolute', right: 12, top: 12, height: 38, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(7,31,61,.78)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  changePhotoText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  photoMeta: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 14, padding: 12, backgroundColor: 'rgba(7,31,61,.80)' },
  photoName: { color: '#fff', fontWeight: '800' }, photoSize: { color: 'rgba(255,255,255,.72)', fontSize: 10, marginTop: 3 },
  cameraCircle: { width: 76, height: 76, borderRadius: 25, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  uploadTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 }, uploadText: { color: colors.muted, marginTop: 6, fontSize: 13 },
  uploadPill: { flexDirection: 'row', gap: 6, marginTop: 17, backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 }, uploadPillText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  tips: { padding: 18, marginVertical: 18 }, tipsTitle: { color: colors.ink, fontWeight: '800', marginBottom: 10 }, tip: { color: colors.muted, fontSize: 13, lineHeight: 23 },
  processing: { marginTop: 15, borderRadius: 18, padding: 16, backgroundColor: 'rgba(255,255,255,.68)', flexDirection: 'row', alignItems: 'center', gap: 13 }, processingTitle: { color: colors.ink, fontWeight: '800' }, processingText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  resultWrap: { marginTop: 20 }, result: { padding: 18 }, resultTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, resultIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(147,197,253,.32)' }, resultHeading: { flex: 1 }, resultEyebrow: { color: colors.primary, fontSize: 10, letterSpacing: .7, fontWeight: '900' }, resultTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 2 },
  resultText: { color: colors.muted, lineHeight: 20, marginTop: 15 }, damageList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, damagePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(147,197,253,.22)' }, damageText: { color: colors.primaryDark, fontSize: 10, fontWeight: '700' },
  service: { backgroundColor: 'rgba(255,255,255,.66)', borderRadius: 18, padding: 15, marginVertical: 15 }, serviceLabel: { fontSize: 9, color: colors.primary, letterSpacing: 1, fontWeight: '900' }, serviceTitle: { color: colors.ink, fontWeight: '800', marginTop: 5 }, disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 15 },
});
