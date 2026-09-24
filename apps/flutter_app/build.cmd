@echo off
setlocal EnableExtensions
title LTS Pricing - Flutter Runner

REM -------------------------------------------------------------------------
REM  build.cmd -- Chay Flutter app LTS Pricing
REM  Cach dung:
REM    Double-click      = DEBUG (flutter run, hot reload r/R/q)
REM    build.cmd release = Build APK release + install vao device
REM    build.cmd -check  = Chi kiem tra tool, khong chay app
REM -------------------------------------------------------------------------

cd /d "%~dp0"
set "FLUTTER_APP_DIR=%cd%"
pushd ..\..
set "REPO_ROOT=%cd%"
popd

REM ---- [0] Chon che do ----------------------------------------------------
set "MODE=%~1"
if not defined MODE set "MODE=debug"

if /i not "%MODE%"=="debug" if /i not "%MODE%"=="release" if /i not "%MODE%"=="-check" (
    echo [X] Lua chon khong hop le: "%MODE%"
    echo     Dung: build.cmd ^| build.cmd release ^| build.cmd -check
    goto :fail
)

echo.
echo ================================================================
echo            LTS Pricing -- Flutter Runner
echo ----------------------------------------------------------------
echo   Repo root:   %REPO_ROOT%
echo   Flutter app: %FLUTTER_APP_DIR%
echo   Mode:        %MODE%
echo ================================================================
echo.

REM ---- [1/5] Pre-check tool ----------------------------------------------
echo [1/5] Kiem tra tool can thiet...
set "MISSING="

where pnpm >nul 2>&1
if errorlevel 1 (
    echo   [X] pnpm    -- KHONG TIM THAY   ^(https://pnpm.io/installation^)
    set "MISSING=1"
) else (
    for /f "tokens=*" %%v in ('pnpm --version 2^>nul') do echo   [OK] pnpm v%%v
)

where flutter >nul 2>&1
if errorlevel 1 (
    echo   [X] flutter -- KHONG TIM THAY   ^(https://docs.flutter.dev/get-started/install^)
    set "MISSING=1"
) else (
    echo   [OK] flutter co trong PATH
)

if defined MISSING (
    echo.
    echo  ERROR: Thieu tool quan trong. Cai dat roi chay lai.
    goto :fail
)
echo.

if /i "%MODE%"=="-check" (
    echo [CHECK] Pre-check OK. Script hoat dong binh thuong.
    goto :done
)

REM ---- [2/5] Build engine JS bundle --------------------------------------
echo [2/5] Build engine JS bundle (esbuild)...
pushd "%REPO_ROOT%"
call pnpm build:engine
if errorlevel 1 (
    popd
    echo.
    echo [X] Build engine that bai. Kiem tra log o tren.
    goto :fail
)
popd
echo   [OK] assets\engine.bundle.js da cap nhat
echo.

REM ---- [3/5] flutter pub get ---------------------------------------------
echo [3/5] flutter pub get...
call flutter pub get >nul 2>&1
if errorlevel 1 (
    echo [X] flutter pub get that bai. Chay tay de xem log: flutter pub get
    goto :fail
)
echo   [OK] pub get
echo.

REM ---- [4/5] Kiem tra device Android --------------------------------------
echo [4/5] Kiem tra device Android...
flutter devices 2>nul | findstr /i "android" >nul
if errorlevel 1 (
    echo   [X] Khong tim thay device Android nao.
    echo       - Cam dien thoai Android qua USB roi bat "USB debugging"
    echo       - Hoac mo emulator
    echo       Sau do chay lai build.cmd
    goto :fail
)
echo   [OK] Co device Android ket noi
echo.

REM ---- [5/5] Chay ---------------------------------------------------------
if /i "%MODE%"=="release" goto :release_flow

:debug_flow
echo [5/5] Khoi chay DEBUG: flutter run --dart-define-from-file=.dart_defines.json
echo   Trong terminal: r = hot reload, R = hot restart, q = thoat
echo   Neu co nhieu device, flutter se hoi ban chon.
echo.
set /a ATTEMPT=1

:run_debug
call flutter run --dart-define-from-file=.dart_defines.json
if not errorlevel 1 goto :run_ok
if %ATTEMPT% geq 3 goto :run_fail
set /a ATTEMPT+=1
echo.
echo [i] Launch that bai (loi flaky ket noi debug - app van mo nhung mat hot reload).
echo     Tu dong thu lai lan %ATTEMPT%/3 sau 2 giay...
timeout /t 2 /nobreak >nul
echo.
goto :run_debug

:run_ok
echo.
echo [OK] Debug session ket thuc.
goto :done

:run_fail
echo.
echo [X] flutter run that bai sau 3 lan thu. Doc log o tren de xem loi.
goto :fail

:release_flow
echo [5/5] Build RELEASE APK (co the mat 1-3 phut)...
call flutter build apk --release
if errorlevel 1 (
    echo.
    echo [X] Build APK that bai.
    goto :fail
)
echo.
echo   Cai APK len device...
call flutter install
if errorlevel 1 (
    echo.
    echo [X] Install that bai. Co the thu thu cong:
    echo     adb install -r build\app\outputs\flutter-apk\app-release.apk
    goto :fail
)
echo.
echo ================================================================
echo  HOAN TAT! APK: build\app\outputs\flutter-apk\app-release.apk
echo  Da cai len device thanh cong.
echo ================================================================
goto :done

:fail
echo.
pause
exit /b 1

:done
echo.
pause
exit /b 0
