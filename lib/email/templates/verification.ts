type VerificationTemplateParams = {
  name?: string | null;
  verificationLink: string;
  verificationCode?: string | null;
  fromName: string;
  supportEmail: string;
  siteUrl: string;
};

export function buildVerificationTemplate(params: VerificationTemplateParams) {
  const { name, verificationLink, verificationCode, fromName, supportEmail, siteUrl } = params;
  const displayName = name || "MedAsi kullanıcısı";
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
                <div style="font-weight:800;font-size:24px;color:#7dd3fc;">${fromName}</div>
                <div style="margin-top:6px;color:#e6eef5;font-size:16px;font-weight:700;">E-posta Doğrulama</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#e6eef5;">Merhaba <strong style="color:#7dd3fc;">${displayName}</strong>,</p>
                <p style="margin:0 0 18px 0;color:#cbd5e1;">Hesabınızı etkinleştirmek için aşağıdaki butona tıklayın. Bu bağlantı kısa süre sonra geçersiz olacaktır.</p>

                ${verificationCode ? `<div style="margin:18px 0 12px 0;padding:16px;border-radius:8px;background:#071827;border:1px solid #0b2a3a;text-align:center;"><div style="font-size:12px;color:#94a3b8;margin-bottom:6px;font-weight:700;">Doğrulama Kodu</div><div style="font-family:SFMono-Regular,Consolas,monospace;font-size:28px;color:#7dd3fc;font-weight:800;letter-spacing:2px;">${verificationCode}</div></div>` : ""}

                <div style="text-align:center;margin:20px 0;">
                  <a href="${verificationLink}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(90deg,#06b6d4,#0891b2);color:#04131f;text-decoration:none;font-weight:800;">E-postamı Doğrula</a>
                </div>

                <p style="margin:0 0 6px 0;color:#94a3b8;font-size:13px;">Buton çalışmazsa aşağıdaki bağlantıyı kopyalayarak tarayıcıya yapıştırın:</p>
                <p style="margin:0 0 0 0;font-size:13px;color:#7c93a6;word-break:break-all;">${verificationLink}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#071122;color:#94a3b8;font-size:12px;text-align:center;">
                <div>Yardım: <a href="mailto:${supportEmail}" style="color:#7dd3fc;text-decoration:none;">${supportEmail}</a></div>
                <div style="margin-top:8px;color:#6b7280;">© ${new Date().getFullYear()} ${fromName} — <a href="${siteUrl}/privacy" style="color:#7c93a6;text-decoration:none;">Gizlilik</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default buildVerificationTemplate;
