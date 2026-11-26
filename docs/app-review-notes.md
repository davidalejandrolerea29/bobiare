# App Review Notes — Bobiare 1.0.1 (iOS)

Paste the "Notes" section below into App Store Connect → App Review Information.
The demo password is entered only in App Store Connect (it is intentionally not stored in this repository).

---

## Notes for the reviewer

**What the app does and for whom**
Bobiare is the mobile app of a repair and restoration workshop in Argentina. Customers in Argentina use it to:
1. Take or choose a photo of a damaged item (piece) so the app identifies it and suggests a repair service.
2. Browse the catalog of repair services and related products, add them to the cart and place an order.
3. Pay the order with Mercado Pago (real-world physical service / goods; no digital content is sold).
4. Send the item to the workshop, load the shipping tracking number and follow the order status until it is returned.
5. Download the electronic invoice issued to them (Argentine tax authority ARCA, formerly AFIP).

**Devices**: iPhone (iOS). The app is not designed for iPad.

**Demo account**
- Email: `david@gmail.com`
- Password: provided in the App Review Information "Password" field.
- The account has the "Cliente" (customer) role, the same role any new user gets.

**How to test**
1. Launch the app. The catalog can be browsed without logging in ("Ver catálogo sin iniciar sesión").
2. Log in with the demo account on the login screen, or create a new account with "Crear una cuenta" (email + password), "Sign in with Apple" or "Continuar con Google".
3. Photo identification: open "Identificar pieza" (photo identification) from the home screen. iOS will ask for camera or photo-library permission only at that moment. The photo is sent to our server for identification.
4. Add a service or product to the cart and go to checkout. For repair services, payment is enabled once the workshop receives the item and agrees dates, so the reviewer can see the order flow without paying. For products, checkout opens Mercado Pago's payment page; there is no need to complete a real payment.
5. "Mis pedidos" shows orders, shipments and invoices.
6. **Forgot password**: login screen → "¿Olvidaste tu contraseña?" → enter the email → a 6-digit code is emailed → enter the code and a new password.
7. **Account deletion**: Profile tab → "Eliminar cuenta" (bottom of the screen) → confirm. The account is deleted immediately and the session is closed. We suggest testing deletion with a newly created account so the demo account remains available. Instructions are also published at https://bobiare.n7softwares.com/eliminar-cuenta.

**Privacy policy and terms**
- Privacy policy: https://bobiare.n7softwares.com/privacidad
- Terms: https://bobiare.n7softwares.com/terminos
Both are linked from the login screen, the registration screen and the Profile tab.

**External services**
- Mercado Pago: payment processing for physical repair services/goods (Guideline 3.1.3(e) / 3.1.5).
- Firebase (Google): push notifications about order status, and Google Sign-In.
- Sign in with Apple: offered on iOS next to Google Sign-In (Guideline 4.8).
- ARCA (Argentine tax authority): electronic invoices for paid orders.
- AI image analysis (Anthropic Claude, called from our backend): identifies the item in the user's photo.
- Resend: transactional email (password reset codes, order status, invoices).

**Regional differences**
The service operates only in Argentina: the UI is in Spanish (Argentina), prices are in ARS, invoices follow ARCA rules, and shipping uses Correo Argentino. The app works the same in every region, but orders can only be fulfilled in Argentina.

**Support**: WhatsApp +54 9 11 3056-5543 (also linked in the Profile tab).

---

## Video (to attach in App Store Connect)
Record on a physical iPhone, showing in one take:
1. Register a new account (and Sign in with Apple).
2. Log out and log in with the demo account.
3. Photo identification, accepting the camera and photo permission prompts.
4. Cart → checkout → Mercado Pago payment page.
5. Forgot password flow.
6. Profile → Eliminar cuenta → confirm, ending on the logged-out catalog.
