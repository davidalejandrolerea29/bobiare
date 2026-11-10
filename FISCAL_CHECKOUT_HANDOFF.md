# Checkout móvil y facturación ARCA

Actualizado: 10/11/2026.

El backend de BOBIARE conserva en cada ítem del carrito `fiscal_concept_snapshot` (`goods` o `service`). En el checkout se puede indicar DNI/CUIT, nombre y condición frente al IVA. El servidor decide la letra A/B con la condición IVA, informa `Concepto` 1/2/3 a ARCA y exige el total pagado antes de pedir CAE.

Para servicios, el cliente confirma el pedido y envía la pieza sin pagar. El plazo del catálogo es estimado. Tras recibirla, el taller acuerda el período real, lo carga en admin y recién ahí se habilita el pago total con Mercado Pago. `service_start_date` y `service_end_date` son fechas reales del trabajo, en formato `AAAA-MM-DD`; no se inventan ni se derivan del día del cobro. Los carritos mixtos siguen este mismo flujo. La API devuelve `has_service`, `piece_received_at` y `payment_ready` para controlar las pantallas. Después del cobro, el backend solicita CAE, envía correo con PDF y la app ofrece descargarlo.

El artículo «TEST - Pago de $1 (Mercado Pago)» se bloqueó para nuevas compras. La Factura B real del pedido #347 ya fue autorizada y enviada por correo; no volver a emitirla.

Después de incorporar estos cambios a la próxima APK/IPA, probar en un dispositivo: bien físico con pago inmediato, servicio sin botón de pago al crear el pedido, carga de tracking, recepción y fechas desde admin, aparición del botón de pago, factura y PDF tras acreditación. Para iOS sigue pendiente APNs. El backend ya tiene `AFIP_ENVIRONMENT=produccion` y emisión automática real; toda prueba que se pague debe corresponder a una venta verdadera.
