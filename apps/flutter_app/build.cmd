@echo off
setlocal EnableExtensions EnableDelayedExpansion
title LTS Pricing - Flutter Build Helper

REM -------------------------------------------------------------------------
REM  build.cmd -- Helper build & install Flutter app cho LTS Pricing
REM  Dat o: apps/flutter_app/build.cmd
REM  Tu cd ve thu muc chua script, hoat dong tren moi may co cai tool.
REM -------------------------------------------------------------------------

cd /d "%~dp0"
set "FLUTTER_APP_DIR=%cd%"

pushd ..\..
set "REPO_ROOT=%cd%"
popd

echo.
echo ================================================================
echo            LTS Pricing -- Flutter Build Helper
echo ----------------------------------------------------------------
echo   Repo root:   %REPO_ROOT%
echo   Flutter app: %FLUTTER_APP_DIR%
echo ================================================================
echo.

REM ---- [1/4] Pre-check tool ----------------------------------------------
echo [1/4] Kiem tra tool can thiet...
set "MISSING="

where pnpm >nul 2>&1
if errorlevel 1 (
    echo   [X] pnpm    -- KHONG TIM THAY
    set "MISSING=1"
) else (
    for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do echo   [OK] pnpm v%%v
)

where flutter >nul 2>&1
if errorlevel 1 (
    echo   [X] flutter -- KHONG TIM THAY
    set "MISSING=1"
) else (
    echo   [OK] flutter co trong PATH
)

where adb >nul 2>&1
if errorlevel 1 (
    echo   [!] adb     -- khong co trong PATH ^(tuy chon^)
) else (
    echo   [OK] adb co trong PATH
)

if defined MISSING (
    echo.
    echo ================================================================
    echo  ERROR: Thieu tool quan trong. Cai dat truoc khi tiep tuc:
    echo    - pnpm:    https://pnpm.io/installation
    echo    - flutter: https://docs.flutter.dev/get-started/install
    echo ================================================================
    pause
    exit /b 1
)

echo.

REM ---- [2/4] Chon che do build -------------------------------------------
echo [2/4] Chon che do build:
echo.
echo   1^) Debug   - flutter run, hot reload, attach terminal
echo   2^) Release - build APK + install vao device
echo.
set "MODE="
set /p MODE=Nhap lua chon [1/2]:

if "%MODE%"=="1" (
    set "MODE_NAME=DEBUG (flutter run)"
) else if "%MODE%"=="2" (
    set "MODE_NAME=RELEASE APK + INSTALL"
) else (
    echo.
    echo [X] Lua chon khong hop le. Thoat.
    pause
    exit /b 1
)
echo   ^> Chon: %MODE_NAME%
echo.

REM ---- [3/4] Build engine JS bundle --------------------------------------
echo [3/4] Build engine JS bundle ^(esbuild^)...
echo.
cd /d "%REPO_ROOT%"
call pnpm build:engine
if errorlevel 1 (
    echo.
    echo [X] Build engine that bai. Kiem tra log o tren.
    pause
    exit /b 1
)
echo.
echo   [OK] engine.bundle.js da duoc cap nhat
echo.

REM ---- [4/4] Pub get + Build + Install -----------------------------------
cd /d "%FLUTTER_APP_DIR%"

echo [4/4] flutter pub get...
call flutter pub get >nul 2>&1
if errorlevel 1 (
    echo [X] flutter pub get that bai. Chay tay de xem log: flutter pub get
    pause
    exit /b 1
)
echo   [OK] pub get
echo.

if "%MODE%"=="1" (
    echo ================================================================
    echo  Khoi chay DEBUG ^(flutter run^)
    echo  Trong terminal: r = hot reload, R = hot restart, q = thoat
    echo  Neu co nhieu device, flutter se hoi ban chon.
    echo ================================================================
    echo.
    call flutter run
    goto :done
)

echo ================================================================
echo  Build RELEASE APK ^(co the mat 1-3 phut^)...
echo ================================================================
echo.
call flutter build apk --release
if errorlevel 1 (
    echo.
    echo [X] Build APK that bai.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  Cai APK len device...
echo  Neu co nhieu device, flutter se hoi ban chon.
echo ================================================================
echo.
call flutter install
if errorlevel 1 (
    echo.
    echo [X] Install that bai. Co the thu thu cong:
    echo     adb install -r build\app\outputs\flutter-apk\app-release.apk
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  HOAN TAT!
echo  APK: build\app\outputs\flutter-apk\app-release.apk
echo  Da cai len device thanh cong.
echo ================================================================

:done
echo.
pause
exit /b 0
