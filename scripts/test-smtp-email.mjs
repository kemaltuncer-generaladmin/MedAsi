#!/usr/bin/env node
// Test SMTP E-posta Gönderme Script
// Çalıştırma: node scripts/test-smtp-email.mjs

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
} = process.env;

async function sendTestEmail() {
  try {
    console.log("📧 SMTP Test E-posta Gönderiliyor...\n");

    // SMTP Transporter Oluştur
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_SECURE === "true",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    // E-posta İçeriği
    const mailOptions = {
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: "kemal.tuncer@medasi.com.tr",
      subject: "✅ MedAsi SMTP Test E-postası",
      html: `
        <!doctype html>
        <html lang="tr">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>SMTP Test</title>
          </head>
          <body style="margin:0;padding:0;background:#0a0e27;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e27;padding:24px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111827;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
                    <tr>
                      <td style="padding:36px 24px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-bottom:1px solid #1f2937;text-align:center;">
                        <div style="font-size:30px;font-weight:800;letter-spacing:-0.5px;color:#06b6d4;">MedAsi</div>
                        <div style="margin-top:10px;color:#f1f5f9;font-size:22px;font-weight:700;">SMTP Test E-postası</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px 24px;color:#cbd5e1;font-size:14px;line-height:1.75;">
                        <p style="margin:0 0 16px 0;color:#f1f5f9;">Merhaba,</p>
                        <p style="margin:0 0 14px 0;">Bu test e-postası MedAsi SMTP sistemi başarıyla çalıştığını gösteriyor! 🎉</p>
                        
                        <div style="margin:20px 0;padding:18px;border:1px solid #1f2937;border-radius:8px;background:#0f172a;">
                          <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;font-weight:600;">SMTP Bilgileri:</div>
                          <div style="font-size:12px;color:#cbd5e1;font-family:monospace;">
                            <div>Host: ${SMTP_HOST}</div>
                            <div>Port: ${SMTP_PORT}</div>
                            <div>Gönderici: ${EMAIL_FROM}</div>
                            <div>Alıcı: kemal.tuncer@medasi.com.tr</div>
                            <div>Tarih: ${new Date().toLocaleString("tr-TR")}</div>
                          </div>
                        </div>

                        <p style="margin:18px 0 0 0;padding:12px;border-left:3px solid #06b6d4;background:#0f172a;border-radius:4px;font-size:12px;color:#94a3b8;">
                          ✅ System is working correctly!
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 24px;background:#0f172a;border-top:1px solid #1f2937;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                        <div>© ${new Date().getFullYear()} MedAsi</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: "SMTP test e-postası başarıyla gönderildi!",
    };

    // E-postayı Gönder
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ E-posta başarıyla gönderildi!");
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`🎯 Alıcı: kemal.tuncer@medasi.com.tr`);
    console.log(`⏰ Tarih: ${new Date().toLocaleString("tr-TR")}`);
    console.log("\n📬 Lütfen e-posta kutunuzu kontrol edin...\n");
  } catch (error) {
    console.error("❌ Hata oluştu:");
    console.error(error.message);
    process.exit(1);
  }
}

// Çalıştır
sendTestEmail();
