import nodemailer from 'nodemailer'
import type { SendEmailOptions } from 'payload'

/**
 * Configuración del transportador de email usando nodemailer
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Función para enviar emails usando nodemailer
 */
export const sendEmail = async (message: SendEmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: message.from || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })

    console.log('[EMAIL] Email enviado exitosamente a:', message.to)
  } catch (error) {
    console.error('[EMAIL] Error al enviar email:', error)
    throw error
  }
}

/**
 * Verificar conexión con el servidor SMTP
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify()
    console.log('[EMAIL] Conexión SMTP verificada exitosamente')
    return true
  } catch (error) {
    console.error('[EMAIL] Error al verificar conexión SMTP:', error)
    return false
  }
}
