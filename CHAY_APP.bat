@echo off
chcp 65001 > nul
title SmartExam AI Platform - Khởi Động Ứng Dụng

echo ================================================================
echo    HỆ THỐNG TẠO ĐỀ THI TRẮC NGHIỆM AI (SMARTEXAM PLATFORM)
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
    echo [*] Đang cài đặt các thư viện cần thiết, vui lòng đợi trong giây lát...
    call npm.cmd install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [LỖI] Cài đặt thư viện không thành công. Hãy kiểm tra kết nối mạng.
        pause
        exit /b 1
    )
    echo [OK] Cài đặt thư viện thành công!
    echo.
)

echo [*] Đang khởi động Server tại địa chỉ: http://localhost:3000
echo [*] Trình duyệt web sẽ tự động mở trong giây lát...
echo.
echo [Ghi chú] Giữ cửa sổ này mở trong khi sử dụng. Nhấn Ctrl + C để dừng app.
echo ================================================================
echo.

:: Mở trình duyệt sau 2 giây (chạy nền)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

:: Khởi chạy ứng dụng
call npx.cmd tsx server.ts

pause
