**Para generar el build de la aplicación (Preview - APK):**
```bash
export $(grep -v '^#' .env | xargs) && eas build --profile preview --platform android
```

**Para generar el build de Producción (App Bundle - AAB para Google Play):**
```bash
export $(grep -v '^#' .env | xargs) && eas build --profile production --platform android

export $(grep -v '^#' .env | xargs) && eas build --profile development --platform android
```