@echo off
setlocal EnableDelayedExpansion

if "%1"=="platform" goto platform
if "%1"=="down" goto down
if "%1"=="clean" goto clean
goto usage

:platform
echo Starting platform services...
set PROFILE=platform
docker compose --profile platform up --attach conductor
goto end

:down
echo Stopping platform services...
set PROFILE=platform
docker compose --profile platform down
goto end

:clean
echo [91mWARNING: This will remove all data within Elasticsearch.[0m
set /p confirm="Are you sure you want to proceed? [y/N] "
if /i "!confirm!"=="y" (
    echo Stopping related containers...
    docker compose --profile platform down
    
    echo Cleaning up Elasticsearch volumes...
    if exist "./volumes/es-data/nodes" rmdir /s /q "./volumes/es-data/nodes"
    
    for /f "delims=" %%i in ('dir /b /s "./volumes/es-logs" ^| findstr /v "logs.txt"') do del "%%i"
    
    docker volume rm deployment_elasticsearch-data 2>nul
    docker volume rm deployment_elasticsearch-logs 2>nul
    
    echo Cleanup completed!
) else (
    echo Cleanup cancelled.
)
goto end

:usage
echo Usage:
echo   %0 platform    - Start platform services
echo   %0 down        - Stop platform services
echo   %0 clean       - Clean Elasticsearch data and volumes

:end
endlocal