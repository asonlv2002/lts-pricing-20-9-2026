@echo off
setlocal EnableExtensions

set "OUT=%~1"
if "%OUT%"=="" set "OUT=screen.png"

where adb >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Khong tim thay adb trong PATH.
  echo Cai Android Platform Tools hoac them adb vao PATH roi chay lai.
  exit /b 1
)

for /f "skip=1 tokens=1,2" %%A in ('adb devices') do (
  if "%%B"=="device" (
    set "DEVICE=%%A"
    goto :has_device
  )
)

echo [ERROR] Khong thay thiet bi Android dang ket noi.
echo Hay bat USB debugging, chap nhan RSA prompt tren dien thoai, roi thu lai.
adb devices
exit /b 1

:has_device
echo [INFO] Dang chup man hinh tu thiet bi %DEVICE%...
adb -s %DEVICE% shell screencap -p /sdcard/codex_screen.png
if errorlevel 1 exit /b 1

adb -s %DEVICE% pull /sdcard/codex_screen.png "%OUT%" >nul
if errorlevel 1 exit /b 1

adb -s %DEVICE% shell rm /sdcard/codex_screen.png >nul 2>nul

echo [OK] Da luu anh: %CD%\%OUT%
echo Keo tha file nay vao chat de gui cho toi.
endlocal
