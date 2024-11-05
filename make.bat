@echo off
setlocal enabledelayedexpansion

if "%1"=="" goto help

if "%1"=="platform" (
    set PROFILE=platform
    goto run
)
if "%1"=="stageDev" (
    set PROFILE=stageDev
    goto run
)
if "%1"=="arrangerDev" (
    set PROFILE=arrangerDev
    goto run
)
if "%1"=="maestroDev" (
    set PROFILE=maestroDev
    goto run
)
if "%1"=="songDev" (
    set PROFILE=songDev
    goto run
)
if "%1"=="scoreDev" (
    set PROFILE=scoreDev
    goto run
)
if "%1"=="down" (
    set PROFILE=platfrom
    docker compose down
    goto :eof
)

goto help

:run
docker compose --profile %PROFILE% up --attach conductor
goto :eof

:help
echo Usage: build.bat [target]
echo Available targets:
echo   platform
echo   stageDev
echo   arrangerDev
echo   maestroDev
echo   songDev
echo   scoreDev
echo   down
