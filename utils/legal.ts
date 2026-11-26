import { Linking } from 'react-native';

const SITE_URL = 'https://bobiare.n7softwares.com';

export const LEGAL_URLS = {
  privacy: `${SITE_URL}/privacidad`,
  terms: `${SITE_URL}/terminos`,
  deleteAccount: `${SITE_URL}/eliminar-cuenta`,
} as const;

export const SUPPORT_WHATSAPP_NUMBER = '5491130565543';
export const SUPPORT_WHATSAPP_DISPLAY = '+54 9 11 3056-5543';

export const supportWhatsAppUrl = (message = 'Hola, necesito ayuda con Bobiare') =>
  `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const openExternalUrl = (url: string) => Linking.openURL(url).catch(() => undefined);
