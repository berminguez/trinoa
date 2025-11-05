# Configuración de Email SMTP para Recuperación de Contraseña

## ✅ Estado de la Implementación

- ✅ Configuración de email con nodemailerAdapter
- ✅ Recuperación de contraseña (Forgot Password)
- ✅ Cambio de contraseña (autenticado)
- ✅ Build exitoso sin errores de TypeScript
- ✅ Templates de email HTML personalizados

## Variables de Entorno Requeridas

Añade las siguientes variables a tu archivo `.env` para habilitar el sistema de recuperación de contraseña y notificaciones por email:

```bash
# ============================================
# CONFIGURACIÓN DE EMAIL SMTP
# ============================================

# Host del servidor SMTP (ejemplo: smtp.gmail.com, smtp.office365.com, etc.)
SMTP_HOST=smtp.ejemplo.com

# Puerto del servidor SMTP
# - 587: TLS (recomendado)
# - 465: SSL
# - 25: Sin cifrado (no recomendado)
SMTP_PORT=587

# Usuario/email para autenticación SMTP
SMTP_USER=tu-email@ejemplo.com

# Contraseña del usuario SMTP
# Nota: Para Gmail, usa una "Contraseña de aplicación" en lugar de tu contraseña normal
SMTP_PASS=tu-contraseña-smtp

# Usar conexión segura (true para puerto 465, false para 587)
SMTP_SECURE=false

# Email que aparecerá como remitente
SMTP_FROM_EMAIL=noreply@trinoa.app

# Nombre que aparecerá como remitente
SMTP_FROM_NAME=Trinoa

# URL base del servidor (necesaria para generar enlaces de recuperación)
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## Configuraciones por Proveedor

### Gmail

1. Habilita la verificación en 2 pasos en tu cuenta de Google
2. Genera una "Contraseña de aplicación" en: https://myaccount.google.com/apppasswords
3. Usa esa contraseña en `SMTP_PASS`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicación
SMTP_SECURE=false
```

### Office 365/Outlook

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
SMTP_SECURE=false
```

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=TU_API_KEY_DE_SENDGRID
SMTP_SECURE=false
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASS=TU_SMTP_PASSWORD_DE_MAILGUN
SMTP_SECURE=false
```

## Funcionalidades Implementadas

### 1. Recuperación de Contraseña (Forgot Password)

- **Página de Login**: Incluye un enlace "¿Olvidaste tu contraseña?"
- **Proceso**:
  1. Usuario ingresa su email
  2. Sistema envía un correo con un enlace de recuperación
  3. El enlace tiene validez de 1 hora
  4. Usuario crea nueva contraseña desde `/reset-password`

### 2. Cambio de Contraseña (Autenticado)

- **Ubicación**: Página de cuenta del usuario (`/account`)
- **Proceso**:
  1. Usuario hace clic en el botón de cambiar contraseña
  2. Se abre un modal con un formulario
  3. Debe ingresar contraseña actual y nueva contraseña
  4. La contraseña se actualiza inmediatamente

## Archivos Creados/Modificados

### Server Actions
- `src/actions/auth/forgot-password.ts` - Solicitar recuperación de contraseña
- `src/actions/auth/reset-password.ts` - Resetear contraseña con token
- `src/actions/auth/change-password.ts` - Cambiar contraseña estando autenticado

### Componentes
- `src/components/change-password-modal.tsx` - Modal para cambio de contraseña
- `src/components/forgot-password-dialog.tsx` - Diálogo para recuperación
- `src/app/(frontend)/reset-password/page.tsx` - Página de reset
- `src/app/(frontend)/reset-password/components/ResetPasswordForm.tsx` - Formulario de reset

### Configuración
- `src/lib/email.ts` - Configuración de nodemailer
- `src/payload.config.ts` - Configuración de email en PayloadCMS
- `src/collections/Users.ts` - Habilitado forgotPassword con email personalizado

### UI
- `src/components/login-form.tsx` - Añadido enlace de recuperación
- `src/app/(frontend)/(private)/account/components/AccountSettings.tsx` - Añadido botón de cambio

## Testing

### Recuperación de Contraseña

1. Ve a la página de login (`/login`)
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa un email registrado
4. Revisa el correo recibido
5. Haz clic en el enlace del correo
6. Crea una nueva contraseña
7. Inicia sesión con la nueva contraseña

### Cambio de Contraseña

1. Inicia sesión en la aplicación
2. Ve a "Mi Cuenta" (`/account`)
3. En la sección "Configuración de Cuenta", haz clic en el icono de llave
4. Ingresa tu contraseña actual y la nueva contraseña
5. Confirma la nueva contraseña
6. Haz clic en "Cambiar Contraseña"
7. Cierra sesión e inicia sesión con la nueva contraseña

## Seguridad

- Los tokens de recuperación expiran en 1 hora
- Las contraseñas deben tener mínimo 8 caracteres
- Los emails de recuperación siempre muestran mensaje de éxito (para evitar enumerar usuarios)
- Las contraseñas se hashean usando bcrypt automáticamente por PayloadCMS
- El cambio de contraseña requiere conocer la contraseña actual

## Personalización del Email

El template del email se puede personalizar editando el método `generateEmailHTML` en `src/collections/Users.ts`.

El email actual incluye:
- Header con gradiente
- Botón principal de acción
- Enlace de backup por si el botón no funciona
- Advertencia de expiración en 1 hora
- Footer con información de copyright

## Troubleshooting

### El email no se envía

1. Verifica que las variables de entorno estén configuradas correctamente
2. Revisa los logs del servidor para ver errores específicos
3. Verifica que tu proveedor SMTP permita el acceso desde tu IP
4. Para Gmail, asegúrate de usar una "Contraseña de aplicación"

### El enlace de recuperación no funciona

1. Verifica que `NEXT_PUBLIC_SERVER_URL` apunte a tu dominio correcto
2. Asegúrate de que el token no haya expirado (1 hora)
3. El token solo funciona una vez, solicita uno nuevo si es necesario

### Error al cambiar contraseña

1. Verifica que la contraseña actual sea correcta
2. La nueva contraseña debe tener al menos 8 caracteres
3. La nueva contraseña debe ser diferente a la actual

## Producción

Para producción, asegúrate de:

1. Usar un dominio real en `NEXT_PUBLIC_SERVER_URL`
2. Configurar `SMTP_FROM_EMAIL` con un email verificado
3. Usar credenciales SMTP de un servicio confiable (SendGrid, Mailgun, etc.)
4. Habilitar SSL/TLS en tu servidor SMTP
5. Considerar rate limiting para prevenir abuso
6. Monitorear los logs de email para detectar problemas

## Soporte

Si necesitas ayuda con la configuración, consulta:
- Documentación de PayloadCMS: https://payloadcms.com/docs/email/overview
- Documentación de Nodemailer: https://nodemailer.com/

