import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from '../utils/notify';
import { AppBackground, GlassCard } from '../components/GlassUI';
import BottomNav from '../components/BottomNav';
import { colors } from '../theme';
import { ApiUser } from '../types/types';
import { getCurrentUser, getErrorMessage, getStoredUser, logout } from '../utils/api';

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Catalog' }] });
  };

  const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const phone = user?.phone || user?.telefono;
  const verified = Boolean(user?.email_verified_at || user?.verified || user?.is_verified);
  const options = [
    { icon: 'account-edit-outline', label: 'Datos personales', note: phone || 'Teléfono no informado' },
    { icon: 'map-marker-outline', label: 'Direcciones de entrega', note: user?.addresses?.length ? `${user.addresses.length} dirección(es) guardada(s)` : 'Sin direcciones guardadas' },
    { icon: 'bell-outline', label: 'Notificaciones', note: 'Novedades de tus pedidos' },
    { icon: 'shield-check-outline', label: 'Seguridad', note: verified ? 'Correo verificado' : 'Cuenta activa' },
  ];

  return <AppBackground>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary}/>}>
      <Text style={styles.eyebrow}>MI CUENTA</Text><Text style={styles.title}>Perfil</Text>
      {loading && !user ? <ActivityIndicator style={styles.loader} size="large" color={colors.primary}/> : <>
        <GlassCard style={styles.user}><View style={styles.avatar}><Text style={styles.initials}>{initials(user?.name)}</Text></View><View style={styles.userText}><Text style={styles.name}>{user?.name || 'Cliente Bobiare'}</Text><Text style={styles.email}>{user?.email || 'Email no disponible'}</Text><View style={styles.verified}><Icon name={verified ? 'check-decagram' : 'account-check-outline'} size={13} color={colors.primary}/><Text style={styles.verifiedText}>{verified ? 'Correo verificado' : 'Cuenta activa'}{role ? ` · ${role}` : ''}</Text></View></View></GlassCard>
        <View style={styles.options}>{options.map((item, index) => <TouchableOpacity key={item.label} style={[styles.option, index === options.length - 1 && { borderBottomWidth: 0 }]}><View style={styles.optionIcon}><Icon name={item.icon as React.ComponentProps<typeof Icon>['name']} size={21} color={colors.primary}/></View><View style={styles.optionText}><Text style={styles.optionLabel}>{item.label}</Text><Text style={styles.optionNote}>{item.note}</Text></View><Icon name="chevron-right" size={21} color="#9AA6AC"/></TouchableOpacity>)}</View>
      </>}
      <TouchableOpacity style={styles.whatsapp} onPress={() => Linking.openURL('https://wa.me/5493510000000?text=Hola,%20necesito%20ayuda%20con%20Bobiare')}><Icon name="whatsapp" size={25} color="#fff"/><View style={styles.helpCopy}><Text style={styles.whatsappTitle}>¿Necesitás ayuda?</Text><Text style={styles.whatsappNote}>Hablemos por WhatsApp</Text></View><Icon name="arrow-top-right" size={20} color="#fff"/></TouchableOpacity>
      <TouchableOpacity style={styles.logout} onPress={handleLogout}><Icon name="logout" size={19} color={colors.danger}/><Text style={styles.logoutText}>Cerrar sesión</Text></TouchableOpacity>
      <Text style={styles.version}>Bobiare · versión 1.0.0</Text>
    </ScrollView>
    <BottomNav active="Profile" />
  </AppBackground>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 30, paddingBottom: 110 }, eyebrow: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 4 }, loader: { marginTop: 45 },
  user: { padding: 18, marginTop: 21, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, initials: { color: '#fff', fontSize: 21, fontWeight: '900' },
  userText: { flex: 1, marginLeft: 14 }, name: { fontSize: 18, fontWeight: '900', color: colors.ink }, email: { color: colors.muted, fontSize: 13, marginTop: 3 }, verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }, verifiedText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  options: { backgroundColor: 'rgba(255,255,255,.65)', borderRadius: 24, paddingHorizontal: 16, marginTop: 17, borderWidth: 1, borderColor: '#fff' }, option: { minHeight: 73, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line }, optionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(147,197,253,.26)', alignItems: 'center', justifyContent: 'center' }, optionText: { flex: 1, marginLeft: 12 }, optionLabel: { color: colors.ink, fontWeight: '800' }, optionNote: { color: colors.muted, fontSize: 11, marginTop: 3 },
  whatsapp: { minHeight: 72, marginTop: 17, backgroundColor: '#299E63', borderRadius: 22, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 }, helpCopy: { flex: 1 }, whatsappTitle: { color: '#fff', fontWeight: '900' }, whatsappNote: { color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 2 }, logout: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }, logoutText: { color: colors.danger, fontWeight: '800' }, version: { textAlign: 'center', color: '#98A4A9', fontSize: 10, marginTop: 18 },
});
