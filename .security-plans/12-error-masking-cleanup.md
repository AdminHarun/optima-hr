# 12 — Hata Mesajı Maskeleme ve Phantom Endpoint Temizliği

## Konu Açıklaması

API'nin döndürdüğü hata mesajları ve HTTP status kodları, saldırganlara sistem hakkında bilgi verebilir. Endpoint varlığını gizlemek, hata mesajlarını standardize etmek ve kullanılmayan endpoint referanslarını temizlemek bu planın kapsamındadır.

## Mevcut Durum

### Hata Mesajı Sorunları:

```javascript
// requireAuth.js — şu an
return res.status(401).json({ success: false, error: 'Yetkilendirme gerekli — token bulunamadı' });
return res.status(401).json({ success: false, error: 'Oturum süresi dolmuş' });
return res.status(401).json({ success: false, error: 'Geçersiz token' });

// requireRole — şu an
return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz yok' });
```

### Bu neden sorun?

1. **401 Unauthorized** → "Bu endpoint var ama yetkin yok" — endpoint keşfi
2. **403 Forbidden** → "Token'ın doğru ama rolün yetersiz" — bilgi sızdırma
3. **Detaylı mesajlar** → "token bulunamadı" vs "geçersiz token" → saldırı vektörü daraltma
4. **Farklı status kodları** → 401 vs 403 → yetki seviyesi hakkında bilgi

### Phantom Endpoint:
`frontend-admin/src/App.js` satır 38 ve 98'de `MailPage` import'u ve route'u var ama backend'de `/mail/api/emails` endpoint'i yok → 404 hatası her sayfa yüklemesinde.

## Teknik Arka Plan

### Neden 404 Kullanıyoruz?
- **401/403** → endpoint var, auth sorunları bildirilir
- **404** → "böyle bir şey yok" → saldırgan endpoint'in varlığını bile bilmez
- Bu teknik "**security through obscurity**" değil — ek bir katman

### OWASP Önerileri:
- Tutarlı hata response'ları — farklı durumlar için aynı format
- Stack trace'leri gizle — production'da asla gösterme
- İç hata detaylarını döndürme — sadece generic mesaj
- Login'de "kullanıcı bulunamadı" vs "şifre yanlış" ayırt edilmemeli

## Uygulama Planı

### Adım 1: requireAuth Maskeleme

```javascript
// middleware/requireAuth.js
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ') &&
       req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Tüm auth hataları aynı response — saldırgan ayrıştıramaz
    return res.status(404).json({ error: 'Endpoint not found' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    next();
  };
};
```

### Adım 2: Global Error Handler Güncelleme

```javascript
// server.js — en son middleware olarak
app.use((err, req, res, next) => {
  // CORS error
  if (err.message === 'CORS policy violation') {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Rate limit
  if (err.status === 429) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Diğer hatalar
  console.error('Unhandled error:', err.message);
  
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Development'ta detay göster
  return res.status(500).json({
    error: err.message,
    stack: err.stack
  });
});

// 404 handler — tanımsız route'lar
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
```

### Adım 3: Login Endpoint Hata Standardizasyonu

```javascript
// auth.js — login
// ❌ YANLIŞ — bilgi sızdırır:
if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
if (!validPassword) return res.status(401).json({ error: 'Şifre hatalı' });

// ✅ DOĞRU — aynı mesaj her durumda:
const genericAuthError = 'Geçersiz e-posta veya şifre';

if (!user || !validPassword) {
  return res.status(401).json({ error: genericAuthError });
}
```

### Adım 4: Phantom Endpoint Temizliği

```javascript
// frontend-admin/src/App.js
// Kaldır:
// import MailPage from './pages/MailPage';
// <Route path="mail" element={<MailPage />} />

// MailPage dosyası da silinecek veya placeholder olarak güncellenecek
```

### Adım 5: Console Log Temizliği (Production)

Production'da gereksiz log'lar güvenlik riski:
```javascript
// ❌ YANLIŞ — hassas bilgi logluyor
console.log('📤 Sending response:', JSON.stringify(formattedInvitations).substring(0, 100));
console.log('🔄 Link kullanılmış olarak işaretleniyor:', token);

// ✅ DOĞRU — sadece gerekli bilgi
if (process.env.NODE_ENV !== 'production') {
  console.log('📤 Sending response, count:', formattedInvitations.length);
}
```

## Standardize Hata Response Formatı

Tüm endpoint'ler aynı formatı kullanmalı:

```javascript
// Başarılı
{ success: true, data: {...}, message: 'İşlem başarılı' }

// Hata (auth gerektiren endpoint'lerde)
{ error: 'Endpoint not found' }

// Hata (public endpoint'lerde — login gibi)
{ error: 'Geçersiz e-posta veya şifre' }

// Validation hatası (form gönderimi)
{ error: 'Doğrulama hatası', fields: { email: 'Geçersiz format' } }
```

## Test Planı

1. ✅ Token yok → 404 (401 değil)
2. ✅ Expired token → 404 (401 değil)
3. ✅ Geçersiz token → 404
4. ✅ Yetersiz rol → 404 (403 değil)
5. ✅ Yanlış şifre → "Geçersiz e-posta veya şifre" (şifre yanlış değil)
6. ✅ Olmayan kullanıcı → aynı mesaj
7. ✅ `/mail/api/emails` çağrısı yok (network tab kontrolü)
8. ✅ Production'da console'da hassas veri yok
9. ✅ 404 handler tanımsız route'larda çalışıyor

## Bağımlılıklar
- Yok (bağımsız uygulanabilir)

## Tahmini Süre
- Uygulama: ~25 dakika
- Test: ~15 dakika
