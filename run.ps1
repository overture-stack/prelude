# Prelude — Windows PowerShell launcher
# Usage: .\run.ps1 <command>
# Mirrors the Makefile for participants who cannot use WSL2 or GNU make.
#
# Requires: Docker Desktop for Windows (Hyper-V or WSL2 backend)
# Recommended: Windows Terminal for colour support

param(
    [Parameter(Position = 0)]
    [string]$Command = "help"
)

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
function Write-Cyan   { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Green  { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Yellow { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Red    { param($msg) Write-Host $msg -ForegroundColor Red }

# ---------------------------------------------------------------------------
# Port detection  (replaces the /dev/tcp bash trick)
# ---------------------------------------------------------------------------
function Test-PortInUse {
    param([int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

$StagePort = if (Test-PortInUse 3000) { 3001 } else { 3000 }

# ---------------------------------------------------------------------------
# Pre-deployment checks  (mirrors phase0.sh)
# ---------------------------------------------------------------------------
$DockerEngineMin = [Version]"28.0.0"
$DockerMinCPU    = 8
$DockerMinMemGB  = 8
$DockerMinDiskGB = 64

function Invoke-Phase0 {
    Write-Host ""
    Write-Cyan  "╔═════════════════════════════════╗"
    Write-Cyan  "║  Running Pre-deployment checks  ║"
    Write-Cyan  "╚═════════════════════════════════╝"

    # --- Docker installed? ---------------------------------------------------
    Write-Host ""
    Write-Host "[1/2] Checking Docker..." -ForegroundColor Magenta
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Red "   └─ Error: Docker is not installed"
        exit 1
    }

    $rawVersion = (docker --version) -replace "Docker version ", "" -replace ",.*", ""
    try {
        $engineVersion = [Version]$rawVersion
    } catch {
        Write-Yellow "   └─ Warning: Could not parse Docker version '$rawVersion' — skipping version check"
        $engineVersion = $DockerEngineMin
    }

    if ($engineVersion -lt $DockerEngineMin) {
        Write-Red "   └─ Error: Docker Engine $engineVersion does not meet minimum requirement $DockerEngineMin"
        Write-Yellow "      Visit https://docs.docker.com/get-docker/ to download the latest version"
        exit 1
    }
    Write-Cyan "   └─ Info: Docker Engine $engineVersion detected"

    if (-not (docker info 2>$null)) {
        Write-Red "   └─ Error: Docker daemon is not running — please start Docker Desktop"
        exit 1
    }
    Write-Cyan "   └─ Info: Docker daemon is running"

    # --- Resources -----------------------------------------------------------
    Write-Host ""
    Write-Host "[2/2] Checking Docker Resources" -ForegroundColor Magenta

    $dockerInfo = docker info 2>$null | Out-String

    # CPU
    $cpuMatch  = [regex]::Match($dockerInfo, "CPUs:\s+(\d+)")
    $cpuCores  = if ($cpuMatch.Success) { [int]$cpuMatch.Groups[1].Value } else { 0 }
    if ($cpuCores -lt $DockerMinCPU) {
        Write-Yellow "   └─ Warning: Docker CPU allocation ($cpuCores cores) is less than recommended ($DockerMinCPU)"
        Write-Yellow "      Increase in Docker Desktop → Settings → Resources → CPU"
        $resp = Read-Host "      Continue anyway? [y/N]"
        if ($resp -notmatch "^[yY]") { Write-Host "Deployment cancelled."; exit 1 }
    } else {
        Write-Cyan "   └─ Info: Docker CPU allocation meets requirements ($cpuCores cores)"
    }

    # Memory
    $memMatch  = [regex]::Match($dockerInfo, "Total Memory:\s+([\d.]+)\s*(GiB|MiB)")
    if ($memMatch.Success) {
        $memVal  = [double]$memMatch.Groups[1].Value
        $memUnit = $memMatch.Groups[2].Value
        $memGB   = if ($memUnit -eq "MiB") { [Math]::Round($memVal / 1024, 1) } else { $memVal }
    } else {
        $memGB = 0
    }
    if ($memGB -lt $DockerMinMemGB) {
        Write-Yellow "   └─ Warning: Docker memory (${memGB} GB) is less than recommended ($DockerMinMemGB GB)"
        Write-Yellow "      Increase in Docker Desktop → Settings → Resources → Memory"
        $resp = Read-Host "      Continue anyway? [y/N]"
        if ($resp -notmatch "^[yY]") { Write-Host "Deployment cancelled."; exit 1 }
    } else {
        Write-Cyan "   └─ Info: Docker memory allocation meets requirements (${memGB} GB)"
    }

    # Disk  (docker system df gives us a rough sense; for true host disk use WMI)
    $diskGB = 0
    try {
        $disk   = Get-PSDrive C -ErrorAction SilentlyContinue
        if ($disk) { $diskGB = [Math]::Round($disk.Free / 1GB, 1) }
    } catch {}

    if ($diskGB -gt 0 -and $diskGB -lt $DockerMinDiskGB) {
        Write-Yellow "   └─ Warning: Free disk space on C: (${diskGB} GB) is less than recommended ($DockerMinDiskGB GB)"
        $resp = Read-Host "      Continue anyway? [y/N]"
        if ($resp -notmatch "^[yY]") { Write-Host "Deployment cancelled."; exit 1 }
    } elseif ($diskGB -gt 0) {
        Write-Cyan "   └─ Info: Disk space meets requirements (${diskGB} GB free)"
    }

    Write-Green "`n✓ Ready to deploy"
}

# ---------------------------------------------------------------------------
# Build helper  (mirrors the rolling-log docker compose build block)
# ---------------------------------------------------------------------------
function Invoke-BuildStage {
    Write-Yellow "`nBuilding portal UI (stage) image — this may take a couple of minutes...`n"
    $env:STAGE_PORT = $StagePort
    docker compose build stage
    if ($LASTEXITCODE -ne 0) {
        Write-Red "Stage build failed."
        exit 1
    }
    Write-Green "Stage Portal UI built`n"
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
switch ($Command.ToLower()) {

    "help" {
        Write-Host ""
        Write-Cyan  "================ Prelude Windows Launcher ================"
        Write-Host  ""
        Write-Host  "Development Environments:"
        Write-Host  "  .\run.ps1 demo          - Start demo deployment (with sample data)"
        Write-Host  "  .\run.ps1 platform      - Start platform (upload your own data)"
        Write-Host  "  .\run.ps1 start         - Start existing services (no rebuild)"
        Write-Host  "  .\run.ps1 restart       - Restart platform containers (preserves data)"
        Write-Host  "  .\run.ps1 down          - Gracefully shutdown all containers"
        Write-Host  "  .\run.ps1 status        - Show status of all services"
        Write-Host  ""
        Write-Host  "Service Management:"
        Write-Host  "  .\run.ps1 rebuild       - Rebuild and redeploy stage only"
        Write-Host  "  .\run.ps1 nginx         - Start Nginx reverse proxy (extension activity)"
        Write-Host  "  .\run.ps1 backup        - Back up PostgreSQL database"
        Write-Host  "  .\run.ps1 check-space   - Check disk and Docker resource usage"
        Write-Host  ""
        Write-Host  "Danger Zone:"
        Write-Host  "  .\run.ps1 reset         - DANGER: Remove all containers and volumes (DATA LOSS)"
        Write-Host  "  .\run.ps1 nuke          - DANGER: Complete cleanup including images"
        Write-Host  ""
        Write-Cyan  "=========================================================="
    }

    "demo" {
        Invoke-Phase0
        if ($StagePort -eq 3001) {
            Write-Yellow "`n⚠  Port 3000 is occupied — Stage will start on port 3001 instead"
        } else {
            Write-Cyan "`nStage will start on port 3000"
        }
        Invoke-BuildStage
        $env:STAGE_PORT = $StagePort
        $env:PROFILE    = "demo"
        docker compose -f ./docker-compose.yml --profile demo up --attach setup
    }

    "platform" {
        Invoke-Phase0
        if ($StagePort -eq 3001) {
            Write-Yellow "`n⚠  Port 3000 is occupied — Stage will start on port 3001 instead"
        } else {
            Write-Cyan "`nStage will start on port 3000"
        }
        Invoke-BuildStage
        $env:STAGE_PORT = $StagePort
        $env:PROFILE    = "platform"
        docker compose -f ./docker-compose.yml --profile platform up --attach setup
    }

    "start" {
        Write-Host "Starting services..."
        $env:STAGE_PORT = $StagePort
        $env:PROFILE    = "platform"
        docker compose --profile platform up -d
        Write-Green "✓ Services started"
    }

    "down" {
        Write-Host "Shutting down all running containers..."
        $env:PROFILE = "default"
        docker compose -f ./docker-compose.yml --profile default down
    }

    "restart" {
        Write-Host "Restarting platform containers..."
        $env:PROFILE = "platform"
        docker compose -f ./docker-compose.yml --profile platform down
        $env:STAGE_PORT = $StagePort
        docker compose -f ./docker-compose.yml --profile platform up --attach setup
    }

    "status" {
        $env:PROFILE = "platform"
        docker compose ps
    }

    "rebuild" {
        Write-Host "Stopping stage service..."
        $env:STAGE_PORT = $StagePort
        $env:PROFILE    = "platform"
        docker compose stop stage
        Write-Host "Rebuilding stage image..."
        docker compose build --no-cache stage
        Write-Host "Starting stage service..."
        docker compose up -d stage
        Write-Green "✓ Stage rebuilt and redeployed"
    }

    "nginx" {
        Write-Host "Starting Nginx reverse proxy (extension activity)..."
        docker compose --profile nginx up -d nginx
        Write-Green "✓ Nginx started"
        Write-Cyan  "Portal available at http://portal.local"
        Write-Host  "Ensure your hosts file has: 127.0.0.1 portal.local datatable1-arranger.portal.local"
        Write-Host  "(Edit C:\Windows\System32\drivers\etc\hosts as Administrator)"
    }

    "backup" {
        # Try WSL2 first (cleanest path); fall back to raw docker commands
        $wslAvailable = $null -ne (Get-Command wsl -ErrorAction SilentlyContinue) -and (wsl --list 2>$null)
        if ($wslAvailable) {
            Write-Host "Running backup via WSL2..."
            wsl bash ./setup/scripts/backup.sh
        } else {
            # Inline fallback: PostgreSQL dump only
            $date       = Get-Date -Format "yyyy-MM-dd_HHmm"
            $backupDir  = ".\backups\$date"
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            Write-Host "Backing up PostgreSQL to $backupDir ..."
            docker exec postgres pg_dump -U admin -Fc overtureDb | Set-Content "$backupDir\postgres.dump" -Encoding Byte
            if ($LASTEXITCODE -eq 0) {
                Write-Green "✓ PostgreSQL backup saved to $backupDir\postgres.dump"
            } else {
                Write-Red "Backup failed — is the postgres container running? (run: .\run.ps1 status)"
            }
        }
    }

    "check-space" {
        Write-Yellow "=== Docker System Overview ==="
        docker system df
        Write-Host ""
        Write-Yellow "=== Project Volumes ==="
        docker volume ls --filter name=prelude
        Write-Host ""
        Write-Yellow "=== Available Disk Space (C:) ==="
        $disk = Get-PSDrive C
        $freeGB  = [Math]::Round($disk.Free  / 1GB, 1)
        $usedGB  = [Math]::Round($disk.Used  / 1GB, 1)
        Write-Host "Used: ${usedGB} GB   Free: ${freeGB} GB"
    }

    "reset" {
        Write-Host ""
        Write-Red   "╔════════════════════════════════════════════════════════════╗"
        Write-Red   "║                        DANGER ZONE                         ║"
        Write-Red   "╚════════════════════════════════════════════════════════════╝"
        Write-Host  ""
        Write-Host  "This will permanently delete:"
        Write-Host  "  • All Docker containers"
        Write-Host  "  • All Docker volumes (Elasticsearch, Stage, PostgreSQL)"
        Write-Host  ""
        Write-Yellow "⚠  BACKUP REMINDER:"
        Write-Host  '  docker exec postgres pg_dump -U admin -Fc overtureDb > backup.dump'
        Write-Host  ""
        $confirm = Read-Host "Type 'DELETE' to confirm permanent data deletion"
        if ($confirm -eq "DELETE") {
            Write-Host ""
            Write-Yellow "Shutting down containers and removing volumes..."
            $env:PROFILE = "default"
            docker compose -f ./docker-compose.yml --profile default down -v
            Write-Green "`n✓ Reset complete. All data has been removed."
        } else {
            Write-Host ""
            Write-Green "Reset cancelled. No data was deleted."
        }
    }

    "nuke" {
        Write-Red   "DANGER: This will remove all containers, volumes, AND Docker images."
        Write-Host  "This is the most destructive option and will require a full rebuild on next start."
        $confirm = Read-Host "Are you absolutely sure? [y/N]"
        if ($confirm -match "^[yY]") {
            Write-Host "Nuking everything..."
            $env:PROFILE = "default"
            docker compose -f ./docker-compose.yml --profile default down -v --rmi all
            Write-Green "`nCleanup finished. All Docker resources removed."
        } else {
            Write-Host "Operation cancelled."
        }
    }

    default {
        Write-Red "Unknown command: $Command"
        Write-Host "Run '.\run.ps1 help' to see available commands."
        exit 1
    }
}
