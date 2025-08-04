# Guía de Configuración de Stripe para Eidetik

Esta guía te ayudará a configurar Stripe Checkout y las suscripciones en tu proyecto Eidetik.

## 1. Configuración inicial en Stripe Dashboard

### Paso 1: Crear los Productos

Ve a tu dashboard de Stripe y crea los siguientes productos:

#### Producto Free (Referencia)
- **Nombre**: Plan Free
- **ID**: `prod_SjYFreeExample` (actualizar en variables de entorno)
- **Descripción**: Plan gratuito con funcionalidades básicas
- **Precio**: No crear precio (es gratuito)

#### Producto Basic
- **Nombre**: Plan Basic  
- **ID**: `prod_SjYC4IXeXTz7Wx`
- **Descripción**: Plan básico para usuarios ocasionales
- **Precio**: $9.99/mes (recurrente mensual)
- **ID del Precio**: Copia este ID para `STRIPE_PRICE_BASIC`

#### Producto Pro
- **Nombre**: Plan Pro
- **ID**: `prod_SjYK6cyeSoaqV1`
- **Descripción**: Plan profesional para uso intensivo
- **Precio**: $29.99/mes (recurrente mensual)
- **ID del Precio**: Copia este ID para `STRIPE_PRICE_PRO`

### Paso 2: Configurar Webhooks

1. Ve a **Developers > Webhooks** en tu dashboard de Stripe
2. Haz clic en "Add endpoint"
3. **URL del endpoint**: `https://tu-dominio.com/api/webhooks/stripe`
4. **Eventos a escuchar**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Copia el signing secret** para `STRIPE_WEBHOOK_SECRET`

## 2. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret

# IDs de Productos de Stripe
STRIPE_PRODUCT_FREE=prod_SjYFreeExample
STRIPE_PRODUCT_BASIC=prod_SjYC4IXeXTz7Wx
STRIPE_PRODUCT_PRO=prod_SjYK6cyeSoaqV1

# IDs de Precios de Stripe
STRIPE_PRICE_BASIC=price_tu_precio_basic
STRIPE_PRICE_PRO=price_tu_precio_pro

# URL del sitio (para redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Regenerar tipos de PayloadCMS

Después de instalar las dependencias, regenera los tipos:

```bash
pnpm generate:types
```

## 4. Configuración para Producción

### Variables de entorno de producción:
```env
STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave_publica_live
STRIPE_SECRET_KEY=sk_live_tu_clave_secreta_live
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_live
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

### Webhook de producción:
- URL: `https://tu-dominio.com/api/webhooks/stripe`
- Asegúrate de que los mismos eventos estén configurados

## 5. Funcionalidades Implementadas

### ✅ Páginas y Componentes
- `/pricing` - Página de planes de suscripción
- `/pricing/success` - Página de éxito después del checkout
- Componentes para mostrar planes y uso actual

### ✅ Server Actions
- `createSubscriptionCheckout()` - Crear sesión de checkout
- `getUserSubscription()` - Obtener suscripción del usuario
- Manejo de límites y uso

### ✅ Webhook Handlers
- Checkout completado
- Suscripción creada/actualizada/cancelada
- Pagos exitosos/fallidos
- Reset automático de contadores

### ✅ Colección PayloadCMS
- `subscriptions` - Gestión de suscripciones
- Límites por plan
- Seguimiento de uso
- Facturación variable (Plan Pro)

## 6. Estructura de Planes

### Plan Free
- 3 videos por mes
- 50 mensajes de chat por mes
- 1GB de almacenamiento
- Sin costo

### Plan Basic ($9.99/mes)
- 25 videos por mes
- 500 mensajes de chat por mes
- 10GB de almacenamiento
- Análisis completo

### Plan Pro ($29.99/mes)
- Videos ilimitados
- Mensajes ilimitados
- 100GB de almacenamiento
- **Facturación variable**:
  - $0.50 por video adicional sobre límite base
  - $0.10 por GB adicional de almacenamiento

## 7. Flujo de Usuario

1. **Usuario visita `/pricing`** → Ve los planes disponibles
2. **Hace click en "Suscribirse"** → Se ejecuta `createSubscriptionCheckout()`
3. **Redirige a Stripe Checkout** → Usuario completa el pago
4. **Stripe envía webhooks** → Se crea/actualiza la suscripción en la DB
5. **Usuario regresa a `/pricing/success`** → Confirmación de éxito
6. **Puede ver su plan actual** → En `/pricing` o `/dashboard`

## 8. Testing

### Tarjetas de prueba de Stripe:
- **Éxito**: `4242 4242 4242 4242`
- **Fallo**: `4000 0000 0000 0002`
- **Requiere 3DS**: `4000 0025 0000 3155`

### Testing de webhooks:
1. Usa Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. O configura ngrok para exponer tu localhost

## 9. Monitoreo

### Logs importantes:
- Webhooks de Stripe en `/api/webhooks/stripe`
- Creación de checkout en server actions
- Errores de suscripción en PayloadCMS

### Dashboard de Stripe:
- Monitorea pagos y suscripciones
- Revisa webhooks exitosos/fallidos
- Gestiona reembolsos si es necesario

## 10. Seguridad

- ✅ Webhook signature verification
- ✅ User authentication required
- ✅ Server-side validation
- ✅ Secure environment variables
- ✅ Rate limiting (heredado del proyecto)

## Siguiente Pasos

1. **Configura los productos y precios** en Stripe Dashboard
2. **Actualiza las variables de entorno** con los IDs reales
3. **Regenera los tipos** de PayloadCMS
4. **Prueba el flujo completo** con tarjetas de prueba
5. **Configura el webhook** para producción

¡Tu sistema de suscripciones con Stripe está listo! 🎉 