import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Notify, { NotificationHost } from '../utils/notify';

beforeEach(() => {
  jest.useFakeTimers();
  Notify.hide();
});

afterEach(() => {
  Notify.hide();
  jest.useRealTimers();
});

test('removes success notifications after three seconds', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NotificationHost/>);
    Notify.show({ type: 'success', text1: 'Mensaje temporal' });
  });

  expect(renderer!.root.findByProps({ children: 'Mensaje temporal' })).toBeTruthy();

  ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(3000);
  });

  expect(renderer!.toJSON()).toBeNull();
});

test('allows notifications to be closed immediately', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<NotificationHost/>);
    Notify.show({ type: 'info', text1: 'Cerrable' });
    Notify.hide();
  });

  expect(renderer!.toJSON()).toBeNull();
});
