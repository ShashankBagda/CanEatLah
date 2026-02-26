@echo off
setlocal

set "ROOT=%~dp0"
set "VENV_PY=%ROOT%.venv\Scripts\python.exe"
set "SERVICE_DIR=%ROOT%ai_service"

if not exist "%SERVICE_DIR%" (
  echo [ERROR] ai_service folder not found at: %SERVICE_DIR%
  exit /b 1
)

if not exist "%VENV_PY%" (
  echo [INFO] Creating virtual environment...
  python -m venv "%ROOT%.venv"
  if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    exit /b 1
  )
)

echo [INFO] Installing/updating dependencies...
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r "%SERVICE_DIR%\requirements.txt"
if errorlevel 1 (
  echo [ERROR] Failed to install dependencies.
  exit /b 1
)

echo [INFO] Starting local AI service on http://127.0.0.1:8000
cd /d "%SERVICE_DIR%"
"%VENV_PY%" -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
