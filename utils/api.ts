import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiRole, ApiUser, Cart, CartItem, DeliveryTime, Order, PhotoAnalysis, Product, ProductAttributeType, SelectedAttribute } from '../types/types';
import { setAuthState } from './authState';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://bobiare.n7softwares.com/api/v1';

export const AI_ANALYSIS_PATH =
  process.env.EXPO_PUBLIC_AI_ANALYSIS_PATH || '/ai/analyze-piece';

export const STORAGE_KEYS = {
  accessToken: 'bobiare.access_token',
  guestToken: 'bobiare.guest_token',
  user: 'bobiare.user',
  tokenExpiresAt: 'bobiare.token_expires_at',
  catalog: 'bobiare.catalog.v1',
} as const;

const CATALOG_DETAIL_TTL = 15 * 60 * 1000;
let catalogCacheSavedAt = 0;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

const persistSession = async (data: any, fallbackUser?: ApiUser) => {
  if (!data.access_token) return;
  const entries: [string, string][] = [
    [STORAGE_KEYS.accessToken, data.access_token],
    [STORAGE_KEYS.tokenExpiresAt, String(Date.now() + number(data.expires_in || 3600) * 1000)],
  ];
  const user = data.user || fallbackUser;
  if (user) entries.push([STORAGE_KEYS.user, JSON.stringify(user)]);
  await AsyncStorage.multiSet(entries);
  setAuthState(true);
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return null;
    try {
      const { data } = await authApi.post('/auth/refresh', undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await persistSession(data);
      return data.access_token as string;
    } catch {
      await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.tokenExpiresAt, STORAGE_KEYS.user]);
      setAuthState(false);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let [accessToken, guestToken, expiresAt] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.accessToken),
    AsyncStorage.getItem(STORAGE_KEYS.guestToken),
    AsyncStorage.getItem(STORAGE_KEYS.tokenExpiresAt),
  ]);

  const isRefreshRequest = config.url === '/auth/refresh';
  if (accessToken && !isRefreshRequest && expiresAt && number(expiresAt) - Date.now() < 60_000) {
    accessToken = await refreshAccessToken();
  }

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

    await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.tokenExpiresAt, STORAGE_KEYS.user]);
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
  business_days: number(raw.business_days) || number(String(raw.description || raw.name || '').match(/(\d+)\s*d[ií]as/i)?.[1]),
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
  const attributeTypes: ProductAttributeType[] = (raw.attribute_types || raw.attributeTypes || [])
    .map((type: any) => ({
      id: number(type.id),
      name: type.name || type.description || 'Opción',
      key: type.key || 'generic',
      attributes: (type.attributes || []).map((attribute: any) => ({
        ...attribute,
        id: number(attribute.id),
        description: attribute.description || attribute.name || 'Opción',
      })),
    }))
    .filter((type: ProductAttributeType) => type.attributes.length > 0);

  return {
    id: number(raw.id),
    name: raw.name || '',
    description: raw.description || '',
    price: number(raw.price),
    offerPrice: raw.offer_price == null ? null : number(raw.offer_price),
    image: images[0] || '',
    images,
    category: raw.category?.name || (typeof raw.categories?.[0] === 'string' ? raw.categories[0] : raw.categories?.[0]?.name || raw.categories?.[0]?.description) || raw.category_name,
    categories: raw.categories,
    deliveryTimes,
    attributeTypes,
    timeEstimate: firstTime?.business_days
      ? `${firstTime.business_days} días hábiles`
      : 'A confirmar',
  };
};

export const mergeProductSummaryWithCache = (summary: any, cached?: Product): Product => {
  const current = normalizeProduct(summary);
  if (!cached) return current;
  return {
    ...cached,
    ...current,
    image: current.image || cached.image,
    images: current.images.length ? current.images : cached.images,
    category: current.category || cached.category,
    categories: current.categories?.length ? current.categories : cached.categories,
    deliveryTimes: current.deliveryTimes.length ? current.deliveryTimes : cached.deliveryTimes,
    attributeTypes: current.attributeTypes.length ? current.attributeTypes : (cached.attributeTypes || []),
    timeEstimate: current.deliveryTimes.length ? current.timeEstimate : cached.timeEstimate,
  };
};

const readCatalogCache = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.catalog);
    if (!stored) return [] as Product[];
    const parsed = JSON.parse(stored);
    catalogCacheSavedAt = number(parsed.savedAt);
    return Array.isArray(parsed.products) ? parsed.products as Product[] : [];
  } catch {
    return [] as Product[];
  }
};

const normalizeCartItem = (raw: any): CartItem => ({
  ...raw,
  id: number(raw.id),
  product_id: raw.product_id == null ? undefined : number(raw.product_id),
  product_name_snapshot: raw.product_name_snapshot || raw.product?.name || 'Servicio',
  unit_price_snapshot: number(raw.unit_price_snapshot),
  delivery_time_id: raw.delivery_time_id == null ? undefined : number(raw.delivery_time_id),
  delivery_time_snapshot: raw.delivery_time_snapshot
    ? { ...raw.delivery_time_snapshot, extra_cost: number(raw.delivery_time_snapshot.extra_cost) }
    : undefined,
  quantity: number(raw.quantity) || 1,
  subtotal: number(raw.subtotal),
  selected_attributes: Array.isArray(raw.selected_attributes) ? raw.selected_attributes : [],
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
  const [{ data }, cachedProducts] = await Promise.all([
    api.get('/products/all-products'),
    readCatalogCache(),
  ]);
  const summaries = arrayPayload(data, ['products', 'data']);
  const cachedById = new Map(cachedProducts.map(product => [product.id, product]));
  return summaries.map((summary: any) =>
    mergeProductSummaryWithCache(summary, cachedById.get(number(summary.id))));
}

export async function hydrateProducts(
  products: Product[],
  onProduct?: (product: Product) => void,
  force = false,
) {
  if (!force && catalogCacheSavedAt && Date.now() - catalogCacheSavedAt < CATALOG_DETAIL_TTL) {
    return products;
  }

  const hydrated = [...products];
  let nextIndex = 0;
  let successes = 0;
  const worker = async () => {
    while (nextIndex < products.length) {
      const index = nextIndex++;
      try {
        const detail = await getProduct(products[index].id);
        hydrated[index] = detail;
        successes += 1;
        onProduct?.(detail);
      } catch {
        // El resumen ya está visible; un detalle fallido no bloquea el catálogo.
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, products.length) }, worker));
  if (successes) {
    catalogCacheSavedAt = Date.now();
    await AsyncStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify({
      savedAt: catalogCacheSavedAt,
      products: hydrated,
    }));
  }
  return hydrated;
}

export async function getProduct(id: number) {
  const { data } = await api.get(`/products/product/${id}`);
  const rawProduct = data.product || data.data || data;
  const selectedCategories = Array.isArray(data.categories)
    ? data.categories.filter((item: any) => item.selected !== false).map((item: any) => ({ id: item.id, name: item.name || item.description }))
    : rawProduct.categories;
  const selectedDeliveryTimes = Array.isArray(data.delivery_times)
    ? data.delivery_times.filter((item: any) => item.selected !== false)
    : rawProduct.delivery_times;
  return normalizeProduct({
    ...rawProduct,
    categories: selectedCategories,
    delivery_times: selectedDeliveryTimes,
    attribute_types: Array.isArray(data.attribute_types)
      ? data.attribute_types.map((type: any) => ({
        ...type,
        attributes: (type.attributes || []).filter((item: any) => item.selected !== false),
      }))
      : rawProduct.attribute_types,
  });
}

export async function analyzePiecePhoto(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<PhotoAnalysis> {
  const form = new FormData();
  form.append('image', {
    uri: asset.uri,
    name: asset.fileName || `pieza-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  } as any);

  const { data } = await api.post(AI_ANALYSIS_PATH, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  const raw = data.analysis || data.data || data;
  const rawConfidence = number(raw.confidence ?? raw.confidence_percentage);
  const suggestedRaw = raw.suggested_product || raw.product;
  const damages = raw.detected_damage || raw.detected_damages || raw.damage || [];

  return {
    pieceName: raw.piece_name || raw.piece || raw.label || 'Pieza identificada',
    confidence: Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence),
    description: raw.description || raw.summary || 'La imagen fue analizada correctamente.',
    detectedDamage: (Array.isArray(damages) ? damages : [damages]).filter(Boolean).map(String),
    suggestedService: raw.suggested_service || raw.service || suggestedRaw?.name || 'Evaluación especializada',
    suggestedProductId: number(raw.suggested_product_id || suggestedRaw?.id) || undefined,
    suggestedProduct: suggestedRaw?.id ? normalizeProduct(suggestedRaw) : undefined,
    disclaimer: raw.disclaimer,
  };
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
  selected_attributes?: SelectedAttribute[];
}) {
  const { data } = await api.post('/cart/items', payload);
  const item = normalizeCartItem(data.item || data);
  const guestToken = data.guest_token || data.item?.guest_token;
  if (guestToken) await AsyncStorage.setItem(STORAGE_KEYS.guestToken, guestToken);
  return item;
}

export async function updateCartItem(id: number, quantity: number) {
  const { data } = await api.put(`/cart/items/${id}`, { quantity });
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
    const user = (data.user || {
      id: data.user_id,
      name: payload.name,
      email: payload.email,
    }) as ApiUser;
    await persistSession(data, user);
  }
  await AsyncStorage.removeItem(STORAGE_KEYS.guestToken);
  return { ...data, id: number(data.id), total: number(data.total) };
}

export async function login(email: string, password: string) {
  const hadGuestCart = Boolean(await AsyncStorage.getItem(STORAGE_KEYS.guestToken));
  let guestItems: CartItem[] = [];
  if (hadGuestCart) {
    try {
      guestItems = (await getCart()).items;
    } catch {
      // Iniciar sesión sigue siendo posible aunque no se pueda leer el carrito invitado.
    }
  }
  const { data } = await api.post('/auth/login', { email, password });
  await persistSession(data, data.user);
  if (guestItems.length) {
    try {
      const authenticatedCart = await getCart();
      const existingIds = new Set(authenticatedCart.items.map(item => item.id));
      for (const item of guestItems) {
        if (existingIds.has(item.id) || !item.product_id || !item.delivery_time_id) continue;
        await addCartItem({
          product_id: item.product_id,
          delivery_time_id: item.delivery_time_id,
          piece_description: item.piece_description || '',
          quantity: item.quantity,
          selected_attributes: item.selected_attributes,
        });
      }
    } catch {
      // El login ya fue exitoso; el backend puede haber asociado el carrito por su cuenta.
    }
  }
  if (hadGuestCart) await AsyncStorage.removeItem(STORAGE_KEYS.guestToken);
  if (data.user) {
    return data.user as ApiUser;
  }
  // Compatibilidad con servidores anteriores que devolvían solamente el JWT.
  return getCurrentUser();
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function refreshSession() {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);
  const { data } = await authApi.post('/auth/refresh', undefined, { headers: { Authorization: `Bearer ${token}` } });
  await persistSession(data);
  return data as { access_token: string; token_type: string; expires_in: number; user: ApiUser };
}

export async function getRoles(): Promise<ApiRole[]> {
  const { data } = await api.get('/roles');
  const roles = Array.isArray(data) ? data : data.roles || data.data || [];
  return roles.map((role: any) => ({
    ...role,
    id: number(role.id),
    name: String(role.name),
  }));
}

export async function logout() {
  try {
    await api.get('/auth/logout');
  } catch {
    // Aunque el servidor no responda, la sesión local debe cerrarse.
  } finally {
    await AsyncStorage.multiRemove([STORAGE_KEYS.accessToken, STORAGE_KEYS.tokenExpiresAt, STORAGE_KEYS.user]);
    setAuthState(false);
  }
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

export async function getOrderDetails(id: number) {
  const [order, shipments, payments] = await Promise.allSettled([
    getOrder(id),
    getShipments(id),
    getPayments(id),
  ]);
  if (order.status === 'rejected') throw order.reason;
  return {
    ...order.value,
    shipments: shipments.status === 'fulfilled' ? shipments.value : order.value.shipments,
    payments: payments.status === 'fulfilled' ? payments.value : order.value.payments,
  };
}

export async function createShipment(id: number, tracking_number: string) {
  const { data } = await api.post(`/orders/${id}/shipments`, { tracking_number });
  return data;
}

export async function getShipments(id: number) {
  const { data } = await api.get(`/orders/${id}/shipments`);
  return arrayPayload(data, ['shipments', 'data']);
}

export async function getPayments(id: number) {
  const { data } = await api.get(`/orders/${id}/payments`);
  return arrayPayload(data, ['payments', 'data']).map((payment: any) => ({
    ...payment,
    amount: number(payment.amount),
  }));
}

export async function createMercadoPagoCheckout(id: number) {
  const { data } = await api.post(`/orders/${id}/checkout-mercadopago`);
  if (!data.init_point) throw new Error('El servidor no devolvió el enlace de Mercado Pago.');
  return data as { init_point: string; preference_id?: string };
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
