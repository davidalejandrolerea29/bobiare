import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AppBackground, GlassCard, PrimaryButton } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';

export default function IdentifyScreen() {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const choosePhoto = () => {
    Alert.alert('Agregar fotografía', 'Elegí cómo querés cargar la imagen', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Galería', onPress: () => { setHasPhoto(true); setAnalyzed(false); } },
      { text: 'Cámara', onPress: () => { setHasPhoto(true); setAnalyzed(false); } },
    ]);
  };

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ASISTENTE INTELIGENTE</Text>
        <Text style={styles.title}>Identificá tu pieza</Text>
        <Text style={styles.subtitle}>Una foto clara nos ayuda a sugerirte el servicio correcto. La recomendación será validada por nuestro equipo.</Text>

        <TouchableOpacity activeOpacity={.8} onPress={choosePhoto} style={[styles.upload, hasPhoto && styles.uploadReady]}>
          <View style={styles.cameraCircle}><Icon name={hasPhoto ? 'check' : 'camera-plus-outline'} size={38} color={hasPhoto ? '#fff' : colors.primary} /></View>
          <Text style={styles.uploadTitle}>{hasPhoto ? 'Fotografía lista' : 'Tomá o subí una foto'}</Text>
          <Text style={styles.uploadText}>{hasPhoto ? 'pieza_frontal.jpg · 2,4 MB' : 'Usá buena luz y encuadrá la pieza completa'}</Text>
          <View style={styles.uploadPill}><Icon name="image-outline" size={16} color={colors.primary} /><Text style={styles.uploadPillText}>{hasPhoto ? 'Cambiar foto' : 'Elegir fotografía'}</Text></View>
        </TouchableOpacity>

        <GlassCard style={styles.tips}>
          <Text style={styles.tipsTitle}><Icon name="lightbulb-outline" size={18} color={colors.accent} />  Para un mejor resultado</Text>
          <Text style={styles.tip}>• Fondo neutro y sin otros objetos</Text>
          <Text style={styles.tip}>• Incluí una foto frontal y una lateral</Text>
          <Text style={styles.tip}>• Mostrá zonas dañadas o con óxido</Text>
        </GlassCard>

        <PrimaryButton title={analyzed ? 'Análisis completado' : 'Analizar con IA'} icon="creation" disabled={!hasPhoto || analyzed} onPress={() => setAnalyzed(true)} />

        {analyzed && <GlassCard style={styles.result}>
          <View style={styles.resultTop}><View style={styles.resultIcon}><Icon name="check-decagram" size={27} color={colors.primary} /></View><View><Text style={styles.resultEyebrow}>COINCIDENCIA 94%</Text><Text style={styles.resultTitle}>Llanta de motocicleta</Text></View></View>
          <Text style={styles.resultText}>Parece una llanta de aleación rodado 17 con pintura deteriorada y oxidación superficial.</Text>
          <View style={styles.service}><Text style={styles.serviceLabel}>SERVICIO SUGERIDO</Text><Text style={styles.serviceTitle}>Granallado + pintura electrostática</Text><Text style={styles.serviceMeta}>12 a 16 días hábiles · desde $ 60.000</Text></View>
          <Text style={styles.disclaimer}>Esta sugerencia es orientativa. Un especialista confirmará la clasificación antes de comenzar.</Text>
          <PrimaryButton title="Solicitar evaluación" icon="arrow-right" onPress={() => Alert.alert('Solicitud enviada', 'Un especialista revisará las fotos y te notificará por correo.')} />
        </GlassCard>}
      </ScrollView>
      <BottomNav active="Identify" />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 110 },
  eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 30, color: colors.ink, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 9, marginBottom: 24 },
  upload: { height: 245, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(18,103,233,.38)', backgroundColor: 'rgba(255,255,255,.62)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  uploadReady: { borderStyle: 'solid', backgroundColor: 'rgba(147,197,253,.24)' },
  cameraCircle: { width: 76, height: 76, borderRadius: 25, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  uploadTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  uploadText: { color: colors.muted, marginTop: 6, fontSize: 13 },
  uploadPill: { flexDirection: 'row', gap: 6, marginTop: 17, backgroundColor: '#fff', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  uploadPillText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  tips: { padding: 18, marginVertical: 18 },
  tipsTitle: { color: colors.ink, fontWeight: '800', marginBottom: 10 },
  tip: { color: colors.muted, fontSize: 13, lineHeight: 23 },
  result: { padding: 18, marginTop: 20 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(147,197,253,.32)' },
  resultEyebrow: { color: colors.primary, fontSize: 10, letterSpacing: .7, fontWeight: '900' },
  resultTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 2 },
  resultText: { color: colors.muted, lineHeight: 20, marginTop: 15 },
  service: { backgroundColor: 'rgba(255,255,255,.66)', borderRadius: 18, padding: 15, marginVertical: 15 },
  serviceLabel: { fontSize: 9, color: colors.primary, letterSpacing: 1, fontWeight: '900' },
  serviceTitle: { color: colors.ink, fontWeight: '800', marginTop: 5 },
  serviceMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 15 },
});
