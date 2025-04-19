// types.ts
import { ImageSourcePropType } from 'react-native';

export type CartItem = {
  id: string;
  name: string;
  image: string;
  selectedColor: string;
  isExpress: boolean;
  selectedService: {
    name: string;
    price: number;
  };
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  timeEstimate: string; 
  // agrega lo que necesites
};

type OrderDetails = {
  items: any[]; // Define el tipo de los elementos según corresponda
  total: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryOption: string;
};



export type RootStackParamList = {
  Checkout: { 
    cartItems: CartItem[];
    total: number;
    orderDetails?: OrderDetails
  };
  
   Login:undefined;
   Register: undefined;
    AdminDashboard: undefined;
    Catalog: undefined;
    ThankYou: {
      orderDetails: {
        items: any[];
        total: number;
        fullName: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        postalCode: string;
        deliveryOption: string;
      };
    };
    ProductDetail: { product: Product };
    Cart: { cartItems: CartItem[] }; 
    
  };
  