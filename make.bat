@echo off
setlocal enabledelayedexpansion

:: If no arguments provided, show help
if "%1"=="" goto help

:: Process the command
if "%1"=="help" goto help
if "%1"=="phase0" goto phase0
if "%1"=="phase1" goto phase1
if "%1"=="phase2" goto phase2
if "%1"=="phase3" goto phase3
if "%1"=="stage-dev" goto stage-dev
if "%1"=="down" goto down
if "%1"=="reset" goto reset

echo Unknown command: %1
goto help

:help
echo ================ Prelude Makefile Commands ================
echo.
echo Conductor Development Environments:
echo   phase0         - Run pre-deployment checks
echo   phase1         - Start Phase 1 deployment
echo   phase2         - Start Phase 2 deployment
echo   phase3         - Start Phase 3 deployment
echo   stage-dev      - Start Stage development environment
echo.
echo Conductor System Management:
echo   down           - Gracefully shutdown all containers
echo   reset          - DANGER: Remove all containers and volumes (DATA LOSS)
echo.
echo General Usage:
echo   make.bat help      - Show this help message
echo   make.bat ^<command^> - Run a specific command
echo.
echo ===============================================================
goto :eof

:phase0
echo Running Pre-deployment checks...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process; ./apps/conductor/scripts/deployments/phase0.ps1"
goto :eof

:phase1
echo Starting Phase 1 development environment...
set "PROFILE=phase1"
docker compose -f ./docker-compose.yml --profile phase1 up --attach conductor
goto :eof

:phase2
echo Starting Phase 2 development environment...
set "PROFILE=phase2"
docker compose -f ./docker-compose.yml --profile phase2 up --attach conductor
goto :eof

:phase3
echo Starting Phase 3 development environment...
set "PROFILE=phase3"
docker compose -f ./docker-compose.yml --profile phase3 up --attach conductor
goto :eof

:stage-dev
echo Starting Stage development environment...
set "PROFILE=stageDev"
docker compose -f ./docker-compose.yml --profile stageDev up --attach conductor
goto :eof

:down
echo Shutting down all running containers...
set "PROFILE=default"
docker compose -f ./docker-compose.yml --profile default down
goto :eof

:reset
echo [33mWarning:[0m This will remove all containers AND their volumes. Data will be lost.
set /p confirm="Are you sure you want to continue? [y/N] "
if /i "!confirm!"=="y" (
    set "PROFILE=default"
    docker compose -f ./docker-compose.yml --profile default down -v
) else (
    echo Operation cancelled
)
goto :eof
