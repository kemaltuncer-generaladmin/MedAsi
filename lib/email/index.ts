import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Medasi\'ye Hoş Geldin',
    html: `<p>Merhaba <strong>${name}</strong>, Medasi'ye hoş geldin!</p>`,
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: 'Şifre Sıfırlama',
    html: `<p>Şifreni sıfırlamak için <a href="${resetUrl}">tıkla</a>.</p>`,
  })
}
