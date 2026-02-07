# pgAdmin'de WSL PostgreSQL Server Ekleme

## 1. pgAdmin'i Aç ve Yeni Server Ekle

1. **pgAdmin'i aç**
2. **Sol panelde "Servers"** üzerine sağ tık
3. **"Create" → "Server..."** seç

## 2. Server Bilgilerini Gir

### General Tab:
- **Name:** `WSL PostgreSQL` (istediğin isim)

### Connection Tab:
- **Host name/address:** `localhost`
- **Port:** `5432`
- **Maintenance database:** `postgres`
- **Username:** `postgres`
- **Password:** `12345`

### Advanced Tab (Opsiyonel):
- **DB restriction:** `optima_hr` (sadece bu veritabanını görmek için)

## 3. Save Et

"Save" butonuna tık. Server listesinde görünecek.

## 4. Sorun Çıkarsa

Eğer bağlanamıyorsa:

1. **WSL'de PostgreSQL çalışıyor mu kontrol et:**
```bash
sudo service postgresql status
```

2. **PostgreSQL'i başlat:**
```bash
sudo service postgresql start
```

3. **Port kontrolü:**
```bash
sudo netstat -tuln | grep 5432
```

## 5. Alternatif Bağlantı Bilgileri

Eğer `localhost` çalışmazsa:

- **Host:** `127.0.0.1`
- **Host:** `10.255.255.254` (WSL host IP)

## 6. Test Bağlantısı

Terminal'den test:
```bash
sudo -u postgres psql -h localhost -p 5432 -U postgres -d optima_hr
```