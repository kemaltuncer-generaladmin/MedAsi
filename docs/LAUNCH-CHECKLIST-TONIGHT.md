# Medasi Tonight Launch Checklist

## 1. Zorunlu ortam değişkenleri
Aşağıdaki alanları production ortamında doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `INTERNAL_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAIL`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_STATE_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `WALLET_PURCHASES_ENABLED`
- `WALLET_PURCHASE_SECRET`
- `NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED`

Not:
- Ödeme webhook entegrasyonu henüz hazır değilse `WALLET_PURCHASES_ENABLED=false` bırakın.
- Frontend doğrudan satın alma akışı yoksa `NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED=false` bırakın.
- Secret üretmek için: `openssl rand -hex 32`

## 2. Veritabanı migration
Üretimde migration'ları çalıştırın:

```bash
npx prisma migrate deploy
```

## 3. Build ve smoke test

```bash
npm ci
npm run build
npm run start
```

Kontrol edin:
- Giriş / kayıt çalışıyor.
- `/api/wallet` 200 dönüyor.
- Wallet ekranında bakiye ve hareketler yükleniyor.
- Satın alma kapalıysa butonlar kapalı görünüyor.

## 4. Ödeme servisinden güvenli çağrı formatı
`/api/wallet/purchase` endpoint'i sadece secret header ile çalışır:

- Header: `x-wallet-purchase-secret: <WALLET_PURCHASE_SECRET>`
- Body: `{ "packageId": "...", "paymentIntentId": "...", "userId": "..." }`

Aynı `paymentIntentId` ikinci kez işlendiğinde endpoint `409` döner (idempotency).

## 5. Yayın sonrası ilk 30 dk izleme
Aşağıdakileri panel/log üzerinden izleyin:

- `billing` kategori logları (çift ödeme/başarısız ödeme)
- `ai` kategori logları (ani hata artışı)
- Hatalı 5xx oranı
- Token cüzdanında beklenmedik sıçrama olup olmadığı
