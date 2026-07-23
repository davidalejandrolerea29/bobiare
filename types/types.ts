export type DeliveryTime = {
  id: number;
  description: string;
  business_days: number;
  extra_cost: number;
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
  delivery_time_snapshot?: Partial<DeliveryTime>;
  piece_description?: string;
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
};

export type Order = {
  id: number;
  user_id?: number;
  status: string;
  total: number;
  created_at?: string;
  items: CartItem[];
  shipments?: Array<{ id?: number; tracking_number: string }>;
  payments?: Array<{ id?: number; type: string; amount: number; method: string }>;
  status_histories?: Array<{
    status: string;
    note?: string;
    changed_by_user_id?: number;
    created_at?: string;
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

export type RootStackParamList = {
  Login: { returnToCheckout?: boolean } | undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ClientHome: undefined;
  Identify: undefined;
  Orders: undefined;
  Profile: undefined;
  AdminDashboard: undefined;
  Catalog: undefined;
  ProductDetail: { product: Product };
  Cart: undefined;
  Checkout: undefined;
  ThankYou: { orderDetails: CheckoutDetails };
};
