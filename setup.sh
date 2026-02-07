#!/bin/bash

# Optima HR - Quick Setup Script
# Bu script tüm kurulum adımlarını otomatik yapar

echo "🚀 Optima HR Multi-Tenant Setup Başlıyor..."
echo ""

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Database Migration
echo "${YELLOW}📊 Step 1: Database Migration${NC}"
echo "Migration çalıştırılıyor..."
cd backend-express
node scripts/runMigration.js

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Migration başarılı!${NC}"
else
    echo "${RED}❌ Migration hatası! Lütfen database bağlantısını kontrol edin.${NC}"
    exit 1
fi

echo ""

# 2. Backend Dependencies
echo "${YELLOW}📦 Step 2: Backend Dependencies${NC}"
echo "Backend bağımlılıkları kontrol ediliyor..."
npm list pg sequelize > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Backend dependencies OK${NC}"
else
    echo "${YELLOW}⚠️  Backend dependencies eksik, yükleniyor...${NC}"
    npm install
fi

echo ""

# 3. Electron Dependencies
echo "${YELLOW}📦 Step 3: Electron Dependencies${NC}"
cd ..
echo "Electron bağımlılıkları yükleniyor..."
npm install

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Electron dependencies yüklendi${NC}"
else
    echo "${RED}❌ Electron dependencies hatas\u0131!${NC}"
    exit 1
fi

echo ""

# 4. Icon Kontrolü
echo "${YELLOW}🎨 Step 4: Icon Kontrolü${NC}"
if [ -f "electron/assets/icon.png" ]; then
    echo "${GREEN}✅ Icon dosyası mevcut${NC}"
else
    echo "${YELLOW}⚠️  Icon dosyası bulunamadı!${NC}"
    echo "Lütfen logo dosyasını electron/assets/icon.png olarak kaydedin."
    echo ""
    echo "Otomatik oluşturmak için:"
    echo "  sips -z 512 512 frontend/src/assets/images/logo1.png --out electron/assets/icon.png"
    echo "  sips -z 32 32 frontend/src/assets/images/logo1.png --out electron/assets/tray-icon.png"
    echo ""
fi

echo ""

# 5. Frontend Build
echo "${YELLOW}🔨 Step 5: Frontend Build (Opsiyonel)${NC}"
read -p "Frontend build yapmak ister misiniz? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd frontend
    echo "Frontend build ediliyor..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "${GREEN}✅ Frontend build başarılı!${NC}"
    else
        echo "${RED}❌ Frontend build hatası!${NC}"
        exit 1
    fi
    cd ..
else
    echo "Frontend build atlandı."
fi

echo ""
echo "${GREEN}🎉 Setup tamamlandı!${NC}"
echo ""
echo "Şimdi ne yapabilirsiniz:"
echo ""
echo "${YELLOW}Development Mode:${NC}"
echo "  Terminal 1: cd backend-express && npm start"
echo "  Terminal 2: npm run electron:dev"
echo ""
echo "${YELLOW}Production Build:${NC}"
echo "  npm run electron:build:mac"
echo ""
echo "Detaylı bilgi için: SETUP_INSTRUCTIONS.md"
echo ""
