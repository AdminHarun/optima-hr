# Plan: Cloudflare R2 Dosya Depolama Entegrasyonu

## Özet
Mevcut lokal dosya depolamayı Cloudflare R2 bulut depolama ile değiştireceğiz. R2, S3-uyumlu API kullandığı için AWS SDK kullanabiliriz.

---

## Değiştirilecek Dosyalar

### Backend
1. `backend-express/package.json` - AWS SDK ekleme
2. `backend-express/services/r2StorageService.js` - **YENİ**: R2 upload/download servisi
3. `backend-express/routes/applications.js` - Multer'ı R2 ile değiştir
4. `backend-express/routes/chat.js` - Chat dosyaları için R2
5. `backend-express/.env.production` - R2 credentials

### Frontend
6. `frontend/src/config/config.js` - R2 public URL ekle (opsiyonel)

---

## Adım 1: AWS SDK Kurulumu

```bash
cd backend-express
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Adım 2: R2 Storage Service (YENİ DOSYA)

`backend-express/services/r2StorageService.js`:

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'optima-hr-files';

module.exports = {
  async uploadFile(buffer, key, contentType) { ... },
  async getSignedDownloadUrl(key, expiresIn = 3600) { ... },
  async deleteFile(key) { ... },
  getPublicUrl(key) { ... }
};
```

---

## Adım 3: Multer Memory Storage

`routes/applications.js` değişikliği:

```javascript
// ESKİ: diskStorage
const storage = multer.diskStorage({ ... });

// YENİ: memoryStorage
const storage = multer.memoryStorage();
```

---

## Adım 4: Applications Route Güncelleme

Upload sonrası R2'ye yükleme:

```javascript
const r2 = require('../services/r2StorageService');

// Dosya yükleme
if (files.cv && files.cv[0]) {
  const file = files.cv[0];
  const key = `applications/cv/${formData.token}-${Date.now()}.pdf`;
  await r2.uploadFile(file.buffer, key, file.mimetype);
  fileUpdates.cv_file_path = key;  // R2 key sakla
  fileUpdates.cv_file_name = file.originalname;
}
```

---

## Adım 5: Chat Route Güncelleme

Aynı mantık:
- `multer.memoryStorage()` kullan
- Upload sonrası R2'ye yükle
- Download endpoint signed URL döndürsün

---

## Adım 6: Environment Variables

`.env.production` dosyasına eklenecek:

```env
R2_ACCOUNT_ID=<cloudflare_account_id>
R2_ACCESS_KEY_ID=<r2_api_token_access_key>
R2_SECRET_ACCESS_KEY=<r2_api_token_secret>
R2_BUCKET_NAME=optima-hr-files
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # Opsiyonel
```

---

## R2 Bucket Yapısı

```
optima-hr-files/
├── applications/
│   ├── cv/{token}-{timestamp}.pdf
│   ├── internet-test/{token}-{timestamp}.png
│   └── typing-test/{token}-{timestamp}.png
└── chat/
    └── {roomId}/{messageId}-{filename}
```

---

## Kullanıcı Aksiyonu Gerekli (Cloudflare Dashboard)

1. **R2 bucket oluştur:** `optima-hr-files`
2. **API Token oluştur:** R2 read/write izni ile
3. **Account ID'yi not al:** Dashboard URL'den veya Overview'dan

---

## Test Planı

1. Lokalde test: `npm run dev`
2. Curl ile dosya yükle
3. R2 Dashboard'da dosyanın oluştuğunu kontrol et
4. Frontend'den form gönder
5. Production'a deploy et

---

## Veritabanı Değişikliği

Mevcut path alanları artık R2 key'lerini saklayacak:
- **Eski:** `/Users/.../uploads/applications/token-cv-123.pdf`
- **Yeni:** `applications/cv/token-123.pdf`

Mevcut sütunlar (`cv_file_path`, `internet_test_file_path`, vb.) aynı kalacak, sadece içerik formatı değişecek.
