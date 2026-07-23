# Contrato del analizador de piezas con IA

La aplicación consume por defecto:

```http
POST /api/v1/ai/analyze-piece
Authorization: Bearer <token>
Accept: application/json
Content-Type: multipart/form-data
```

El archivo se envía en el campo `image`. Se recomienda aceptar JPG, PNG y WebP,
limitar el tamaño a 8 MB y ejecutar el proveedor de IA exclusivamente desde el
backend. La clave del proveedor nunca debe incluirse en Expo ni en la APK.

Respuesta esperada:

```json
{
  "analysis": {
    "piece_name": "Llanta de motocicleta",
    "confidence": 0.94,
    "description": "Llanta de aleación con pintura deteriorada.",
    "detected_damage": ["Oxidación superficial", "Pintura deteriorada"],
    "suggested_service": "Granallado y pintura electrostática",
    "suggested_product_id": 12,
    "disclaimer": "La recomendación debe ser validada por un especialista."
  }
}
```

`confidence` puede devolverse entre 0 y 1 o entre 0 y 100. Si se devuelve
`suggested_product`, puede incluirse el producto completo con el mismo formato de
`GET /products/product/{id}`.

El endpoint puede cambiarse sin modificar código usando:

```bash
EXPO_PUBLIC_AI_ANALYSIS_PATH=/ai/analyze-piece
```

Errores sugeridos:

- `413`: imagen demasiado grande.
- `415`: formato no admitido.
- `422`: no se encontró una pieza analizable.
- `429`: límite temporal del proveedor de IA.
- `503`: proveedor de IA no disponible.
