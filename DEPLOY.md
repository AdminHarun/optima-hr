# Optima HR - Deploy Rehberi (Part 7)

## Railway'de 4 Servis Olusturma

### 1. Backend API
- **Root Directory:** `backend-express`
- **Start Command:** `node server.js`
- **Environment Variables:**
  ```
  NODE_ENV=production
  PORT=9000
  DATABASE_URL=postgresql://...
  JWT_SECRET=<güçlü-rastgele-string>
  CORS_ORIGIN=https://admin.optima-hr.net,https://portal.optima-hr.net,https://optima-hr.net
  ```

### 2. Admin Panel (frontend-admin)
- **Root Directory:** `frontend-admin`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve dist -s -l $PORT`
- **Environment Variables:**
  ```
  VITE_API_URL=https://api.optima-hr.net
  VITE_WS_URL=wss://api.optima-hr.net
  ```

### 3. Career Portal (frontend-public)
- **Root Directory:** `frontend-public`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve dist -s -l $PORT`
- **Environment Variables:**
  ```
  VITE_API_URL=https://api.optima-hr.net
  ```

### 4. Employee Portal (frontend-employee)
- **Root Directory:** `frontend-employee`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npx serve dist -s -l $PORT`
- **Environment Variables:**
  ```
  VITE_API_URL=https://api.optima-hr.net
  VITE_WS_URL=wss://api.optima-hr.net
  ```

---

## Cloudflare DNS Ayarlari

Cloudflare panelinde su CNAME kayitlarini ekleyin:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | api | `<railway-backend-url>.railway.app` | ✅ |
| CNAME | admin | `<railway-admin-url>.railway.app` | ✅ |
| CNAME | portal | `<railway-employee-url>.railway.app` | ✅ |
| CNAME | @ veya careers | `<railway-public-url>.railway.app` | ✅ |

### Sonuc:
- `api.optima-hr.net` → Backend API
- `admin.optima-hr.net` → Admin Panel
- `portal.optima-hr.net` → Calisan Portali
- `optima-hr.net` → Kariyer Portali (Public)

---

## SSL
Cloudflare proxy (turuncu bulut) aktifken SSL otomatik olarak calisiyor.
Railway'de "Custom Domain" ayarlarindan her servis icin subdomain ekleyin.

## Test Sırası
1. Backend'i deploy et ve `/health` endpoint'ini kontrol et
2. Admin paneli deploy et ve login'i test et
3. Public portali deploy et ve landing page'i kontrol et
4. Employee portali deploy et ve login'i test et
