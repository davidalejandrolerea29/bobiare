import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage, mergeProductSummaryWithCache, normalizeDeliveryTime, normalizeProduct, STORAGE_KEYS } from '../utils/api';

beforeEach(() => AsyncStorage.clear());

test('normalizes numeric API values and offer price', () => {
  const product = normalizeProduct({
    id: 2,
    name: 'Restauración de tanque',
    price: '25000.00',
    offer_price: '22000.00',
    images: ['https://example.test/tanque.png'],
    delivery_times: [{ id: 3, description: 'Express', business_days: 5, extra_cost: '3000.00' }],
  });

  expect(product.price).toBe(25000);
  expect(product.offerPrice).toBe(22000);
  expect(product.deliveryTimes[0].extra_cost).toBe(3000);
});

test('normalizes delivery time values returned as strings', () => {
  expect(normalizeDeliveryTime({
    id: '3',
    description: 'Express',
    business_days: '5',
    extra_cost: '3000.00',
  })).toEqual({
    id: 3,
    description: 'Express',
    business_days: 5,
    extra_cost: 3000,
  });
});

test('extracts business days from the production delivery description', () => {
  expect(normalizeDeliveryTime({
    id: 2,
    description: 'Rápido (7 días hábiles)',
  }).business_days).toBe(7);
});

test('accepts category names returned as strings by the product list', () => {
  expect(normalizeProduct({
    id: 3,
    name: 'Restauración',
    categories: ['Motos'],
  }).category).toBe('Motos');
});

test('normalizes enabled color picker attributes from product detail', () => {
  const product = normalizeProduct({
    id: 4,
    name: 'Tanque',
    attribute_types: [{
      id: 6,
      name: 'Color picker',
      key: 'color_picker',
      attributes: [{ id: 3, description: 'Azul', hex_value: '#2563EB', selected: true }],
    }],
  });

  expect(product.attributeTypes[0]).toMatchObject({
    id: 6,
    key: 'color_picker',
    attributes: [{ id: 3, description: 'Azul', hex_value: '#2563EB' }],
  });
});

test('keeps cached product images while using the latest catalog price', () => {
  const cached = normalizeProduct({
    id: 3,
    name: 'Restauración',
    price: 8000,
    images: ['https://example.test/service.jpg'],
    delivery_times: [{ id: 1, description: 'Rápido', business_days: 7 }],
  });
  const product = mergeProductSummaryWithCache({
    id: 3,
    name: 'Restauración actualizada',
    price: 9500,
    categories: ['Motos'],
  }, cached);

  expect(product.price).toBe(9500);
  expect(product.image).toBe('https://example.test/service.jpg');
  expect(product.deliveryTimes).toHaveLength(1);
});

test('uses isolated persistence keys for JWT and guest cart', () => {
  expect(STORAGE_KEYS.accessToken).not.toBe(STORAGE_KEYS.guestToken);
});

test('returns field validation messages sent by the backend', () => {
  const error = {
    response: {
      data: {
        message: 'The given data was invalid.',
        errors: {
          email: ['El correo electrónico ya está registrado.'],
          password: ['La contraseña debe tener al menos 8 caracteres.'],
        },
      },
    },
  };

  expect(getErrorMessage(error)).toBe(
    'El correo electrónico ya está registrado.\nLa contraseña debe tener al menos 8 caracteres.',
  );
});

test('returns direct backend error objects', () => {
  const error = { response: { data: { email: ['El email no es válido.'] } } };
  expect(getErrorMessage(error)).toBe('El email no es válido.');
});
