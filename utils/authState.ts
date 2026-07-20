import { useSyncExternalStore } from 'react';

let authenticated: boolean | null = null;
const listeners = new Set<() => void>();

export function setAuthState(value: boolean) {
  if (authenticated === value) return;
  authenticated = value;
  listeners.forEach(listener => listener());
}

export function getAuthState() {
  return authenticated;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthState() {
  return useSyncExternalStore(subscribe, getAuthState, getAuthState);
}
