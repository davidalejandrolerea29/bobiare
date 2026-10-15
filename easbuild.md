Autenticarse con `eas login` o definir `EXPO_TOKEN` como secreto del entorno
de CI. No guardar ese token en Git.

**Para generar el build de la aplicación (Preview - APK):**
```bash
eas build --profile preview --platform android
```

**Para generar el build de Producción (App Bundle - AAB para Google Play):**
```bash
eas build --profile production --platform android

eas build --profile development --platform android
```
