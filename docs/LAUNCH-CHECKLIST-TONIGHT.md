# Medasi Tonight Launch Checklist

## 1. Zorunlu ortam değişkenleri
Aşağıdaki alanları production ortamında doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `GEMINI_KEY_AI_CHAT`
- `GEMINI_KEY_MENTOR`
- `GEMINI_KEY_AKILLI_ASISTAN`
- `GEMINI_KEY_OSCE_GENERATE`
- `GEMINI_KEY_OSCE_MESSAGE`
- `GEMINI_KEY_OSCE_EVALUATE`
- `GEMINI_KEY_ANALYZE_LEARNING`
- `GEMINI_KEY_EMBEDDINGS`
- `GEMINI_KEY_ADMIN_AI`
- `GEMINI_SERVER_API_KEY` (önerilen birincil server key)
- `ALLOW_GLOBAL_GEMINI_KEY_FALLBACK` (`true` önerilir)
- `GEMINI_API_KEY` (server key/fallback)
- `INTERNAL_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAIL`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_STATE_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `WALLET_PURCHASES_ENABLED`
- `WALLET_PURCHASE_SECRET`
- `NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED`

Not:
- Ödeme webhook entegrasyonu henüz hazır değilse `WALLET_PURCHASES_ENABLED=false` bırakın.
- Frontend doğrudan satın alma akışı yoksa `NEXT_PUBLIC_WALLET_CLIENT_PURCHASE_ENABLED=false` bırakın.
- Secret üretmek için: `openssl rand -hex 32`
- Production secret değerlerini repo dosyalarında tutmayın; sadece platform secret manager üzerinden yönetin.
- Key rotasyonu sonrası eski Google/Gemini key’leri devre dışı bırakın.

## 1.1 Secret hijyeni

```bash
git config core.hooksPath .githooks
npm run secret:scan
```

Kontrol edin:
- Secret scan temiz geçiyor.
- Repo içinde `AIza`, `re_`, service-role JWT benzeri değerler bulunmuyor.

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

Not:
- `npm run build` artık varsayılan olarak `NODE_OPTIONS=--max-old-space-size=4096` ile çalışır.
- CI ortamında farklı bir değer gerekiyorsa `NODE_OPTIONS` override edebilirsiniz.

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
