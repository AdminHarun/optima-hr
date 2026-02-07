# OPTIMA-HR.NET Deployment Guide

## Domain Yapisi

- **Frontend:** https://optima-hr.net
- **Backend API:** https://api.optima-hr.net
- **WebSocket:** wss://api.optima-hr.net

---

## 1. Frontend Deployment

### Environment Dosyalari

**Development (.env):**
```env
REACT_APP_API_URL=http://localhost:9000
REACT_APP_WS_URL=ws://localhost:9000
REACT_APP_PUBLIC_URL=http://localhost:3000
```

**Production (.env.production):**
```env
REACT_APP_API_URL=https://api.optima-hr.net
REACT_APP_WS_URL=wss://api.optima-hr.net
REACT_APP_PUBLIC_URL=https://optima-hr.net
```

### Build Komutu
```bash
cd frontend
npm run build
```

Bu komut `.env.production` dosyasini kullanarak production build olusturur.

### Deployment Secenekleri

#### A) Vercel (Onerilen)
```bash
# Vercel CLI kurulumu
npm i -g vercel

# Deploy
vercel --prod
```

Environment Variables Vercel Dashboard'da ayarlanmali:
- `REACT_APP_API_URL` = `https://api.optima-hr.net`
- `REACT_APP_WS_URL` = `wss://api.optima-hr.net`
- `REACT_APP_PUBLIC_URL` = `https://optima-hr.net`

#### B) Netlify
```bash
# Netlify CLI kurulumu
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

#### C) Cloudflare Pages
1. GitHub reposuna push
2. Cloudflare Pages'da import
3. Build command: `npm run build`
4. Output directory: `build`

---

## 2. Backend Deployment

### Environment Variables

Production sunucusunda `.env` dosyasi:
```env
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=optima_hr
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
PORT=9000
NODE_ENV=production
JWT_SECRET=your-very-long-secure-secret
CORS_ORIGIN=https://optima-hr.net,https://www.optima-hr.net
```

### Deployment Secenekleri

#### A) VPS (DigitalOcean, Linode, Hetzner)

1. **Node.js ve PM2 Kurulumu:**
```bash
# Node.js 18+ kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
npm install -g pm2
```

2. **Uygulama Kurulumu:**
```bash
cd /var/www/optima-hr
git clone your-repo .
cd backend-express
npm install --production
```

3. **PM2 ile Calistirma:**
```bash
pm2 start server.js --name "optima-api"
pm2 save
pm2 startup
```

4. **Nginx Reverse Proxy:**
```nginx
# /etc/nginx/sites-available/api.optima-hr.net
server {
    listen 80;
    server_name api.optima-hr.net;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **SSL Sertifikasi (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.optima-hr.net
```

#### B) Railway.app
```bash
# Railway CLI kurulumu
npm i -g @railway/cli

# Login ve deploy
railway login
railway init
railway up
```

#### C) Render.com
1. GitHub'a push
2. Render'da Web Service olustur
3. Build command: `npm install`
4. Start command: `node server.js`

---

## 3. Veritabani (PostgreSQL)

### Managed PostgreSQL Servisleri
- **Supabase** (ucretsiz tier mevcut)
- **Railway PostgreSQL**
- **DigitalOcean Managed Database**
- **AWS RDS**

### Migration
```bash
cd backend-express
npm run db:migrate
```

---

## 4. DNS Ayarlari

Cloudflare veya domain saglayicinizda:

| Type | Name | Content |
|------|------|---------|
| A | @ | [Frontend IP] |
| A | www | [Frontend IP] |
| A | api | [Backend IP] |
| CNAME | www | optima-hr.net |

---

## 5. SSL/HTTPS

- **Frontend:** Vercel/Netlify/Cloudflare otomatik SSL saglar
- **Backend:** Let's Encrypt ile ucretsiz SSL

---

## 6. Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs optima-api
```

### Health Check Endpoint
Backend'de `/health` endpoint'i ekleyin:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

---

## 7. Checklist

- [ ] Domain DNS ayarlari yapildi
- [ ] Frontend build olusturuldu
- [ ] Frontend deploy edildi
- [ ] Backend deploy edildi
- [ ] PostgreSQL veritabani olusturuldu
- [ ] Migration'lar calistirildi
- [ ] SSL sertifikalari aktif
- [ ] CORS ayarlari dogru
- [ ] WebSocket baglantisi test edildi
- [ ] File upload test edildi

---

## Sorun Giderme

### CORS Hatalari
Backend `.env` dosyasinda CORS_ORIGIN dogru ayarlanmis mi kontrol edin.

### WebSocket Baglanti Hatalari
Nginx'te WebSocket upgrade ayarlari yapilmis mi kontrol edin.

### 502 Bad Gateway
PM2'de uygulama calisiyor mu kontrol edin: `pm2 status`
