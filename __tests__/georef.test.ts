import { ARGENTINA_PROVINCES } from '../utils/georef';

test('includes the 23 Argentine provinces in the local selector', () => {
  expect(ARGENTINA_PROVINCES).toHaveLength(23);
  expect(ARGENTINA_PROVINCES.map(province => province.name)).toEqual([
    'Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
  ]);
});
