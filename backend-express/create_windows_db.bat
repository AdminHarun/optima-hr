@echo off
echo Windows PostgreSQL'de optima_hr veritabani olusturuluyor...

REM Windows PostgreSQL'e baglan ve veritabani olustur
"C:\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE IF NOT EXISTS optima_hr;"

REM Sequelize tablolari olusturacak
echo Veritabani olusturuldu! Simdi npm start calistir.

pause