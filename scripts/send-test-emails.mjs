#!/usr/bin/env node
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM_NAME,
  EMAIL_FROM,
  SUPPORT_EMAIL,
  NEXT_PUBLIC_SITE_URL,
} = process.env;

function verificationHtml({ name, link, code }) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>E-posta Doğrulama</title>
  </head>
  <body style="margin:0;background:#0b1220;color:#cbd5e1;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="max-width:600px;width:100%;background:#0f1724;border-radius:12px;overflow:hidden;border:1px solid #111827;">
            <tr>
              <td style="padding:28px 24px;background:linear-gradient(90deg,#052f3f 0%,#08303b 100%);text-align:center;">
                <div style="font-weight:800;font-size:24px;color:#7dd3fc;">${EMAIL_FROM_NAME}</div>
                <div style="margin-top:6px;color:#e6eef5;font-size:16px;font-weight:700;">E-posta Doğrulama</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#e6eef5;">Merhaba <strong style="color:#7dd3fc;">${name}</strong>,</p>
                <p style="margin:0 0 18px 0;color:#cbd5e1;">Hesabınızı etkinleştirmek için aşağıdaki butona tıklayın. Bu bağlantı kısa süre sonra geçersiz olacaktır.</p>

                ${code ? `<div style="margin:18px 0 12px 0;padding:16px;border-radius:8px;background:#071827;border:1px solid #0b2a3a;text-align:center;"><div style="font-size:12px;color:#94a3b8;margin-bottom:6px;font-weight:700;">Doğrulama Kodu</div><div style="font-family:SFMono-Regular,Consolas,monospace;font-size:28px;color:#7dd3fc;font-weight:800;letter-spacing:2px;">${code}</div></div>` : ""}

                <div style="text-align:center;margin:20px 0;">
                  <a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(90deg,#06b6d4,#0891b2);color:#04131f;text-decoration:none;font-weight:800;">E-postamı Doğrula</a>
                </div>

                <p style="margin:0 0 6px 0;color:#94a3b8;font-size:13px;">Buton çalışmazsa aşağıdaki bağlantıyı kopyalayarak tarayıcıya yapıştırın:</p>
                <p style="margin:0 0 0 0;font-size:13px;color:#7c93a6;word-break:break-all;">${link}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#071122;color:#94a3b8;font-size:12px;text-align:center;">
                <div>Yardım: <a href="mailto:${SUPPORT_EMAIL}" style="color:#7dd3fc;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
                <div style="margin-top:8px;color:#6b7280;">© ${new Date().getFullYear()} ${EMAIL_FROM_NAME} — <a href="${NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/privacy" style="color:#7c93a6;text-decoration:none;">Gizlilik</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function resetHtml({ link }) {
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Şifre Sıfırlama</title>
  </head>
  <body style="margin:0;background:#0b1220;color:#cbd5e1;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" style="max-width:600px;width:100%;background:#0f1724;border-radius:12px;overflow:hidden;border:1px solid #111827;">
            <tr>
              <td style="padding:28px 24px;background:linear-gradient(90deg,#3b0f32 0%,#1f1140 100%);text-align:center;">
                <div style="font-weight:800;font-size:24px;color:#f472b6;">${EMAIL_FROM_NAME}</div>
                <div style="margin-top:6px;color:#f8eef8;font-size:16px;font-weight:700;">Şifre Sıfırlama Talebi</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#e6eef5;">Merhaba,</p>
                <p style="margin:0 0 18px 0;color:#cbd5e1;">Şifrenizi sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak güvenli bir şekilde yeni şifre oluşturabilirsiniz.</p>

                <div style="text-align:center;margin:20px 0;">
                  <a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(90deg,#f472b6,#f43f5e);color:#04131f;text-decoration:none;font-weight:800;">Şifremi Sıfırla</a>
                </div>

                <p style="margin:0 0 6px 0;color:#94a3b8;font-size:13px;">Buton çalışmazsa bağlantıyı kopyalayın:</p>
                <p style="margin:0 0 0 0;font-size:13px;color:#7c93a6;word-break:break-all;">${link}</p>

                <div style="margin-top:18px;padding:12px;border-left:3px solid #f472b6;background:#071122;border-radius:4px;font-size:12px;color:#94a3b8;">
                  Eğer bu isteği siz yapmadıysanız, lütfen parolanızı hemen güncelleyin ve <a href="mailto:${SUPPORT_EMAIL}" style="color:#f472b6;text-decoration:none;">${SUPPORT_EMAIL}</a> ile iletişime geçin.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#071122;color:#94a3b8;font-size:12px;text-align:center;">
                <div>Yardım: <a href="mailto:${SUPPORT_EMAIL}" style="color:#f472b6;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
                <div style="margin-top:8px;color:#6b7280;">© ${new Date().getFullYear()} ${EMAIL_FROM_NAME} — <a href="${NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/privacy" style="color:#7c93a6;text-decoration:none;">Gizlilik</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function run() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587"),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  // Verification
  const verificationLink = `${NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/verify?token=test-verification-token`;
  const verificationCode = "123456";
  const verifyMail = {
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
    to: "kemal.tuncer@medasi.com.tr",
    subject: "[MedAsi] E-posta Doğrulama",
    html: verificationHtml({ name: "Kemal Tuncer", link: verificationLink, code: verificationCode }),
  };

  // Password reset
  const resetLink = `${NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset?token=test-reset-token`;
  const resetMail = {
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
    to: "kemal.tuncer@medasi.com.tr",
    subject: "[MedAsi] Şifre Sıfırlama",
    html: resetHtml({ link: resetLink }),
  };

  try {
    console.log("Gönderiliyor: doğrulama e-postası...");
    const info1 = await transporter.sendMail(verifyMail);
    console.log("Doğrulama gönderildi:", info1.messageId);

    console.log("Gönderiliyor: şifre sıfırlama e-postası...");
    const info2 = await transporter.sendMail(resetMail);
    console.log("Şifre sıfırlama gönderildi:", info2.messageId);

    console.log("Tüm test e-postaları gönderildi.");
  } catch (err) {
    console.error("Hata gönderilirken:", err);
    process.exit(1);
  }
}

run();
