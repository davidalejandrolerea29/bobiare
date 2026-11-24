const fs = require('node:fs');
const path = require('node:path');
const {IOSConfig} = require('expo/config-plugins');

// Expo carga .env antes de evaluar este archivo. Los IDs OAuth son públicos.
module.exports = ({config}) => {
  let androidWebClientId;
  if (config.android?.googleServicesFile) {
    const services = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, config.android.googleServicesFile),
        'utf8',
      ),
    );
    const androidClient = services.client?.find(
      client =>
        client.client_info?.android_client_info?.package_name ===
        config.android.package,
    );
    androidWebClientId = androidClient?.oauth_client?.find(
      client => client.client_type === 3,
    )?.client_id;
  }

  const reversedClientId = IOSConfig.Google.getGoogleSignInReversedClientId(
    config,
    {projectRoot: __dirname},
  );
  const plistIosClientId = reversedClientId?.startsWith(
    'com.googleusercontent.apps.',
  )
    ? `${reversedClientId.slice(
        'com.googleusercontent.apps.'.length,
      )}.apps.googleusercontent.com`
    : undefined;
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || androidWebClientId;
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || plistIosClientId;
  for (const [name, id] of Object.entries({
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: webClientId,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: iosClientId,
  })) {
    if (id && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) {
      throw new Error(`${name} debe ser un ID OAuth válido.`);
    }
  }

  const googlePlugin = iosClientId
    ? [
        'react-native-nitro-google-signin',
        {
          iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(
            '.apps.googleusercontent.com',
            '',
          )}`,
        },
      ]
    : 'react-native-nitro-google-signin';

  return {
    ...config,
    plugins: [...(config.plugins || []), googlePlugin],
    extra: {...config.extra, googleSignIn: {webClientId, iosClientId}},
  };
};
