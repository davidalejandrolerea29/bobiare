import { getTimeGreeting } from '../utils/greeting';

const localDateAt = (hour: number) => new Date(2026, 6, 23, hour, 0, 0);

test('uses the local device hour for the morning greeting', () => {
  expect(getTimeGreeting(localDateAt(5))).toBe('Buen día');
  expect(getTimeGreeting(localDateAt(11))).toBe('Buen día');
});

test('switches to the afternoon greeting at noon', () => {
  expect(getTimeGreeting(localDateAt(12))).toBe('Buenas tardes');
  expect(getTimeGreeting(localDateAt(19))).toBe('Buenas tardes');
});

test('uses the night greeting until early morning', () => {
  expect(getTimeGreeting(localDateAt(20))).toBe('Buenas noches');
  expect(getTimeGreeting(localDateAt(4))).toBe('Buenas noches');
});
