import { registerRootComponent } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import App from './App';

if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  // El sistema muestra el aviso en segundo plano; no se ejecuta UI en el handler.
  setBackgroundMessageHandler(getMessaging(), async () => {});
}

registerRootComponent(App);
