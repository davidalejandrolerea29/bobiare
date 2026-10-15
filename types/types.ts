import type { NavigatorScreenParams } from '@react-navigation/native';

export type DeliveryTime = {
  id: number;
  description: string;
  business_days: number;
  extra_cost: number;
};

export type ProductAttribute = {
  id: number;
  description: string;
  hex_value?: string | null;
  selected?: boolean;
  subs?: ProductAttribute[];
};

export type ProductAttributeType = {
  id: number;
  name: string;
  key: string;
  attributes: ProductAttribute[];
};

export type SelectedAttribute = {
  attribute_type_id: number;
  attribute_id: number;
  description: string;
  hex_value?: string | null;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  offerPrice?: number | null;
  image: string;
  images: string[];
  category?: string;
  categories?: Array<{ id: number; name: string }>;
  deliveryTimes: DeliveryTime[];
  attributeTypes: ProductAttributeType[];
  timeEstimate: string;
};

export type PhotoAnalysis = {
  pieceName: string;
  confidence: number;
  description: string;
  detectedDamage: string[];
  suggestedService: string;
  suggestedProductId?: number;
  suggestedProduct?: Product;
  disclaimer?: string;
};

export type CartItem = {
  id: number;
  product_id?: number;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  delivery_time_id?: number;
  delivery_time_snapshot?: Partial<DeliveryTime>;
  piece_description?: string;
  selected_attributes?: SelectedAttribute[];
  quantity: number;
  subtotal: number;
  product?: Product;
};

export type Cart = {
  guest_token?: string | null;
  status: string;
  currency: string;
  items_subtotal: number;
  total: number;
  items: CartItem[];
  shipping_address?: Record<string, string> | null;
  notes?: string | null;
};

export type Order = {
  id: number;
  user_id?: number;
  status: string;
  total: number;
  created_at?: string;
  items: CartItem[];
  shipments?: Array<{
    id?: number;
    direction?: 'to_workshop' | 'to_customer' | string;
    carrier?: string;
    tracking_number: string;
    status?: string;
    shipped_at?: string | null;
    delivered_at?: string | null;
  }>;
  payments?: Array<{ id?: number; type: string; provider?: string; status?: string; amount: number; method?: string | null; paid_at?: string | null }>;
  status_histories?: Array<{
    status: string;
    note?: string;
    changed_by_user_id?: number;
    created_at?: string;
  }>;
  afip_invoices?: Array<{
    status: string;
    environment: string;
  }>;
  user?: { id: number; name: string; email: string };
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  telefono?: string | null;
  email_verified_at?: string | null;
  verified?: boolean;
  is_verified?: boolean;
  rol_id?: number;
  role_id?: number;
  role?: string | { id?: number; name?: string };
  addresses?: unknown[];
};

export type ApiRole = {
  id: number;
  name: 'Administrador' | 'Gerente General' | 'Finanzas' | 'Stock' | 'Cliente' | string;
  created_at?: string;
  updated_at?: string;
};

export type CheckoutDetails = {
  orderId: number;
  status: string;
  total: number;
  email?: string;
};

export type ClientTabsParamList = {
  ClientHome: undefined;
  Catalog: undefined;
  Identify: undefined;
  Orders: { orderId?: number } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Launch: undefined;
  Login: { returnToCheckout?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: NavigatorScreenParams<ClientTabsParamList> | undefined;
  ClientHome: undefined;
  Identify: undefined;
  Orders: { orderId?: number } | undefined;
  Profile: undefined;
  AdminDashboard: undefined;
  Catalog: undefined;
  ProductDetail: { product: Product };
  Cart: undefined;
  Checkout: undefined;
  ThankYou: { orderDetails: CheckoutDetails };
  PaymentConfirmation: { orderId: number };
};
