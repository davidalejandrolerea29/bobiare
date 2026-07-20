import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiUser, Cart, CartItem, DeliveryTime, Order, Product } from '../types/types';
import { setAuthState } from './authState';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://bobiare.n7softwares.com/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'bobiare.access_token',
  guestToken: 'bobiare.guest_token',
  user: 'bobiare.user',
} as const;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const [accessToken, guestToken] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.accessToken),
    AsyncStorage.getItem(STORAGE_KEYS.guestToken),
  ]);

  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (guestToken) config.headers['X-Guest-Token'] = guestToken;
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _guestRetry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !config) {
      return Promise.reject(error);
    }

    await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.user]);
    setAuthState(false);

    const url = config.url || '';
    const canContinueAsGuest = url.startsWith('/products') || url.startsWith('/cart');
    if (canContinueAsGuest && !config._guestRetry) {
      config._guestRetry = true;
      delete config.headers.Authorization;
      return api.request(config);
    }

    return Promise.reject(error);
  },
);

const number = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const arrayPayload = (payload: any, keys: string[]) => {
  let value = payload;
  for (const key of keys) {
    if (Array.isArray(value)) return value;
    if (value && value[key] !== undefined) value = value[key];
  }
  return Array.isArray(value) ? value : [];
};

export const normalizeDeliveryTime = (raw: any): DeliveryTime => ({
  id: number(raw.id),
  description: raw.description || raw.name || 'Modalidad',
  business_days: number(raw.business_days),
  extra_cost: number(raw.extra_cost),
});

export const normalizeProduct = (raw: any): Product => {
  let rawImages = raw.images || raw.product_images || [];
  if (typeof rawImages === 'string') {
    try {
      const parsed = JSON.parse(rawImages);
      rawImages = Array.isArray(parsed) ? parsed : [rawImages];
    } catch {
      rawImages = [rawImages];
    }
  }
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .map((image: any) => (typeof image === 'string' ? image : image.url || image.path))
    .filter(Boolean);
  if (!images.length && (raw.image || raw.image_url)) images.push(raw.image || raw.image_url);

  const deliveryTimes = (raw.delivery_times || raw.deliveryTimes || [])
    .map(normalizeDeliveryTime);
  const firstTime = deliveryTimes[0];

  return {
    id: number(raw.id),
    name: raw.name || '',
    description: raw.description || '',
    price: number(raw.price),
    offerPrice: raw.offer_price == null ? null : number(raw.offer_price),
    image: images[0] || '',
    images,
    category: raw.category?.name || raw.categories?.[0]?.name || raw.category_name,
    categories: raw.categories,
    deliveryTimes,
    timeEstimate: firstTime?.business_days
      ? `${firstTime.business_days} días hábiles`
      : 'A confirmar',
  };
};

const normalizeCartItem = (raw: any): CartItem => ({
  ...raw,
  id: number(raw.id),
  product_id: raw.product_id == null ? undefined : number(raw.product_id),
  product_name_snapshot: raw.product_name_snapshot || raw.product?.name || 'Servicio',
  unit_price_snapshot: number(raw.unit_price_snapshot),
  delivery_time_snapshot: raw.delivery_time_snapshot
    ? { ...raw.delivery_time_snapshot, extra_cost: number(raw.delivery_time_snapshot.extra_cost) }
    : undefined,
  quantity: number(raw.quantity) || 1,
  subtotal: number(raw.subtotal),
  product: raw.product ? normalizeProduct(raw.product) : undefined,
});

const normalizeCart = (raw: any): Cart => ({
  ...raw,
  status: raw.status || 'cart',
  currency: raw.currency || 'ARS',
  items_subtotal: number(raw.items_subtotal),
  total: number(raw.total),
  items: (raw.items || []).map(normalizeCartItem),
});

const extractMessages = (value: unknown, depth = 0): string[] => {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') {
    if (value.trim().startsWith('<!DOCTYPE') || value.trim().startsWith('<html')) return [];
    return value.trim() ? [value.trim()] : [];
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(item => extractMessages(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['status', 'statusCode', 'code', 'trace'].includes(key))
      .flatMap(([, item]) => extractMessages(item, depth + 1));
  }
  return [];
};

export const getErrorMessage = (error: unknown, fallback = 'Ocurrió un error') => {
  const data = (error as AxiosError<any>)?.response?.data;
  const preferred = data?.errors ?? data?.error ?? data?.message ?? data;
  const messages = [...new Set(extractMessages(preferred))];
  if (messages.length) return messages.slice(0, 3).join('\n');
  if ((error as Error)?.message === 'Network Error') {
    return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  }
  if ((error as Error)?.message) return (error as Error).message;
  return fallback;
};

export const getStatusCode = (error: unknown) =>
  (error as AxiosError)?.response?.status;

export async function getCatalogData() {
  const { data } = await api.get('/products/get-data-products');
  return {
    categories: arrayPayload(data, ['categories', 'data']).map((raw: any) => ({
      id: number(raw.id),
      name: raw.name || raw.description,
    })),
    deliveryTimes: arrayPayload(data?.delivery_times, ['data']).map(normalizeDeliveryTime),
  };
}

export async function getProducts() {
  const { data } = await api.get('/products/all-products');
  return arrayPayload(data, ['products', 'data']).map(normalizeProduct);
}

export async function getProduct(id: number) {
  const { data } = await api.get(`/products/product/${id}`);
  return normalizeProduct(data.product || data.data || data);
}

export async function getCart() {
  const { data } = await api.get('/cart');
  if (data.guest_token) {
    await AsyncStorage.setItem(STORAGE_KEYS.guestToken, data.guest_token);
  }
  return normalizeCart(data);
}

export async function addCartItem(payload: {
  product_id: number;
  delivery_time_id: number;
  piece_description: string;
  quantity: number;
}) {
  const { data } = await api.post('/cart/items', payload);
  return normalizeCartItem(data.item || data);
}

export async function removeCartItem(id: number) {
  await api.delete(`/cart/items/${id}`);
}

export async function checkout(payload: {
  shipping_address: {
    recipient_name: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    postal_code: string;
  };
  notes?: string;
  name?: string;
  email?: string;
  password?: string;
}) {
  const { data } = await api.post('/cart/checkout', payload);
  if (data.access_token) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.accessToken, data.access_token],
      [STORAGE_KEYS.user, JSON.stringify({ id: data.user_id, name: payload.name, email: payload.email })],
    ]);
    setAuthState(true);
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.guestToken);
  return { ...data, id: number(data.id), total: number(data.total) };
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  await AsyncStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
  return getCurrentUser();
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function logout() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.user]);
  setAuthState(false);
}

export async function getStoredUser(): Promise<ApiUser | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<ApiUser> {
  const { data } = await api.get('/auth/me');
  const user = (data.user || data.data || data) as ApiUser;
  await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  setAuthState(true);
  return user;
}

export async function isAuthenticated() {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);
  if (!token) {
    setAuthState(false);
    return false;
  }
  try {
    await getCurrentUser();
    setAuthState(true);
    return true;
  } catch {
    setAuthState(false);
    return false;
  }
}

const normalizeOrder = (raw: any): Order => ({
  ...raw,
  id: number(raw.id),
  total: number(raw.total),
  items: (raw.items || []).map(normalizeCartItem),
  payments: (raw.payments || []).map((p: any) => ({ ...p, amount: number(p.amount) })),
});

export async function getOrders() {
  const { data } = await api.get('/orders');
  return arrayPayload(data, ['orders', 'data']).map(normalizeOrder);
}

export async function getOrder(id: number) {
  const { data } = await api.get(`/orders/${id}`);
  return normalizeOrder(data.order || data.data || data);
}

export async function createShipment(id: number, tracking_number: string) {
  const { data } = await api.post(`/orders/${id}/shipments`, { tracking_number });
  return data;
}

export async function getAdminOrders(status?: string) {
  const { data } = await api.get('/admin/orders', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  const items = arrayPayload(data, ['orders', 'data']);
  return {
    orders: items.map(normalizeOrder),
    total: number(data.total ?? data.meta?.total ?? items.length),
  };
}

export async function registerDeposit(id: number, amount: number, method: string) {
  const { data } = await api.post(`/orders/${id}/payments`, {
    type: 'deposit',
    amount,
    method,
  });
  return data;
}

export async function receiveOrder(id: number, note: string) {
  const { data } = await api.post(`/admin/orders/${id}/receive`, { note });
  return data;
}

export default api;
