export const colors = {
  ink: '#0B1F3A',
  muted: '#607792',
  primary: '#1267E9',
  primaryDark: '#0847A6',
  mint: '#93C5FD',
  accent: '#38BDF8',
  background: '#EAF4FF',
  glass: 'rgba(255,255,255,0.66)',
  glassStrong: 'rgba(255,255,255,0.88)',
  border: 'rgba(255,255,255,0.92)',
  line: 'rgba(18,103,233,0.11)',
  danger: '#E54867',
  success: '#0891B2',
};

export const shadow = {
  shadowColor: '#0754B8',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.14,
  shadowRadius: 24,
  elevation: 7,
};

export const formatPrice = (value: number) =>
  `$ ${value.toLocaleString('es-AR')}`;
