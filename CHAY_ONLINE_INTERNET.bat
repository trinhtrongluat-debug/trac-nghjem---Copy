@echo off
chcp 65001 > nul
title SmartExam AI Platform - Kết Nối Internet Cho Học Sinh Làm Bài

echo ================================================================
echo    HỆ THỐNG THI TRẮC NGHIỆM AI (CHẾ ĐỘ KẾT NỐI INTERNET)
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa tìm thấy Node.js trên máy tính của bạn!
    echo Vui lòng tải và cài đặt Node.js từ: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [*] Đang cài đặt thư viện cần thiết, vui lòng đợi...
    call npm.cmd install --legacy-peer-deps
)

node start-online.js

pause
