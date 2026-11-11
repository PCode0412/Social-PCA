@echo off
title Community Profiling Backend - FastAPI
echo ========================================================
echo Starting Socio-Economic Community Profiling API Backend
echo ========================================================
echo.

cd /d "%~dp0"

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python Launcher (py)...
    py -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
    goto end
)

if exist "C:\Users\Pranav\AppData\Local\Python\pythoncore-3.14-64\python.exe" (
    echo Using specific Python 3.14 executable...
    "C:\Users\Pranav\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
    goto end
)

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using system python...
    python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 8000
    goto end
)

echo ERROR: Python was not found in PATH or at the standard location.
pause

:end
