@echo off
cd /d "c:\Users\usuario\Downloads\proyectoTesis"
echo ======================================================== >> mining_log.txt
echo [%DATE% %TIME%] Iniciando Tarea Programada: Watchlist >> mining_log.txt
echo ======================================================== >> mining_log.txt
node scripts/mine_watchlist.js >> mining_log.txt 2>&1

echo ======================================================== >> mining_log.txt
echo [%DATE% %TIME%] Iniciando Tarea Programada: Carril 1 Dinamico >> mining_log.txt
echo ======================================================== >> mining_log.txt
node scripts/mine_carril1.js >> mining_log.txt 2>&1

echo ======================================================== >> mining_log.txt
echo [%DATE% %TIME%] Backup local de la base (RNF04) >> mining_log.txt
echo ======================================================== >> mining_log.txt
node scripts/backup_db.js >> mining_log.txt 2>&1

echo [%DATE% %TIME%] Tarea Programada Completada con exito. >> mining_log.txt

