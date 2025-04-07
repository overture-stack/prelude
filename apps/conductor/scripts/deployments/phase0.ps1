# Comprehensive Pre-Deployment Checks for Prelude Application (Windows version)

# Minimum Requirements
$DOCKER_ENGINE_MIN_VERSION = "20.0.0"  # Docker engine version requirement
$NODE_MIN_VERSION = "20.18.1"
$DOCKER_MIN_CPU_CORES = 8
$DOCKER_MIN_MEMORY_GB = 8
$DOCKER_MIN_DISK_GB = 64

# Function to compare version numbers
function Compare-Versions {
    param (
        [string]$Required,
        [string]$Actual
    )
    
    # Remove any leading 'v' or 'V'
    $Actual = $Actual -replace '^[vV]', ''
    $Required = $Required -replace '^[vV]', ''
    
    # Parse versions to System.Version objects for comparison
    $vRequired = [System.Version]::new($Required)
    $vActual = [System.Version]::new($Actual)
    
    return $vActual -ge $vRequired
}

# Function to safely compare numeric values
function Compare-Numeric {
    param (
        [string]$Operator,
        [string]$Value1,
        [string]$Value2
    )

    # Handle empty or non-numeric values
    if ([string]::IsNullOrEmpty($Value1) -or [string]::IsNullOrEmpty($Value2)) {
        return $false
    }
    
    if (-not [double]::TryParse($Value1, [ref]$null) -or -not [double]::TryParse($Value2, [ref]$null)) {
        return $false
    }
    
    $numValue1 = [double]$Value1
    $numValue2 = [double]$Value2
    
    switch ($Operator) {
        "-lt" { return $numValue1 -lt $numValue2 }
        "-le" { return $numValue1 -le $numValue2 }
        "-gt" { return $numValue1 -gt $numValue2 }
        "-ge" { return $numValue1 -ge $numValue2 }
        default { return $false }
    }
}

# Print Minimum Requirements
function Print-Requirements {
    Write-Host "`n`e[1;33mMinimum System Requirements:`e[0m" -ForegroundColor Yellow
    Write-Host "`n`e[1;33m1. Docker:`e[0m" -ForegroundColor Yellow
    Write-Host "   - Engine Version: $DOCKER_ENGINE_MIN_VERSION or higher"
    Write-Host "   - CPU: $DOCKER_MIN_CPU_CORES cores"
    Write-Host "   - Memory: $DOCKER_MIN_MEMORY_GB GB"
    Write-Host "   - Virtual Disk: $DOCKER_MIN_DISK_GB GB"
    Write-Host "`n`e[1;33m2. Node.js:`e[0m" -ForegroundColor Yellow
    Write-Host "   - Version: $NODE_MIN_VERSION or higher"
    Write-Host ""
}

# Main Deployment Check Script
function Main {
    Write-Host "`n╔═════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Running Pre-deployment checks  ║" -ForegroundColor Cyan
    Write-Host "╚═════════════════════════════════╝" -ForegroundColor Cyan

    # Check Docker
    Write-Host "`n[1/3] Checking Docker..." -ForegroundColor Magenta
    
    # Check Docker CLI installation
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        Write-Host "`nError: Docker is not installed" -ForegroundColor Red
        Print-Requirements
        exit 1
    }

    $ENGINE_VERSION = (docker --version) -split " " | Select-Object -Index 2
    $ENGINE_VERSION = $ENGINE_VERSION -replace ','
    
    # Check Docker Engine version
    if (-not (Compare-Versions -Required $DOCKER_ENGINE_MIN_VERSION -Actual $ENGINE_VERSION)) {
        Write-Host "`nError: Docker Engine version $ENGINE_VERSION does not meet minimum requirement of $DOCKER_ENGINE_MIN_VERSION" -ForegroundColor Red
        Print-Requirements
        exit 1
    }
    Write-Host "Info: Docker Engine version $ENGINE_VERSION detected" -ForegroundColor Cyan

    # Check Docker is running
    try {
        $null = docker info
        Write-Host "Info: Docker daemon is running" -ForegroundColor Cyan
    }
    catch {
        Write-Host "`nError: Docker daemon is not running" -ForegroundColor Red
        exit 1
    }

    # Check Docker Resources    
    Write-Host "`n[2/3] Checking Docker Resources" -ForegroundColor Magenta
    
    # CPU Cores Check
    $CPU_CORES = (Get-CimInstance -ClassName Win32_ComputerSystem).NumberOfLogicalProcessors
    if (-not (Compare-Numeric -Operator "-lt" -Value1 $CPU_CORES -Value2 $DOCKER_MIN_CPU_CORES)) {
        Write-Host "Info: Docker CPU allocation meets minimum requirements ($CPU_CORES cores)" -ForegroundColor Cyan
    }
    else {
        Write-Host "⚠ Docker CPU cores ($CPU_CORES) are less than recommended ($DOCKER_MIN_CPU_CORES)" -ForegroundColor Yellow
    }

    # Memory Check
    $dockerInfo = docker info
    $TOTAL_MEMORY = ($dockerInfo | Select-String "Total Memory").ToString().Trim()
    $MEMORY_GB = $TOTAL_MEMORY -replace ".*?([0-9.]+)GiB.*", '$1'
    
    if (-not (Compare-Numeric -Operator "-lt" -Value1 $MEMORY_GB -Value2 $DOCKER_MIN_MEMORY_GB)) {
        Write-Host "Info: Docker memory allocation meets minimum requirements ($MEMORY_GB GB)" -ForegroundColor Cyan
    }
    else {
        Write-Host "⚠ Docker memory ($MEMORY_GB GB) is less than recommended ($DOCKER_MIN_MEMORY_GB GB)" -ForegroundColor Yellow
    }

    # Disk Space Check
    $diskInfo = Get-PSDrive C | Select-Object -Property Used, Free
    $DISK_GB = [math]::Round(($diskInfo.Used + $diskInfo.Free) / 1GB, 2)
    
    if (-not (Compare-Numeric -Operator "-lt" -Value1 $DISK_GB -Value2 $DOCKER_MIN_DISK_GB)) {
        Write-Host "Info: Docker virtual disk space meets minimum requirements ($DISK_GB GB)" -ForegroundColor Cyan
    }
    else {
        Write-Host "⚠ Docker virtual disk space ($DISK_GB GB) is less than recommended ($DOCKER_MIN_DISK_GB GB)" -ForegroundColor Yellow
    }

    # Node.js Check
    Write-Host "`n[3/3] Checking Node.js" -ForegroundColor Magenta
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Write-Host "`nError: Node.js is not installed" -ForegroundColor Red
        Print-Requirements
        exit 1
    }

    $NODE_VERSION = (node --version).Substring(1)  # Remove leading 'v'
    if (-not (Compare-Versions -Required $NODE_MIN_VERSION -Actual $NODE_VERSION)) {
        Write-Host "`nError: Node.js version $NODE_VERSION does not meet minimum requirement of $NODE_MIN_VERSION" -ForegroundColor Red
        Print-Requirements
        exit 1
    }
    Write-Host "Info: Node.js version $NODE_VERSION meets requirements" -ForegroundColor Cyan

    # Final Success
    Write-Host "`nSuccess: All requirements met" -ForegroundColor Green
    Write-Host "`nSystem Resources:" -ForegroundColor Yellow
    Write-Host "Docker Engine:        $ENGINE_VERSION" -ForegroundColor Green
    Write-Host "CPU Cores:            $CPU_CORES" -ForegroundColor Green
    Write-Host "Total Memory:         $TOTAL_MEMORY" -ForegroundColor Green
    Write-Host "Disk Space:           $DISK_GB GB" -ForegroundColor Green
    Write-Host "Node.js:              $NODE_VERSION" -ForegroundColor Green
    
    Write-Host "`nTo setup stage move into its directory" 
    Write-Host "cd apps/stage" -ForegroundColor Yellow
    Write-Host "`nAnd then run:"
    Write-Host "docker build -t stageimage:1.0 ." -ForegroundColor Yellow
    Write-Host "`nOnce built you should be able to successfully run:"
    Write-Host "make.bat phase1" -ForegroundColor Yellow
}

# Run the main function
Main