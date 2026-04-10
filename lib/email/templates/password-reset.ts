type PasswordResetTemplateParams = {
  resetUrl: string;
  fromName: string;
  supportEmail: string;
  siteUrl: string;
};

export function buildPasswordResetTemplate(params: PasswordResetTemplateParams) {
  const { resetUrl, fromName, supportEmail, siteUrl } = params;
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
                <div style="font-weight:800;font-size:24px;color:#f472b6;">${fromName}</div>
                <div style="margin-top:6px;color:#f8eef8;font-size:16px;font-weight:700;">Şifre Sıfırlama Talebi</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#e6eef5;">Merhaba,</p>
                <p style="margin:0 0 18px 0;color:#cbd5e1;">Şifrenizi sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak güvenli bir şekilde yeni şifre oluşturabilirsiniz.</p>

                <div style="text-align:center;margin:20px 0;">
                  <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:linear-gradient(90deg,#f472b6,#f43f5e);color:#04131f;text-decoration:none;font-weight:800;">Şifremi Sıfırla</a>
                </div>

                <p style="margin:0 0 6px 0;color:#94a3b8;font-size:13px;">Buton çalışmazsa bağlantıyı kopyalayın:</p>
                <p style="margin:0 0 0 0;font-size:13px;color:#7c93a6;word-break:break-all;">${resetUrl}</p>

                <div style="margin-top:18px;padding:12px;border-left:3px solid #f472b6;background:#071122;border-radius:4px;font-size:12px;color:#94a3b8;">
                  Eğer bu isteği siz yapmadıysanız, lütfen parolanızı hemen güncelleyin ve <a href="mailto:${supportEmail}" style="color:#f472b6;text-decoration:none;">${supportEmail}</a> ile iletişime geçin.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px;background:#071122;color:#94a3b8;font-size:12px;text-align:center;">
                <div>Yardım: <a href="mailto:${supportEmail}" style="color:#f472b6;text-decoration:none;">${supportEmail}</a></div>
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

export default buildPasswordResetTemplate;
