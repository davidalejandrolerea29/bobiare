import { registerRootComponent } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React from 'react';
import { AppState, Platform } from 'react-native';
import App from './App';

const checkHeadless = Platform.OS === 'ios' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let headlessLaunch = Promise.resolve(false);
if (['android', 'ios'].includes(Platform.OS) &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  const { getMessaging, getIsHeadless, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  const messaging = getMessaging();
  // El sistema muestra el aviso en segundo plano; no se ejecuta UI en el handler.
  setBackgroundMessageHandler(messaging, async () => {});
  if (checkHeadless) headlessLaunch = getIsHeadless(messaging);
}

// iOS puede iniciar JavaScript sólo para recibir un push en segundo plano.
// En ese caso no montar navegación, consultas ni sincronización de Perfil.
function Root() {
  const [headless, setHeadless] = React.useState(checkHeadless ? null : false);
  React.useEffect(() => {
    let active = true;
    const subscription = checkHeadless ? AppState.addEventListener('change', state => {
      if (state === 'active') setHeadless(false);
    }) : null;
    void headlessLaunch.then(value => {
      if (active) setHeadless(AppState.currentState === 'active' ? false : value);
    }).catch(() => {
      if (active) setHeadless(false);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return headless === false ? <App /> : null;
}

registerRootComponent(Root);
