@echo off
chcp 65001 >nul
cd /d "%~dp0server"
echo.
echo 🌸 每日记账 V1.0.1 正在启动...
echo.
echo    请在浏览器中打开：http://localhost:3456
echo.
echo    按 Ctrl+C 可以关闭服务
echo ======================================
node index.js
pause
