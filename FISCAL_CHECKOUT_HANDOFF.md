# Checkout móvil y facturación ARCA

Actualizado: 10/11/2026.

El backend de BOBIARE conserva en cada ítem del carrito `fiscal_concept_snapshot` (`goods` o `service`). La app ahora usa ese dato para pedir el período de prestación cuando hay al menos un servicio. En el checkout también permite indicar DNI/CUIT, nombre y condición frente al IVA. El servidor decide la letra A/B con la condición IVA, informa `Concepto` 1/2/3 a ARCA y exige el total pagado antes de pedir CAE.

Para servicios, `service_start_date` y `service_end_date` deben ser fechas reales acordadas con BOBIARE, en formato `AAAA-MM-DD`; no se deben inventar ni tomar automáticamente del día del cobro. ARCA exige ese período para los conceptos 2 y 3. Si el negocio solo puede definirlo cuando recibe la pieza, el flujo de pago de servicios necesita una decisión comercial antes de publicar la app.

El artículo «TEST - Pago de $1 (Mercado Pago)» se bloqueó para nuevas compras. La Factura B real del pedido #347 ya fue autorizada y enviada por correo; no volver a emitirla.

Después de incorporar estos cambios a la próxima APK/IPA, probar en un dispositivo: compra de bien físico sin documento (Factura B), compra con CUIT y condición IVA correcta, pedido de servicio con período acordado, visualización/descarga de factura. La emisión real global depende de `AFIP_ENVIRONMENT=produccion` en el backend; comprobar ese valor con el responsable del despliegue antes de probar con dinero real.
