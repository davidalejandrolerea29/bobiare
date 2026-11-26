import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from '../utils/notify';
import { AppBackground, GlassCard } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';
import { ApiUser } from '../types/types';
import Constants from 'expo-constants';
import { deleteAccount, getCurrentUser, getErrorMessage, getStoredUser, logout } from '../utils/api';
import { LEGAL_URLS, openExternalUrl, supportWhatsAppUrl } from '../utils/legal';
import { activatePush, deactivatePush, pushStatus, subscribePushStatus } from '../utils/pushNotifications';
import { FadeInView, ListSkeleton } from '../components/MotionUI';

const initials = (name?: string) =>
  (name || 'Cliente')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermissionGranted, setPushPermissionGranted] = useState(false);
  const [pushChecking, setPushChecking] = useState(true);
  const [pushStatusError, setPushStatusError] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const mounted = useRef(true);
  const pushRequest = useRef(0);
  const pushChanging = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refreshPushStatus = useCallback(async () => {
    const request = ++pushRequest.current;
    if (mounted.current) setPushChecking(true);
    try {
      const status = await pushStatus();
      if (mounted.current && request === pushRequest.current) {
        setPushAvailable(status.available);
        setPushEnabled(status.enabled);
        setPushPermissionGranted(status.permissionGranted);
        setPushStatusError(false);
      }
      return status;
    } catch {
      if (mounted.current && request === pushRequest.current) setPushStatusError(true);
      return undefined;
    } finally {
      if (mounted.current && request === pushRequest.current) setPushChecking(false);
    }
  }, []);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const stored = await getStoredUser();
      if (stored) setUser(stored);
      setUser(await getCurrentUser());
    } catch (error) {
      Toast.show({ type: 'error', text1: 'No se pudo actualizar el perfil', text2: getErrorMessage(error) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    void refreshPushStatus();
    const unsubscribe = subscribePushStatus(() => { void refreshPushStatus(); });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshPushStatus();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [load, refreshPushStatus]));

  const openNotificationSettings = () => {
    void Linking.openSettings().catch(error => {
      Toast.show({ type: 'error', text1: 'No pudimos abrir los ajustes', text2: getErrorMessage(error) });
    });
  };

  const togglePush = async () => {
    if (pushChanging.current || !pushAvailable || pushChecking) return;
    pushChanging.current = true;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await deactivatePush();
        Toast.show({ type: 'success', text1: 'Avisos desactivados en este dispositivo' });
      } else {
        const enabled = await activatePush();
        if (enabled) {
          Toast.show({ type: 'success', text1: 'Avisos activados en este dispositivo' });
        } else {
          const status = await refreshPushStatus();
          if (status?.available && !status.permissionGranted) {
            Alert.alert('Permití las notificaciones', 'Habilitá los avisos de Bobiare en los ajustes del dispositivo para recibir novedades de tus pedidos y facturas.', [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: openNotificationSettings },
            ]);
          } else {
            Toast.show({ type: 'info', text1: 'No se activaron los avisos', text2: 'Volvé a intentarlo con tu sesión iniciada.' });
          }
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'No pudimos cambiar los avisos', text2: getErrorMessage(error) });
    } finally {
      await refreshPushStatus();
      pushChanging.current = false;
      if (mounted.current) setPushBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Catalog' }] });
  };

  const [deleting, setDeleting] = useState(false);
  const runDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      Toast.show({ type: 'success', text1: 'Tu cuenta fue eliminada' });
      navigation.reset({ index: 0, routes: [{ name: 'Catalog' }] });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'No pudimos eliminar tu cuenta', text2: getErrorMessage(error) });
    } finally {
      if (mounted.current) setDeleting(false);
    }
  };
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu nombre, correo, contraseña y accesos con Google o Apple, y se cerrará tu sesión. Los pedidos y facturas ya emitidos se conservan por obligación fiscal. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { void runDeleteAccount(); } },
      ],
    );
  };

  const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const phone = user?.phone || user?.telefono;
  const verified = Boolean(user?.email_verified_at || user?.verified || user?.is_verified);
  const options = [
    { icon: 'account-edit-outline', label: 'Datos personales', note: phone || 'Teléfono no informado' },
    { icon: 'map-marker-outline', label: 'Direcciones de entrega', note: user?.addresses?.length ? `${user.addresses.length} dirección(es) guardada(s)` : 'Sin direcciones guardadas' },
    { icon: 'bell-outline', label: 'Notificaciones', note: pushBusy ? 'Guardando tus preferencias…' : pushChecking ? 'Consultando el estado…' : pushStatusError ? 'No pudimos consultar los avisos' : !pushAvailable ? 'Requiere la app instalada' : pushEnabled ? 'Activadas en este dispositivo' : !pushPermissionGranted ? 'Permití los avisos para activarlos' : 'Recibí novedades de pedidos y facturas' },
    { icon: 'shield-check-outline', label: 'Seguridad', note: verified ? 'Correo verificado' : 'Cuenta activa' },
  ];

  return <AppBackground>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>}>
      <Text style={styles.eyebrow}>MI CUENTA</Text><Text style={styles.title}>Perfil</Text>
      {loading && !user ? <ListSkeleton rows={3}/> : <>
        <FadeInView><GlassCard style={styles.user}><View style={styles.avatar}><Text style={styles.initials}>{initials(user?.name)}</Text></View><View style={styles.userText}><Text style={styles.name}>{user?.name || 'Cliente Bobiare'}</Text><Text style={styles.email}>{user?.email || 'Email no disponible'}</Text><View style={styles.verified}><Icon name={verified ? 'check-decagram' : 'account-check-outline'} size={13} color={colors.primary}/><Text style={styles.verifiedText}>{verified ? 'Correo verificado' : 'Cuenta activa'}{role ? ` · ${role}` : ''}</Text></View></View></GlassCard></FadeInView>
        <FadeInView index={1}><View style={styles.options}>{options.map((item, index) => {
          const notifications = item.label === 'Notificaciones';
          return <View key={item.label} style={[styles.option, index === options.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.optionIcon}><Icon name={item.icon as React.ComponentProps<typeof Icon>['name']} size={21} color={colors.primary}/></View>
            <View style={styles.optionText}><Text style={styles.optionLabel}>{item.label}</Text><Text style={styles.optionNote}>{item.note}</Text>
              {notifications && pushStatusError && <TouchableOpacity accessibilityRole="button" onPress={() => { void refreshPushStatus(); }}><Text style={styles.settingsLink}>Reintentar</Text></TouchableOpacity>}
              {notifications && pushAvailable && !pushPermissionGranted && !pushChecking && !pushBusy && <TouchableOpacity accessibilityRole="button" onPress={openNotificationSettings}><Text style={styles.settingsLink}>Abrir ajustes</Text></TouchableOpacity>}
            </View>
            {notifications ? <View style={styles.pushControl}>
              {(pushBusy || pushChecking) && <ActivityIndicator accessibilityLabel="Actualizando notificaciones" size="small" color={colors.primary}/>}
              <Switch accessibilityLabel="Notificaciones de pedidos y facturas" accessibilityState={{ busy: pushBusy || pushChecking }} value={pushEnabled} onValueChange={() => { void togglePush(); }} disabled={!pushAvailable || pushBusy || pushChecking || pushStatusError} trackColor={{ false: '#CFD7D5', true: colors.primary }} thumbColor="#fff"/>
            </View> : <Icon name="chevron-right" size={21} color="#9AA6AC"/>}
          </View>;
        })}</View></FadeInView>
      </>}
      <TouchableOpacity style={styles.whatsapp} onPress={() => openExternalUrl(supportWhatsAppUrl())}><Icon name="whatsapp" size={25} color="#fff"/><View style={styles.helpCopy}><Text style={styles.whatsappTitle}>¿Necesitás ayuda?</Text><Text style={styles.whatsappNote}>Hablemos por WhatsApp</Text></View><Icon name="arrow-top-right" size={20} color="#fff"/></TouchableOpacity>
      <View style={styles.legalRow}>
        <TouchableOpacity accessibilityRole="link" onPress={() => openExternalUrl(LEGAL_URLS.privacy)}><Text style={styles.legalLink}>Política de privacidad</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="link" onPress={() => openExternalUrl(LEGAL_URLS.terms)}><Text style={styles.legalLink}>Términos y condiciones</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logout} onPress={handleLogout} disabled={deleting}><Icon name="logout" size={19} color={colors.danger}/><Text style={styles.logoutText}>Cerrar sesión</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.deleteAccount} onPress={confirmDeleteAccount} disabled={deleting}>
        {deleting ? <ActivityIndicator size="small" color={colors.danger}/> : <Icon name="account-remove-outline" size={18} color={colors.danger}/>}
        <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
      </TouchableOpacity>
      <Text style={styles.version}>Bobiare · versión {Constants.expoConfig?.version || '1.0.1'}</Text>
    </ScrollView>
    <BottomNav active="Profile" />
  </AppBackground>;
}

const styles = StyleSheet.create({
  legalRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 20 },
  legalLink: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  deleteAccount: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 16, paddingVertical: 6 },
  deleteAccountText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  content: { padding: 20, paddingTop: 30, paddingBottom: 110 }, eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 4 }, loader: { marginTop: 45 },
  user: { padding: 18, marginTop: 21, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, initials: { color: '#fff', fontSize: 21, fontWeight: '900' },
  userText: { flex: 1, marginLeft: 14 }, name: { fontSize: 18, fontWeight: '900', color: colors.ink }, email: { color: colors.muted, fontSize: 13, marginTop: 3 }, verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }, verifiedText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  options: { backgroundColor: 'rgba(255,255,255,.65)', borderRadius: 24, paddingHorizontal: 16, marginTop: 17, borderWidth: 1, borderColor: '#fff' }, option: { minHeight: 73, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, optionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(147,197,253,.26)', alignItems: 'center', justifyContent: 'center' }, optionText: { flex: 1, marginLeft: 12 }, optionLabel: { color: colors.ink, fontWeight: '800' }, optionNote: { color: colors.muted, fontSize: 11, marginTop: 3 },
  pushControl: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6 }, settingsLink: { color: colors.primary, fontWeight: '800', fontSize: 11, paddingVertical: 9 },
  whatsapp: { minHeight: 72, marginTop: 17, backgroundColor: '#299E63', borderRadius: 22, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 }, helpCopy: { flex: 1 }, whatsappTitle: { color: '#fff', fontWeight: '900' }, whatsappNote: { color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 2 }, logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }, logoutText: { color: colors.danger, fontWeight: '800' }, version: { textAlign: 'center', color: '#98A4A9', fontSize: 10, marginTop: 18 },
});
