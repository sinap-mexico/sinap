import { Resend } from 'resend'

// Lazy-initialize Resend to avoid build-time errors when RESEND_API_KEY is not set.
// In Vercel serverless, env vars are available at request time, not build time.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY not set')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM_EMAIL = 'Sinap <no-reply@sinap-nine.vercel.app>'

/**
 * Send a generic email via Resend
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — email will not be sent')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Email] Failed to send:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Send password reset email with branded HTML template
 */
export async function sendPasswordResetEmail({ to, token }: { to: string; token: string }) {
  const resetUrl = `https://sinap-nine.vercel.app/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer contraseña — Sinap</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1D9E75 0%,#178A66 100%);padding:32px 40px 28px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Sinap</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Plataforma inteligente para clínicas</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:36px 40px 20px;">
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#2C2C2A;letter-spacing:-0.02em;">Restablece tu contraseña</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#888780;line-height:1.6;">
          Recibimos una solicitud para cambiar la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#534AB7 0%,#4A42A5 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.01em;box-shadow:0 4px 14px rgba(83,74,183,0.25);">
                Restablecer contraseña
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px;font-size:13px;color:#888780;line-height:1.6;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin:0 0 24px;font-size:12px;color:#534AB7;word-break:break-all;line-height:1.5;">
          ${resetUrl}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEFCE8;border-radius:8px;border:1px solid #FDE68A;">
          <tr>
            <td style="padding:12px 16px;font-size:12px;color:#92400E;line-height:1.5;">
              ⏱ Este enlace expirará en <strong>1 hora</strong> por seguridad. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña permanecerá sin cambios.
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px 28px;border-top:1px solid #E8E6DF;">
        <p style="margin:0 0 6px;font-size:11px;color:#888780;">
          Este correo fue enviado por Sinap. Si tienes dudas, contacta a soporte.
        </p>
        <p style="margin:0;font-size:11px;color:#B8B5AC;">
          © ${new Date().getFullYear()} Sinap · Todos los derechos reservados
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({ to, subject: 'Restablece tu contraseña — Sinap', html })
}

/**
 * Send welcome email (for future use after registration)
 */
export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>¡Bienvenido a Sinap!</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1D9E75 0%,#178A66 100%);padding:32px 40px 28px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Sinap</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Plataforma inteligente para clínicas</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:36px 40px 20px;">
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#2C2C2A;letter-spacing:-0.02em;">¡Bienvenido${name ? `, ${name}` : ''}! 🎉</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#888780;line-height:1.6;">
          Tu cuenta de Sinap ha sido creada exitosamente. Tienes <strong>7 días de prueba gratuita</strong> para explorar todas las funcionalidades de la plataforma.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 12px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#2C2C2A;">Esto es lo que puedes hacer:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888780;line-height:1.5;">
              <span style="color:#1D9E75;margin-right:8px;">✓</span> Gestionar citas y agenda inteligente
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888780;line-height:1.5;">
              <span style="color:#1D9E75;margin-right:8px;">✓</span> Directorio de pacientes con CRM
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888780;line-height:1.5;">
              <span style="color:#1D9E75;margin-right:8px;">✓</span> Notas clínicas SOAP con IA
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#888780;line-height:1.5;">
              <span style="color:#1D9E75;margin-right:8px;">✓</span> Facturación CFDI 4.0
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            <td align="center">
              <a href="https://sinap-nine.vercel.app/dashboard" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#534AB7 0%,#4A42A5 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.01em;box-shadow:0 4px 14px rgba(83,74,183,0.25);">
                Ir a mi panel
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px 28px;border-top:1px solid #E8E6DF;">
        <p style="margin:0 0 6px;font-size:11px;color:#888780;">
          Este correo fue enviado por Sinap. Si tienes dudas, contacta a soporte.
        </p>
        <p style="margin:0;font-size:11px;color:#B8B5AC;">
          © ${new Date().getFullYear()} Sinap · Todos los derechos reservados
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({ to, subject: '¡Bienvenido a Sinap! 🎉', html })
}
