@echo off
echo PostgreSQL Servisini Başlatılıyor...

REM PostgreSQL servisini başlat
net start postgresql-x64-18

REM Eğer başarısız olursa alternatif komut
if errorlevel 1 (
    echo Alternatif komut deneniyor...
    sc start "postgresql-x64-18"
)

REM Veritabanını oluştur
echo Veritabanı oluşturuluyor...
"C:\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE IF NOT EXISTS optima_hr;"

REM SQL script'i çalıştır
echo SQL script'i çalıştırılıyor...
"C:\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -d optima_hr -f setup_database.sql

echo PostgreSQL kurulumu tamamlandı!
pause